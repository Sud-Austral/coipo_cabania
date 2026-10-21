/* Piezas pequeñas de la app: chip de estado, estrellas, pasos, campo, vacío, volver y cifra del tablero. */
import { useId } from 'react'
import Estado from '../componentes/Estado.jsx'
import { Contador, Modulo } from '../diseno/index.js'
import { etiquetaEstado, tonoEstado } from '../nucleo/textos.js'
import { ir } from '../nucleo/ruta.js'

/** Chip de estado de una reserva: glifo + etiqueta del glosario (nunca solo color). */
export const ChipEstado = ({ estado }) => <Estado tipo={tonoEstado(estado)}>{etiquetaEstado(estado)}</Estado>

/** Chip libre con tono: correcto | error | aviso | info. */
export const Chip = ({ tono = 'info', children }) => <Estado tipo={tono}>{children}</Estado>

export function Estrellas({ valor, total }) {
  if (!valor) return <span className="cb-estrellas cb-tenue">Sin opiniones</span>
  return (
    <span className="cb-estrellas" aria-label={`${valor.toLocaleString('es-CL')} de 5 estrellas`}>
      <b aria-hidden="true">★</b> {valor.toLocaleString('es-CL', { minimumFractionDigits: 1 })}
      {total ? <small> ({total})</small> : null}
    </span>
  )
}

export function SelectorEstrellas({ valor, alCambiar }) {
  return (
    <div className="cb-selector-estrellas" role="radiogroup" aria-label="Estrellas">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={valor === n} aria-label={`${n} de 5`}
          data-on={n <= valor || undefined} onClick={() => alCambiar(n)}>★</button>
      ))}
    </div>
  )
}

/** Indicador de pasos: 1 · 2 · 3, con el actual marcado. */
export function Pasos({ pasos, actual }) {
  return (
    <ol className="cb-pasos" aria-label="Pasos">
      {pasos.map((p, i) => {
        const n = i + 1
        const e = n < actual ? 'hecho' : n === actual ? 'actual' : 'pendiente'
        return (
          <li key={p} data-e={e} aria-current={e === 'actual' ? 'step' : undefined}>
            <span>{e === 'hecho' ? '✓' : n}</span>{p}
          </li>
        )
      })}
    </ol>
  )
}

/** Campo de formulario: etiqueta arriba, control, error unido por aria-describedby. */
export function Campo({ etiqueta, error, como = 'input', children, ancho, ...resto }) {
  const id = useId()
  const Control = como
  return (
    <label className="cb-campo" htmlFor={id} data-ancho={ancho}>
      <span>{etiqueta}</span>
      <Control id={id} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-e` : undefined} {...resto}>{children}</Control>
      {error && <em id={`${id}-e`} className="cb-error-campo">{error}</em>}
    </label>
  )
}

export const Vacio = ({ children }) => <p className="cb-vacio">{children}</p>
export const Cargando = () => <p className="cb-cargando" role="status">Cargando…</p>
export const Falla = ({ children }) => children ? <p className="cb-error" role="alert">{children}</p> : null

export function Volver({ a, children }) {
  return <a className="cb-volver" href={`#${a}`}>‹ {children}</a>
}

/** Encabezado corto de una vista: rótulo verde + título. */
export function Titulo({ pre, children, accion }) {
  return (
    <header className="cb-titulo">
      <div>
        {pre && <p className="b-hero-pre">{pre}</p>}
        <h1>{children}</h1>
      </div>
      {accion}
    </header>
  )
}

/** Módulo del tablero: rótulo, cifra que cuenta y una frase corta. Si tiene `a`, lleva a esa vista. */
export function Cifra({ rotulo, valor, frase, a, tono, retraso = 0, className = '', pesos: esPesos }) {
  const contenido = (v) => (
    <>
      <p className="b-rotulo" data-tono={tono}>{tono === 'aviso' && <span className="b-pulso" aria-hidden="true" />}{rotulo}</p>
      <p className="b-grande cb-cifra">{esPesos && <small>$</small>}<Contador a={valor ?? 0} activo={v} /></p>
      {frase && <p className="b-texto">{frase}</p>}
      {a && <span className="cb-mod-ir" aria-hidden="true">›</span>}
    </>
  )
  return (
    <Modulo className={`cb-mod-cifra ${a ? 'cb-mod-enlace' : ''} ${className}`} retraso={retraso} data-tono={tono}
      onClick={a ? () => ir(a) : undefined} role={a ? 'link' : undefined} tabIndex={a ? 0 : undefined}
      onKeyDown={a ? (e) => { if (e.key === 'Enter') ir(a) } : undefined} aria-label={a ? `${rotulo}: ${valor}` : undefined}>
      {contenido}
    </Modulo>
  )
}
