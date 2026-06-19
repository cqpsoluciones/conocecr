require('dotenv').config(); 

// //lee el archivo .env, y carga todas las variables (PORT, DATABASE_URL, etc.) 
// para que el resto del código las pueda usar con process.env.NOMBRE_VARIABLE.


const app = require('./src/app'); 

// importa el archivo app.js. Ese archivo tiene toda la configuracion de Express

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => { 
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});


//Arranca el server en el puerto 5000. El ||5000 significa que usa la variable PORT de entorno, y sino existe usa 5000.
//Railway inyectará su propio PORT en producción, pero localmente se usa 5000.