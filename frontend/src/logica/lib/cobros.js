/**
 * Reglas puras de cobro y nómina de descuentos — MÓDULO PURO.
 *
 * Sin React ni store: se porta tal cual al backend en la fase 2.
 */

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

/** Estados de reserva que generan un cobro (si el monto es mayor que cero). */
export const ESTADOS_CON_COBRO = ['finalizada', 'anulada', 'fuerza_mayor_aprobada', 'fuerza_mayor_rechazada']

export const CONCEPTO_COBRO = {
  finalizada: 'Estadía',
  anulada: 'Cancelación con poco aviso',
  fuerza_mayor_aprobada: 'Emergencia aprobada',
  fuerza_mayor_rechazada: 'Emergencia rechazada',
}

export const MEDIOS_PAGO = {
  planilla: 'Descuento por planilla',
  transferencia: 'Transferencia',
  por_pagar: 'Pendiente de pago',
}

/** Reparte un total en N cuotas enteras; la diferencia por redondeo va a la última. */
export function repartirCuotas(total, n) {
  const cuotas = Math.max(1, Number(n) || 1)
  const base = Math.floor(total / cuotas)
  return Array.from({ length: cuotas }, (_, i) => (i === cuotas - 1 ? total - base * (cuotas - 1) : base))
}

/** '2026-11' + 3 → '2027-02'. */
export function periodoMas(periodo, meses) {
  const [anio, mes] = periodo.split('-').map(Number)
  const indice = anio * 12 + (mes - 1) + meses
  return `${Math.floor(indice / 12)}-${String((indice % 12) + 1).padStart(2, '0')}`
}

/** '2026-07' → 'Julio 2026'. */
export function etiquetaPeriodo(periodo) {
  const [anio, mes] = periodo.split('-')
  return `${MESES[Number(mes) - 1]} ${anio}`.replace(/^./, (c) => c.toUpperCase())
}
