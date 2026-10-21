/**
 * Estado mutable de la maqueta.
 *
 * Hace de "base de datos" en memoria: parte de los fixtures y persiste en
 * localStorage para que lo creado durante la demostración sobreviva a un
 * refresco de página. `reiniciarDemo()` vuelve todo a las semillas.
 *
 * En la fase 2 este archivo desaparece: su lugar lo toma PostgreSQL.
 */

import { inmuebles as inmueblesSeed } from '../fixtures/inmuebles.js'
import { reservasSeed } from '../fixtures/reservas.seed.js'
import { temporadas as temporadasSeed, bloqueosTemporada } from '../fixtures/temporadas.js'
import {
  sancionesSeed,
  nominasSeed,
  auditoriaSeed,
  ultimaCargaNomina,
} from '../fixtures/gestion.seed.js'
import { valoracionesSeed } from '../fixtures/valoraciones.seed.js'
import { usuarios as usuariosSeed } from '../fixtures/usuarios.js'
import { tarifas as tarifasSeed } from '../fixtures/tarifas.js'
import { CONCEPTO_COBRO, ESTADOS_CON_COBRO, etiquetaPeriodo } from '../lib/cobros.js'

// v2: clave propia. Con la de v1 ('coipo_demo_v3'), si ambas maquetas se sirven en el mismo
// origen (Forge LAB), una pisaría los datos de la otra. Ver docs/HALLAZGOS.md.
const CLAVE = 'cabanas_v2_demo_v1'

/**
 * Completa la nómina con los cobros históricos de afiliados que las semillas
 * no traían (estadías y anulaciones de enero a junio): quedan descontados y
 * su período cerrado, como ocurriría en la operación real.
 */
function conNominasHistoricas(nominas, reservas, inmuebles) {
  const conItem = new Set(nominas.flatMap((n) => n.items.map((i) => i.reserva_codigo)))
  const resultado = nominas.map((n) => ({ ...n, items: [...n.items] }))
  reservas
    .filter((r) => r.titular_es_afiliado && ESTADOS_CON_COBRO.includes(r.estado) && r.monto_total > 0 && !conItem.has(r.codigo))
    .forEach((r) => {
      const periodo = (r.check_out ?? r.fecha_salida).slice(0, 7)
      let nomina = resultado.find((n) => n.periodo === periodo)
      if (!nomina) {
        nomina = { periodo, etiqueta: etiquetaPeriodo(periodo), estado_general: 'cerrado', items: [] }
        resultado.push(nomina)
      }
      nomina.items.push({
        reserva_codigo: r.codigo,
        rut: r.titular_rut,
        nombre: r.titular_nombre,
        inmueble: inmuebles.find((i) => i.id === r.inmueble_id)?.nombre ?? '—',
        concepto: CONCEPTO_COBRO[r.estado] ?? 'Cobro',
        noches: 0,
        cuota: 1,
        total_cuotas: 1,
        monto: r.monto_total,
        monto_total_reserva: r.monto_total,
        periodo_inicio: periodo,
        medio_pago: 'planilla',
        estado: 'descontado',
      })
    })
  return resultado.sort((a, b) => (a.periodo < b.periodo ? 1 : -1))
}

function semillas() {
  return {
    inmuebles: inmueblesSeed,
    reservas: reservasSeed,
    temporadas: temporadasSeed,
    bloqueos: bloqueosTemporada,
    sanciones: sancionesSeed,
    nominas: conNominasHistoricas(nominasSeed, reservasSeed, inmueblesSeed),
    auditoria: auditoriaSeed,
    carga_nomina: ultimaCargaNomina,
    valoraciones: valoracionesSeed,
    usuarios: usuariosSeed,
    tarifas_config: tarifasSeed,
    notificaciones: [],
    cargas_nomina: [],
    datos_transferencia: {
      banco: 'Banco por definir',
      tipo_cuenta: 'Cuenta corriente',
      numero_cuenta: '000000000',
      titular: 'Servicio de Bienestar CONAF',
      rut: 'Por definir',
      correo: 'Por definir',
      nota: 'Datos demostrativos. Reemplazar por los datos bancarios oficiales antes de uso operativo.',
    },
  }
}

function clonar(valor) {
  return typeof structuredClone === 'function'
    ? structuredClone(valor)
    : JSON.parse(JSON.stringify(valor))
}

function cargar() {
  try {
    const guardado = localStorage.getItem(CLAVE)
    if (guardado) return { ...clonar(semillas()), ...JSON.parse(guardado) }
  } catch {
    // localStorage no disponible o dato corrupto: se usan las semillas.
  }
  return clonar(semillas())
}

export const store = cargar()

export function persistir() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(store))
  } catch {
    // Sin persistencia (modo privado del navegador): la demo sigue en memoria.
  }
}

export function reiniciarDemo() {
  try {
    localStorage.removeItem(CLAVE)
  } catch {
    // sin efecto
  }
  const frescas = clonar(semillas())
  Object.keys(store).forEach((k) => delete store[k])
  Object.assign(store, frescas)
}

/** Siguiente id disponible para una colección. */
export function siguienteId(coleccion) {
  return coleccion.reduce((max, item) => Math.max(max, item.id ?? 0), 0) + 1
}

/** Registra una pista de auditoría (Ley 19.628 / 21.719). */
export function registrarAuditoria({ usuario, perfil, accion, entidad, detalle }) {
  store.auditoria.unshift({
    id: siguienteId(store.auditoria),
    fecha_hora: new Date().toISOString().slice(0, 19),
    usuario,
    perfil,
    accion,
    entidad,
    detalle,
  })
  persistir()
}
