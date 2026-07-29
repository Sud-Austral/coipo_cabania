/**
 * Rol activo de la maqueta.
 *
 * No hay autenticación: un selector en el encabezado cambia el perfil con el
 * que se navega. En la fase 2 este contexto se alimenta de la sesión real y el
 * selector desaparece.
 */

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { ROLES, usuarioPorRol } from '../fixtures/usuarios.js'

const CLAVE_ROL = 'coipo_rol_v1'

const RolContext = createContext(null)

export function RolProvider({ children }) {
  const [rol, setRolInterno] = useState(() => {
    try {
      return localStorage.getItem(CLAVE_ROL) ?? 'afiliado'
    } catch {
      return 'afiliado'
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_ROL, rol)
    } catch {
      // sin persistencia
    }
  }, [rol])

  const valor = useMemo(() => {
    const definicion = ROLES.find((r) => r.valor === rol) ?? ROLES[0]
    const usuario = usuarioPorRol(rol)
    return {
      rol,
      setRol: setRolInterno,
      definicion,
      usuario,
      /** Actor que se registra en las pistas de auditoría. */
      actor: usuario
        ? { ...usuario, perfil: definicion.etiqueta }
        : { nombre: 'Invitado', perfil: definicion.etiqueta },
      esAfiliado: rol === 'afiliado',
      esNoAfiliado: rol === 'no_afiliado',
      esPortal: rol === 'afiliado' || rol === 'no_afiliado',
    }
  }, [rol])

  return <RolContext.Provider value={valor}>{children}</RolContext.Provider>
}

export function useRol() {
  const contexto = useContext(RolContext)
  if (!contexto) throw new Error('useRol debe usarse dentro de RolProvider')
  return contexto
}
