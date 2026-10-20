import { useState } from 'react'
import { AlertTriangle, CheckCircle2, Lock, Trash2 } from 'lucide-react'
import { REGIONES } from '../../datos/casas.js'
import {
  actualizarCasa,
  actualizarTarifasDiferenciadas,
  crearBloqueo,
  eliminarBloqueo,
  inventarioDe,
  listarBloqueos,
  listarCasas,
  obtenerCasa,
  reservasAfectadas,
  tarifasDiferenciadas,
  useDatos,
} from '../../datos/servicio.js'
import { hoyISO, rangoFechas, sumarDias } from '../../lib/fechas.js'
import { pesos, plural } from '../../lib/formato.js'
import { Aviso, Boton, Campo, Tarjeta, claseEntrada, claseFiltro } from '../../componentes/ui.jsx'
import { useSesion } from '../../componentes/Perfil.jsx'
import { Dialogo, nombreRegion } from '../encargada/comun.jsx'

export function CasasTarifas() {
  useDatos()
  const [region, setRegion] = useState('')
  const casas = listarCasas({ incluirInactivas: true }).filter((c) => !region || c.region === region)

  return (
    <>
      <h1 className="text-2xl font-bold">Casas y tarifas</h1>
      <p className="mt-1 max-w-3xl text-[15px] text-tinta-500">
        Tarifas por noche y por casa, vigentes del 1 de enero al 31 de diciembre según la resolución anual (Art. 19). Los cambios rigen para las solicitudes nuevas; las reservas ya hechas mantienen su tarifa.
      </p>

      <TarifasDiferenciadas />

      <section className="mt-8" aria-labelledby="t-casas">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="t-casas" className="text-lg font-semibold">
            {plural(casas.length, 'casa', 'casas')}
          </h2>
          <select className={claseFiltro} value={region} onChange={(e) => setRegion(e.target.value)} aria-label="Región">
            <option value="">Todas las regiones</option>
            {REGIONES.filter((r) => listarCasas({ incluirInactivas: true }).some((c) => c.region === r.codigo)).map((r) => (
              <option key={r.codigo} value={r.codigo}>
                {r.nombre}
              </option>
            ))}
          </select>
        </div>
        <Tarjeta className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-[15px]">
            <thead className="border-b border-borde text-[13px] text-tinta-500">
              <tr>
                <th className="px-4 py-3 font-medium">Casa</th>
                <th className="px-4 py-3 text-right font-medium">Capacidad</th>
                <th className="px-4 py-3 font-medium">Tarifa afiliado / noche</th>
                <th className="px-4 py-3 font-medium">Inventario</th>
                <th className="px-4 py-3 font-medium">Disponible para reservar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borde">
              {casas.map((c) => (
                <FilaCasa key={c.id} casa={c} />
              ))}
            </tbody>
          </table>
        </Tarjeta>
      </section>

      <Bloqueos />
    </>
  )
}

function TarifasDiferenciadas() {
  const actual = tarifasDiferenciadas()
  const [v, setV] = useState({ no_afiliado: actual.no_afiliado, otro_servicio: actual.otro_servicio })
  const [ok, setOk] = useState(false)
  const cambiado = Number(v.no_afiliado) !== actual.no_afiliado || Number(v.otro_servicio) !== actual.otro_servicio
  return (
    <Tarjeta className="mt-5 p-5">
      <h2 className="font-semibold">Tarifa diferenciada</h2>
      <p className="mt-1 text-sm text-tinta-500">Adicional por noche sobre la tarifa de afiliado. Afiliados activos y jubilados pagan la tarifa base.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Campo etiqueta="Trabajador/a CONAF no afiliado/a">
          <EntradaPesos value={v.no_afiliado} onChange={(x) => (setV({ ...v, no_afiliado: x }), setOk(false))} />
        </Campo>
        <Campo etiqueta="Funcionario/a de otro servicio público (Art. 9)">
          <EntradaPesos value={v.otro_servicio} onChange={(x) => (setV({ ...v, otro_servicio: x }), setOk(false))} />
        </Campo>
        <Boton
          disabled={!cambiado}
          onClick={() => {
            actualizarTarifasDiferenciadas(v)
            setOk(true)
          }}
        >
          Guardar
        </Boton>
      </div>
      {ok && <p className="mt-2 text-sm text-verde-700">Tarifa diferenciada actualizada.</p>}
    </Tarjeta>
  )
}

