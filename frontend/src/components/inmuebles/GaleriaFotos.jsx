import { useState } from 'react'
import { Camera } from 'lucide-react'
import { fotosDe } from './fotos.js'

export function GaleriaFotos({ inmueble }) {
  const fotos = fotosDe(inmueble)
  const [activa, setActiva] = useState(0)

  return (
    <figure className="overflow-hidden rounded-xl border border-arena-200 bg-white">
      <div className="relative aspect-16/9 bg-arena-100">
        <img
          src={fotos[activa].ruta}
          alt={`Fotografía de referencia de ${inmueble.nombre} (${activa + 1} de ${fotos.length})`}
          width="1200"
          height="675"
          className="h-full w-full object-cover"
        />
        <span className="absolute right-2.5 bottom-2.5 flex items-center gap-1.5 rounded-full bg-slate-900/70 px-2.5 py-1 text-xs text-white">
          <Camera size={12} aria-hidden="true" />
          Imagen de referencia
        </span>
      </div>

      {fotos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto p-2.5">
          {fotos.map((foto, i) => (
            <button
              key={foto.nombre}
              type="button"
              onClick={() => setActiva(i)}
              aria-label={`Ver fotografía ${i + 1}`}
              aria-current={i === activa}
              className={`aspect-4/3 w-20 shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 transition-colors ${
                i === activa ? 'border-verde-600' : 'border-transparent hover:border-arena-200'
              }`}
            >
              <img
                src={foto.ruta}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      <figcaption className="border-t border-arena-200 px-3 py-2 text-xs text-slate-500">
        Las fotografías son de referencia y no corresponden al inmueble real. Serán
        reemplazadas por el material oficial del Servicio de Bienestar.
      </figcaption>
    </figure>
  )
}
