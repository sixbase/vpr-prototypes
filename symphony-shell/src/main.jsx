import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import OptionB from './OptionB.jsx'
import OptionC from './OptionC.jsx'

/* Builds for the review, switched by URL:
   /  or /a  → Build A (dual-rail, current)
   /b        → Build B (side-by-side, Symphony persists)
   /c        → Build C (focus mode: Symphony hides; workspace is one full-width panel)
   Also honors ?build=a|b|c as a fallback. */
function resolveBuild() {
  const path = window.location.pathname.replace(/\/+$/, '')
  if (path.endsWith('/c')) return 'c'
  if (path.endsWith('/b')) return 'b'
  if (path.endsWith('/a')) return 'a'
  return new URLSearchParams(window.location.search).get('build') || 'a'
}

const build = resolveBuild()
const Build = build === 'c' ? OptionC : build === 'b' ? OptionB : App

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Build />
  </StrictMode>,
)
