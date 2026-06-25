import { useState, useEffect, useRef } from 'react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL
const SID = Math.random().toString(36).slice(2) + Date.now().toString(36)

const PROXIMITY_KEYWORDS = [
  'cerca', 'por aquí', 'por aca', 'cercano', 'cercana',
  'próximo', 'próxima', 'aquí', 'aca', 'mi ubicación', 'donde estoy'
]

function md(t) {
  let s = t
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  s = s.replace(/!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g, '<img src="$2" alt="$1" loading="lazy">')
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
  s = s.replace(/(?<!href=")(https?:\/\/[^\s<>"&]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
  s = s.replace(/^---$/gm, '<hr>')
  s = s.replace(/\n/g, '<br>')
  return s
}

export default function Chat() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [showWelcome, setShowWelcome] = useState(true)
  const [geoStatus, setGeoStatus] = useState('idle')
  const [userLat, setUserLat] = useState(null)
  const [userLng, setUserLng] = useState(null)
  const msgsRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    initGeo()
  }, [])

  useEffect(() => {
    if (msgsRef.current) {
      msgsRef.current.scrollTop = msgsRef.current.scrollHeight
    }
  }, [messages])

  const initGeo = () => {
    if (!navigator.geolocation) { setGeoStatus('unavailable'); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude)
        setUserLng(pos.coords.longitude)
        setGeoStatus('granted')
      },
      (err) => setGeoStatus(err.code === 1 ? 'denied' : 'unavailable'),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    )
  }

  const tryGeoOnDemand = (msg) => {
    if (geoStatus === 'granted' || geoStatus === 'denied') return
    if (!navigator.geolocation) return
    const lower = msg.toLowerCase()
    if (!PROXIMITY_KEYWORDS.some(k => lower.includes(k))) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude)
        setUserLng(pos.coords.longitude)
        setGeoStatus('granted')
      },
      () => setGeoStatus('unavailable'),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 30000 }
    )
  }

  const send = async (msg) => {
    msg = (msg || input).trim()
    if (!msg || busy) return

    tryGeoOnDemand(msg)
    setShowWelcome(false)
    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setInput('')
    setBusy(true)

    try {
      const payload = { message: msg, sessionId: SID }
      if (userLat !== null && userLng !== null) {
        payload.userLat = userLat
        payload.userLng = userLng
      }
      const { data } = await axios.post(API_URL + '/chat', payload)
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Hubo un problema al conectar. Intentá de nuevo.'
      }])
    } finally {
      setBusy(false)
    }
  }

  const handleKeyDown = (e) => {
    const touch = navigator.maxTouchPoints > 0 && 'ontouchstart' in window
    if (e.key === 'Enter' && !e.shiftKey && !touch) {
      e.preventDefault()
      if (!busy) send()
    }
  }

  const handleTextareaInput = (e) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  return (
    <>
      <header className="hd">
        <div className="hd-brand">
          <img
            className="hd-logo"
            src="https://static.wixstatic.com/media/da6e7c_8eec0562fb80432084031482cfbafc82~mv2.png"
            alt="Conoce"
          />
          <div>
            <div className="hd-name">Conoce AI</div>
            <div className="hd-sub">Asistente inteligente</div>
          </div>
        </div>
        <div className="hd-right">
          <div className={`geo-indicator ${geoStatus === 'granted' ? 'visible' : ''}`}>
            <div className="geo-dot"></div>
            Ubicación activa
          </div>
          <div className="hd-badge">Santo Domingo · HRD</div>
        </div>
      </header>

      <main className="msgs" ref={msgsRef}>
        {showWelcome && (
          <div className="welcome">
            <div className="welcome-icon">
              <img
                src="https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f1e8-1f1f7.png"
                width="30" height="30" alt="Costa Rica"
                style={{ display: 'block', imageRendering: 'auto' }}
              />
            </div>
            <h2>¿Qué querés conocer hoy?</h2>
            <p>Preguntame por negocios, restaurantes, servicios o lugares en Santo Domingo de Heredia.</p>
            <div className="chips">
              <div className="chip" onClick={() => send('Quiero comer algo rico')}>🍽 Quiero comer</div>
              <div className="chip" onClick={() => send('Recomiéndame una cafetería')}>☕ Cafeterías</div>
              <div className="chip" onClick={() => send('Necesito un salón de belleza')}>✂ Salones</div>
              <div className="chip" onClick={() => send('Qué hay cerca para una cita romántica')}>💫 Cita romántica</div>
              <div className="chip" onClick={() => send('Quiero registrar mi negocio')}>📋 Registrar negocio</div>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`row ${msg.role}`}>
            {msg.role === 'assistant' && <div className="av">C</div>}
            <div
              className="bubble"
              dangerouslySetInnerHTML={{ __html: md(msg.content) }}
            />
          </div>
        ))}

        {busy && (
          <div className="row assistant">
            <div className="av">C</div>
            <div className="bubble">
              <div className="dots">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        )}
      </main>

      <div className="bar">
        <div className="composer">
          <textarea
            ref={textareaRef}
            rows={1}
            placeholder="Escribí tu consulta..."
            value={input}
            onChange={handleTextareaInput}
            onKeyDown={handleKeyDown}
            disabled={busy}
          />
          <button
            className="send"
            onClick={() => send()}
            disabled={busy || !input.trim()}
            aria-label="Enviar"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5M5 12l7-7 7 7"/>
            </svg>
          </button>
        </div>
        <div className="bar-hint">Las respuestas pueden variar según la información disponible.</div>
      </div>
    </>
  )
}