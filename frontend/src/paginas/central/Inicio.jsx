import { Link } from 'react-router-dom'
import { ClipboardList, FlameKindling, Undo2, Wallet } from 'lucide-react'
import { REGIONES } from '../../datos/casas.js'
import { inventarioDe, listarCasas, pagosPorRegistrar, todasLasReservas, useDatos } from '../../datos/servicio.js'
import { diasEntre, fechaCorta, hoyISO, sumarDias } from '../../lib/fechas.js'
import { plural } from '../../lib/formato.js'
import { Tarjeta } from '../../componentes/ui.jsx'
import { BannerReservaAsistida } from '../gestion/ReservaAsistida.jsx'

export function InicioCentral() {
  useDatos()
  const hoy = hoyISO()
  const casas = listarCasas({ incluirInactivas: true })
  const reservas = todasLasReservas()

  // Alertas operativas
  const pagosUrgentes = pagosPorRegistrar().filter((r) => r.forma_pago.anticipado && r.entrada <= sumarDias(hoy, 7))
  const sinInventario = casas.filter((c) => c.activa && !inventarioDe(c.id))
  const extintores = casas
    .map((c) => ({ casa: c, vence: inventarioDe(c.id)?.seguridad?.extintor_vence }))
    .filter((x) => x.vence && x.vence <= sumarDias(hoy, 30))
  const devoluciones = reservas.filter((r) => r.devolucion_pendiente)

  // Resumen por región: ocupación de los próximos 30 días
  const resumen = REGIONES.map((reg) => {
    const deReg = casas.filter((c) => c.region === reg.codigo && c.activa)
    if (!deReg.length) return null
    const ocupadas = reservas
      .filter((r) => r.casa.region === reg.codigo && r.estado === 'confirmada')
      .reduce((s, r) => {
        const desde = r.entrada > hoy ? r.entrada : hoy
        const hasta = r.salida < sumarDias(hoy, 30) ? r.salida : sumarDias(hoy, 30)
        return s + Math.max(0, diasEntre(desde, hasta))
      }, 0)
    return {
      ...reg,
      casas: deReg.length,
      ocupacion: ocupadas / (deReg.length * 30),
      nuevas: reservas.filter((r) => r.estado === 'confirmada' && r.casa.region === reg.codigo && r.creada_en.slice(0, 10) >= sumarDias(hoy, -7)).length,
    }
  }).filter(Boolean)

  return (
    <>
      <h1 className="text-2xl font-bold">Panel nacional</h1>
      <p className="mt-1 text-[15px] text-tinta-500">
        {plural(casas.filter((c) => c.activa).length, 'casa activa', 'casas activas')} en {resumen.length} regiones · {fechaCorta(hoy, true)}
      </p>
      <div className="mt-4">
        <BannerReservaAsistida />
      </div>

      <section className="mt-6" aria-labelledby="t-alertas">
        <h2 id="t-alertas" className="text-lg font-semibold">
          Requiere atención
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Alerta icono={Wallet} cifra={pagosUrgentes.length} texto="pagos anticipados sin registrar, con llegada en 7 días" a="/central/cobros" />
          <Alerta icono={FlameKindling} cifra={extintores.length} texto="extintores vencidos o por vencer en 30 días" detalle={extintores.map((x) => x.casa.nombre).join(', ')} />
          <Alerta icono={ClipboardList} cifra={sinInventario.length} texto="casas sin inventario: no reciben acta de entrega" detalle={sinInventario.slice(0, 4).map((c) => c.nombre).join(', ') + (sinInventario.length > 4 ? '…' : '')} />
          <Alerta icono={Undo2} cifra={devoluciones.length} texto="devoluciones pendientes por anulaciones de Bienestar" a="/central/cobros" />
        </div>
      </section>

      <section className="mt-10" aria-labelledby="t-reg">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="t-reg" className="text-lg font-semibold">
            Regiones · próximos 30 días
          </h2>
          <Link to="/central/dashboard" className="text-sm font-medium text-verde-700 hover:underline">
            Ver dashboard completo
          </Link>
        </div>
        <Tarjeta className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-[15px]">
            <thead className="border-b border-borde text-[13px] text-tinta-500">
              <tr>
                <th className="px-4 py-3 font-medium">Región</th>
                <th className="px-4 py-3 text-right font-medium">Casas</th>
                <th className="w-1/3 px-4 py-3 font-medium">Ocupación</th>
                <th className="px-4 py-3 text-right font-medium">Reservas nuevas (7 días)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borde">
              {resumen.map((r) => (
                <tr key={r.codigo}>
                  <td className="px-4 py-2.5">{r.nombre}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{r.casas}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-stone-100">
                        <span className="block h-full rounded-full bg-verde-600" style={{ width: `${Math.round(r.ocupacion * 100)}%` }} />
                      </span>
                      <span className="w-10 text-right tabular-nums">{Math.round(r.ocupacion * 100)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{r.nuevas || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Tarjeta>
      </section>

    </>
  )
}

function Alerta({ icono: Icono, cifra, texto, detalle, a }) {
  const activa = cifra > 0
  const cuerpo = (
    <Tarjeta className={`h-full min-w-0 p-4 ${activa ? '' : 'opacity-70'}`}>
      <div className="flex items-start gap-3">
        <Icono className={`mt-1 size-5 shrink-0 ${activa ? 'text-alerta-700' : 'text-tinta-400'}`} aria-hidden />
        <div className="min-w-0">
          <p className="text-2xl font-bold tabular-nums">{cifra}</p>
          <p className="text-sm text-tinta-700">{texto}</p>
          {activa && detalle && <p className="mt-1 truncate text-[13px] text-tinta-500" title={detalle}>{detalle}</p>}
        </div>
      </div>
    </Tarjeta>
  )
  return a && activa ? (
    <Link to={a} className="block min-w-0 rounded-xl hover:shadow-sm">
      {cuerpo}
    </Link>
  ) : (
    cuerpo
  )
}
