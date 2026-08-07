import './App.css'
import { useState } from 'react'
import { obtenerUsuario, cerrarSesion } from './session'


export default function Landing() {
    const [menuAbierto, setMenuAbierto] = useState(false)
    const [usuario, setUsuario] = useState(obtenerUsuario())

    const handleCerrarSesion = () => {
      cerrarSesion()
      setUsuario(null)
      setMenuAbierto(false)
    }

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
        <ul className={`nav-links ${menuAbierto ? 'open' : ''}`} id="navLinks">
        <li><a href="#inicio" onClick={e => {
        e.preventDefault()
        window.scrollTo({ top: 0, behavior: 'smooth' })
        setMenuAbierto(false)
        }} className="active">Inicio</a></li>
        <li><a href="/directorio" onClick={() => setMenuAbierto(false)}>Directorio</a></li>
        <li><a href="/contacto" onClick={() => setMenuAbierto(false)}>Contacto</a></li>
        <li><a href="/registro" className="nav-cta" onClick={() => setMenuAbierto(false)}>Agregar negocio</a></li>
        {!usuario ? (
          <li><a href="/login" className="nav-cta" onClick={() => setMenuAbierto(false)}>Iniciar sesión</a></li>
        ) : (
          <>
            <li><span className="nav-user">Hola, {usuario.nombre.split(' ')[0]} 👋</span></li>
            <li>
              <a href="#" onClick={e => { e.preventDefault(); handleCerrarSesion() }}>
                Cerrar sesión
              </a>
            </li>
          </>
        )}
        </ul>
        <div
        className="nav-toggle"
        aria-label="Menú"
        onClick={() => setMenuAbierto(prev => !prev)}
        >
        <span></span><span></span><span></span>
        </div>
        </nav>

      <section className="hero">
        <video
          className="hero-video"
          autoPlay muted loop playsInline preload="auto"
          poster="https://static.wixstatic.com/media/da6e7c_b21f9ac36c514961a9564533a9e1ac61f001.jpg"
        >
          <source
            src="https://video.wixstatic.com/video/da6e7c_b21f9ac36c514961a9564533a9e1ac61/1080p/mp4/file.mp4"
            type="video/mp4"
          />
        </video>
        <div className="hero-overlay"></div>

        <div className="hero-logo-wrap">
          <img
            className="hero-logo"
            src="https://static.wixstatic.com/media/da6e7c_754e35e91b124002852f5a1bace7cef1~mv2.png"
            alt="Conoce CR"
          />
        </div>

        <div className="hero-content">
          <div className="hero-eyebrow">Santo Domingo de Heredia · Costa Rica</div>
          <h1 className="hero-title">Conoce lo mejor<br />de Santo Domingo</h1>
          <p className="hero-desc">
            Encontrá negocios, restaurantes y servicios locales con ayuda de IA.
            Rápido, natural y sin complicaciones.
          </p>
          <a href="#chat" className="hero-btn" onClick={e => {
            e.preventDefault()
            document.getElementById('chat')?.scrollIntoView({ behavior: 'smooth' })
          }}>
            Preguntale a Conoce AI
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </section>

      <section className="chat-section" id="chat">
        <div className="chat-label">
          <h2>¿Qué querés conocer hoy?</h2>
          <p>Preguntá en lenguaje natural — el asistente entiende lo que buscás.</p>
        </div>
        <div className="chat-frame-wrap">
          <iframe
            src="/chat"
            allow="geolocation"
            loading="lazy"
            title="Conoce AI Chat"
          />
        </div>
        <div className="chat-section-bottom"></div>
      </section>

      <footer>
        <div className="footer-brand">Conoce CR</div>
        <ul className="footer-links">
          <li><a href="#contacto">Contacto</a></li>
          <li><a href="/registro">Agregar negocio</a></li>
        </ul>
        <div className="footer-copy">© 2026 Conoce CR · Santo Domingo de Heredia</div>
      </footer>
    </>
  )
}