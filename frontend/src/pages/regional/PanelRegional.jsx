import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BedDouble,
  CalendarCheck,
  Check,
  ClipboardList,
  DoorOpen,
  Info,
  LogOut,
  X,
} from 'lucide-react'
import { cambiarEstado, getReservas, registrarEstadia } from '../../api/reservas.js'
import { MOTIVOS } from '../../fixtures/tarifas.js'
import { nombreRegion } from '../../fixtures/inmuebles.js'
import { fechaCorta, pesos } from '../../lib/formato.js'
import { useRol } from '../../context/RolContext.jsx'
import { FiltroEstados, TablaReservas } from '../../components/reservas/TablaReservas.jsx'
import { ListaEspera } from '../../components/reservas/ListaEspera.jsx'
import { Modal } from '../../components/ui/Modal.jsx'
import { Badge } from '../../components/ui/Badge.jsx'
import {
  Aviso,
  Boton,
  Campo,
  Cargando,
  StatCard,
  Tarjeta,
  TituloSeccion,
  clasesInput,
} from '../../components/ui/Elementos.jsx'

/** Orden de prelación institucional: médica > laboral > personal. */
const prelacionDe = (motivo) => MOTIVOS.find((m) => m.valor === motivo)?.prelacion ?? 9

export function PanelRegional() {
  const { usuario, actor } = useRol()
  const region = usuario?.region ?? '05'

  const [reservas, setReservas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [filtro, setFiltro] = useState('todos')
  const [gestion, setGestion] = useState(null) // { reserva, accion }
  const [fundamento, setFundamento] = useState('')
  const [detalles, setDetalles] = useState({ llaves: true, ocupantes_verificados: true, estado_inmueble: 'bueno', aseo: 'conforme', hay_incidencia: false, tipo_incidencia: 'danos', recomendacion_bloqueo: false, evidencia: null })
  const [procesando, setProcesando] = useState(false)

  const cargar = useCallback(() => {
    setCargando(true)
    getReservas({ region })
      .then((r) => setReservas(r.items))
      .finally(() => setCargando(false))
  }, [region])

  useEffect(() => {
    cargar()
  }, [cargar])

  const pendientes = useMemo(
    () =>
      reservas
        .filter((r) => r.estado === 'recibida')
        .sort((a, b) => prelacionDe(a.motivo) - prelacionDe(b.motivo)),
    [reservas],
  )

  const enEspera = useMemo(
    () => reservas.filter((r) => r.estado === 'lista_espera'),
    [reservas],
  )

  const visibles = useMemo(
    () => (filtro === 'todos' ? reservas : reservas.filter((r) => r.estado === filtro)),
    [reservas, filtro],
  )

  const totales = {
    pendientes: pendientes.length,
    confirmadas: reservas.filter((r) => r.estado === 'confirmada').length,
    enCurso: reservas.filter((r) => r.estado === 'en_curso').length,
    listaEspera: reservas.filter((r) => r.estado === 'lista_espera').length,
  }

  const promover = (reserva) => abrir(reserva, 'confirmar')

  const abrir = (reserva, accion) => {
    setGestion({ reserva, accion })
    setFundamento('')
    setDetalles({ llaves: true, ocupantes_verificados: true, estado_inmueble: 'bueno', aseo: 'conforme', hay_incidencia: false, tipo_incidencia: 'danos', recomendacion_bloqueo: false, evidencia: null })
  }

  const ejecutar = async () => {
    setProcesando(true)
    try {
      const { reserva, accion } = gestion
      if (accion === 'confirmar') {
        await cambiarEstado(reserva.codigo, 'confirmada', { fundamento, actor })
      } else if (accion === 'rechazar') {
        await cambiarEstado(reserva.codigo, 'rechazada', { fundamento, actor })
      } else if (accion === 'check_in') {
        await registrarEstadia(reserva.codigo, 'check_in', { observaciones: fundamento, detalles, actor })
      } else if (accion === 'check_out') {
        await registrarEstadia(reserva.codigo, 'check_out', { observaciones: fundamento, detalles, actor })
      }
      setGestion(null)
      cargar()
    } finally {
      setProcesando(false)
    }
  }

  if (cargando) return <Cargando texto="Cargando las reservas de la región…" />

  const textosModal = {
    confirmar: {
      titulo: 'Confirmar la reserva',
      etiqueta: 'Fundamento de la confirmación',
      ayuda: 'Queda registrado en la trazabilidad de la reserva y en las pistas de auditoría.',
      requerido: true,
      boton: 'Confirmar reserva',
      variante: 'primario',
    },
    rechazar: {
      titulo: 'Rechazar la solicitud',
      etiqueta: 'Fundamento del rechazo',
      ayuda: 'Obligatorio: el afiliado recibe este motivo junto con la notificación.',
      requerido: true,
      boton: 'Rechazar solicitud',
      variante: 'peligro',
    },
    check_in: {
      titulo: 'Registrar ingreso (check-in)',
      etiqueta: 'Observaciones del ingreso',
      ayuda: 'Opcional: estado del inmueble, hora efectiva de llegada, etc.',
      requerido: false,
      boton: 'Registrar ingreso',
      variante: 'primario',
    },
    check_out: {
      titulo: 'Registrar salida (check-out)',
      etiqueta: 'Observaciones de la estadía y estado del inmueble',
      ayuda: 'Estos registros respaldan eventuales sanciones por daños o destrozos.',
      requerido: false,
      boton: 'Registrar salida',
      variante: 'primario',
    },
  }
  const t = gestion ? textosModal[gestion.accion] : null

  return (
    <>
      <TituloSeccion
        titulo={`Solicitudes de la Región de ${nombreRegion(region)}`}
        descripcion={`Reservas de los inmuebles a cargo de ${usuario?.nombre}. Solo se muestran los inmuebles de su región.`}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          etiqueta="Por revisar"
          valor={totales.pendientes}
          detalle="Solicitudes recibidas"
          icono={ClipboardList}
        />
        <StatCard
          etiqueta="Confirmadas"
          valor={totales.confirmadas}
          detalle="Estadías por venir"
          icono={CalendarCheck}
        />
        <StatCard
          etiqueta="En curso"
          valor={totales.enCurso}
          detalle="Huéspedes alojados"
          icono={BedDouble}
        />
        <StatCard
          etiqueta="Lista de espera"
          valor={totales.listaEspera}
          detalle="A la espera de cupo"
          icono={Info}
        />
      </div>

      {/* Solicitudes por revisar, ordenadas por prelación */}
      {pendientes.length > 0 && (
        <Tarjeta className="mb-6 p-5">
          <div className="mb-3">
            <h2 className="text-lg font-semibold text-verde-900">Solicitudes por revisar</h2>
            <p className="mt-0.5 text-sm text-slate-600">
              Ordenadas por el orden de prelación institucional: primero razones médicas, luego
              laborales y por último personales.
            </p>
          </div>

          <ul className="space-y-3">
            {pendientes.map((r) => {
              const motivo = MOTIVOS.find((m) => m.valor === r.motivo)
              return (
                <li
                  key={r.codigo}
                  className="rounded-lg border border-arena-200 bg-arena-50/60 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-64">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="tabular text-sm font-semibold text-verde-800">
                          {r.codigo}
                        </span>
                        <Badge
                          tono={
                            r.motivo === 'medica'
                              ? 'rojo'
                              : r.motivo === 'laboral'
                                ? 'azul'
                                : 'arena'
                          }
                        >
                          {motivo?.prelacion}° prelación · {motivo?.etiqueta}
                        </Badge>
                        {!r.titular_es_afiliado && (
                          <Badge tono="ambar">Usuario no afiliado</Badge>
                        )}
                      </div>
                      <p className="mt-1.5 text-sm font-medium text-slate-800">
                        {r.inmueble?.nombre}
                      </p>
                      <p className="tabular text-sm text-slate-600">
                        {fechaCorta(r.fecha_entrada)} → {fechaCorta(r.fecha_salida)} ·{' '}
                        {r.ocupantes?.length ?? 1} ocupante(s) · {pesos(r.monto_total)}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {r.titular_nombre}{' '}
                        <span className="tabular text-xs text-slate-500">({r.titular_rut})</span>
                      </p>
                      {r.observaciones && (
                        <p className="mt-1.5 text-xs text-slate-500 italic">
                          «{r.observaciones}»
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Boton onClick={() => abrir(r, 'confirmar')}>
                        <Check size={15} aria-hidden="true" />
                        Confirmar
                      </Boton>
                      <Boton variante="peligro" onClick={() => abrir(r, 'rechazar')}>
                        <X size={15} aria-hidden="true" />
                        Rechazar
                      </Boton>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </Tarjeta>
      )}

      {enEspera.length > 0 && (
        <div className="mb-6">
          <ListaEspera reservas={enEspera} onPromover={promover} />
        </div>
      )}

      {/* Todas las reservas de la región */}
      <h2 className="mb-3 text-lg font-semibold text-verde-900">
        Todas las reservas de la región
      </h2>

      <FiltroEstados
        reservas={reservas}
        estados={['recibida', 'confirmada', 'en_curso', 'finalizada', 'lista_espera', 'rechazada', 'anulada']}
        activo={filtro}
        onCambiar={setFiltro}
      />

      <TablaReservas
        reservas={visibles}
        mostrar={{ titular: true, region: false, monto: true }}
        vacio="No hay reservas con ese estado en su región."
        acciones={(r) => (
          <div className="flex flex-wrap justify-end gap-1.5">
            {r.estado === 'confirmada' && (
              <Boton variante="secundario" onClick={() => abrir(r, 'check_in')}>
                <DoorOpen size={14} aria-hidden="true" />
                Check-in
              </Boton>
            )}
            {r.estado === 'en_curso' && (
              <Boton variante="secundario" onClick={() => abrir(r, 'check_out')}>
                <LogOut size={14} aria-hidden="true" />
                Check-out
              </Boton>
            )}
            {r.estado === 'recibida' && (
              <Boton variante="neutro" onClick={() => abrir(r, 'confirmar')}>
                Gestionar
              </Boton>
            )}
          </div>
        )}
      />

      {/* Modal de gestión */}
      <Modal
        abierto={Boolean(gestion)}
        onCerrar={() => setGestion(null)}
        titulo={t?.titulo ?? ''}
        descripcion={
          gestion
            ? `${gestion.reserva.codigo} · ${gestion.reserva.inmueble?.nombre} · ${fechaCorta(gestion.reserva.fecha_entrada)} → ${fechaCorta(gestion.reserva.fecha_salida)}`
            : ''
        }
        pie={
          <>
            <Boton variante="neutro" onClick={() => setGestion(null)}>
              Cancelar
            </Boton>
            <Boton
              variante={t?.variante ?? 'primario'}
              cargando={procesando}
              disabled={(t?.requerido || detalles.hay_incidencia) && !fundamento.trim()}
              onClick={ejecutar}
            >
              {t?.boton}
            </Boton>
          </>
        }
      >
        {gestion && (
          <div className="space-y-4">
            {gestion.accion === 'confirmar' && (
              <Aviso tono="info" icono={Info}>
                Al confirmar, el afiliado recibe la notificación y su comprobante queda con
                estado «Confirmada». Las fechas pasan a mostrarse como ocupadas en el
                calendario público del inmueble.
              </Aviso>
            )}

            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-slate-500">Titular</dt>
                <dd className="font-medium text-slate-800">{gestion.reserva.titular_nombre}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Ocupantes</dt>
                <dd className="tabular font-medium text-slate-800">
                  {gestion.reserva.ocupantes?.length ?? 1}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Motivo</dt>
                <dd className="font-medium text-slate-800">
                  {MOTIVOS.find((m) => m.valor === gestion.reserva.motivo)?.etiqueta}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Cobro estimado</dt>
                <dd className="tabular font-medium text-slate-800">
                  {pesos(gestion.reserva.monto_total)}
                </dd>
              </div>
            </dl>

            <Campo etiqueta={t.etiqueta} requerido={t.requerido} ayuda={t.ayuda}>
              <textarea
                value={fundamento}
                onChange={(e) => setFundamento(e.target.value)}
                rows={3}
                className={clasesInput}
                placeholder={
                  gestion.accion === 'rechazar'
                    ? 'Ej.: sin disponibilidad; se privilegia solicitud por razones médicas sobre las mismas fechas.'
                    : 'Ej.: disponibilidad verificada en el calendario del inmueble.'
                }
              />
            </Campo>

            {['check_in', 'check_out'].includes(gestion.accion) && <div className="space-y-3 rounded-lg border border-arena-200 bg-arena-50 p-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Campo etiqueta="Estado del inmueble"><select value={detalles.estado_inmueble} onChange={(e) => setDetalles((d) => ({ ...d, estado_inmueble: e.target.value }))} className={clasesInput}><option value="bueno">Bueno</option><option value="con_observaciones">Con observaciones</option><option value="dano">Con daños</option></select></Campo>
                {gestion.accion === 'check_out' && <Campo etiqueta="Estado de aseo"><select value={detalles.aseo} onChange={(e) => setDetalles((d) => ({ ...d, aseo: e.target.value }))} className={clasesInput}><option value="conforme">Conforme</option><option value="requiere_limpieza">Requiere limpieza adicional</option></select></Campo>}
              </div>
              <label className="flex gap-2 text-sm"><input type="checkbox" checked={detalles.llaves} onChange={(e) => setDetalles((d) => ({ ...d, llaves: e.target.checked }))} />{gestion.accion === 'check_in' ? 'Llaves entregadas' : 'Llaves devueltas'}</label>
              {gestion.accion === 'check_in' && <label className="flex gap-2 text-sm"><input type="checkbox" checked={detalles.ocupantes_verificados} onChange={(e) => setDetalles((d) => ({ ...d, ocupantes_verificados: e.target.checked }))} />Ocupantes verificados</label>}
              {gestion.accion === 'check_out' && <><label className="flex gap-2 text-sm font-medium text-rose-800"><input type="checkbox" checked={detalles.hay_incidencia} onChange={(e) => setDetalles((d) => ({ ...d, hay_incidencia: e.target.checked }))} />Registrar daño, no-show u otro incumplimiento</label>{detalles.hay_incidencia && <div className="space-y-3 rounded-lg bg-rose-50 p-3"><Campo etiqueta="Tipo de incidencia"><select value={detalles.tipo_incidencia} onChange={(e) => setDetalles((d) => ({ ...d, tipo_incidencia: e.target.value }))} className={clasesInput}><option value="danos">Daños o destrozos</option><option value="no_show">No presentación</option><option value="conducta">Incumplimiento de normas</option></select></Campo><Campo etiqueta="Evidencia demostrativa"><input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setDetalles((d) => ({ ...d, evidencia: e.target.files?.[0] ? { nombre: e.target.files[0].name, tipo: e.target.files[0].type } : null }))} className={clasesInput} /></Campo><label className="flex gap-2 text-sm"><input type="checkbox" checked={detalles.recomendacion_bloqueo} onChange={(e) => setDetalles((d) => ({ ...d, recomendacion_bloqueo: e.target.checked }))} />Recomendar bloqueo a Oficina Central</label></div>}</>}
            </div>}
          </div>
        )}
      </Modal>
    </>
  )
}
