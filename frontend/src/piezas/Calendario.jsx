/* Calendario de disponibilidad de una casa (getDisponibilidad de la lógica).
   Con `alElegir` marca llegada y salida: primer toque = llegada, segundo = salida.
   La noche de salida no se ocupa, así que un día ocupado puede ser día de salida. */
import { useMemo, useState } from 'react'
import { addDays, addMonths, endOfMonth, format, getISODay, parseISO, startOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { getDisponibilidad } from '../logica/api/inmuebles.js'
import { useConsulta } from '../nucleo/consulta.js'
import { hoyISO } from '../nucleo/textos.js'

const ISO = (d) => format(d, 'yyyy-MM-dd')
const SEMANA = ['lu', 'ma', 'mi', 'ju', 'vi', 'sá', 'do']
const CERRADO = ['bloqueado', 'mantencion']

export default function Calendario({ inmuebleId, rango, alElegir, meses = 2, inicio }) {
  const [base, setBase] = useState(() => startOfMonth(inicio ? parseISO(inicio) : new Date()))
  const desde = ISO(base)
  const hasta = ISO(endOfMonth(addMonths(base, meses - 1)))
  const { datos } = useConsulta(() => getDisponibilidad(inmuebleId, desde, hasta), [inmuebleId, desde, hasta])
  const estado = useMemo(() => new Map((datos?.dias ?? []).map((d) => [d.fecha, d])), [datos])
  const hoy = hoyISO()
  const entrada = rango?.entrada ?? null
  const salida = rango?.salida ?? null
  const eligiendoSalida = Boolean(entrada && !salida)

  // ¿Están libres todas las noches entre la llegada y este día?
  const nochesLibres = (fin) => {
    for (let d = parseISO(entrada); ISO(d) < fin; d = addDays(d, 1)) {
      const e = estado.get(ISO(d))?.estado
      if (e && e !== 'disponible') return false
    }
    return true
  }

  const tocar = (iso) => {
    if (!alElegir) return
    if (eligiendoSalida && iso > entrada && nochesLibres(iso)) alElegir({ entrada, salida: iso })
    else alElegir({ entrada: iso, salida: null })
  }

  const mesesVisibles = Array.from({ length: meses }, (_, i) => addMonths(base, i))
  const primerMes = startOfMonth(new Date())

  return (
    <div className="cb-cal" data-cargando={!datos || undefined}>
      <div className="cb-cal-nav">
        <button type="button" className="cb-btn-icono" onClick={() => setBase((b) => addMonths(b, -1))} disabled={base <= primerMes} aria-label="Mes anterior">‹</button>
        <button type="button" className="cb-btn-icono" onClick={() => setBase((b) => addMonths(b, 1))} aria-label="Mes siguiente">›</button>
      </div>
      <div className="cb-cal-meses">
        {mesesVisibles.map((m) => {
          const vacios = getISODay(m) - 1
          const dias = Array.from({ length: endOfMonth(m).getDate() }, (_, i) => ISO(addDays(m, i)))
          return (
            <div key={ISO(m)} className="cb-cal-mes">
              <p className="cb-cal-titulo">{format(m, 'MMMM yyyy', { locale: es })}</p>
              <div className="cb-cal-grilla" role="grid">
                {SEMANA.map((s) => <span key={s} className="cb-cal-sem" aria-hidden="true">{s}</span>)}
                {Array.from({ length: vacios }, (_, i) => <span key={`v${i}`} />)}
                {dias.map((iso) => {
                  const e = estado.get(iso)?.estado ?? 'disponible'
                  const pasado = iso < hoy
                  const salidaPosible = eligiendoSalida && iso > entrada && nochesLibres(iso)
                  const elegible = alElegir && !pasado && (e === 'disponible' || salidaPosible)
                  const enRango = entrada && salida && iso > entrada && iso < salida
                  const marca = iso === entrada ? 'llegada' : iso === salida ? 'salida' : enRango ? 'rango' : undefined
                  const tipo = pasado ? 'pasado' : CERRADO.includes(e) ? 'cerrado' : e === 'ocupado' ? 'ocupado' : 'libre'
                  const nombre = `${format(parseISO(iso), "EEEE d 'de' MMMM", { locale: es })}: ${{ libre: 'libre', ocupado: 'ocupada', cerrado: 'cerrada', pasado: 'pasado' }[tipo]}`
                  return (
                    <button key={iso} type="button" className="cb-cal-dia" data-tipo={tipo} data-marca={marca}
                      disabled={!elegible} onClick={() => tocar(iso)} aria-label={nombre} aria-pressed={marca === 'llegada' || marca === 'salida' || undefined}
                      title={estado.get(iso)?.motivo ?? undefined} data-fecha={iso}>
                      {Number(iso.slice(8))}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
      <ul className="cb-cal-leyenda" aria-label="Leyenda">
        <li><i data-tipo="libre" />Libre</li>
        <li><i data-tipo="ocupado" />Ocupada</li>
        <li><i data-tipo="cerrado" />Cerrada</li>
      </ul>
    </div>
  )
}
