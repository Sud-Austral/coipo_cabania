/**
 * Sorteo de temporada alta (Art. 6 del reglamento).
 *
 * Decisiones de Bienestar/UIA (20-10-2026):
 * - Turnos fijos por casa de 7 noches, de sábado a sábado (Art. 6 b: máximo 7 noches).
 * - Cada postulante indica una sola opción (casa y turno) y se adjudica un solo período.
 * - Postulan funcionarios/as de CONAF activos/as y jubilados/as. Otros servicios
 *   públicos no postulan: solo toman vacantes después del sorteo (Art. 9).
 * - Prioridad para quien no fue adjudicado/a en la temporada alta anterior (Art. 6 a).
 * - Quien desistió sin aviso o no se presentó en la temporada alta anterior pierde
 *   la posibilidad en este sorteo (Art. 10 d).
 * - Lista de espera por turno; el cupo liberado se ofrece por correo a la siguiente
 *   persona, que tiene 48 horas para aceptar (Art. 6 d).
 */

import { diaSemana, sumarDias } from './fechas.js'
import { PARAMETROS } from './reglas.js'

export const HORAS_OFERTA = 48
const SABADO = 5

/** Turnos de una temporada: de sábado a sábado, dentro de sus fechas. */
export function turnosDe(temporada) {
  const n = PARAMETROS.noches_max_temporada_alta
  let d = temporada.desde
  while (diaSemana(d) !== SABADO) d = sumarDias(d, 1)
  const lista = []
  while (sumarDias(d, n) <= temporada.hasta) {
    lista.push({ entrada: d, salida: sumarDias(d, n), numero: lista.length + 1 })
    d = sumarDias(d, n)
  }
  return lista
}

/** Quién puede postular (decisión 20-10-2026). */
export const puedePostular = (u) => u?.calidad !== 'otro_servicio'

/** Generador determinista a partir de una semilla (el sorteo se puede repetir y auditar). */
export function azarDesde(semilla) {
  let s = semilla >>> 0 || 1
  return () => {
    // xorshift32
    s ^= s << 13
    s >>>= 0
    s ^= s >>> 17
    s ^= s << 5
    s >>>= 0
    return s / 4294967296
  }
}

/**
 * Realiza el sorteo. Recibe las postulaciones vigentes y la semilla; devuelve,
 * por postulación, su resultado:
 *   { codigo, resultado: 'adjudicada' | 'espera' | 'excluida', posicion?, motivo? }
 *
 * Por cada casa y turno: se excluye a quien perdió la posibilidad (Art. 10 d),
 * se ordena al azar y luego se ubica primero a quien tiene prioridad (Art. 6 a).
 * La primera persona se adjudica el turno; el resto queda en lista de espera
 * en ese orden.
 */
export function sortear(postulaciones, semilla) {
  const azar = azarDesde(semilla)
  const resultados = []
  const grupos = new Map()
  // Orden estable antes de barajar, para que la misma semilla dé el mismo resultado.
  const ordenadas = [...postulaciones].sort((a, b) => (a.codigo < b.codigo ? -1 : 1))
  for (const p of ordenadas) {
    if (p.pierde_posibilidad) {
      resultados.push({ codigo: p.codigo, resultado: 'excluida', motivo: 'Desistió sin aviso o no se presentó en la temporada alta anterior (Art. 10 d).' })
      continue
    }
    const clave = `${p.casa_id}|${p.turno}`
    if (!grupos.has(clave)) grupos.set(clave, [])
    grupos.get(clave).push(p)
  }
  for (const lista of grupos.values()) {
    const conNumero = lista.map((p) => ({ p, n: azar() }))
    conNumero.sort((a, b) => (a.p.prioridad === b.p.prioridad ? a.n - b.n : a.p.prioridad ? -1 : 1))
    conNumero.forEach(({ p }, i) =>
      resultados.push(i === 0 ? { codigo: p.codigo, resultado: 'adjudicada' } : { codigo: p.codigo, resultado: 'espera', posicion: i }),
    )
  }
  return resultados
}

export const ESTADOS_POSTULACION = {
  postulada: { etiqueta: 'Postulada', clase: 'bg-sky-100 text-sky-800' },
  adjudicada: { etiqueta: 'Adjudicada', clase: 'bg-verde-100 text-verde-800' },
  espera: { etiqueta: 'En lista de espera', clase: 'bg-alerta-50 text-alerta-700' },
  ofertada: { etiqueta: 'Cupo ofrecido', clase: 'bg-alerta-50 text-alerta-700' },
  excluida: { etiqueta: 'Sin posibilidad', clase: 'bg-stone-200 text-tinta-700' },
  sin_cupo: { etiqueta: 'Sin cupo', clase: 'bg-stone-200 text-tinta-700' },
  retirada: { etiqueta: 'Retirada', clase: 'bg-stone-100 text-tinta-500' },
}
