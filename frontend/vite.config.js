import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Sin `base`: el default de Vite es "/", que es lo correcto para el único destino
// que tiene hoy la aplicación — el servidor CONAF, donde vive en la raíz del
// dominio (https://reserva-bienestar.conaf.cl/).
//
// Antes valía '/coipo_cabania/' porque la maqueta se publicaba en GitHub Pages,
// bajo el subpath del repositorio. Esa publicación se retiró: Pages gratuito
// exige que el repositorio sea público, y el pipeline de despliegue institucional
// necesita que sea privado (el workflow reusable vive en un repo privado y un
// repo público no puede invocarlo).
//
// El base se sigue pasando al construir, con el ARG BASE_PATH de
// frontend/Dockerfile, y no se fija acá: es el patrón del resto de las apps del
// ecosistema y deja preparado el caso de servir bajo un subpath sin tocar código.
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
