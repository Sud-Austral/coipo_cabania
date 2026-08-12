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

const ahoraISO = () => new Date().toISOString().slice(0, 19)

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
  } = payload

  const inmueble = store.inmuebles.find((i) => i.id === Number(inmueble_id))
  if (!inmueble) return fallar(404, 'Inmueble no encontrado')

  if (contarNoches(fecha_entrada, fecha_salida) === 0) {
    return fallar(422, 'La fecha de salida debe ser posterior a la de entrada.')
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

  const disponibilidad = rangoDisponible(inmueble_id, fecha_entrada, fecha_salida)

  const titularEsAfiliado = actor?.tipo !== 'externo'
  const tarifa = calcularTarifa({
    inmueble,
    fechaEntrada: fecha_entrada,
    fechaSalida: fecha_salida,
    motivo,
    ocupantes,
    temporadas: store.temporadas,
    titularEsAfiliado,
  })

  // Sin cupo: la solicitud se registra en lista de espera (solicitud §5.1 req. 10).
  const estado = disponibilidad.libre ? 'recibida' : 'lista_espera'
  const id = siguienteId(store.reservas)

  const reserva = {
    id,
    codigo: `R-2026-${String(id).padStart(4, '0')}`,
    inmueble_id: Number(inmueble_id),
    usuario_id: actor?.id ?? null,
    titular_nombre: actor?.nombre ?? 'Titular',
    titular_rut: actor?.rut ?? '',
    titular_es_afiliado: titularEsAfiliado,
    fecha_entrada,
    fecha_salida,
    motivo,
    estado,
    monto_total: tarifa.total,
    ocupantes,
    detalle_tarifa: tarifa.lineas,
    observaciones: observaciones ?? (disponibilidad.libre ? null : disponibilidad.motivo),
    fundamento: null,
    check_in: null,
    check_out: null,
    origen,
    creada_en: ahoraISO(),
    historial_estados: [{ estado, fecha: ahoraISO(), por: actor?.nombre ?? 'Portal' }],
  }

  store.reservas.push(reserva)
  persistir()

  registrarAuditoria({
    usuario: actor?.nombre ?? 'Portal',
    perfil: actor?.perfil ?? 'Afiliado',
    accion: 'Creación de reserva',
    entidad: `Reserva ${reserva.codigo}`,
    detalle: `${inmueble.nombre}, ${tarifa.noches} noche(s), motivo ${motivo}.`,
  })

  return responder({ ...reserva, inmueble })
}

/** PATCH /api/reservas/{codigo}/estado */
export function cambiarEstado(codigo, nuevoEstado, { fundamento, actor } = {}) {
  const reserva = store.reservas.find((r) => r.codigo === codigo)
  if (!reserva) return fallar(404, 'Reserva no encontrada')

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
export function registrarEstadia(codigo, tipo, { observaciones, actor } = {}) {
  const reserva = store.reservas.find((r) => r.codigo === codigo)
  if (!reserva) return fallar(404, 'Reserva no encontrada')

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
  }
  if (observaciones) reserva.observaciones = observaciones
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
export function anularReserva(codigo, { fuerzaMayor = false, actor } = {}) {
  const reserva = store.reservas.find((r) => r.codigo === codigo)
  if (!reserva) return fallar(404, 'Reserva no encontrada')

  const diasAviso = differenceInCalendarDays(parseISO(reserva.fecha_entrada), new Date())
  const noches = contarNoches(reserva.fecha_entrada, reserva.fecha_salida)
  const cobro = cobroPorDesistimiento({
    montoTotal: reserva.monto_total,
    noches,
    diasAviso,
    fuerzaMayor,
  })

  reserva.estado = 'anulada'
  reserva.monto_total = cobro.monto
  reserva.observaciones = cobro.glosa
  reserva.anulada_en = ahoraISO()
  reserva.dias_aviso = diasAviso
  reserva.historial_estados.push({
    estado: 'anulada',
    fecha: reserva.anulada_en,
    por: actor?.nombre ?? 'Usuario',
  })
  persistir()

  registrarAuditoria({
    usuario: actor?.nombre ?? 'Usuario',
    perfil: actor?.perfil ?? 'Afiliado',
    accion: 'Anulación de reserva',
    entidad: `Reserva ${reserva.codigo}`,
    detalle: `${diasAviso} día(s) de aviso. ${cobro.glosa}`,
  })

  return responder({ reserva, cobro })
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
  })
  return responder(tarifa)
}
