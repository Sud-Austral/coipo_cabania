import { useState } from 'react'

/**
 * Gráficos de una sola serie, en el verde institucional.
 * Barras finas con extremo redondeado, grilla en línea fina y tooltip al pasar
 * el cursor o enfocar con el teclado. Cada gráfico tiene su propio eje (nunca
 * dos escalas en un mismo gráfico).
 */

export function Indicador({ etiqueta, valor, detalle }) {
  return (
    <div className="rounded-xl border border-borde bg-white p-4">
      <p className="text-[13px] font-medium text-tinta-500">{etiqueta}</p>
      <p className="mt-1 text-[26px] font-bold leading-tight tabular-nums text-tinta-900">{valor}</p>
      {detalle && <p className="mt-0.5 text-[13px] text-tinta-500">{detalle}</p>}
    </div>
  )
}

export function Panel({ titulo, subtitulo, children, accion }) {
  return (
    <section className="rounded-xl border border-borde bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-[16px] font-semibold text-tinta-900">{titulo}</h2>
          {subtitulo && <p className="text-[13px] text-tinta-500">{subtitulo}</p>}
        </div>
        {accion}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  )
}

/** Ranking horizontal: etiqueta, barra y valor al final de cada barra. */
export function BarrasHorizontales({ datos, formato, detalle }) {
  const max = Math.max(...datos.map((d) => d.valor), 1)
  const [activo, setActivo] = useState(null)
  return (
    <ol className="space-y-1.5">
      {datos.map((d, i) => (
        <li
          key={d.etiqueta}
          className="relative grid grid-cols-[minmax(0,10rem)_1fr] items-center gap-3 rounded-md px-1 py-0.5 outline-none hover:bg-stone-50 focus-visible:bg-stone-50 sm:grid-cols-[minmax(0,12rem)_1fr]"
          tabIndex={0}
          onMouseEnter={() => setActivo(i)}
          onMouseLeave={() => setActivo(null)}
          onFocus={() => setActivo(i)}
          onBlur={() => setActivo(null)}
          aria-label={`${d.etiqueta}: ${formato(d.valor)}${detalle ? ', ' + detalle(d) : ''}`}
        >
          <span className="truncate text-sm text-tinta-700" title={d.etiqueta}>
            {d.etiqueta}
          </span>
          <span className="flex items-center gap-2">
            <span className="h-3.5 rounded-r-[4px] bg-verde-600" style={{ width: `${Math.max(1, (d.valor / max) * 78)}%` }} />
            <span className="whitespace-nowrap text-[13px] tabular-nums text-tinta-700">{formato(d.valor)}</span>
          </span>
          {activo === i && detalle && (
            <span role="tooltip" className="pointer-events-none absolute right-2 top-full z-10 mt-1 rounded-md bg-tinta-900 px-2.5 py-1.5 text-[13px] text-white shadow-lg">
              {detalle(d)}
            </span>
          )}
        </li>
      ))}
    </ol>
  )
}

/** Columnas por mes con grilla de tres líneas y tooltip. */
export function Columnas({ datos, formato, formatoEje, detalle }) {
  const max = Math.max(...datos.map((d) => d.valor), 1)
  const tope = escalaRedonda(max)
  const [activo, setActivo] = useState(null)
  const lineas = [tope, tope / 2, 0]
  return (
    <div className="relative">
      <div className="grid h-48 grid-cols-[auto_1fr] gap-2">
        <div className="flex flex-col justify-between pb-6 text-right text-[11px] tabular-nums text-tinta-400">
          {lineas.map((v) => (
            <span key={v} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">
              {(formatoEje ?? formato)(v)}
            </span>
          ))}
        </div>
        <div className="relative">
          <div className="pointer-events-none absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between">
            {lineas.map((v) => (
              <span key={v} className="border-t border-stone-200" />
            ))}
          </div>
          <div className="absolute inset-x-0 top-0 bottom-0 flex items-stretch gap-[2px]">
            {datos.map((d, i) => (
              <div
                key={d.etiqueta}
                className="relative flex flex-1 flex-col items-center outline-none"
                tabIndex={0}
                onMouseEnter={() => setActivo(i)}
                onMouseLeave={() => setActivo(null)}
                onFocus={() => setActivo(i)}
                onBlur={() => setActivo(null)}
                aria-label={`${d.etiqueta}: ${formato(d.valor)}`}
              >
                <div className="flex w-full flex-1 items-end justify-center pb-0">
                  <div
                    className={`w-full max-w-9 rounded-t-[4px] transition-colors ${activo === i ? 'bg-verde-800' : 'bg-verde-600'}`}
                    style={{ height: `${(d.valor / tope) * 100}%` }}
                  />
                </div>
                <span className="mt-1 h-5 text-[11px] capitalize text-tinta-500">{d.etiqueta}</span>
                {activo === i && (
                  <span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-tinta-900 px-2.5 py-1.5 text-[13px] text-white shadow-lg">
                    <strong className="capitalize">{d.etiquetaLarga ?? d.etiqueta}</strong>: {formato(d.valor)}
                    {detalle && <span className="block text-white/80">{detalle(d)}</span>}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function escalaRedonda(max) {
  const p = 10 ** Math.floor(Math.log10(max))
  for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= max) return m * p
  return 10 * p
}
