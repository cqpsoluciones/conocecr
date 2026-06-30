const express = require('express');
const router = express.Router();
const multer = require('multer');
const pool = require('../db');
const { enviarSolicitudNegocio } = require('../services/email');
const { subirMenu } = require('../services/cloudinary');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // máximo 10MB
  fileFilter: (req, file, cb) => {
    const tiposPermitidos = ['image/jpeg', 'image/png', 'application/pdf'];
    if (tiposPermitidos.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PNG, JPG o PDF'));
    }
  }
});

// Geocodificar dirección con Google Maps
const geocodificar = async (direccion) => {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(direccion + ', Santo Domingo, Heredia, Costa Rica')}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.results && data.results[0]) {
    const { lat, lng } = data.results[0].geometry.location;
    return { lat, lng };
  }
  return { lat: null, lng: null };
};

// Generar ID único
const generarID = (nombre) => {
  const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const nombreLimpio = nombre
    .toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 30);
  return `${fecha}-${nombreLimpio}`;
};

// POST /api/registro — recibir formulario
// POST /api/registro — recibir formulario
router.post('/', upload.single('menu'), async (req, res) => {
  try {
    const {
      nombre, categoria, descripcion, descripcionEmocional,
      vibes, direccion, horario, whatsapp, instagram,
      tiktok, facebook, sitioWeb, rangoPrecio
    } = req.body;

    // Validación básica
    if (!nombre || !categoria || !descripcion || !descripcionEmocional ||
        !vibes || !direccion || !horario || !whatsapp) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    // Geocodificar dirección
    const { lat, lng } = await geocodificar(direccion);

    // Generar ID
    const id = generarID(nombre);

    // Formatear WhatsApp
    const whatsappLimpio = whatsapp.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/506${whatsappLimpio}`;

    // Subir menú a Cloudinary si fue adjuntado
    let menuUrl = null;
    if (req.file) {
      menuUrl = await subirMenu(req.file.buffer, nombre);
    }

    // vibes puede llegar como string JSON desde FormData
    const vibesArray = typeof vibes === 'string' ? JSON.parse(vibes) : vibes;

    // Guardar solicitud en PostgreSQL
    await pool.query(
      `INSERT INTO solicitudes (
        id, nombre, categoria, descripcion, descripcion_emocional,
        vibes, direccion, horario, whatsapp, instagram,
        tiktok, facebook, sitio_web, rango_precio, lat, lng, estado, menu_url
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'Pendiente',$17)`,
      [
        id, nombre, categoria, descripcion, descripcionEmocional,
        vibesArray.join(', '),
        direccion, horario, whatsappUrl,
        instagram || null, tiktok || null, facebook || null,
        sitioWeb || null, rangoPrecio || null,
        lat, lng, menuUrl
      ]
    );

    // Enviar correo al admin
    await enviarSolicitudNegocio({
      id, nombre, categoria, descripcion, descripcionEmocional,
      vibes: vibesArray,
      direccion, horario, whatsapp: whatsappUrl,
      instagram, tiktok, facebook, sitioWeb, rangoPrecio,
      lat, lng, menuUrl
    });

    res.json({ ok: true, id });

  } catch (err) {
    console.error('Error en POST /api/registro:', err);
    res.status(500).json({ error: 'Error al procesar la solicitud' });
  }
});

// GET /api/registro/aprobar/:id
router.get('/aprobar/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { rows } = await pool.query(
      'SELECT * FROM solicitudes WHERE id = $1',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).send('Solicitud no encontrada');
    }

    const s = rows[0];

    // Insertar en businesses
    const { rows: inserted } = await pool.query(
      `INSERT INTO businesses (
        nombre, categoria, descripcion, descripcion_emocional,
        vibes, direccion, horario, whatsapp, instagram,
        facebook, sitio_web, rango_precio, lat, lng, active
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,true)
      RETURNING id`,
      [
        s.nombre, s.categoria, s.descripcion, s.descripcion_emocional,
        s.vibes, s.direccion, s.horario, s.whatsapp, s.instagram,
        s.facebook, s.sitio_web, s.rango_precio, s.lat, s.lng
      ]
    );

    // Generar embedding
    const businessId = inserted[0].id;
    const { buscarPorEmbedding } = require('../services/openai');
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const texto = [
      `Nombre: ${s.nombre}`,
      `Categoría: ${s.categoria}`,
      `Descripción: ${s.descripcion}`,
      `Descripción emocional: ${s.descripcion_emocional}`,
      `Vibes: ${s.vibes}`,
      `Dirección: ${s.direccion}`,
      `Precio: ${s.rango_precio || ''}`,
      `Horario: ${s.horario || ''}`
    ].join('\n');

    const embeddingRes = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: texto
    });

    const embedding = embeddingRes.data[0].embedding;
    await pool.query(
      'UPDATE businesses SET embedding = $1 WHERE id = $2',
      [`[${embedding.join(',')}]`, businessId]
    );

    // Actualizar estado solicitud
    await pool.query(
      "UPDATE solicitudes SET estado = 'Aprobado' WHERE id = $1",
      [id]
    );

    res.send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Negocio aprobado</title>
        <style>
          body { font-family: sans-serif; background: #0a0a0b; color: #f0f0f0; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
          .card { text-align: center; padding: 48px 32px; background: #111114; border: 1px solid #222; border-radius: 16px; max-width: 400px; }
          h1 { font-size: 24px; color: #7ecfa4; margin-bottom: 12px; }
          p { color: #6b6b75; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>✅ Negocio aprobado</h1>
          <p><strong>${s.nombre}</strong> ya está visible en Conoce CR.</p>
        </div>
      </body>
      </html>
    `);

  } catch (err) {
    console.error('Error al aprobar:', err);
    res.status(500).send('Error al aprobar el negocio');
  }
});

// GET /api/registro/rechazar/:id
router.get('/rechazar/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      "UPDATE solicitudes SET estado = 'Rechazado' WHERE id = $1",
      [id]
    );

    res.send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Solicitud rechazada</title>
        <style>
          body { font-family: sans-serif; background: #0a0a0b; color: #f0f0f0; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
          .card { text-align: center; padding: 48px 32px; background: #111114; border: 1px solid #222; border-radius: 16px; max-width: 400px; }
          h1 { font-size: 24px; color: #cc2200; margin-bottom: 12px; }
          p { color: #6b6b75; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>❌ Solicitud rechazada</h1>
          <p>La solicitud fue marcada como rechazada.</p>
        </div>
      </body>
      </html>
    `);

  } catch (err) {
    console.error('Error al rechazar:', err);
    res.status(500).send('Error al rechazar la solicitud');
  }
});

module.exports = router;