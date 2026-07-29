/** Utilidades de formato para la interfaz, en español de Chile. */

import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export const pesos = (monto) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(monto ?? 0)

export const numero = (valor) => new Intl.NumberFormat('es-CL').format(valor ?? 0)

/** '2026-08-14' → '14 ago 2026' */
export const fechaCorta = (iso) =>
  iso ? format(parseISO(iso), "d MMM yyyy", { locale: es }) : ''

/** '2026-08-14' → 'viernes 14 de agosto de 2026' */
export const fechaLarga = (iso) =>
  iso ? format(parseISO(iso), "EEEE d 'de' MMMM 'de' yyyy", { locale: es }) : ''

/** '2026-08-14T10:15:00' → '14 ago 2026, 10:15' */
export const fechaHora = (iso) =>
  iso ? format(parseISO(iso), "d MMM yyyy, HH:mm", { locale: es }) : ''

/** Fecha nativa → 'yyyy-MM-dd' (formato de intercambio con la futura API). */
export const aISO = (fecha) => (fecha ? format(fecha, 'yyyy-MM-dd') : null)

export const distancia = (km) =>
  km < 1 ? `${Math.round(km * 1000)} m` : `${numero(km)} km`

/** Ficticio, solo presentación: no valida dígito verificador. */
export const formatearRut = (rut) => (rut ?? '').toUpperCase().trim()
