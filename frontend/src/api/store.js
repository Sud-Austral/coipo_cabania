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

const CLAVE = 'coipo_demo_v1'

function semillas() {
  return {
    inmuebles: inmueblesSeed,
    reservas: reservasSeed,
    temporadas: temporadasSeed,
    bloqueos: bloqueosTemporada,
    sanciones: sancionesSeed,
    nominas: nominasSeed,
    auditoria: auditoriaSeed,
    carga_nomina: ultimaCargaNomina,
    valoraciones: valoracionesSeed,
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
