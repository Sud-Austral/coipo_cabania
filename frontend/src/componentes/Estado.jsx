/* Estado — un chip que NO codifica sólo por color. Ver `Estado.css`.
 *
 * Es la referencia de `UI-13` y `UI-14` del estándar. En la aplicación más
 * avanzada de la flota, dos de ocho combinaciones de estado × tema pasan AA, y
 * el estado por defecto es invisible en los dos temas.
 */

import './Estado.css'

/* Glifo y etiqueta por defecto de cada estado.
 *
 * EL GLIFO ES LO QUE SOBREVIVE AL DALTONISMO, así que no se puede omitir ni
 * dejar a elección de quien use el componente. Se eligen formas DISTINTAS entre
 * sí —no cuatro círculos de colores—: quien no distingue los tonos tiene que
 * poder separarlos por silueta.
 */
/* Glifos dibujados (mismo trazo que Aviso, Campo y Tarjeta), no caracteres: un «✓»
   cambia de forma y grosor con la fuente de cada equipo. Cada estado conserva una
   FORMA distinta, que es la que lleva la información sin depender del color. */
const ESTADOS = {
  correcto: { glifo: <path d="M7 12.5l3.2 3.2L17 9" />, etiqueta: 'Correcto' },
  error: { glifo: <path d="M8 8l8 8M16 8l-8 8" />, etiqueta: 'Error' },
  aviso: { glifo: <><path d="M12 6.5v7" /><path d="M12 17.4v.1" /></>, etiqueta: 'Aviso' },
  info: { glifo: <><path d="M12 10.5v7" /><path d="M12 6.6v.1" /></>, etiqueta: 'Información' },
}

/**
 * @param {object} props
 * @param {'correcto'|'error'|'aviso'|'info'} props.tipo
 * @param {string} [props.children] etiqueta propia; si no, la del tipo
 */
export default function Estado({ tipo, children }) {
  const base = ESTADOS[tipo]
  if (!base) {
    // Ruidoso a propósito. Un tipo desconocido que se pintara en gris sería un
    // estado invisible, que es peor que un error en consola.
    throw new Error(
      `Estado: tipo desconocido «${tipo}». Los válidos son: ` +
        Object.keys(ESTADOS).join(', '),
    )
  }

  return (
    <span className={`estado ${tipo}`}>
      {/* aria-hidden: la etiqueta de al lado ya lo dice. Sin esto el lector
          anunciaría el símbolo y después la palabra. */}
      <svg className="estado-glifo" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        {base.glifo}
      </svg>
      {/* La etiqueta va SIEMPRE visible, nunca sólo en `title`: un tooltip no
          existe para el teclado ni para el táctil. */}
      {children ?? base.etiqueta}
    </span>
  )
}
