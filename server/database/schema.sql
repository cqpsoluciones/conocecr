-- Zonas geográficas
CREATE TABLE IF NOT EXISTS zones (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  canton VARCHAR(100),
  provincia VARCHAR(100),
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Negocios aprobados
CREATE TABLE IF NOT EXISTS businesses (
 id SERIAL PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  categoria VARCHAR(100),
  descripcion TEXT,
  descripcion_emocional TEXT,
  vibes TEXT,
  direccion TEXT,
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  zone_id INTEGER REFERENCES zones(id),
  telefono VARCHAR(30),
  whatsapp VARCHAR(100),
  instagram VARCHAR(200),
  tiktok VARCHAR(200),
  facebook VARCHAR(200),
  sitio_web VARCHAR(300),
  rango_precio VARCHAR(20),
  horario TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Solicitudes pendientes de aprobación
CREATE TABLE IF NOT EXISTS solicitudes (
  id VARCHAR(50) PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  categoria VARCHAR(100),
  descripcion TEXT,
  direccion TEXT,
  telefono VARCHAR(30),
  whatsapp VARCHAR(100),
  redes_sociales TEXT,
  sitio_web VARCHAR(300),
  rango_precio VARCHAR(20),
  horario TEXT,
  estado VARCHAR(20) DEFAULT 'Pendiente',
  fecha TIMESTAMP DEFAULT NOW()
);

-- Sesiones de chat
CREATE TABLE IF NOT EXISTS chat_sessions (
  id VARCHAR(200) PRIMARY KEY,
  user_lat DECIMAL(10, 8),
  user_lng DECIMAL(11, 8),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Mensajes de cada sesión
CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(200) REFERENCES chat_sessions(id),
  role VARCHAR(20),
  content TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_businesses_categoria ON businesses(categoria);
CREATE INDEX IF NOT EXISTS idx_businesses_active ON businesses(active);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);

-- Zona inicial: Santo Domingo de Heredia
INSERT INTO zones (name, canton, provincia, lat, lng)
VALUES ('Santo Domingo', 'Santo Domingo', 'Heredia', 9.9833, -84.0833)
ON CONFLICT DO NOTHING;