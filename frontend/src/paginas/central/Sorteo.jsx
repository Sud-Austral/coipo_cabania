import { useState } from 'react'
import { Dices, Download, ShieldCheck } from 'lucide-react'
import { demanda, desistirReserva, listarCasas, obtenerReserva, postulaciones, realizarSorteo, sorteoVigente, turnosVacantes, useDatos, vencerOferta } from '../../datos/servicio.js'
import { fechaCorta, fechaLarga, rangoFechas } from '../../lib/fechas.js'
import { plural } from '../../lib/formato.js'
import { CALIDADES } from '../../lib/reglas.js'
import { HORAS_OFERTA } from '../../lib/sorteo.js'
import { descargarCSV } from '../../lib/csv.js'
import { EstadoPostulacion, salidaTurno } from '../../componentes/Postulacion.jsx'
import { Indicador, Panel } from '../../componentes/graficos.jsx'
import { Aviso, Boton, claseFiltro } from '../../componentes/ui.jsx'
import { useSesion } from '../../componentes/Perfil.jsx'
import { Dialogo, nombreRegion } from '../encargada/comun.jsx'

const fechaHora = (iso) => `${fechaCorta(iso.slice(0, 10), true)}, ${iso.slice(11, 16)}`

export function SorteoCentral() {
  useDatos()
  const s = sorteoVigente()
  if (!s) return <p>No hay un sorteo configurado.</p>
  const lista = postulaciones().filter((p) => p.estado !== 'retirada')
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Sorteo · {s.nombre}</h1>
        <span className={`rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${s.estado === 'sorteado' ? 'bg-verde-100 text-verde-800' : 'bg-sky-100 text-sky-800'}`}>
          {s.estado === 'sorteado' ? 'Sorteo realizado' : 'Postulación abierta'}
        </span>
      </div>
      <p className="mt-1 max-w-3xl text-[15px] text-tinta-500">
        {s.turnos.length} turnos de sábado a sábado ({rangoFechas(s.turnos[0].entrada, s.turnos[s.turnos.length - 1].salida)}) en {plural(listarCasas().length, 'casa', 'casas')}. Postulación del{' '}
        {fechaCorta(s.postulacion.desde)} al {fechaCorta(s.postulacion.hasta, true)}. Prioridad para quien no tuvo casa en {s.anterior.nombre.toLowerCase()} (Art. 6 a).
      </p>
      {s.estado === 'sorteado' ? <Resultados sorteo={s} lista={lista} /> : <Postulacion sorteo={s} lista={lista} />}
    </>
  )
}

/* ---------- Antes del sorteo ---------- */

