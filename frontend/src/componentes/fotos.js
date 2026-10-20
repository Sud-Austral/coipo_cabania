/** Resuelve el nombre de una foto ('ext-bosque') al archivo empaquetado por Vite. */
const ARCHIVOS = import.meta.glob('../assets/fotos/*.webp', { eager: true, import: 'default' })

const POR_NOMBRE = Object.fromEntries(
  Object.entries(ARCHIVOS).map(([ruta, url]) => [ruta.split('/').pop().replace('.webp', ''), url]),
)

export const rutaFoto = (nombre) => POR_NOMBRE[nombre] ?? POR_NOMBRE['ent-patagonia']
