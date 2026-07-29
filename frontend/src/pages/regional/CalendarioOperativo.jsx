import { useCallback, useEffect, useMemo, useState } from 'react'
import { differenceInCalendarDays, isSameDay, parseISO, startOfToday } from 'date-fns'
import { CalendarOff, DoorOpen, LogOut, Trash2, Wrench } from 'lucide-react'
import { crearBloqueo, eliminarBloqueo, getBloqueos, getInmuebles } from '../../api/inmuebles.js'
import { getReservas } from '../../api/reservas.js'
import { nombreRegion } from '../../fixtures/inmuebles.js'
import { aISO, fechaCorta, fechaLarga } from '../../lib/formato.js'
import { useRol } from '../../context/RolContext.jsx'
import { CalendarioDisponibilidad } from '../../components/inmuebles/CalendarioDisponibilidad.jsx'
import { BadgeEstado } from '../../components/ui/Badge.jsx'
import { Modal } from '../../components/ui/Modal.jsx'
import {
  Aviso,
  Boton,
  Campo,
  Cargando,
  Tarjeta,
  TituloSeccion,
  clasesInput,
} from '../../components/ui/Elementos.jsx'

const MOTIVOS_BLOQUEO = [
  { valor: 'mantencion', etiqueta: 'Mantención o reparación' },
  { valor: 'institucional', etiqueta: 'Destinación institucional' },
  { valor: 'temporada', etiqueta: 'Bloqueo de temporada' },
]

