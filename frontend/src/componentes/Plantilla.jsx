import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import banner from '../assets/banner-conaf-uia.jpg'
import { reiniciarDemo } from '../datos/servicio.js'
import { CALIDADES } from '../lib/reglas.js'
import { INICIO, useSesion } from './Perfil.jsx'

const NAV = {
  solicitante: [
    { a: '/', texto: 'Buscar casa', fin: true },
    { a: '/sorteo', texto: 'Sorteo verano' },
    { a: '/mis-reservas', texto: 'Mis reservas' },
  ],
  encargada: [
    { a: '/encargada', texto: 'Inicio', fin: true },
    { a: '/encargada/reservas', texto: 'Reservas' },
    { a: '/encargada/inventario', texto: 'Inventario' },
  ],
  central: [
    { a: '/central', texto: 'Inicio', fin: true },
    { a: '/central/cobros', texto: 'Cobros' },
    { a: '/central/casas', texto: 'Casas y tarifas' },
    { a: '/central/sorteo', texto: 'Sorteo' },
    { a: '/central/dashboard', texto: 'Dashboard' },
  ],
  uia: [{ a: '/uia', texto: 'Mantenimiento' }],
}

const PERFIL_ETIQUETA = { encargada: 'Encargada regional', central: 'Oficina Central', uia: 'Mantenimiento UIA' }

export function Plantilla() {
  const { usuario, salir } = useSesion()
  const navegar = useNavigate()
  const subtitulo = usuario.perfil === 'solicitante' ? CALIDADES[usuario.calidad] : PERFIL_ETIQUETA[usuario.perfil]

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="no-imprimir border-b border-borde bg-white">
        <div className="h-10 overflow-hidden bg-banner sm:h-12">
          <img src={banner} alt="CONAF · Unidad de Información y Análisis" className="h-full w-auto max-w-none object-cover object-left" width={3032} height={177} />
        </div>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <NavLink to={INICIO[usuario.perfil]} className="mr-auto leading-tight">
            <span className="block text-[17px] font-bold text-verde-800">Casas de Veraneo</span>
            <span className="block text-[13px] text-tinta-500">Servicio de Bienestar · CONAF</span>
          </NavLink>

          <nav aria-label="Principal" className="order-3 -mx-1 flex w-full gap-1 overflow-x-auto px-1 sm:order-none sm:mx-0 sm:w-auto sm:px-0">
            {NAV[usuario.perfil].map((n) => (
              <NavLink
                key={n.a}
                to={n.a}
                end={n.fin}
                className={({ isActive }) =>
                  `shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-[15px] font-medium ${isActive ? 'bg-verde-50 text-verde-800' : 'text-tinta-700 hover:bg-stone-100'}`
                }
              >
                {n.texto}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="text-right leading-tight">
              <span className="block text-sm font-medium text-tinta-900">{usuario.nombre}</span>
              <span className="block text-[13px] text-tinta-500">{subtitulo}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                salir()
                navegar('/ingreso', { replace: true })
              }}
              className="grid size-10 place-items-center rounded-lg text-tinta-500 ring-1 ring-borde hover:bg-stone-50 hover:text-tinta-900"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <LogOut className="size-4" aria-hidden />
            </button>
          </div>
        </div>
      </header>

      {usuario.demostracion && (
        <p className="no-imprimir border-b border-alerta-700/20 bg-alerta-50 px-4 py-2 text-center text-[13px] text-alerta-700">
          Está usando la maqueta como afiliado/a de demostración. Su RUT no se valida contra nóminas reales y nada sale de este navegador.
        </p>
      )}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">
        <Outlet />
      </main>

      <footer className="no-imprimir border-t border-borde bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3 text-[13px] text-tinta-500">
          <span>
            <strong className="font-semibold text-tinta-700">Maqueta de validación.</strong> Personas, tarifas y fotos son ficticias; nada se guarda fuera de este navegador.
          </span>
          <button type="button" onClick={reiniciarDemo} className="rounded px-2 py-1 font-medium text-verde-700 hover:bg-verde-50">
            Reiniciar datos de prueba
          </button>
        </div>
      </footer>
    </div>
  )
}
