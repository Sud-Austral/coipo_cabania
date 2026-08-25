import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout.jsx'
import { RequiereRol } from './components/layout/RequiereRol.jsx'
import { Catalogo } from './pages/publico/Catalogo.jsx'
import { FichaInmueble } from './pages/publico/FichaInmueble.jsx'
import { Reservar } from './pages/publico/Reservar.jsx'
import { Comprobante } from './pages/publico/Comprobante.jsx'
import { MisReservas } from './pages/publico/MisReservas.jsx'
import { PanelRegional } from './pages/regional/PanelRegional.jsx'
import { CalendarioOperativo } from './pages/regional/CalendarioOperativo.jsx'
import { ReservaManual } from './pages/regional/ReservaManual.jsx'
import { ReservasPais } from './pages/central/ReservasPais.jsx'
import { NominaDescuentos } from './pages/central/NominaDescuentos.jsx'
import { Reportes } from './pages/central/Reportes.jsx'
import { Sanciones } from './pages/central/Sanciones.jsx'
import { OperacionCentral } from './pages/central/OperacionCentral.jsx'
import { InmueblesAdmin } from './pages/admin/InmueblesAdmin.jsx'
import { Temporadas } from './pages/admin/Temporadas.jsx'
import { CargaNomina } from './pages/admin/CargaNomina.jsx'
import { Auditoria } from './pages/admin/Auditoria.jsx'
import { ConfiguracionAdmin } from './pages/admin/ConfiguracionAdmin.jsx'
import { CatalogosAdmin } from './pages/admin/CatalogosAdmin.jsx'

const PORTAL = ['afiliado', 'no_afiliado']

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/catalogo" replace />} />

        {/* Portal de reservas: afiliados y usuarios no afiliados.
            El catálogo y la ficha quedan abiertos a todos los perfiles: la
            encargada o el administrador también necesitan consultarlos. */}
        <Route path="catalogo" element={<Catalogo />} />
        <Route path="inmuebles/:id" element={<FichaInmueble />} />
        <Route path="reservas/:codigo" element={<Comprobante />} />
        <Route
          path="inmuebles/:id/reservar"
          element={
            <RequiereRol roles={PORTAL}>
              <Reservar />
            </RequiereRol>
          }
        />
        <Route
          path="mis-reservas"
          element={
            <RequiereRol roles={PORTAL}>
              <MisReservas />
            </RequiereRol>
          }
        />

        {/* Encargada regional */}
        <Route
          path="regional"
          element={
            <RequiereRol roles={['regional']}>
              <PanelRegional />
            </RequiereRol>
          }
        />
        <Route
          path="regional/calendario"
          element={
            <RequiereRol roles={['regional']}>
              <CalendarioOperativo />
            </RequiereRol>
          }
        />
        <Route path="regional/reserva-manual" element={<RequiereRol roles={['regional']}><ReservaManual /></RequiereRol>} />

        {/* Oficina Central */}
        <Route
          path="central"
          element={
            <RequiereRol roles={['central']}>
              <ReservasPais />
            </RequiereRol>
          }
        />
        <Route
          path="central/descuentos"
          element={
            <RequiereRol roles={['central']}>
              <NominaDescuentos />
            </RequiereRol>
          }
        />
        <Route path="central/operacion" element={<RequiereRol roles={['central']}><OperacionCentral /></RequiereRol>} />
        <Route
          path="central/dashboard"
          element={
            <RequiereRol roles={['central']}>
              <Reportes />
            </RequiereRol>
          }
        />
        <Route
          path="central/sanciones"
          element={
            <RequiereRol roles={['central']}>
              <Sanciones />
            </RequiereRol>
          }
        />

        {/* Administrador */}
        <Route
          path="admin/inmuebles"
          element={
            <RequiereRol roles={['admin']}>
              <InmueblesAdmin />
            </RequiereRol>
          }
        />
        <Route path="admin/configuracion" element={<RequiereRol roles={['admin']}><ConfiguracionAdmin /></RequiereRol>} />
        <Route path="admin/catalogos" element={<RequiereRol roles={['admin']}><CatalogosAdmin /></RequiereRol>} />
        <Route
          path="admin/temporadas"
          element={
            <RequiereRol roles={['admin']}>
              <Temporadas />
            </RequiereRol>
          }
        />
        <Route
          path="admin/nomina"
          element={
            <RequiereRol roles={['admin']}>
              <CargaNomina />
            </RequiereRol>
          }
        />
        <Route
          path="admin/auditoria"
          element={
            <RequiereRol roles={['admin']}>
              <Auditoria />
            </RequiereRol>
          }
        />

        <Route path="*" element={<Navigate to="/catalogo" replace />} />
      </Route>
    </Routes>
  )
}
