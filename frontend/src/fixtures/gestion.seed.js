/**
 * Sanciones, bloqueos, auditoría y nómina de descuentos — DATOS FICTICIOS.
 * Alimentan los paneles de Oficina Central y Administrador.
 */

/** Bloqueos y sanciones de usuarios (solicitud §5.4 req. 25-27). */
export const sancionesSeed = [
  {
    id: 1,
    usuario_nombre: 'Pedro Millán Quezada',
    usuario_rut: '13.007.882-5',
    tipo: 'destrozos',
    etiqueta_tipo: 'Daños al inmueble',
    motivo:
      'Daño en mobiliario de terraza durante estadía en Bahía Inglesa (reserva R-2026-0033).',
    respaldo: 'Informe de la encargada regional de Atacama, 12-01-2026.',
    desde: '2026-01-20',
    hasta: '2026-04-20',
    duracion: 'temporal',
    estado: 'levantada',
    fundamento_levantamiento: 'Pago del daño regularizado el 15-04-2026.',
  },
  {
    id: 2,
    usuario_nombre: 'Héctor Salgado Ibáñez',
    usuario_rut: '12.443.076-5',
    tipo: 'no_pago',
    etiqueta_tipo: 'Deuda por uso del beneficio',
    motivo: 'Descuentos por planilla rechazados en dos períodos consecutivos.',
    respaldo: 'Informe de Oficina Central, período 2026-05.',
    desde: '2026-06-01',
    hasta: null,
    duracion: 'indefinida',
    estado: 'vigente',
    fundamento_levantamiento: null,
  },
  {
    id: 3,
    usuario_nombre: 'Nadia Ortiz Fuenzalida',
    usuario_rut: '17.005.882-4',
    tipo: 'no_show',
    etiqueta_tipo: 'No presentación reiterada',
    motivo: 'Tres reservas confirmadas sin presentación ni aviso durante 2026.',
    respaldo: 'Registros de estadía de las encargadas de Los Lagos y Araucanía.',
    desde: '2026-07-01',
    hasta: '2026-10-01',
    duracion: 'temporal',
    estado: 'vigente',
    fundamento_levantamiento: null,
  },
]

/** Nómina de descuentos por planilla (solicitud §5.3 req. 20). */
export const nominasSeed = [
  {
    periodo: '2026-07',
    etiqueta: 'Julio 2026',
    estado_general: 'abierto',
    items: [
      { reserva_codigo: 'R-2026-0006', rut: '13.007.882-5', nombre: 'Pedro Millán Quezada', inmueble: 'Casa de Huéspedes R.N. Lago Peñuelas', noches: 4, monto: 32000, estado: 'pendiente' },
      { reserva_codigo: 'R-2026-0007', rut: '12.665.309-4', nombre: 'Luis Cárdenas Soto', inmueble: 'Casa de Veraneo Las Cruces', noches: 3, monto: 135000, estado: 'pendiente' },
      { reserva_codigo: 'R-2026-0015', rut: '17.884.223-6', nombre: 'Javiera Toro Sepúlveda', inmueble: 'Casa de Huéspedes Copiapó', noches: 3, monto: 24000, estado: 'informado' },
      { reserva_codigo: 'R-2026-0019', rut: '16.448.720-1', nombre: 'Soledad Ríos Peña', inmueble: 'Casa de Huéspedes Puerto Montt', noches: 2, monto: 10000, estado: 'informado' },
      { reserva_codigo: 'R-2026-0021', rut: '11.339.605-8', nombre: 'Óscar Maldonado Vera', inmueble: 'Casa de Huéspedes Temuco', noches: 3, monto: 15000, estado: 'informado' },
      { reserva_codigo: 'R-2026-0024', rut: '10.998.447-2', nombre: 'Manuel Aguirre Lizana', inmueble: 'Casa de Huéspedes Punta Arenas', noches: 5, monto: 25000, estado: 'descontado' },
      { reserva_codigo: 'R-2026-0026', rut: '15.118.994-3', nombre: 'Rodrigo Escobar Paredes', inmueble: 'Casa de Huéspedes Coyhaique', noches: 3, monto: 24000, estado: 'descontado' },
      { reserva_codigo: 'R-2026-0027', rut: '16.930.257-K', nombre: 'Claudia Sandoval Rivas', inmueble: 'Casa de Huéspedes Santiago 1', noches: 3, monto: 15000, estado: 'descontado' },
    ],
  },
  {
    periodo: '2026-06',
    etiqueta: 'Junio 2026',
    estado_general: 'cerrado',
    items: [
      { reserva_codigo: 'R-2026-0010', rut: '15.902.114-7', nombre: 'Ana Villalobos Díaz', inmueble: 'Casa de Huéspedes R.N. Lago Peñuelas', noches: 3, monto: 24000, estado: 'descontado' },
      { reserva_codigo: 'R-2026-0017', rut: '14.775.360-9', nombre: 'Ximena Bravo Alarcón', inmueble: 'Casa de Huéspedes Vilches', noches: 3, monto: 24000, estado: 'descontado' },
      { reserva_codigo: 'R-2026-0023', rut: '11.339.605-8', nombre: 'Óscar Maldonado Vera', inmueble: 'Casa de Huéspedes R.N. Malalcahuello', noches: 3, monto: 24000, estado: 'descontado' },
      { reserva_codigo: 'R-2026-0036', rut: '15.118.994-3', nombre: 'Rodrigo Escobar Paredes', inmueble: 'Casa de Huéspedes Cochrane', noches: 3, monto: 24000, estado: 'descontado' },
    ],
  },
]

