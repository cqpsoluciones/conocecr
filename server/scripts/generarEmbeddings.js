require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const pool = require('../src/db');
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const generarTextoNegocio = (b) => [
  `Nombre: ${b.nombre}`,
  `Categoría: ${b.categoria || ''}`,
  `Descripción: ${b.descripcion || ''}`,
  `Descripción emocional: ${b.descripcion_emocional || ''}`,
  `Vibes: ${b.vibes || ''}`,
  `Dirección: ${b.direccion || ''}`,
  `Precio: ${b.rango_precio || ''}`,
  `Horario: ${b.horario || ''}`
].filter(l => !l.endsWith(': ')).join('\n');

const main = async () => {
  const { rows } = await pool.query(
    'SELECT * FROM businesses WHERE active = true AND embedding IS NULL'
  );

  console.log(`Generando embeddings para ${rows.length} negocios...`);

  for (const negocio of rows) {
    const texto = generarTextoNegocio(negocio);

    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: texto
    });

    const embedding = response.data[0].embedding;

    await pool.query(
      'UPDATE businesses SET embedding = $1 WHERE id = $2',
      [`[${embedding.join(',')}]`, negocio.id]
    );

    console.log(`✓ ${negocio.nombre}`);
  }

  console.log('Embeddings generados exitosamente.');
  await pool.end();
};

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});