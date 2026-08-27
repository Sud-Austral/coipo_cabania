import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CircleAlert,
  Info,
  Send,
} from 'lucide-react'
import { getInmueble, validarDisponibilidadRango } from '../../api/inmuebles.js'
import { crearReserva } from '../../api/reservas.js'
import { MOTIVOS, PARENTESCOS } from '../../fixtures/tarifas.js'
import { temporadas } from '../../fixtures/temporadas.js'
import { calcularTarifa } from '../../lib/tarifas.js'
import { aISO, fechaLarga } from '../../lib/formato.js'
import { etiquetaTipo } from '../../fixtures/inmuebles.js'
import { useRol } from '../../context/RolContext.jsx'
import { CalendarioDisponibilidad } from '../../components/inmuebles/CalendarioDisponibilidad.jsx'
import { OcupantesForm } from '../../components/reservas/OcupantesForm.jsx'
import { ResumenTarifa } from '../../components/reservas/ResumenTarifa.jsx'
import { Badge } from '../../components/ui/Badge.jsx'
import {
  Aviso,
  Boton,
  Campo,
  Cargando,
  Tarjeta,
  clasesInput,
} from '../../components/ui/Elementos.jsx'

const PASOS = [
  { n: 1, titulo: 'Fechas y motivo' },
  { n: 2, titulo: 'Ocupantes' },
  { n: 3, titulo: 'Tarifa estimada' },
  { n: 4, titulo: 'Confirmación' },
]

