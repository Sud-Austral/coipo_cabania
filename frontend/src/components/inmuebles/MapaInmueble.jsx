import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import { divIcon } from 'leaflet'

/**
 * Mapa con componentes abiertos: Leaflet + teselas de OpenStreetMap.
 *
 * Se usan marcadores construidos con SVG en lugar de las imágenes por omisión
 * de Leaflet, cuyas rutas se rompen al empaquetar con Vite.
 */

const iconoInmueble = divIcon({
  className: '',
  html: `<span style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:9999px;background:#1f6b3b;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)">
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.2 12 3l9 7.2"/><path d="M5 9.5V21h14V9.5"/></svg>
  </span>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -16],
})

const iconoZona = divIcon({
  className: '',
  html: `<span style="display:block;width:14px;height:14px;border-radius:9999px;background:#f59e0b;border:2.5px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.35)"></span>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
  popupAnchor: [0, -8],
})

/**
 * Las zonas de interés de la maqueta no traen coordenadas propias: se ubican
 * alrededor del inmueble según su distancia, solo para ilustrar el entorno.
 * Con los datos reales de Bienestar se usarán sus coordenadas verdaderas.
 */
function posicionAproximada(inmueble, zona, indice, total) {
  const angulo = (indice / Math.max(total, 1)) * 2 * Math.PI
  const grados = Math.min(zona.distancia_km, 25) / 111
  return [
    inmueble.lat + Math.sin(angulo) * grados,
    inmueble.lng + (Math.cos(angulo) * grados) / Math.cos((inmueble.lat * Math.PI) / 180),
  ]
}

export function MapaInmueble({ inmueble, alto = 'h-80', conZonas = true }) {
  const zonas = conZonas ? (inmueble.zonas_interes ?? []).filter((z) => z.distancia_km <= 25) : []

  return (
    <div className={`${alto} overflow-hidden rounded-xl border border-arena-200`}>
      <MapContainer
        center={[inmueble.lat, inmueble.lng]}
        zoom={zonas.length > 2 ? 12 : 13}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; colaboradores de <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker position={[inmueble.lat, inmueble.lng]} icon={iconoInmueble}>
          <Popup>
            <strong>{inmueble.nombre}</strong>
            <br />
            {inmueble.direccion}
          </Popup>
        </Marker>

        {zonas.map((zona, i) => (
          <Marker
            key={zona.nombre}
            position={posicionAproximada(inmueble, zona, i, zonas.length)}
            icon={iconoZona}
          >
            <Popup>
              {zona.nombre}
              <br />
              <span className="text-slate-500">
                a {zona.distancia_km} km · ubicación aproximada
              </span>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
