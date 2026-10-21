import { responder, fallar, lista } from './client.js'
import { store, persistir, siguienteId, registrarAuditoria } from './store.js'
import { itemsDeReserva } from './nominas.js'
import { CONCEPTO_COBRO, ESTADOS_CON_COBRO } from '../lib/cobros.js'

const auditar = (actor, accion, entidad, detalle) => registrarAuditoria({ usuario: actor?.nombre ?? 'Administrador', perfil: actor?.perfil ?? 'Administrador', accion, entidad, detalle })

export const getInmueblesAdmin = () => responder(lista(store.inmuebles))

export const getUsuariosGestion = () => responder(lista(store.usuarios))
export function guardarUsuario(datos, actor) {
  const repetido = store.usuarios.find((u) => u.rut === datos.rut && u.id !== datos.id)
  if (repetido) return fallar(422, 'Ya existe un usuario con ese RUT.')
  let usuario
  if (datos.id) { usuario = store.usuarios.find((u) => u.id === datos.id); Object.assign(usuario, datos) }
  else { usuario = { id: siguienteId(store.usuarios), activo: true, grupo_familiar: [], ...datos }; store.usuarios.push(usuario) }
  persistir(); auditar(actor, datos.id ? 'Modificación de usuario' : 'Creación de usuario', usuario.nombre, JSON.stringify(datos)); return responder(usuario)
}
export function cambiarEstadoUsuario(id, activo, actor) { const u = store.usuarios.find((x) => x.id === Number(id)); if (!u) return fallar(404, 'Usuario no encontrado'); if (u.id === actor?.id && !activo) return fallar(422, 'No puede desactivar su propio usuario.'); u.activo = activo; persistir(); auditar(actor, activo ? 'Activación de usuario' : 'Desactivación de usuario', u.nombre, `Estado: ${activo}`); return responder(u) }

export const getTarifasGestion = () => responder(store.tarifas_config)
export function guardarTarifas(datos, actor) { const anterior = JSON.stringify(store.tarifas_config); store.tarifas_config = structuredClone(datos); persistir(); auditar(actor, 'Actualización de tarifas', `Vigencia ${datos.vigencia.desde} a ${datos.vigencia.hasta}`, `Anterior: ${anterior}; nuevo: ${JSON.stringify(datos)}`); return responder(store.tarifas_config) }

export function crearInmueble(datos, actor) { const item = { id: siguienteId(store.inmuebles), activo: true, fotos: [], zonas_interes: [], equipamiento: [], dormitorios: 0, ...datos }; store.inmuebles.push(item); persistir(); auditar(actor, 'Creación de inmueble', item.nombre, JSON.stringify(datos)); return responder(item) }
export function cambiarEstadoInmueble(id, activo, actor) { const i = store.inmuebles.find((x) => x.id === Number(id)); if (!i) return fallar(404, 'Inmueble no encontrado'); const futuras = store.reservas.filter((r) => r.inmueble_id === i.id && ['confirmada','en_curso'].includes(r.estado) && r.fecha_salida >= new Date().toISOString().slice(0,10)); if (!activo && futuras.length) return fallar(422, `No puede desactivar: existen ${futuras.length} reservas vigentes o futuras.`); i.activo = activo; persistir(); auditar(actor, activo ? 'Activación de inmueble' : 'Desactivación de inmueble', i.nombre, `Estado: ${activo}`); return responder(i) }
export function guardarContenidoInmueble(id, { fotos, zonas_interes }, actor) { const i = store.inmuebles.find((x) => x.id === Number(id)); if (!i) return fallar(404, 'Inmueble no encontrado'); i.fotos = fotos; i.zonas_interes = zonas_interes; persistir(); auditar(actor, 'Actualización de contenido', i.nombre, `${fotos.length} fotos, ${zonas_interes.length} zonas`); return responder(i) }

export function importarNomina(filas, actor) { const errores=[]; const vistos=new Set(); const validas=[]; filas.forEach((f, indice) => { if (!f.rut || !f.nombre) errores.push({ fila: indice+2, error:'RUT y nombre obligatorios' }); else if (vistos.has(f.rut)) errores.push({ fila:indice+2,error:'RUT duplicado'}); else { vistos.add(f.rut); validas.push(f) } }); const carga={ id:siguienteId(store.cargas_nomina), fecha:new Date().toISOString(), total:filas.length, validas:validas.length, errores }; store.cargas_nomina.unshift(carga); store.carga_nomina={ fecha:carga.fecha, total_registros:filas.length, afiliados_vigentes:validas.length, errores:errores.length }; persistir(); auditar(actor,'Carga de nómina','Nómina de afiliados',`${validas.length} válidas, ${errores.length} errores`); return responder(carga) }

/**
 * GET /api/cobros — vista de solo lectura para Oficina Central.
 *
 * Se calcula al momento desde las reservas y la nómina de descuentos
 * (api/nominas.js): no hay una lista paralela que preparar ni aprobar.
 * Cada cobro queda en una de cuatro situaciones según lo que falta hacer.
 */
export function getCobros() {
  const items = store.reservas
    .filter((r) => ESTADOS_CON_COBRO.includes(r.estado) && r.monto_total > 0)
    .map((r) => {
      const cuotas = itemsDeReserva(r.codigo)
        .filter(({ item }) => !item.excluido_por_pago_transferencia)
        .map(({ nomina, item }) => ({ periodo: nomina.periodo, etiqueta: nomina.etiqueta, monto: item.monto, estado: item.estado }))
        .sort((x, y) => (x.periodo < y.periodo ? -1 : 1))
      const transferencia = r.pago_transferencia?.estado ?? null
      const descontadas = cuotas.filter((c) => c.estado === 'descontado')
      let situacion
      if (transferencia === 'confirmado') situacion = 'pagado'
      else if (transferencia === 'informado') situacion = 'transferencia_por_confirmar'
      else if (cuotas.length && descontadas.length === cuotas.length) situacion = 'pagado'
      else if (cuotas.length) situacion = 'en_planilla'
      else situacion = 'por_pagar'
      const pagado = transferencia === 'confirmado' ? r.monto_total : descontadas.reduce((s, c) => s + c.monto, 0)
      return {
        reserva_codigo: r.codigo,
        titular_nombre: r.titular_nombre,
        titular_rut: r.titular_rut,
        titular_es_afiliado: r.titular_es_afiliado,
        inmueble: store.inmuebles.find((i) => i.id === r.inmueble_id)?.nombre ?? '—',
        concepto: CONCEPTO_COBRO[r.estado] ?? 'Cobro',
        monto: r.monto_total,
        pagado,
        saldo: r.monto_total - pagado,
        situacion,
        medio_pago: transferencia ? 'transferencia' : cuotas.length ? 'planilla' : 'por_pagar',
        transferencia,
        cuotas,
        fecha: r.check_out ?? r.anulada_en ?? r.solicitud_fuerza_mayor?.resuelta_en ?? r.fecha_salida,
      }
    })
    .sort((x, y) => ((x.fecha ?? '') < (y.fecha ?? '') ? 1 : -1))
  return responder(lista(items))
}
export function resolverIncidencia(codigo, decision, fundamento, actor) { const r=store.reservas.find((x)=>x.codigo===codigo); if(!r?.incidencia) return fallar(404,'Incidencia no encontrada'); r.incidencia.estado=decision; r.incidencia.fundamento=fundamento; r.incidencia.resuelta_en=new Date().toISOString(); persistir(); auditar(actor,'Resolución de incidencia',codigo,`${decision}: ${fundamento}`); return responder(r.incidencia) }
