import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Building2, CheckCircle2, Landmark, Send, Upload } from 'lucide-react'
import {
  getDatosTransferencia,
  getReserva,
  informarPagoTransferencia,
} from '../../api/reservas.js'
import { fechaCorta, pesos } from '../../lib/formato.js'
import { useRol } from '../../context/RolContext.jsx'
import { Aviso, Boton, Campo, Cargando, Tarjeta, TituloSeccion, clasesInput } from '../../components/ui/Elementos.jsx'

export function PagoTransferencia() {
  const { codigo } = useParams()
  const { usuario, actor } = useRol()
  const [reserva, setReserva] = useState(null)
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [comprobante, setComprobante] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let vigente = true
    Promise.all([getReserva(codigo), getDatosTransferencia()])
      .then(([r, d]) => {
        if (!vigente) return
        setReserva(r)
        setDatos(d)
      })
      .catch((e) => vigente && setError(e.detail ?? 'No fue posible cargar los datos del pago.'))
      .finally(() => vigente && setCargando(false))
    return () => { vigente = false }
  }, [codigo])

  const perteneceAlUsuario = reserva && reserva.usuario_id === usuario?.id
  const puedeInformar =
    perteneceAlUsuario &&
    reserva?.estado === 'finalizada' &&
    reserva?.monto_total > 0 &&
    !reserva?.pago_transferencia

  const enviarPago = async () => {
    setEnviando(true)
    setError(null)
    try {
      const actualizado = await informarPagoTransferencia(
        codigo,
        {
          comprobante: comprobante
            ? { nombre: comprobante.name, tamano: comprobante.size, tipo: comprobante.type }
            : null,
          actor,
        },
      )
      setReserva(actualizado)
    } catch (e) {
      setError(e.detail ?? 'No fue posible informar la transferencia.')
    } finally {
      setEnviando(false)
    }
  }

  if (cargando) return <Cargando texto="Cargando pago por transferencia…" />

  if (!reserva || !perteneceAlUsuario) {
    return (
      <Aviso tono="rojo" titulo="Reserva no disponible">
        No puede acceder a la información de pago de esta reserva.
      </Aviso>
    )
  }

  const pago = reserva.pago_transferencia

  return (
    <>
      <Link to="/mis-reservas" className="mb-4 inline-flex items-center gap-1.5 text-sm text-verde-700 hover:underline">
        <ArrowLeft size={15} aria-hidden="true" />
        Volver a Mis reservas
      </Link>

      <TituloSeccion
        titulo="Pago por transferencia"
        descripcion={`${reserva.codigo} · ${reserva.inmueble?.nombre ?? 'Reserva'} · estadía ${fechaCorta(reserva.fecha_entrada)} → ${fechaCorta(reserva.fecha_salida)}`}
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {reserva.estado !== 'finalizada' && (
            <Aviso tono="ambar" titulo="Disponible después del check-out">
              El pago por transferencia se habilita cuando la estadía queda finalizada mediante check-out.
            </Aviso>
          )}

          {pago?.estado === 'informado' && (
            <Aviso tono="ambar" titulo="Transferencia informada">
              Su pago por {pesos(pago.monto)} fue informado. Oficina Central debe confirmar la recepción antes de considerarlo pagado.
            </Aviso>
          )}

          {pago?.estado === 'confirmado' && (
            <Aviso tono="verde" titulo="Pago confirmado" icono={CheckCircle2}>
              Oficina Central confirmó el pago total por transferencia. Esta reserva ya no será enviada a descuento por planilla.
            </Aviso>
          )}

          <Tarjeta className="p-5">
            <div className="flex items-center gap-2 text-verde-900">
              <Landmark size={19} aria-hidden="true" />
              <h2 className="text-lg font-semibold">Datos para realizar la transferencia</h2>
            </div>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                ['Banco', datos?.banco],
                ['Tipo de cuenta', datos?.tipo_cuenta],
                ['N° de cuenta', datos?.numero_cuenta],
                ['Titular', datos?.titular],
                ['RUT', datos?.rut],
                ['Correo', datos?.correo],
              ].map(([etiqueta, valor]) => (
                <div key={etiqueta} className="rounded-lg bg-arena-50 px-3 py-2.5">
                  <dt className="text-xs text-slate-500">{etiqueta}</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-slate-800">{valor ?? '—'}</dd>
                </div>
              ))}
            </dl>
            <Aviso tono="info" titulo="Referencia de transferencia">
              Use <strong>{reserva.codigo}</strong> como referencia y transfiera exactamente <strong>{pesos(reserva.monto_total)}</strong>.
            </Aviso>
            {datos?.nota && <p className="mt-3 text-xs text-slate-500">{datos.nota}</p>}
          </Tarjeta>

          {!pago && reserva.estado === 'finalizada' && (
            <Tarjeta className="p-5">
              <div className="flex items-center gap-2 text-verde-900">
                <Upload size={19} aria-hidden="true" />
                <h2 className="text-lg font-semibold">Informar pago realizado</h2>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Después de realizar la transferencia, envíe el aviso para que Oficina Central pueda conciliar y confirmar el pago.
              </p>
              <div className="mt-4">
                <Campo etiqueta="Comprobante de transferencia (opcional)" ayuda="En esta maqueta se guarda solamente el nombre y metadatos del archivo.">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                    onChange={(e) => setComprobante(e.target.files?.[0] ?? null)}
                    className={clasesInput}
                  />
                </Campo>
              </div>
              {error && <div className="mt-3"><Aviso tono="rojo">{error}</Aviso></div>}
              <div className="mt-5 flex justify-end">
                <Boton cargando={enviando} disabled={!puedeInformar} onClick={enviarPago}>
                  <Send size={16} aria-hidden="true" />
                  Enviar pago
                </Boton>
              </div>
            </Tarjeta>
          )}
        </div>

        <Tarjeta className="h-fit p-5">
          <div className="flex items-center gap-2 text-verde-900">
            <Building2 size={18} aria-hidden="true" />
            <h2 className="font-semibold">Resumen</h2>
          </div>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Reserva</dt><dd className="font-medium">{reserva.codigo}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Titular</dt><dd className="text-right font-medium">{reserva.titular_nombre}</dd></div>
            <div className="flex justify-between gap-3 border-t border-arena-200 pt-3"><dt className="text-slate-700">Total a pagar</dt><dd className="tabular text-lg font-semibold text-verde-900">{pesos(reserva.monto_total)}</dd></div>
          </dl>
        </Tarjeta>
      </div>
    </>
  )
}
