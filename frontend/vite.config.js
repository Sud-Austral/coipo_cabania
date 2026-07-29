import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base: el sitio se publica en https://sud-austral.github.io/coipo_cabania/
// En fase 2 (servidor CONAF, dominio propio) vuelve a '/'.
export default defineConfig({
  base: '/coipo_cabania/',
  plugins: [react(), tailwindcss()],
})
