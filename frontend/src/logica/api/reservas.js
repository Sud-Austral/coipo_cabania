/**
 * Endpoints de reservas (maqueta).
 * Emula: /api/reservas, /api/reservas/{codigo}, PATCH de estados, check-in/out.
 */

import { differenceInCalendarDays, parseISO } from 'date-fns'
import { responder, fallar, lista } from './client.js'
import { store, persistir, siguienteId, registrarAuditoria } from './store.js'
import { rangoDisponible } from './inmuebles.js'
import { valoracionDeReserva } from './valoraciones.js'
import { calcularTarifa, cobroPorDesistimiento, contarNoches } from '../lib/tarifas.js'
import { ESTADOS_CON_COBRO, repartirCuotas } from '../lib/cobros.js'
import { cobroYaEnviado, registrarCobroEnNomina } from './nominas.js'

const ahoraISO = () => new Date().toISOString().slice(0, 19)

// Reservas anulables desde la interfaz (MisReservas.jsx → ANULABLES). Se repite
// acá porque la API es quien debe garantizar la regla, no solo la pantalla.
const ANULABLES = ['recibida', 'confirmada', 'lista_espera']

// Transiciones permitidas por PATCH /estado. `null` como origen significa
// "cualquier estado previo"; se usa solo para casos ya cubiertos por otra
// validación explícita más abajo.
const TRANSICIONES_ESTADO = {
  confirmada: ['recibida', 'lista_espera'],
  rechazada: ['recibida'],
}

/** GET /api/reservas?region=&estado=&usuario_id=&inmueble_id= */
export function getReservas(filtros = {}) {
  const { region, estado, usuario_id, inmueble_id, motivo } = filtros
  let items = [...store.reservas]

  if (region) {
    const idsRegion = store.inmuebles.filter((i) => i.region === region).map((i) => i.id)
    items = items.filter((r) => idsRegion.includes(r.inmueble_id))
  }
  if (estado) items = items.filter((r) => r.estado === estado)
  if (motivo) items = items.filter((r) => r.motivo === motivo)
  if (usuario_id) items = items.filter((r) => r.usuario_id === Number(usuario_id))
  if (inmueble_id) items = items.filter((r) => r.inmueble_id === Number(inmueble_id))

  // Más recientes primero, por fecha de entrada.
  items.sort((a, b) => (a.fecha_entrada < b.fecha_entrada ? 1 : -1))

  // Se adjunta el inmueble y la valoración para no obligar a la interfaz a
  // cruzar datos.
  const conInmueble = items.map((r) => ({
    ...r,
    inmueble: store.inmuebles.find((i) => i.id === r.inmueble_id) ?? null,
    valoracion: valoracionDeReserva(r.codigo),
  }))

  return responder(lista(conInmueble))
}

/** GET /api/reservas/{codigo} */
export function getReserva(codigo) {
  const reserva = store.reservas.find((r) => r.codigo === codigo)
  if (!reserva) return fallar(404, 'Reserva no encontrada')
  return responder({
    ...reserva,
    inmueble: store.inmuebles.find((i) => i.id === reserva.inmueble_id) ?? null,
  })
}

/**
 * POST /api/reservas
 * Valida capacidad máxima y disponibilidad; calcula el cobro estimado.
 */
