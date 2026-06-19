//Pool: en lugar de abrir y cerrar una conexión a la base de datos por cada request, un "pool" mantiene varias conexiones abiertas y las reutiliza. 
// Esto es mucho más eficiente cuando hay múltiples usuarios haciendo requests al mismo tiempo.

const { Pool } = require('pg');


//  lee la URL de conexión que pusiste en el .env. Esa URL tiene todo: el host, el puerto, el usuario, la contraseña y el nombre de la base de datos en un solo string.

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// cuando el servidor arranca, intenta conectarse a PostgreSQL inmediatamente. 
// Si la conexión falla, lo ves en la consola al instante en lugar de descubrirlo cuando un usuario hace una request.

pool.connect()
  .then(() => console.log('Conectado a PostgreSQL'))
  .catch(err => console.error('Error al conectar a PostgreSQL:', err));

module.exports = pool;
// exporta el pool para que otros archivos puedan importarlo y hacer consultas.