function Indicador({ paso }) {
  return (
    <ol className="mb-6 flex flex-wrap gap-x-2 gap-y-2">
      {PASOS.map((p, i) => {
        const estado = p.n < paso ? 'hecho' : p.n === paso ? 'actual' : 'pendiente'
        return (
          <li key={p.n} className="flex items-center gap-2">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                estado === 'hecho'
                  ? 'bg-verde-600 text-white'
                  : estado === 'actual'
                    ? 'border-2 border-verde-600 bg-white text-verde-700'
                    : 'border border-arena-200 bg-white text-slate-400'
              }`}
            >
              {estado === 'hecho' ? <Check size={14} aria-hidden="true" /> : p.n}
            </span>
            <span
              className={`text-sm ${estado === 'pendiente' ? 'text-slate-400' : 'font-medium text-slate-800'}`}
            >
              {p.titulo}
            </span>
            {i < PASOS.length - 1 && (
              <span className="mx-1 hidden h-px w-8 bg-arena-200 sm:block" aria-hidden="true" />
            )}
          </li>
        )
      })}
    </ol>
  )
}

export function Reservar() {
  const { id } = useParams()
  const navegar = useNavigate()
  const { usuario, actor, esNoAfiliado, esPortal } = useRol()

  const [inmueble, setInmueble] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [paso, setPaso] = useState(1)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)
  const [disponibilidad, setDisponibilidad] = useState(null)
  const [validandoDisponibilidad, setValidandoDisponibilidad] = useState(false)

  const [rango, setRango] = useState(undefined)
  const [motivo, setMotivo] = useState('personal')
  const [observaciones, setObservaciones] = useState('')
  const [familiares, setFamiliares] = useState([])
  const [acompanantes, setAcompanantes] = useState([])

  const titularEsAfiliado = !esNoAfiliado

  useEffect(() => {
    let vigente = true
    getInmueble(id)
      .then((r) => vigente && setInmueble(r))
      .catch(() => vigente && setInmueble(null))
      .finally(() => vigente && setCargando(false))
    return () => {
      vigente = false
    }
  }, [id])

  /** Lista final de ocupantes: titular + familiares marcados + acompañantes. */
  const ocupantes = useMemo(() => {
    if (!usuario) return []
    const lista = [
      {
        nombre: usuario.nombre,
        rut: usuario.rut,
        parentesco: 'titular',
        categoria_tarifa: titularEsAfiliado ? 'afiliado' : 'externo',
      },
    ]
    ;(usuario.grupo_familiar ?? [])
      .filter((f) => familiares.includes(f.rut))
      .forEach((f) =>
        lista.push({
          nombre: f.nombre,
          rut: f.rut,
          parentesco: f.parentesco,
          categoria_tarifa: titularEsAfiliado ? 'afiliado' : 'externo',
        }),
      )
    acompanantes.forEach((a) =>
      lista.push({
        nombre: a.nombre,
        rut: a.rut,
        parentesco: a.parentesco,
        categoria_tarifa: 'externo',
      }),
    )
    return lista
  }, [usuario, familiares, acompanantes, titularEsAfiliado])

  const fechaEntrada = rango?.from ? aISO(rango.from) : null
  const fechaSalida = rango?.to ? aISO(rango.to) : null

  useEffect(() => {
    let vigente = true
    if (!fechaEntrada || !fechaSalida) {
      setDisponibilidad(null)
      setValidandoDisponibilidad(false)
      return () => { vigente = false }
    }

    setValidandoDisponibilidad(true)
    validarDisponibilidadRango(id, fechaEntrada, fechaSalida)
      .then((r) => vigente && setDisponibilidad(r))
      .catch(() => vigente && setDisponibilidad({ libre: false, motivo: 'No fue posible comprobar la disponibilidad.' }))
      .finally(() => vigente && setValidandoDisponibilidad(false))

    return () => { vigente = false }
  }, [id, fechaEntrada, fechaSalida])

  const tarifa = useMemo(() => {
    if (!inmueble || !fechaEntrada || !fechaSalida) return null
    return calcularTarifa({
      inmueble,
      fechaEntrada,
      fechaSalida,
      motivo,
      ocupantes,
      temporadas,
      titularEsAfiliado,
    })
  }, [inmueble, fechaEntrada, fechaSalida, motivo, ocupantes, titularEsAfiliado])

  if (cargando) return <Cargando texto="Preparando la solicitud…" />

  if (!inmueble) {
    return (
      <Aviso tono="rojo" titulo="Inmueble no encontrado">
        <Link to="/catalogo" className="underline">
          Volver al catálogo
        </Link>
      </Aviso>
    )
  }

  if (!esPortal) {
    return (
      <Aviso tono="ambar" titulo="Perfil sin acceso a este formulario">
        Las solicitudes de reserva las generan los perfiles de afiliado y usuario no afiliado.
        Cambie de perfil en el selector del encabezado.
      </Aviso>
    )
  }

  const excedeCapacidad = ocupantes.length > inmueble.capacidad_maxima
  const acompanantesIncompletos = acompanantes.some((a) => !a.nombre.trim() || !a.rut.trim())

  const puedeAvanzar = {
<<<<<<< Updated upstream
    1: Boolean(fechaEntrada && fechaSalida && tarifa?.noches > 0),
    2: !excedeCapacidad && !acompanantesIncompletos,
=======
    1: Boolean(fechaEntrada && fechaSalida && tarifa?.noches > 0 && disponibilidad?.libre && !validandoDisponibilidad),
    2: !excedeCapacidad && !acompanantesIncompletos && !rutsInvalidos && !rutsDuplicados,
>>>>>>> Stashed changes
    3: true,
    4: true,
  }[paso]

  const enviar = async () => {
    setEnviando(true)
    setError(null)
    try {
      const reserva = await crearReserva(
        {
          inmueble_id: inmueble.id,
          fecha_entrada: fechaEntrada,
          fecha_salida: fechaSalida,
          motivo,
          ocupantes,
          observaciones: observaciones.trim() || null,
        },
        actor,
      )
      navegar(`/reservas/${reserva.codigo}`)
    } catch (e) {
      setError(e.detail ?? 'No fue posible registrar la solicitud.')
      setEnviando(false)
    }
  }

  const motivoActual = MOTIVOS.find((m) => m.valor === motivo)

  return (
    <>
      <Link
        to={`/inmuebles/${inmueble.id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-verde-700 hover:underline"
      >
        <ArrowLeft size={15} aria-hidden="true" />
        Volver a la ficha del inmueble
      </Link>

      <div className="mb-5">
        <h1 className="text-2xl font-semibold text-verde-900">Solicitud de reserva</h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
          {inmueble.nombre}
          <Badge tono={inmueble.tipo === 'veraneo' ? 'verde' : 'azul'}>
            {etiquetaTipo(inmueble.tipo)}
          </Badge>
          <span>· Capacidad máxima {inmueble.capacidad_maxima} personas</span>
        </p>
      </div>

      <Indicador paso={paso} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Tarjeta className="p-5">
            {/* ---------- Paso 1: fechas y motivo ---------- */}
            {paso === 1 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-verde-900">
                    Seleccione las fechas
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Elija el día de ingreso y el de salida. Los días no disponibles aparecen
                    deshabilitados.
                  </p>
                  <div className="mt-3">
                    <CalendarioDisponibilidad
                      inmuebleId={inmueble.id}
                      modo="rango"
                      rango={rango}
                      onCambiarRango={setRango}
                      meses={2}
                    />
                  </div>
                </div>

                {fechaEntrada && fechaSalida && (
                  validandoDisponibilidad ? (
                    <Aviso tono="info" icono={CalendarDays} titulo="Comprobando disponibilidad">
                      Validando las fechas seleccionadas…
                    </Aviso>
                  ) : disponibilidad?.libre ? (
                    <Aviso tono="verde" icono={CalendarDays} titulo="Fechas disponibles">
                      Ingreso el {fechaLarga(fechaEntrada)} y salida el {fechaLarga(fechaSalida)}
                      {tarifa?.noches ? ` · ${tarifa.noches} noche(s)` : ''}.
                    </Aviso>
                  ) : (
                    <Aviso tono="rojo" icono={CircleAlert} titulo="El inmueble no está disponible">
                      {disponibilidad?.motivo ?? 'Existe una ocupación o bloqueo dentro de las fechas seleccionadas.'}
                      No puede avanzar con esta solicitud; seleccione otro rango en el calendario.
                    </Aviso>
                  )
                )}

                <Campo
                  etiqueta="Motivo de la solicitud"
                  requerido
                  ayuda={motivoActual?.ayuda}
                >
                  <select
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    className={clasesInput}
                  >
                    {MOTIVOS.map((m) => (
                      <option key={m.valor} value={m.valor}>
                        {m.etiqueta}
                      </option>
                    ))}
                  </select>
                </Campo>

                {inmueble.tipo === 'huespedes' && (
                  <Aviso tono="info" icono={Info}>
                    En casas de huéspedes los cupos se asignan por orden de prelación:{' '}
                    <strong>1° razones médicas, 2° laborales, 3° personales</strong>. Su
                    solicitud será revisada por la encargada regional según ese orden.
                  </Aviso>
                )}
              </div>
            )}

            {/* ---------- Paso 2: ocupantes ---------- */}
            {paso === 2 && (
              <div>
                <h2 className="text-lg font-semibold text-verde-900">
                  Registro de ocupantes
                </h2>
                <p className="mt-1 mb-4 text-sm text-slate-600">
                  Registre a todas las personas que se alojarán. La categoría de cada ocupante
                  determina la tarifa que se aplica.
                </p>
                <OcupantesForm
                  usuario={usuario}
                  titularEsAfiliado={titularEsAfiliado}
                  seleccionFamiliares={familiares}
                  onCambiarFamiliares={setFamiliares}
                  acompanantes={acompanantes}
                  onCambiarAcompanantes={setAcompanantes}
                  capacidadMaxima={inmueble.capacidad_maxima}
                  totalOcupantes={ocupantes.length}
                />
                {acompanantesIncompletos && (
                  <div className="mt-4">
                    <Aviso tono="ambar" titulo="Faltan datos de un acompañante">
                      Complete el nombre y el RUT de cada acompañante registrado.
                    </Aviso>
                  </div>
                )}
              </div>
            )}

            {/* ---------- Paso 3: tarifa ---------- */}
            {paso === 3 && (
              <div>
                <h2 className="text-lg font-semibold text-verde-900">Tarifa estimada</h2>
                <p className="mt-1 mb-4 text-sm text-slate-600">
                  Detalle del cobro según tipo de inmueble, número de noches, categoría de cada
                  ocupante y motivo de la reserva.
                </p>
                <ResumenTarifa tarifa={tarifa} />

                <div className="mt-5">
                  <Campo
                    etiqueta="Observaciones (opcional)"
                    ayuda="Información que quiera dejar a la encargada regional: hora estimada de llegada, requerimientos especiales, etc."
                  >
                    <textarea
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                      rows={3}
                      className={clasesInput}
                      placeholder="Ej.: llegaremos cerca de las 20:00 horas."
                    />
                  </Campo>
                </div>
              </div>
            )}

            {/* ---------- Paso 4: confirmación ---------- */}
            {paso === 4 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-verde-900">
                    Revise y confirme su solicitud
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Al enviar, la solicitud queda registrada y la encargada regional la revisa.
                    Recibirá el comprobante y las notificaciones de cambio de estado.
                  </p>
                </div>

                <dl className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg bg-arena-50 px-3.5 py-2.5">
                    <dt className="text-xs text-slate-500">Inmueble</dt>
                    <dd className="mt-0.5 text-sm font-medium text-slate-800">
                      {inmueble.nombre}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-arena-50 px-3.5 py-2.5">
                    <dt className="text-xs text-slate-500">Motivo</dt>
                    <dd className="mt-0.5 text-sm font-medium text-slate-800">
                      {motivoActual?.etiqueta}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-arena-50 px-3.5 py-2.5">
                    <dt className="text-xs text-slate-500">Ingreso</dt>
                    <dd className="mt-0.5 text-sm font-medium text-slate-800">
                      {fechaLarga(fechaEntrada)}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-arena-50 px-3.5 py-2.5">
                    <dt className="text-xs text-slate-500">Salida</dt>
                    <dd className="mt-0.5 text-sm font-medium text-slate-800">
                      {fechaLarga(fechaSalida)}
                    </dd>
                  </div>
                </dl>

                <div>
                  <h3 className="mb-2 text-sm font-semibold text-slate-800">
                    Ocupantes ({ocupantes.length})
                  </h3>
                  <ul className="divide-y divide-arena-200 rounded-lg border border-arena-200">
                    {ocupantes.map((o, i) => (
                      <li
                        key={`${o.rut}-${i}`}
                        className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5"
                      >
                        <span>
                          <span className="block text-sm text-slate-800">{o.nombre}</span>
                          <span className="tabular block text-xs text-slate-500">
                            {o.rut} ·{' '}
                            {PARENTESCOS.find((p) => p.valor === o.parentesco)?.etiqueta}
                          </span>
                        </span>
                        <Badge tono={o.categoria_tarifa === 'afiliado' ? 'verde' : 'ambar'}>
                          {o.categoria_tarifa === 'afiliado'
                            ? 'Tarifa afiliado'
                            : 'Tarifa usuario externo'}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </div>

                <ResumenTarifa tarifa={tarifa} compacto />

                {error && (
                  <Aviso tono="rojo" icono={CircleAlert} titulo="No se pudo registrar">
                    {error}
                  </Aviso>
                )}
              </div>
            )}

            {/* ---------- Navegación ---------- */}
            <div className="mt-6 flex flex-wrap justify-between gap-3 border-t border-arena-200 pt-4">
              <Boton
                variante="neutro"
                onClick={() =>
                  paso === 1 ? navegar(`/inmuebles/${inmueble.id}`) : setPaso(paso - 1)
                }
              >
                <ArrowLeft size={15} aria-hidden="true" />
                {paso === 1 ? 'Cancelar' : 'Anterior'}
              </Boton>

              {paso < 4 ? (
                <Boton onClick={() => setPaso(paso + 1)} disabled={!puedeAvanzar}>
                  Continuar
                  <ArrowRight size={15} aria-hidden="true" />
                </Boton>
              ) : (
                <Boton onClick={enviar} cargando={enviando}>
                  <Send size={15} aria-hidden="true" />
                  Enviar solicitud
                </Boton>
              )}
            </div>

            {paso === 1 && !puedeAvanzar && (
              <p className="mt-2 text-right text-xs text-slate-500">
                {fechaEntrada && fechaSalida && !validandoDisponibilidad && disponibilidad && !disponibilidad.libre
                  ? 'El rango seleccionado no está disponible. Elija otras fechas para continuar.'
                  : 'Seleccione un rango disponible de ingreso y salida para continuar.'}
              </p>
            )}
          </Tarjeta>
        </div>

        {/* ---------- Panel lateral con el resumen ---------- */}
        <div className="space-y-4">
          <Tarjeta className="p-5">
            <h2 className="text-base font-semibold text-verde-900">Resumen de la solicitud</h2>
            <dl className="mt-3 space-y-2.5 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Inmueble</dt>
                <dd className="text-right font-medium text-slate-800">{inmueble.nombre}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Motivo</dt>
                <dd className="text-right font-medium text-slate-800">
                  {motivoActual?.etiqueta}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Noches</dt>
                <dd className="tabular text-right font-medium text-slate-800">
                  {tarifa?.noches ?? '—'}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Ocupantes</dt>
                <dd className="tabular text-right font-medium text-slate-800">
                  {ocupantes.length} de {inmueble.capacidad_maxima}
                </dd>
              </div>
            </dl>

            <div className="mt-4 border-t border-arena-200 pt-3">
              <ResumenTarifa tarifa={tarifa} compacto />
            </div>
          </Tarjeta>

          <Aviso tono="ambar" icono={Info} titulo="Política de desistimiento">
            La anulación debe avisarse con al menos <strong>una semana</strong> de antelación.
            Con menos aviso se cobra el total de los días reservados; en caso de fuerza mayor
            comprobada, solo un día por gastos de limpieza.
          </Aviso>
        </div>
      </div>
    </>
  )
}
