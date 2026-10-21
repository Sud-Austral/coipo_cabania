/* Tarjeta — una cosa que se abre o se compara: título, estado, contexto y datos.
 * Ver `Tarjeta.css`.
 *
 * Si la tarjeta entera lleva a otra parte, el enlace va en el TÍTULO y su área
 * se estira a toda la tarjeta con CSS: un <a> que envuelve la tarjeta completa
 * hace que el lector lea todo el contenido como el nombre del enlace.
 *
 * `etiqueta` (región, gerencia) va DEBAJO del título, como dato. `estado` recibe un
 * `<Estado>` y se alinea al título. `meta` son datos cortos que se separan con un
 * punto medio y usan cifras de ancho fijo para compararse entre tarjetas.
 */

import './Tarjeta.css'

/**
 * @param {object} props
 * @param {string} props.titulo
 * @param {string} [props.href]        si existe, toda la tarjeta es clicable
 * @param {string} [props.etiqueta]    contexto corto (región, gerencia, tipo)
 * @param {import('react').ReactNode} [props.estado]  normalmente un <Estado>
 * @param {import('react').ReactNode[]} [props.meta] datos cortos al pie
 * @param {import('react').ReactNode} [props.acciones]
 * @param {'h2'|'h3'|'h4'} [props.nivel]  respeta la jerarquía de la vista
 */
export default function Tarjeta({ titulo, href, etiqueta, estado, meta, acciones, nivel = 'h3', children }) {
  const Titulo = nivel
  const conPie = (meta && meta.length > 0) || href
  return (
    <article className={href ? 'tarjeta tarjeta-enlace' : 'tarjeta'}>
      <div className="tarjeta-cabeza">
        <div className="tarjeta-titulos">
          <Titulo className="tarjeta-titulo">
            {href ? <a href={href}>{titulo}</a> : titulo}
          </Titulo>
          {etiqueta && <p className="tarjeta-etiqueta">{etiqueta}</p>}
        </div>
        {estado && <div className="tarjeta-estado">{estado}</div>}
      </div>
      {children && <div className="tarjeta-cuerpo">{children}</div>}
      {acciones && <div className="tarjeta-acciones">{acciones}</div>}
      {conPie && !acciones && (
        <div className="tarjeta-pie">
          {meta && meta.length > 0 && (
            <ul className="tarjeta-meta">
              {meta.map((m, i) => <li key={i}>{m}</li>)}
            </ul>
          )}
          {href && (
            <svg className="tarjeta-flecha" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M5 12h13M13 6l6 6-6 6" />
            </svg>
          )}
        </div>
      )}
    </article>
  )
}
