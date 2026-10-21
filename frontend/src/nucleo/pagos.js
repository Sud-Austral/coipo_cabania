/* Situación de pago de una reserva vista por su titular. Solo LEE la lógica
   (nómina de descuentos y pago por transferencia); las reglas viven en logica/api. */
import { ESTADOS_CON_COBRO } from '../logica/lib/cobros.js'
import { cobroYaEnviado, itemsDeReserva } from '../logica/api/nominas.js'

export function situacionPago(r) {
  if (!ESTADOS_CON_COBRO.includes(r.estado) || !(r.monto_total > 0)) return null
  const t = r.pago_transferencia?.estado
  if (t === 'confirmado') return { clave: 'pagado', texto: 'Pagado', tono: 'correcto' }
  if (t === 'informado') return { clave: 'transferencia', texto: 'Transferencia por confirmar', tono: 'aviso' }
  if (r.titular_es_afiliado) {
    const cuotas = itemsDeReserva(r.codigo).filter(({ item }) => !item.excluido_por_pago_transferencia)
    if (cuotas.length && cuotas.every(({ item }) => item.estado === 'descontado')) return { clave: 'pagado', texto: 'Pagado', tono: 'correcto' }
    if (cobroYaEnviado(r.codigo)) return { clave: 'enviado', texto: 'Descuento por sueldo · Enviado', tono: 'info' }
    if (r.descuento_planilla) return { clave: 'planilla', texto: `Descuento por sueldo · ${r.descuento_planilla.cuotas} cuota(s)`, tono: 'info', cambiable: true }
  }
  return { clave: 'elegir', texto: 'Por pagar', tono: 'aviso', cambiable: true }
}

export const porPagar = (r) => situacionPago(r)?.clave === 'elegir'
