/**
 * Endpoints de inmuebles y disponibilidad (maqueta).
 * Emula: /api/inmuebles, /api/inmuebles/{id}, /api/inmuebles/{id}/disponibilidad
 */

import { eachDayOfInterval, parseISO, isWithinInterval, subDays } from 'date-fns'
import { responder, fallar, lista } from './client.js'
import { store, persistir, siguienteId, registrarAuditoria } from './store.js'
import { resumenValoracion } from './valoraciones.js'
import { ESTADOS_QUE_OCUPAN } from '../lib/estados.js'
import { aISO } from '../lib/formato.js'

/** Adjunta el promedio de valoraciones, igual que el backend lo devolvería. */
const conValoracion = (inmueble) => ({
  ...inmueble,
  valoracion: resumenValoracion(inmueble.id),
})

/** GET /api/inmuebles?region=&tipo=&capacidad_min=&busqueda= */
export function getInmuebles(filtros = {}) {
  const { region, tipo, capacidad_min, localidad, busqueda, fecha_entrada, fecha_salida } = filtros
  let items = store.inmuebles
  items = items.filter((i) => i.activo !== false)

  if (region) items = items.filter((i) => i.region === region)
  if (tipo) items = items.filter((i) => i.tipo === tipo)
  if (localidad) items = items.filter((i) => i.localidad === localidad)
  if (capacidad_min) items = items.filter((i) => i.capacidad_maxima >= Number(capacidad_min))
  if (busqueda) {
    const q = busqueda.toLowerCase()
    items = items.filter(
      (i) =>
        i.nombre.toLowerCase().includes(q) ||
        i.localidad.toLowerCase().includes(q) ||
        i.descripcion.toLowerCase().includes(q),
    )
  }

  return responder(lista(items.map((item) => ({
    ...conValoracion(item),
    disponibilidad_rango:
      fecha_entrada && fecha_salida
        ? rangoDisponible(item.id, fecha_entrada, fecha_salida)
        : null,
  }))))
}

/** GET /api/inmuebles/{id} */
export function getInmueble(id) {
  const inmueble = store.inmuebles.find((i) => i.id === Number(id))
  if (!inmueble) return fallar(404, 'Inmueble no encontrado')
  return responder(conValoracion(inmueble))
}

/**
 * GET /api/inmuebles/{id}/disponibilidad?desde=&hasta=
 * Devuelve el estado de cada día: disponible | ocupado | bloqueado | mantencion
 */
export function getDisponibilidad(id, desde, hasta) {
  const inmuebleId = Number(id)
  const inmueble = store.inmuebles.find((i) => i.id === inmuebleId)
  if (!inmueble) return fallar(404, 'Inmueble no encontrado')

  const rango = { start: parseISO(desde), end: parseISO(hasta) }
  const dias = eachDayOfInterval(rango).map((fecha) => ({
    fecha: aISO(fecha),
    estado: 'disponible',
    motivo: null,
  }))

  const indice = new Map(dias.map((d) => [d.fecha, d]))

  // Días tomados por reservas que ocupan el inmueble.
  store.reservas
    .filter((res) => res.inmueble_id === inmuebleId && ESTADOS_QUE_OCUPAN.includes(res.estado))
    .forEach((res) => {
      // La noche de salida no se ocupa: el rango va hasta la víspera.
      const fin = subDays(parseISO(res.fecha_salida), 1)
      const inicio = parseISO(res.fecha_entrada)
      if (fin < inicio) return
      eachDayOfInterval({ start: inicio, end: fin }).forEach((f) => {
        const dia = indice.get(aISO(f))
        if (dia) {
          dia.estado = 'ocupado'
          dia.motivo = `Reserva ${res.codigo}`
        }
      })
    })

  // Bloqueos por mantención, temporada o destinación institucional.
  store.bloqueos
    .filter((b) => b.inmueble_id === null || b.inmueble_id === inmuebleId)
    .forEach((b) => {
      eachDayOfInterval({ start: parseISO(b.desde), end: parseISO(b.hasta) }).forEach((f) => {
        const dia = indice.get(aISO(f))
        if (dia && dia.estado === 'disponible') {
          dia.estado = b.origen === 'mantencion' ? 'mantencion' : 'bloqueado'
          dia.motivo = b.motivo
        }
      })
    })

  return responder({ inmueble_id: inmuebleId, desde, hasta, dias })
}

