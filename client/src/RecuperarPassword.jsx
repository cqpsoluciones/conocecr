import { useState } from 'react'
import { Link } from 'react-router-dom'
import './Registro.css'
import './Usuarios.css'

const API_URL = import.meta.env.VITE_API_URL

export default function RecuperarPassword() {
  const [email, setEmail] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)

  const handleSubmit = async () => {
    setError(null)

    if (!email.trim()) {
      setError('Ingresá tu correo electrónico.')
      return
    }

    setEnviando(true)
    try {
      const res = await fetch(`${API_URL}/usuarios/recuperar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'No se pudo procesar la solicitud.')
        return
      }

      setEnviado(true)
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
          <span className="reg-badge">RECUPERAR ACCESO</span>
          <h1>¿Olvidaste tu contraseña?</h1>
          <p>Ingresá tu correo y te enviamos un enlace para crear una nueva.</p>
        </div>

        <div className="reg-form">
          {enviado ? (
            <div>
              <p style={{ color: '#7ecfa4', fontSize: '14px', lineHeight: 1.7, marginBottom: '24px' }}>
                Si existe una cuenta con ese correo, te enviamos un enlace para restablecer tu contraseña. Revisá tu bandeja de entrada (y la carpeta de spam por si acaso).
              </p>
              <p className="reg-footer-note">
                <Link to="/login" className="usr-link">Volver a iniciar sesión</Link>
              </p>
            </div>
          ) : (
            <>
              <div className="reg-field">
                <label className="reg-label">CORREO ELECTRÓNICO</label>
                <input
                  className="reg-input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tucorreo@ejemplo.com"
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                />
              </div>

              {error && <div className="reg-error">{error}</div>}

              <button className="reg-submit" onClick={handleSubmit} disabled={enviando}>
                {enviando ? 'ENVIANDO...' : 'ENVIAR ENLACE'}
              </button>

              <p className="reg-footer-note">
                ¿Te acordaste? <Link to="/login" className="usr-link">Iniciá sesión</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
