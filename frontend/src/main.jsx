import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { RolProvider } from './context/RolContext.jsx'

// BrowserRouter y no HashRouter: en el servidor CONAF las URL son limpias
// (https://reserva-bienestar.conaf.cl/catalogo, no .../#/catalogo). El nginx del
// contenedor devuelve index.html para cualquier ruta que no sea un archivo
// (try_files, ver frontend/nginx.conf), así que recargar en una ruta profunda
// funciona. El HashRouter existía porque la maqueta se publicaba en GitHub Pages,
// que no reescribe rutas; esa publicación se retiró.
//
// basename = import.meta.env.BASE_URL, nunca una cadena fija: es exactamente el
// --base con que se construyó el bundle (hoy "/", ver vite.config.js), así que
// servir la aplicación bajo un subpath no exigiría tocar esta línea.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <RolProvider>
        <App />
      </RolProvider>
    </BrowserRouter>
  </StrictMode>,
)
