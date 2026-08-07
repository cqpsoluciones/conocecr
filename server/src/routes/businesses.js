const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/businesses — devuelve todos los negocios activos
router.get('/', async (req, res) => {
  try {
    const { categoria } = req.query;

    let query = `
      SELECT id, nombre, categoria, descripcion, descripcion_emocional,
             vibes, direccion, whatsapp, instagram, tiktok, facebook,
             sitio_web, rango_precio, horario, lat, lng
      FROM businesses
      WHERE active = true
    `;

    const params = [];

    if (categoria) {
      params.push(categoria);
      query += ` AND categoria = $${params.length}`;
    }

    query += ' ORDER BY nombre';

    const result = await pool.query(query, params);
    res.json(result.rows);

  } catch (err) {
    console.error('Error en /api/businesses:', err.message);
    res.status(500).json({ error: 'Error al obtener negocios' });
  }
});

// GET /api/businesses/directorio — negocios seleccionados para exhibición pública
router.get('/directorio', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, nombre, categoria, descripcion, resumen_directorio, imagen_url, sitio_web
       FROM businesses
       WHERE en_directorio = true AND active = true
       ORDER BY nombre ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error('Error al obtener directorio:', err);
    res.status(500).json({ error: 'Error al cargar el directorio' });
  }
});

module.exports = router;