export function CalendarioOperativo() {
  const { usuario, actor } = useRol()
  const region = usuario?.region ?? '05'

  const [inmuebles, setInmuebles] = useState([])
  const [seleccionado, setSeleccionado] = useState(null)
  const [reservas, setReservas] = useState([])
  const [bloqueos, setBloqueos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modalBloqueo, setModalBloqueo] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [formulario, setFormulario] = useState({
    desde: '',
    hasta: '',
    motivo: '',
    origen: 'mantencion',
  })
  const [claveCalendario, setClaveCalendario] = useState(0)

  useEffect(() => {
    Promise.all([getInmuebles({ region }), getReservas({ region })]).then(([inm, res]) => {
      setInmuebles(inm.items)
      // Se abre en el inmueble con más estadías confirmadas o en curso, para que
      // el calendario muestre ocupación desde el primer momento.
      const conteo = new Map()
      res.items
        .filter((r) => ['confirmada', 'en_curso'].includes(r.estado))
        .forEach((r) => conteo.set(r.inmueble_id, (conteo.get(r.inmueble_id) ?? 0) + 1))
      const masOcupado = [...conteo.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
      setSeleccionado(masOcupado ?? inm.items[0]?.id ?? null)
      setCargando(false)
    })
  }, [region])

  const cargarDetalle = useCallback(() => {
    if (!seleccionado) return
    getReservas({ inmueble_id: seleccionado }).then((r) => setReservas(r.items))
    getBloqueos(seleccionado).then((r) => setBloqueos(r.items))
  }, [seleccionado])

  useEffect(() => {
    cargarDetalle()
  }, [cargarDetalle])

  const hoy = startOfToday()

  const { llegadas, salidas, soloHoy } = useMemo(() => {
    const todas = reservas.filter((r) => ['confirmada', 'en_curso'].includes(r.estado))
    const dentroDeUnaSemana = (iso) => {
      const dias = differenceInCalendarDays(parseISO(iso), hoy)
      return dias >= 0 && dias <= 7
    }
    const hoyLlega = todas.filter((r) => isSameDay(parseISO(r.fecha_entrada), hoy))
    const hoySale = todas.filter((r) => isSameDay(parseISO(r.fecha_salida), hoy))
    const hayHoy = hoyLlega.length > 0 || hoySale.length > 0
    return {
      soloHoy: hayHoy,
      llegadas: hayHoy ? hoyLlega : todas.filter((r) => dentroDeUnaSemana(r.fecha_entrada)),
      salidas: hayHoy ? hoySale : todas.filter((r) => dentroDeUnaSemana(r.fecha_salida)),
    }
  }, [reservas, hoy])

  const proximas = useMemo(
    () =>
      reservas
        .filter((r) => ['confirmada', 'en_curso'].includes(r.estado))
        .sort((a, b) => (a.fecha_entrada > b.fecha_entrada ? 1 : -1))
        .slice(0, 6),
    [reservas],
  )

  const inmuebleActual = inmuebles.find((i) => i.id === seleccionado)

  const guardarBloqueo = async () => {
    setGuardando(true)
    try {
      await crearBloqueo(
        {
          inmueble_id: seleccionado,
          desde: formulario.desde,
          hasta: formulario.hasta,
          motivo: formulario.motivo,
          origen: formulario.origen,
        },
        actor,
      )
      setModalBloqueo(false)
      setFormulario({ desde: '', hasta: '', motivo: '', origen: 'mantencion' })
      cargarDetalle()
      setClaveCalendario((k) => k + 1)
    } finally {
      setGuardando(false)
    }
  }

  const quitarBloqueo = async (id) => {
    await eliminarBloqueo(id, actor)
    cargarDetalle()
    setClaveCalendario((k) => k + 1)
  }

  if (cargando) return <Cargando texto="Cargando los inmuebles de la región…" />

  const formularioValido =
    formulario.desde && formulario.hasta && formulario.motivo.trim().length > 3

  return (
    <>
      <TituloSeccion
        titulo="Calendario operativo"
        descripcion={`Ocupación, llegadas y salidas de los inmuebles de la Región de ${nombreRegion(region)}, y bloqueo de fechas por mantención o destinación institucional.`}
        acciones={
          <Boton onClick={() => setModalBloqueo(true)}>
            <CalendarOff size={16} aria-hidden="true" />
            Bloquear fechas
          </Boton>
        }
      />

      <Campo etiqueta="Inmueble" className="mb-5 max-w-lg">
        <select
          value={seleccionado ?? ''}
          onChange={(e) => setSeleccionado(Number(e.target.value))}
          className={clasesInput}
        >
          {inmuebles.map((i) => (
            <option key={i.id} value={i.id}>
              {i.nombre} — {i.localidad}
            </option>
          ))}
        </select>
      </Campo>

      <div className="grid gap-6 lg:grid-cols-3">
        <Tarjeta className="p-5 lg:col-span-2">
          <h2 className="text-lg font-semibold text-verde-900">
            Ocupación de {inmuebleActual?.nombre}
          </h2>
          <p className="mt-0.5 mb-3 text-sm text-slate-600">
            Estado día por día: reservas confirmadas, mantenciones y bloqueos de temporada.
          </p>
          {seleccionado && (
            <CalendarioDisponibilidad
              key={claveCalendario}
              inmuebleId={seleccionado}
              meses={2}
            />
          )}
        </Tarjeta>

        <div className="space-y-5">
          {/* Movimientos del día */}
          <Tarjeta className="p-5">
            <h2 className="text-base font-semibold text-verde-900">
              {soloHoy ? 'Movimientos de hoy' : 'Movimientos de los próximos 7 días'}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {soloHoy ? fechaLarga(aISO(hoy)) : `Desde el ${fechaCorta(aISO(hoy))}`}
            </p>

            <div className="mt-3 space-y-3">
              <div>
                <p className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                  <DoorOpen size={14} className="text-verde-600" aria-hidden="true" />
                  Llegadas ({llegadas.length})
                </p>
                {llegadas.length === 0 ? (
                  <p className="mt-1 text-sm text-slate-500">Sin llegadas en el período.</p>
                ) : (
                  <ul className="mt-1 space-y-1.5">
                    {llegadas.map((r) => (
                      <li key={r.codigo} className="text-sm text-slate-700">
                        {r.titular_nombre}{' '}
                        <span className="tabular text-xs text-slate-500">
                          {soloHoy ? `(${r.codigo})` : fechaCorta(r.fecha_entrada)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="border-t border-arena-200 pt-3">
                <p className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                  <LogOut size={14} className="text-slate-400" aria-hidden="true" />
                  Salidas ({salidas.length})
                </p>
                {salidas.length === 0 ? (
                  <p className="mt-1 text-sm text-slate-500">Sin salidas en el período.</p>
                ) : (
                  <ul className="mt-1 space-y-1.5">
                    {salidas.map((r) => (
                      <li key={r.codigo} className="text-sm text-slate-700">
                        {r.titular_nombre}{' '}
                        <span className="tabular text-xs text-slate-500">
                          {soloHoy ? `(${r.codigo})` : fechaCorta(r.fecha_salida)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </Tarjeta>

          {/* Bloqueos vigentes */}
          <Tarjeta className="p-5">
            <h2 className="flex items-center gap-2 text-base font-semibold text-verde-900">
              <Wrench size={16} className="text-amber-600" aria-hidden="true" />
              Bloqueos registrados
            </h2>
            {bloqueos.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">
                Este inmueble no tiene fechas bloqueadas.
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-arena-200">
                {bloqueos.map((b) => (
                  <li key={b.id} className="flex items-start justify-between gap-3 py-2.5">
                    <span>
                      <span className="tabular block text-sm text-slate-800">
                        {fechaCorta(b.desde)} → {fechaCorta(b.hasta)}
                      </span>
                      <span className="block text-xs text-slate-500">{b.motivo}</span>
                      {b.inmueble_id === null && (
                        <span className="block text-xs text-amber-700">
                          Aplica a toda la red
                        </span>
                      )}
                    </span>
                    {b.inmueble_id !== null && (
                      <button
                        type="button"
                        onClick={() => quitarBloqueo(b.id)}
                        aria-label={`Levantar bloqueo del ${fechaCorta(b.desde)}`}
                        className="cursor-pointer rounded-lg p-1.5 text-rose-700 hover:bg-rose-50"
                      >
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Tarjeta>

          {/* Próximas estadías */}
          <Tarjeta className="p-5">
            <h2 className="text-base font-semibold text-verde-900">Próximas estadías</h2>
            {proximas.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">Sin estadías confirmadas.</p>
            ) : (
              <ul className="mt-2 divide-y divide-arena-200">
                {proximas.map((r) => (
                  <li key={r.codigo} className="flex items-start justify-between gap-3 py-2.5">
                    <span>
                      <span className="block text-sm text-slate-800">{r.titular_nombre}</span>
                      <span className="tabular block text-xs text-slate-500">
                        {fechaCorta(r.fecha_entrada)} → {fechaCorta(r.fecha_salida)}
                      </span>
                    </span>
                    <BadgeEstado estado={r.estado} />
                  </li>
                ))}
              </ul>
            )}
          </Tarjeta>
        </div>
      </div>

      {/* Modal de bloqueo */}
      <Modal
        abierto={modalBloqueo}
        onCerrar={() => setModalBloqueo(false)}
        titulo="Bloquear fechas del inmueble"
        descripcion={inmuebleActual?.nombre}
        pie={
          <>
            <Boton variante="neutro" onClick={() => setModalBloqueo(false)}>
              Cancelar
            </Boton>
            <Boton cargando={guardando} disabled={!formularioValido} onClick={guardarBloqueo}>
              Bloquear fechas
            </Boton>
          </>
        }
      >
        <div className="space-y-4">
          <Aviso tono="ambar">
            Las fechas bloqueadas se muestran de inmediato como no disponibles en el calendario
            público del inmueble, para todos los perfiles.
          </Aviso>

          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="Desde" requerido>
              <input
                type="date"
                value={formulario.desde}
                onChange={(e) => setFormulario((f) => ({ ...f, desde: e.target.value }))}
                className={clasesInput}
              />
            </Campo>
            <Campo etiqueta="Hasta" requerido>
              <input
                type="date"
                value={formulario.hasta}
                min={formulario.desde || undefined}
                onChange={(e) => setFormulario((f) => ({ ...f, hasta: e.target.value }))}
                className={clasesInput}
              />
            </Campo>
          </div>

          <Campo etiqueta="Tipo de bloqueo" requerido>
            <select
              value={formulario.origen}
              onChange={(e) => setFormulario((f) => ({ ...f, origen: e.target.value }))}
              className={clasesInput}
            >
              {MOTIVOS_BLOQUEO.map((m) => (
                <option key={m.valor} value={m.valor}>
                  {m.etiqueta}
                </option>
              ))}
            </select>
          </Campo>

          <Campo
            etiqueta="Motivo"
            requerido
            ayuda="Queda registrado en las pistas de auditoría del sistema."
          >
            <input
              type="text"
              value={formulario.motivo}
              onChange={(e) => setFormulario((f) => ({ ...f, motivo: e.target.value }))}
              placeholder="Ej.: pintura de dormitorios y reparación de calefón."
              className={clasesInput}
            />
          </Campo>
        </div>
      </Modal>
    </>
  )
}
