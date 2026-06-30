import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './Landing'
import Chat from './Chat'
import Registro from './Registro'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/registro" element={<Registro />} />
      </Routes>
    </BrowserRouter>
  )
}