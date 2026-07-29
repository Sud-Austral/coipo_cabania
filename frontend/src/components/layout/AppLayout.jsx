import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  BarChart3,
  Building2,
  CalendarDays,
  CalendarRange,
  ClipboardList,
  FileSpreadsheet,
  Info,
  LayoutGrid,
  RotateCcw,
  ScrollText,
  ShieldAlert,
  Trees,
  Upload,
  UserRound,
} from 'lucide-react'
import { ROLES } from '../../fixtures/usuarios.js'
import { useRol } from '../../context/RolContext.jsx'
import { reiniciarDemo } from '../../api/store.js'
import { Modal } from '../ui/Modal.jsx'
import { Boton } from '../ui/Elementos.jsx'

/** Navegación de cada perfil. Un perfil solo ve sus propias secciones. */
const NAV_POR_ROL = {
  afiliado: [
    { a: '/catalogo', texto: 'Catálogo', icono: LayoutGrid },
    { a: '/mis-reservas', texto: 'Mis reservas', icono: ClipboardList },
  ],
  no_afiliado: [
    { a: '/catalogo', texto: 'Catálogo', icono: LayoutGrid },
    { a: '/mis-reservas', texto: 'Mis reservas', icono: ClipboardList },
  ],
  regional: [
    { a: '/regional', texto: 'Solicitudes', icono: ClipboardList },
    { a: '/regional/calendario', texto: 'Calendario operativo', icono: CalendarDays },
  ],
  central: [
    { a: '/central', texto: 'Reservas del país', icono: ClipboardList },
    { a: '/central/descuentos', texto: 'Nómina de descuentos', icono: FileSpreadsheet },
    { a: '/central/dashboard', texto: 'Reportes', icono: BarChart3 },
    { a: '/central/sanciones', texto: 'Bloqueos y sanciones', icono: ShieldAlert },
  ],
  admin: [
    { a: '/admin/inmuebles', texto: 'Inmuebles', icono: Building2 },
    { a: '/admin/temporadas', texto: 'Temporadas', icono: CalendarRange },
    { a: '/admin/nomina', texto: 'Nómina de afiliados', icono: Upload },
    { a: '/admin/auditoria', texto: 'Auditoría', icono: ScrollText },
  ],
}

export const HOME_POR_ROL = {
  afiliado: '/catalogo',
  no_afiliado: '/catalogo',
  regional: '/regional',
  central: '/central',
  admin: '/admin/inmuebles',
}

export function AppLayout() {
  const { rol, setRol, usuario, definicion, esNoAfiliado } = useRol()
  const navegar = useNavigate()
  const [confirmarReinicio, setConfirmarReinicio] = useState(false)

  const cambiarRol = (nuevo) => {
    setRol(nuevo)
    navegar(HOME_POR_ROL[nuevo])
  }

  const nav = NAV_POR_ROL[rol] ?? []

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="bg-verde-700 text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
          <Link to={HOME_POR_ROL[rol]} className="flex items-center gap-2.5">
            <span className="rounded-lg bg-white/15 p-1.5">
              <Trees size={22} aria-hidden="true" />
            </span>
            <span className="leading-tight">
              <span className="block text-base font-semibold">Red de Casas Bienestar</span>
              <span className="block text-xs text-verde-100">
                Casas de Huéspedes y Veraneo · CONAF
              </span>
            </span>
          </Link>

          <div className="ml-auto flex flex-wrap items-center gap-3">
            <div className="hidden text-right text-xs leading-tight sm:block">
              <span className="block font-medium">{usuario?.nombre}</span>
              <span className="block text-verde-100">{usuario?.unidad}</span>
            </div>
            <label className="flex items-center gap-2 rounded-lg bg-verde-800/60 px-2.5 py-1.5">
              <UserRound size={16} aria-hidden="true" className="text-verde-100" />
              <span className="sr-only">Ver el sistema como</span>
              <select
                value={rol}
                onChange={(e) => cambiarRol(e.target.value)}
                className="cursor-pointer bg-transparent text-sm font-medium text-white focus:outline-none"
              >
                {ROLES.map((r) => (
                  <option key={r.valor} value={r.valor} className="text-slate-800">
                    {r.etiqueta}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <nav aria-label="Secciones del perfil" className="border-t border-verde-600/50">
          <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-2">
            {nav.map(({ a, texto, icono: Icono }) => (
              <NavLink
                key={a}
                to={a}
                end={a === '/regional' || a === '/central'}
                className={({ isActive }) =>
                  `flex min-h-11 items-center gap-2 border-b-2 px-3 py-2.5 text-sm whitespace-nowrap transition-colors ${
                    isActive
                      ? 'border-white font-medium text-white'
                      : 'border-transparent text-verde-100 hover:text-white'
                  }`
                }
              >
                <Icono size={16} aria-hidden="true" />
                {texto}
              </NavLink>
            ))}
          </div>
        </nav>
      </header>

      {esNoAfiliado && (
        <div className="border-b border-amber-200 bg-amber-50">
          <p className="mx-auto flex max-w-7xl items-start gap-2 px-4 py-2.5 text-sm text-amber-900">
            <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              Está navegando como <strong>usuario no afiliado</strong>: las tarifas corresponden a
              usuario externo y las solicitudes quedan sujetas a la prioridad de los afiliados y su
              grupo familiar.
            </span>
          </p>
        </div>
      )}

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        <Outlet />
      </main>

      <footer className="no-imprimir border-t border-arena-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 text-xs text-slate-500">
          <p>
            <strong className="text-slate-700">Maqueta de validación</strong> · Servicio de
            Bienestar CONAF · Perfil actual: {definicion.etiqueta}. Todos los datos de personas,
            tarifas y reservas son ficticios.
          </p>
          <button
            type="button"
            onClick={() => setConfirmarReinicio(true)}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-arena-200 px-2.5 py-1.5 hover:bg-arena-50"
          >
            <RotateCcw size={13} aria-hidden="true" />
            Reiniciar demostración
          </button>
        </div>
      </footer>

      <Modal
        abierto={confirmarReinicio}
        onCerrar={() => setConfirmarReinicio(false)}
        titulo="Reiniciar la demostración"
        descripcion="Se descartan las reservas, confirmaciones y bloqueos creados durante esta sesión."
        pie={
          <>
            <Boton variante="neutro" onClick={() => setConfirmarReinicio(false)}>
              Cancelar
            </Boton>
            <Boton
              variante="peligro"
              onClick={() => {
                reiniciarDemo()
                window.location.reload()
              }}
            >
              Reiniciar
            </Boton>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Los datos vuelven a su estado inicial. Es útil para repetir la demostración desde cero
          ante distintas audiencias.
        </p>
      </Modal>
    </div>
  )
}
