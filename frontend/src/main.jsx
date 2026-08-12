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
// funciona. En GitHub Pages, que no reescribe nada, el mismo efecto lo consigue
// el 404.html que copia pages.yml.
//
// basename = import.meta.env.BASE_URL, nunca una cadena fija: vale "/" en el
// servidor y "/coipo_cabania/" en Pages, exactamente el --base con que se
// construyó el bundle. La barra final no estorba: react-router la contempla al
// recortar el basename del pathname.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <RolProvider>
        <App />
      </RolProvider>
    </BrowserRouter>
  </StrictMode>,
)
