/* Glosario visible y formatos cortos. Las etiquetas de estado salen de la lógica
   (logica/lib/estados.js: «Por confirmar», «Cancelada», «Emergencia …»); aquí solo el tono del chip. */
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { etiquetaEstado } from '../logica/lib/estados.js'
import { MOTIVOS } from '../logica/fixtures/tarifas.js'
import { nombreRegion } from '../logica/fixtures/inmuebles.js'

export { pesos, numero } from '../logica/lib/formato.js'
export { nombreRegion }

const TONO = {
  recibida: 'aviso',
  confirmada: 'correcto',
  en_curso: 'info',
  finalizada: 'info',
  lista_espera: 'info',
  rechazada: 'error',
  anulada: 'error',
  fuerza_mayor_pendiente: 'aviso',
  fuerza_mayor_aprobada: 'correcto',
  fuerza_mayor_rechazada: 'error',
}
export const tonoEstado = (e) => TONO[e] ?? 'info'
export { etiquetaEstado }

export const motivoCorto = (m) => MOTIVOS.find((x) => x.valor === m)?.corto ?? m
export const prelacion = (m) => MOTIVOS.find((x) => x.valor === m)?.prelacion ?? 9

const f = (iso, patron) => (iso ? format(parseISO(iso.slice(0, 10)), patron, { locale: es }) : '')
/** '2026-10-24' → '24 oct' */
export const dia = (iso) => f(iso, 'd MMM')
/** '2026-10-24' → 'sáb 24 oct' */
export const diaSemana = (iso) => f(iso, 'EEE d MMM')
/** '2026-10-24' → '24 oct 2026' */
export const fecha = (iso) => f(iso, 'd MMM yyyy')
/** '2026-10-24T10:15:00' → '24 oct, 10:15' */
export const fechaHora = (iso) => (iso ? format(parseISO(iso), 'd MMM, HH:mm', { locale: es }) : '')
export const rangoCorto = (a, b) => `${dia(a)} → ${dia(b)}`

export const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`
export const hoyISO = () => format(new Date(), 'yyyy-MM-dd')
