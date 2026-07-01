import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import AdminLogin from './AdminLogin'
import './AdminPanel.css'

const API_URL = import.meta.env.VITE_API_URL

export default function AdminChats() {
  const [token, setToken] = useState(localStorage.getItem('conocecr_admin_token'))
  const [chats, setChats] = useState([])
  const [chatActivo, setChatActivo] = useState(null)
  const [mensajes, setMensajes] = useState([])
  const [cargando, setCargando] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    if (token) cargarChats()
  }, [token])

  const cargarChats = async () => {
    setCargando(true)
    try {
      const { data } = await axios.get(`${API_URL}/admin/chats`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setChats(data)
    } catch (e) {
      if (e.response?.status === 401) {
        localStorage.removeItem('conocecr_admin_token')
        setToken(null)
      }
    } finally {
      setCargando(false)
    }
  }

  const verChat = async (id) => {
    try {
      const { data } = await axios.get(`${API_URL}/admin/chats/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setChatActivo(data.sesion)
      setMensajes(data.mensajes)
    } catch (e) {
      console.error(e)
    }
  }

  if (!token) return <AdminLogin onLogin={(t) => setToken(t)} />

  return (
    <div className="admin-page">
      <nav className="admin-nav">
        <span
          className="admin-nav-brand"
          onClick={() => navigate('/admin')}
          style={{ cursor: 'pointer' }}
        >
          ← Volver al panel
        </span>
        <button
          className="admin-logout"
          onClick={() => {
            localStorage.removeItem('conocecr_admin_token')
            setToken(null)
          }}
        >
          Cerrar sesión
        </button>
      </nav>

      <div style={{ display: 'flex', height: 'calc(100vh - 57px)' }}>

        {/* Lista de sesiones */}
        <div style={{
          width: '340px',
          flexShrink: 0,
          borderRight: '1px solid rgba(255,255,255,0.08)',
          overflowY: 'auto',
          padding: '16px'
        }}>
          <h2 style={{
            fontFamily: "'Anton', sans-serif",
            fontSize: '22px',
            color: '#fff',
            marginBottom: '16px',
            fontWeight: 400
          }}>
            Conversaciones
          </h2>

          {cargando ? (
            <p className="admin-loading">Cargando...</p>
          ) : chats.length === 0 ? (
            <p className="admin-loading">No hay conversaciones aún.</p>
          ) : (
            chats.map(c => (
              <div
                key={c.id}
                onClick={() => verChat(c.id)}
                style={{
                  background: chatActivo?.id === c.id ? '#1a1a1e' : '#111114',
                  border: `1px solid ${chatActivo?.id === c.id ? 'rgba(126,207,164,0.3)' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: '10px',
                  padding: '12px 14px',
                  marginBottom: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                <div style={{ fontSize: '13px', color: '#f0f0f0', marginBottom: '4px', fontWeight: 500 }}>
                  {c.intencion || 'Sin intención detectada'}
                </div>
                <div style={{ fontSize: '11px', color: '#6b6b75' }}>
                  {c.total_mensajes} mensajes · {new Date(c.created_at).toLocaleDateString('es-CR', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Vista de mensajes */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
          {!chatActivo ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#6b6b75',
              fontSize: '14px'
            }}>
              Seleccioná una conversación para verla
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <h3 style={{ color: '#fff', fontSize: '16px', marginBottom: '6px' }}>
                  {chatActivo.intencion || 'Sin intención'}
                </h3>
                <div style={{ fontSize: '12px', color: '#6b6b75' }}>
                  {new Date(chatActivo.created_at).toLocaleDateString('es-CR', { dateStyle: 'long' })}
                  {chatActivo.user_lat && ` · Ubicación: ${parseFloat(chatActivo.user_lat).toFixed(4)}, ${parseFloat(chatActivo.user_lng).toFixed(4)}`}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {mensajes.map((m, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start'
                    }}
                  >
                    <div style={{
                      maxWidth: '75%',
                      background: m.role === 'user' ? '#1e1e22' : 'transparent',
                      border: m.role === 'user' ? '1px solid rgba(255,255,255,0.08)' : 'none',
                      borderRadius: '14px',
                      padding: m.role === 'user' ? '10px 14px' : '4px 2px',
                      fontSize: '13px',
                      color: '#f0f0f0',
                      lineHeight: 1.6,
                      whiteSpace: 'pre-wrap'
                    }}>
                      {m.content}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}