/**
 * Indicadores para la toma de decisiones (dashboard de la Oficina Central).
 *
 * Reglas de cálculo, para replicarlas en el backend:
 * - Reserva efectiva: confirmada, en curso o finalizada. No cuentan las
 *   solicitudes pendientes, las no asignadas, las desistidas ni las anuladas.
 * - Noches del período: noches de cada estadía que caen dentro del período.
 * - Ingresos: valor de esas noches (total / noches × noches en el período)
 *   más los cargos por desistimiento avisados dentro del período.
 * - Ocupación: noches ocupadas / (casas activas × días del período).
 * - Usuarios: RUT distintos con al menos una reserva efectiva que comienza
 *   en el período.
 */

import { diasEntre, mesDe, primerDiaMes, sumarMeses } from './fechas.js'

const EFECTIVA = ['confirmada']
const solape = (a1, a2, b1, b2) => Math.max(0, diasEntre(a1 > b1 ? a1 : b1, a2 < b2 ? a2 : b2))
const agrupar = (lista, clave) =>
  lista.reduce((m, x) => {
    const k = clave(x)
    ;(m[k] ??= []).push(x)
    return m
  }, {})

export function calcularIndicadores({ reservas, casas, desde, hasta, region }) {
  const casasR = casas.filter((c) => c.activa && (!region || c.region === region))
  const ids = new Set(casasR.map((c) => c.id))
  const rs = reservas.filter((r) => ids.has(r.casa_id))
  const dias = Math.max(1, diasEntre(desde, hasta))

  const efectivas = rs.filter((r) => EFECTIVA.includes(r.estado))
  const conNoches = efectivas
    .map((r) => {
      const n = solape(r.entrada, r.salida, desde, hasta)
      const total = diasEntre(r.entrada, r.salida)
      return { r, n, ingreso: total ? (r.total / total) * n : 0 }
    })
    .filter((x) => x.n > 0)
  const cargos = rs.filter((r) => r.estado === 'desistida' && r.cargo_desistimiento > 0 && r.desistida_en >= desde && r.desistida_en < hasta)
  const inician = efectivas.filter((r) => r.entrada >= desde && r.entrada < hasta)

  const nochesTot = conNoches.reduce((s, x) => s + x.n, 0)
  const ingresosTot = conNoches.reduce((s, x) => s + x.ingreso, 0) + cargos.reduce((s, r) => s + r.cargo_desistimiento, 0)

  const solicitudes = rs.filter((r) => r.entrada >= desde && r.entrada < hasta)

  // Por casa
  const porCasa = casasR
    .map((c) => {
      const xs = conNoches.filter((x) => x.r.casa_id === c.id)
      const n = xs.reduce((s, x) => s + x.n, 0)
      return {
        casa: c,
        noches: n,
        ocupacion: n / dias,
        ingresos: xs.reduce((s, x) => s + x.ingreso, 0) + cargos.filter((r) => r.casa_id === c.id).reduce((s, r) => s + r.cargo_desistimiento, 0),
        reservas: inician.filter((r) => r.casa_id === c.id).length,
        usuarios: new Set(inician.filter((r) => r.casa_id === c.id).map((r) => r.titular.rut)).size,
      }
    })
    .sort((a, b) => b.noches - a.noches)

  // Por región
  const porRegion = Object.entries(agrupar(porCasa, (x) => x.casa.region))
    .map(([reg, xs]) => ({ region: reg, casas: xs.length, noches: xs.reduce((s, x) => s + x.noches, 0), ocupacion: xs.reduce((s, x) => s + x.noches, 0) / (xs.length * dias), ingresos: xs.reduce((s, x) => s + x.ingresos, 0) }))
    .sort((a, b) => b.ocupacion - a.ocupacion)

  // Por calidad y forma de pago (reservas que comienzan en el período)
  const porCalidad = Object.entries(agrupar(inician, (r) => r.titular.calidad))
    .map(([k, xs]) => ({ clave: k, reservas: xs.length, usuarios: new Set(xs.map((r) => r.titular.rut)).size, ingresos: xs.reduce((s, r) => s + r.total, 0) }))
    .sort((a, b) => b.reservas - a.reservas)
  const porPago = Object.entries(agrupar(inician, (r) => r.forma_pago.tipo))
    .map(([k, xs]) => ({ clave: k, reservas: xs.length }))
    .sort((a, b) => b.reservas - a.reservas)

  // Por mes
  const meses = []
  for (let m = primerDiaMes(desde); m < hasta; m = sumarMeses(m, 1)) meses.push(mesDe(m))
  const porMes = meses.map((m) => {
    const ini = m + '-01' > desde ? m + '-01' : desde
    const fin = sumarMeses(m + '-01', 1) < hasta ? sumarMeses(m + '-01', 1) : hasta
    let n = 0
    let ing = 0
    for (const x of conNoches) {
      const k = solape(x.r.entrada, x.r.salida, ini, fin)
      if (k) {
        n += k
        ing += (x.r.total / diasEntre(x.r.entrada, x.r.salida)) * k
      }
    }
    ing += cargos.filter((r) => mesDe(r.desistida_en) === m).reduce((s, r) => s + r.cargo_desistimiento, 0)
    return { mes: m, noches: n, ingresos: ing, ocupacion: n / (casasR.length * Math.max(1, diasEntre(ini, fin))) }
  })

  const promedio = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0)

  return {
    dias,
    casasActivas: casasR.length,
    usuarios: new Set(inician.map((r) => r.titular.rut)).size,
    reservas: inician.length,
    noches: nochesTot,
    ocupacion: nochesTot / (casasR.length * dias || 1),
    ingresos: ingresosTot,
    ingresoPorNoche: nochesTot ? ingresosTot / nochesTot : 0,
    estadiaPromedio: promedio(inician.map((r) => diasEntre(r.entrada, r.salida))),
    personasPromedio: promedio(inician.map((r) => r.ocupantes.length)),
    anticipacionPromedio: promedio(inician.map((r) => diasEntre(r.creada_en.slice(0, 10), r.entrada))),
    tasaDesistimiento: solicitudes.length ? solicitudes.filter((r) => r.estado === 'desistida').length / solicitudes.length : 0,
    tasaAnulacion: solicitudes.length ? solicitudes.filter((r) => r.estado === 'anulada').length / solicitudes.length : 0,
    anuladas: solicitudes.filter((r) => r.estado === 'anulada').length,
    cargosDesistimiento: cargos.reduce((s, r) => s + r.cargo_desistimiento, 0),
    porCasa,
    porRegion,
    porCalidad,
    porPago,
    porMes,
  }
}
