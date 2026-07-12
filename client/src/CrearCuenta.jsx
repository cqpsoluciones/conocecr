// client/src/CrearCuenta.jsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { guardarSesion } from './session'
import './Registro.css'
import './Usuarios.css'

const API_URL = import.meta.env.VITE_API_URL

export default function CrearCuenta() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    nombre: '',
    email: '',
    whatsapp: '',
    password: '',
    aceptaPromociones: false
  })
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async () => {
    setError(null)

    if (!form.nombre.trim() || !form.email.trim() || !form.password) {
      setError('Nombre, correo y contraseña son obligatorios.')
      return
    }
    if (form.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    setEnviando(true)
    try {
      const res = await fetch(`${API_URL}/usuarios/registro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: form.nombre,
          email: form.email,
          whatsapp: form.whatsapp || null,
          password: form.password,
          aceptaPromociones: form.aceptaPromociones
        })
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'No se pudo crear la cuenta. Intentá de nuevo.')
        return
      }

      guardarSesion(data.token, data.usuario)
      navigate('/')
    } catch {
      setError('Error de conexión. Revisá tu internet e intentá de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="reg-page">
      <nav className="reg-nav">
        <Link to="/" className="reg-nav-brand">CONOCE</Link>
      </nav>

      <div className="reg-container usr-container">
        <div className="reg-header">
          <span className="reg-badge">CREÁ TU CUENTA</span>
          <h1>Descubrí lugares hechos para vos</h1>
          <p>Con tu cuenta, Conoce aprende tus gustos y te recomienda mejor cada vez.</p>
        </div>

        <div className="reg-form">
          <div className="reg-field">
            <label className="reg-label">NOMBRE <span className="req">*</span></label>
            <input
              className="reg-input"
              type="text"
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              placeholder="¿Cómo te llamás?"
            />
          </div>

          <div className="reg-field">
            <label className="reg-label">CORREO ELECTRÓNICO <span className="req">*</span></label>
            <input
              className="reg-input"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="tucorreo@ejemplo.com"
            />
          </div>

          <div className="reg-field">
            <label className="reg-label">WHATSAPP</label>
            <input
              className="reg-input"
              type="tel"
              name="whatsapp"
              value={form.whatsapp}
              onChange={handleChange}
              placeholder="8888-8888"
            />
            <span className="reg-hint">Opcional — para enviarte promociones y beneficios exclusivos.</span>
          </div>

          <div className="reg-field">
            <label className="reg-label">CONTRASEÑA <span className="req">*</span></label>
            <input
              className="reg-input"
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Mínimo 8 caracteres"
            />
          </div>

          <label className="usr-check">
            <input
              type="checkbox"
              name="aceptaPromociones"
              checked={form.aceptaPromociones}
              onChange={handleChange}
            />
            <span>Quiero recibir promociones, novedades y beneficios de Conoce CR.</span>
          </label>

          {error && <div className="reg-error">{error}</div>}

          <button className="reg-submit" onClick={handleSubmit} disabled={enviando}>
            {enviando ? 'CREANDO CUENTA...' : 'CREAR CUENTA'}
          </button>

          <p className="reg-footer-note">
            ¿Ya tenés cuenta? <Link to="/login" className="usr-link">Iniciá sesión</Link>
          </p>
        </div>
      </div>
    </div>
  )
}