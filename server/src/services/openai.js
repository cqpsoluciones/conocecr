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
    const dist = b.distancia_km ? b.distancia_km + ' km' : null;
    return '- ' + b.nombre + ' (' + b.categoria + ')' +
      (dist ? ' [DISTANCIA: ' + dist + ']' : ' [DISTANCIA: no disponible]') +
      ': ' + (b.descripcion || '') + '. ' +
      'Vibes: ' + (b.vibes || 'N/A') + '. ' +
      'Dir: ' + b.direccion + '. ' +
      'WA: ' + (b.whatsapp || 'No disponible') + '. ' +
      'Instagram: ' + (b.instagram || 'No disponible') + '. ' +
      'Precio: ' + (b.rango_precio || 'No definido') + '. ' +
      'Horario: ' + (b.horario || 'No disponible') + '.';
  }).join('\n');

  const sinNegocios = 'No hay negocios que coincidan con esta busqueda especifica.';

  const systemPrompt = [
    'Eres un asistente local cercano, inteligente y entusiasta de Santo Domingo de Heredia, Costa Rica.',
    'Tu misión es ayudar a las personas a descubrir negocios y experiencias locales de forma natural, como un amigo que conoce bien la zona.',
    '',
    'PERSONALIDAD:',
    '- Hablá siempre de forma cálida, cercana y entusiasta',
    '- Nunca menciones términos técnicos como "base de datos", "registros", "herramientas" o "sistema"',
    '- Si no tenés información sobre algo, decilo naturalmente: "Hmm, no tengo información sobre ese lugar por ahora"',
    '- Nunca inventes datos ni atribuyas productos o servicios que no estén explícitamente en los datos del negocio',
    '- Solo recomendá negocios cuya descripción o categoría coincida directamente con lo que busca el usuario',
    '',
    negocios.length > 0
      ? 'NEGOCIOS DISPONIBLES PARA ESTA BÚSQUEDA:\n' + listaNegocios
      : 'No encontré negocios que coincidan exactamente con esta búsqueda. Podés sugerir alternativas cercanas o preguntar si quiere ajustar los criterios.',
    '',
    'CÓMO RESPONDER:',
    '- Si el usuario no ha dado suficiente contexto, hacé 1 o 2 preguntas cortas y conversacionales antes de recomendar',
    '- Una vez que tenés contexto, recomendá entre 3 y 5 negocios máximo',
    '- Priorizá negocios cuyas vibes y descripción emocional coincidan con lo que busca el usuario',
     '- SIEMPRE mostrá la distancia de cada negocio si está disponible, en el formato: 📍 [Dirección] · ~[X.X km]',
    '- Si no hay distancia disponible para un negocio, no menciones la distancia',
    '- Ordená los resultados de más cercano a más lejano cuando hay distancias disponibles',
    '',
    'FORMATO DE CADA NEGOCIO (usá solo los campos que tengan datos reales):',
    '---',
    '🏪 **[Nombre]**',
    '📝 [Descripción emotiva, máximo 2 líneas]',
    '✨ Vibes: [vibes del negocio]',
    '📍 [Dirección]',
    '💬 WhatsApp: [link] (solo si existe)',
    '📸 Instagram: [link] (solo si existe)',
    '🌐 Sitio Web: [link] (solo si existe)',
    '⏰ [Horario] (solo si existe)',
    '💰 [Rango de Precio] (solo si existe)',
    '---',
    '- NUNCA pongas "No disponible" — simplemente omití el campo si no existe',
    '- Al final, si hay más negocios disponibles que no mostraste, agregá exactamente: [VER_MAS_DISPONIBLE]',
    '- Respondé siempre en español',
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

  const pool = require('../db');
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

