/**
 * Reservas de ejemplo — DATOS FICTICIOS.
 *
 * Sembradas para que cada perfil se vea poblado en la demostración:
 *  - Valparaíso (región de la encargada del rol "regional"): reservas en todos
 *    los estados, incluidas solicitudes pendientes de confirmar.
 *  - Resto del país: reservas repartidas para el panel de Oficina Central y
 *    los reportes de ocupación.
 *  - Usuaria del rol "afiliado" (id 1): historial propio con estados variados.
 *
 * La fecha de referencia de la maqueta es julio-agosto de 2026.
 */

const r = (
  id,
  inmueble_id,
  usuario_id,
  titular,
  rut,
  fecha_entrada,
  fecha_salida,
  motivo,
  estado,
  monto_total,
  extra = {},
) => ({
  id,
  codigo: `R-2026-${String(id).padStart(4, '0')}`,
  inmueble_id,
  usuario_id,
  titular_nombre: titular,
  titular_rut: rut,
  titular_es_afiliado: extra.titular_es_afiliado ?? true,
  fecha_entrada,
  fecha_salida,
  motivo,
  estado,
  monto_total,
  ocupantes: extra.ocupantes ?? [
    { nombre: titular, rut, parentesco: 'titular', categoria_tarifa: 'afiliado' },
  ],
  detalle_tarifa: extra.detalle_tarifa ?? [],
  observaciones: extra.observaciones ?? null,
  fundamento: extra.fundamento ?? null,
  check_in: extra.check_in ?? null,
  check_out: extra.check_out ?? null,
  origen: extra.origen ?? 'portal',
  creada_en: extra.creada_en ?? `${fecha_entrada}T09:00:00`,
  historial_estados: extra.historial_estados ?? [
    { estado: 'recibida', fecha: `${fecha_entrada}T09:00:00`, por: titular },
  ],
})

