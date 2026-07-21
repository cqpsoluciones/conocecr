const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../db');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

// ============================================
// POST /api/usuarios/registro
// Crea la cuenta, entra de inmediato, y envía
// el correo de verificación sin bloquear.
// ============================================
router.post('/registro', async (req, res) => {
  try {
    const { nombre, email, whatsapp, password, aceptaPromociones } = req.body;

    // --- Validaciones básicas ---
    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'Nombre, correo y contraseña son obligatorios' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'El correo electrónico no es válido' });
    }

    // --- Verificar que el correo no exista ya ---
    const existe = await pool.query(
      'SELECT id FROM usuarios WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    if (existe.rows.length > 0) {
      return res.status(409).json({ error: 'Ya existe una cuenta con ese correo' });
    }

    // --- Encriptar contraseña y generar token de verificación ---
    const passwordHash = await bcrypt.hash(password, 10);
    const tokenVerificacion = crypto.randomBytes(32).toString('hex');

    // --- Guardar el usuario ---
    const resultado = await pool.query(
      `INSERT INTO usuarios (nombre, email, whatsapp, password_hash, acepta_promociones, token_verificacion)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, nombre, email`,
      [
        nombre.trim(),
        email.toLowerCase().trim(),
        whatsapp ? whatsapp.trim() : null,
        passwordHash,
        aceptaPromociones === true,
        tokenVerificacion
      ]
    );
    const usuario = resultado.rows[0];

    // --- Enviar correo de verificación (sin bloquear el registro) ---
    const urlVerificacion = `${process.env.BACKEND_URL}/api/usuarios/verificar?token=${tokenVerificacion}`;
    resend.emails.send({
      from: process.env.RESEND_FROM,
      to: usuario.email,
      subject: 'Verificá tu cuenta en Conoce CR',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2>¡Hola ${usuario.nombre}! 👋</h2>
          <p>Gracias por unirte a <strong>Conoce CR</strong>. Tu cuenta ya está activa, pero nos gustaría confirmar tu correo.</p>
          <p style="margin: 24px 0;">
            <a href="${urlVerificacion}"
               style="background: #1a1a2e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">
              Verificar mi correo
            </a>
          </p>
          <p style="color: #888; font-size: 13px;">Si no creaste esta cuenta, podés ignorar este correo.</p>
        </div>
      `
    }).catch(err => console.error('Error enviando correo de verificación:', err));

    // --- Generar sesión de inmediato (entra sin esperar verificación) ---
    const token = jwt.sign(
      { userId: usuario.id, tipo: 'usuario' },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      token,
      usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email }
    });

  } catch (error) {
    console.error('Error en registro de usuario:', error);
    res.status(500).json({ error: 'Error al crear la cuenta' });
  }
});

// ============================================
// POST /api/usuarios/login
// ============================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Correo y contraseña son obligatorios' });
    }

    const resultado = await pool.query(
      'SELECT id, nombre, email, password_hash FROM usuarios WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    // Mensaje genérico a propósito: no revelamos si el correo existe o no
    if (resultado.rows.length === 0) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
    }

    const usuario = resultado.rows[0];
    const passwordValida = await bcrypt.compare(password, usuario.password_hash);

    if (!passwordValida) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
    }

    // Actualizar último acceso (útil para métricas futuras)
    await pool.query(
      'UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = $1',
      [usuario.id]
    );

    const token = jwt.sign(
      { userId: usuario.id, tipo: 'usuario' },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email }
    });

  } catch (error) {
    console.error('Error en login de usuario:', error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

// ============================================
// GET /api/usuarios/verificar?token=...
// El usuario llega aquí desde el correo.
// ============================================
router.get('/verificar', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).send('<h3>Enlace inválido.</h3>');
    }

    const resultado = await pool.query(
      `UPDATE usuarios
       SET email_verificado = true, token_verificacion = NULL
       WHERE token_verificacion = $1
       RETURNING nombre`,
      [token]
    );

    if (resultado.rows.length === 0) {
      return res.status(400).send('<h3>Este enlace ya fue usado o no es válido.</h3>');
    }

    res.send(`
      <div style="font-family: sans-serif; text-align: center; margin-top: 80px;">
        <h2>✅ ¡Correo verificado!</h2>
        <p>Gracias, ${resultado.rows[0].nombre}. Ya podés cerrar esta pestaña y seguir usando Conoce CR.</p>
        <a href="${process.env.FRONTEND_URL || 'https://conocecr.com'}">Ir a Conoce CR</a>
      </div>
    `);

  } catch (error) {
    console.error('Error verificando correo:', error);
    res.status(500).send('<h3>Error al verificar. Intentá de nuevo más tarde.</h3>');
  }
});


// ============================================
// POST /api/usuarios/recuperar
// Envía el correo con el enlace para restablecer.
// ============================================
router.post('/recuperar', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Ingresá tu correo electrónico' });
    }

    const resultado = await pool.query(
      'SELECT id, nombre, email FROM usuarios WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    // Respuesta genérica SIEMPRE: no revelamos si el correo existe o no
    const respuestaGenerica = {
      ok: true,
      mensaje: 'Si existe una cuenta con ese correo, te enviamos un enlace para restablecer tu contraseña.'
    };

    if (resultado.rows.length === 0) {
      return res.json(respuestaGenerica);
    }

    const usuario = resultado.rows[0];
    const token = crypto.randomBytes(32).toString('hex');

    await pool.query(
      `UPDATE usuarios
       SET reset_token = $1, reset_expira = NOW() + INTERVAL '1 hour'
       WHERE id = $2`,
      [token, usuario.id]
    );

    const urlReset = `${process.env.FRONTEND_URL || 'https://conocecr.com'}/nueva-contrasena?token=${token}`;

    resend.emails.send({
      from: process.env.RESEND_FROM,
      to: usuario.email,
      subject: 'Restablecé tu contraseña de Conoce CR',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2>Hola ${usuario.nombre.split(' ')[0]},</h2>
          <p>Recibimos una solicitud para restablecer tu contraseña en <strong>Conoce CR</strong>.</p>
          <p style="margin: 24px 0;">
            <a href="${urlReset}"
               style="background: #1a1a2e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">
              Crear nueva contraseña
            </a>
          </p>
          <p style="color: #888; font-size: 13px;">Este enlace vence en 1 hora. Si no pediste esto, podés ignorar el correo: tu contraseña sigue siendo la misma.</p>
        </div>
      `
    }).catch(err => console.error('Error enviando correo de recuperación:', err));

    res.json(respuestaGenerica);

  } catch (error) {
    console.error('Error en recuperación de contraseña:', error);
    res.status(500).json({ error: 'Error al procesar la solicitud' });
  }
});

// ============================================
// POST /api/usuarios/nueva-contrasena
// Cambia la contraseña usando el token del correo.
// ============================================
router.post('/nueva-contrasena', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Faltan datos' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }

    const resultado = await pool.query(
      `SELECT id, nombre, email FROM usuarios
       WHERE reset_token = $1 AND reset_expira > NOW()`,
      [token]
    );

    if (resultado.rows.length === 0) {
      return res.status(400).json({ error: 'El enlace venció o ya fue usado. Solicitá uno nuevo.' });
    }

    const usuario = resultado.rows[0];
    const passwordHash = await bcrypt.hash(password, 10);

    await pool.query(
      `UPDATE usuarios
       SET password_hash = $1, reset_token = NULL, reset_expira = NULL
       WHERE id = $2`,
      [passwordHash, usuario.id]
    );

    // Iniciamos sesión de una vez: ya demostró tener acceso al correo
    const tokenSesion = jwt.sign(
      { userId: usuario.id, tipo: 'usuario' },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token: tokenSesion,
      usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email }
    });

  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({ error: 'Error al cambiar la contraseña' });
  }
});


module.exports = router;