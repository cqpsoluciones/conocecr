import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './Landing'
import Chat from './Chat'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/chat" element={<Chat />} />
      </Routes>
    </BrowserRouter>
  )
}