import { useState } from 'react'
import axios from 'axios'
import './Registro.css'

const API_URL = import.meta.env.VITE_API_URL

const CATEGORIAS = [
  'Restaurante', 'Cafetería / Café', 'Heladería', 'Panadería / Repostería',
  'Bar', 'Gimnasio', 'Salón de belleza', 'Barbería', 'Spa / Estética',
  'Farmacia', 'Clínica / Salud', 'Ferretería', 'Tienda / Comercio',
  'Minisuper / Abarrotes', 'Ropa / Moda', 'Tecnología / Electrónica',
  'Servicios profesionales', 'Educación / Academia', 'Entretenimiento', 'Otro'
]

const VIBES = [
  'Romántico', 'Chill', 'Familiar', 'Pet Friendly', 'Para trabajar',
  'Elegante', 'Animado', 'Tranquilo', 'Casual', 'Rápido', 'Premium'
]

const RANGOS = [
  '₡1.000 - ₡3.000', '₡3.000 - ₡6.000', '₡6.000 - ₡10.000',
  '₡10.000 - ₡15.000', 'Más de ₡15.000', 'No aplica'
]

const CATEGORIAS_COMIDA = [
  'Restaurante', 'Cafetería / Café', 'Heladería', 'Panadería / Repostería', 'Bar'
]



