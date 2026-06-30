import { useState } from 'react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL

export default function AdminLogin({ onLogin }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const entrar = async () => {
    if (!password) return
    setLoading(true)
    setError('')
    try {
      const { data } = await axios.post(`${API_URL}/auth/login`, { password })
      localStorage.setItem('conocecr_admin_token', data.token)
      onLogin(data.token)
    } catch (e) {
      setError('Contraseña incorrecta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0a0b',
      fontFamily: "'DM Sans', system-ui, sans-serif"
    }}>
      <div style={{ width: '100%', maxWidth: '340px', padding: '24px' }}>
        <h1 style={{
          fontFamily: "'Anton', sans-serif",
          fontSize: '28px',
          color: '#fff',
          marginBottom: '24px',
          textAlign: 'center'
        }}>
          Panel Admin
        </h1>
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && entrar()}
          style={{
            width: '100%',
            background: '#0e0e10',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '10px',
            padding: '13px 16px',
            fontSize: '14px',
            color: '#f0f0f0',
            outline: 'none',
            marginBottom: '12px',
            boxSizing: 'border-box'
          }}
        />
        {error && <p style={{ color: '#ff6b4a', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}
        <button
          onClick={entrar}
          disabled={loading}
          style={{
            width: '100%',
            background: '#fff',
            color: '#0a0a0b',
            fontWeight: 700,
            fontSize: '14px',
            padding: '14px',
            border: 'none',
            borderRadius: '10px',
            cursor: 'pointer'
          }}
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </div>
    </div>
  )
}