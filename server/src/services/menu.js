const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Recibe una o varias URLs de imagen (páginas del menú) y devuelve el menú en texto plano
const extraerTextoDeMenu = async (urlsImagenes) => {
  if (!urlsImagenes || urlsImagenes.length === 0) {
    throw new Error('No hay imágenes de menú para procesar');
  }

  const instruccion = [
    'Sos un extractor de menús de negocios de comida en Costa Rica.',
    'Te voy a pasar una o más imágenes del menú de un negocio.',
    '',
    'Tu trabajo: transcribir el menú a texto plano, organizado y legible.',
    '',
    'Reglas:',
    '- Agrupá por secciones si el menú las tiene (Entradas, Hamburguesas, Bebidas, Postres, etc.)',
    '- Incluí el nombre de cada producto y su precio si aparece',
    '- Incluí descripciones cortas de los platos si el menú las trae',
    '- NO inventes productos ni precios que no estén en la imagen',
    '- Si algo es ilegible, omitilo en vez de adivinar',
    '- Si las imágenes no contienen un menú, respondé exactamente: SIN_MENU',
    '- No agregues comentarios ni introducción: solo el menú transcrito'
  ].join('\n');

  const contenido = [
    { type: 'text', text: 'Transcribí este menú a texto plano.' },
    ...urlsImagenes.map(url => ({
      type: 'image_url',
      image_url: { url }
    }))
  ];

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 2000,
    temperature: 0,
    messages: [
      { role: 'system', content: instruccion },
      { role: 'user', content: contenido }
    ]
  });

  const texto = response.choices[0].message.content.trim();

  if (texto === 'SIN_MENU') {
    throw new Error('La imagen no parece contener un menú');
  }

  return texto;
};


// Genera un resumen corto y atractivo del negocio para la tarjeta del directorio
const generarResumenDirectorio = async (negocio) => {
  const prompt = [
    'Sos un redactor publicitario para un directorio de negocios locales en Costa Rica.',
    'Con la información del negocio, escribí UN resumen corto y atractivo para su tarjeta en el directorio.',
    '',
    'Reglas:',
    '- Máximo 18 palabras, en una sola frase',
    '- Tono cálido y que invite, pero sin exagerar ni sonar a spam',
    '- Destacá lo que hace especial al negocio (ambiente, especialidad, para qué es ideal)',
    '- No repitas el nombre del negocio (ya aparece en la tarjeta)',
    '- Español de Costa Rica, sin comillas ni signos de más',
    '- Devolvé SOLO la frase, sin introducción'
  ].join('\n');

  const info = [
    `Nombre: ${negocio.nombre}`,
    `Categoría: ${negocio.categoria}`,
    `Descripción: ${negocio.descripcion || ''}`,
    `Descripción emocional: ${negocio.descripcion_emocional || ''}`,
    `Vibes: ${negocio.vibes || ''}`
  ].join('\n');

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 80,
    temperature: 0.6,
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: info }
    ]
  });

  return response.choices[0].message.content.trim().replace(/^["']|["']$/g, '');
};

module.exports = { extraerTextoDeMenu, generarResumenDirectorio };
