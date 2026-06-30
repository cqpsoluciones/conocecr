const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

const enviarSolicitudNegocio = async (datos) => {
  const {
    id, nombre, categoria, descripcion, descripcionEmocional,
    vibes, direccion, horario, whatsapp, instagram, tiktok,
    facebook, sitioWeb, rangoPrecio, lat, lng
  } = datos;

  const mapLink = lat && lng
    ? `https://www.google.com/maps?q=${lat},${lng}`
    : `https://www.google.com/maps/search/${encodeURIComponent(direccion + ', Santo Domingo, Heredia, Costa Rica')}`;

  const baseUrl = process.env.FRONTEND_URL || 'https://conocecr.com';
  const approvalUrl = `${process.env.RAILWAY_URL || 'https://conocecr-production.up.railway.app'}/api/registro/aprobar/${id}`;
  const rejectUrl = `${process.env.RAILWAY_URL || 'https://conocecr-production.up.railway.app'}/api/registro/rechazar/${id}`;

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #0a0a0b; color: #f0f0f0; margin: 0; padding: 0; }
    .container { max-width: 640px; margin: 0 auto; padding: 32px 24px; }
    .header { border-bottom: 1px solid #222; padding-bottom: 24px; margin-bottom: 32px; }
    .header h1 { font-size: 28px; font-weight: 800; color: #fff; margin: 0 0 8px; }
    .header p { color: #6b6b75; font-size: 14px; margin: 0; }
    .badge { display: inline-block; background: rgba(126,207,164,0.1); border: 1px solid rgba(126,207,164,0.3); color: #7ecfa4; font-size: 11px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; padding: 4px 12px; border-radius: 999px; margin-bottom: 16px; }
    .section { margin-bottom: 28px; }
    .section-title { font-size: 10px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: #6b6b75; margin-bottom: 16px; border-bottom: 1px solid #1a1a1e; padding-bottom: 8px; }
    .field { margin-bottom: 14px; }
    .field-label { font-size: 11px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: #6b6b75; margin-bottom: 4px; }
    .field-value { font-size: 14px; color: #f0f0f0; background: #111114; border: 1px solid #222; border-radius: 8px; padding: 10px 14px; }
    .field-value a { color: #7ecfa4; text-decoration: none; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .vibes { display: flex; flex-wrap: wrap; gap: 8px; }
    .vibe-tag { background: rgba(255,255,255,0.05); border: 1px solid #333; border-radius: 999px; padding: 4px 12px; font-size: 12px; color: #c0c0c8; }
    .map-section { background: #111114; border: 1px solid #222; border-radius: 12px; padding: 16px; margin-bottom: 28px; }
    .map-section p { font-size: 13px; color: #6b6b75; margin: 0 0 12px; }
    .map-link { display: inline-block; background: #1a1a1e; border: 1px solid #333; color: #7ecfa4; text-decoration: none; font-size: 13px; font-weight: 500; padding: 8px 16px; border-radius: 8px; }
    .coords { font-size: 12px; color: #6b6b75; margin-top: 8px; font-family: monospace; }
    .actions { display: flex; gap: 12px; margin-top: 32px; }
    .btn-approve { flex: 1; background: #7ecfa4; color: #0a0a0b; font-size: 14px; font-weight: 700; letter-spacing: 0.5px; text-align: center; padding: 14px; border-radius: 10px; text-decoration: none; display: block; }
    .btn-reject { flex: 1; background: transparent; color: #cc2200; font-size: 14px; font-weight: 600; text-align: center; padding: 14px; border-radius: 10px; text-decoration: none; display: block; border: 1px solid #cc2200; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #1a1a1e; font-size: 11px; color: #6b6b75; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">Nueva solicitud</div>
      <h1>${nombre}</h1>
      <p>ID: ${id} · ${new Date().toLocaleDateString('es-CR', { dateStyle: 'long' })}</p>
    </div>

    <div class="section">
      <div class="section-title">Información básica</div>
      <div class="grid">
        <div class="field">
          <div class="field-label">Categoría</div>
          <div class="field-value">${categoria}</div>
        </div>
        <div class="field">
          <div class="field-label">Rango de Precio</div>
          <div class="field-value">${rangoPrecio || 'No definido'}</div>
        </div>
      </div>
      <div class="field">
        <div class="field-label">Descripción General</div>
        <div class="field-value">${descripcion}</div>
      </div>
      <div class="field">
        <div class="field-label">Descripción Emocional</div>
        <div class="field-value">${descripcionEmocional}</div>
      </div>
      <div class="field">
        <div class="field-label">Vibes</div>
        <div class="field-value">
          <div class="vibes">
            ${vibes.map(v => `<span class="vibe-tag">${v}</span>`).join('')}
          </div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Ubicación y horario</div>
      <div class="field">
        <div class="field-label">Dirección</div>
        <div class="field-value">${direccion}</div>
      </div>
      <div class="field">
        <div class="field-label">Horario</div>
        <div class="field-value">${horario}</div>
      </div>
    </div>

    <div class="map-section">
      <p>📍 Verificá la ubicación en Google Maps antes de aprobar</p>
      <a href="${mapLink}" target="_blank" class="map-link">Ver en Google Maps →</a>
      ${lat && lng ? `<div class="coords">lat: ${lat}, lng: ${lng}</div>` : '<div class="coords">Coordenadas generadas automáticamente desde la dirección</div>'}
    </div>

    <div class="section">
      <div class="section-title">Contacto y redes</div>
      <div class="grid">
        <div class="field">
          <div class="field-label">WhatsApp</div>
          <div class="field-value"><a href="${whatsapp}">${whatsapp}</a></div>
        </div>
        ${sitioWeb ? `
        <div class="field">
          <div class="field-label">Sitio Web</div>
          <div class="field-value"><a href="${sitioWeb}">${sitioWeb}</a></div>
        </div>` : ''}
        ${instagram ? `
        <div class="field">
          <div class="field-label">Instagram</div>
          <div class="field-value"><a href="${instagram}">${instagram}</a></div>
        </div>` : ''}
        ${tiktok ? `
        <div class="field">
          <div class="field-label">TikTok</div>
          <div class="field-value"><a href="${tiktok}">${tiktok}</a></div>
        </div>` : ''}
        ${facebook ? `
        <div class="field">
          <div class="field-label">Facebook</div>
          <div class="field-value"><a href="${facebook}">${facebook}</a></div>
        </div>` : ''}
      </div>
    </div>

    <div class="actions">
      <a href="${approvalUrl}" class="btn-approve">✅ Aprobar negocio</a>
      <a href="${rejectUrl}" class="btn-reject">❌ Rechazar</a>
    </div>

    <div class="footer">
      Conoce CR · Sistema de registro de negocios · Santo Domingo de Heredia
    </div>
  </div>
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