/* Botón — la referencia de los ocho estados. Ver `Boton.css`.
 *
 * Es lo mínimo que hace falta para que un proyecto nuevo tenga un ejemplo
 * completo delante. `UI-9` del estándar exige que todo componente interactivo
 * declare los ocho estados o diga cuál no aplica, y en la flota medida hoy
 * ninguna familia los tiene: la mejor llega a tres.
 */

import './Boton.css'

/**
 * @param {object} props
 * @param {boolean} [props.cargando]   pinta el giro y anuncia `aria-busy`
 * @param {boolean} [props.secundario] variante de borde
 */
export default function Boton({
  cargando = false,
  secundario = false,
  disabled = false,
  onClick,
  children,
  ...resto
}) {
  return (
    <button
      type="button"
      className={secundario ? 'boton secundario' : 'boton'}
      // `aria-busy` y NO `disabled` mientras carga: deshabilitar saca el foco
      // del elemento y quien navega con teclado pierde el sitio. Se anuncia el
      // estado y se impide el segundo clic desde el manejador, no desde el DOM.
      aria-busy={cargando || undefined}
      disabled={disabled}
      // Y ESTO ES LO QUE HACE VERDAD EL COMENTARIO DE ARRIBA. Hasta el
      // 2026-09-15 no existía: `onClick` llegaba por `...resto` y se disparaba
      // igual mientras `aria-busy` decía que el botón estaba ocupado. O sea que
      // el componente que la semilla reparte como referencia de los ocho estados
      // documentaba una protección que no tenía, y el segundo clic enviaba el
      // formulario dos veces.
      onClick={cargando ? undefined : onClick}
      {...resto}
    >
      {/* El giro es decorativo: el estado ya lo dice `aria-busy`, así que
          repetirlo aquí haría que el lector lo anunciara dos veces. */}
      {cargando && <span className="boton-giro" aria-hidden="true" />}
      {children}
    </button>
  )
}
