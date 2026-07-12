// client/src/Login.jsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { guardarSesion } from './session'
import './Registro.css'
import './Usuarios.css'

const API_URL = import.meta.env.VITE_API_URL

export default function Login() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async () => {
    setError(null)

    if (!form.email.trim() || !form.password) {
      setError('Ingresá tu correo y contraseña.')
      return
    }

    setEnviando(true)
    try {
      const res = await fetch(`${API_URL}/usuarios/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'No se pudo iniciar sesión.')
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
          <span className="reg-badge">BIENVENIDO DE VUELTA</span>
          <h1>Iniciá sesión</h1>
          <p>Retomá donde quedaste. Tus lugares y preferencias te esperan.</p>
        </div>

        <div className="reg-form">
          <div className="reg-field">
            <label className="reg-label">CORREO ELECTRÓNICO</label>
            <input
              className="reg-input"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="tucorreo@ejemplo.com"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          <div className="reg-field">
            <label className="reg-label">CONTRASEÑA</label>
            <input
              className="reg-input"
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Tu contraseña"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          {error && <div className="reg-error">{error}</div>}

          <button className="reg-submit" onClick={handleSubmit} disabled={enviando}>
            {enviando ? 'INGRESANDO...' : 'INICIAR SESIÓN'}
          </button>

          <p className="reg-footer-note">
            ¿No tenés cuenta? <Link to="/crear-cuenta" className="usr-link">Creá una gratis</Link>
          </p>
        </div>
      </div>
    </div>
  )
}