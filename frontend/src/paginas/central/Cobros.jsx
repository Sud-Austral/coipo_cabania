import { useState } from 'react'
import { Download, Send, CheckCheck, Wallet } from 'lucide-react'
import { cambiarEstadoNomina, estadoNomina, nominaPlanilla, pagosPorRegistrar, periodosNomina, registrarDevolucion, registrarPago, todasLasReservas, useDatos } from '../../datos/servicio.js'
import { diasEntre, fechaCorta, hoyISO, nombreMes, rangoFechas } from '../../lib/fechas.js'
import { pesos, plural } from '../../lib/formato.js'
import { CALIDADES } from '../../lib/reglas.js'
import { descargarCSV } from '../../lib/csv.js'
import { Aviso, Boton, Campo, Tarjeta, claseEntrada } from '../../componentes/ui.jsx'
import { useSesion } from '../../componentes/Perfil.jsx'
import { Dialogo, nombreRegion } from '../encargada/comun.jsx'

const ESTADO_NOMINA = {
  programada: { etiqueta: 'Programada', clase: 'bg-stone-100 text-tinta-700', ayuda: 'Cuotas de meses futuros; aún no se informan.' },
  pendiente: { etiqueta: 'Por informar', clase: 'bg-alerta-50 text-alerta-700', ayuda: 'Revise y envíe la nómina a Remuneraciones.' },
  informada: { etiqueta: 'Informada a Remuneraciones', clase: 'bg-sky-100 text-sky-800', ayuda: 'A la espera de que Remuneraciones confirme el descuento.' },
  descontada: { etiqueta: 'Descontada', clase: 'bg-verde-100 text-verde-800', ayuda: 'Remuneraciones aplicó el descuento.' },
}
const TIPO = { transferencia: 'Transferencia' }

