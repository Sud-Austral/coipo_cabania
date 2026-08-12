import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Sin `base`: el default de Vite es "/" y es lo correcto para el servidor CONAF,
// donde la app vive en la raíz del dominio (https://reserva-bienestar.conaf.cl/).
//
// El MISMO código produce dos sitios, y cada destino fija su base al construir:
//   servidor  → frontend/Dockerfile, ARG BASE_PATH=/   (lo pasa docker-compose.yml)
//   Pages     → .github/workflows/pages.yml, --base=/<repo>/
//
// Se hace en este sentido y no al revés (default /coipo_cabania/ con override a
// "/" en Docker) porque los modos de fallo no son simétricos: si alguien olvidara
// el flag, con esta configuración se rompe la DEMO de Pages —visible al
// instante— y no producción, donde el try_files del nginx devolvería 200 con el
// index.html en lugar del bundle y la pantalla quedaría en blanco con un error de
// MIME que no menciona el base path por ninguna parte.
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