export function crearReserva(payload, actor) {
  const {
    inmueble_id,
    fecha_entrada,
    fecha_salida,
    motivo,
    ocupantes,
    observaciones,
    origen = 'portal',
    titular = null,
  } = payload

  const inmueble = store.inmuebles.find((i) => i.id === Number(inmueble_id))
  if (!inmueble) return fallar(404, 'Inmueble no encontrado')
  const rutSolicitante = titular?.rut ?? actor?.rut
  const sancion = store.sanciones.find((s) => s.usuario_rut === rutSolicitante && s.estado === 'vigente')
  if (sancion) return fallar(403, `Usuario bloqueado: ${sancion.motivo}. Canal de regularización: Oficina Central de Bienestar.`)

  if (contarNoches(fecha_entrada, fecha_salida) === 0) {
    return fallar(422, 'La fecha de salida debe ser posterior a la de entrada.')
  }

  // Anticipación mínima y máxima definidas en Administración (ConfiguracionAdmin.jsx).
  // No se aplica a reservas manuales de una encargada regional (origen ≠ 'portal'):
  // esos casos son excepcionales y se registran a criterio de Bienestar.
  const { anticipacion_minima = 0, anticipacion_maxima = 180 } = store.parametros ?? {}
  if (origen === 'portal') {
    const diasAnticipacion = differenceInCalendarDays(parseISO(fecha_entrada), new Date())
    if (diasAnticipacion < anticipacion_minima) {
      return fallar(422, `La reserva requiere al menos ${anticipacion_minima} día(s) de anticipación.`)
    }
    if (diasAnticipacion > anticipacion_maxima) {
      return fallar(422, `No se puede reservar con más de ${anticipacion_maxima} día(s) de anticipación.`)
    }
  }

  if (!ocupantes?.length) {
    return fallar(422, 'Debe registrar al menos un ocupante.')
  }

  if (ocupantes.length > inmueble.capacidad_maxima) {
    return fallar(
      422,
      `La reserva excede la capacidad máxima del inmueble (${inmueble.capacidad_maxima} personas).`,
    )
  }

  // M-07: el RUT no limita solicitudes en propiedades distintas. Cada inmueble
  // administra su disponibilidad de forma independiente. Se evita únicamente
  // duplicar la misma solicitud del mismo RUT para la misma propiedad y fechas.
  const duplicadaMismoInmueble = store.reservas.find((r) =>
    r.titular_rut === rutSolicitante &&
    r.inmueble_id === Number(inmueble_id) &&
    r.fecha_entrada === fecha_entrada &&
    r.fecha_salida === fecha_salida &&
    ['recibida', 'confirmada', 'en_curso'].includes(r.estado)
  )
  if (duplicadaMismoInmueble) {
    return fallar(409, `Ya existe la solicitud ${duplicadaMismoInmueble.codigo} para esta propiedad y fechas.`)
  }

  const disponibilidad = rangoDisponible(inmueble_id, fecha_entrada, fecha_salida)

  // Los datos que definen tarifa deben salir de quien ocupa la reserva (el
  // titular), no de quien la registra. En el portal público el titular es el
  // propio actor; en una reserva manual (ReservaManual.jsx) el actor es la
  // encargada regional y `titular` es el afiliado seleccionado.
  const quienDefineTarifa = titular ?? actor
  const titularEsAfiliado = titular
    ? titular.afiliado_vigente !== false
    : actor?.tipo !== 'externo'
  // M-10: el motivo siempre se registra, también para perfiles externos. En
  // externos es informativo y no altera la tarifa, que permanece fija.
  const motivoAplicado = motivo
  const aplicaTarifaSindicato = titularEsAfiliado && quienDefineTarifa?.tarifa_sindicato === true
  const tarifa = calcularTarifa({
    inmueble,
    fechaEntrada: fecha_entrada,
    fechaSalida: fecha_salida,
    motivo: motivoAplicado,
    ocupantes,
    temporadas: store.temporadas,
    titularEsAfiliado,
    aplicaTarifaSindicato,
    tarifasConfig: store.tarifas_config,
  })

  // Sin cupo: la solicitud se registra en lista de espera (solicitud §5.1 req. 10).
  const estado = disponibilidad.libre ? 'recibida' : 'lista_espera'
  const id = siguienteId(store.reservas)

  const reserva = {
    id,
    codigo: `R-2026-${String(id).padStart(4, '0')}`,
    inmueble_id: Number(inmueble_id),
    usuario_id: titular?.id ?? actor?.id ?? null,
    titular_nombre: titular?.nombre ?? actor?.nombre ?? 'Titular',
    titular_rut: titular?.rut ?? actor?.rut ?? '',
    titular_es_afiliado: titular?.afiliado_vigente ?? titularEsAfiliado,
    tarifa_sindicato: titular?.tarifa_sindicato ?? aplicaTarifaSindicato,
    fecha_entrada,
    fecha_salida,
    motivo: motivoAplicado,
    estado,
    monto_total: tarifa.total,
    ocupantes,
    detalle_tarifa: tarifa.lineas,
    temporada_aplicada: tarifa.temporada,
    nombre_temporada: tarifa.nombre_temporada,
    observaciones: observaciones ?? (disponibilidad.libre ? null : disponibilidad.motivo),
    fundamento: null,
    check_in: null,
    check_out: null,
    origen,
    creada_en: ahoraISO(),
    historial_estados: [{ estado, fecha: ahoraISO(), por: actor?.nombre ?? 'Portal' }],
  }

  store.reservas.push(reserva)

  // M-04: una consulta/observación de la solicitud se dirige al encargado de
  // Bienestar de la región del inmueble. En producción este registro será el
  // punto de salida para correo/notificación institucional.
  if (observaciones?.trim()) {
    store.notificaciones ??= []
    store.notificaciones.unshift({
      id: siguienteId(store.notificaciones),
      tipo: 'consulta_reserva',
      reserva_codigo: reserva.codigo,
      region: inmueble.region,
      destinatario_rol: 'regional',
      asunto: `Consulta en reserva ${reserva.codigo}`,
      mensaje: observaciones.trim(),
      estado: 'pendiente',
      creada_en: ahoraISO(),
    })
  }

  persistir()

  registrarAuditoria({
    usuario: actor?.nombre ?? 'Portal',
    perfil: actor?.perfil ?? 'Afiliado',
    accion: 'Creación de reserva',
    entidad: `Reserva ${reserva.codigo}`,
    detalle: `${inmueble.nombre}, ${tarifa.noches} noche(s), motivo ${motivoAplicado}.`,
  })

  return responder({ ...reserva, inmueble })
}

