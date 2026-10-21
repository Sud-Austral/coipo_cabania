import { useEffect, useState } from 'react'
import { reducido } from './movimiento.js'

/** Cifra que cuenta desde 0 hasta `a` cuando `activo` pasa a true (es-CL). */
export default function Contador({ a, activo, decimales = 0, dur = 1400 }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!activo) return undefined
    if (reducido()) { setN(a); return undefined }
    let raf; const t0 = performance.now()
    const paso = (t) => { const p = Math.min(1, (t - t0) / dur); setN(a * (1 - Math.pow(1 - p, 4))); if (p < 1) raf = requestAnimationFrame(paso) }
    raf = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(raf)
  }, [a, activo, dur])
  return <span className="b-num">{n.toLocaleString('es-CL', { minimumFractionDigits: decimales, maximumFractionDigits: decimales })}</span>
}
