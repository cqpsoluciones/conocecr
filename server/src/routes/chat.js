const express = require('express');
const router = express.Router();
const pool = require('../db');
const { extraerSenales, generarRespuesta, buscarPorEmbedding } = require('../services/openai');

// Fórmula Haversine para calcular distancia entre dos coordenadas en km
const calcularDistancia = (lat1, lng1, lat2, lng2) => {
  if (!lat1 || !lng1 || !lat2 || !lng2) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
};

// ─── POST /api/chat ───────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { message, sessionId, userLat, userLng } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ error: 'Mensaje requerido' });
    }

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId requerido' });
    }

    // ── Obtener o crear sesión ────────────────────────────────────────────────
    let sessionResult = await pool.query(
      'SELECT * FROM chat_sessions WHERE id = $1',
      [sessionId]
    );

    let session;
    if (sessionResult.rows.length === 0) {
      const newSession = await pool.query(
        `INSERT INTO chat_sessions (id, user_lat, user_lng)
         VALUES ($1, $2, $3) RETURNING *`,
        [sessionId, userLat || null, userLng || null]
      );
      session = newSession.rows[0];
    } else {
      session = sessionResult.rows[0];
    }

    // ── Obtener historial reciente (últimos 10 mensajes) ──────────────────────
    const historialResult = await pool.query(
      `SELECT role, content FROM chat_messages
       WHERE session_id = $1
       ORDER BY created_at DESC LIMIT 10`,
      [sessionId]
    );
    const historial = historialResult.rows.reverse();

    // ── Determinar señales a usar ─────────────────────────────────────────────
    let senales;

    if (!session.senales_extraidas) {
      console.log('Primer mensaje — extrayendo señales...');
      senales = await extraerSenales(message);
      console.log('Señales extraídas:', senales);

      await pool.query(
        `UPDATE chat_sessions SET
          vibes_detectadas = $1,
          categoria_detectada = $2,
          precio_detectado = $3,
          necesita_cercania = $4,
          intencion = $5,
          senales_extraidas = true
         WHERE id = $6`,
        [
          senales.vibes?.join(', ') || null,
          senales.categoria || null,
          senales.precio || null,
          senales.necesita_cercania || false,
          senales.intencion || null,
          sessionId
        ]
      );
    } else {
      senales = {
        vibes: session.vibes_detectadas
          ? session.vibes_detectadas.split(', ')
          : [],
        categoria: session.categoria_detectada,
        precio: session.precio_detectado,
        necesita_cercania: session.necesita_cercania,
        intencion: session.intencion
      };
    }

    // ── Buscar negocios relevantes por embedding semántico ────────────────────
    const consultaEmbedding = senales.intencion || message;
    let todosNegocios = await buscarPorEmbedding(consultaEmbedding, 20);
    let negocios = todosNegocios.filter(b => parseFloat(b.similitud) >= 0.35);
    if (negocios.length < 2) negocios = todosNegocios.slice(0, 5);

    // Filtrar por precio si fue detectado
    if (senales.precio) {
      const conPrecio = negocios.filter(b => b.rango_precio === senales.precio);
      if (conPrecio.length >= 2) negocios = conPrecio;
    }

    // Agregar distancia y ordenar por cercanía si aplica
    if (userLat || session.user_lat) {
      const lat = parseFloat(userLat || session.user_lat);
      const lng = parseFloat(userLng || session.user_lng);
      negocios = negocios.map(b => ({
        ...b,
        distancia_km: calcularDistancia(lat, lng, parseFloat(b.lat), parseFloat(b.lng))
      }));
      if (senales.necesita_cercania) {
        negocios.sort((a, b) => {
          if (!a.distancia_km) return 1;
          if (!b.distancia_km) return -1;
          return parseFloat(a.distancia_km) - parseFloat(b.distancia_km);
        });
      }
    }

    // ── Generar respuesta con OpenAI ──────────────────────────────────────────
    const { reply, hasMore } = await generarRespuesta(
      message,
      negocios,
      historial,
      userLat || session.user_lat,
      userLng || session.user_lng,
      senales.intencion
    );

    // ── Guardar mensajes en historial ─────────────────────────────────────────
    await pool.query(
      `INSERT INTO chat_messages (session_id, role, content)
       VALUES ($1, $2, $3)`,
      [sessionId, 'user', message]
    );
    await pool.query(
      `INSERT INTO chat_messages (session_id, role, content)
       VALUES ($1, $2, $3)`,
      [sessionId, 'assistant', reply]
    );

    res.json({ reply, hasMore, sessionId });

  } catch (err) {
    console.error('Error en /api/chat:', err);
    res.status(500).json({ error: 'Error al procesar el mensaje' });
  }
});

module.exports = router;