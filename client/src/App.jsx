import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './Landing'
import Chat from './Chat'
import Registro from './Registro'
import AdminRevisar from './AdminRevisar'
import AdminPanel from './AdminPanel'
import AdminEditarNegocio from './AdminEditarNegocio'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/admin/revisar/:id" element={<AdminRevisar />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/admin/negocio/:id" element={<AdminEditarNegocio />} />
      </Routes>
    </BrowserRouter>
  )
}