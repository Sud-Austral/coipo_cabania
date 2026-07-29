import { EstadoVacio } from '../../components/ui/Elementos.jsx'
import { TituloSeccion } from '../../components/ui/Elementos.jsx'

export function PanelRegional() {
  return (
    <>
      <TituloSeccion titulo="Solicitudes de la región" />
      <EstadoVacio titulo="En construcción" descripcion="Esta vista se completa en el siguiente hito." />
    </>
  )
}
