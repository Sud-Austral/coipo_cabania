import { useEffect, useMemo, useState } from 'react'
import { DayPicker } from 'react-day-picker'
import { es } from 'date-fns/locale'
import { addMonths, endOfMonth, parseISO, startOfMonth, startOfToday } from 'date-fns'
import { getDisponibilidad } from '../../api/inmuebles.js'
import { aISO } from '../../lib/formato.js'

/**
 * Calendario de disponibilidad (solicitud §5.1 req. 5).
 *
 * `modo="lectura"` solo muestra el estado de cada día.
 * `modo="rango"` permite elegir entrada y salida, con los días no disponibles
 * deshabilitados.
 */
export function CalendarioDisponibilidad({
  inmuebleId,
  modo = 'lectura',
  rango,
  onCambiarRango,
  meses = 2,
}) {
  const [dias, setDias] = useState([])
  const [mes, setMes] = useState(startOfToday())

  useEffect(() => {
    let vigente = true
    const desde = aISO(startOfMonth(mes))
    const hasta = aISO(endOfMonth(addMonths(mes, meses + 1)))
    getDisponibilidad(inmuebleId, desde, hasta)
      .then((r) => vigente && setDias(r.dias))
      .catch(() => vigente && setDias([]))
    return () => {
      vigente = false
    }
  }, [inmuebleId, mes, meses])

  const { ocupados, bloqueados, mantencion, motivos } = useMemo(() => {
    const grupos = { ocupados: [], bloqueados: [], mantencion: [], motivos: new Map() }
    dias.forEach((d) => {
      if (d.estado === 'disponible') return
      const fecha = parseISO(d.fecha)
      if (d.estado === 'ocupado') grupos.ocupados.push(fecha)
      if (d.estado === 'bloqueado') grupos.bloqueados.push(fecha)
      if (d.estado === 'mantencion') grupos.mantencion.push(fecha)
      grupos.motivos.set(d.fecha, d.motivo)
    })
    return grupos
  }, [dias])

  const noDisponibles = [...ocupados, ...bloqueados, ...mantencion]

  return (
    <div>
      <DayPicker
        locale={es}
        month={mes}
        onMonthChange={setMes}
        numberOfMonths={meses}
        mode={modo === 'rango' ? 'range' : undefined}
        selected={modo === 'rango' ? rango : undefined}
        onSelect={modo === 'rango' ? onCambiarRango : undefined}
        excludeDisabled
        disabled={
          modo === 'rango' ? [{ before: startOfToday() }, ...noDisponibles] : undefined
        }
        modifiers={{
          'dia-ocupado': ocupados,
          'dia-bloqueado': bloqueados,
          'dia-mantencion': mantencion,
        }}
        modifiersClassNames={{
          'dia-ocupado': 'dia-ocupado',
          'dia-bloqueado': 'dia-bloqueado',
          'dia-mantencion': 'dia-mantencion',
        }}
        className="rdp-root mx-auto w-fit"
      />

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-arena-200 pt-3 text-xs text-slate-600">
        <li className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm border border-arena-200 bg-white" />
          Disponible
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-red-100" />
          Ocupado por otra reserva
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-amber-100" />
          Mantención o reparación
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-slate-200" />
          Bloqueado por temporada
        </li>
      </ul>

      {motivos.size > 0 && modo === 'lectura' && (
        <p className="mt-2 text-xs text-slate-500">
          Los días no disponibles corresponden a reservas confirmadas, mantenciones
          programadas o bloqueos de temporada definidos por el Servicio de Bienestar.
        </p>
      )}
    </div>
  )
}
