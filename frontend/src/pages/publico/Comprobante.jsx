import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  CheckCircle2,
  ClipboardList,
  Download,
  Mail,
  MapPin,
  Printer,
} from 'lucide-react'
import { getReserva } from '../../api/reservas.js'
import { ESTADOS } from '../../lib/estados.js'
import { MOTIVOS, PARENTESCOS } from '../../fixtures/tarifas.js'
import { nombreRegion } from '../../fixtures/inmuebles.js'
import { fechaHora, fechaLarga, pesos } from '../../lib/formato.js'
import { contarNoches } from '../../lib/tarifas.js'
import { BadgeEstado, Badge } from '../../components/ui/Badge.jsx'
import { Aviso, Boton, Cargando, Tarjeta } from '../../components/ui/Elementos.jsx'
import { ResumenTarifa } from '../../components/reservas/ResumenTarifa.jsx'

export function Comprobante() {
  const { codigo } = useParams()
  const [reserva, setReserva] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let vigente = true
    getReserva(codigo)
      .then((r) => vigente && setReserva(r))
      .catch(() => vigente && setReserva(null))
      .finally(() => vigente && setCargando(false))
    return () => {
      vigente = false
    }
  }, [codigo])

  if (cargando) return <Cargando texto="Cargando el comprobante…" />

  if (!reserva) {
    return (
      <Aviso tono="rojo" titulo="Comprobante no encontrado">
        <Link to="/mis-reservas" className="underline">
          Ver mis reservas
        </Link>
      </Aviso>
    )
  }

  const motivo = MOTIVOS.find((m) => m.valor === reserva.motivo)
  const tarifa = {
    noches: contarNoches(reserva.fecha_entrada, reserva.fecha_salida),
    lineas: reserva.detalle_tarifa ?? [],
    total: reserva.monto_total,
    nombre_temporada: reserva.nombre_temporada ?? null,
  }

  return (
    <>
      <div className="no-imprimir mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-verde-900">Comprobante de solicitud</h1>
          <p className="mt-1 text-sm text-slate-600">
            Guarde este comprobante como respaldo de su solicitud.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Boton variante="neutro" onClick={() => window.print()}>
            <Printer size={15} aria-hidden="true" />
            Imprimir
          </Boton>
          <Boton variante="secundario" onClick={() => window.print()}>
            <Download size={15} aria-hidden="true" />
            Guardar como PDF
          </Boton>
          <Link
            to="/mis-reservas"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-arena-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-arena-50"
          >
            <ClipboardList size={15} aria-hidden="true" />
            Mis reservas
          </Link>
        </div>
      </div>

      {reserva.estado === 'recibida' && (
        <div className="no-imprimir mb-5">
          <Aviso
            tono="verde"
            icono={CheckCircle2}
            titulo="Su solicitud fue registrada correctamente"
          >
            La encargada regional revisará la solicitud y usted recibirá la confirmación por
            correo electrónico. Puede seguir el estado en «Mis reservas».
          </Aviso>
        </div>
      )}

      {reserva.estado === 'lista_espera' && (
        <div className="no-imprimir mb-5">
          <Aviso tono="ambar" titulo="Su solicitud quedó en lista de espera">
            {reserva.observaciones ??
              'No hay cupo disponible en las fechas solicitadas. Si se libera un cupo, se le informará.'}
          </Aviso>
        </div>
      )}

      {reserva.estado === 'rechazada' && (
        <div className="no-imprimir mb-5"><Aviso tono="rojo" titulo="Solicitud rechazada">
          {reserva.fundamento || 'La encargada regional rechazó esta solicitud.'}
        </Aviso></div>
      )}

      {reserva.estado === 'fuerza_mayor_pendiente' && (
        <div className="no-imprimir mb-5"><Aviso tono="info" titulo="Fuerza mayor en revisión">
          El monto mostrado es provisional. No se incorporará a descuentos hasta que Oficina Central resuelva la solicitud.
        </Aviso></div>
      )}

      <Tarjeta className="overflow-hidden">
        {/* Encabezado tipo folio */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-arena-200 bg-verde-50 px-5 py-4">
          <div>
            <p className="text-xs tracking-wide text-verde-700 uppercase">
              Servicio de Bienestar CONAF · Red de Casas de Huéspedes y Veraneo
            </p>
            <p className="tabular mt-1 text-xl font-semibold text-verde-900">
              {reserva.codigo}
            </p>
            <p className="mt-0.5 text-xs text-slate-600">
              Emitido el {fechaHora(reserva.creada_en)}
            </p>
          </div>
          <div className="text-right">
            <BadgeEstado estado={reserva.estado} />
            <p className="mt-1.5 max-w-xs text-xs text-slate-600">
              {ESTADOS[reserva.estado]?.descripcion}
            </p>
          </div>
        </div>

        <div className="grid gap-6 p-5 md:grid-cols-2">
          {/* Inmueble */}
          <section>
            <h2 className="mb-2 text-sm font-semibold tracking-wide text-slate-500 uppercase">
              Inmueble
            </h2>
            <p className="font-medium text-slate-800">{reserva.inmueble?.nombre}</p>
            <p className="mt-1 flex items-start gap-1.5 text-sm text-slate-600">
              <MapPin size={14} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
              {reserva.inmueble?.direccion} · {nombreRegion(reserva.inmueble?.region)}
            </p>
          </section>

          {/* Estadía */}
          <section>
            <h2 className="mb-2 text-sm font-semibold tracking-wide text-slate-500 uppercase">
              Estadía
            </h2>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Ingreso</dt>
                <dd className="text-right font-medium text-slate-800">
                  {fechaLarga(reserva.fecha_entrada)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Salida</dt>
                <dd className="text-right font-medium text-slate-800">
                  {fechaLarga(reserva.fecha_salida)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Motivo</dt>
                <dd className="text-right font-medium text-slate-800">{motivo?.etiqueta}</dd>
              </div>
            </dl>
          </section>

          {/* Titular */}
          <section>
            <h2 className="mb-2 text-sm font-semibold tracking-wide text-slate-500 uppercase">
              Titular
            </h2>
            <p className="font-medium text-slate-800">{reserva.titular_nombre}</p>
            <p className="tabular text-sm text-slate-600">{reserva.titular_rut}</p>
            <p className="mt-1.5">
              <Badge tono={reserva.titular_es_afiliado ? 'verde' : 'ambar'}>
                {reserva.titular_es_afiliado
                  ? 'Afiliado vigente al Servicio de Bienestar'
                  : 'Usuario no afiliado'}
              </Badge>
            </p>
          </section>

          {/* Ocupantes */}
          <section>
            <h2 className="mb-2 text-sm font-semibold tracking-wide text-slate-500 uppercase">
              Ocupantes registrados ({reserva.ocupantes?.length ?? 0})
            </h2>
            <ul className="space-y-1.5 text-sm">
              {(reserva.ocupantes ?? []).map((o, i) => (
                <li key={`${o.rut}-${i}`} className="flex justify-between gap-3">
                  <span className="text-slate-700">{o.nombre}</span>
                  <span className="text-right text-xs whitespace-nowrap text-slate-500">
                    {PARENTESCOS.find((p) => p.valor === o.parentesco)?.etiqueta}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Cobro */}
        <div className="border-t border-arena-200 px-5 py-4">
          <h2 className="mb-2.5 text-sm font-semibold tracking-wide text-slate-500 uppercase">
            {reserva.estado === 'fuerza_mayor_pendiente' ? 'Cobro provisional pendiente de resolución' : 'Detalle del cobro estimado'}
          </h2>
          {tarifa.lineas.length > 0 ? (
            <ResumenTarifa tarifa={tarifa} compacto />
          ) : (
            <p className="flex items-center justify-between border-t-2 border-verde-600 pt-2.5">
              <span className="font-semibold text-verde-900">Total estimado</span>
              <span className="tabular text-lg font-semibold text-verde-900">
                {pesos(reserva.monto_total)}
              </span>
            </p>
          )}
        </div>

        {reserva.solicitud_fuerza_mayor && (
          <div className="border-t border-violet-200 bg-violet-50/60 px-5 py-4">
            <h2 className="mb-3 text-sm font-semibold tracking-wide text-violet-800 uppercase">Solicitud de fuerza mayor</h2>
            <dl className="grid gap-3 text-sm md:grid-cols-2">
              <div><dt className="text-slate-500">Motivo presentado</dt><dd className="mt-0.5 font-medium text-slate-800">{reserva.solicitud_fuerza_mayor.motivo}</dd></div>
              <div><dt className="text-slate-500">Respaldo</dt><dd className="mt-0.5 font-medium text-slate-800">{reserva.solicitud_fuerza_mayor.respaldo?.nombre || 'Sin archivo adjunto'}</dd></div>
              <div><dt className="text-slate-500">Fecha de solicitud</dt><dd className="mt-0.5 font-medium text-slate-800">{fechaHora(reserva.solicitud_fuerza_mayor.creada_en)}</dd></div>
              <div><dt className="text-slate-500">Resultado</dt><dd className="mt-0.5 font-medium text-slate-800">{reserva.solicitud_fuerza_mayor.estado}</dd></div>
            </dl>
            {reserva.solicitud_fuerza_mayor.fundamento_resolucion && <Aviso tono={reserva.solicitud_fuerza_mayor.estado === 'aprobada' ? 'verde' : 'rojo'} titulo="Fundamento de Oficina Central">{reserva.solicitud_fuerza_mayor.fundamento_resolucion}</Aviso>}
          </div>
        )}

        {/* Observaciones y trazabilidad */}
        {reserva.observaciones && (
          <div className="border-t border-arena-200 px-5 py-4">
            <h2 className="mb-1.5 text-sm font-semibold tracking-wide text-slate-500 uppercase">
              Observaciones
            </h2>
            <p className="text-sm text-slate-700">{reserva.observaciones}</p>
          </div>
        )}

        <div className="border-t border-arena-200 bg-arena-50 px-5 py-4">
          <h2 className="mb-2 text-sm font-semibold tracking-wide text-slate-500 uppercase">
            Trazabilidad de la solicitud
          </h2>
          <ol className="space-y-2">
            {(reserva.historial_estados ?? []).map((h, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2 text-sm">
                <BadgeEstado estado={h.estado} />
                <span className="text-slate-600">{fechaHora(h.fecha)}</span>
                {h.por && <span className="text-xs text-slate-500">· registrado por {h.por}</span>}
              </li>
            ))}
          </ol>
        </div>

        <div className="border-t border-arena-200 px-5 py-3.5">
          <p className="flex items-start gap-2 text-xs text-slate-500">
            <Mail size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              En el sistema definitivo, cada cambio de estado (recibida, confirmada, rechazada,
              en lista de espera o anulada) se notifica por correo electrónico al titular. En
              esta maqueta las notificaciones se representan solo en pantalla.
            </span>
          </p>
        </div>
      </Tarjeta>
    </>
  )
}