/** GET /api/temporadas */
export function getTemporadas() {
  return responder(lista(store.temporadas))
}

/** GET /api/bloqueos?inmueble_id= */
export function getBloqueos(inmuebleId) {
  const items = inmuebleId
    ? store.bloqueos.filter((b) => b.inmueble_id === Number(inmuebleId) || b.inmueble_id === null)
    : store.bloqueos
  return responder(lista(items))
}

/** POST /api/inmuebles/{id}/bloqueos */
export function crearBloqueo({ inmueble_id, desde, hasta, motivo, origen = 'mantencion' }, actor) {
  const bloqueo = {
    id: siguienteId(store.bloqueos),
    inmueble_id: inmueble_id ? Number(inmueble_id) : null,
    desde,
    hasta,
    motivo,
    origen,
  }
  store.bloqueos.push(bloqueo)
  persistir()

  const nombre =
    store.inmuebles.find((i) => i.id === bloqueo.inmueble_id)?.nombre ?? 'Toda la red'
  registrarAuditoria({
    usuario: actor?.nombre ?? 'Sistema',
    perfil: actor?.perfil ?? 'Sistema',
    accion: 'Bloqueo de fechas',
    entidad: nombre,
    detalle: `${motivo} (${desde} al ${hasta}).`,
  })
  return responder(bloqueo)
}

/** DELETE /api/bloqueos/{id} */
export function eliminarBloqueo(id, actor) {
  const indice = store.bloqueos.findIndex((b) => b.id === Number(id))
  if (indice === -1) return fallar(404, 'Bloqueo no encontrado')
  const [borrado] = store.bloqueos.splice(indice, 1)
  persistir()
  registrarAuditoria({
    usuario: actor?.nombre ?? 'Sistema',
    perfil: actor?.perfil ?? 'Sistema',
    accion: 'Levantamiento de bloqueo',
    entidad: `Bloqueo ${borrado.id}`,
    detalle: borrado.motivo,
  })
  return responder({ ok: true })
}

/** PUT /api/inmuebles/{id} — usado por el perfil administrador */
export function actualizarInmueble(id, cambios, actor) {
  const inmueble = store.inmuebles.find((i) => i.id === Number(id))
  if (!inmueble) return fallar(404, 'Inmueble no encontrado')
  Object.assign(inmueble, cambios)
  persistir()
  registrarAuditoria({
    usuario: actor?.nombre ?? 'Administrador del sistema',
    perfil: actor?.perfil ?? 'Administrador',
    accion: 'Actualización de inmueble',
    entidad: inmueble.nombre,
    detalle: `Campos modificados: ${Object.keys(cambios).join(', ')}.`,
  })
  return responder(inmueble)
}

/** Utilidad interna: ¿el rango solicitado está libre? */
export function rangoDisponible(inmuebleId, desde, hasta) {
  const inicio = parseISO(desde)
  const fin = subDays(parseISO(hasta), 1)
  if (fin < inicio) return { libre: false, motivo: 'El rango de fechas no es válido.' }

  const choqueReserva = store.reservas.find(
    (res) =>
      res.inmueble_id === Number(inmuebleId) &&
      ESTADOS_QUE_OCUPAN.includes(res.estado) &&
      eachDayOfInterval({ start: inicio, end: fin }).some((f) =>
        isWithinInterval(f, {
          start: parseISO(res.fecha_entrada),
          end: subDays(parseISO(res.fecha_salida), 1),
        }),
      ),
  )
  if (choqueReserva) {
    return { libre: false, motivo: 'Hay una reserva confirmada en esas fechas.' }
  }

  const choqueBloqueo = store.bloqueos.find(
    (b) =>
      (b.inmueble_id === null || b.inmueble_id === Number(inmuebleId)) &&
      eachDayOfInterval({ start: inicio, end: fin }).some((f) =>
        isWithinInterval(f, { start: parseISO(b.desde), end: parseISO(b.hasta) }),
      ),
  )
  if (choqueBloqueo) {
    return { libre: false, motivo: choqueBloqueo.motivo }
  }

  return { libre: true, motivo: null }
}
