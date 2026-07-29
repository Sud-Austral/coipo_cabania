import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { RolProvider } from './context/RolContext.jsx'

// HashRouter: el sitio se publica en GitHub Pages (hosting estático sin
// reescritura de rutas). Con rutas por hash los enlaces profundos funcionan y
// recargar la página no da 404. En fase 2, con servidor propio, se cambia por
// BrowserRouter.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <RolProvider>
        <App />
      </RolProvider>
    </HashRouter>
  </StrictMode>,
)
