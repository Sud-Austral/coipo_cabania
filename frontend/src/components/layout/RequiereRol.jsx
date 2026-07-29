import { UserRoundCog } from 'lucide-react'
import { ROLES } from '../../fixtures/usuarios.js'
import { useRol } from '../../context/RolContext.jsx'
import { Boton, Tarjeta } from '../ui/Elementos.jsx'

/**
 * Guarda suave de perfil.
 *
 * En la maqueta no hay autenticación, pero cada sección pertenece a un perfil.
 * Si se llega a una sección por enlace directo con otro perfil activo, en vez de
 * mostrar datos que no corresponden se ofrece cambiar de perfil. Evita
 * inconsistencias visibles durante la demostración.
 */
export function RequiereRol({ roles, children }) {
  const { rol, setRol } = useRol()

  if (roles.includes(rol)) return children

  const sugerido = ROLES.find((r) => r.valor === roles[0])

  return (
    <Tarjeta className="mx-auto max-w-xl p-6 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-verde-50 text-verde-600">
        <UserRoundCog size={24} aria-hidden="true" />
      </span>
      <h1 className="mt-3 text-lg font-semibold text-verde-900">
        Esta sección corresponde a otro perfil
      </h1>
      <p className="mt-1.5 text-sm text-slate-600">
        La sección solicitada es del perfil <strong>{sugerido?.etiqueta}</strong>.{' '}
        {sugerido?.descripcion}.
      </p>
      <div className="mt-4 flex justify-center">
        <Boton onClick={() => setRol(roles[0])}>
          Ver como {sugerido?.etiqueta}
        </Boton>
      </div>
    </Tarjeta>
  )
}
