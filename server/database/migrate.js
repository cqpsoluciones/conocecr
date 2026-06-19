require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const run = async () => {
  try {
    const filePath = path.join(__dirname, 'negocios.csv');
    const content = fs.readFileSync(filePath, 'utf8');

    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true,
      relax_column_count: true
    });

    console.log(`Registros encontrados: ${records.length}`);
    console.log('Columnas:', Object.keys(records[0]));

    const zoneResult = await pool.query(
      "SELECT id FROM zones WHERE name = 'Santo Domingo'"
    );
    const zoneId = zoneResult.rows[0].id;
    console.log('Zona Santo Domingo ID:', zoneId);

    let migrados = 0;
    let errores = 0;

    for (let i = 0; i < records.length; i++) {
      const row = records[i];

      // Convertir lat/lng a número o null
      const lat = row['Latitud'] && !isNaN(parseFloat(row['Latitud']))
        ? parseFloat(row['Latitud']) : null;
      const lng = row['Longitud'] && !isNaN(parseFloat(row['Longitud']))
        ? parseFloat(row['Longitud']) : null;

      try {
        await pool.query(`
          INSERT INTO businesses 
            (nombre, categoria, descripcion, descripcion_emocional, vibes,
             direccion, telefono, whatsapp, instagram, tiktok, facebook,
             sitio_web, rango_precio, horario, lat, lng, zone_id, active)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
        `, [
          row['Nombre'] || null,
          row['Categoría'] || null,
          row['Descripción'] || null,
          row['Descripción emocional'] || null,
          row['Vibes'] || null,
          row['Dirección'] || null,
          null,
          row['WhatsApp'] || null,
          row['Instagram'] || null,
          row['TikTok'] || null,
          row['Facebook'] || null,
          row['Sitio Web'] || null,
          row['Rango de Precio'] || null,
          row['Horario'] || null,
          lat,
          lng,
          zoneId,
          true
        ]);
        migrados++;
        console.log(`✓ ${row['Nombre']}`);
      } catch (err) {
        errores++;
        console.error(`✗ Error en fila ${i + 1} (${row['Nombre']}): ${err.message}`);
      }
    }

    console.log(`\nMigración completada: ${migrados} negocios importados, ${errores} errores`);
    await pool.end();

  } catch (err) {
    console.error('Error general:', err.message);
    await pool.end();
  }
};

run();