/** PATCH /api/reservas/{codigo}/estado */
export function cambiarEstado(codigo, nuevoEstado, { fundamento, actor } = {}) {
  const reserva = store.reservas.find((r) => r.codigo === codigo)
  if (!reserva) return fallar(404, 'Reserva no encontrada')

  // check-in/check-out (en_curso, finalizada) y anulación (anulada,
  // fuerza_mayor_*) tienen su propio endpoint con sus propias reglas; este
  // PATCH genérico solo mueve solicitudes pendientes (M-04/M-05).
  if (!TRANSICIONES_ESTADO[nuevoEstado]) {
    return fallar(422, `«${nuevoEstado}» no es un destino válido para este endpoint.`)
  }

  const origenesPermitidos = TRANSICIONES_ESTADO[nuevoEstado]
  if (origenesPermitidos && !origenesPermitidos.includes(reserva.estado)) {
    return fallar(
      409,
      `No se puede pasar de «${reserva.estado}» a «${nuevoEstado}». Estados válidos de origen: ${origenesPermitidos.join(', ')}.`,
    )
  }

  // Al confirmar, se vuelve a verificar disponibilidad excluyendo esta misma
  // solicitud: evita sobre-reservas cuando dos solicitudes en paralelo (p. ej.
  // una `recibida` y otra en `lista_espera`) compiten por las mismas fechas.
  if (nuevoEstado === 'confirmada') {
    const disponibilidad = rangoDisponible(reserva.inmueble_id, reserva.fecha_entrada, reserva.fecha_salida, {
      excluirCodigo: reserva.codigo,
    })
    if (!disponibilidad.libre) {
      return fallar(409, `No se puede confirmar: ${disponibilidad.motivo}`)
    }
  }

  reserva.estado = nuevoEstado
  if (fundamento) reserva.fundamento = fundamento
  reserva.historial_estados.push({
    estado: nuevoEstado,
    fecha: ahoraISO(),
    por: actor?.nombre ?? 'Sistema',
  })
  persistir()

  registrarAuditoria({
    usuario: actor?.nombre ?? 'Sistema',
    perfil: actor?.perfil ?? 'Sistema',
    accion: nuevoEstado === 'confirmada' ? 'Confirmación de reserva' : 'Cambio de estado',
    entidad: `Reserva ${reserva.codigo}`,
    detalle: fundamento ?? `Nuevo estado: ${nuevoEstado}.`,
  })

  return responder({
    ...reserva,
    inmueble: store.inmuebles.find((i) => i.id === reserva.inmueble_id) ?? null,
  })
}

