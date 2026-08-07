const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const multer = require('multer');
const pool = require('../db');
const { subirMenu, obtenerImagenesDelMenu } = require('../services/cloudinary');
const { extraerTextoDeMenu } = require('../services/menu');
const { obtenerHorariosNegocio, guardarHorariosNegocio } = require('../services/horarios');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }
});

// Middleware: verificar token de admin
const verificarToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  try {
    const payload = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
    if (!payload.admin) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    next();
  } catch {
    return res.status(401).json({ error: 'Sesión inválida o expirada' });
  }
};

// Función para regenerar el embedding de un negocio
const regenerarEmbedding = async (businessId) => {
  const OpenAI = require('openai');
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const { rows } = await pool.query(
    `SELECT nombre, categoria, descripcion, descripcion_emocional,
            vibes, direccion, rango_precio, horario, menu_texto
     FROM businesses WHERE id = $1`,
    [businessId]
  );

  if (rows.length === 0) return;
  const b = rows[0];

  const texto = [
    `Nombre: ${b.nombre}`,
    `Categoría: ${b.categoria}`,
    `Descripción: ${b.descripcion}`,
    `Descripción emocional: ${b.descripcion_emocional}`,
    `Vibes: ${b.vibes}`,
    `Dirección: ${b.direccion}`,
    `Precio: ${b.rango_precio || ''}`,
    `Horario: ${b.horario || ''}`,
    b.menu_texto ? `Menú y productos que ofrece:\n${b.menu_texto}` : ''
  ].filter(Boolean).join('\n');

  const embeddingRes = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texto
  });

  const embedding = embeddingRes.data[0].embedding;
  await pool.query(
    'UPDATE businesses SET embedding = $1 WHERE id = $2',
    [`[${embedding.join(',')}]`, businessId]
  );
};

// GET /api/admin/negocios — listar todos
router.get('/negocios', verificarToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, nombre, categoria, active, en_directorio, created_at
       FROM businesses ORDER BY nombre`
    );
    res.json(rows);
  } catch (err) {
    console.error('Error al listar negocios:', err);
    res.status(500).json({ error: 'Error al listar negocios' });
  }
});

// GET /api/admin/negocios/:id — obtener uno
router.get('/negocios/:id', verificarToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM businesses WHERE id = $1',
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Negocio no encontrado' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Error al obtener negocio:', err);
    res.status(500).json({ error: 'Error al obtener negocio' });
  }
});

// PUT /api/admin/negocios/:id — actualizar
router.put('/negocios/:id', verificarToken, async (req, res) => {
  try {
    const camposPermitidos = [
      'nombre', 'categoria', 'descripcion', 'descripcion_emocional',
      'vibes', 'direccion', 'whatsapp', 'instagram', 'facebook',
      'sitio_web', 'rango_precio', 'horario', 'lat', 'lng',
      'active', 'menu_texto', 'en_directorio', 'imagen_url'
    ];

    const updates = [];
    const values = [];
    let i = 1;

    for (const campo of camposPermitidos) {
      if (req.body[campo] !== undefined) {
        updates.push(`${campo} = $${i}`);
        values.push(req.body[campo]);
        i++;
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }

    values.push(req.params.id);
    await pool.query(
      `UPDATE businesses SET ${updates.join(', ')} WHERE id = $${i}`,
      values
    );

    // Regenerar embedding si cambió algo relevante para la búsqueda
    const camposRelevantes = ['nombre', 'categoria', 'descripcion', 'descripcion_emocional', 'vibes', 'direccion', 'rango_precio', 'horario', 'menu_texto'];
    if (camposRelevantes.some(c => req.body[c] !== undefined)) {
      await regenerarEmbedding(req.params.id);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Error al actualizar negocio:', err);
    res.status(500).json({ error: 'Error al actualizar negocio' });
  }
});

// POST /api/admin/negocios/:id/menu — subir y extraer menú
router.post('/negocios/:id/menu', verificarToken, upload.single('menu'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió ningún archivo' });
    }

    const { rows } = await pool.query('SELECT nombre FROM businesses WHERE id = $1', [req.params.id]);
    const nombre = rows[0]?.nombre || 'negocio';

    const menuUrl = await subirMenu(req.file.buffer, nombre);

    let menuTexto;
    try {
      const imagenes = await obtenerImagenesDelMenu(menuUrl, req.file.buffer);
      menuTexto = await extraerTextoDeMenu(imagenes);
    } catch (extractError) {
      await pool.query('UPDATE businesses SET menu_url = $1 WHERE id = $2', [menuUrl, req.params.id]);
      return res.status(422).json({
        menu_url: menuUrl,
        error: 'La imagen se subió pero no se pudo leer el menú automáticamente. Podés escribir el texto a mano.'
      });
    }

    await pool.query(
      'UPDATE businesses SET menu_url = $1, menu_texto = $2 WHERE id = $3',
      [menuUrl, menuTexto, req.params.id]
    );

    await regenerarEmbedding(req.params.id);

    const paginas = menuUrl.toLowerCase().endsWith('.pdf') ? (await obtenerImagenesDelMenu(menuUrl, req.file.buffer)).length : 1;

    res.json({ menu_url: menuUrl, menu_texto: menuTexto, paginas });
  } catch (err) {
    console.error('Error al procesar el menú:', err);
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'El archivo es muy pesado. El máximo es 25 MB.' });
    }
    if (err.http_code === 400 && /File size too large/i.test(err.message || '')) {
      return res.status(413).json({ error: 'El archivo supera el límite de 10 MB de Cloudinary. Comprimilo e intentá de nuevo.' });
    }
    res.status(500).json({ error: 'Error al procesar el menú' });
  }
});

// POST /api/admin/negocios/:id/imagen — subir imagen del negocio para el directorio
router.post('/negocios/:id/imagen', verificarToken, upload.single('imagen'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió ninguna imagen' });
    }

    const { subirImagen } = require('../services/cloudinary');

    const { rows } = await pool.query('SELECT nombre FROM businesses WHERE id = $1', [req.params.id]);
    const nombre = rows[0]?.nombre || 'negocio';

    const imagenUrl = await subirImagen(req.file.buffer, nombre);

    await pool.query(
      'UPDATE businesses SET imagen_url = $1 WHERE id = $2',
      [imagenUrl, req.params.id]
    );

    res.json({ imagen_url: imagenUrl });
  } catch (err) {
    console.error('Error al subir imagen:', err);
    if (err.http_code === 400 && /File size too large/i.test(err.message || '')) {
      return res.status(413).json({ error: 'La imagen supera el límite de 10 MB. Comprimila e intentá de nuevo.' });
    }
    res.status(500).json({ error: 'Error al subir la imagen' });
  }
});

// GET /api/admin/negocios/:id/horarios — obtener horarios estructurados
router.get('/negocios/:id/horarios', verificarToken, async (req, res) => {
  try {
    const horarios = await obtenerHorariosNegocio(req.params.id);
    res.json(horarios);
  } catch (err) {
    console.error('Error al obtener horarios:', err);
    res.status(500).json({ error: 'Error al obtener horarios' });
  }
});

// PUT /api/admin/negocios/:id/horarios — guardar horarios estructurados
router.put('/negocios/:id/horarios', verificarToken, async (req, res) => {
  try {
    await guardarHorariosNegocio(req.params.id, req.body.horarios);
    res.json({ ok: true });
  } catch (err) {
    console.error('Error al guardar horarios:', err);
    res.status(500).json({ error: 'Error al guardar horarios' });
  }
});

module.exports = router;