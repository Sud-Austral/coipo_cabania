/* Barra superior Bento: secciones a la izquierda, día/noche a la derecha. Vidrio, pegada arriba.
   Va FUERA de <main> (como el banner). Sin `secciones` muestra solo el interruptor. */
import Navegacion from '../componentes/Navegacion.jsx'
import InterruptorTema from './InterruptorTema.jsx'
import { useTema } from './tema.js'

export default function Cabecera({ secciones = [], actual, alCambiar }) {
  const [tema, alternar] = useTema()
  return (
    <div className="b-cabecera">
      <div className="b-cabecera-interior">
        {secciones.length > 1
          ? <Navegacion secciones={secciones} actual={actual} alCambiar={alCambiar} />
          : <span className="b-cabecera-vacia" />}
        <InterruptorTema tema={tema} alCambiar={alternar} />
      </div>
    </div>
  )
}
