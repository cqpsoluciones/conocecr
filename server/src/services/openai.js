const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const VIBES_DISPONIBLES = [
  'Romantico', 'Chill', 'Familiar', 'Pet Friendly',
  'Para trabajar', 'Elegante', 'Casual', 'Rapido'
];

const CATEGORIAS_DISPONIBLES = [
  'Restaurante', 'Cafeteria / Cafe', 'Gimnasio', 'Farmacia',
  'Ferreteria', 'Salon de belleza', 'Tienda', 'Minisuper / Abarrotes',
  'Servicios profesionales', 'Entretenimiento', 'Bar'
];

const extraerSenales = async (mensaje) => {
  const prompt = [
    'Eres un analizador de intenciones para una app de descubrimiento de negocios locales en Costa Rica.',
    '',
    'Analiza el mensaje del usuario y devuelve UNICAMENTE un JSON con esta estructura exacta, sin texto adicional:',
    '{',
    '  "vibes": [],',
    '  "categoria": null,',
    '  "precio": null,',
    '  "necesita_cercania": false,',
    '  "intencion": ""',
    '}',
    '',
    'Vibes disponibles: ' + VIBES_DISPONIBLES.join(', '),
    'Categorias disponibles: ' + CATEGORIAS_DISPONIBLES.join(', '),
    'Precios disponibles: Economico, Moderado, Premium',
    '',
    'Reglas:',
    '- vibes: array con las vibes que apliquen, maximo 3, solo de las disponibles',
    '- categoria: la categoria mas relevante o null si no aplica',
    '- precio: solo si el usuario lo menciona explicita o implicitamente (barato=Economico, caro=Premium)',
    '- necesita_cercania: true si menciona cerca, por aqui, zona, distancia',
    '- intencion: resumen en maximo 10 palabras de lo que busca el usuario'
  ].join('\n');

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 200,
    temperature: 0,
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: mensaje }
    ]
  });

  try {
    const text = response.choices[0].message.content.trim();
    return JSON.parse(text);
  } catch (e) {
    return {
      vibes: [],
      categoria: null,
      precio: null,
      necesita_cercania: false,
      intencion: mensaje.slice(0, 100)
    };
  }
};

const generarRespuesta = async (mensaje, negocios, historial, userLat, userLng, intencion) => {
  const listaNegocios = negocios.map(function(b) {
    const dist = b.distancia_km ? ' - a ' + b.distancia_km + ' km de vos' : '';
    return '- ' + b.nombre + ' (' + b.categoria + ')' + dist + ': ' + (b.descripcion || '') + '. ' +
      'Vibes: ' + (b.vibes || 'N/A') + '. ' +
      'Dir: ' + b.direccion + '. ' +
      'WA: ' + (b.whatsapp || 'No disponible') + '. ' +
      'Instagram: ' + (b.instagram || 'No disponible') + '. ' +
      'Precio: ' + (b.rango_precio || 'No definido') + '. ' +
      'Horario: ' + (b.horario || 'No disponible') + '.';
  }).join('\n');

  const sinNegocios = 'No hay negocios que coincidan con esta busqueda especifica.';

  const systemPrompt = [
    'Eres un asistente local amigable y entusiasta de Santo Domingo de Heredia, Costa Rica.',
    'Tu mision es recomendar negocios locales de forma natural, como un amigo que conoce bien la zona.',
    '',
    negocios.length > 0
      ? 'Negocios disponibles para esta busqueda:\n' + listaNegocios
      : sinNegocios,
    '',
    'REGLAS DE RESPUESTA:',
    '- Recomienda maximo 5 negocios por respuesta',
    '- Si hay negocios con distancia, menciona primero los mas cercanos',
    '- Para cada negocio usa SOLO los datos que existan, omite completamente los que sean null, vacio o "No disponible"',
    '- Si un usuario pide un dato especifico que no existe (ej: "cual es su web"), respondele que no contás con esa información',
    '- Usa este formato para cada negocio, incluyendo SOLO las lineas que tengan datos reales:',
    '---',
    '**Nombre del negocio**',
    'Descripcion breve y emotiva, maximo 2 lineas',
    '[solo si tiene] Dir: direccion',
    '[solo si tiene] WA: link de whatsapp',
    '[solo si tiene] Instagram: link',
    '[solo si tiene] Web: link',
    '[solo si tiene] Horario: horario',
    '[solo si tiene] Precio: rango',
    '---',
    '- Al final, si hay mas negocios disponibles, agrega exactamente: [VER_MAS_DISPONIBLE]',
    '- NUNCA inventes datos ni rellenes con "No disponible"',
    '- Responde siempre en espanol',
    '- Se conversacional, no robotico'
  ].join('\n');

  const messages = [
    { role: 'system', content: systemPrompt }
  ].concat(historial).concat([
    { role: 'user', content: mensaje }
  ]);

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 1200,
    temperature: 0.4,
    messages: messages
  });

  const contenido = response.choices[0].message.content;
  const hasMore = contenido.includes('[VER_MAS_DISPONIBLE]');
  const reply = contenido.replace('[VER_MAS_DISPONIBLE]', '').trim();

  return { reply, hasMore };
};

const buscarPorEmbedding = async (consulta, limite = 20) => {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: consulta
  });

  const embedding = response.data[0].embedding;
  const vectorStr = `[${embedding.join(',')}]`;

  const pool = require('../src/db');
  const { rows } = await pool.query(
    `SELECT id, nombre, categoria, descripcion, descripcion_emocional,
            vibes, direccion, whatsapp, instagram, facebook,
            sitio_web, rango_precio, horario, lat, lng,
            1 - (embedding <=> $1::vector) AS similitud
     FROM businesses
     WHERE active = true AND embedding IS NOT NULL
     ORDER BY embedding <=> $1::vector
     LIMIT $2`,
    [vectorStr, limite]
  );

  return rows;
};

module.exports = { extraerSenales, generarRespuesta, buscarPorEmbedding };

module.exports = { extraerSenales, generarRespuesta };