export default function Registro() {
  const [form, setForm] = useState({
    nombre: '', categoria: '', descripcion: '', descripcionEmocional: '',
    vibes: [], direccion: '', horario: '', whatsapp: '',
    instagram: '', tiktok: '', facebook: '', sitioWeb: '', rangoPrecio: '',
    menu: null
  })
  const [estado, setEstado] = useState('idle') // idle | loading | success | error
  const [error, setError] = useState('')

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const toggleVibe = (vibe) => {
    setForm(prev => ({
      ...prev,
      vibes: prev.vibes.includes(vibe)
        ? prev.vibes.filter(v => v !== vibe)
        : [...prev.vibes, vibe]
    }))
  }

  const validar = () => {
    if (!form.nombre.trim()) return 'El nombre del negocio es obligatorio'
    if (!form.categoria) return 'Seleccioná una categoría'
    if (!form.descripcion.trim()) return 'La descripción general es obligatoria'
    if (!form.descripcionEmocional.trim()) return 'La descripción emocional es obligatoria'
    if (form.vibes.length === 0) return 'Seleccioná al menos una vibe'
    if (!form.direccion.trim()) return 'La dirección es obligatoria'
    if (!form.horario.trim()) return 'El horario es obligatorio'
    if (!form.whatsapp.trim()) return 'El WhatsApp es obligatorio'
    if (form.whatsapp.replace(/\D/g, '').length !== 8) return 'El WhatsApp debe tener 8 dígitos'
    return null
  }

  const enviar = async () => {
    const err = validar()
    if (err) { setError(err); return }
    setError('')
    setEstado('loading')
    try {
      const formData = new FormData()
      Object.keys(form).forEach(key => {
        if (key === 'vibes') {
          formData.append('vibes', JSON.stringify(form.vibes))
        } else if (key === 'menu') {
          if (form.menu) formData.append('menu', form.menu)
        } else {
          formData.append(key, form[key])
        }
      })

      await axios.post(`${API_URL}/registro`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setEstado('success')
    } catch (e) {
      setEstado('error')
      setError('Hubo un error al enviar la solicitud. Intentá de nuevo.')
    }
  }

  if (estado === 'success') {
    return (
      <div className="reg-success">
        <div className="reg-success-card">
          <div className="reg-success-icon">🎉</div>
          <h2>¡Solicitud enviada!</h2>
          <p>Recibimos la información de <strong>{form.nombre}</strong>. El equipo de Conoce CR la revisará y te contactaremos pronto.</p>
          <a href="/" className="reg-btn-home">Volver al inicio</a>
        </div>
      </div>
    )
  }

  return (
    <div className="reg-page">
      <nav className="reg-nav">
        <a href="/" className="reg-nav-brand">
          <img src="https://static.wixstatic.com/media/da6e7c_8eec0562fb80432084031482cfbafc82~mv2.png" alt="Conoce" />
          Conoce CR
        </a>
      </nav>

      <div className="reg-container">
        <div className="reg-header">
          <span className="reg-badge">● REGISTRO ABIERTO</span>
          <h1>Agrega tu<br />negocio.</h1>
          <p>Sé parte de los negocios conocedores de Santo Domingo de Heredia.<br />Tu solicitud será revisada y publicada en menos de 24 horas.</p>
        </div>

        <div className="reg-form">

          {/* SECCIÓN 1 — INFORMACIÓN BÁSICA */}
          <div className="reg-section">
            <div className="reg-section-title">INFORMACIÓN BÁSICA</div>

            <div className="reg-field">
              <label className="reg-label">NOMBRE DEL NEGOCIO <span className="req">*</span></label>
              <input
                className="reg-input"
                placeholder="Ej: Pizzería Mario"
                value={form.nombre}
                onChange={e => set('nombre', e.target.value)}
              />
            </div>

            <div className="reg-grid-2">
              <div className="reg-field">
                <label className="reg-label">CATEGORÍA <span className="req">*</span></label>
                <select className="reg-select" value={form.categoria} onChange={e => set('categoria', e.target.value)}>
                  <option value="">Seleccioná una</option>
                  {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="reg-field">
                <label className="reg-label">RANGO DE PRECIO POR PERSONA <span className="req">*</span></label>
                <select className="reg-select" value={form.rangoPrecio} onChange={e => set('rangoPrecio', e.target.value)}>
                  <option value="">Seleccioná un rango</option>
                  {RANGOS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* SECCIÓN 2 — DESCRIPCIÓN */}
          <div className="reg-section">
            <div className="reg-section-title">DESCRIPCIÓN</div>

            <div className="reg-field">
              <label className="reg-label">DESCRIPCIÓN GENERAL <span className="req">*</span></label>
              <textarea
                className="reg-textarea"
                placeholder="¿Qué ofrece tu negocio? Sé breve y claro."
                rows={4}
                value={form.descripcion}
                onChange={e => set('descripcion', e.target.value)}
              />
            </div>

            <div className="reg-field">
              <label className="reg-label">DESCRIPCIÓN EMOCIONAL <span className="req">*</span></label>
              <textarea
                className="reg-textarea"
                placeholder="¿Cómo se siente estar en tu negocio? Ambiente, sensaciones, para qué momento es ideal."
                rows={4}
                value={form.descripcionEmocional}
                onChange={e => set('descripcionEmocional', e.target.value)}
              />
              <span className="reg-hint">Esta descripción la usa la IA para recomendar tu negocio en el contexto correcto.</span>
            </div>

            <div className="reg-field">
              <label className="reg-label">VIBES DEL LUGAR <span className="req">*</span> <span className="reg-label-sub">ELEGÍ AL MENOS UNA</span></label>
              <div className="reg-vibes">
                {VIBES.map(v => (
                  <button
                    key={v}
                    type="button"
                    className={`reg-vibe ${form.vibes.includes(v) ? 'active' : ''}`}
                    onClick={() => toggleVibe(v)}
                  >
                    <span className="reg-vibe-circle" />
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* SECCIÓN 3 — UBICACIÓN Y HORARIO */}
         <div className="reg-section">
            <div className="reg-section-title">UBICACIÓN Y HORARIO</div>

            <div className="reg-field">
              <label className="reg-label">DIRECCIÓN EXACTA <span className="req">*</span></label>
              <input
                className="reg-input"
                placeholder="Ej: 100m norte del parque central de Santo Domingo"
                value={form.direccion}
                onChange={e => set('direccion', e.target.value)}
              />
            </div>

            <div className="reg-field">
              <label className="reg-label">HORARIO DE ATENCIÓN <span className="req">*</span></label>
              <input
                className="reg-input"
                placeholder="Ej: Lun–Sáb 8am–7pm, Dom cerrado"
                value={form.horario}
                onChange={e => set('horario', e.target.value)}
              />
            </div>

            {CATEGORIAS_COMIDA.includes(form.categoria) && (
              <div className="reg-field">
                <label className="reg-label">MENÚ (PDF, JPG O PNG)</label>
                <div className="reg-file-wrap">
                  <input
                    type="file"
                    id="menu-upload"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={e => set('menu', e.target.files[0] || null)}
                    className="reg-file-input"
                  />
                  <label htmlFor="menu-upload" className="reg-file-label">
                    {form.menu ? `📎 ${form.menu.name}` : '📎 Subir menú'}
                  </label>
                </div>
                <span className="reg-hint">Opcional. Ayuda a la IA a recomendar tu negocio con más precisión.</span>
              </div>
            )}
          </div>

          {/* SECCIÓN 4 — CONTACTO */}
          <div className="reg-section">
            <div className="reg-section-title">CONTACTO</div>

            <div className="reg-field">
              <label className="reg-label">WHATSAPP <span className="req">*</span></label>
              <input
                className="reg-input"
                placeholder="Ej: 88881234"
                value={form.whatsapp}
                onChange={e => set('whatsapp', e.target.value)}
                maxLength={8}
              />
              <span className="reg-hint">Solo el número local de 8 dígitos, sin el prefijo 506.</span>
            </div>

            <div className="reg-grid-2">
              <div className="reg-field">
                <label className="reg-label">INSTAGRAM</label>
                <input className="reg-input" placeholder="@usuario o link completo" value={form.instagram} onChange={e => set('instagram', e.target.value)} />
              </div>
              <div className="reg-field">
                <label className="reg-label">TIKTOK</label>
                <input className="reg-input" placeholder="@usuario o link completo" value={form.tiktok} onChange={e => set('tiktok', e.target.value)} />
              </div>
              <div className="reg-field">
                <label className="reg-label">FACEBOOK</label>
                <input className="reg-input" placeholder="Nombre de página o link" value={form.facebook} onChange={e => set('facebook', e.target.value)} />
              </div>
              <div className="reg-field">
                <label className="reg-label">SITIO WEB</label>
                <input className="reg-input" placeholder="https://tunegocio.com" value={form.sitioWeb} onChange={e => set('sitioWeb', e.target.value)} />
              </div>
            </div>
          </div>

          {error && <div className="reg-error">{error}</div>}

          <button
            className="reg-submit"
            onClick={enviar}
            disabled={estado === 'loading'}
          >
            {estado === 'loading' ? 'ENVIANDO...' : 'ENVIAR SOLICITUD'}
          </button>

          <p className="reg-footer-note">
            Tu solicitud será revisada por el equipo de Conoce CR.<br />
            Los campos marcados con <span className="req">*</span> son obligatorios.
          </p>
        </div>
      </div>
    </div>
  )
}