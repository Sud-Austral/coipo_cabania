import { Link } from 'react-router-dom'
import { MOTIVOS } from '../../fixtures/tarifas.js'
import { nombreRegion } from '../../fixtures/inmuebles.js'
import { fechaCorta, pesos } from '../../lib/formato.js'
import { BadgeEstado } from '../ui/Badge.jsx'
import { Tabla, Encabezado, Cuerpo, Fila, Celda } from '../ui/Tabla.jsx'
import { EstadoVacio } from '../ui/Elementos.jsx'

const etiquetaMotivo = (valor) => MOTIVOS.find((m) => m.valor === valor)?.etiqueta ?? valor

/**
 * Tabla de reservas reutilizable: la usan «Mis reservas», el panel regional y
 * el panel de Oficina Central. Las columnas se ajustan con `mostrar`.
 */
export function TablaReservas({
  reservas,
  mostrar = { titular: true, region: false, monto: true },
  acciones,
  vacio = 'No hay reservas para mostrar.',
}) {
  if (!reservas.length) {
    return <EstadoVacio titulo="Sin reservas" descripcion={vacio} />
  }

  const columnas = [
    { clave: 'codigo', titulo: 'Código' },
    { clave: 'inmueble', titulo: 'Inmueble' },
    ...(mostrar.region ? [{ clave: 'region', titulo: 'Región' }] : []),
    ...(mostrar.titular ? [{ clave: 'titular', titulo: 'Titular' }] : []),
    { clave: 'fechas', titulo: 'Fechas' },
    { clave: 'motivo', titulo: 'Motivo' },
    { clave: 'estado', titulo: 'Estado' },
    ...(mostrar.monto ? [{ clave: 'monto', titulo: 'Monto', alineacion: 'derecha' }] : []),
    ...(acciones ? [{ clave: 'acciones', titulo: '' }] : []),
  ]

  return (
    <Tabla>
      <Encabezado columnas={columnas} />
      <Cuerpo>
        {reservas.map((r) => (
          <Fila key={r.codigo}>
            <Celda>
              <Link
                to={`/reservas/${r.codigo}`}
                className="tabular font-medium text-verde-700 hover:underline"
              >
                {r.codigo}
              </Link>
            </Celda>
            <Celda>
              <span className="block text-slate-800">{r.inmueble?.nombre ?? '—'}</span>
              <span className="block text-xs text-slate-500">{r.inmueble?.localidad}</span>
            </Celda>
            {mostrar.region && (
              <Celda className="text-slate-600">{nombreRegion(r.inmueble?.region)}</Celda>
            )}
            {mostrar.titular && (
              <Celda>
                <span className="block text-slate-800">{r.titular_nombre}</span>
                <span className="tabular block text-xs text-slate-500">{r.titular_rut}</span>
              </Celda>
            )}
            <Celda className="tabular whitespace-nowrap text-slate-600">
              {fechaCorta(r.fecha_entrada)} → {fechaCorta(r.fecha_salida)}
            </Celda>
            <Celda className="text-slate-600">{etiquetaMotivo(r.motivo)}</Celda>
            <Celda>
              <BadgeEstado estado={r.estado} />
            </Celda>
            {mostrar.monto && <Celda numerica>{pesos(r.monto_total)}</Celda>}
            {acciones && <Celda>{acciones(r)}</Celda>}
          </Fila>
        ))}
      </Cuerpo>
    </Tabla>
  )
}

/** Pestañas de filtro por estado, con contador. */
export function FiltroEstados({ reservas, estados, activo, onCambiar }) {
  const cuenta = (estado) =>
    estado === 'todos' ? reservas.length : reservas.filter((r) => r.estado === estado).length

  return (
    <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Filtrar por estado">
      {['todos', ...estados].map((estado) => {
        const activoEste = activo === estado
        return (
          <button
            key={estado}
            type="button"
            role="tab"
            aria-selected={activoEste}
            onClick={() => onCambiar(estado)}
            className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3.5 py-2 text-sm transition-colors ${
              activoEste
                ? 'border-verde-600 bg-verde-600 text-white'
                : 'border-arena-200 bg-white text-slate-700 hover:bg-arena-50'
            }`}
          >
            {estado === 'todos' ? 'Todas' : etiquetaEstadoTab(estado)}
            <span
              className={`tabular rounded-full px-1.5 text-xs ${
                activoEste ? 'bg-white/20' : 'bg-arena-100 text-slate-600'
              }`}
            >
              {cuenta(estado)}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function etiquetaEstadoTab(estado) {
  const etiquetas = {
    recibida: 'Solicitadas',
    confirmada: 'Confirmadas',
    en_curso: 'En curso',
    finalizada: 'Finalizadas',
    lista_espera: 'Lista de espera',
    rechazada: 'Rechazadas',
    fuerza_mayor_pendiente: 'Fuerza mayor',
    fuerza_mayor_aprobada: 'Fuerza mayor aprobada',
    fuerza_mayor_rechazada: 'Fuerza mayor rechazada',
    anulada: 'Anuladas',
  }
  return etiquetas[estado] ?? estado
}
