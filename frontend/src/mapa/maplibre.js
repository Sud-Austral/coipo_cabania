/* El ÚNICO archivo que importa maplibre-gl (patrón `mapa --motor maplibre` de coipo_master_design).
 * Desde la 6 el worker es un archivo aparte que MapLibre busca junto a su módulo; empaquetado por Vite
 * ya no está ahí y el mapa queda en blanco («Worker failed to load»). Vite lo construye aparte y se le
 * dice a MapLibre dónde está, antes de crear el primer mapa. */
import { LngLatBounds, Map as MapaGL, Marker, NavigationControl, setWorkerUrl } from 'maplibre-gl'
import urlDelWorker from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'

setWorkerUrl(urlDelWorker)

/* OpenStreetMap exige Referer. Se pide `origin` solo a sus teselas (MapLibre ≥ 5.21 lo respeta).
   tile.openstreetmap.org sirve para el prototipo; con uso real hacen falta teselas propias. */
const OSM = 'tile.openstreetmap.org'
export const pedir = (url) => {
  try { if (new URL(url).host === OSM) return { url, referrerPolicy: 'origin' } } catch { /* url relativa */ }
  return { url }
}

export const ESTILO = {
  version: 8,
  sources: { osm: { type: 'raster', tiles: [`https://${OSM}/{z}/{x}/{y}.png`], tileSize: 256, maxzoom: 19, attribution: '© OpenStreetMap' } },
  layers: [{ id: 'base', type: 'raster', source: 'osm' }],
}

export { LngLatBounds, MapaGL, Marker, NavigationControl }