export const reservasSeed = [
  // ---------- Valparaíso: solicitudes pendientes (panel de la encargada) ----------
  r(1, 6, 11, 'Luis Cárdenas Soto', '12.665.309-4', '2026-08-14', '2026-08-17', 'personal', 'recibida', 90000, {
    ocupantes: [
      { nombre: 'Luis Cárdenas Soto', rut: '12.665.309-4', parentesco: 'titular', categoria_tarifa: 'afiliado' },
      { nombre: 'Marcela Pinto Ruiz', rut: '13.442.870-1', parentesco: 'conyuge', categoria_tarifa: 'afiliado' },
      { nombre: 'Diego Cárdenas Pinto', rut: '23.887.104-2', parentesco: 'hijo', categoria_tarifa: 'afiliado' },
    ],
    creada_en: '2026-07-24T11:20:00',
  }),
  r(2, 9, 12, 'Ana Villalobos Díaz', '15.902.114-7', '2026-08-10', '2026-08-13', 'medica', 'recibida', 15000, {
    observaciones: 'Control médico en Valparaíso.',
    creada_en: '2026-07-25T08:45:00',
  }),
  r(3, 7, 13, 'Pedro Millán Quezada', '13.007.882-5', '2026-08-14', '2026-08-16', 'personal', 'recibida', 60000, {
    ocupantes: [
      { nombre: 'Pedro Millán Quezada', rut: '13.007.882-5', parentesco: 'titular', categoria_tarifa: 'afiliado' },
      { nombre: 'Rosa Quezada Lillo', rut: '9.774.302-6', parentesco: 'familiar', categoria_tarifa: 'externo' },
    ],
    creada_en: '2026-07-26T16:05:00',
  }),

  // ---------- Valparaíso: confirmadas y en curso ----------
  r(4, 6, 1, 'María Fuentes Rojas', '13.457.902-8', '2026-09-18', '2026-09-21', 'personal', 'confirmada', 135000, {
    ocupantes: [
      { nombre: 'María Fuentes Rojas', rut: '13.457.902-8', parentesco: 'titular', categoria_tarifa: 'afiliado' },
      { nombre: 'Rodrigo Salinas Pérez', rut: '12.998.451-2', parentesco: 'conyuge', categoria_tarifa: 'afiliado' },
      { nombre: 'Emilia Salinas Fuentes', rut: '24.115.663-4', parentesco: 'hijo', categoria_tarifa: 'afiliado' },
      { nombre: 'Tomás Salinas Fuentes', rut: '25.447.128-K', parentesco: 'hijo', categoria_tarifa: 'afiliado' },
    ],
    fundamento: 'Disponibilidad confirmada para fin de semana largo.',
    creada_en: '2026-07-10T10:30:00',
    historial_estados: [
      { estado: 'recibida', fecha: '2026-07-10T10:30:00', por: 'María Fuentes Rojas' },
      { estado: 'confirmada', fecha: '2026-07-11T09:15:00', por: 'Carolina Núñez Vidal' },
    ],
  }),
  r(5, 8, 12, 'Ana Villalobos Díaz', '15.902.114-7', '2026-07-27', '2026-07-31', 'personal', 'en_curso', 120000, {
    check_in: '2026-07-27T15:10:00',
    creada_en: '2026-07-05T12:00:00',
    historial_estados: [
      { estado: 'recibida', fecha: '2026-07-05T12:00:00', por: 'Ana Villalobos Díaz' },
      { estado: 'confirmada', fecha: '2026-07-06T10:00:00', por: 'Carolina Núñez Vidal' },
      { estado: 'en_curso', fecha: '2026-07-27T15:10:00', por: 'Carolina Núñez Vidal' },
    ],
  }),
  r(6, 9, 13, 'Pedro Millán Quezada', '13.007.882-5', '2026-07-20', '2026-07-24', 'laboral', 'finalizada', 32000, {
    check_in: '2026-07-20T14:00:00',
    check_out: '2026-07-24T10:30:00',
    observaciones: 'Inmueble entregado en buenas condiciones.',
    creada_en: '2026-07-01T09:00:00',
    historial_estados: [
      { estado: 'recibida', fecha: '2026-07-01T09:00:00', por: 'Pedro Millán Quezada' },
      { estado: 'confirmada', fecha: '2026-07-02T11:00:00', por: 'Carolina Núñez Vidal' },
      { estado: 'finalizada', fecha: '2026-07-24T10:30:00', por: 'Carolina Núñez Vidal' },
    ],
  }),
  r(7, 7, 11, 'Luis Cárdenas Soto', '12.665.309-4', '2026-07-13', '2026-07-16', 'personal', 'finalizada', 135000, {
    check_in: '2026-07-13T16:00:00',
    check_out: '2026-07-16T11:00:00',
    creada_en: '2026-06-20T08:30:00',
    historial_estados: [
      { estado: 'recibida', fecha: '2026-06-20T08:30:00', por: 'Luis Cárdenas Soto' },
      { estado: 'confirmada', fecha: '2026-06-21T09:40:00', por: 'Carolina Núñez Vidal' },
      { estado: 'finalizada', fecha: '2026-07-16T11:00:00', por: 'Carolina Núñez Vidal' },
    ],
  }),
  r(8, 6, 13, 'Pedro Millán Quezada', '13.007.882-5', '2026-07-18', '2026-07-20', 'personal', 'anulada', 0, {
    observaciones: 'Anulada por el afiliado con 12 días de aviso. Sin cobro.',
    creada_en: '2026-06-25T10:00:00',
    historial_estados: [
      { estado: 'recibida', fecha: '2026-06-25T10:00:00', por: 'Pedro Millán Quezada' },
      { estado: 'confirmada', fecha: '2026-06-26T09:00:00', por: 'Carolina Núñez Vidal' },
      { estado: 'anulada', fecha: '2026-07-06T17:20:00', por: 'Pedro Millán Quezada' },
    ],
  }),
  r(9, 8, 20, 'Claudia Sandoval Rivas', '16.930.257-K', '2026-08-14', '2026-08-17', 'personal', 'lista_espera', 135000, {
    observaciones: 'Sin cupo en las fechas solicitadas. Queda en lista de espera.',
    creada_en: '2026-07-27T09:30:00',
    historial_estados: [
      { estado: 'recibida', fecha: '2026-07-27T09:30:00', por: 'Claudia Sandoval Rivas' },
      { estado: 'lista_espera', fecha: '2026-07-27T09:31:00', por: 'Sistema' },
    ],
  }),
  r(10, 9, 12, 'Ana Villalobos Díaz', '15.902.114-7', '2026-06-15', '2026-06-18', 'laboral', 'finalizada', 24000, {
    check_in: '2026-06-15T13:00:00',
    check_out: '2026-06-18T09:00:00',
    creada_en: '2026-06-01T11:00:00',
  }),

  // ---------- Historial de la afiliada del rol (id 1) ----------
  r(11, 2, 1, 'María Fuentes Rojas', '13.457.902-8', '2026-02-07', '2026-02-14', 'personal', 'finalizada', 315000, {
    ocupantes: [
      { nombre: 'María Fuentes Rojas', rut: '13.457.902-8', parentesco: 'titular', categoria_tarifa: 'afiliado' },
      { nombre: 'Rodrigo Salinas Pérez', rut: '12.998.451-2', parentesco: 'conyuge', categoria_tarifa: 'afiliado' },
      { nombre: 'Emilia Salinas Fuentes', rut: '24.115.663-4', parentesco: 'hijo', categoria_tarifa: 'afiliado' },
    ],
    check_in: '2026-02-07T15:00:00',
    check_out: '2026-02-14T11:00:00',
    observaciones: 'Estadía sin observaciones.',
    creada_en: '2025-11-20T10:00:00',
  }),
  r(12, 21, 1, 'María Fuentes Rojas', '13.457.902-8', '2026-05-11', '2026-05-13', 'laboral', 'finalizada', 16000, {
    check_in: '2026-05-11T18:00:00',
    check_out: '2026-05-13T08:30:00',
    creada_en: '2026-04-28T09:20:00',
  }),
  r(13, 17, 1, 'María Fuentes Rojas', '13.457.902-8', '2026-04-06', '2026-04-09', 'medica', 'finalizada', 15000, {
    observaciones: 'Atención médica en Hospital Regional de Concepción.',
    check_in: '2026-04-06T12:00:00',
    check_out: '2026-04-09T10:00:00',
    creada_en: '2026-03-25T08:00:00',
  }),

  // ---------- Resto del país (Oficina Central y reportes) ----------
  r(14, 2, 16, 'Javiera Toro Sepúlveda', '17.884.223-6', '2026-08-03', '2026-08-08', 'personal', 'confirmada', 150000, {
    creada_en: '2026-07-12T10:00:00',
  }),
  r(15, 4, 16, 'Javiera Toro Sepúlveda', '17.884.223-6', '2026-07-06', '2026-07-09', 'laboral', 'finalizada', 24000, {
    check_in: '2026-07-06T14:00:00',
    check_out: '2026-07-09T09:00:00',
    creada_en: '2026-06-15T09:00:00',
  }),
  r(16, 15, 18, 'Ximena Bravo Alarcón', '14.775.360-9', '2026-08-21', '2026-08-24', 'personal', 'confirmada', 90000, {
    ocupantes: [
      { nombre: 'Ximena Bravo Alarcón', rut: '14.775.360-9', parentesco: 'titular', categoria_tarifa: 'afiliado' },
      { nombre: 'Felipe Bravo Alarcón', rut: '22.556.109-8', parentesco: 'hijo', categoria_tarifa: 'afiliado' },
    ],
    creada_en: '2026-07-18T15:30:00',
  }),
  r(17, 14, 18, 'Ximena Bravo Alarcón', '14.775.360-9', '2026-06-22', '2026-06-25', 'laboral', 'finalizada', 24000, {
    check_in: '2026-06-22T17:00:00',
    check_out: '2026-06-25T08:00:00',
    creada_en: '2026-06-05T11:00:00',
  }),
  r(18, 22, 14, 'Soledad Ríos Peña', '16.448.720-1', '2026-08-07', '2026-08-12', 'personal', 'confirmada', 150000, {
    ocupantes: [
      { nombre: 'Soledad Ríos Peña', rut: '16.448.720-1', parentesco: 'titular', categoria_tarifa: 'afiliado' },
      { nombre: 'Iván Cuevas Mora', rut: '15.660.883-4', parentesco: 'conyuge', categoria_tarifa: 'afiliado' },
      { nombre: 'Amanda Cuevas Ríos', rut: '24.998.117-9', parentesco: 'hijo', categoria_tarifa: 'afiliado' },
    ],
    creada_en: '2026-07-08T09:00:00',
  }),
  r(19, 25, 14, 'Soledad Ríos Peña', '16.448.720-1', '2026-07-14', '2026-07-16', 'medica', 'finalizada', 10000, {
    check_in: '2026-07-14T13:00:00',
    check_out: '2026-07-16T09:30:00',
    observaciones: 'Exámenes en Hospital de Puerto Montt.',
    creada_en: '2026-07-01T10:00:00',
  }),
  r(20, 23, 14, 'Soledad Ríos Peña', '16.448.720-1', '2026-09-18', '2026-09-21', 'personal', 'recibida', 135000, {
    creada_en: '2026-07-27T14:00:00',
  }),
  r(21, 18, 15, 'Óscar Maldonado Vera', '11.339.605-8', '2026-07-21', '2026-07-24', 'medica', 'finalizada', 15000, {
    check_in: '2026-07-21T11:00:00',
    check_out: '2026-07-24T10:00:00',
    creada_en: '2026-07-08T08:00:00',
  }),
  r(22, 19, 15, 'Óscar Maldonado Vera', '11.339.605-8', '2026-08-14', '2026-08-18', 'personal', 'confirmada', 120000, {
    creada_en: '2026-07-20T12:00:00',
  }),
  r(23, 20, 15, 'Óscar Maldonado Vera', '11.339.605-8', '2026-06-08', '2026-06-11', 'laboral', 'finalizada', 24000, {
    check_in: '2026-06-08T16:00:00',
    check_out: '2026-06-11T09:00:00',
    creada_en: '2026-05-28T09:00:00',
  }),
  r(24, 30, 17, 'Manuel Aguirre Lizana', '10.998.447-2', '2026-07-13', '2026-07-18', 'medica', 'finalizada', 25000, {
    check_in: '2026-07-13T19:00:00',
    check_out: '2026-07-18T08:00:00',
    observaciones: 'Tratamiento derivado en Hospital Clínico de Magallanes.',
    creada_en: '2026-06-30T10:00:00',
  }),
  r(25, 30, 19, 'Rodrigo Escobar Paredes', '15.118.994-3', '2026-08-04', '2026-08-07', 'laboral', 'confirmada', 24000, {
    creada_en: '2026-07-15T11:00:00',
  }),
  r(26, 27, 19, 'Rodrigo Escobar Paredes', '15.118.994-3', '2026-07-07', '2026-07-10', 'laboral', 'finalizada', 24000, {
    check_in: '2026-07-07T15:00:00',
    check_out: '2026-07-10T09:00:00',
    creada_en: '2026-06-22T08:30:00',
  }),
  r(27, 31, 20, 'Claudia Sandoval Rivas', '16.930.257-K', '2026-07-22', '2026-07-25', 'medica', 'finalizada', 15000, {
    check_in: '2026-07-22T14:00:00',
    check_out: '2026-07-25T10:00:00',
    creada_en: '2026-07-10T09:00:00',
  }),
  r(28, 33, 20, 'Claudia Sandoval Rivas', '16.930.257-K', '2026-08-28', '2026-08-31', 'personal', 'confirmada', 90000, {
    creada_en: '2026-07-22T16:00:00',
  }),
  r(29, 31, 2, 'Jorge Pavez Contreras', '15.336.204-1', '2026-08-11', '2026-08-14', 'personal', 'recibida', 90000, {
    titular_es_afiliado: false,
    ocupantes: [
      { nombre: 'Jorge Pavez Contreras', rut: '15.336.204-1', parentesco: 'titular', categoria_tarifa: 'externo' },
      { nombre: 'Carla Bustos Lagos', rut: '16.204.775-3', parentesco: 'familiar', categoria_tarifa: 'externo' },
    ],
    observaciones: 'Usuario externo: sujeto a la prioridad de los afiliados.',
    creada_en: '2026-07-26T10:15:00',
  }),
  r(30, 5, 16, 'Javiera Toro Sepúlveda', '17.884.223-6', '2026-01-12', '2026-01-19', 'personal', 'finalizada', 315000, {
    check_in: '2026-01-12T15:00:00',
    check_out: '2026-01-19T11:00:00',
    creada_en: '2025-10-30T09:00:00',
  }),
  r(31, 10, 18, 'Ximena Bravo Alarcón', '14.775.360-9', '2026-02-16', '2026-02-21', 'personal', 'finalizada', 225000, {
    check_in: '2026-02-16T16:00:00',
    check_out: '2026-02-21T10:00:00',
    creada_en: '2025-11-15T10:00:00',
  }),
  r(32, 22, 11, 'Luis Cárdenas Soto', '12.665.309-4', '2026-02-02', '2026-02-08', 'personal', 'finalizada', 270000, {
    check_in: '2026-02-02T15:30:00',
    check_out: '2026-02-08T11:00:00',
    creada_en: '2025-11-10T09:30:00',
  }),
  r(33, 2, 13, 'Pedro Millán Quezada', '13.007.882-5', '2026-01-05', '2026-01-11', 'personal', 'finalizada', 270000, {
    check_in: '2026-01-05T15:00:00',
    check_out: '2026-01-11T10:30:00',
    observaciones: 'Se registró daño en mobiliario de terraza. Informe enviado a Oficina Central.',
    creada_en: '2025-10-28T11:00:00',
  }),
  r(34, 6, 15, 'Óscar Maldonado Vera', '11.339.605-8', '2026-03-09', '2026-03-12', 'medica', 'finalizada', 15000, {
    check_in: '2026-03-09T12:00:00',
    check_out: '2026-03-12T09:00:00',
    creada_en: '2026-02-25T08:00:00',
  }),
  r(35, 28, 19, 'Rodrigo Escobar Paredes', '15.118.994-3', '2026-05-18', '2026-05-20', 'laboral', 'finalizada', 16000, {
    check_in: '2026-05-18T18:00:00',
    check_out: '2026-05-20T08:00:00',
    creada_en: '2026-05-04T09:00:00',
  }),
  r(36, 29, 19, 'Rodrigo Escobar Paredes', '15.118.994-3', '2026-06-01', '2026-06-04', 'laboral', 'finalizada', 24000, {
    check_in: '2026-06-01T17:00:00',
    check_out: '2026-06-04T08:30:00',
    creada_en: '2026-05-18T10:00:00',
  }),
  r(37, 12, 18, 'Ximena Bravo Alarcón', '14.775.360-9', '2026-07-28', '2026-07-30', 'laboral', 'confirmada', 16000, {
    creada_en: '2026-07-14T09:00:00',
  }),
  r(38, 13, 16, 'Javiera Toro Sepúlveda', '17.884.223-6', '2026-08-18', '2026-08-21', 'laboral', 'recibida', 24000, {
    creada_en: '2026-07-27T11:45:00',
  }),
  r(39, 24, 14, 'Soledad Ríos Peña', '16.448.720-1', '2026-05-05', '2026-05-08', 'laboral', 'finalizada', 24000, {
    check_in: '2026-05-05T16:00:00',
    check_out: '2026-05-08T09:00:00',
    creada_en: '2026-04-20T10:00:00',
  }),
  r(40, 32, 15, 'Óscar Maldonado Vera', '11.339.605-8', '2026-08-25', '2026-08-28', 'medica', 'recibida', 15000, {
    observaciones: 'Derivación médica a Santiago.',
    creada_en: '2026-07-28T08:20:00',
  }),
  r(41, 26, 14, 'Soledad Ríos Peña', '16.448.720-1', '2026-04-13', '2026-04-16', 'personal', 'anulada', 90000, {
    observaciones: 'Anulación con 2 días de aviso. Se cobró el total (fin de semana largo).',
    creada_en: '2026-03-20T09:00:00',
  }),
  r(42, 11, 13, 'Pedro Millán Quezada', '13.007.882-5', '2026-03-23', '2026-03-26', 'personal', 'anulada', 30000, {
    observaciones: 'Fuerza mayor comprobada (licencia médica): se cobró un día por limpieza.',
    creada_en: '2026-03-02T10:00:00',
  }),
]
