import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import PasswordGate from './PasswordGate.jsx'
import SymphonyShell from './shell/SymphonyShell.jsx'
import MspShell from './shell/MspShell.jsx'

// Gated "corners": the Symphony × Scope shell at ?view=shell (horizontal scope bar),
// and the MSP shell at ?view=msp (scope navigator as a vertical breadcrumb in the
// left nav). Everything else is the existing app, untouched.
const params = new URLSearchParams(window.location.search)
const cleanPath = window.location.pathname.replace(/\/+$/, '')
const isMsp = params.get('view') === 'msp' || cleanPath.endsWith('/msp')
const isShell = params.get('view') === 'shell' || cleanPath.endsWith('/shell')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PasswordGate>
      {isMsp ? <MspShell /> : isShell ? <SymphonyShell /> : <App />}
    </PasswordGate>
  </StrictMode>,
)
