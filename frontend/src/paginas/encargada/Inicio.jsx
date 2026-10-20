import { Link } from 'react-router-dom'
import { AlertTriangle, LogIn, LogOut, PawPrint, Phone } from 'lucide-react'
import { bloqueosDe, listarCasas, reservasRegion, useDatos } from '../../datos/servicio.js'
import { diaSemana, fechaCorta, hoyISO, rangoFechas, sumarDias } from '../../lib/fechas.js'
import { pesos, plural } from '../../lib/formato.js'
import { CALIDADES, estadoReserva } from '../../lib/reglas.js'
import { Tarjeta } from '../../componentes/ui.jsx'
import { useSesion } from '../../componentes/Perfil.jsx'
import { antiguedad, nombreRegion } from './comun.jsx'
import { BannerReservaAsistida } from '../gestion/ReservaAsistida.jsx'

const DIAS_FRANJA = 28

export function InicioEncargada() {
  useDatos()
  const { usuario } = useSesion()
  const hoy = hoyISO()
  const manana = sumarDias(hoy, 1)
  const casas = listarCasas().filter((c) => c.region === usuario.region)
  const reservas = reservasRegion(usuario.region)

  const nuevas = reservas
    .filter((r) => r.estado === 'confirmada' && r.creada_en.slice(0, 10) >= sumarDias(hoy, -7))
    .sort((a, b) => (a.creada_en < b.creada_en ? 1 : -1))
  const activas = reservas.filter((r) => ['confirmada', 'en_curso'].includes(estadoReserva(r)) || (r.estado === 'confirmada' && r.salida === hoy))
  const movimientos = [hoy, manana].map((dia) => ({
    dia,
    llegadas: activas.filter((r) => r.entrada === dia),
    salidas: activas.filter((r) => r.salida === dia),
  }))

  return (
    <>
      <h1 className="text-2xl font-bold">Región de {nombreRegion(usuario.region)}</h1>
      <p className="mt-1 text-[15px] text-tinta-500">
        {plural(casas.length, 'casa', 'casas')} a su cargo · {fechaCorta(hoy, true)}
      </p>
      <div className="mt-4">
        <BannerReservaAsistida />
      </div>

      {/* 1. Llegadas y salidas */}
      <section className="mt-6" aria-labelledby="t-mov">
        <h2 id="t-mov" className="text-lg font-semibold">
          Llegadas y salidas
        </h2>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          {movimientos.map((m) => (
            <Tarjeta key={m.dia} className="p-4">
              <p className="font-semibold">{m.dia === hoy ? 'Hoy' : 'Mañana'}, {fechaCorta(m.dia)}</p>
              {m.llegadas.length + m.salidas.length === 0 ? (
                <p className="mt-2 text-[15px] text-tinta-500">Sin movimientos.</p>
              ) : (
                <ul className="mt-2 divide-y divide-borde">
                  {[...m.llegadas.map((r) => ['llega', r]), ...m.salidas.map((r) => ['sale', r])].map(([tipo, r]) => (
                    <li key={tipo + r.codigo} className="flex items-start gap-3 py-2.5">
                      {tipo === 'llega' ? <LogIn className="mt-0.5 size-5 text-verde-600" aria-label="Llegada" /> : <LogOut className="mt-0.5 size-5 text-tinta-500" aria-label="Salida" />}
                      <div className="min-w-0 text-[15px]">
                        <p className="font-medium">
                          {tipo === 'llega' ? 'Llega' : 'Sale'} a {r.casa.nombre}
                          <span className="font-normal text-tinta-500"> · {tipo === 'llega' ? 'desde las 15:00' : 'hasta las 12:00'}</span>
                        </p>
                        <p className="text-tinta-700">
                          {r.titular.nombre} · {plural(r.ocupantes.length, 'persona', 'personas')}
                        </p>
                        {r.contacto?.telefono && (
                          <a href={`tel:${r.contacto.telefono.replace(/\s/g, '')}`} className="inline-flex items-center gap-1 text-sm text-verde-700 hover:underline">
                            <Phone className="size-3.5" aria-hidden /> {r.contacto.telefono}
                          </a>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Tarjeta>
          ))}
        </div>
      </section>

      {/* 2. Ocupación */}
      <section className="mt-10" aria-labelledby="t-ocu">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="t-ocu" className="text-lg font-semibold">
            Ocupación de las próximas 4 semanas
          </h2>
          <Link to="/encargada/reservas" className="text-sm font-medium text-verde-700 hover:underline">
            Ver todas las reservas
          </Link>
        </div>
        <Franja casas={casas} reservas={reservas} hoy={hoy} />
      </section>

      {/* 3. Reservas nuevas */}
      <section className="mt-10" aria-labelledby="t-nuevas">
        <h2 id="t-nuevas" className="text-lg font-semibold">
          Reservas nuevas · últimos 7 días
        </h2>
        <p className="text-sm text-tinta-500">Se confirman solas cuando hay disponibilidad; aquí solo para su conocimiento.</p>
        {nuevas.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-borde bg-white p-6 text-center text-tinta-500">No hay reservas nuevas.</p>
        ) : (
          <Tarjeta className="mt-3">
            <ul className="divide-y divide-borde">
              {nuevas.map((r) => (
                <li key={r.codigo} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3">
                  <div className="min-w-0 text-[15px]">
                    <p className="font-medium">
                      {r.casa.nombre} · {rangoFechas(r.entrada, r.salida)}
                    </p>
                    <p className="text-tinta-700">
                      {r.titular.nombre} · {CALIDADES[r.titular.calidad]} · {plural(r.ocupantes.length, 'persona', 'personas')}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-2 text-[13px]">
                      {r.titular.calidad === 'otro_servicio' && (
                        <Etiqueta tono="alerta" icono={AlertTriangle}>
                          Otro servicio público (Art. 9)
                        </Etiqueta>
                      )}
                      {r.forma_pago.anticipado && <Etiqueta>{r.pago ? 'Pago anticipado registrado' : 'Pago anticipado pendiente'}</Etiqueta>}
                      {r.perro_asistencia && <Etiqueta icono={PawPrint}>Perro de asistencia</Etiqueta>}
                    </div>
                  </div>
                  <p className="text-[13px] text-tinta-500">
                    {r.codigo} · {antiguedad(r.creada_en)} · {pesos(r.total)}
                  </p>
                </li>
              ))}
            </ul>
          </Tarjeta>
        )}
      </section>

    </>
  )
}

function Etiqueta({ tono, icono: Icono, children }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 ${tono === 'alerta' ? 'bg-alerta-50 text-alerta-700' : 'bg-stone-100 text-tinta-700'}`}>
      {Icono && <Icono className="size-3.5" aria-hidden />}
      {children}
    </span>
  )
}

/** Una fila por casa y una celda por noche: ocupada, bloqueada o libre. */
function Franja({ casas, reservas, hoy }) {
  const dias = Array.from({ length: DIAS_FRANJA }, (_, i) => sumarDias(hoy, i))
  const estadoDe = (casa, d) => {
    if (bloqueosDe(casa.id).some((b) => d >= b.entrada && d < b.salida)) return 'bloqueo'
    const r = reservas.find((x) => x.casa_id === casa.id && !['desistida', 'anulada'].includes(x.estado) && d >= x.entrada && d < x.salida)
    if (!r) return null
    return 'ocupada'
  }
  const CLASE = { ocupada: 'bg-verde-600', bloqueo: 'bg-[repeating-linear-gradient(45deg,#a8a29e_0_3px,#e7e5e4_3px_6px)]' }
  const TEXTO = { ocupada: 'ocupada', bloqueo: 'bloqueada' }

  return (
    <Tarjeta className="mt-3 overflow-x-auto p-4">
      <table className="w-full min-w-[760px] table-fixed border-separate border-spacing-y-1.5 text-[13px]">
        <colgroup>
          <col className="w-44" />
          {dias.map((d) => (
            <col key={d} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th className="text-left font-medium text-tinta-500">Casa</th>
            {dias.map((d) => (
              <th key={d} className={`px-px text-center font-normal tabular-nums ${diaSemana(d) >= 5 ? 'text-tinta-900' : 'text-tinta-400'}`}>
                {Number(d.slice(8, 10))}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {casas.map((c) => (
            <tr key={c.id}>
              <th scope="row" className="truncate pr-3 text-left text-[14px] font-medium text-tinta-900">
                {c.nombre}
              </th>
              {dias.map((d) => {
                const e = estadoDe(c, d)
                return (
                  <td key={d} className="px-px" title={`${c.nombre}, ${fechaCorta(d)}: ${e ? TEXTO[e] : 'libre'}`}>
                    <span className={`block h-6 rounded-sm ${e ? CLASE[e] : 'bg-stone-100'}`} />
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-tinta-500">
        <li className="flex items-center gap-2"><span className="size-3.5 rounded-sm bg-verde-600" /> Ocupada</li>
        <li className="flex items-center gap-2"><span className={`size-3.5 rounded-sm ${CLASE.bloqueo}`} /> Bloqueada por mantención</li>
        <li className="flex items-center gap-2"><span className="size-3.5 rounded-sm bg-stone-100" /> Libre</li>
      </ul>
    </Tarjeta>
  )
}
