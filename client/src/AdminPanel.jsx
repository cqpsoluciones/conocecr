import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import AdminLogin from './AdminLogin'
import './AdminPanel.css'

const API_URL = import.meta.env.VITE_API_URL

export default function AdminPanel() {
  const [token, setToken] = useState(localStorage.getItem('conocecr_admin_token'))
  const [negocios, setNegocios] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (token) cargar()
  }, [token, busqueda])

  const cargar = async () => {
    setCargando(true)
    try {
      const { data } = await axios.get(`${API_URL}/admin/negocios`, {
        headers: { Authorization: `Bearer ${token}` },
        params: busqueda ? { q: busqueda } : {}
      })
      setNegocios(data)
    } catch (e) {
      if (e.response?.status === 401) {
        localStorage.removeItem('conocecr_admin_token')
        setToken(null)
      }
    } finally {
      setCargando(false)
    }
  }

  if (!token) {
    return <AdminLogin onLogin={(t) => setToken(t)} />
  }

  return (
    <div className="admin-page">
      <nav className="admin-nav">
        <span className="admin-nav-brand">Panel Admin · Conoce CR</span>
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

      <div className="admin-container">
        <div className="admin-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h1 style={{ margin: 0 }}>Negocios</h1>
            <Link to="/admin/chats" style={{
              fontSize: '13px',
              color: '#7ecfa4',
              textDecoration: 'none',
              border: '1px solid rgba(126,207,164,0.3)',
              padding: '7px 14px',
              borderRadius: '999px'
            }}>
              Ver conversaciones →
            </Link>
          </div>
          <input
            className="admin-search"
            placeholder="Buscar por nombre o categoría..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>

        {cargando ? (
          <p className="admin-loading">Cargando...</p>
        ) : (
          <div className="admin-list">
            {negocios.map(n => (
              <Link to={`/admin/negocio/${n.id}`} key={n.id} className="admin-card">
                <div className="admin-card-main">
                  <span className="admin-card-name">{n.nombre}</span>
                  <span className="admin-card-cat">{n.categoria}</span>
                </div>
                <div className="admin-card-meta">
                  <span className={`admin-status ${n.active ? 'active' : 'inactive'}`}>
                    {n.active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </Link>
            ))}
            {negocios.length === 0 && <p className="admin-loading">No se encontraron negocios.</p>}
          </div>
        )}
      </div>
    </div>
  )
}