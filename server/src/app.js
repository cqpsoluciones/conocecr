const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('./db');

const app = express();

// Seguridad HTTP básica, agrega headers de seguridad automáticamente. Protege contra ataques comunes como clickjacking y XSS sin que tengas que configurar nada.

app.use(helmet()); 
// Configuración de CORS, solo acepta requests desde tu frontend. En desarrollo acepta localhost:3000, en producción solo conocecr.com.
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://conocecr.com', 
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

// Parsear JSON en las requests, le dice a Express que entienda JSON en el body de las requests. El límite de 10kb protege contra requests maliciosamente grandes.
app.use(express.json({ limit: '10kb' }));

// Rate limiting: máximo 100 requests por IP cada 15 minutos, Esto protege tu cuenta de OpenAI de costos inesperados.
const limiter = rateLimit({  
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Demasiadas peticiones. Intentá de nuevo en 15 minutos.' }
});
app.use('/api', limiter);

// Rutas (las vamos agregando de a una)
app.use('/api/chat', require('./routes/chat'));
app.use('/api/businesses', require('./routes/businesses'));
app.use('/api/registro', require('./routes/registro'));

// Ruta de prueba para verificar que el servidor funciona
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Servidor Conoce CR funcionando' });
});

// Manejo global de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = app;