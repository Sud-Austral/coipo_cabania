import { useState } from 'react'
import { FileDown, Search } from 'lucide-react'
import { listarCasas, reservasRegion, useDatos } from '../../datos/servicio.js'
import { fechaCorta, rangoFechas } from '../../lib/fechas.js'
import { pesos, plural } from '../../lib/formato.js'
import { CALIDADES, ESTADOS, PARENTESCOS, estadoReserva } from '../../lib/reglas.js'
import { Boton, Estado, Tarjeta, claseEntrada } from '../../componentes/ui.jsx'
import { useSesion } from '../../componentes/Perfil.jsx'
import { Dialogo, antiguedad } from './comun.jsx'

const FILTROS = ['todas', 'confirmada', 'en_curso', 'finalizada', 'desistida', 'anulada']
const PAGO = { planilla: 'Planilla', transferencia: 'Transferencia' }
const NOTIF = { confirmacion: 'el comprobante de reserva', pago: 'el registro del pago', anulacion: 'aviso de anulación por Bienestar', devolucion: 'aviso de devolución' }

async function descargar(reserva, numero) {
  const { descargarActa } = await import('../../lib/acta.js')
  await descargarActa(reserva, reserva.actas.find((a) => a.numero === numero))
}

export function ReservasEncargada() {
  useDatos()
  const { usuario } = useSesion()
  const [filtro, setFiltro] = useState('todas')
  const [casa, setCasa] = useState('')
  const [texto, setTexto] = useState('')
  const [abierta, setAbierta] = useState(null)

  const casas = listarCasas().filter((c) => c.region === usuario.region)
  const todas = reservasRegion(usuario.region)
    .map((r) => ({ ...r, visible: estadoReserva(r) }))
    .sort((a, b) => (a.entrada < b.entrada ? 1 : -1))
  const cuenta = (f) => (f === 'todas' ? todas.length : todas.filter((r) => r.visible === f).length)
  const q = texto.trim().toLowerCase()
  const lista = todas
    .filter((r) => filtro === 'todas' || r.visible === filtro)
    .filter((r) => !casa || r.casa_id === Number(casa))
    .filter((r) => !q || r.codigo.toLowerCase().includes(q) || r.titular.nombre.toLowerCase().includes(q) || r.titular.rut.includes(q))

  const detalle = abierta ? todas.find((r) => r.codigo === abierta) : null

  return (
    <>
      <h1 className="text-2xl font-bold">Reservas de la región</h1>

      <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Filtrar por estado">
        {FILTROS.map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={filtro === f}
            onClick={() => setFiltro(f)}
            className={`rounded-full px-3 py-1.5 text-sm ring-1 ring-inset ${filtro === f ? 'bg-verde-700 font-semibold text-white ring-verde-700' : 'bg-white text-tinta-700 ring-borde hover:bg-stone-50'}`}
          >
            {f === 'todas' ? 'Todas' : ESTADOS[f].etiqueta} <span className="opacity-70">{cuenta(f)}</span>
          </button>
        ))}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_260px]">
        <label className="relative block">
          <span className="sr-only">Buscar</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-tinta-400" aria-hidden />
          <input className={`${claseEntrada} pl-9`} placeholder="Buscar por nombre, RUT o código" value={texto} onChange={(e) => setTexto(e.target.value)} />
        </label>
        <select className={claseEntrada} value={casa} onChange={(e) => setCasa(e.target.value)} aria-label="Casa">
          <option value="">Todas las casas</option>
          {casas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </div>

      <Tarjeta className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-[15px]">
          <thead className="border-b border-borde text-[13px] text-tinta-500">
            <tr>
              <th className="px-4 py-3 font-medium">Fechas</th>
              <th className="px-4 py-3 font-medium">Casa</th>
              <th className="px-4 py-3 font-medium">Usuario/a responsable</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-borde">
            {lista.map((r) => (
              <tr key={r.codigo} className="cursor-pointer hover:bg-stone-50" onClick={() => setAbierta(r.codigo)}>
                <td className="whitespace-nowrap px-4 py-3">
                  <button type="button" className="text-left font-medium text-verde-800 hover:underline" onClick={() => setAbierta(r.codigo)}>
                    {rangoFechas(r.entrada, r.salida)}
                  </button>
                  <span className="block text-[13px] text-tinta-500">{r.codigo}</span>
                </td>
                <td className="px-4 py-3">{r.casa.nombre}</td>
                <td className="px-4 py-3">
                  {r.titular.nombre}
                  <span className="block text-[13px] text-tinta-500">{CALIDADES[r.titular.calidad]}</span>
                </td>
                <td className="px-4 py-3">
                  <Estado estado={r.visible} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{pesos(r.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {lista.length === 0 && <p className="p-6 text-center text-tinta-500">No hay reservas con esos filtros.</p>}
      </Tarjeta>
      <p className="mt-2 text-[13px] text-tinta-500">{plural(lista.length, 'reserva', 'reservas')}</p>

      {detalle && (
        <Dialogo titulo={`${detalle.codigo} · ${detalle.casa.nombre}`} onCerrar={() => setAbierta(null)}>
          <div className="mt-2">
            <Estado estado={detalle.visible} />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-[15px]">
            <D t="Fechas" v={rangoFechas(detalle.entrada, detalle.salida)} />
            <D t="Total" v={`${pesos(detalle.total)} · ${PAGO[detalle.forma_pago.tipo]}${detalle.forma_pago.cuotas > 1 ? ` (${detalle.forma_pago.cuotas} cuotas)` : ''}`} />
            <D t="Usuario/a responsable" v={`${detalle.titular.nombre}, ${detalle.titular.rut}`} />
            <D t="Calidad" v={`${CALIDADES[detalle.titular.calidad]} · ${detalle.titular.rol}`} />
            <D t="Teléfono" v={detalle.contacto?.telefono ?? '—'} />
            <D t="Correo" v={detalle.contacto?.correo ?? '—'} />
          </dl>
          <p className="mt-4 text-[13px] font-medium text-tinta-500">Personas ({detalle.ocupantes.length})</p>
          <ul className="mt-1 text-[15px]">
            {detalle.ocupantes.map((o, i) => (
              <li key={i}>
                {o.nombre}
                <span className="text-tinta-500">
                  {' '}
                  · {o.parentesco === 'titular' ? 'responsable' : (PARENTESCOS.find((p) => p.valor === o.parentesco)?.etiqueta ?? o.parentesco).toLowerCase()}
                  {o.edad != null ? `, ${o.edad} años` : ''}
                </span>
              </li>
            ))}
          </ul>
          {detalle.registrada_por && (
            <p className="mt-2 text-[15px]">
              Registrada por {detalle.registrada_por.nombre} a pedido de la persona.{detalle.aceptacion_pendiente ? ' Falta que acepte el reglamento por correo.' : ' La persona ya aceptó el reglamento.'}
            </p>
          )}
          {detalle.titular_viaja === false && <p className="mt-2 text-[15px]">El usuario/a responsable no viaja. A cargo en la casa: <strong>{detalle.a_cargo}</strong>.</p>}
          {detalle.perro_asistencia && (
            <p className="mt-2 text-[15px]">
              Lleva perro de asistencia.
              {detalle.perro_asistencia.credencial && ` Adjuntó credencial (${detalle.perro_asistencia.credencial}) y certificado sanitario (${detalle.perro_asistencia.certificado_sanitario}).`}
            </p>
          )}
          {detalle.motivo_anulacion && <p className="mt-3 rounded-lg bg-error-50 px-3 py-2 text-[15px] text-error-700">{detalle.motivo_anulacion}</p>}

          <p className="mt-4 text-[13px] font-medium text-tinta-500">Historial</p>
          <ul className="mt-1 space-y-0.5 text-sm text-tinta-700">
            <li>Reservada {antiguedad(detalle.creada_en)} · {detalle.confirmada_por ?? 'confirmada'}</li>
            {(detalle.notificaciones ?? []).map((n, i) =>
              n.tipo === 'acta' ? (
                <li key={i} className="flex flex-wrap items-center gap-x-2">
                  <span>{fechaCorta(n.en.slice(0, 10), true)}: se envió el acta de entrega a {detalle.contacto?.correo ?? 'su correo'}</span>
                  <button
                    type="button"
                    onClick={() => descargar(detalle, n.acta)}
                    className="inline-flex items-center gap-1 rounded px-1 font-medium text-verde-700 hover:bg-verde-50 hover:underline"
                  >
                    <FileDown className="size-4" aria-hidden /> {n.acta}.pdf
                  </button>
                </li>
              ) : (
                <li key={i}>
                  {fechaCorta(n.en.slice(0, 10), true)}: se envió {NOTIF[n.tipo] ?? n.tipo}
                </li>
              ),
            )}
          </ul>

          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <Boton variante="secundario" onClick={() => setAbierta(null)}>
              Cerrar
            </Boton>
          </div>
        </Dialogo>
      )}

    </>
  )
}

function D({ t, v }) {
  return (
    <div className="min-w-0">
      <dt className="text-[13px] text-tinta-500">{t}</dt>
      <dd className="break-words">{v}</dd>
    </div>
  )
}
