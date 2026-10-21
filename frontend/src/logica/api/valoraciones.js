/**
 * Endpoints de valoraciones (maqueta).
 * Emula: /api/inmuebles/{id}/valoraciones (GET y POST)
 *
 * Regla de negocio: solo puede valorar quien tuvo una reserva finalizada en el
 * inmueble, y una sola vez por reserva.
 */
import { responder, fallar, lista } from './client.js'
import { store, persistir, siguienteId, registrarAuditoria } from './store.js'

const deInmueble = (inmuebleId) =>
  store.valoraciones.filter((v) => v.inmueble_id === Number(inmuebleId))

/**
 * Promedio y total de un inmueble. Es SÍNCRONA a propósito: la usan otros
 * endpoints para adjuntar el resumen sin encadenar promesas.
 */
export function resumenValoracion(inmuebleId) {
  const items = deInmueble(inmuebleId)
  if (items.length === 0) return { promedio: null, total: 0 }
  const suma = items.reduce((acc, v) => acc + v.estrellas, 0)
  return { promedio: Math.round((suma / items.length) * 10) / 10, total: items.length }
}

/** Valoración asociada a una reserva, o null si todavía no se valoró. */
export function valoracionDeReserva(codigo) {
  return store.valoraciones.find((v) => v.reserva_codigo === codigo) ?? null
}

/** GET /api/inmuebles/{id}/valoraciones */
export function getValoraciones(inmuebleId) {
  const items = deInmueble(inmuebleId).sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
  return responder({ ...lista(items), resumen: resumenValoracion(inmuebleId) })
}

/** POST /api/inmuebles/{id}/valoraciones */
export function crearValoracion({ inmueble_id, reserva_codigo, estrellas, comentario }, actor) {
  const nota = Number(estrellas)
  if (!Number.isInteger(nota) || nota < 1 || nota > 5) {
    return fallar(422, 'La valoración debe ser un número entero de 1 a 5 estrellas.')
  }

  const reserva = store.reservas.find((r) => r.codigo === reserva_codigo)
  if (!reserva) return fallar(404, 'Reserva no encontrada')
  if (reserva.estado !== 'finalizada') {
    return fallar(409, 'Solo se pueden valorar estadías finalizadas.')
  }
  if (valoracionDeReserva(reserva_codigo)) {
    return fallar(409, 'Esta reserva ya fue valorada.')
  }

  const valoracion = {
    id: siguienteId(store.valoraciones),
    inmueble_id: Number(inmueble_id),
    reserva_codigo,
    usuario_id: actor?.id ?? null,
    autor: actor?.nombre ?? 'Usuario',
    estrellas: nota,
    comentario: comentario?.trim() || null,
    fecha: new Date().toISOString().slice(0, 19),
  }

  store.valoraciones.push(valoracion)
  persistir()

  const inmueble = store.inmuebles.find((i) => i.id === valoracion.inmueble_id)
  registrarAuditoria({
    usuario: valoracion.autor,
    perfil: actor?.perfil ?? 'Afiliado',
    accion: 'Valoración de estadía',
    entidad: inmueble?.nombre ?? `Inmueble ${valoracion.inmueble_id}`,
    detalle: `${nota} de 5 estrellas en la reserva ${reserva_codigo}.`,
  })

  return responder(valoracion)
}
