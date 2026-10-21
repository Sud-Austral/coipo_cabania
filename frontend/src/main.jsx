import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App.jsx'
import './estilos/tokens.css'
// DESPUÉS de tokens.css, para poder derivar de sus medidas. tokens.css es
// geometría MEDIDA del JPEG (y la zona del título, cuyo aire antes del remate está
// etiquetado como decisión) y la verifican `verify-banner.mjs` y
// `verificar-titulo.mjs`; interfaz.css son DECISIONES derivadas de ella. Separados
// a propósito: ver su cabecera.
import './estilos/interfaz.css'
import './estilos/bento.css'
import './estilos/app.css'
import { aplicarTema } from './diseno/tema.js'

// Tema día/noche antes del primer pintado: sin esto la página parpadea en el tema equivocado.
aplicarTema()

createRoot(document.getElementById('raiz')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
