const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verificarToken } = require('../middleware/auth');

// GET /api/admin/negocios — listar todos los negocios (con búsqueda opcional)
router.get('/negocios', verificarToken, async (req, res) => {
  try {
    const { q } = req.query;

    let query = 'SELECT id, nombre, categoria, rango_precio, active, created_at FROM businesses';
    let params = [];

    if (q) {
      query += ' WHERE nombre ILIKE $1 OR categoria ILIKE $1';
      params.push(`%${q}%`);
    }

    query += ' ORDER BY nombre';

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Error al listar negocios:', err);
    res.status(500).json({ error: 'Error al listar negocios' });
  }
});

// GET /api/admin/negocios/:id — obtener un negocio
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
    res.status(500).json({ error: 'Error al obtener el negocio' });
  }
});

// PUT /api/admin/negocios/:id — editar negocio (regenera embedding)
router.put('/negocios/:id', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nombre, categoria, descripcion, descripcion_emocional,
      vibes, direccion, horario, whatsapp, instagram,
      facebook, sitio_web, rango_precio, lat, lng, active
    } = req.body;

    await pool.query(
      `UPDATE businesses SET
        nombre = $1, categoria = $2, descripcion = $3, descripcion_emocional = $4,
        vibes = $5, direccion = $6, horario = $7, whatsapp = $8, instagram = $9,
        facebook = $10, sitio_web = $11, rango_precio = $12, lat = $13, lng = $14, active = $15
      WHERE id = $16`,
      [
        nombre, categoria, descripcion, descripcion_emocional,
        Array.isArray(vibes) ? vibes.join(', ') : vibes,
        direccion, horario, whatsapp, instagram,
        facebook, sitio_web, rango_precio, lat, lng, active, id
      ]
    );

    // Regenerar embedding con los datos actualizados
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const texto = [
      `Nombre: ${nombre}`,
      `Categoría: ${categoria}`,
      `Descripción: ${descripcion}`,
      `Descripción emocional: ${descripcion_emocional}`,
      `Vibes: ${Array.isArray(vibes) ? vibes.join(', ') : vibes}`,
      `Dirección: ${direccion}`,
      `Precio: ${rango_precio || ''}`,
      `Horario: ${horario || ''}`
    ].join('\n');

    const embeddingRes = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: texto
    });

    const embedding = embeddingRes.data[0].embedding;
    await pool.query(
      'UPDATE businesses SET embedding = $1 WHERE id = $2',
      [`[${embedding.join(',')}]`, id]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('Error al editar negocio:', err);
    res.status(500).json({ error: 'Error al editar el negocio' });
  }
});

// GET /api/admin/solicitudes — listar solicitudes pendientes
router.get('/solicitudes', verificarToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, nombre, categoria, estado, created_at FROM solicitudes ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error('Error al listar solicitudes:', err);
    res.status(500).json({ error: 'Error al listar solicitudes' });
  }
});



// GET /api/admin/chats — listar sesiones de chat
router.get('/chats', verificarToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT cs.id, cs.created_at, cs.intencion,
              COUNT(cm.id) as total_mensajes
       FROM chat_sessions cs
       LEFT JOIN chat_messages cm ON cm.session_id = cs.id
       GROUP BY cs.id, cs.created_at, cs.intencion
       ORDER BY cs.created_at DESC
       LIMIT 100`
    );
    res.json(rows);
  } catch (err) {
    console.error('Error al listar chats:', err);
    res.status(500).json({ error: 'Error al listar chats' });
  }
});

// GET /api/admin/chats/:id — obtener mensajes de una sesión
router.get('/chats/:id', verificarToken, async (req, res) => {
  try {
    const { rows: sesion } = await pool.query(
      'SELECT * FROM chat_sessions WHERE id = $1',
      [req.params.id]
    );

    const { rows: mensajes } = await pool.query(
      `SELECT role, content, created_at FROM chat_messages
       WHERE session_id = $1
       ORDER BY created_at ASC`,
      [req.params.id]
    );

    if (sesion.length === 0) {
      return res.status(404).json({ error: 'Sesión no encontrada' });
    }

    res.json({ sesion: sesion[0], mensajes });
  } catch (err) {
    console.error('Error al obtener chat:', err);
    res.status(500).json({ error: 'Error al obtener el chat' });
  }
});

module.exports = router;