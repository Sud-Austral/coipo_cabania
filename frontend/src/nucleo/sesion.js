/* Perfil activo de la maqueta. No hay login: el selector de la cabecera cambia de perfil.
   Un solo estado para toda la app (store de módulo + useSyncExternalStore), como diseno/tema.js.
   La encargada regional puede mirar otra región (en la maqueta, para probar cualquier casa). */
import { useSyncExternalStore } from 'react'
import { ROLES, usuarioPorRol } from '../logica/fixtures/usuarios.js'

const CLAVE = 'cabanas_v2_perfil'
const CLAVE_REGION = 'cabanas_v2_region'

export const PERFILES = [
  { valor: 'afiliado', etiqueta: 'Afiliado' },
  { valor: 'no_afiliado', etiqueta: 'No afiliado' },
  { valor: 'regional', etiqueta: 'Encargada regional' },
  { valor: 'central', etiqueta: 'Oficina Central' },
  { valor: 'admin', etiqueta: 'Administrador' },
]

const leerGuardado = (clave, valido) => {
  try { const v = localStorage.getItem(clave); return valido(v) ? v : null } catch { return null }
}

let rol = leerGuardado(CLAVE, (v) => PERFILES.some((p) => p.valor === v)) ?? 'afiliado'
let region = leerGuardado(CLAVE_REGION, (v) => /^\d{2}$/.test(v ?? '')) ?? usuarioPorRol('regional').region
let instantanea = null
const subs = new Set()

function armar() {
  const definicion = ROLES.find((r) => r.valor === rol) ?? ROLES[0]
  const usuario = usuarioPorRol(rol)
  return {
    rol,
    region,
    usuario,
    // Actor que queda en la auditoría. `perfil` es la etiqueta de v1: la lógica la lee
    // (p. ej. responderConsultaReserva exige «regional» o «central» en el perfil).
    actor: { ...usuario, perfil: definicion.etiqueta },
    esPortal: rol === 'afiliado' || rol === 'no_afiliado',
    esAfiliado: rol === 'afiliado',
  }
}

const avisar = () => { instantanea = armar(); subs.forEach((f) => f()) }

export function cambiarPerfil(nuevo) {
  rol = nuevo
  try { localStorage.setItem(CLAVE, nuevo) } catch { /* sin persistencia */ }
  avisar()
}

export function cambiarRegion(nueva) {
  region = nueva
  try { localStorage.setItem(CLAVE_REGION, nueva) } catch { /* sin persistencia */ }
  avisar()
}

export const leerSesion = () => instantanea ?? (instantanea = armar())

export function useSesion() {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f) }, leerSesion)
}
