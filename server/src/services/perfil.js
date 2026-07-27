const pool = require('../db');
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const actualizarPerfilUsuario = async (usuarioId) => {
  // Traemos los últimos mensajes de todas sus conversaciones
  const { rows } = await pool.query(
    `SELECT cm.role, cm.content
     FROM chat_messages cm
     JOIN chat_sessions cs ON cs.id = cm.session_id
     WHERE cs.usuario_id = $1
     ORDER BY cm.created_at DESC
     LIMIT 40`,
    [usuarioId]
  );

  // Con poca conversación acumulada, no vale la pena generar un perfil todavía
  if (rows.length < 4) return;

  const conversacion = rows.reverse()
    .map(m => (m.role === 'user' ? 'Usuario: ' : 'Conoce: ') + m.content)
    .join('\n');

  const prompt = [
    'Analizá estas conversaciones entre un usuario y Conoce AI, un recomendador de negocios locales en Costa Rica.',
    'Extraé un perfil breve de sus preferencias, en texto plano, en español, máximo 5 líneas.',
    'Incluí (solo lo que puedas inferir con confianza, no inventes):',
    '- Presupuesto habitual (Económico, Moderado, Premium, o mixto)',
    '- Con quién suele salir (solo, pareja, familia, amigos)',
    '- Tipo de ambiente o vibes que prefiere',
    '- Categorías de negocio que más busca',
    'Si no hay suficiente información para algo, omitilo. No escribas introducción ni conclusión, solo el perfil.'
  ].join('\n');

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 300,
    temperature: 0.3,
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: conversacion }
    ]
  });

  const perfil = response.choices[0].message.content.trim();

  await pool.query(
    'UPDATE usuarios SET perfil_preferencias = $1, perfil_actualizado = NOW() WHERE id = $2',
    [perfil, usuarioId]
  );
};

module.exports = { actualizarPerfilUsuario };