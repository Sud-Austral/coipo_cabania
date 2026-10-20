import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, MemoryRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import './index.css'
import { INICIO, ProveedorSesion, useSesion } from './componentes/Perfil.jsx'
import { Plantilla } from './componentes/Plantilla.jsx'
import { Ingreso } from './paginas/Ingreso.jsx'
import { Buscar } from './paginas/solicitante/Buscar.jsx'
import { Casa } from './paginas/solicitante/Casa.jsx'
import { Reservar } from './paginas/solicitante/Reservar.jsx'
import { Comprobante } from './paginas/solicitante/Comprobante.jsx'
import { MisReservas } from './paginas/solicitante/MisReservas.jsx'
import { Sorteo } from './paginas/solicitante/Sorteo.jsx'
import { SorteoCentral } from './paginas/central/Sorteo.jsx'
import { Proximamente } from './paginas/otros/Proximamente.jsx'
import { InicioEncargada } from './paginas/encargada/Inicio.jsx'
import { ReservasEncargada } from './paginas/encargada/Reservas.jsx'
import { InventarioEncargada } from './paginas/encargada/Inventario.jsx'
import { InicioCentral } from './paginas/central/Inicio.jsx'
import { Cobros } from './paginas/central/Cobros.jsx'
import { CasasTarifas } from './paginas/central/Casas.jsx'
import { Dashboard } from './paginas/central/Dashboard.jsx'
import { ReservaAsistida } from './paginas/gestion/ReservaAsistida.jsx'

/** Exige sesión y, si se indica, un perfil. Sin sesión lleva al ingreso. */
function Requiere({ perfil, children }) {
  const { usuario } = useSesion()
  const ubicacion = useLocation()
  if (!usuario) return <Navigate to="/ingreso" replace state={{ desde: ubicacion.pathname }} />
  const permitidos = Array.isArray(perfil) ? perfil : perfil ? [perfil] : null
  if (permitidos && !permitidos.includes(usuario.perfil)) return <Navigate to={INICIO[usuario.perfil]} replace />
  return children
}

const sol = (el) => <Requiere perfil="solicitante">{el}</Requiere>

/** La versión publicada como página de claude.ai navega en memoria: su dirección no se puede cambiar. */
const Enrutador = import.meta.env.MODE === 'pagina' ? MemoryRouter : BrowserRouter

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Enrutador>
      <ProveedorSesion>
        <Routes>
          <Route path="ingreso" element={<Ingreso />} />
          <Route
            element={
              <Requiere>
                <Plantilla />
              </Requiere>
            }
          >
            <Route index element={sol(<Buscar />)} />
            <Route path="casa/:id" element={sol(<Casa />)} />
            <Route path="casa/:id/reservar" element={sol(<Reservar />)} />
            <Route path="reserva/:codigo" element={sol(<Comprobante />)} />
            <Route path="mis-reservas" element={sol(<MisReservas />)} />
            <Route path="sorteo" element={sol(<Sorteo />)} />
            <Route path="encargada" element={<Requiere perfil="encargada"><InicioEncargada /></Requiere>} />
            <Route path="encargada/reservas" element={<Requiere perfil="encargada"><ReservasEncargada /></Requiere>} />
            <Route path="encargada/inventario" element={<Requiere perfil="encargada"><InventarioEncargada /></Requiere>} />
            <Route path="central" element={<Requiere perfil="central"><InicioCentral /></Requiere>} />
            <Route path="central/cobros" element={<Requiere perfil="central"><Cobros /></Requiere>} />
            <Route path="central/casas" element={<Requiere perfil="central"><CasasTarifas /></Requiere>} />
            <Route path="central/dashboard" element={<Requiere perfil="central"><Dashboard /></Requiere>} />
 <Route path="gestion/reservar" element={<Requiere perfil={['encargada', 'central']}><ReservaAsistida /></Requiere>} />
            <Route path="gestion/reserva/:codigo" element={<Requiere perfil={['encargada', 'central']}><Comprobante /></Requiere>} />
            <Route path="central/sorteo" element={<Requiere perfil="central"><SorteoCentral /></Requiere>} />
            <Route path="uia" element={<Requiere perfil="uia"><Proximamente perfil="uia" /></Requiere>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ProveedorSesion>
    </Enrutador>
  </StrictMode>,
)
