import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { getReservas, resolverFuerzaMayor } from '../../api/reservas.js'
import { useRol } from '../../context/RolContext.jsx'
import { Modal } from '../../components/ui/Modal.jsx'
import { REGIONES } from '../../fixtures/inmuebles.js'
import { MOTIVOS } from '../../fixtures/tarifas.js'
import { FiltroEstados, TablaReservas } from '../../components/reservas/TablaReservas.jsx'
import {
  Campo,
  Aviso,
  Boton,
  Cargando,
  Tarjeta,
  TituloSeccion,
  clasesInput,
} from '../../components/ui/Elementos.jsx'

export function ReservasPais() {
  const { actor } = useRol()
  const [reservas, setReservas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [estado, setEstado] = useState('todos')
  const [region, setRegion] = useState('')
  const [motivo, setMotivo] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [revision, setRevision] = useState(null)
  const [fundamento, setFundamento] = useState('')
  const [procesando, setProcesando] = useState(false)

  const cargar = () => getReservas({}).then((r) => setReservas(r.items))

  useEffect(() => {
    setCargando(true)
    cargar()
      .finally(() => setCargando(false))
  }, [])

  const pendientesFuerzaMayor = reservas.filter((r) => r.estado === 'fuerza_mayor_pendiente')
  const resolver = async (aprobar) => {
    setProcesando(true)
    try {
      await resolverFuerzaMayor(revision.codigo, { aprobar, fundamento, actor })
      setRevision(null)
      setFundamento('')
      await cargar()
    } finally { setProcesando(false) }
  }

  const visibles = useMemo(() => {
    let lista = reservas
    if (estado !== 'todos') lista = lista.filter((r) => r.estado === estado)
    if (region) lista = lista.filter((r) => r.inmueble?.region === region)
    if (motivo) lista = lista.filter((r) => r.motivo === motivo)
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      lista = lista.filter(
        (r) =>
          r.titular_nombre.toLowerCase().includes(q) ||
          r.titular_rut.includes(q) ||
          r.codigo.toLowerCase().includes(q) ||
          (r.inmueble?.nombre ?? '').toLowerCase().includes(q),
      )
    }
    return lista
  }, [reservas, estado, region, motivo, busqueda])

  if (cargando) return <Cargando texto="Cargando las reservas del país…" />

  return (
    <>
      <TituloSeccion
        titulo="Reservas de toda la red"
        descripcion="Acceso nacional a las reservas de las 13 regiones, para el cálculo de cobros y la revisión de casos."
      />

      {pendientesFuerzaMayor.length > 0 && (
        <Tarjeta className="mb-5 border-violet-200 p-4">
          <h2 className="font-semibold text-violet-900">Solicitudes de fuerza mayor por revisar</h2>
          <p className="mt-1 text-sm text-slate-600">Revise el motivo, respaldo y cobro antes de resolver.</p>
          <div className="mt-3 space-y-2">
            {pendientesFuerzaMayor.map((r) => (
              <button key={r.codigo} type="button" onClick={() => { setRevision(r); setFundamento('') }} className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg border border-violet-200 bg-violet-50 p-3 text-left hover:bg-violet-100">
                <span><strong className="block text-sm text-violet-900">{r.codigo} · {r.titular_nombre}</strong><span className="text-xs text-slate-600">{r.inmueble?.nombre} · {r.solicitud_fuerza_mayor?.motivo}</span></span>
                <span className="text-sm font-medium text-violet-800">Revisar</span>
              </button>
            ))}
          </div>
        </Tarjeta>
      )}

      <Tarjeta className="mb-5 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Campo etiqueta="Región">
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className={clasesInput}
            >
              <option value="">Todas las regiones</option>
              {REGIONES.map((r) => (
                <option key={r.codigo} value={r.codigo}>
                  {r.nombre}
                </option>
              ))}
            </select>
          </Campo>

          <Campo etiqueta="Motivo">
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className={clasesInput}
            >
              <option value="">Todos los motivos</option>
              {MOTIVOS.map((m) => (
                <option key={m.valor} value={m.valor}>
                  {m.etiqueta}
                </option>
              ))}
            </select>
          </Campo>

          <Campo etiqueta="Buscar por titular, RUT, código o inmueble">
            <div className="relative">
              <Search
                size={16}
                className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Ej.: R-2026-0004"
                className={`${clasesInput} pl-9`}
              />
            </div>
          </Campo>
        </div>
        <p className="mt-3 border-t border-arena-200 pt-3 text-sm text-slate-600">
          {visibles.length} de {reservas.length} reservas
        </p>
      </Tarjeta>

      <FiltroEstados
        reservas={reservas}
        estados={['recibida', 'confirmada', 'en_curso', 'finalizada', 'lista_espera', 'fuerza_mayor_pendiente', 'fuerza_mayor_aprobada', 'fuerza_mayor_rechazada', 'anulada']}
        activo={estado}
        onCambiar={setEstado}
      />

      <TablaReservas
        reservas={visibles}
        mostrar={{ titular: true, region: true, monto: true }}
        vacio="No hay reservas que cumplan con los filtros aplicados."
      />

      <Modal
        abierto={Boolean(revision)}
        onCerrar={() => setRevision(null)}
        titulo="Revisar solicitud de fuerza mayor"
        descripcion={revision ? `${revision.codigo} · ${revision.titular_nombre}` : ''}
        focusInicial={false}
        pie={<><Boton variante="peligro" cargando={procesando} disabled={!fundamento.trim()} onClick={() => resolver(false)}>Rechazar</Boton><Boton cargando={procesando} disabled={!fundamento.trim()} onClick={() => resolver(true)}>Aprobar y recalcular</Boton></>}
      >
        {revision && <div className="space-y-4">
          <Aviso tono="info">Mientras esté pendiente, el monto mostrado es provisional y no debe enviarse a descuentos.</Aviso>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-slate-500">Motivo declarado</dt><dd className="font-medium text-slate-800">{revision.solicitud_fuerza_mayor?.motivo}</dd></div>
            <div><dt className="text-slate-500">Días de anticipación</dt><dd className="font-medium text-slate-800">{revision.dias_aviso}</dd></div>
            <div><dt className="text-slate-500">Respaldo</dt><dd className="font-medium text-slate-800">{revision.solicitud_fuerza_mayor?.respaldo?.nombre || 'Sin archivo'}</dd></div>
            <div><dt className="text-slate-500">Cobro original provisional</dt><dd className="font-medium text-slate-800">${revision.monto_total.toLocaleString('es-CL')}</dd></div>
          </dl>
          {revision.solicitud_fuerza_mayor?.respaldo && <Aviso tono="ambar">Respaldo demostrativo: {revision.solicitud_fuerza_mayor.respaldo.tipo || 'archivo'} · {Math.ceil(revision.solicitud_fuerza_mayor.respaldo.tamano / 1024)} KB. En la fase backend el botón abrirá el documento real.</Aviso>}
          <Campo etiqueta="Fundamento de la decisión" requerido ayuda="Quedará visible para el afiliado y en auditoría."><textarea value={fundamento} onChange={(e) => setFundamento(e.target.value)} rows={4} className={clasesInput} /></Campo>
        </div>}
      </Modal>
    </>
  )
}
