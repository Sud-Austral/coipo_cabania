/**
 * Tabla de tarifas de referencia — DATOS DE MAQUETA.
 *
 * Los valores reales deben venir de Bienestar (docs/INSUMOS_BIENESTAR.md,
 * insumo 1). En la interfaz se rotulan siempre como "tarifas de referencia,
 * por validar" para que nadie las tome como oficiales en la demostración.
 *
 * Reglas que representan (solicitud de desarrollo, §5.5):
 *  - Casa de huéspedes: tarifa POR PERSONA y POR NOCHE, según categoría del
 *    ocupante (afiliado / externo) y motivo de la reserva.
 *  - Casa de veraneo: tarifa FIJA por noche que cubre al grupo familiar
 *    directo; los acompañantes no beneficiarios pagan un adicional.
 *    (Supuesto a validar — pregunta 1 de CLAUDE.md.)
 *  - Motivo médico: tarifa preferente para afiliado y cargas inscritas.
 *  - Motivo laboral: por ahora igual a la tarifa de afiliado
 *    (supuesto a validar — pregunta 2 de CLAUDE.md).
 */

export const MOTIVOS = [
  {
    valor: 'medica',
    etiqueta: 'Razones médicas',
    prelacion: 1,
    ayuda: 'Tratamientos, exámenes o atenciones de salud del afiliado o sus cargas.',
  },
  {
    valor: 'laboral',
    etiqueta: 'Cometido laboral',
    prelacion: 2,
    ayuda: 'Comisiones de servicio y actividades institucionales.',
  },
  {
    valor: 'personal',
    etiqueta: 'Razones personales / descanso',
    prelacion: 3,
    ayuda: 'Descanso y vacaciones con el grupo familiar.',
  },
]

export const CATEGORIAS_OCUPANTE = [
  { valor: 'afiliado', etiqueta: 'Tarifa afiliado' },
  { valor: 'externo', etiqueta: 'Tarifa usuario externo' },
]

/** Parentescos que dan derecho a tarifa de afiliado (solicitud §5.5 regla 3). */
export const PARENTESCOS_BENEFICIARIOS = ['titular', 'conyuge', 'hijo']

export const PARENTESCOS = [
  { valor: 'titular', etiqueta: 'Titular', beneficiario: true },
  { valor: 'conyuge', etiqueta: 'Cónyuge o conviviente civil', beneficiario: true },
  { valor: 'hijo', etiqueta: 'Hijo/a inscrito en Bienestar', beneficiario: true },
  { valor: 'familiar', etiqueta: 'Otro familiar', beneficiario: false },
  { valor: 'acompanante', etiqueta: 'Otro acompañante', beneficiario: false },
]

export const tarifas = {
  vigencia: { desde: '2026-01-01', hasta: '2026-12-31' },

  huespedes: {
    // valor por persona / por noche
    afiliado: { baja: 8000, alta: 10000 },
    afiliado_medica: { baja: 5000, alta: 5000 },
    externo: { baja: 15000, alta: 18000 },
  },

  veraneo: {
    // valor fijo por noche (cubre al grupo familiar directo)
    fija: { baja: 30000, alta: 45000 },
    // adicional por noche, por cada acompañante no beneficiario
    adicional_externo: { baja: 10000, alta: 10000 },
  },
}

/** Cobros de la política de desistimiento (solicitud §5.5 regla 4). */
export const POLITICA_DESISTIMIENTO = {
  dias_aviso_sin_cobro: 7,
  glosa_sin_cobro: 'Anulación con más de una semana de aviso: sin cobro.',
  glosa_tardia:
    'Anulación con menos de una semana de aviso: se cobra el total de los días reservados.',
  glosa_fuerza_mayor:
    'Fuerza mayor justificada y comprobada: se cobra el valor de un día por gastos de limpieza.',
}
