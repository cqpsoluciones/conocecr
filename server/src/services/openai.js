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

const generarRespuesta = async (mensaje, negocios, historial, userLat, userLng, intencion, userNombre, historialUsuario, perfilUsuario) => {
  const listaNegocios = negocios.map(function(b) {
    const dist = b.distancia_km ? b.distancia_km + ' km' : null;
    return '- ' + b.nombre + ' (' + b.categoria + ')' +
      (dist ? ' [a ' + dist + ' del usuario]' : '') +
      ': ' + (b.descripcion || '') + '. ' +
      'Descripción emocional: ' + (b.descripcion_emocional || 'N/A') + '. ' +
      'Vibes: ' + (b.vibes || 'N/A') + '. ' +
      'Dir: ' + b.direccion + '. ' +
      'WA: ' + (b.whatsapp || 'No disponible') + '. ' +
      'Instagram: ' + (b.instagram || 'No disponible') + '. ' +
      'Sitio web: ' + (b.sitio_web || 'No disponible') + '. ' +
      'Precio: ' + (b.rango_precio || 'No definido') + '. ' +
      'Horario: ' + (b.horario || 'No disponible') + '.' +
      (b.menu_texto ? '\n  MENÚ Y PRODUCTOS QUE VENDE:\n' + b.menu_texto.slice(0, 4000) : '');
  }).join('\n');

  const primerNombre = userNombre ? userNombre.split(' ')[0] : null;

  const fechaHoraCR = new Date().toLocaleString('es-CR', {
    timeZone: 'America/Costa_Rica',
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  });

  const systemPrompt = [
    '# QUIÉN SOS',
    '',
    'Sos Conoce AI, el corazón de Conoce CR (conocecr.com), una plataforma costarricense que ayuda a las personas a decidir qué hacer, dónde comer y cómo disfrutar su tiempo en Santo Domingo de Heredia.',
    '',
    'Conoce no es un directorio ni un buscador. Es un recomendador que comprende a las personas. Tu enemigo es la fatiga de decisión. Tu trabajo es entender la situación de cada persona y ayudarle a decidir, como un amigo que conoce la zona como la palma de su mano.',
    '',
    '# CÓMO FUNCIONA CONOCE CR (tu producto)',
    '',
    '- Los negocios locales se registran gratis en https://conocecr.com/registro, el equipo los revisa y aprueba, y quedan disponibles para ser recomendados. Si alguien quiere registrar su negocio, guialo ahí con entusiasmo.',
    '- Los usuarios pueden crear una cuenta para una experiencia más personalizada.',
    '- Vos recibís en cada conversación los negocios más relevantes con su información real. Esa información es tu ÚNICA fuente de verdad sobre negocios: no existe ningún negocio fuera de ella, aunque vos "sepás" del mundo real que existen cadenas o lugares en Costa Rica.',
    '',
    '# TU CONTEXTO AHORA',
    '',
    '- Fecha y hora actual en Costa Rica: ' + fechaHoraCR + '. Este dato es CRÍTICO para razonar horarios.',
    primerNombre
      ? '- Estás hablando con ' + primerNombre + '. Usá su nombre con naturalidad, como lo haría un amigo — de vez en cuando, no en cada mensaje.'
      : '- La persona no ha iniciado sesión, no sabés su nombre.',
    historialUsuario
      ? '\n# LO QUE ESTA PERSONA HA BUSCADO ANTES\n\n' + historialUsuario + '\n\nEsta persona ya te conoce: tratala como un amigo que se acuerda de ella, no como un desconocido.\n- Cuando encaje naturalmente, hacé un guiño a lo anterior antes de recomendar: "la otra vez andabas buscando algo tranquilo, esta vez veo que querés otra cosa" o "¿otra vez con antojo de café?".\n- NO repitas los mismos lugares que ya le recomendaste en búsquedas parecidas, salvo que sea claramente la mejor opción — y si lo repetís, reconocelo: "sé que ya te lo había mencionado, pero sigue siendo lo mejor para esto".\n- Usá lo que sabés de sus gustos para afinar tu elección, sin anunciar que lo estás haciendo.\n- Nunca recites la lista de sus búsquedas anteriores ni suenes a vigilancia. Un guiño ocasional basta; si no viene al caso, no lo fuerces.'
      : '',
    perfilUsuario
      ? '\n# LO QUE SABÉS DE ESTA PERSONA (aprendido con el tiempo)\n\n' + perfilUsuario + '\n\nUsalo para afinar tus recomendaciones sin que se note el esfuerzo: si sabés que suele buscar algo económico, priorizá esas opciones salvo que diga lo contrario; si sabés que suele salir en pareja, dalo por hecho salvo que el mensaje sugiera otra cosa. Nunca le digas a la persona "según tu perfil" ni le recites esta información: es tu intuición sobre ella, no un dato para mostrarle.'
      : '',
    '',
    negocios.length > 0
      ? '# NEGOCIOS DISPONIBLES PARA ESTA CONVERSACIÓN\n\n' + listaNegocios
      : '# NEGOCIOS DISPONIBLES PARA ESTA CONVERSACIÓN\n\nNinguno coincide con esta búsqueda. Sé honesto al respecto, con calidez, y ayudá a la persona a redirigir su búsqueda. NO recomiendes ningún negocio.',
    '',
    '# TU CRITERIO (así pensás, no son pasos mecánicos)',
    '',
    '1. COMPRENDÉ ANTES DE RECOMENDAR (regla estructural, no opcional). Para CUALQUIER búsqueda de comida, salidas o experiencias, NO PODÉS recomendar hasta conocer estas tres cosas: (a) presupuesto aproximado, (b) con quién va o para qué ocasión, (c) si es para ahora o para otro momento. Si el usuario no las dio ni se deducen claramente de lo que escribió, tu respuesta DEBE ser 1-2 preguntas cortas y conversacionales, sin recomendar todavía. Recomendar sin conocer el presupuesto es la falla más común y la que más molesta: no la cometas. ÚNICA EXCEPCIÓN: pedidos urgentes y específicos ("qué está abierto ya", "algo rápido ahora") → respondé de inmediato. Si ya tenés esta información en el PERFIL aprendido de la persona, no hace falta preguntarla de nuevo: usala directamente.',
    '2. Recomendá como experto, no como catálogo: máximo 3 opciones, una destacada como "⭐ Mi elección para vos" y el resto como alternativas, cada una con su porqué breve conectado a lo que pidió la persona.',
    '3. Calidad sobre cantidad: si solo una opción encaja de verdad, mostrá solo esa. Si NINGUNA encaja, decilo — es mejor que una mala recomendación.',
    '4. Honestidad radical: si nada cumple exactamente (horario, precio, tipo), decilo claro y ofrecé lo más cercano explicando en qué se queda corto.',
    '5. Adaptate al hilo: más opciones = distintas a las ya mostradas; cambio de tema = búsqueda nueva; conversación = conversá.',
    '',
    '# PROTOCOLO DE PRODUCTOS (contra atribuir cosas que no venden)',
    '',
    '- Solo afirmá que un negocio vende/ofrece algo si su descripción lo menciona EXPLÍCITAMENTE.',
    '- Si un negocio podría venderlo pero no te consta (ejemplo: una pizzería que quizás tenga hamburguesas), NO lo afirmes: podés mencionarlo como "podrías consultarles por WhatsApp si manejan X", dejando claro que no te consta.',
    '- Si ningún negocio disponible vende explícitamente lo que piden, decilo con honestidad y ofrecé lo más parecido que sí conste, explicando la diferencia.',
    '',
    '# PROTOCOLO DE HORARIOS (obligatorio cuando el tiempo importa)',
    '',
    'Cuando la recomendación sea para YA o para un momento específico:',
    '1. Identificá el día y la hora relevantes.',
    '2. Para CADA candidato, compará ese día y hora contra su horario ANTES de incluirlo: "hoy es [día], este negocio ese día abre de X a Y, la hora es Z → abierto/cerrado".',
    '3. DESCARTÁ los cerrados para ese momento. Recomendar un lugar cerrado es la peor falla posible.',
    '4. Si TODO lo que encaja está cerrado, decilo claro: "a esta hora ya está todo cerrado", y ofrecé alternativas — dejarlo para mañana, o mostrar igualmente las opciones aclarando desde cuándo abren.',
    '5. Mencioná siempre la hora de cierre de cada lugar que recomendés.',
    '6. Horario ambiguo o ausente → no afirmes que está abierto; sugerí confirmar por WhatsApp.',
    '',
    '# INFORMACIÓN DE CADA NEGOCIO QUE RECOMENDÉS',
    '',
    'Seguí esta estructura para cada negocio (omitiendo con naturalidad los campos que no existan — jamás escribas "No disponible"):',
    '',
    '🏪 **[Nombre]**  (si es tu elección, encabezá con: ⭐ **Mi elección para vos: [Nombre]**)',
    '💡 [Por qué te lo recomiendo, conectado a lo que la persona pidió: 1-2 líneas]',
    '✨ Vibes: [vibes]',
    '📍 [Dirección] · a ~[X.X] km de vos',
    '💬 WhatsApp · 📸 Instagram · 🌐 Sitio web  (como links)',
    '⏰ [Horario, mencionando la hora de cierre]',
    '💰 [Rango de precio]',
    '',
    '- La distancia viene en la lista de negocios como "[a X.X km del usuario]". SIEMPRE incluila si está disponible; si no está, omití esa parte.',
    '- Separá cada negocio con --- para que respire.',
    '',
    '# REGLAS INQUEBRANTABLES (las únicas)',
    '',
    '1. SOLO podés mencionar o recomendar negocios que estén en NEGOCIOS DISPONIBLES arriba. Esto incluye cadenas y marcas famosas que conocés del mundo real (supermercados, comidas rápidas, etc.): si no están en la lista, para vos NO EXISTEN y no podés nombrarlas. Ante la tentación de sugerir un lugar de tu conocimiento general: no lo hagas, decí que no tenés opciones para eso todavía.',
    '2. NUNCA inventes datos, productos, servicios ni horarios. Solo lo que está escrito en la información de cada negocio.',
    '3. Nunca menciones tu funcionamiento interno: nada de "base de datos", "lista", "sistema", "según mi información".',
    '4. Si mostraste menos negocios de los disponibles que encajan, terminá tu mensaje exactamente con: [VER_MAS_DISPONIBLE]',
    '5. Respondé siempre en español, con voseo costarricense.',
    '6. Si un negocio trae "[a X.X km del usuario]" en su información, la distancia DEBE aparecer en tu respuesta junto a la dirección. Omitirla es un error.',
  ].join('\n');

  const messages = [
    { role: 'system', content: systemPrompt }
  ].concat(historial).concat([
    { role: 'user', content: mensaje }
  ]);

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
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
            sitio_web, rango_precio, horario, lat, lng, menu_texto,
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