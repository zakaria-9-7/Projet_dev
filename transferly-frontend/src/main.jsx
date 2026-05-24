import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/wings-tokens.css'
import App from './App.jsx'

// Apply saved theme before first paint to avoid flash
const __savedTheme = localStorage.getItem('wings-theme') || 'dark'
document.documentElement.dataset.theme = __savedTheme

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
