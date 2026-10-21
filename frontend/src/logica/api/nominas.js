/**
 * Nómina de descuentos por planilla: única fuente de los cobros a afiliados.
 *
 * Cada ítem de nómina es UNA CUOTA de un cobro, ubicada en el mes en que debe
 * descontarse. Check-out, anulación tardía y resolución de fuerza mayor pasan
 * todos por `registrarCobroEnNomina`; ningún otro código debe escribir ítems.
 */

import { store } from './store.js'
import { contarNoches } from '../lib/tarifas.js'
import { CONCEPTO_COBRO, etiquetaPeriodo, periodoMas, repartirCuotas } from '../lib/cobros.js'

function nominaDe(periodo) {
  let nomina = store.nominas.find((n) => n.periodo === periodo)
  if (!nomina) {
    nomina = { periodo, etiqueta: etiquetaPeriodo(periodo), estado_general: 'abierto', items: [] }
    store.nominas.push(nomina)
    store.nominas.sort((a, b) => (a.periodo < b.periodo ? 1 : -1))
  }
  return nomina
}

/** Ítems (cuotas) de una reserva en todas las nóminas. */
export function itemsDeReserva(codigo) {
  return store.nominas.flatMap((nomina) =>
    nomina.items.filter((item) => item.reserva_codigo === codigo).map((item) => ({ nomina, item })),
  )
}

/** true si alguna cuota ya salió hacia Remuneraciones (informada o descontada). */
export function cobroYaEnviado(codigo) {
  return itemsDeReserva(codigo).some(
    ({ item }) => !item.excluido_por_pago_transferencia && item.estado !== 'pendiente',
  )
}

/**
 * Crea o rehace las cuotas de una reserva en la nómina.
 * - Solo afiliados con monto > 0 y sin transferencia confirmada.
 * - Si alguna cuota ya fue informada/descontada no toca nada (devuelve false).
 * - La primera cuota va al mes del hecho que origina el cobro; las demás a los
 *   meses siguientes.
 */
export function registrarCobroEnNomina(reserva, fechaISO) {
  if (!reserva.titular_es_afiliado || !(reserva.monto_total > 0)) return false
  if (reserva.pago_transferencia?.estado === 'confirmado') return false
  if (cobroYaEnviado(reserva.codigo)) return false

  const existentes = itemsDeReserva(reserva.codigo)
  const periodoInicio = existentes.length
    ? existentes.map(({ item, nomina }) => item.periodo_inicio ?? nomina.periodo).sort()[0]
    : (fechaISO ?? new Date().toISOString()).slice(0, 7)

  for (const { nomina, item } of existentes) {
    nomina.items = nomina.items.filter((i) => i !== item)
  }
  store.nominas = store.nominas.filter((n) => n.items.length > 0 || n.estado_general === 'cerrado')

  const montos = repartirCuotas(reserva.monto_total, reserva.descuento_planilla?.cuotas ?? 1)
  const inmueble = store.inmuebles.find((i) => i.id === reserva.inmueble_id)?.nombre ?? '—'
  montos.forEach((monto, indice) => {
    nominaDe(periodoMas(periodoInicio, indice)).items.push({
      reserva_codigo: reserva.codigo,
      rut: reserva.titular_rut,
      nombre: reserva.titular_nombre,
      inmueble,
      concepto: CONCEPTO_COBRO[reserva.estado] ?? 'Cobro',
      noches: contarNoches(reserva.fecha_entrada, reserva.fecha_salida),
      cuota: indice + 1,
      total_cuotas: montos.length,
      monto,
      monto_total_reserva: reserva.monto_total,
      periodo_inicio: periodoInicio,
      medio_pago: 'planilla',
      estado: 'pendiente',
    })
  })
  return true
}
