import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout.jsx'
import { Catalogo } from './pages/publico/Catalogo.jsx'
import { FichaInmueble } from './pages/publico/FichaInmueble.jsx'
import { Reservar } from './pages/publico/Reservar.jsx'
import { Comprobante } from './pages/publico/Comprobante.jsx'
import { MisReservas } from './pages/publico/MisReservas.jsx'
import { PanelRegional } from './pages/regional/PanelRegional.jsx'
import { CalendarioOperativo } from './pages/regional/CalendarioOperativo.jsx'
import { ReservasPais } from './pages/central/ReservasPais.jsx'
import { NominaDescuentos } from './pages/central/NominaDescuentos.jsx'
import { Reportes } from './pages/central/Reportes.jsx'
import { Sanciones } from './pages/central/Sanciones.jsx'
import { InmueblesAdmin } from './pages/admin/InmueblesAdmin.jsx'
import { Temporadas } from './pages/admin/Temporadas.jsx'
import { CargaNomina } from './pages/admin/CargaNomina.jsx'
import { Auditoria } from './pages/admin/Auditoria.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/catalogo" replace />} />

        {/* Portal de reservas: afiliados y usuarios no afiliados */}
        <Route path="catalogo" element={<Catalogo />} />
        <Route path="inmuebles/:id" element={<FichaInmueble />} />
        <Route path="inmuebles/:id/reservar" element={<Reservar />} />
        <Route path="reservas/:codigo" element={<Comprobante />} />
        <Route path="mis-reservas" element={<MisReservas />} />

        {/* Encargada regional */}
        <Route path="regional" element={<PanelRegional />} />
        <Route path="regional/calendario" element={<CalendarioOperativo />} />

        {/* Oficina Central */}
        <Route path="central" element={<ReservasPais />} />
        <Route path="central/descuentos" element={<NominaDescuentos />} />
        <Route path="central/dashboard" element={<Reportes />} />
        <Route path="central/sanciones" element={<Sanciones />} />

        {/* Administrador */}
        <Route path="admin/inmuebles" element={<InmueblesAdmin />} />
        <Route path="admin/temporadas" element={<Temporadas />} />
        <Route path="admin/nomina" element={<CargaNomina />} />
        <Route path="admin/auditoria" element={<Auditoria />} />

        <Route path="*" element={<Navigate to="/catalogo" replace />} />
      </Route>
    </Routes>
  )
}
