import { useState } from 'react'
import { ArrowDown, ArrowUp, Download, Lightbulb } from 'lucide-react'
import { REGIONES } from '../../datos/casas.js'
import { listarCasas, todasLasReservas, useDatos } from '../../datos/servicio.js'
import { fechaCorta, hoyISO, nombreMes, primerDiaMes, sumarDias } from '../../lib/fechas.js'
import { pesos } from '../../lib/formato.js'
import { CALIDADES } from '../../lib/reglas.js'
import { calcularIndicadores } from '../../lib/indicadores.js'
import { descargarCSV } from '../../lib/csv.js'
import { BarrasHorizontales, Columnas, Indicador, Panel } from '../../componentes/graficos.jsx'
import { Boton, claseFiltro } from '../../componentes/ui.jsx'
import { nombreRegion } from '../encargada/comun.jsx'

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const PAGO = { planilla: 'Descuento por planilla', transferencia: 'Transferencia' }
const pct = (x) => `${Math.round(x * 100)}%`
const miles = (n) => Math.round(n).toLocaleString('es-CL')
const millones = (n) => (n >= 1e6 ? `$${(n / 1e6).toLocaleString('es-CL', { maximumFractionDigits: 1 })} M` : pesos(n))

function periodos(hoy) {
  const anio = hoy.slice(0, 4)
  return [
    { id: 'anio', etiqueta: `${anio} a la fecha`, desde: `${anio}-01-01`, hasta: sumarDias(hoy, 1) },
    { id: '90', etiqueta: 'Últimos 90 días', desde: sumarDias(hoy, -89), hasta: sumarDias(hoy, 1) },
    { id: 'mes', etiqueta: 'Este mes', desde: primerDiaMes(hoy), hasta: sumarDias(hoy, 1) },
    { id: 'futuro', etiqueta: 'Próximos 90 días (reservado)', desde: sumarDias(hoy, 1), hasta: sumarDias(hoy, 91) },
  ]
}

const COLUMNAS = [
  { k: 'casa', t: 'Casa', v: (x) => x.casa.nombre },
  { k: 'region', t: 'Región', v: (x) => nombreRegion(x.casa.region) },
  { k: 'noches', t: 'Noches', v: (x) => x.noches, num: true },
  { k: 'ocupacion', t: 'Ocupación', v: (x) => x.ocupacion, num: true, f: pct },
  { k: 'reservas', t: 'Reservas', v: (x) => x.reservas, num: true },
  { k: 'usuarios', t: 'Usuarios', v: (x) => x.usuarios, num: true },
  { k: 'ingresos', t: 'Ingresos', v: (x) => x.ingresos, num: true, f: pesos },
]

