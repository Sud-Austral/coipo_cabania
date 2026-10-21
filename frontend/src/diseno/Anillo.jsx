/** Anillo por partes [[nombre, valor, color], …] que se llena en secuencia. */
export default function Anillo({ activo, partes }) {
  const total = partes.reduce((t, p) => t + p[1], 0)
  const r = 70, c = 2 * Math.PI * r
  let acum = 0
  return (
    <svg className="b-anillo" viewBox="0 0 180 180" aria-hidden="true">
      <circle cx="90" cy="90" r={r} className="b-anillo-pista" />
      {partes.map(([n, v, col], i) => {
        const largo = (v / total) * c, ini = acum; acum += largo
        return <circle key={n} cx="90" cy="90" r={r} stroke={col} className="b-anillo-arco"
          style={{ strokeDasharray: `${activo ? Math.max(largo - 4, 0) : 0} ${c}`, strokeDashoffset: -ini, transitionDelay: `${200 + i * 160}ms` }} />
      })}
    </svg>
  )
}
