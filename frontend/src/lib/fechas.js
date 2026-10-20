/**
 * Fechas como texto ISO 'AAAA-MM-DD' (sin hora ni zona), que es como las
 * entregará la API. Se comparan como texto: '2026-11-03' < '2026-11-10'.
 */

const aFecha = (iso) => {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, d))
}
const aISO = (f) => f.toISOString().slice(0, 10)

export function hoyISO() {
  const f = new Date()
  return aISO(new Date(Date.UTC(f.getFullYear(), f.getMonth(), f.getDate())))
}

export const sumarDias = (iso, n) => {
  const f = aFecha(iso)
  f.setUTCDate(f.getUTCDate() + n)
  return aISO(f)
}

/** Días entre dos fechas (b − a). */
export const diasEntre = (a, b) => Math.round((aFecha(b) - aFecha(a)) / 86400000)

export const mesDe = (iso) => iso.slice(0, 7)

export const primerDiaMes = (iso) => iso.slice(0, 8) + '01'

export const sumarMeses = (iso, n) => {
  const f = aFecha(primerDiaMes(iso))
  f.setUTCMonth(f.getUTCMonth() + n)
  return aISO(f)
}

/** Día de la semana con lunes = 0. */
export const diaSemana = (iso) => (aFecha(iso).getUTCDay() + 6) % 7

export const diasDelMes = (iso) => {
  const f = aFecha(primerDiaMes(iso))
  f.setUTCMonth(f.getUTCMonth() + 1)
  f.setUTCDate(0)
  return f.getUTCDate()
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']

export const nombreMes = (iso) => `${MESES[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`

/** '14 nov' o '14 nov 2026' */
export const fechaCorta = (iso, conAnio = false) => {
  const t = `${Number(iso.slice(8, 10))} ${MESES_CORTOS[Number(iso.slice(5, 7)) - 1]}`
  return conAnio ? `${t} ${iso.slice(0, 4)}` : t
}

/** 'sábado 14 de noviembre de 2026' */
export const fechaLarga = (iso) =>
  `${DIAS[diaSemana(iso)]} ${Number(iso.slice(8, 10))} de ${MESES[Number(iso.slice(5, 7)) - 1]} de ${iso.slice(0, 4)}`

/** '14 – 18 nov 2026' o '28 nov – 2 dic 2026' */
export function rangoFechas(entrada, salida) {
  if (mesDe(entrada) === mesDe(salida)) return `${Number(entrada.slice(8, 10))} – ${fechaCorta(salida, true)}`
  if (entrada.slice(0, 4) === salida.slice(0, 4)) return `${fechaCorta(entrada)} – ${fechaCorta(salida, true)}`
  return `${fechaCorta(entrada, true)} – ${fechaCorta(salida, true)}`
}