/** POST /api/reservas/{codigo}/check-in | check-out */
export function registrarEstadia(codigo, tipo, { observaciones, detalles = {}, actor } = {}) {
  const reserva = store.reservas.find((r) => r.codigo === codigo)
  if (!reserva) return fallar(404, 'Reserva no encontrada')

  if (tipo === 'check_in' && reserva.estado !== 'confirmada') {
    return fallar(409, `No se puede registrar check-in: la reserva está en estado «${reserva.estado}», debe estar confirmada.`)
  }
  if (tipo === 'check_out' && reserva.estado !== 'en_curso') {
    return fallar(409, `No se puede registrar check-out: la reserva está en estado «${reserva.estado}», debe estar en curso.`)
  }

  if (tipo === 'check_in') {
    reserva.check_in = ahoraISO()
    reserva.estado = 'en_curso'
    reserva.historial_estados.push({
      estado: 'en_curso',
      fecha: reserva.check_in,
      por: actor?.nombre ?? 'Encargada regional',
    })
  } else {
    reserva.check_out = ahoraISO()
    reserva.estado = 'finalizada'
    reserva.historial_estados.push({
      estado: 'finalizada',
      fecha: reserva.check_out,
      por: actor?.nombre ?? 'Encargada regional',
    })

    // Al finalizar la estadía de un afiliado, el cobro entra a la nómina del
    // mes del check-out (1 cuota por defecto; el afiliado puede fraccionarlo
    // mientras no se haya informado a Remuneraciones).
    registrarCobroEnNomina(reserva, reserva.check_out)
  }
  if (observaciones) reserva.observaciones = observaciones
  reserva.registro_estadia ??= {}
  reserva.registro_estadia[tipo] = { ...detalles, observaciones, fecha: tipo === 'check_in' ? reserva.check_in : reserva.check_out, por: actor?.nombre }
  if (detalles.hay_incidencia) {
    reserva.incidencia = { tipo: detalles.tipo_incidencia, descripcion: observaciones, evidencia: detalles.evidencia, recomendacion_bloqueo: detalles.recomendacion_bloqueo, estado: 'informada', creada_en: ahoraISO() }
  }

  // La anticipación se valida al crear la reserva. En check-in/check-out no se vuelve
  // a aplicar esa regla porque la estadía ya existe y puede estar en curso o finalizada.
  persistir()

  registrarAuditoria({
    usuario: actor?.nombre ?? 'Encargada regional',
    perfil: actor?.perfil ?? 'Encargada regional',
    accion: tipo === 'check_in' ? 'Registro de check-in' : 'Registro de check-out',
    entidad: `Reserva ${reserva.codigo}`,
    detalle: observaciones ?? 'Sin observaciones.',
  })

  return responder({
    ...reserva,
    inmueble: store.inmuebles.find((i) => i.id === reserva.inmueble_id) ?? null,
  })
}

/**
 * POST /api/reservas/{codigo}/anular
 * Aplica la política de desistimiento según la fecha de anulación.
 */
