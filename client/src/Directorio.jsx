import { useState, useEffect } from 'react'
import './App.css'
import './Directorio.css'

const API_URL = import.meta.env.VITE_API_URL

export default function Directorio() {
  const [negocios, setNegocios] = useState([])
  const [estado, setEstado] = useState('cargando')
  const [menuAbierto, setMenuAbierto] = useState(false)

  useEffect(() => {
    fetch(`${API_URL}/businesses/directorio`)
      .then(res => res.json())
      .then(data => {
        setNegocios(Array.isArray(data) ? data : [])
        setEstado('listo')
      })
      .catch(() => setEstado('error'))
  }, [])

  return (
    <>
      <nav id="navbar">
        <a className="nav-brand" href="/">
          <img
            src="https://static.wixstatic.com/media/da6e7c_8eec0562fb80432084031482cfbafc82~mv2.png"
            alt="Conoce"
            style={{ height: '28px', width: 'auto', verticalAlign: 'middle', marginRight: '8px' }}
          />
          Conoce CR
        </a>
        <ul className={`nav-links ${menuAbierto ? 'open' : ''}`}>
          <li><a href="/" onClick={() => setMenuAbierto(false)}>Inicio</a></li>
          <li><a href="/directorio" className="active" onClick={() => setMenuAbierto(false)}>Directorio</a></li>
          <li><a href="/contacto" onClick={() => setMenuAbierto(false)}>Contacto</a></li>
          <li><a href="/registro" className="nav-cta" onClick={() => setMenuAbierto(false)}>Agregar negocio</a></li>
        </ul>
        <div className="nav-toggle" aria-label="Menú" onClick={() => setMenuAbierto(prev => !prev)}>
          <span></span><span></span><span></span>
        </div>
      </nav>

      <section className="dir-hero">
        <div className="dir-hero-content">
          <div className="dir-eyebrow">Directorio · Santo Domingo de Heredia</div>
          <h1 className="dir-title">Negocios que vale la pena conocer</h1>
          <p className="dir-desc">
            Una selección de los mejores lugares de la zona. Descubrí, explorá y encontrá tu próximo favorito.
          </p>
        </div>
      </section>

      <section className="dir-galeria-wrap">
        {estado === 'cargando' && (
          <div className="dir-mensaje">Cargando negocios...</div>
        )}

        {estado === 'error' && (
          <div className="dir-mensaje">No se pudo cargar el directorio. Intentá de nuevo más tarde.</div>
        )}

        {estado === 'listo' && negocios.length === 0 && (
          <div className="dir-mensaje">Pronto vas a encontrar aquí los mejores negocios de la zona.</div>
        )}

        {estado === 'listo' && negocios.length > 0 && (
          <div className="dir-galeria">
            {negocios.map((n, i) => {
              const Card = n.sitio_web ? 'a' : 'div'
              const props = n.sitio_web
                ? { href: n.sitio_web, target: '_blank', rel: 'noopener' }
                : {}
              return (
                <Card
                  key={n.id}
                  className={`dir-card ${n.sitio_web ? 'clickable' : ''}`}
                  style={{ animationDelay: `${i * 0.06}s` }}
                  {...props}
                >
                  <div className="dir-card-img">
                    {n.imagen_url
                      ? <img src={n.imagen_url} alt={n.nombre} loading="lazy" />
                      : <div className="dir-card-placeholder">{n.nombre.charAt(0)}</div>
                    }
                    {n.categoria && <span className="dir-card-cat">{n.categoria}</span>}
                  </div>
                  <div className="dir-card-body">
                    <h3>{n.nombre}</h3>
                    {n.descripcion && <p>{n.descripcion}</p>}
                    {n.sitio_web && <span className="dir-card-link">Visitar sitio →</span>}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </section>

      <footer>
        <div className="footer-brand">Conoce CR</div>
        <ul className="footer-links">
          <li><a href="/contacto">Contacto</a></li>
          <li><a href="/registro">Agregar negocio</a></li>
        </ul>
        <div className="footer-copy">© 2026 Conoce CR · Santo Domingo de Heredia</div>
      </footer>
    </>
  )
}