export function Cobros() {
  useDatos()
  const [pestana, setPestana] = useState('nomina')
  const pagos = pagosPorRegistrar()
  const devoluciones = todasLasReservas().filter((r) => r.devolucion_pendiente)
  return (
    <>
      <h1 className="text-2xl font-bold">Cobros</h1>
      <div className="mt-4 flex gap-1 border-b border-borde" role="tablist">
        {[
          ['nomina', 'Nómina de descuentos'],
          ['pagos', `Pagos por registrar (${pagos.length})`],
          ['devoluciones', `Devoluciones (${devoluciones.length})`],
        ].map(([k, t]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={pestana === k}
            onClick={() => setPestana(k)}
            className={`-mb-px border-b-2 px-3 py-2.5 text-[15px] font-medium ${pestana === k ? 'border-verde-700 text-verde-800' : 'border-transparent text-tinta-500 hover:text-tinta-900'}`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="mt-5">
        {pestana === 'nomina' && <Nomina />}
        {pestana === 'pagos' && <Pagos pagos={pagos} />}
        {pestana === 'devoluciones' && <Devoluciones lista={devoluciones} />}
      </div>
    </>
  )
}

function Nomina() {
  const { usuario } = useSesion()
  const periodos = periodosNomina()
  const actual = hoyISO().slice(0, 7)
  const [periodo, setPeriodo] = useState(actual)
  const lineas = nominaPlanilla(periodo)
  const est = estadoNomina(periodo)
  const e = ESTADO_NOMINA[est.estado]
  const total = lineas.reduce((s, l) => s + l.monto, 0)
  const porPersona = Object.values(
    lineas.reduce((m, l) => {
      const g = (m[l.titular.rut] ??= { titular: l.titular, lineas: [], total: 0 })
      g.lineas.push(l)
      g.total += l.monto
      return m
    }, {}),
  ).sort((a, b) => a.titular.nombre.localeCompare(b.titular.nombre))
  const personas = porPersona.length

  function exportar() {
    descargarCSV(
      `nomina-descuentos-bienestar-${periodo}.csv`,
      ['Período', 'RUT', 'Nombre', 'Calidad', 'Región', 'Reserva', 'Casa', 'Concepto', 'Cuota', 'Monto'],
      lineas.map((l) => [periodo, l.titular.rut, l.titular.nombre, CALIDADES[l.titular.calidad], nombreRegion(l.titular.region), l.reserva, l.casa, l.concepto, l.cuota, l.monto]),
    )
  }

  return (
    <>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Período">
        {[...periodos].reverse().map((p) => (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={periodo === p}
            onClick={() => setPeriodo(p)}
            className={`rounded-full px-3 py-1.5 text-sm capitalize ring-1 ring-inset ${periodo === p ? 'bg-verde-700 font-semibold text-white ring-verde-700' : 'bg-white text-tinta-700 ring-borde hover:bg-stone-50'}`}
          >
            {nombreMes(p + '-01')}
          </button>
        ))}
      </div>

      <Tarjeta className="mt-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[13px] text-tinta-500">Nómina de {nombreMes(periodo + '-01')}</p>
            <p className="mt-0.5 text-2xl font-bold tabular-nums">{pesos(total)}</p>
            <p className="text-sm text-tinta-500">
              {plural(lineas.length, 'descuento', 'descuentos')} · {plural(personas, 'persona', 'personas')}
            </p>
          </div>
          <div className="text-right">
            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${e.clase}`}>{e.etiqueta}</span>
            <p className="mt-1 max-w-64 text-[13px] text-tinta-500">{est.por ? `${e.ayuda} ${est.por}, ${fechaCorta(est.en.slice(0, 10), true)}.` : e.ayuda}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Boton variante="secundario" onClick={exportar} disabled={!lineas.length}>
            <Download className="size-4" aria-hidden /> Descargar CSV para Remuneraciones
          </Boton>
          {est.estado === 'pendiente' && (
            <Boton onClick={() => cambiarEstadoNomina(periodo, 'informada', usuario)} disabled={!lineas.length}>
              <Send className="size-4" aria-hidden /> Marcar como informada
            </Boton>
          )}
          {est.estado === 'informada' && (
            <Boton onClick={() => cambiarEstadoNomina(periodo, 'descontada', usuario)}>
              <CheckCheck className="size-4" aria-hidden /> Remuneraciones confirmó el descuento
            </Boton>
          )}
        </div>
      </Tarjeta>

      <Tarjeta className="mt-4 overflow-hidden">
        <div className="hidden grid-cols-[1fr_140px_120px] gap-4 border-b border-borde px-4 py-3 text-[13px] font-medium text-tinta-500 sm:grid">
          <span>Persona</span>
          <span className="text-right">Descuentos</span>
          <span className="text-right">Total del mes</span>
        </div>
        <ul className="divide-y divide-borde">
          {porPersona.map((g) => (
            <li key={g.titular.rut}>
              <details className="group">
                <summary className="grid cursor-pointer list-none grid-cols-[1fr_auto] items-center gap-x-4 px-4 py-2.5 hover:bg-stone-50 sm:grid-cols-[1fr_140px_120px]">
                  <span>
                    <span className="font-medium">{g.titular.nombre}</span>
                    <span className="block text-[13px] text-tinta-500">
                      {g.titular.rut} · {CALIDADES[g.titular.calidad]}
                    </span>
                  </span>
                  <span className="hidden text-right text-sm text-tinta-500 sm:block">{plural(g.lineas.length, 'concepto', 'conceptos')}</span>
                  <span className="text-right font-semibold tabular-nums">{pesos(g.total)}</span>
                </summary>
                <ul className="space-y-1 bg-stone-50 px-4 pb-3 pt-1 text-sm">
                  {g.lineas.map((l, k) => (
                    <li key={k} className="flex justify-between gap-4">
                      <span className="text-tinta-700">
                        {l.casa} · {l.concepto} · cuota {l.cuota}
                        <span className="text-tinta-400"> · {l.reserva}</span>
                      </span>
                      <span className="tabular-nums">{pesos(l.monto)}</span>
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          ))}
        </ul>
        {!lineas.length && <p className="p-6 text-center text-tinta-500">No hay descuentos en este período.</p>}
      </Tarjeta>
    </>
  )
}

function Pagos({ pagos }) {
  const { usuario } = useSesion()
  const [registrando, setRegistrando] = useState(null)
  const [comprobante, setComprobante] = useState('')
  const [hecho, setHecho] = useState(null)
  const hoy = hoyISO()

  return (
    <>
      <p className="max-w-3xl text-[15px] text-tinta-500">
        Reservas confirmadas que pagan por transferencia (jubilados, otros servicios públicos y plazo fijo que la eligieron). Deben pagar antes de llegar; la glosa lleva el código de la reserva.
      </p>
      {hecho && (
        <div className="mt-3">
          <Aviso tipo="info">{hecho}</Aviso>
        </div>
      )}
      <Tarjeta className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-[15px]">
          <thead className="border-b border-borde text-[13px] text-tinta-500">
            <tr>
              <th className="px-4 py-3 font-medium">Plazo</th>
              <th className="px-4 py-3 font-medium">Persona</th>
              <th className="px-4 py-3 font-medium">Reserva</th>
              <th className="px-4 py-3 text-right font-medium">Monto</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-borde">
            {pagos.map((r) => {
              const limite = r.forma_pago.anticipado ? r.entrada : r.salida
              const dias = diasEntre(hoy, limite)
              const urgente = dias <= 7
              return (
                <tr key={r.codigo}>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <span className={`font-medium ${dias < 0 ? 'text-error-700' : urgente ? 'text-alerta-700' : ''}`}>
                      {dias < 0 ? `Vencido hace ${plural(-dias, 'día', 'días')}` : dias === 0 ? 'Hoy' : `En ${plural(dias, 'día', 'días')}`}
                    </span>
                    <span className="block text-[13px] text-tinta-500">{r.forma_pago.anticipado ? 'Antes de llegar' : 'Antes de la salida'} · {fechaCorta(limite)}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    {r.titular.nombre}
                    <span className="block text-[13px] text-tinta-500">{CALIDADES[r.titular.calidad]}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    {r.casa.nombre} · {rangoFechas(r.entrada, r.salida)}
                    <span className="block text-[13px] text-tinta-500">
                      {r.codigo} · {TIPO[r.forma_pago.tipo]}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{pesos(r.total)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Boton
                      variante="secundario"
                      onClick={() => {
                        setRegistrando(r)
                        setComprobante('')
                      }}
                    >
                      <Wallet className="size-4" aria-hidden /> Registrar pago
                    </Boton>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {!pagos.length && <p className="p-6 text-center text-tinta-500">No hay pagos por registrar.</p>}
      </Tarjeta>

      {registrando && (
        <Dialogo titulo="Registrar pago" onCerrar={() => setRegistrando(null)}>
          <p className="mt-2 text-[15px] text-tinta-700">
            {registrando.titular.nombre} · {registrando.codigo} · <strong>{pesos(registrando.total)}</strong>
          </p>
          <Campo etiqueta={'N° de operación de la transferencia'} className="mt-4">
            <input className={claseEntrada} value={comprobante} onChange={(e) => setComprobante(e.target.value)} autoFocus />
          </Campo>
          <div className="mt-6 flex justify-end gap-3">
            <Boton variante="secundario" onClick={() => setRegistrando(null)}>
              Volver
            </Boton>
            <Boton
              disabled={comprobante.trim().length < 3}
              onClick={() => {
                registrarPago(registrando.codigo, { comprobante: comprobante.trim() }, usuario)
                setHecho(`Pago de ${registrando.titular.nombre} registrado (${comprobante.trim()}). Se avisó al usuario.`)
                setRegistrando(null)
              }}
            >
              Registrar
            </Boton>
          </div>
        </Dialogo>
      )}
    </>
  )
}

function Devoluciones({ lista }) {
  const { usuario } = useSesion()
  return (
    <>
      <p className="max-w-3xl text-[15px] text-tinta-500">Reservas pagadas que Bienestar anuló por mantención o fuerza mayor: se devuelve íntegramente lo pagado (Art. 11).</p>
      <Tarjeta className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-[15px]">
          <thead className="border-b border-borde text-[13px] text-tinta-500">
            <tr>
              <th className="px-4 py-3 font-medium">Persona</th>
              <th className="px-4 py-3 font-medium">Reserva anulada</th>
              <th className="px-4 py-3 text-right font-medium">A devolver</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-borde">
            {lista.map((r) => (
              <tr key={r.codigo}>
                <td className="px-4 py-2.5">
                  {r.titular.nombre}
                  <span className="block text-[13px] text-tinta-500">{r.contacto?.correo}</span>
                </td>
                <td className="px-4 py-2.5">
                  {r.casa.nombre} · {rangoFechas(r.entrada, r.salida)}
                  <span className="block text-[13px] text-tinta-500">
                    {r.codigo} · pagó con {r.pago.comprobante}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">{pesos(r.total)}</td>
                <td className="px-4 py-2.5 text-right">
                  <Boton variante="secundario" onClick={() => registrarDevolucion(r.codigo, usuario)}>
                    Marcar devuelta
                  </Boton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!lista.length && <p className="p-6 text-center text-tinta-500">No hay devoluciones pendientes.</p>}
      </Tarjeta>
    </>
  )
}
