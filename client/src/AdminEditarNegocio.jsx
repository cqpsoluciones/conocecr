import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import AdminLogin from './AdminLogin'
import './Registro.css'
import './AdminPanel.css'

const API_URL = import.meta.env.VITE_API_URL

export default function AdminEditarNegocio() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [token, setToken] = useState(localStorage.getItem('conocecr_admin_token'))
  const [negocio, setNegocio] = useState(null)
  const [estado, setEstado] = useState('loading')
  const [error, setError] = useState('')
  const [subiendoMenu, setSubiendoMenu] = useState(false)
  const [avisoMenu, setAvisoMenu] = useState('')
  const fileRef = useRef(null)

  useEffect(() => {
    if (token) cargar()
  }, [token])

  const cargar = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/admin/negocios/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setNegocio(data)
      setEstado('ready')
    } catch (e) {
      if (e.response?.status === 401) {
        localStorage.removeItem('conocecr_admin_token')
        setToken(null)
      } else {
        setError('No se pudo cargar el negocio')
        setEstado('error')
      }
    }
  }

  const set = (field, value) => setNegocio(prev => ({ ...prev, [field]: value }))

  const guardar = async () => {
    setEstado('saving')
    try {
      await axios.put(`${API_URL}/admin/negocios/${id}`, negocio, {
        headers: { Authorization: `Bearer ${token}` }
      })
      navigate('/admin')
    } catch (e) {
      setError('Error al guardar los cambios')
      setEstado('ready')
    }
  }

  const subirMenu = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setSubiendoMenu(true)
    setAvisoMenu('')
    setError('')

    const formData = new FormData()
    formData.append('menu', file)

    try {
      const { data } = await axios.post(
        `${API_URL}/admin/negocios/${id}/menu`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setNegocio(prev => ({
        ...prev,
        menu_url: data.menu_url,
        menu_texto: data.menu_texto
      }))
      setAvisoMenu('Menú leído correctamente. Revisá el texto y corregí lo que haga falta.')
    } catch (err) {
      const resp = err.response?.data
      if (resp && resp.menu_url) {
        setNegocio(prev => ({ ...prev, menu_url: resp.menu_url }))
        setAvisoMenu(resp.error)
      } else {
        setError((resp && resp.error) || 'Error al subir el menú')
      }
    } finally {
      setSubiendoMenu(false)
      if (fileRef.current) fileRef.current.value = ''
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

  return (
    <div className="reg-page">
      <nav className="admin-nav">
        <span className="admin-nav-brand" onClick={() => navigate('/admin')} style={{ cursor: 'pointer' }}>← Volver al panel</span>
      </nav>

      <div className="reg-container">
        <div className="reg-header">
          <span className="reg-badge">EDITAR NEGOCIO</span>
          <h1>{negocio.nombre}</h1>
        </div>

        <div className="reg-form">

          <div className="reg-section">
            <div className="reg-section-title">INFORMACIÓN BÁSICA</div>

            <div className="reg-field">
              <label className="reg-label">NOMBRE</label>
              <input className="reg-input" value={negocio.nombre || ''} onChange={e => set('nombre', e.target.value)} />
            </div>

            <div className="reg-grid-2">
              <div className="reg-field">
                <label className="reg-label">CATEGORÍA</label>
                <input className="reg-input" value={negocio.categoria || ''} onChange={e => set('categoria', e.target.value)} />
              </div>
              <div className="reg-field">
                <label className="reg-label">RANGO DE PRECIO</label>
                <input className="reg-input" value={negocio.rango_precio || ''} onChange={e => set('rango_precio', e.target.value)} />
              </div>
            </div>

            <div className="reg-field">
              <label className="reg-label">ESTADO</label>
              <select
                className="reg-select"
                value={negocio.active ? 'true' : 'false'}
                onChange={e => set('active', e.target.value === 'true')}
              >
                <option value="true">Activo</option>
                <option value="false">Inactivo</option>
              </select>
            </div>
          </div>

          <div className="reg-section">
            <div className="reg-section-title">DESCRIPCIÓN</div>

            <div className="reg-field">
              <label className="reg-label">DESCRIPCIÓN GENERAL</label>
              <textarea className="reg-textarea" rows={3} value={negocio.descripcion || ''} onChange={e => set('descripcion', e.target.value)} />
            </div>

            <div className="reg-field">
              <label className="reg-label">DESCRIPCIÓN EMOCIONAL</label>
              <textarea className="reg-textarea" rows={3} value={negocio.descripcion_emocional || ''} onChange={e => set('descripcion_emocional', e.target.value)} />
            </div>

            <div className="reg-field">
              <label className="reg-label">VIBES (separadas por coma)</label>
              <input className="reg-input" value={negocio.vibes || ''} onChange={e => set('vibes', e.target.value)} />
            </div>
          </div>

          <div className="reg-section">
            <div className="reg-section-title">MENÚ</div>

            <div className="reg-field">
              <label className="reg-label">SUBIR MENÚ (IMAGEN O PDF)</label>
              <div className="reg-file-wrap">
                <input
                  ref={fileRef}
                  id="menu-file"
                  className="reg-file-input"
                  type="file"
                  accept="image/png,image/jpeg,application/pdf"
                  onChange={subirMenu}
                  disabled={subiendoMenu}
                />
                <label className="reg-file-label" htmlFor="menu-file">
                  {subiendoMenu ? 'Leyendo el menú con IA...' : 'Elegir archivo (PNG, JPG o PDF)'}
                </label>
              </div>
              <span className="reg-hint">
                La IA lee el menú y llena el texto de abajo automáticamente. Puede tardar unos segundos.
              </span>
            </div>

            {avisoMenu && (
              <div className="reg-field" style={{ color: '#7ecfa4', fontSize: '13px' }}>
                {avisoMenu}
              </div>
            )}

            {negocio.menu_url && (
              <div className="reg-field">
                <a href={negocio.menu_url} target="_blank" rel="noopener" style={{ color: '#7ecfa4', fontSize: '13px' }}>
                  Ver el archivo del menú subido
                </a>
              </div>
            )}

            <div className="reg-field">
              <label className="reg-label">TEXTO DEL MENÚ (lo que lee la IA al recomendar)</label>
              <textarea
                className="reg-textarea"
                rows={12}
                value={negocio.menu_texto || ''}
                onChange={e => set('menu_texto', e.target.value)}
                placeholder="Subí un archivo arriba para llenarlo automáticamente, o escribí el menú a mano."
              />
              <span className="reg-hint">
                Revisá que los productos y precios estén correctos. Este texto es lo que le permite al modelo saber qué vende el negocio.
              </span>
            </div>
          </div>

          <div className="reg-section">
            <div className="reg-section-title">UBICACIÓN Y HORARIO</div>

            <div className="reg-field">
              <label className="reg-label">DIRECCIÓN</label>
              <input className="reg-input" value={negocio.direccion || ''} onChange={e => set('direccion', e.target.value)} />
            </div>

            <div className="reg-field">
              <label className="reg-label">HORARIO</label>
              <input className="reg-input" value={negocio.horario || ''} onChange={e => set('horario', e.target.value)} />
            </div>

            <div className="reg-grid-2">
              <div className="reg-field">
                <label className="reg-label">LATITUD</label>
                <input className="reg-input" value={negocio.lat || ''} onChange={e => set('lat', e.target.value)} />
              </div>
              <div className="reg-field">
                <label className="reg-label">LONGITUD</label>
                <input className="reg-input" value={negocio.lng || ''} onChange={e => set('lng', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="reg-section">
            <div className="reg-section-title">CONTACTO</div>

            <div className="reg-field">
              <label className="reg-label">WHATSAPP</label>
              <input className="reg-input" value={negocio.whatsapp || ''} onChange={e => set('whatsapp', e.target.value)} />
            </div>

            <div className="reg-grid-2">
              <div className="reg-field">
                <label className="reg-label">INSTAGRAM</label>
                <input className="reg-input" value={negocio.instagram || ''} onChange={e => set('instagram', e.target.value)} />
              </div>
              <div className="reg-field">
                <label className="reg-label">FACEBOOK</label>
                <input className="reg-input" value={negocio.facebook || ''} onChange={e => set('facebook', e.target.value)} />
              </div>
              <div className="reg-field">
                <label className="reg-label">SITIO WEB</label>
                <input className="reg-input" value={negocio.sitio_web || ''} onChange={e => set('sitio_web', e.target.value)} />
              </div>
            </div>
          </div>

          {error && <div className="reg-error">{error}</div>}

          <button className="reg-submit" onClick={guardar} disabled={estado === 'saving'}>
            {estado === 'saving' ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
          </button>
        </div>
      </div>
    </div>
  )
}