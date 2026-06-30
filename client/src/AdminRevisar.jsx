import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import AdminLogin from './AdminLogin'
import './Registro.css'

const API_URL = import.meta.env.VITE_API_URL

export default function AdminRevisar() {
  const { id } = useParams()
  const [token, setToken] = useState(localStorage.getItem('conocecr_admin_token'))
  const [solicitud, setSolicitud] = useState(null)
  const [estado, setEstado] = useState('loading') // loading | ready | saving | success | error
  const [error, setError] = useState('')

  useEffect(() => {
    if (token) cargarSolicitud()
  }, [token])

  const cargarSolicitud = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/registro/solicitud/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSolicitud(data)
      setEstado('ready')
    } catch (e) {
      if (e.response?.status === 401) {
        localStorage.removeItem('conocecr_admin_token')
        setToken(null)
      } else {
        setError('No se pudo cargar la solicitud')
        setEstado('error')
      }
    }
  }

  const set = (field, value) => setSolicitud(prev => ({ ...prev, [field]: value }))

  const confirmar = async () => {
    setEstado('saving')
    try {
      await axios.post(`${API_URL}/registro/confirmar/${id}`, solicitud, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setEstado('success')
    } catch (e) {
      setError('Error al aprobar el negocio')
      setEstado('ready')
    }
  }

  if (!token) {
    return <AdminLogin onLogin={(t) => setToken(t)} />
  }

  if (estado === 'loading') {
    return <div className="reg-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Cargando...</div>
  }

  if (estado === 'error') {
    return <div className="reg-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff6b4a' }}>{error}</div>
  }

  if (estado === 'success') {
    return (
      <div className="reg-success">
        <div className="reg-success-card">
          <div className="reg-success-icon">✅</div>
          <h2>Negocio aprobado</h2>
          <p><strong>{solicitud.nombre}</strong> ya está visible en Conoce CR.</p>
        </div>
      </div>
    )
  }

  const mapLink = solicitud.lat && solicitud.lng
    ? `https://www.google.com/maps?q=${solicitud.lat},${solicitud.lng}`
    : null

  return (
    <div className="reg-page">
      <nav className="reg-nav">
        <span className="reg-nav-brand">Revisión de solicitud</span>
      </nav>

      <div className="reg-container">
        <div className="reg-header">
          <span className="reg-badge">● REVISIÓN</span>
          <h1>{solicitud.nombre}</h1>
          <p>ID: {solicitud.id} · Revisá y corregí los datos antes de aprobar.</p>
        </div>

        <div className="reg-form">

          <div className="reg-section">
            <div className="reg-section-title">INFORMACIÓN BÁSICA</div>

            <div className="reg-field">
              <label className="reg-label">NOMBRE</label>
              <input className="reg-input" value={solicitud.nombre || ''} onChange={e => set('nombre', e.target.value)} />
            </div>

            <div className="reg-grid-2">
              <div className="reg-field">
                <label className="reg-label">CATEGORÍA</label>
                <input className="reg-input" value={solicitud.categoria || ''} onChange={e => set('categoria', e.target.value)} />
              </div>
              <div className="reg-field">
                <label className="reg-label">RANGO DE PRECIO</label>
                <input className="reg-input" value={solicitud.rango_precio || ''} onChange={e => set('rango_precio', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="reg-section">
            <div className="reg-section-title">DESCRIPCIÓN</div>

            <div className="reg-field">
              <label className="reg-label">DESCRIPCIÓN GENERAL</label>
              <textarea className="reg-textarea" rows={3} value={solicitud.descripcion || ''} onChange={e => set('descripcion', e.target.value)} />
            </div>

            <div className="reg-field">
              <label className="reg-label">DESCRIPCIÓN EMOCIONAL</label>
              <textarea className="reg-textarea" rows={3} value={solicitud.descripcion_emocional || ''} onChange={e => set('descripcion_emocional', e.target.value)} />
            </div>

            <div className="reg-field">
              <label className="reg-label">VIBES (separadas por coma)</label>
              <input className="reg-input" value={solicitud.vibes || ''} onChange={e => set('vibes', e.target.value)} />
            </div>
          </div>

          <div className="reg-section">
            <div className="reg-section-title">UBICACIÓN Y HORARIO</div>

            <div className="reg-field">
              <label className="reg-label">DIRECCIÓN</label>
              <input className="reg-input" value={solicitud.direccion || ''} onChange={e => set('direccion', e.target.value)} />
            </div>

            <div className="reg-field">
              <label className="reg-label">HORARIO</label>
              <input className="reg-input" value={solicitud.horario || ''} onChange={e => set('horario', e.target.value)} />
            </div>

            <div className="reg-grid-2">
              <div className="reg-field">
                <label className="reg-label">LATITUD</label>
                <input className="reg-input" value={solicitud.lat || ''} onChange={e => set('lat', e.target.value)} />
              </div>
              <div className="reg-field">
                <label className="reg-label">LONGITUD</label>
                <input className="reg-input" value={solicitud.lng || ''} onChange={e => set('lng', e.target.value)} />
              </div>
            </div>

            {mapLink && (
              <a href={mapLink} target="_blank" rel="noopener" className="reg-hint" style={{ color: '#7ecfa4' }}>
                Ver ubicación actual en Google Maps →
              </a>
            )}
          </div>

          <div className="reg-section">
            <div className="reg-section-title">CONTACTO</div>

            <div className="reg-field">
              <label className="reg-label">WHATSAPP</label>
              <input className="reg-input" value={solicitud.whatsapp || ''} onChange={e => set('whatsapp', e.target.value)} />
            </div>

            <div className="reg-grid-2">
              <div className="reg-field">
                <label className="reg-label">INSTAGRAM</label>
                <input className="reg-input" value={solicitud.instagram || ''} onChange={e => set('instagram', e.target.value)} />
              </div>
              <div className="reg-field">
                <label className="reg-label">TIKTOK</label>
                <input className="reg-input" value={solicitud.tiktok || ''} onChange={e => set('tiktok', e.target.value)} />
              </div>
              <div className="reg-field">
                <label className="reg-label">FACEBOOK</label>
                <input className="reg-input" value={solicitud.facebook || ''} onChange={e => set('facebook', e.target.value)} />
              </div>
              <div className="reg-field">
                <label className="reg-label">SITIO WEB</label>
                <input className="reg-input" value={solicitud.sitio_web || ''} onChange={e => set('sitio_web', e.target.value)} />
              </div>
            </div>

            {solicitud.menu_url && (
              <div className="reg-field">
                <label className="reg-label">MENÚ ADJUNTO</label>
                <a href={solicitud.menu_url} target="_blank" rel="noopener" className="reg-hint" style={{ color: '#7ecfa4' }}>
                  Ver menú →
                </a>
              </div>
            )}
          </div>

          {error && <div className="reg-error">{error}</div>}

          <button className="reg-submit" onClick={confirmar} disabled={estado === 'saving'}>
            {estado === 'saving' ? 'APROBANDO...' : '✅ APROBAR Y PUBLICAR'}
          </button>
        </div>
      </div>
    </div>
  )
}