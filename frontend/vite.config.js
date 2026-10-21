import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// El nginx del contenedor `app` sirve esto desde la raiz y proxea /api al
// backend por la red interna de Docker (ver frontend/nginx.conf). No hace falta
// proxy de Vite en produccion; el de abajo es solo para `npm run dev`.
export default defineConfig({
  plugins: [react()],
  // Autoalojado en la raiz, detras del proxy del servidor. El override existe
  // por si algun despliegue necesita un subpath.
  base: process.env.BASE_PATH || '/',
  // MapLibre (~1 MB) va en su propio paquete, cargado solo al abrir la ficha de una casa.
  build: { chunkSizeWarningLimit: 1200 },
  test: { environment: 'node' },
  server: {
    proxy: {
      '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      // /health y /auth/callback son las DOS excepciones al prefijo /api/v1, y
      // en desarrollo tambien tienen que llegar al backend.
      '/health': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/auth': { target: 'http://127.0.0.1:8000', changeOrigin: true },
    },
  },
})