export function anularReserva(codigo, { fuerzaMayor = false, motivoFuerzaMayor = '', respaldo = null, actor } = {}) {
  const reserva = store.reservas.find((r) => r.codigo === codigo)
  if (!reserva) return fallar(404, 'Reserva no encontrada')

  if (!ANULABLES.includes(reserva.estado)) {
    return fallar(409, `No se puede anular una reserva en estado «${reserva.estado}».`)
  }

  const estadoPrevio = reserva.estado
  const diasAviso = differenceInCalendarDays(parseISO(reserva.fecha_entrada), new Date())
  const noches = contarNoches(reserva.fecha_entrada, reserva.fecha_salida)
  const cobro = cobroPorDesistimiento({
    montoTotal: reserva.monto_total,
    noches,
    diasAviso,
    fuerzaMayor,
    diasSinCobro: store.parametros?.desistimiento_sin_cobro ?? 7,
    diasCobroFuerzaMayor: store.parametros?.cobro_fuerza_mayor_dias ?? 1,
  })

  reserva.estado = fuerzaMayor ? 'fuerza_mayor_pendiente' : 'anulada'
  reserva.monto_total = fuerzaMayor ? reserva.monto_total : cobro.monto
  reserva.observaciones = fuerzaMayor
    ? 'Solicitud de fuerza mayor pendiente de evaluación por Oficina Central.'
    : cobro.glosa
  reserva.anulada_en = ahoraISO()
  reserva.dias_aviso = diasAviso
  reserva.solicitud_fuerza_mayor = fuerzaMayor
    ? { motivo: motivoFuerzaMayor, respaldo, estado: 'pendiente', creada_en: reserva.anulada_en }
    : null
  reserva.historial_estados.push({
    estado: reserva.estado,
    fecha: reserva.anulada_en,
    por: actor?.nombre ?? 'Usuario',
  })
  // Anulación tardía de un afiliado: el cobro también va a la nómina.
  if (!fuerzaMayor) registrarCobroEnNomina(reserva, reserva.anulada_en)

  // Si la reserva anulada ocupaba fechas (recibida/confirmada), se libera cupo:
  // se avisa a la encargada regional por la primera solicitud en lista de espera
  // para ese inmueble, por orden de antigüedad (fixtures/temporadas.js define la
  // prelación médica/laboral/personal; acá solo se ordena por fecha de creación,
  // la promoción efectiva la decide la encargada regional — ver hallazgo #5).
  let notificadaListaEspera = null
  if (['recibida', 'confirmada'].includes(estadoPrevio)) {
    const candidata = store.reservas
      .filter((r) => r.estado === 'lista_espera' && r.inmueble_id === reserva.inmueble_id)
      .sort((a, b) => (a.creada_en < b.creada_en ? -1 : 1))[0]
    if (candidata) {
      store.notificaciones ??= []
      store.notificaciones.unshift({
        id: siguienteId(store.notificaciones),
        tipo: 'cupo_liberado',
        reserva_codigo: candidata.codigo,
        region: store.inmuebles.find((i) => i.id === reserva.inmueble_id)?.region ?? null,
        destinatario_rol: 'regional',
        asunto: `Se liberó cupo: revisar lista de espera de ${candidata.codigo}`,
        mensaje: `La reserva ${reserva.codigo} se anuló y liberó fechas que podrían servir a la solicitud en lista de espera ${candidata.codigo}.`,
        estado: 'pendiente',
        creada_en: ahoraISO(),
      })
      notificadaListaEspera = candidata.codigo
    }
  }

  persistir()

  registrarAuditoria({
    usuario: actor?.nombre ?? 'Usuario',
    perfil: actor?.perfil ?? 'Afiliado',
    accion: 'Anulación de reserva',
    entidad: `Reserva ${reserva.codigo}`,
    detalle: fuerzaMayor
      ? `${diasAviso} día(s) de aviso. Fuerza mayor solicitada: ${motivoFuerzaMayor}`
      : `${diasAviso} día(s) de aviso. ${cobro.glosa}`,
  })

  return responder({ reserva, cobro, notificadaListaEspera })
}

