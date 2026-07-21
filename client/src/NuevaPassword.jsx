import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { guardarSesion } from './session'
import './Registro.css'
import './Usuarios.css'

const API_URL = import.meta.env.VITE_API_URL

export default function NuevaPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)

  const handleSubmit = async () => {
    setError(null)

    if (!password || !confirmar) {
      setError('Completá ambos campos.')
      return
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (password !== confirmar) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setEnviando(true)
    try {
      const res = await fetch(`${API_URL}/usuarios/nueva-contrasena`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'No se pudo cambiar la contraseña.')
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

  if (!token) {
    return (
      <div className="reg-page">
        <nav className="reg-nav">
          <Link to="/" className="reg-nav-brand">CONOCE</Link>
        </nav>
        <div className="reg-container usr-container">
          <div className="reg-header">
            <h1>Enlace inválido</h1>
            <p>Este enlace no es válido. Solicitá uno nuevo desde la pantalla de recuperación.</p>
          </div>
          <p className="reg-footer-note">
            <Link to="/recuperar" className="usr-link">Solicitar enlace nuevo</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="reg-page">
      <nav className="reg-nav">
        <Link to="/" className="reg-nav-brand">CONOCE</Link>
      </nav>

      <div className="reg-container usr-container">
        <div className="reg-header">
          <span className="reg-badge">NUEVA CONTRASEÑA</span>
          <h1>Creá tu nueva contraseña</h1>
          <p>Elegí una contraseña de al menos 8 caracteres.</p>
        </div>

        <div className="reg-form">
          <div className="reg-field">
            <label className="reg-label">NUEVA CONTRASEÑA</label>
            <input
              className="reg-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
            />
          </div>

          <div className="reg-field">
            <label className="reg-label">CONFIRMAR CONTRASEÑA</label>
            <input
              className="reg-input"
              type="password"
              value={confirmar}
              onChange={e => setConfirmar(e.target.value)}
              placeholder="Repetí la contraseña"
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          {error && <div className="reg-error">{error}</div>}

          <button className="reg-submit" onClick={handleSubmit} disabled={enviando}>
            {enviando ? 'GUARDANDO...' : 'GUARDAR CONTRASEÑA'}
          </button>
        </div>
      </div>
    </div>
  )
}