function EntradaPesos({ value, onChange }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tinta-400">$</span>
      <input className={`${claseEntrada} pl-7 tabular-nums`} type="number" min="0" step="1000" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

function FilaCasa({ casa }) {
  const [tarifa, setTarifa] = useState(casa.tarifa_noche)
  const inv = inventarioDe(casa.id)
  const cambiada = Number(tarifa) !== casa.tarifa_noche
  return (
    <tr className={casa.activa ? '' : 'bg-stone-50 text-tinta-500'}>
      <td className="px-4 py-2.5">
        <span className="font-medium">{casa.nombre}</span>
        <span className="block text-[13px] text-tinta-500">
          {casa.localidad}, {nombreRegion(casa.region)}
        </span>
      </td>
      <td className="px-4 py-2.5 text-right tabular-nums">{casa.capacidad}</td>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="w-36">
            <EntradaPesos value={tarifa} onChange={setTarifa} />
          </div>
          {cambiada && (
            <Boton className="!min-h-10 !px-3" onClick={() => actualizarCasa(casa.id, { tarifa_noche: tarifa })}>
              Guardar
            </Boton>
          )}
        </div>
      </td>
      <td className="px-4 py-2.5 text-sm">
        {inv ? (
          <span className="inline-flex items-center gap-1 text-tinta-700">
            <CheckCircle2 className="size-4 text-verde-600" aria-hidden /> Versión {inv.version}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-alerta-700">
            <AlertTriangle className="size-4" aria-hidden /> Pendiente
          </span>
        )}
      </td>
      <td className="px-4 py-2.5">
        <label className="relative inline-flex cursor-pointer items-center gap-2">
          <input type="checkbox" className="peer sr-only" checked={casa.activa} onChange={(e) => actualizarCasa(casa.id, { activa: e.target.checked })} />
          <span className="relative h-6 w-11 rounded-full bg-stone-300 transition-colors after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-white after:transition-transform peer-checked:bg-verde-600 peer-checked:after:translate-x-5 peer-focus-visible:outline peer-focus-visible:outline-3 peer-focus-visible:outline-verde-500" />
          <span className="text-sm">{casa.activa ? 'Sí' : 'No'}</span>
        </label>
      </td>
    </tr>
  )
}

function Bloqueos() {
  const { usuario } = useSesion()
  const hoy = hoyISO()
  const casas = listarCasas({ incluirInactivas: true })
  const [f, setF] = useState({ casa_id: '', entrada: '', salida: '', motivo: '' })
  const [revisar, setRevisar] = useState(false)
  const [hecho, setHecho] = useState(null)
  const bloqueos = listarBloqueos().filter((b) => b.salida >= hoy)
  const valido = f.casa_id && f.entrada && f.salida > f.entrada && f.entrada > hoy && f.motivo.trim().length >= 5
  const afectadas = valido ? reservasAfectadas(Number(f.casa_id), f.entrada, f.salida) : []

  return (
    <section className="mt-10" aria-labelledby="t-bloq">
      <h2 id="t-bloq" className="text-lg font-semibold">
        Bloqueos por mantención o fuerza mayor
      </h2>
      <p className="mt-1 max-w-3xl text-sm text-tinta-500">
        Las fechas bloqueadas no se pueden solicitar. Si hay reservas en esas fechas, se anulan, se avisa a cada persona con el motivo y se registra la devolución de lo pagado (Art. 11).
      </p>
      {hecho && (
        <div className="mt-3">
          <Aviso tipo="info">{hecho}</Aviso>
        </div>
      )}

      <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_380px]">
        <Tarjeta className="overflow-hidden">
          {bloqueos.length === 0 ? (
            <p className="p-6 text-center text-tinta-500">No hay bloqueos vigentes.</p>
          ) : (
            <ul className="divide-y divide-borde">
              {bloqueos.map((b) => (
                <li key={b.id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="flex items-start gap-3">
                    <Lock className="mt-0.5 size-4 shrink-0 text-tinta-400" aria-hidden />
                    <div className="text-[15px]">
                      <p className="font-medium">
                        {obtenerCasa(b.casa_id).nombre} · {rangoFechas(b.entrada, b.salida)}
                      </p>
                      <p className="text-tinta-700">{b.motivo}</p>
                      <p className="text-[13px] text-tinta-500">Por {b.creado_por}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => eliminarBloqueo(b.id)} className="grid size-10 shrink-0 place-items-center rounded-lg text-tinta-400 hover:bg-error-50 hover:text-error-700" aria-label="Quitar bloqueo">
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>

        <Tarjeta className="p-5">
          <h3 className="font-semibold">Nuevo bloqueo</h3>
          <div className="mt-3 space-y-3">
            <Campo etiqueta="Casa">
              <select className={claseEntrada} value={f.casa_id} onChange={(e) => setF({ ...f, casa_id: e.target.value })}>
                <option value="">Elija una casa</option>
                {casas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} ({nombreRegion(c.region)})
                  </option>
                ))}
              </select>
            </Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo etiqueta="Desde">
                <input type="date" className={claseEntrada} min={sumarDias(hoy, 1)} value={f.entrada} onChange={(e) => setF({ ...f, entrada: e.target.value })} />
              </Campo>
              <Campo etiqueta="Hasta (sin incluir)">
                <input type="date" className={claseEntrada} min={f.entrada || sumarDias(hoy, 2)} value={f.salida} onChange={(e) => setF({ ...f, salida: e.target.value })} />
              </Campo>
            </div>
            <Campo etiqueta="Motivo" ayuda="Se informa a las personas afectadas.">
              <input className={claseEntrada} value={f.motivo} onChange={(e) => setF({ ...f, motivo: e.target.value })} placeholder="Ej.: reparación del sistema eléctrico" />
            </Campo>
            {valido && afectadas.length > 0 && (
              <Aviso>
                {plural(afectadas.length, 'reserva se anulará', 'reservas se anularán')}: {afectadas.map((r) => r.titular.nombre).join(', ')}.
              </Aviso>
            )}
            <Boton className="w-full" disabled={!valido} onClick={() => setRevisar(true)}>
              Bloquear fechas
            </Boton>
          </div>
        </Tarjeta>
      </div>

      {revisar && (
        <Dialogo titulo="Confirmar bloqueo" onCerrar={() => setRevisar(false)}>
          <p className="mt-2 text-[15px] text-tinta-700">
            {obtenerCasa(Number(f.casa_id)).nombre} · {rangoFechas(f.entrada, f.salida)} · {f.motivo}
          </p>
          {afectadas.length > 0 ? (
            <>
              <p className="mt-4 text-[15px] font-medium">Se anularán y se avisará a:</p>
              <ul className="mt-1 list-disc pl-5 text-[15px] text-tinta-700">
                {afectadas.map((r) => (
                  <li key={r.codigo}>
                    {r.titular.nombre} · {rangoFechas(r.entrada, r.salida)} · {pesos(r.total)}
                    {r.pago ? ' (pagado: se devolverá)' : ''}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-4 text-[15px] text-tinta-700">No hay reservas en esas fechas.</p>
          )}
          <div className="mt-6 flex justify-end gap-3">
            <Boton variante="secundario" onClick={() => setRevisar(false)}>
              Volver
            </Boton>
            <Boton
              variante={afectadas.length ? 'peligro' : 'primario'}
              onClick={() => {
                const n = crearBloqueo({ ...f, casa_id: Number(f.casa_id), motivo: f.motivo.trim() }, usuario)
                setHecho(`Fechas bloqueadas.${n ? ` Se anularon ${plural(n, 'reserva', 'reservas')} y se avisó a las personas.` : ''}`)
                setF({ casa_id: '', entrada: '', salida: '', motivo: '' })
                setRevisar(false)
              }}
            >
              {afectadas.length ? 'Bloquear y anular reservas' : 'Bloquear'}
            </Boton>
          </div>
        </Dialogo>
      )}
    </section>
  )
}