function Postulacion({ sorteo: s, lista }) {
  const { usuario } = useSesion()
  const [confirmar, setConfirmar] = useState(false)
  const casas = listarCasas()
  const dem = demanda()
  const conPrioridad = lista.filter((p) => p.prioridad).length
  const ofrecidos = casas.length * s.turnos.length
  const conDemanda = Object.keys(dem).length

  const filas = casas
    .map((c) => ({ casa: c, valores: s.turnos.map((t) => dem[`${c.id}|${t.entrada}`] ?? 0) }))
    .map((f) => ({ ...f, total: f.valores.reduce((a, b) => a + b, 0) }))
    .sort((a, b) => b.total - a.total)
  const max = Math.max(1, ...filas.flatMap((f) => f.valores))

  return (
    <>
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador etiqueta="Postulaciones" valor={lista.length} detalle={`${conPrioridad} con prioridad`} />
        <Indicador etiqueta="Turnos ofrecidos" valor={ofrecidos} detalle={`${s.turnos.length} turnos × ${casas.length} casas`} />
        <Indicador etiqueta="Turnos con postulantes" valor={conDemanda} detalle={`${ofrecidos - conDemanda} sin postulantes por ahora`} />
        <Indicador etiqueta="Postulantes por cupo" valor={(lista.length / Math.max(1, conDemanda)).toLocaleString('es-CL', { maximumFractionDigits: 1 })} detalle="En los turnos con demanda" />
      </div>

      <div className="mt-5 rounded-xl border border-borde bg-white p-4 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-5">
        <div>
          <h2 className="font-semibold">Realizar el sorteo</h2>
          <p className="mt-1 text-[15px] text-tinta-500">
            La postulación cierra el {fechaLarga(s.postulacion.hasta)} y el sorteo se realiza ese día. En la maqueta puede adelantarlo para ver los resultados.
          </p>
        </div>
        <Boton className="mt-3 shrink-0 sm:mt-0" onClick={() => setConfirmar(true)}>
          <Dices className="size-4" aria-hidden /> Realizar sorteo
        </Boton>
      </div>

      <div className="mt-5">
        <Panel titulo="Postulantes por casa y turno" subtitulo="Cada celda indica cuántas personas postularon a ese turno. Más intenso = más demanda.">
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[640px] text-[13px]">
              <thead>
                <tr className="text-left text-tinta-500">
                  <th className="py-2 pr-3 font-medium">Casa</th>
                  {s.turnos.map((t) => (
                    <th key={t.entrada} className="px-1 py-2 text-center font-medium">
                      {fechaCorta(t.entrada)}
                    </th>
                  ))}
                  <th className="py-2 pl-3 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.casa.id} className="border-t border-borde">
                    <td className="py-1.5 pr-3">
                      <span className="block font-medium text-tinta-900">{f.casa.nombre}</span>
                      <span className="text-tinta-500">{nombreRegion(f.casa.region)}</span>
                    </td>
                    {f.valores.map((v, i) => (
                      <td key={i} className="px-1 py-1.5 text-center">
                        <span
                          className={`grid h-8 place-items-center rounded tabular-nums ${v ? 'font-semibold' : 'text-tinta-400'} ${v / max > 0.6 ? 'text-white' : 'text-tinta-900'}`}
                          style={{ background: v ? `color-mix(in srgb, var(--color-verde-700) ${Math.round(15 + (v / max) * 85)}%, white)` : '#f5f5f4' }}
                          title={`${f.casa.nombre}, turno del ${fechaCorta(s.turnos[i].entrada)}: ${plural(v, 'postulante', 'postulantes')}`}
                        >
                          {v || '·'}
                        </span>
                      </td>
                    ))}
                    <td className="py-1.5 pl-3 text-right font-semibold tabular-nums">{f.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <div className="mt-5">
        <TablaPostulaciones lista={lista} titulo="Postulaciones recibidas" />
      </div>

      {confirmar && (
        <Dialogo titulo="¿Realizar el sorteo ahora?" onCerrar={() => setConfirmar(false)}>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] text-tinta-700">
            <li>Se cierra la postulación: nadie más podrá postular ni retirarse.</li>
            <li>En cada casa y turno se ordena al azar a los postulantes; quienes tienen prioridad quedan primero (Art. 6 a).</li>
            <li>La primera persona se adjudica el turno y su reserva queda confirmada. El resto queda en lista de espera, en ese orden (Art. 6 d).</li>
            <li>Se avisa el resultado por correo a cada postulante (Art. 6 c). Los turnos sin postulantes quedan vacantes para reserva directa.</li>
            <li>Se registra la semilla del sorteo para poder reproducir y auditar el resultado.</li>
          </ul>
          <p className="mt-3 text-[15px] font-medium">{plural(lista.length, 'postulación', 'postulaciones')} participan.</p>
          <div className="mt-6 flex justify-end gap-3">
            <Boton variante="secundario" onClick={() => setConfirmar(false)}>
              Volver
            </Boton>
            <Boton
              onClick={() => {
                realizarSorteo(usuario)
                setConfirmar(false)
                window.scrollTo({ top: 0 })
              }}
            >
              Sí, realizar sorteo
            </Boton>
          </div>
        </Dialogo>
      )}
    </>
  )
}

/* ---------- Después del sorteo ---------- */

