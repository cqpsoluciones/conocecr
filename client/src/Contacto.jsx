import { useState } from 'react'
import './App.css'
import './Contacto.css'

const API_URL = import.meta.env.VITE_API_URL
const WHATSAPP = '50688683368'

export default function Contacto() {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [form, setForm] = useState({ nombre: '', telefono: '', email: '', mensaje: '' })
  const [estado, setEstado] = useState('idle') // idle | enviando | enviado | error
  const [error, setError] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async () => {
    setError('')

    if (!form.nombre.trim() || !form.telefono.trim() || !form.mensaje.trim()) {
      setError('Completá nombre, teléfono y mensaje.')
      return
    }

    setEstado('enviando')
    try {
      const res = await fetch(`${API_URL}/contacto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'No se pudo enviar el mensaje.')
        setEstado('idle')
        return
      }

      setEstado('enviado')
      setForm({ nombre: '', telefono: '', email: '', mensaje: '' })
    } catch {
      setError('Error de conexión. Intentá de nuevo o escribinos por WhatsApp.')
      setEstado('idle')
    }
  }

  return (
    <>
      <div className="con-bg"></div>

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
          <li><a href="/directorio" onClick={() => setMenuAbierto(false)}>Directorio</a></li>
          <li><a href="/contacto" className="active" onClick={() => setMenuAbierto(false)}>Contacto</a></li>
          <li><a href="/registro" className="nav-cta" onClick={() => setMenuAbierto(false)}>Agregar negocio</a></li>
        </ul>
        <div className="nav-toggle" aria-label="Menú" onClick={() => setMenuAbierto(prev => !prev)}>
          <span></span><span></span><span></span>
        </div>
      </nav>

      <section className="con-hero">
        <div className="con-eyebrow">Contacto · Conoce CR</div>
        <h1 className="con-title">Hablemos</h1>
        <p className="con-desc">
          ¿Tenés una consulta, una idea o querés que tu negocio forme parte de Conoce? Escribinos y te respondemos pronto.
        </p>
      </section>

      <section className="con-grid">
        {/* Columna formulario */}
        <div className="con-form-col">
          {estado === 'enviado' ? (
            <div className="con-exito">
              <div className="con-exito-icon">✓</div>
              <h3>¡Mensaje enviado!</h3>
              <p>Gracias por escribirnos. Te vamos a responder lo antes posible.</p>
              <button className="con-otra" onClick={() => setEstado('idle')}>Enviar otro mensaje</button>
            </div>
          ) : (
            <div className="con-form">
              <div className="con-field">
                <label className="con-label">NOMBRE <span>*</span></label>
                <input
                  className="con-input"
                  type="text"
                  name="nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  placeholder="¿Cómo te llamás?"
                />
              </div>

              <div className="con-field">
                <label className="con-label">TELÉFONO <span>*</span></label>
                <input
                  className="con-input"
                  type="tel"
                  name="telefono"
                  value={form.telefono}
                  onChange={handleChange}
                  placeholder="8888-8888"
                />
              </div>

              <div className="con-field">
                <label className="con-label">CORREO ELECTRÓNICO</label>
                <input
                  className="con-input"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="tucorreo@ejemplo.com (opcional)"
                />
              </div>

              <div className="con-field">
                <label className="con-label">MENSAJE <span>*</span></label>
                <textarea
                  className="con-textarea"
                  name="mensaje"
                  rows={5}
                  value={form.mensaje}
                  onChange={handleChange}
                  placeholder="Contanos en qué podemos ayudarte..."
                />
              </div>

              {error && <div className="con-error">{error}</div>}

              <button
                className="con-submit"
                onClick={handleSubmit}
                disabled={estado === 'enviando'}
              >
                {estado === 'enviando' ? 'ENVIANDO...' : 'ENVIAR MENSAJE'}
              </button>
            </div>
          )}
        </div>

        {/* Columna contacto directo */}
        <div className="con-info-col">
          <div className="con-info-card">
            <h3>Atención personalizada</h3>
            <p>¿Preferís algo más directo? Escribinos por WhatsApp y te atendemos al momento.</p>
            <a>
              className="con-wa-btn"
              href={`https://wa.me/${WHATSAPP}`}
              target="_blank"
              rel="noopener"
            
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.521-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.981.999-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.334.101 11.892c0 2.096.549 4.14 1.595 5.945L0 24l6.335-1.652a12.062 12.062 0 005.71 1.447h.006c6.585 0 11.946-5.335 11.949-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Escribir por WhatsApp
            </a>
          </div>

          <div className="con-info-card con-info-secondary">
            <h4>Correo</h4>
            <a href="mailto:cqpsoluciones@gmail.com">cqpsoluciones@gmail.com</a>
            <h4 style={{ marginTop: '20px' }}>Ubicación</h4>
            <p style={{ margin: 0 }}>Santo Domingo de Heredia, Costa Rica</p>
          </div>
        </div>
      </section>

      <footer>
        <div className="footer-brand">Conoce CR</div>
        <ul className="footer-links">
          <li><a href="/directorio">Directorio</a></li>
          <li><a href="/registro">Agregar negocio</a></li>
        </ul>
        <div className="footer-copy">© 2026 Conoce CR · Santo Domingo de Heredia</div>
      </footer>
    </>
  )
}