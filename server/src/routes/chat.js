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


// Trae un resumen de las conversaciones anteriores del usuario (últimas 5 sesiones)
const obtenerHistorialUsuario = async (usuarioId, sessionIdActual) => {
  if (!usuarioId) return null;

  const { rows } = await pool.query(
    `SELECT intencion, created_at
     FROM chat_sessions
     WHERE usuario_id = $1
       AND id != $2
       AND intencion IS NOT NULL
     ORDER BY created_at DESC
     LIMIT 5`,
    [usuarioId, sessionIdActual]
  );

  if (rows.length === 0) return null;

  return rows.map(r => {
    const fecha = new Date(r.created_at).toLocaleDateString('es-CR', {
      day: 'numeric', month: 'long'
    });
    return `- ${fecha}: ${r.intencion}`;
  }).join('\n');
};



// ─── POST /api/chat ───────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { message, sessionId, userLat, userLng, userNombre, userId } = req.body;

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
        `INSERT INTO chat_sessions (id, user_lat, user_lng, usuario_id)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [sessionId, userLat || null, userLng || null, userId || null]
      );
      session = newSession.rows[0];
    } else {
      session = sessionResult.rows[0];
      if (userId && !session.usuario_id) {
        await pool.query(
          'UPDATE chat_sessions SET usuario_id = $1 WHERE id = $2',
          [userId, sessionId]
        );
        session.usuario_id = userId;
      }
    }

    // ── Obtener historial reciente (últimos 10 mensajes) ──────────────────────
    const historialResult = await pool.query(
      `SELECT role, content FROM chat_messages
       WHERE session_id = $1
       ORDER BY created_at DESC LIMIT 10`,
      [sessionId]
    );
    const historial = historialResult.rows.reverse();

    // ── Detectar si el usuario pide MÁS de lo mismo ───────────────────────────
    // Solo cuenta como "pedir más" si el mensaje es corto y no introduce un tema nuevo.
    // "dame más opciones" → sí. "dame más opciones pero de otro tipo de comida" → no,
    // eso es una búsqueda nueva y debe extraer señales frescas.
    const pideMasBasico = /^(dame |quer[ií]a |quiero |ten[ée]s |hay )?(m[aá]s|otras?|otros?)\s*(opciones|lugares|alternativas|resultados|negocios)?[\s?!.]*$/i.test(message.trim());

    // ── Extraer señales SIEMPRE (salvo que sea un "más de lo mismo" puro) ─────
    let senales;

    if (pideMasBasico && session.senales_extraidas) {
      // Reutilizar las señales de la búsqueda anterior
      senales = {
        vibes: session.vibes_detectadas ? session.vibes_detectadas.split(', ') : [],
        categoria: session.categoria_detectada,
        precio: session.precio_detectado,
        necesita_cercania: session.necesita_cercania,
        intencion: session.intencion
      };
      console.log('Pide más de lo mismo → reutilizando señales guardadas');
    } else {
      // Cualquier otro mensaje: señales frescas del mensaje actual
      senales = await extraerSenales(message);
      console.log('Señales extraídas:', senales);

      // Y las guardamos, actualizando la sesión (ya no se congelan en el primer mensaje)
      await pool.query(
        `UPDATE chat_sessions SET
          vibes_detectadas = $1,
          categoria_detectada = $2,
          precio_detectado = $3,
          necesita_cercania = $4,
          intencion = COALESCE(intencion, $5),
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
    }

    console.log('Coordenadas recibidas:', { userLat, userLng, sessionLat: session.user_lat, sessionLng: session.user_lng });

    // ── Buscar negocios relevantes por embedding semántico ────────────────────
    const consultaEmbedding = senales.intencion || message;
    let todosNegocios = await buscarPorEmbedding(consultaEmbedding, 30);
    let negocios = todosNegocios.filter(b => parseFloat(b.similitud) >= 0.35);
    if (negocios.length < 2) negocios = todosNegocios.slice(0, 10);

    // ── Si pide más de lo mismo, excluir los ya mencionados ───────────────────
    if (pideMasBasico && historial.length > 0) {
      const historialTexto = historial
        .filter(m => m.role === 'assistant')
        .map(m => m.content)
        .join(' ')
        .toLowerCase();

      const negociosNuevos = negocios.filter(b =>
        !historialTexto.includes(b.nombre.toLowerCase())
      );

      if (negociosNuevos.length >= 1) negocios = negociosNuevos;
    }

    // ── Filtrar por precio si fue detectado ───────────────────────────────────
    if (senales.precio) {
      const conPrecio = negocios.filter(b => b.rango_precio === senales.precio);
      if (conPrecio.length >= 2) negocios = conPrecio;
    }

    // ── CONTINUIDAD: reinyectar negocios mencionados en los últimos 5 mensajes ─
    // Si el usuario pregunta "¿y ahí venden hamburguesas?", el negocio del que
    // hablábamos debe seguir presente aunque la búsqueda nueva no lo devuelva.
    if (!pideMasBasico && historial.length > 0) {
      const ultimosMensajes = historial
        .slice(-5)
        .map(m => m.content)
        .join(' ')
        .toLowerCase();

      const { rows: todos } = await pool.query(
        `SELECT id, nombre, categoria, descripcion, descripcion_emocional,
                vibes, direccion, whatsapp, instagram, facebook,
                sitio_web, rango_precio, horario, lat, lng, menu_texto
         FROM businesses WHERE active = true`
      );

      const mencionados = todos.filter(b =>
        ultimosMensajes.includes(b.nombre.toLowerCase()) &&
        !negocios.some(n => n.id === b.id)
      );

      if (mencionados.length > 0) {
        console.log('Reinyectando negocios mencionados:', mencionados.map(b => b.nombre));
        negocios = [...mencionados, ...negocios];
      }
    }

    // ── Agregar distancia y ordenar por cercanía si aplica ────────────────────
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

    console.log('Negocios enviados al modelo:', negocios.slice(0, 5).map(b => ({ nombre: b.nombre, distancia_km: b.distancia_km })));



// Historial de conversaciones anteriores (solo si hay usuario logueado)
    const historialUsuario = await obtenerHistorialUsuario(
      session.usuario_id || userId,
      sessionId
    );



    // ── Generar respuesta con OpenAI ──────────────────────────────────────────
    const { reply, hasMore } = await generarRespuesta(
      message,
      negocios,
      historial,
      userLat || session.user_lat,
      userLng || session.user_lng,
      senales.intencion,
      userNombre,
      historialUsuario
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