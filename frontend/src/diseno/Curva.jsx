/** Serie que se dibuja al activarse: línea con degradé, área y punto final.
    El punto va FUERA del SVG (que se estira con preserveAspectRatio="none") y se posiciona en %
    sobre el último dato: así queda redondo y exactamente al final de la línea, a cualquier ancho. */
export default function Curva({ activo, datos, max = Math.max(...datos) * 1.15 }) {
  const W = 560, H = 180, FIN = W - 18   // aire a la derecha para que el halo del punto no se corte
  const pts = datos.map((y, i) => [i * (FIN / (datos.length - 1)), H - (y / max) * (H - 16)])
  const d = pts.map(([x, y], i) => {
    if (!i) return `M${x},${y}`
    const [px, py] = pts[i - 1]; const cx = (px + x) / 2
    return `C${cx},${py} ${cx},${y} ${x},${y}`
  }).join(' ')
  const [ux, uy] = pts.at(-1)
  return (
    <div className="b-curva" aria-hidden="true" data-activo={activo || undefined}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="b-relleno" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style={{ stopColor: 'var(--b-verde)' }} stopOpacity=".38" /><stop offset="1" style={{ stopColor: 'var(--b-verde)' }} stopOpacity="0" /></linearGradient>
          <linearGradient id="b-trazo" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#1f8a52" /><stop offset=".6" style={{ stopColor: 'var(--b-verde)' }} /><stop offset="1" style={{ stopColor: 'var(--b-lima)' }} /></linearGradient>
        </defs>
        <path className="b-curva-area" d={`${d} L${ux},${H} L0,${H} Z`} fill="url(#b-relleno)" />
        <path className="b-curva-linea" d={d} pathLength="1" fill="none" stroke="url(#b-trazo)" strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <span className="b-curva-punto" style={{ left: `${(100 * ux) / W}%`, top: `${(100 * uy) / H}%` }} />
    </div>
  )
}
