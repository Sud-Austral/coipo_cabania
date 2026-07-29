import { EstadoVacio } from '../../components/ui/Elementos.jsx'
import { TituloSeccion } from '../../components/ui/Elementos.jsx'

export function InmueblesAdmin() {
  return (
    <>
      <TituloSeccion titulo="Mantención de inmuebles" />
      <EstadoVacio titulo="En construcción" descripcion="Esta vista se completa en el siguiente hito." />
    </>
  )
}
