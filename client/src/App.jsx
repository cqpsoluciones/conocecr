import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './Landing'
import Chat from './Chat'
import Registro from './Registro'
import AdminRevisar from './AdminRevisar'
import AdminPanel from './AdminPanel'
import AdminEditarNegocio from './AdminEditarNegocio'
import AdminChats from './AdminChats'
import CrearCuenta from './CrearCuenta'
import Login from './Login'
import RecuperarPassword from './RecuperarPassword'
import NuevaPassword from './NuevaPassword'

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
        <Route path="/admin/chats" element={<AdminChats />} />
        <Route path="/crear-cuenta" element={<CrearCuenta />} />
        <Route path="/login" element={<Login />} />
        <Route path="/recuperar" element={<RecuperarPassword />} />
        <Route path="/nueva-contrasena" element={<NuevaPassword />} />
      </Routes>
    </BrowserRouter>
  )
}