/** PATCH /api/reservas/{codigo}/fuerza-mayor — decisión de Oficina Central. */
export function resolverFuerzaMayor(codigo, { aprobar, fundamento, actor } = {}) {
  const reserva = store.reservas.find((r) => r.codigo === codigo)
  if (!reserva?.solicitud_fuerza_mayor) return fallar(404, 'Solicitud de fuerza mayor no encontrada')
  const noches = contarNoches(reserva.fecha_entrada, reserva.fecha_salida)
  const montoOriginal = reserva.monto_total
  // Se cobra el valor real de los primeros N días de la estadía (N = parámetro
  // 'cobro_fuerza_mayor_dias'), con su temporada y ocupantes, no un promedio.
  const diasCobro = Math.min(noches, store.parametros?.cobro_fuerza_mayor_dias ?? 1)
  const inmuebleFM = store.inmuebles.find((i) => i.id === reserva.inmueble_id)
  const finCobro = new Date(`${reserva.fecha_entrada}T12:00:00`)
  finCobro.setDate(finCobro.getDate() + diasCobro)
  const tarifaDias = calcularTarifa({
    inmueble: inmuebleFM,
    fechaEntrada: reserva.fecha_entrada,
    fechaSalida: finCobro.toISOString().slice(0, 10),
    motivo: reserva.motivo,
    ocupantes: reserva.ocupantes ?? [],
    temporadas: store.temporadas,
    titularEsAfiliado: reserva.titular_es_afiliado !== false,
    aplicaTarifaSindicato: reserva.tarifa_sindicato === true,
    tarifasConfig: store.tarifas_config,
  })
  const montoResuelto = aprobar && noches > 0
    ? Math.min(montoOriginal, tarifaDias.total || Math.round((montoOriginal / noches) * diasCobro))
    : montoOriginal
  if (aprobar) {
    reserva.detalle_tarifa_original = reserva.detalle_tarifa
    reserva.detalle_tarifa = [{
      concepto: `Emergencia aprobada · ${diasCobro === 1 ? 'un día' : `${diasCobro} días`} por gastos de limpieza`,
      cantidad: diasCobro,
      detalle_cantidad: diasCobro === 1 ? '1 día' : `${diasCobro} días`,
      valor_unitario: montoResuelto,
      subtotal: montoResuelto,
    }]
  }
  reserva.estado = aprobar ? 'fuerza_mayor_aprobada' : 'fuerza_mayor_rechazada'
  reserva.monto_total = montoResuelto
  reserva.solicitud_fuerza_mayor = {
    ...reserva.solicitud_fuerza_mayor,
    estado: aprobar ? 'aprobada' : 'rechazada',
    fundamento_resolucion: fundamento,
    resuelta_en: ahoraISO(),
    resuelta_por: actor?.nombre ?? 'Oficina Central',
    monto_original: montoOriginal,
    monto_resuelto: montoResuelto,
  }
  reserva.historial_estados.push({ estado: reserva.estado, fecha: ahoraISO(), por: actor?.nombre ?? 'Oficina Central' })
  // Resuelta la fuerza mayor, el monto final (aprobado o rechazado) va a la nómina.
  registrarCobroEnNomina(reserva, reserva.solicitud_fuerza_mayor.resuelta_en)
  persistir()
  registrarAuditoria({
    usuario: actor?.nombre ?? 'Oficina Central', perfil: actor?.perfil ?? 'Oficina Central',
    accion: aprobar ? 'Fuerza mayor aprobada' : 'Fuerza mayor rechazada',
    entidad: `Reserva ${codigo}`, detalle: fundamento,
  })
  return responder(reserva)
}



/**
 * POST /api/reservas/{codigo}/descuento-planilla
 * Afiliados seleccionan descuento por planilla y entre 1 y N cuotas mensuales,
 * donde N corresponde al número de noches de la estadía.
 */
export function seleccionarDescuentoPlanilla(codigo, { cuotas, actor } = {}) {
  const reserva = store.reservas.find((r) => r.codigo === codigo)
  if (!reserva) return fallar(404, 'Reserva no encontrada')
  if (!reserva.titular_es_afiliado) return fallar(403, 'Descuento por planilla disponible solo para afiliados.')
  if (!ESTADOS_CON_COBRO.includes(reserva.estado)) return fallar(422, 'El descuento por planilla se habilita después de realizar el check-out.')
  if (reserva.monto_total <= 0) return fallar(422, 'La reserva no tiene un monto pendiente de pago.')
  if (reserva.pago_transferencia?.estado) return fallar(409, 'La reserva ya tiene un pago por transferencia informado.')
  if (cobroYaEnviado(reserva.codigo)) return fallar(409, 'El cobro ya fue informado a Remuneraciones; no se pueden cambiar las cuotas.')

  const noches = contarNoches(reserva.fecha_entrada, reserva.fecha_salida)
  const numeroCuotas = Number(cuotas)
  if (!Number.isInteger(numeroCuotas) || numeroCuotas < 1 || numeroCuotas > noches) {
    return fallar(422, `Seleccione entre 1 y ${noches} cuota(s) mensuales.`)
  }
  const montos = repartirCuotas(reserva.monto_total, numeroCuotas)
  reserva.descuento_planilla = {
    estado: 'seleccionado',
    cuotas: numeroCuotas,
    monto_total: reserva.monto_total,
    monto_cuota_base: montos[0],
    monto_ultima_cuota: montos[montos.length - 1],
    seleccionado_en: ahoraISO(),
    seleccionado_por: actor?.nombre ?? reserva.titular_nombre ?? 'Titular',
  }

  // Rehace las cuotas en la nómina: una por mes desde el período original.
  registrarCobroEnNomina(reserva, reserva.check_out ?? reserva.anulada_en)
  persistir()
  registrarAuditoria({
    usuario: actor?.nombre ?? reserva.titular_nombre ?? 'Titular',
    perfil: actor?.perfil ?? 'Afiliado',
    accion: 'Descuento por planilla seleccionado',
    entidad: `Reserva ${reserva.codigo}`,
    detalle: `${numeroCuotas} cuota(s) mensuales para un total de ${reserva.monto_total}.`,
  })
  return responder({ ...reserva, inmueble: store.inmuebles.find((i) => i.id === reserva.inmueble_id) ?? null })
}

