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

module.exports = router;