export function Dashboard() {
  useDatos()
  const hoy = hoyISO()
  const ps = periodos(hoy)
  const [periodoId, setPeriodoId] = useState('anio')
  const [region, setRegion] = useState('')
  const [orden, setOrden] = useState({ k: 'noches', asc: false })
  const p = ps.find((x) => x.id === periodoId)
  const reservas = todasLasReservas()
  const casas = listarCasas({ incluirInactivas: true })
  const ind = calcularIndicadores({ reservas, casas, desde: p.desde, hasta: p.hasta, region })

  const top = (k) => [...ind.porCasa].sort((a, b) => b[k] - a[k]).slice(0, 10)
  const menos = [...ind.porCasa].sort((a, b) => a.ocupacion - b.ocupacion)[0]
  const masUsada = top('noches')[0]
  const masIngreso = top('ingresos')[0]
  const top5 = top('ingresos').slice(0, 5).reduce((s, x) => s + x.ingresos, 0)
  const regTop = ind.porRegion[0]
  const tabla = [...ind.porCasa].sort((a, b) => {
    const c = COLUMNAS.find((x) => x.k === orden.k)
    const va = c.v(a)
    const vb = c.v(b)
    const r = typeof va === 'string' ? va.localeCompare(vb) : va - vb
    return orden.asc ? r : -r
  })

  const exportar = () =>
    descargarCSV(
      `indicadores-casas-${p.id}-${hoy}.csv`,
      ['Casa', 'Región', 'Noches ocupadas', 'Ocupación (%)', 'Reservas', 'Usuarios', 'Ingresos'],
      tabla.map((x) => [x.casa.nombre, nombreRegion(x.casa.region), x.noches, Math.round(x.ocupacion * 100), x.reservas, x.usuarios, Math.round(x.ingresos)]),
    )

  const mesEtiqueta = (m) => MESES_CORTOS[Number(m.slice(5, 7)) - 1]

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="mt-1 text-[15px] text-tinta-500">
            {fechaCorta(p.desde, true)} – {fechaCorta(sumarDias(p.hasta, -1), true)} · {region ? nombreRegion(region) : 'todo el país'} · {ind.casasActivas} casas
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select className={claseFiltro} value={periodoId} onChange={(e) => setPeriodoId(e.target.value)} aria-label="Período">
            {ps.map((x) => (
              <option key={x.id} value={x.id}>
                {x.etiqueta}
              </option>
            ))}
          </select>
          <select className={claseFiltro} value={region} onChange={(e) => setRegion(e.target.value)} aria-label="Región">
            <option value="">Todas las regiones</option>
            {REGIONES.filter((r) => casas.some((c) => c.region === r.codigo)).map((r) => (
              <option key={r.codigo} value={r.codigo}>
                {r.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Indicador etiqueta="Usuarios" valor={miles(ind.usuarios)} detalle="personas distintas" />
        <Indicador etiqueta="Reservas" valor={miles(ind.reservas)} detalle={`${ind.estadiaPromedio.toFixed(1).replace('.', ',')} noches promedio`} />
        <Indicador etiqueta="Noches ocupadas" valor={miles(ind.noches)} detalle={`${ind.personasPromedio.toFixed(1).replace('.', ',')} personas por reserva`} />
        <Indicador etiqueta="Ocupación" valor={pct(ind.ocupacion)} detalle="de las noches disponibles" />
        <Indicador etiqueta="Ingresos" valor={millones(ind.ingresos)} detalle={`${pesos(ind.ingresoPorNoche)} por noche`} />
        <Indicador etiqueta="Anticipación" valor={`${Math.round(ind.anticipacionPromedio)} días`} detalle="promedio entre reserva y llegada" />
      </div>

      {ind.porCasa.length > 1 && masUsada && (
        <section className="mt-4 rounded-xl border border-verde-200 bg-verde-50 p-4" aria-labelledby="t-hall">
          <h2 id="t-hall" className="flex items-center gap-2 text-[15px] font-semibold text-verde-800">
            <Lightbulb className="size-4" aria-hidden /> Hallazgos del período
          </h2>
          <ul className="mt-2 grid gap-x-8 gap-y-1.5 text-[15px] text-tinta-700 md:grid-cols-2">
            <li>
              <strong>{masUsada.casa.nombre}</strong> es la casa más utilizada: {miles(masUsada.noches)} noches ({pct(masUsada.ocupacion)} de ocupación).
            </li>
            <li>
              <strong>{masIngreso.casa.nombre}</strong> genera los mayores ingresos: {pesos(masIngreso.ingresos)}.
            </li>
            <li>
              Las 5 casas con más ingresos concentran el <strong>{pct(ind.ingresos ? top5 / ind.ingresos : 0)}</strong> del total.
            </li>
            <li>
              <strong>{menos.casa.nombre}</strong> tiene la menor ocupación ({pct(menos.ocupacion)}): revisar su difusión, estado o permanencia en la red.
            </li>
            {!region && regTop && (
              <li>
                {nombreRegion(regTop.region)} es la región con mayor ocupación ({pct(regTop.ocupacion)}).
              </li>
            )}
            <li>
              {pct(ind.tasaDesistimiento)} de las reservas terminó en desistimiento ({pesos(ind.cargosDesistimiento)} en cargos).
            </li>
          </ul>
        </section>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel titulo="Ingresos por mes" subtitulo="Valor de las noches ocupadas en el mes más cargos por desistimiento">
          <Columnas
            datos={ind.porMes.map((m) => ({ etiqueta: mesEtiqueta(m.mes), etiquetaLarga: nombreMes(m.mes + '-01'), valor: m.ingresos, ocupacion: m.ocupacion }))}
            formato={pesos}
            formatoEje={(v) => (v >= 1e6 ? `${(v / 1e6).toLocaleString('es-CL')} M` : miles(v))}
            detalle={(d) => `Ocupación ${pct(d.ocupacion)}`}
          />
        </Panel>
        <Panel titulo="Noches ocupadas por mes" subtitulo="Muestra la estacionalidad de la demanda">
          <Columnas
            datos={ind.porMes.map((m) => ({ etiqueta: mesEtiqueta(m.mes), etiquetaLarga: nombreMes(m.mes + '-01'), valor: m.noches, ocupacion: m.ocupacion }))}
            formato={(v) => `${miles(v)} noches`}
            formatoEje={miles}
            detalle={(d) => `Ocupación ${pct(d.ocupacion)}`}
          />
        </Panel>

        <Panel titulo="Casas más utilizadas" subtitulo="Top 10 por noches ocupadas">
          <BarrasHorizontales
            datos={top('noches').map((x) => ({ etiqueta: x.casa.nombre, valor: x.noches, x }))}
            formato={(v) => `${miles(v)} noches`}
            detalle={(d) => `${pct(d.x.ocupacion)} ocupación · ${d.x.reservas} reservas · ${nombreRegion(d.x.casa.region)}`}
          />
        </Panel>
        <Panel titulo="Casas con mayores ingresos" subtitulo="Top 10 en el período">
          <BarrasHorizontales
            datos={top('ingresos').map((x) => ({ etiqueta: x.casa.nombre, valor: x.ingresos, x }))}
            formato={millones}
            detalle={(d) => `${miles(d.x.noches)} noches · ${pesos(d.x.noches ? d.x.ingresos / d.x.noches : 0)} por noche`}
          />
        </Panel>

        {!region && (
          <Panel titulo="Ocupación por región" subtitulo="Noches ocupadas sobre noches disponibles">
            <BarrasHorizontales
              datos={ind.porRegion.map((r) => ({ etiqueta: nombreRegion(r.region), valor: r.ocupacion, r }))}
              formato={pct}
              detalle={(d) => `${d.r.casas} casas · ${miles(d.r.noches)} noches · ${millones(d.r.ingresos)}`}
            />
          </Panel>
        )}
        <Panel titulo="Quiénes usan las casas" subtitulo="Reservas según la calidad del usuario/a responsable">
          <BarrasHorizontales
            datos={ind.porCalidad.map((c) => ({ etiqueta: CALIDADES[c.clave], valor: c.reservas, c }))}
            formato={(v) => `${miles(v)} (${pct(ind.reservas ? v / ind.reservas : 0)})`}
            detalle={(d) => `${d.c.usuarios} personas · ${millones(d.c.ingresos)}`}
          />
          <h3 className="mt-6 text-[14px] font-semibold text-tinta-900">Forma de pago</h3>
          <div className="mt-2">
            <BarrasHorizontales
              datos={ind.porPago.map((c) => ({ etiqueta: PAGO[c.clave], valor: c.reservas }))}
              formato={(v) => `${miles(v)} (${pct(ind.reservas ? v / ind.reservas : 0)})`}
            />
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
        <Indicador etiqueta="Desistimientos" valor={pct(ind.tasaDesistimiento)} detalle={`${pesos(ind.cargosDesistimiento)} en cargos (Art. 10)`} />
        <Indicador etiqueta="Anuladas por Bienestar" valor={miles(ind.anuladas)} detalle={`${pct(ind.tasaAnulacion)} de las reservas (Art. 11)`} />
        <Indicador etiqueta="Ingreso por noche" valor={pesos(ind.ingresoPorNoche)} detalle="promedio del período" />
      </div>

      <div className="mt-4" />
      <Panel
        titulo="Todas las casas"
        subtitulo="Ordene por cualquier columna; para ver las menos usadas, ordene por ocupación ascendente"
        accion={
          <Boton variante="secundario" onClick={exportar}>
            <Download className="size-4" aria-hidden /> Descargar CSV
          </Boton>
        }
      >
        <div className="-mx-4 overflow-x-auto sm:-mx-5">
          <table className="w-full min-w-[720px] text-left text-[15px]">
            <thead className="border-b border-borde text-[13px] text-tinta-500">
              <tr>
                {COLUMNAS.map((c) => (
                  <th key={c.k} className={`px-4 py-2 font-medium sm:px-5 ${c.num ? 'text-right' : ''}`} aria-sort={orden.k === c.k ? (orden.asc ? 'ascending' : 'descending') : 'none'}>
                    <button
                      type="button"
                      className={`inline-flex items-center gap-1 hover:text-tinta-900 ${orden.k === c.k ? 'text-tinta-900' : ''}`}
                      onClick={() => setOrden({ k: c.k, asc: orden.k === c.k ? !orden.asc : !c.num })}
                    >
                      {c.t}
                      {orden.k === c.k && (orden.asc ? <ArrowUp className="size-3.5" aria-hidden /> : <ArrowDown className="size-3.5" aria-hidden />)}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-borde">
              {tabla.map((x) => (
                <tr key={x.casa.id} className="hover:bg-stone-50">
                  {COLUMNAS.map((c) => (
                    <td key={c.k} className={`px-4 py-2 sm:px-5 ${c.num ? 'text-right tabular-nums' : ''}`}>
                      {c.f ? c.f(c.v(x)) : c.v(x)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <p className="mt-3 text-[13px] text-tinta-500">
        Datos ficticios de la maqueta. Cálculo: reservas confirmadas, en curso o finalizadas; los ingresos consideran las noches dentro del período y los cargos por desistimiento.
      </p>
    </>
  )
}
