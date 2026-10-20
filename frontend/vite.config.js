import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// `npm run build:pagina` genera un paquete sin divisiones de código y con las
// imágenes incrustadas; luego `scripts/pagina.mjs` lo junta en un único HTML
// para publicarlo como página de demostración en claude.ai.
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  build:
    mode === 'pagina'
      ? { outDir: 'dist-pagina', assetsInlineLimit: 100_000_000, cssCodeSplit: false, rolldownOptions: { output: { inlineDynamicImports: true } } }
      : {},
}))
