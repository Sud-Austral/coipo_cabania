import { createContext, useContext, useMemo, useState } from 'react'
import { porId } from '../datos/usuarios.js'

const CLAVE = 'reserva_veraneo_sesion_v2'
const Contexto = createContext(null)

/**
 * Sesión de la maqueta. Guarda quién ingresó: una persona de la nómina (por su
 * id) o un funcionario de otro servicio (con los datos que declaró).
 * En producción la sesión la emite el backend tras validar el código.
 */
function leer() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE))
  } catch {
    return null
  }
}

function resolver(s) {
  if (!s) return null
  if (s.demo) {
    // Solo maqueta: RUT válido que no está en la nómina de prueba.
    return {
      ...s.demo,
      id: 'demo-' + s.demo.rut,
      calidad: 'afiliado',
      plazo_fijo: false,
      perfil: 'solicitante',
      rol: 'Funcionario/a (persona de demostración)',
      unidad: 'Oficina Central',
      region: '13',
      grupo_familiar: [],
      demostracion: true,
    }
  }
  if (s.externo) {
    return {
      ...s.externo,
      id: 'ext-' + s.externo.rut,
      calidad: 'otro_servicio',
      plazo_fijo: false,
      perfil: 'solicitante',
      rol: 'Funcionario/a de ' + s.externo.institucion,
      unidad: s.externo.institucion,
      region: s.externo.region ?? '',
      grupo_familiar: [],
    }
  }
  return porId(s.id)
}

export function ProveedorSesion({ children }) {
  const [sesion, setSesion] = useState(leer)

  const valor = useMemo(() => {
    const guardar = (s) => {
      try {
        if (s) localStorage.setItem(CLAVE, JSON.stringify(s))
        else localStorage.removeItem(CLAVE)
      } catch {
        // sin persistencia
      }
      setSesion(s)
    }
    const usuario = resolver(sesion)
    return {
      usuario,
      perfil: usuario?.perfil ?? null,
      ingresar: guardar,
      salir: () => guardar(null),
    }
  }, [sesion])

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useSesion = () => useContext(Contexto)

/** Inicio de cada perfil. */
// eslint-disable-next-line react-refresh/only-export-components
export const INICIO = { solicitante: '/', encargada: '/encargada', central: '/central', uia: '/uia' }
