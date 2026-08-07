const express = require('express');
const router = express.Router();
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

// POST /api/contacto
router.post('/', async (req, res) => {
  try {
    const { nombre, telefono, email, mensaje } = req.body;

    // Validaciones
    if (!nombre?.trim() || !telefono?.trim() || !mensaje?.trim()) {
      return res.status(400).json({ error: 'Nombre, teléfono y mensaje son obligatorios' });
    }

    // Si dejó correo, validamos formato básico
    if (email?.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({ error: 'El correo electrónico no es válido' });
      }
    }

    const telLimpio = telefono.trim();
    const emailLimpio = email?.trim() || null;

    const html = `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; color: #1a1a1a;">
        <h2 style="color: #1a1a2e;">Nuevo mensaje de contacto</h2>
        <p style="font-size: 15px; line-height: 1.6;">
          <strong>Nombre:</strong> ${nombre.trim()}<br>
          <strong>Teléfono:</strong> <a href="tel:${telLimpio}">${telLimpio}</a><br>
          ${emailLimpio ? `<strong>Correo:</strong> <a href="mailto:${emailLimpio}">${emailLimpio}</a><br>` : ''}
        </p>
        <p style="font-size: 15px; line-height: 1.6; background: #f5f5f7; padding: 16px; border-radius: 10px;">
          ${mensaje.trim().replace(/\n/g, '<br>')}
        </p>
        <p style="color: #888; font-size: 12px; margin-top: 24px;">
          Enviado desde el formulario de contacto de conocecr.com
        </p>
      </div>
    `;

    // Configuración del envío: si dejó correo, activamos reply_to para responderle directo
    const opciones = {
      from: process.env.RESEND_FROM,
      to: 'cqpsoluciones@gmail.com',
      subject: `Nuevo contacto de ${nombre.trim()} — Conoce CR`,
      html
    };

    if (emailLimpio) {
      opciones.reply_to = emailLimpio;
    }

    await resend.emails.send(opciones);

    res.json({ ok: true });

  } catch (error) {
    console.error('Error al enviar contacto:', error);
    res.status(500).json({ error: 'No se pudo enviar el mensaje. Intentá de nuevo o escribinos por WhatsApp.' });
  }
});

module.exports = router;