/**
 * Pistas de auditoría (requerimiento no funcional 4: Ley 19.628 y 21.719).
 * En la maqueta se muestran registros de ejemplo para representar la
 * trazabilidad que tendrá el sistema real.
 */
export const auditoriaSeed = [
  { id: 1, fecha_hora: '2026-07-28T08:20:00', usuario: 'Óscar Maldonado Vera', perfil: 'Afiliado', accion: 'Creación de reserva', entidad: 'Reserva R-2026-0040', detalle: 'Motivo médico, Casa de Huéspedes Santiago 2.' },
  { id: 2, fecha_hora: '2026-07-27T16:42:00', usuario: 'Patricia Herrera Muñoz', perfil: 'Oficina Central', accion: 'Exportación de nómina', entidad: 'Nómina 2026-07', detalle: 'Descarga de archivo CSV con 8 registros.' },
  { id: 3, fecha_hora: '2026-07-27T14:05:00', usuario: 'Soledad Ríos Peña', perfil: 'Afiliado', accion: 'Creación de reserva', entidad: 'Reserva R-2026-0020', detalle: 'Casa de Veraneo P.N. Puyehue 2, fin de semana largo de septiembre.' },
  { id: 4, fecha_hora: '2026-07-27T09:31:00', usuario: 'Sistema', perfil: 'Sistema', accion: 'Cambio de estado automático', entidad: 'Reserva R-2026-0009', detalle: 'Sin cupo: pasa a lista de espera.' },
  { id: 5, fecha_hora: '2026-07-26T17:10:00', usuario: 'Administrador del sistema', perfil: 'Administrador', accion: 'Bloqueo de fechas', entidad: 'Casa de Veraneo P.N. Puyehue 1', detalle: 'Destinación institucional 17 al 21 de agosto.' },
  { id: 6, fecha_hora: '2026-07-26T10:15:00', usuario: 'Jorge Pavez Contreras', perfil: 'Usuario no afiliado', accion: 'Creación de reserva', entidad: 'Reserva R-2026-0029', detalle: 'Tarifa de usuario externo aplicada.' },
  { id: 7, fecha_hora: '2026-07-25T11:48:00', usuario: 'Carolina Núñez Vidal', perfil: 'Encargada regional', accion: 'Consulta de datos personales', entidad: 'Reserva R-2026-0002', detalle: 'Visualización de nómina de ocupantes.' },
  { id: 8, fecha_hora: '2026-07-24T15:30:00', usuario: 'Administrador del sistema', perfil: 'Administrador', accion: 'Carga de nómina de afiliados', entidad: 'Nómina de afiliados', detalle: '1.240 registros procesados, 12 actualizaciones.' },
  { id: 9, fecha_hora: '2026-07-22T09:05:00', usuario: 'Patricia Herrera Muñoz', perfil: 'Oficina Central', accion: 'Registro de sanción', entidad: 'Usuario 17.005.882-4', detalle: 'No presentación reiterada, bloqueo temporal a 3 meses.' },
  { id: 10, fecha_hora: '2026-07-20T13:22:00', usuario: 'Carolina Núñez Vidal', perfil: 'Encargada regional', accion: 'Registro de check-in', entidad: 'Reserva R-2026-0006', detalle: 'Ingreso registrado a las 14:00.' },
  { id: 11, fecha_hora: '2026-07-16T11:02:00', usuario: 'Carolina Núñez Vidal', perfil: 'Encargada regional', accion: 'Registro de check-out', entidad: 'Reserva R-2026-0007', detalle: 'Inmueble sin observaciones.' },
  { id: 12, fecha_hora: '2026-07-11T09:15:00', usuario: 'Carolina Núñez Vidal', perfil: 'Encargada regional', accion: 'Confirmación de reserva', entidad: 'Reserva R-2026-0004', detalle: 'Fundamento: disponibilidad confirmada para fin de semana largo.' },
  { id: 13, fecha_hora: '2026-07-06T17:20:00', usuario: 'Pedro Millán Quezada', perfil: 'Afiliado', accion: 'Anulación de reserva', entidad: 'Reserva R-2026-0008', detalle: '12 días de aviso: sin cobro asociado.' },
  { id: 14, fecha_hora: '2026-07-02T10:40:00', usuario: 'Administrador del sistema', perfil: 'Administrador', accion: 'Actualización de tarifas', entidad: 'Tarifas 2026', detalle: 'Ajuste de tarifa de temporada alta en casas de veraneo.' },
  { id: 15, fecha_hora: '2026-07-01T08:12:00', usuario: 'Patricia Herrera Muñoz', perfil: 'Oficina Central', accion: 'Cierre de nómina', entidad: 'Nómina 2026-06', detalle: 'Período cerrado con 4 registros descontados.' },
]

/** Resumen de la última carga de nómina de afiliados (integración futura). */
export const ultimaCargaNomina = {
  archivo: 'nomina_afiliados_2026-07.xlsx',
  fecha: '2026-07-24T15:30:00',
  cargado_por: 'Administrador del sistema',
  registros_procesados: 1240,
  afiliados_vigentes: 1198,
  cargas_familiares: 2317,
  nuevos: 12,
  desafiliados: 5,
  observaciones: 'Sin errores de formato. 3 RUT duplicados fueron descartados.',
}
