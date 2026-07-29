import { ArrowUp, Clock, Info } from 'lucide-react'
import { fechaCorta, fechaHora, pesos } from '../../lib/formato.js'
import { MOTIVOS } from '../../fixtures/tarifas.js'
import { Badge } from '../ui/Badge.jsx'
import { Aviso, Boton, Tarjeta } from '../ui/Elementos.jsx'

/**
 * Lista de espera de un inmueble (solicitud §5.1 req. 10).
 *
 * El PDF menciona la lista de espera pero no define si avanza sola al liberarse
 * un cupo o si la gestiona la encargada. En la maqueta se representa el orden
 * propuesto —prelación institucional y luego antigüedad de la solicitud— y el
 * avance se ejecuta a mano, dejando la decisión abierta para la reunión.
 */
export function ListaEspera({ reservas, onPromover }) {
  if (!reservas.length) return null

  const ordenadas = [...reservas].sort((a, b) => {
    const pa = MOTIVOS.find((m) => m.valor === a.motivo)?.prelacion ?? 9
    const pb = MOTIVOS.find((m) => m.valor === b.motivo)?.prelacion ?? 9
    if (pa !== pb) return pa - pb
    return a.creada_en < b.creada_en ? -1 : 1
  })

  return (
    <Tarjeta className="p-5">
      <div className="mb-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-verde-900">
          <Clock size={18} className="text-sky-600" aria-hidden="true" />
          Lista de espera ({ordenadas.length})
        </h2>
        <p className="mt-0.5 text-sm text-slate-600">
          Solicitudes sin cupo en las fechas pedidas. El orden propuesto aplica primero la
          prelación institucional y luego la antigüedad de la solicitud.
        </p>
      </div>

      <ol className="space-y-2.5">
        {ordenadas.map((r, i) => {
          const motivo = MOTIVOS.find((m) => m.valor === r.motivo)
          return (
            <li
              key={r.codigo}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-arena-200 bg-white px-3.5 py-3"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-semibold text-sky-800">
                {i + 1}
              </span>
              <span className="min-w-52 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="tabular text-sm font-medium text-verde-800">{r.codigo}</span>
                  <Badge tono={r.motivo === 'medica' ? 'rojo' : r.motivo === 'laboral' ? 'azul' : 'arena'}>
                    {motivo?.prelacion}° prelación
                  </Badge>
                  {!r.titular_es_afiliado && <Badge tono="ambar">No afiliado</Badge>}
                </span>
                <span className="mt-0.5 block text-sm text-slate-700">
                  {r.titular_nombre} · {r.inmueble?.nombre}
                </span>
                <span className="tabular block text-xs text-slate-500">
                  {fechaCorta(r.fecha_entrada)} → {fechaCorta(r.fecha_salida)} ·{' '}
                  {pesos(r.monto_total)} · solicitada el {fechaHora(r.creada_en)}
                </span>
              </span>
              {onPromover && (
                <Boton variante="secundario" onClick={() => onPromover(r)}>
                  <ArrowUp size={14} aria-hidden="true" />
                  Asignar cupo
                </Boton>
              )}
            </li>
          )
        })}
      </ol>

      <div className="mt-4">
        <Aviso tono="info" icono={Info}>
          <strong>Por definir con Bienestar:</strong> si al liberarse un cupo el sistema avanza
          automáticamente a la primera solicitud de la lista, o si la asignación siempre la
          resuelve la encargada regional (pregunta 7 del listado de la reunión).
        </Aviso>
      </div>
    </Tarjeta>
  )
}