/** Responde una consulta/observación ingresada al crear la reserva. */
export function responderConsultaReserva(codigo, { respuesta, actor } = {}) {
  const reserva = store.reservas.find((r) => r.codigo === codigo)
  if (!reserva) return fallar(404, 'Reserva no encontrada')
  if (!reserva.observaciones?.trim()) return fallar(422, 'La reserva no contiene una consulta u observación del solicitante.')
  if (!respuesta?.trim()) return fallar(422, 'Debe ingresar una respuesta.')
  const perfil = actor?.perfil ?? ''
  if (!/regional|central/i.test(perfil)) return fallar(403, 'Solo Bienestar Regional u Oficina Central pueden responder consultas.')
  reserva.respuesta_observacion = {
    mensaje: respuesta.trim(),
    respondida_en: ahoraISO(),
    respondida_por: actor?.nombre ?? 'Bienestar',
    perfil: /central/i.test(perfil) ? 'Oficina Central' : 'Bienestar Regional',
  }
  const notificacion = store.notificaciones?.find((n) => n.tipo === 'consulta_reserva' && n.reserva_codigo === codigo && n.estado === 'pendiente')
  if (notificacion) {
    notificacion.estado = 'respondida'
    notificacion.respondida_en = reserva.respuesta_observacion.respondida_en
    notificacion.respondida_por = reserva.respuesta_observacion.respondida_por
  }
  persistir()
  registrarAuditoria({ usuario: reserva.respuesta_observacion.respondida_por, perfil: reserva.respuesta_observacion.perfil, accion: 'Consulta de reserva respondida', entidad: `Reserva ${codigo}`, detalle: respuesta.trim() })
  return responder({ ...reserva, inmueble: store.inmuebles.find((i) => i.id === reserva.inmueble_id) ?? null })
}

/** GET /api/pagos/transferencia/datos — datos bancarios mostrados al usuario. */
export function getDatosTransferencia() {
  return responder(store.datos_transferencia)
}

/**
 * POST /api/reservas/{codigo}/pago-transferencia
 * El titular informa que realizó una transferencia por el total de la reserva.
 */
export function informarPagoTransferencia(codigo, { comprobante = null, actor } = {}) {
  const reserva = store.reservas.find((r) => r.codigo === codigo)
  if (!reserva) return fallar(404, 'Reserva no encontrada')
  if (!ESTADOS_CON_COBRO.includes(reserva.estado)) {
    return fallar(422, 'El pago por transferencia se habilita después de realizar el check-out.')
  }
  if (reserva.monto_total <= 0) return fallar(422, 'La reserva no tiene un monto pendiente de pago.')
  if (reserva.pago_transferencia?.estado === 'confirmado') {
    return fallar(409, 'Esta reserva ya fue confirmada como pagada por transferencia.')
  }
  // Evita el doble cobro: si eligió planilla o el cobro ya salió a
  // Remuneraciones, no puede pagar además por transferencia.
  if (reserva.descuento_planilla) {
    return fallar(409, 'La reserva tiene descuento por planilla seleccionado; no corresponde transferencia.')
  }
  if (cobroYaEnviado(reserva.codigo)) {
    return fallar(409, 'El cobro ya fue informado a Remuneraciones para descuento por planilla.')
  }

  reserva.pago_transferencia = {
    estado: 'informado',
    monto: reserva.monto_total,
    informado_en: ahoraISO(),
    informado_por: actor?.nombre ?? reserva.titular_nombre ?? 'Titular',
    comprobante,
    confirmado_en: null,
    confirmado_por: null,
  }
  persistir()
  registrarAuditoria({
    usuario: actor?.nombre ?? reserva.titular_nombre ?? 'Titular',
    perfil: actor?.perfil ?? (reserva.titular_es_afiliado ? 'Afiliado' : 'Usuario no afiliado'),
    accion: 'Pago por transferencia informado',
    entidad: `Reserva ${reserva.codigo}`,
    detalle: `Transferencia informada por ${reserva.monto_total}. Pendiente de confirmación por Oficina Central.`,
  })
  return responder({
    ...reserva,
    inmueble: store.inmuebles.find((i) => i.id === reserva.inmueble_id) ?? null,
  })
}

