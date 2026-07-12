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

      <div className={`admchats-layout ${chatActivo ? 'detalle-abierto' : ''}`}>

        {/* Lista de sesiones */}
        <div className="admchats-lista">
          <h2 className="admchats-titulo">Conversaciones</h2>

          {cargando ? (
            <p className="admin-loading">Cargando...</p>
          ) : chats.length === 0 ? (
            <p className="admin-loading">No hay conversaciones aún.</p>
          ) : (
            chats.map(c => (
              <div
                key={c.id}
                onClick={() => verChat(c.id)}
                className={`admchats-item ${chatActivo?.id === c.id ? 'activo' : ''}`}
              >
                <div className="admchats-item-titulo">
                  {c.intencion || 'Sin intención detectada'}
                </div>
                <div className="admchats-item-meta">
                  {c.total_mensajes} mensajes · {new Date(c.created_at).toLocaleDateString('es-CR', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Vista de mensajes */}
        <div className="admchats-detalle">
          {!chatActivo ? (
            <div className="admchats-vacio">
              Seleccioná una conversación para verla
            </div>
          ) : (
            <>
              <button
                className="admchats-volver"
                onClick={() => setChatActivo(null)}
              >
                ← Conversaciones
              </button>

              <div className="admchats-detalle-header">
                <h3>{chatActivo.intencion || 'Sin intención'}</h3>
                <div className="admchats-detalle-meta">
                  {new Date(chatActivo.created_at).toLocaleDateString('es-CR', { dateStyle: 'long' })}
                  {chatActivo.user_lat && ` · Ubicación: ${parseFloat(chatActivo.user_lat).toFixed(4)}, ${parseFloat(chatActivo.user_lng).toFixed(4)}`}
                </div>
              </div>

              <div className="admchats-mensajes">
                {mensajes.map((m, i) => (
                  <div
                    key={i}
                    className={`admchats-fila ${m.role === 'user' ? 'usuario' : 'asistente'}`}
                  >
                    <div className="admchats-burbuja">
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