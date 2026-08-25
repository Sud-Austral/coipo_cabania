/**
 * Estados del ciclo de vida de una reserva (solicitud §5.1 req. 10 y §5.2 req. 13)
 * y sus estilos de presentación.
 *
 * El color nunca es el único indicador: cada estado tiene etiqueta de texto
 * (guía de accesibilidad, INSUMO/ui_ux.md → color-not-only).
 */

export const ESTADOS = {
  recibida: {
    etiqueta: 'Recibida',
    clases: 'bg-amber-100 text-amber-800 border-amber-200',
    descripcion: 'La solicitud fue registrada y espera revisión de la encargada regional.',
  },
  confirmada: {
    etiqueta: 'Confirmada',
    clases: 'bg-verde-100 text-verde-800 border-verde-200',
    descripcion: 'La reserva está confirmada. Se emitió el comprobante correspondiente.',
  },
  lista_espera: {
    etiqueta: 'En lista de espera',
    clases: 'bg-sky-100 text-sky-800 border-sky-200',
    descripcion: 'No hay cupo en las fechas solicitadas. Se avisará si se libera.',
  },
  rechazada: {
    etiqueta: 'Rechazada',
    clases: 'bg-rose-100 text-rose-800 border-rose-200',
    descripcion: 'La solicitud fue rechazada por la encargada regional.',
  },
  fuerza_mayor_pendiente: {
    etiqueta: 'Fuerza mayor en revisión',
    clases: 'bg-violet-100 text-violet-800 border-violet-200',
    descripcion: 'Oficina Central debe revisar el motivo y respaldo antes de determinar el cobro.',
  },
  fuerza_mayor_aprobada: {
    etiqueta: 'Fuerza mayor aprobada',
    clases: 'bg-verde-100 text-verde-800 border-verde-200',
    descripcion: 'Oficina Central aprobó la solicitud y recalculó el cobro a un día.',
  },
  fuerza_mayor_rechazada: {
    etiqueta: 'Fuerza mayor rechazada',
    clases: 'bg-rose-100 text-rose-800 border-rose-200',
    descripcion: 'Oficina Central rechazó la solicitud y mantuvo el cobro original.',
  },
  en_curso: {
    etiqueta: 'En curso',
    clases: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    descripcion: 'El huésped registró su ingreso y la estadía está en desarrollo.',
  },
  finalizada: {
    etiqueta: 'Finalizada',
    clases: 'bg-slate-100 text-slate-700 border-slate-200',
    descripcion: 'La estadía terminó. El cobro pasa a la nómina de descuentos.',
  },
  anulada: {
    etiqueta: 'Anulada',
    clases: 'bg-slate-100 text-slate-500 border-slate-200',
    descripcion: 'La reserva fue anulada por el usuario o por Bienestar.',
  },
}

export const ORDEN_ESTADOS = [
  'recibida',
  'confirmada',
  'en_curso',
  'finalizada',
  'lista_espera',
  'rechazada',
  'fuerza_mayor_pendiente',
  'fuerza_mayor_aprobada',
  'fuerza_mayor_rechazada',
  'anulada',
]

export const etiquetaEstado = (estado) => ESTADOS[estado]?.etiqueta ?? estado
export const clasesEstado = (estado) =>
  ESTADOS[estado]?.clases ?? 'bg-slate-100 text-slate-700 border-slate-200'

/** Estados en que la reserva ocupa efectivamente el inmueble. */
export const ESTADOS_QUE_OCUPAN = ['confirmada', 'en_curso', 'finalizada']

/** Estados de la nómina de descuentos (solicitud §5.3 req. 20). */
export const ESTADOS_COBRO = {
  pendiente: { etiqueta: 'Pendiente', clases: 'bg-amber-100 text-amber-800 border-amber-200' },
  informado: { etiqueta: 'Informado', clases: 'bg-sky-100 text-sky-800 border-sky-200' },
  descontado: { etiqueta: 'Descontado', clases: 'bg-verde-100 text-verde-800 border-verde-200' },
}
