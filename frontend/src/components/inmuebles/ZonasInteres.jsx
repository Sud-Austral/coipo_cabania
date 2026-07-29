import {
  Bus,
  HeartPulse,
  MapPin,
  ShoppingCart,
  Trees,
  Waves,
} from 'lucide-react'
import { distancia } from '../../lib/formato.js'

const CATEGORIAS = {
  parque: { icono: Trees, etiqueta: 'Áreas silvestres', color: 'text-verde-600 bg-verde-50' },
  playa: { icono: Waves, etiqueta: 'Playas', color: 'text-sky-600 bg-sky-50' },
  salud: { icono: HeartPulse, etiqueta: 'Salud', color: 'text-rose-600 bg-rose-50' },
  servicios: { icono: ShoppingCart, etiqueta: 'Servicios', color: 'text-amber-600 bg-amber-50' },
  transporte: { icono: Bus, etiqueta: 'Transporte', color: 'text-indigo-600 bg-indigo-50' },
}

export function ZonasInteres({ zonas = [] }) {
  if (!zonas.length) {
    return (
      <p className="text-sm text-slate-500">
        Aún no se registran zonas de interés para este inmueble.
      </p>
    )
  }

  const ordenadas = [...zonas].sort((a, b) => a.distancia_km - b.distancia_km)

  return (
    <ul className="divide-y divide-arena-200">
      {ordenadas.map((zona) => {
        const cat = CATEGORIAS[zona.categoria] ?? {
          icono: MapPin,
          etiqueta: 'Punto de interés',
          color: 'text-slate-500 bg-slate-50',
        }
        const Icono = cat.icono
        return (
          <li key={zona.nombre} className="flex items-center gap-3 py-2.5">
            <span className={`rounded-lg p-2 ${cat.color}`}>
              <Icono size={16} aria-hidden="true" />
            </span>
            <span className="flex-1">
              <span className="block text-sm text-slate-800">{zona.nombre}</span>
              <span className="block text-xs text-slate-500">{cat.etiqueta}</span>
            </span>
            <span className="tabular text-sm font-medium whitespace-nowrap text-slate-600">
              {distancia(zona.distancia_km)}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
