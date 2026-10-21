/* Calendario operativo de la región: una fila por casa, tres semanas a la vista.
   Cerrar fechas por mantención o uso institucional, y quitar esos cierres. */
import { useState } from 'react'
import { addDays, format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { crearBloqueo, eliminarBloqueo, getBloqueos, getDisponibilidad, getInmuebles } from '../../logica/api/inmuebles.js'
import { useAccion, useConsulta } from '../../nucleo/consulta.js'
import { useSesion } from '../../nucleo/sesion.js'
import { fecha, hoyISO, nombreRegion } from '../../nucleo/textos.js'
import Hoja from '../../piezas/Hoja.jsx'
import { Campo, Cargando, Falla, Titulo, Vacio } from '../../piezas/basicas.jsx'
import { SelectorRegion } from './InicioRegional.jsx'

const DIAS = 21
const ISO = (d) => format(d, 'yyyy-MM-dd')
const corto = (nombre) => nombre.replace(/^Casa de (Huéspedes|Veraneo) /, '')
const TIPO = { disponible: 'libre', ocupado: 'ocupado', bloqueado: 'cerrado', mantencion: 'mantencion' }

function Cerrar({ casas, alCerrar }) {
  const { actor } = useSesion()
  const [b, setB] = useState({ inmueble_id: casas[0]?.id ?? '', desde: hoyISO(), hasta: hoyISO(), origen: 'mantencion', motivo: '' })
  const [correr, { ocupado, error }] = useAccion()
  const cambiar = (k) => (e) => setB((x) => ({ ...x, [k]: e.target.value }))
  const mal = b.hasta < b.desde
  const guardar = async () => {
    const x = await correr(() => crearBloqueo({ ...b, motivo: b.motivo.trim() }, actor))
    if (x.ok) alCerrar()
  }
  return (
    <Hoja abierta titulo="Cerrar fechas" alCerrar={alCerrar}
      pie={<><button type="button" className="cb-btn cb-btn-sec" onClick={alCerrar}>Volver</button>
        <button type="button" className="b-boton" disabled={mal || !b.motivo.trim()} aria-busy={ocupado || undefined} onClick={ocupado ? undefined : guardar}>Cerrar fechas</button></>}>
      <Campo etiqueta="Casa" como="select" value={b.inmueble_id} onChange={cambiar('inmueble_id')}>
        {casas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
      </Campo>
      <div className="cb-dos-campos">
        <Campo etiqueta="Desde" type="date" value={b.desde} onChange={cambiar('desde')} />
        <Campo etiqueta="Hasta" type="date" value={b.hasta} min={b.desde} onChange={cambiar('hasta')} error={mal ? 'Antes de «desde»' : null} />
      </div>
      <Campo etiqueta="Por qué" como="select" value={b.origen} onChange={cambiar('origen')}>
        <option value="mantencion">Mantención</option><option value="institucional">Uso institucional</option>
      </Campo>
      <Campo etiqueta="Detalle" value={b.motivo} onChange={cambiar('motivo')} placeholder="Ej.: pintura exterior" />
      <Falla>{error}</Falla>
    </Hoja>
  )
}

export default function CalendarioOperativo() {
  const { region, actor } = useSesion()
  const [inicio, setInicio] = useState(hoyISO())
  const [cerrar, setCerrar] = useState(false)
  const [quitar, { error: errorQuitar }] = useAccion()
  const desde = inicio
  const hasta = ISO(addDays(parseISO(inicio), DIAS - 1))
  const { datos } = useConsulta(async () => {
    const casas = (await getInmuebles({ region })).items
    const disp = await Promise.all(casas.map((c) => getDisponibilidad(c.id, desde, hasta)))
    const bloqueos = (await getBloqueos()).items.filter((b) => b.inmueble_id === null || casas.some((c) => c.id === b.inmueble_id))
    return { casas, disp, bloqueos }
  }, [region, desde, hasta])

  const dias = Array.from({ length: DIAS }, (_, i) => addDays(parseISO(inicio), i))
  const mover = (n) => setInicio((x) => ISO(addDays(parseISO(x), n)))
  const hoy = hoyISO()

  return (
    <div className="cb-pagina">
      <Titulo pre="Calendario" accion={<SelectorRegion />}>Región de {nombreRegion(region)}</Titulo>
      <div className="cb-barra-herr">
        <div className="cb-grupo">
          <button type="button" className="cb-btn-icono" onClick={() => mover(-7)} disabled={inicio <= hoy} aria-label="Semana anterior">‹</button>
          <span className="cb-rango-txt">{fecha(desde)} – {fecha(hasta)}</span>
          <button type="button" className="cb-btn-icono" onClick={() => mover(7)} aria-label="Semana siguiente">›</button>
        </div>
        <button type="button" className="b-boton cb-boton-chico" onClick={() => setCerrar(true)} disabled={!datos?.casas.length}>Cerrar fechas</button>
      </div>

      {!datos ? <Cargando /> : !datos.casas.length ? <Vacio>Sin casas en esta región.</Vacio> : (
        <div className="cb-linea-tiempo" role="region" aria-label="Ocupación por casa" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th scope="col"><span className="cb-oculto">Casa</span></th>
                {dias.map((d) => <th key={ISO(d)} scope="col" data-finde={[0, 6].includes(d.getDay()) || undefined}><small>{format(d, 'EEEEE', { locale: es })}</small>{d.getDate()}</th>)}
              </tr>
            </thead>
            <tbody>
              {datos.casas.map((c, i) => (
                <tr key={c.id}>
                  <th scope="row"><a href={`#casa/${c.id}`}>{corto(c.nombre)}</a></th>
                  {datos.disp[i].dias.map((d) => <td key={d.fecha} data-tipo={TIPO[d.estado]} title={d.motivo ?? 'Libre'}><span className="cb-oculto">{d.estado}</span></td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ul className="cb-cal-leyenda">
        <li><i data-tipo="libre" />Libre</li><li><i data-tipo="ocupado" />Ocupada</li><li><i data-tipo="mantencion" />Mantención</li><li><i data-tipo="cerrado" />Cerrada</li>
      </ul>

      <section className="cb-bloque" aria-labelledby="cb-cierres">
        <h2 id="cb-cierres" className="cb-h2">Fechas cerradas</h2>
        <Falla>{errorQuitar}</Falla>
        {datos?.bloqueos.length ? (
          <ul className="b-cola">
            {datos.bloqueos.map((b) => (
              <li key={b.id}>
                <span className="b-cola-nombre"><b>{b.inmueble_id ? datos.casas.find((c) => c.id === b.inmueble_id)?.nombre : 'Toda la red'}</b><span>{b.motivo}</span></span>
                <span className="b-cola-meta">{fecha(b.desde)} – {fecha(b.hasta)}</span>
                {b.inmueble_id
                  ? <button type="button" className="cb-btn cb-btn-sec" onClick={() => quitar(() => eliminarBloqueo(b.id, actor))}>Quitar</button>
                  : <span className="cb-tenue">Oficina Central</span>}
              </li>
            ))}
          </ul>
        ) : <Vacio>Sin cierres.</Vacio>}
      </section>
      {cerrar && datos && <Cerrar casas={datos.casas} alCerrar={() => setCerrar(false)} />}
    </div>
  )
}
