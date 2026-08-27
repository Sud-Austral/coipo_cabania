/**
 * Endpoints de gestión: sanciones, nóminas de descuento, auditoría, temporadas
 * y reportes (maqueta). Perfiles Oficina Central y Administrador.
 */

import { responder, fallar, lista } from './client.js'
import { store, persistir, siguienteId, registrarAuditoria } from './store.js'
import { nombreRegion } from '../fixtures/inmuebles.js'
import { MOTIVOS } from '../fixtures/tarifas.js'
import { contarNoches } from '../lib/tarifas.js'

/** GET /api/sanciones */
export function getSanciones() {
  return responder(lista(store.sanciones))
}

/** POST /api/sanciones */
export function crearSancion(datos, actor) {
  const sancion = {
    id: siguienteId(store.sanciones),
    estado: 'vigente',
    fundamento_levantamiento: null,
    ...datos,
  }
  store.sanciones.unshift(sancion)
  persistir()
  registrarAuditoria({
    usuario: actor?.nombre ?? 'Oficina Central',
    perfil: actor?.perfil ?? 'Oficina Central',
    accion: 'Registro de sanción',
    entidad: `Usuario ${sancion.usuario_rut}`,
    detalle: `${sancion.etiqueta_tipo}: ${sancion.motivo}`,
  })
  return responder(sancion)
}

/** PATCH /api/sanciones/{id}/levantar */
export function levantarSancion(id, fundamento, actor) {
  const sancion = store.sanciones.find((s) => s.id === Number(id))
  if (!sancion) return fallar(404, 'Sanción no encontrada')
  sancion.estado = 'levantada'
  sancion.fundamento_levantamiento = fundamento
  persistir()
  registrarAuditoria({
    usuario: actor?.nombre ?? 'Oficina Central',
    perfil: actor?.perfil ?? 'Oficina Central',
    accion: 'Levantamiento de sanción',
    entidad: `Usuario ${sancion.usuario_rut}`,
    detalle: fundamento,
  })
  return responder(sancion)
}

/** GET /api/nominas-descuento */
export function getNominas() {
  const nominasVisibles = store.nominas.map((nomina) => ({
    ...nomina,
    items: nomina.items.filter((item) => {
      if (item.excluido_por_pago_transferencia) return false
      const reserva = store.reservas.find((r) => r.codigo === item.reserva_codigo)
      return reserva?.pago_transferencia?.estado !== 'confirmado'
    }),
  }))
  return responder(lista(nominasVisibles))
}

/** PATCH /api/nominas-descuento/{periodo} — marca el estado de los cobros */
export function marcarNomina(periodo, nuevoEstado, actor) {
  const nomina = store.nominas.find((n) => n.periodo === periodo)
  if (!nomina) return fallar(404, 'Período no encontrado')
  nomina.items.forEach((item) => {
    if (nuevoEstado === 'informado' && item.estado === 'pendiente') item.estado = 'informado'
    if (nuevoEstado === 'descontado' && item.estado === 'informado') item.estado = 'descontado'
  })
  persistir()
  registrarAuditoria({
    usuario: actor?.nombre ?? 'Oficina Central',
    perfil: actor?.perfil ?? 'Oficina Central',
    accion: 'Actualización de nómina',
    entidad: `Nómina ${periodo}`,
    detalle: `Cobros marcados como "${nuevoEstado}".`,
  })
  return responder(nomina)
}

/** GET /api/auditoria */
export function getAuditoria() {
  return responder(lista(store.auditoria))
}

/** GET /api/carga-nomina — resumen de la última carga de afiliados */
export function getCargaNomina() {
  return responder(store.carga_nomina)
}

/** GET /api/temporadas (gestión) */
export function getTemporadasGestion() {
  return responder(lista(store.temporadas))
}

/** POST /api/temporadas */
export function crearTemporada(datos, actor) {
  const temporada = { id: siguienteId(store.temporadas), ...datos }
  store.temporadas.push(temporada)
  persistir()
  registrarAuditoria({
    usuario: actor?.nombre ?? 'Administrador del sistema',
    perfil: actor?.perfil ?? 'Administrador',
    accion: 'Creación de temporada',
    entidad: temporada.nombre,
    detalle: `${temporada.desde} al ${temporada.hasta} (${temporada.tipo}).`,
  })
  return responder(temporada)
}

/**
 * GET /api/reportes/uso
 * Ocupación por región, reservas por motivo, ranking de inmuebles y totales
 * (solicitud §5.3 req. 21).
 */
export function getReportes() {
  const reservas = store.reservas
  const cuentanParaUso = reservas.filter((r) =>
    ['confirmada', 'en_curso', 'finalizada'].includes(r.estado),
  )

  const porRegion = {}
  const porInmueble = {}
  cuentanParaUso.forEach((r) => {
    const inmueble = store.inmuebles.find((i) => i.id === r.inmueble_id)
    if (!inmueble) return
    const noches = contarNoches(r.fecha_entrada, r.fecha_salida)

    porRegion[inmueble.region] ??= { region: inmueble.region, nombre: nombreRegion(inmueble.region), noches: 0, reservas: 0, ingresos: 0 }
    porRegion[inmueble.region].noches += noches
    porRegion[inmueble.region].reservas += 1
    porRegion[inmueble.region].ingresos += r.monto_total

    porInmueble[inmueble.id] ??= { id: inmueble.id, nombre: inmueble.nombre, localidad: inmueble.localidad, noches: 0, reservas: 0 }
    porInmueble[inmueble.id].noches += noches
    porInmueble[inmueble.id].reservas += 1
  })

  const porMotivo = MOTIVOS.map((m) => ({
    motivo: m.valor,
    nombre: m.etiqueta,
    reservas: reservas.filter((r) => r.motivo === m.valor).length,
  }))

  const ranking = Object.values(porInmueble)
    .sort((a, b) => b.noches - a.noches)
    .slice(0, 8)

  return responder({
    totales: {
      inmuebles: store.inmuebles.length,
      reservas: reservas.length,
      noches: cuentanParaUso.reduce((s, r) => s + contarNoches(r.fecha_entrada, r.fecha_salida), 0),
      ingresos: cuentanParaUso.reduce((s, r) => s + r.monto_total, 0),
      anuladas: reservas.filter((r) => r.estado === 'anulada').length,
      lista_espera: reservas.filter((r) => r.estado === 'lista_espera').length,
      pendientes: reservas.filter((r) => r.estado === 'recibida').length,
    },
    por_region: Object.values(porRegion).sort((a, b) => b.noches - a.noches),
    por_motivo: porMotivo,
    ranking_inmuebles: ranking,
  })
}