/** GET /api/pagos/transferencia/pendientes — bandeja de Oficina Central. */
export function getPagosTransferenciaPendientes() {
  const items = store.reservas
    .filter((r) => r.pago_transferencia?.estado === 'informado')
    .map((r) => ({
      ...r,
      inmueble: store.inmuebles.find((i) => i.id === r.inmueble_id) ?? null,
    }))
    .sort((a, b) => (a.pago_transferencia.informado_en < b.pago_transferencia.informado_en ? 1 : -1))
  return responder(lista(items))
}

/** PATCH /api/reservas/{codigo}/pago-transferencia/confirmar — Oficina Central. */
export function confirmarPagoTransferencia(codigo, actor) {
  const reserva = store.reservas.find((r) => r.codigo === codigo)
  if (!reserva) return fallar(404, 'Reserva no encontrada')
  if (reserva.pago_transferencia?.estado !== 'informado') {
    return fallar(422, 'No existe una transferencia pendiente de confirmación para esta reserva.')
  }
  if (cobroYaEnviado(codigo)) {
    return fallar(409, 'El cobro ya fue informado a Remuneraciones: revise el caso antes de confirmar la transferencia para evitar un doble cobro.')
  }

  reserva.pago_transferencia = {
    ...reserva.pago_transferencia,
    estado: 'confirmado',
    confirmado_en: ahoraISO(),
    confirmado_por: actor?.nombre ?? 'Oficina Central',
  }

  // Al confirmarse el pago total por transferencia, el cobro deja de corresponder
  // a descuento por planilla. Se conserva la marca para trazabilidad, pero se oculta
  // de la nómina operativa que se exporta a Personal/Remuneraciones.
  store.nominas.forEach((nomina) => {
    nomina.items.forEach((item) => {
      if (item.reserva_codigo === codigo) {
        item.excluido_por_pago_transferencia = true
        item.excluido_en = reserva.pago_transferencia.confirmado_en
        item.excluido_por = reserva.pago_transferencia.confirmado_por
      }
    })
  })

  persistir()
  registrarAuditoria({
    usuario: actor?.nombre ?? 'Oficina Central',
    perfil: actor?.perfil ?? 'Oficina Central',
    accion: 'Transferencia confirmada',
    entidad: `Reserva ${reserva.codigo}`,
    detalle: `Pago total por transferencia confirmado por ${reserva.monto_total}. Reserva excluida de descuento por planilla.`,
  })
  return responder({
    ...reserva,
    inmueble: store.inmuebles.find((i) => i.id === reserva.inmueble_id) ?? null,
  })
}

/** GET /api/reservas/simular-tarifa — usada por el asistente de reserva. */
export function simularTarifa({
  inmueble_id,
  fecha_entrada,
  fecha_salida,
  motivo,
  ocupantes,
  titularEsAfiliado = true,
}) {
  const inmueble = store.inmuebles.find((i) => i.id === Number(inmueble_id))
  if (!inmueble) return fallar(404, 'Inmueble no encontrado')
  const tarifa = calcularTarifa({
    inmueble,
    fechaEntrada: fecha_entrada,
    fechaSalida: fecha_salida,
    motivo,
    ocupantes,
    temporadas: store.temporadas,
    titularEsAfiliado,
    tarifasConfig: store.tarifas_config,
  })
  return responder(tarifa)
}
