const express = require('express');
const router = express.Router();
const pool = require('../db');
const { extraerSenales, generarRespuesta } = require('../services/openai');

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

// Construye la query de filtrado según las señales detectadas
const filtrarNegocios = async (senales, userLat, userLng) => {
  const condiciones = ['b.active = true'];
  const params = [];

  // Filtro por categoría
  if (senales.categoria) {
    params.push(senales.categoria);
    condiciones.push(`b.categoria ILIKE $${params.length}`);
  }

  // Filtro por precio
  if (senales.precio) {
    params.push(senales.precio);
    condiciones.push(`b.rango_precio = $${params.length}`);
  }

  // Filtro por vibes (busca coincidencia en el texto de vibes)
  if (senales.vibes && senales.vibes.length > 0) {
    const vibeCondiciones = senales.vibes.map(vibe => {
      params.push(`%${vibe}%`);
      return `b.vibes ILIKE $${params.length}`;
    });
    condiciones.push(`(${vibeCondiciones.join(' OR ')})`);
  }

  const query = `
    SELECT b.id, b.nombre, b.categoria, b.descripcion, b.descripcion_emocional,
           b.vibes, b.direccion, b.whatsapp, b.instagram, b.facebook,
           b.sitio_web, b.rango_precio, b.horario, b.lat, b.lng
    FROM businesses b
    WHERE ${condiciones.join(' AND ')}
    ORDER BY b.nombre
    LIMIT 20
  `;

  const result = await pool.query(query, params);
  let negocios = result.rows;

  // Si no hay resultados con filtros estrictos, traer todos activos
  if (negocios.length === 0) {
    const fallback = await pool.query(
      'SELECT * FROM businesses WHERE active = true ORDER BY nombre LIMIT 20'
    );
    negocios = fallback.rows;
  }

  // Agregar distancia si el usuario compartió ubicación
  if (userLat && userLng) {
    negocios = negocios.map(b => ({
      ...b,
      distancia_km: calcularDistancia(
        parseFloat(userLat), parseFloat(userLng),
        parseFloat(b.lat), parseFloat(b.lng)
      )
    }));

    // Ordenar: si necesita cercanía, los más cercanos primero
    if (senales.necesita_cercania) {
      negocios.sort((a, b) => {
        if (!a.distancia_km) return 1;
        if (!b.distancia_km) return -1;
        return parseFloat(a.distancia_km) - parseFloat(b.distancia_km);
      });
    }
  }

  return negocios;
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
      // PRIMER MENSAJE: extraer señales con OpenAI
      console.log('Primer mensaje — extrayendo señales...');
      senales = await extraerSenales(message);
      console.log('Señales extraídas:', senales);

      // Guardar señales en la sesión
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
      // MENSAJES SIGUIENTES: usar señales guardadas
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

    // ── Filtrar negocios relevantes en PostgreSQL ─────────────────────────────
    const negocios = await filtrarNegocios(
      senales,
      userLat || session.user_lat,
      userLng || session.user_lng
    );

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