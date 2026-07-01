const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  },
  family: 4
});

const enviarSolicitudNegocio = async (datos) => {
  const {
    id, nombre, categoria, descripcion, descripcionEmocional,
    vibes, direccion, horario, whatsapp, instagram, tiktok,
    facebook, sitioWeb, rangoPrecio, lat, lng, menuUrl
  } = datos;

  const mapLink = lat && lng
    ? `https://www.google.com/maps?q=${lat},${lng}`
    : `https://www.google.com/maps/search/${encodeURIComponent(direccion + ', Santo Domingo, Heredia, Costa Rica')}`;

   const frontendUrl = process.env.FRONTEND_URL || 'https://conocecr.com';
  const approvalUrl = `${frontendUrl}/admin/revisar/${id}`;
  const rejectUrl = `${process.env.RAILWAY_URL || 'https://conocecr-production.up.railway.app'}/api/registro/rechazar/${id}`;

  const campo = (label, valor, esLink = false) => `
    <tr>
      <td style="padding: 0 0 14px 0;">
        <div style="font-size: 11px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: #6b6b75; margin-bottom: 4px; font-family: Arial, sans-serif;">${label}</div>
        <div style="font-size: 14px; color: #f0f0f0; background: #111114; border: 1px solid #2a2a2e; border-radius: 8px; padding: 10px 14px; font-family: Arial, sans-serif;">
          ${esLink ? `<a href="${valor}" style="color: #7ecfa4; text-decoration: none;">${valor}</a>` : valor}
        </div>
      </td>
    </tr>
  `;

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin: 0; padding: 0; background: #0a0a0b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #0a0a0b;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background: #0a0a0b;">

          <tr>
            <td style="padding-bottom: 24px; border-bottom: 1px solid #222;">
              <span style="display: inline-block; background: rgba(126,207,164,0.1); border: 1px solid rgba(126,207,164,0.3); color: #7ecfa4; font-size: 11px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; padding: 4px 12px; border-radius: 999px; font-family: Arial, sans-serif;">Nueva solicitud</span>
              <h1 style="font-size: 26px; font-weight: 800; color: #ffffff; margin: 12px 0 6px; font-family: Arial, sans-serif;">${nombre}</h1>
              <p style="color: #6b6b75; font-size: 13px; margin: 0; font-family: Arial, sans-serif;">ID: ${id} · ${new Date().toLocaleDateString('es-CR', { dateStyle: 'long' })}</p>
            </td>
          </tr>

          <tr>
            <td style="padding-top: 28px;">
              <div style="font-size: 10px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: #6b6b75; margin-bottom: 14px; border-bottom: 1px solid #1a1a1e; padding-bottom: 8px; font-family: Arial, sans-serif;">Información básica</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${campo('Categoría', categoria)}
                ${campo('Rango de Precio', rangoPrecio || 'No definido')}
                ${campo('Descripción General', descripcion)}
                ${campo('Descripción Emocional', descripcionEmocional)}
                ${campo('Vibes', vibes.join(', '))}
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding-top: 8px;">
              <div style="font-size: 10px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: #6b6b75; margin-bottom: 14px; border-bottom: 1px solid #1a1a1e; padding-bottom: 8px; font-family: Arial, sans-serif;">Ubicación y horario</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${campo('Dirección', direccion)}
                ${campo('Horario', horario)}
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding-bottom: 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #111114; border: 1px solid #222; border-radius: 12px;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="font-size: 13px; color: #6b6b75; margin: 0 0 12px; font-family: Arial, sans-serif;">📍 Verificá la ubicación en Google Maps antes de aprobar</p>
                    <a href="${mapLink}" style="display: inline-block; background: #1a1a1e; border: 1px solid #333; color: #7ecfa4; text-decoration: none; font-size: 13px; font-weight: 500; padding: 8px 16px; border-radius: 8px; font-family: Arial, sans-serif;">Ver en Google Maps →</a>
                    <div style="font-size: 12px; color: #6b6b75; margin-top: 8px; font-family: monospace;">
                      ${lat && lng ? `lat: ${lat}, lng: ${lng}` : 'Coordenadas generadas automáticamente desde la dirección'}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${menuUrl ? `
          <tr>
            <td style="padding-bottom: 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #111114; border: 1px solid #222; border-radius: 12px;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="font-size: 13px; color: #6b6b75; margin: 0 0 12px; font-family: Arial, sans-serif;">📋 El negocio adjuntó un menú</p>
                    <a href="${menuUrl}" style="display: inline-block; background: #1a1a1e; border: 1px solid #333; color: #7ecfa4; text-decoration: none; font-size: 13px; font-weight: 500; padding: 8px 16px; border-radius: 8px; font-family: Arial, sans-serif;">Ver menú →</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>` : ''}

          <tr>
            <td style="padding-top: 8px;">
              <div style="font-size: 10px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: #6b6b75; margin-bottom: 14px; border-bottom: 1px solid #1a1a1e; padding-bottom: 8px; font-family: Arial, sans-serif;">Contacto y redes</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${campo('WhatsApp', whatsapp, true)}
                ${sitioWeb ? campo('Sitio Web', sitioWeb, true) : ''}
                ${instagram ? campo('Instagram', instagram) : ''}
                ${tiktok ? campo('TikTok', tiktok) : ''}
                ${facebook ? campo('Facebook', facebook) : ''}
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding-top: 16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50%" style="padding-right: 6px;">
                    <a href="${approvalUrl}" style="display: block; background: #7ecfa4; color: #0a0a0b; font-size: 14px; font-weight: 700; letter-spacing: 0.5px; text-align: center; padding: 14px; border-radius: 10px; text-decoration: none; font-family: Arial, sans-serif;">✅ Aprobar negocio</a>
                  </td>
                  <td width="50%" style="padding-left: 6px;">
                    <a href="${rejectUrl}" style="display: block; background: #0a0a0b; color: #cc2200; font-size: 14px; font-weight: 600; text-align: center; padding: 14px; border-radius: 10px; text-decoration: none; border: 1px solid #cc2200; font-family: Arial, sans-serif;">❌ Rechazar</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding-top: 32px; border-top: 1px solid #1a1a1e; margin-top: 24px;">
              <p style="font-size: 11px; color: #6b6b75; text-align: center; padding-top: 16px; font-family: Arial, sans-serif;">Conoce CR · Sistema de registro de negocios · Santo Domingo de Heredia</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  await transporter.sendMail({
    from: `"Conoce CR" <${process.env.GMAIL_USER}>`,
    to: process.env.GMAIL_USER,
    subject: `Nueva solicitud: ${nombre}`,
    html
  });
};

module.exports = { enviarSolicitudNegocio };