function Resultados({ sorteo: s, lista }) {
  const [pestana, setPestana] = useState('adjudicados')
  const adjudicados = lista.filter((p) => p.estado === 'adjudicada')
  const espera = lista.filter((p) => ['espera', 'ofertada'].includes(p.estado))
  const ofertas = lista.filter((p) => p.oferta)
  const otros = lista.filter((p) => ['excluida', 'sin_cupo'].includes(p.estado))
  const vacantes = turnosVacantes()

  function exportar() {
    descargarCSV(
      `sorteo-${s.id}-resultados.csv`,
      ['Postulación', 'RUT', 'Nombre', 'Calidad', 'Región postulante', 'Casa', 'Turno', 'Prioridad', 'Resultado', 'Lugar en espera', 'Reserva'],
      lista.map((p) => [p.codigo, p.titular.rut, p.titular.nombre, CALIDADES[p.titular.calidad], nombreRegion(p.titular.region), p.casa.nombre, rangoFechas(p.turno, salidaTurno(p.turno)), p.prioridad ? 'Sí' : 'No', p.estado, p.posicion ?? '', p.reserva ?? '']),
    )
  }

  return (
    <>
      <div className="mt-4 flex flex-col gap-3 rounded-xl border border-verde-200 bg-verde-50 p-4 text-[15px] text-verde-800 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 size-5 shrink-0" aria-hidden />
          <span>
            Sorteo realizado el {fechaHora(s.sorteado_en)} por {s.sorteado_por}. Semilla <strong className="tabular-nums">{s.semilla}</strong>: con ella y la lista de postulaciones se reproduce el mismo resultado. Se avisó a cada postulante por correo.
          </span>
        </p>
        <Boton variante="secundario" className="shrink-0" onClick={exportar}>
          <Download className="size-4" aria-hidden /> Resultados (CSV)
        </Boton>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador etiqueta="Adjudicadas" valor={adjudicados.length} detalle={`${adjudicados.filter((p) => p.prioridad).length} con prioridad`} />
        <Indicador etiqueta="En lista de espera" valor={espera.length} detalle={`${ofertas.filter((p) => p.estado === 'ofertada').length} con oferta vigente`} />
        <Indicador etiqueta="Turnos vacantes" valor={vacantes.length} detalle="Abiertos a reserva directa" />
        <Indicador etiqueta="Sin cupo o sin posibilidad" valor={otros.length} detalle="Rechazaron, vencieron o Art. 10 d" />
      </div>

      <div className="mt-6 flex gap-1 overflow-x-auto border-b border-borde" role="tablist">
        {[
          ['adjudicados', `Adjudicados (${adjudicados.length})`],
          ['espera', `Lista de espera (${espera.length})`],
          ['vacantes', `Vacantes (${vacantes.length})`],
        ].map(([k, t]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={pestana === k}
            onClick={() => setPestana(k)}
            className={`-mb-px shrink-0 border-b-2 px-3 py-2.5 text-[15px] font-medium ${pestana === k ? 'border-verde-700 text-verde-800' : 'border-transparent text-tinta-500 hover:text-tinta-900'}`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="mt-5">
        {pestana === 'adjudicados' && <Adjudicados lista={adjudicados} />}
        {pestana === 'espera' && <Espera lista={espera} />}
        {pestana === 'vacantes' && <Vacantes lista={vacantes} />}
      </div>
    </>
  )
}

function Adjudicados({ lista }) {
  const [desistir, setDesistir] = useState(null)
  const [region, setRegion] = useState('')
  const [todos, setTodos] = useState(false)
  const filtrados = lista.filter((p) => !region || p.casa.region === region).sort((a, b) => (a.casa.nombre + a.turno < b.casa.nombre + b.turno ? -1 : 1))
  const visibles = todos ? filtrados : filtrados.slice(0, 15)
  const regiones = [...new Set(lista.map((p) => p.casa.region))].sort()
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[15px] text-tinta-500">Reservas confirmadas por el sorteo. Si alguien avisa por escrito que desiste, regístrelo aquí: el cupo se ofrece a la lista de espera.</p>
        <select className={claseFiltro} value={region} onChange={(e) => setRegion(e.target.value)} aria-label="Región de la casa">
          <option value="">Todas las regiones</option>
          {regiones.map((r) => (
            <option key={r} value={r}>
              {nombreRegion(r)}
            </option>
          ))}
        </select>
      </div>
      <ul className="divide-y divide-borde rounded-xl border border-borde bg-white">
        {visibles.map((p) => {
          const r = obtenerReserva(p.reserva)
          const desistida = r?.estado === 'desistida'
          return (
            <li key={p.codigo} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {p.casa.nombre} · {rangoFechas(p.turno, salidaTurno(p.turno))}
                </p>
                <p className="text-[13px] text-tinta-500">
                  {p.titular.nombre} · {CALIDADES[p.titular.calidad]} · {p.prioridad ? 'con prioridad' : 'sin prioridad'} · {p.reserva}
                  {p.oferta?.resultado === 'aceptada' ? ' · desde la lista de espera' : ''}
                </p>
              </div>
              {desistida ? (
                <span className="text-[13px] font-medium text-tinta-500">Desistió el {fechaCorta(r.desistida_en)}</span>
              ) : (
                <Boton variante="textoPeligro" onClick={() => setDesistir(p)}>
                  Registrar desistimiento
                </Boton>
              )}
            </li>
          )
        })}
      </ul>
      {filtrados.length > 15 && (
        <button type="button" onClick={() => setTodos(!todos)} className="mt-3 text-[15px] font-medium text-verde-700 hover:underline">
          {todos ? 'Ver menos' : `Ver los ${filtrados.length} adjudicados`}
        </button>
      )}
      {desistir && (
        <Dialogo titulo="Registrar desistimiento" onCerrar={() => setDesistir(null)}>
          <p className="mt-2 text-[15px] text-tinta-700">
            {desistir.titular.nombre} avisa que no usará {desistir.casa.nombre} del {rangoFechas(desistir.turno, salidaTurno(desistir.turno))}. Se aplica el cargo del Art. 10 si corresponde y el turno se ofrece a la
            siguiente persona de la lista de espera, que tendrá {HORAS_OFERTA} horas para aceptar.
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <Boton variante="secundario" onClick={() => setDesistir(null)}>
              Volver
            </Boton>
            <Boton
              variante="peligro"
              onClick={() => {
                desistirReserva(desistir.reserva)
                setDesistir(null)
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

function Espera({ lista }) {
  const grupos = Object.values(
    lista.reduce((m, p) => {
      ;(m[`${p.casa_id}|${p.turno}`] ??= { casa: p.casa, turno: p.turno, personas: [] }).personas.push(p)
      return m
    }, {}),
  ).sort((a, b) => (a.personas.some((p) => p.estado === 'ofertada') ? -1 : b.personas.some((p) => p.estado === 'ofertada') ? 1 : b.personas.length - a.personas.length))

  if (!grupos.length) return <p className="text-[15px] text-tinta-500">No hay personas en lista de espera.</p>
  return (
    <>
      <p className="mb-3 text-[15px] text-tinta-500">
        Por cada turno, en el orden del sorteo. Cuando alguien desiste, el sistema ofrece el cupo por correo a la primera persona, que tiene {HORAS_OFERTA} horas para aceptar; si no responde, pasa a la siguiente.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {grupos.map((g) => (
          <section key={`${g.casa.id}|${g.turno}`} className="rounded-xl border border-borde bg-white p-4">
            <h3 className="font-semibold">
              {g.casa.nombre} · {rangoFechas(g.turno, salidaTurno(g.turno))}
            </h3>
            <ol className="mt-2 space-y-2">
              {g.personas
                .sort((a, b) => a.posicion - b.posicion)
                .map((p) => (
                  <li key={p.codigo} className="flex flex-wrap items-center gap-2 text-[15px]">
                    <span className="w-6 text-right font-semibold tabular-nums text-tinta-500">{p.posicion}.</span>
                    <span className="min-w-0 flex-1">{p.titular.nombre}</span>
                    {p.estado === 'ofertada' ? (
                      <>
                        <EstadoPostulacion estado="ofertada" />
                        <span className="basis-full pl-8 text-[13px] text-tinta-500">
                          Oferta enviada el {fechaHora(p.oferta.enviada_en)}; vence el {fechaHora(p.oferta.vence_en)}.{' '}
                          <button type="button" onClick={() => vencerOferta(p.codigo)} className="font-medium text-verde-700 hover:underline">
                            Simular plazo vencido
                          </button>
                        </span>
                      </>
                    ) : (
                      p.prioridad && <span className="text-[13px] text-tinta-500">con prioridad</span>
                    )}
                  </li>
                ))}
            </ol>
          </section>
        ))}
      </div>
    </>
  )
}

function Vacantes({ lista }) {
  if (!lista.length) return <p className="text-[15px] text-tinta-500">Todos los turnos quedaron adjudicados o con lista de espera.</p>
  const porCasa = Object.values(
    lista.reduce((m, v) => {
      ;(m[v.casa.id] ??= { casa: v.casa, turnos: [] }).turnos.push(v)
      return m
    }, {}),
  ).sort((a, b) => b.turnos.length - a.turnos.length)
  return (
    <>
      <Aviso tipo="info">
        Turnos sin postulantes. Quedaron abiertos a reserva directa en el buscador, con las reglas habituales: también los pueden tomar funcionarios de otros servicios públicos dentro de su plazo (Art. 9).
      </Aviso>
      <ul className="mt-3 divide-y divide-borde rounded-xl border border-borde bg-white">
        {porCasa.map(({ casa, turnos }) => (
          <li key={casa.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
            <div className="sm:w-56">
              <p className="font-medium">{casa.nombre}</p>
              <p className="text-[13px] text-tinta-500">{nombreRegion(casa.region)}</p>
            </div>
            <div className="flex flex-1 flex-wrap gap-1.5">
              {turnos.map((t) => (
                <span key={t.entrada} className="rounded-md bg-stone-100 px-2 py-1 text-[13px] text-tinta-700">
                  {rangoFechas(t.entrada, t.salida)}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}

function TablaPostulaciones({ lista, titulo }) {
  const [verTodas, setVerTodas] = useState(false)
  const ordenadas = [...lista].sort((a, b) => (a.creada_en < b.creada_en ? 1 : -1))
  const visibles = verTodas ? ordenadas : ordenadas.slice(0, 12)
  return (
    <Panel
      titulo={titulo}
      subtitulo="Las más recientes primero."
      accion={
        <Boton
          variante="secundario"
          onClick={() =>
            descargarCSV(
              'sorteo-postulaciones.csv',
              ['Postulación', 'Fecha', 'RUT', 'Nombre', 'Calidad', 'Casa', 'Turno', 'Personas', 'Prioridad', 'Forma de pago'],
              ordenadas.map((p) => [p.codigo, p.creada_en.replace('T', ' '), p.titular.rut, p.titular.nombre, CALIDADES[p.titular.calidad], p.casa.nombre, rangoFechas(p.turno, salidaTurno(p.turno)), p.personas, p.prioridad ? 'Sí' : 'No', p.forma_pago.tipo]),
            )
          }
        >
          <Download className="size-4" aria-hidden /> CSV
        </Boton>
      }
    >
      <ul className="divide-y divide-borde">
        {visibles.map((p) => (
          <li key={p.codigo} className="flex flex-col gap-0.5 py-2 sm:flex-row sm:items-center sm:gap-4">
            <span className="w-28 shrink-0 text-[13px] tabular-nums text-tinta-500">{p.codigo}</span>
            <span className="min-w-0 flex-1 text-[15px]">
              {p.titular.nombre} <span className="text-tinta-500">· {CALIDADES[p.titular.calidad]}</span>
            </span>
            <span className="text-[15px] sm:w-72">
              {p.casa.nombre} · {rangoFechas(p.turno, salidaTurno(p.turno))}
            </span>
            <span className="w-28 text-[13px] text-tinta-500">{p.prioridad ? 'Con prioridad' : 'Sin prioridad'}</span>
          </li>
        ))}
      </ul>
      {ordenadas.length > 12 && (
        <button type="button" onClick={() => setVerTodas(!verTodas)} className="mt-3 text-[15px] font-medium text-verde-700 hover:underline">
          {verTodas ? 'Ver menos' : `Ver las ${ordenadas.length} postulaciones`}
        </button>
      )}
    </Panel>
  )
}
