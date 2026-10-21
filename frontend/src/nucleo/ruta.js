/* Enrutado por #hash (la app vive bajo /lab/cabanas-v2/ y nginx no conoce sus rutas).
   '#casa/2' → { vista: 'casa', args: ['2'] }. '#contenido' (salto al contenido) no es una vista. */
import { useSyncExternalStore } from 'react'

export const VISTAS = {
  // portal
  casas: ['afiliado', 'no_afiliado', 'regional', 'central', 'admin'],
  casa: ['afiliado', 'no_afiliado', 'regional', 'central', 'admin'],
  reservar: ['afiliado', 'no_afiliado'],
  reserva: ['afiliado', 'no_afiliado', 'regional', 'central', 'admin'],
  'mis-reservas': ['afiliado', 'no_afiliado'],
  // encargada regional
  regional: ['regional'],
  calendario: ['regional'],
  manual: ['regional'],
  // Oficina Central
  central: ['central'],
  reservas: ['central'],
  cobros: ['central'],
  reportes: ['central'],
  bloqueos: ['central'],
  // administrador
  admin: ['admin'],
  inmuebles: ['admin'],
  reglas: ['admin'],
  usuarios: ['admin'],
  auditoria: ['admin'],
  // todos
  arquitectura: ['afiliado', 'no_afiliado', 'regional', 'central', 'admin'],
}

export const INICIO = { afiliado: 'casas', no_afiliado: 'casas', regional: 'regional', central: 'central', admin: 'admin' }

let ultima = { vista: '', args: [] }
let clave = null

function leer() {
  const h = decodeURIComponent(location.hash.slice(1))
  if (h === clave) return ultima
  const [vista, ...args] = h.split('/')
  // Un ancla que no es vista (#contenido) deja la vista anterior.
  if (h && !VISTAS[vista]) return ultima
  clave = h
  ultima = { vista, args }
  return ultima
}

const suscribir = (f) => { addEventListener('hashchange', f); return () => removeEventListener('hashchange', f) }

export const useRuta = () => useSyncExternalStore(suscribir, leer)

export function ir(...partes) {
  const destino = `#${partes.filter((p) => p !== undefined && p !== null && p !== '').join('/')}`
  if (location.hash !== destino) location.hash = destino
  scrollTo({ top: 0 })
}
