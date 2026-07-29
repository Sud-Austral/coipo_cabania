import { Link } from 'react-router-dom'
import { MapPin, Users } from 'lucide-react'
import { nombreRegion, etiquetaTipo } from '../../fixtures/inmuebles.js'
import { tarifas } from '../../fixtures/tarifas.js'
import { pesos } from '../../lib/formato.js'
import { Badge } from '../ui/Badge.jsx'
import { rutaFoto } from './fotos.js'

/** Tarifa mínima de referencia, para orientar antes de entrar a la ficha. */
function tarifaDesde(inmueble, esExterno) {
  if (inmueble.tipo === 'veraneo') {
    return { monto: tarifas.veraneo.fija.baja, unidad: 'por noche' }
  }
  const monto = esExterno ? tarifas.huespedes.externo.baja : tarifas.huespedes.afiliado.baja
  return { monto, unidad: 'por persona/noche' }
}

export function InmuebleCard({ inmueble, esExterno = false }) {
  const { monto, unidad } = tarifaDesde(inmueble, esExterno)

  return (
    <Link
      to={`/inmuebles/${inmueble.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-arena-200 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-16/10 overflow-hidden bg-arena-100">
        <img
          src={rutaFoto(inmueble.fotos?.[0])}
          alt={`Fotografía de referencia de ${inmueble.nombre}`}
          width="1200"
          height="750"
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <span className="absolute top-2.5 left-2.5">
          <Badge tono={inmueble.tipo === 'veraneo' ? 'verde' : 'azul'}>
            {etiquetaTipo(inmueble.tipo)}
          </Badge>
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-base leading-snug font-semibold text-verde-900 group-hover:underline">
          {inmueble.nombre}
        </h3>

        <p className="mt-1.5 flex items-center gap-1.5 text-sm text-slate-600">
          <MapPin size={14} className="shrink-0 text-slate-400" aria-hidden="true" />
          {inmueble.localidad} · {nombreRegion(inmueble.region)}
        </p>

        <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
          <Users size={14} className="shrink-0 text-slate-400" aria-hidden="true" />
          Hasta {inmueble.capacidad_maxima} personas · {inmueble.dormitorios} dormitorios
        </p>

        <p className="mt-3 line-clamp-2 text-sm text-slate-500">{inmueble.descripcion}</p>

        <p className="mt-auto pt-3 text-sm">
          <span className="text-slate-500">Desde </span>
          <span className="tabular font-semibold text-verde-800">{pesos(monto)}</span>
          <span className="text-slate-500"> {unidad}</span>
        </p>
      </div>
    </Link>
  )
}
