import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import PasswordGate from './PasswordGate.jsx'
import SymphonyShell from './shell/SymphonyShell.jsx'

// New "corner": the Symphony × Scope shell renders only at ?view=shell (or /shell).
// Everything else is the existing app, untouched. Delete this block + the shell/
// folder + the import above to revert completely.
const params = new URLSearchParams(window.location.search)
const isShell = params.get('view') === 'shell' || window.location.pathname.replace(/\/+$/, '').endsWith('/shell')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PasswordGate>
      {isShell ? <SymphonyShell /> : <App />}
    </PasswordGate>
  </StrictMode>,
)
