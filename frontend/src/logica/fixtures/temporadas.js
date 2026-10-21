/**
 * Temporadas de verano e invierno — DATOS DE MAQUETA.
 * Las fechas oficiales las define Bienestar (docs/INSUMOS_BIENESTAR.md, insumo 8).
 *
 * Regla de negocio: las temporadas y sus bloqueos priman sobre la
 * disponibilidad general del calendario (solicitud §5.5 regla 7).
 */

export const temporadas = [
  {
    id: 1,
    nombre: 'Temporada estival 2026-2027',
    tipo: 'alta',
    desde: '2026-12-15',
    hasta: '2027-03-01',
    dias_maximos_por_afiliado: 10,
    observaciones:
      'Restricción de días máximos por afiliado. Algunas casas de huéspedes se destinan a descanso familiar.',
  },
  {
    id: 2,
    nombre: 'Vacaciones de invierno 2026',
    tipo: 'alta',
    desde: '2026-07-13',
    hasta: '2026-07-26',
    dias_maximos_por_afiliado: 7,
    observaciones: 'Alta demanda en inmuebles de montaña y centros de esquí.',
  },
  {
    id: 3,
    nombre: 'Fiestas Patrias 2026',
    tipo: 'alta',
    desde: '2026-09-17',
    hasta: '2026-09-21',
    dias_maximos_por_afiliado: 5,
    observaciones: 'Fin de semana largo: la anulación tardía se cobra completa.',
  },
  {
    id: 4,
    nombre: 'Temporada baja 2026',
    tipo: 'baja',
    desde: '2026-03-02',
    hasta: '2026-12-14',
    dias_maximos_por_afiliado: null,
    observaciones: 'Disponibilidad general sin restricciones de temporada.',
  },
]

/**
 * Bloqueos de fechas definidos por el administrador (solicitud §5.4 req. 24).
 * `inmueble_id: null` significa que aplica a toda la red.
 */
export const bloqueosTemporada = [
  {
    id: 1,
    inmueble_id: null,
    desde: '2026-11-03',
    hasta: '2026-11-28',
    motivo: 'Proceso de postulación estival: reservas cerradas mientras se realiza el sorteo.',
    origen: 'temporada',
  },
  {
    id: 2,
    inmueble_id: 2,
    desde: '2026-08-24',
    hasta: '2026-08-31',
    motivo: 'Mantención de techumbre y pintura exterior.',
    origen: 'mantencion',
  },
  {
    id: 3,
    inmueble_id: 15,
    desde: '2026-09-01',
    hasta: '2026-09-10',
    motivo: 'Reparación de camino de acceso.',
    origen: 'mantencion',
  },
  {
    id: 4,
    inmueble_id: 22,
    desde: '2026-08-17',
    hasta: '2026-08-21',
    motivo: 'Destinación institucional: taller regional de guardaparques.',
    origen: 'institucional',
  },
]
