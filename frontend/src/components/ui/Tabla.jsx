/** Envoltorios de tabla: desplazamiento horizontal propio, nunca del documento. */

export function Tabla({ children, className = '' }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-arena-200 bg-white">
      <table className={`w-full min-w-[46rem] text-sm ${className}`}>{children}</table>
    </div>
  )
}

export function Encabezado({ columnas }) {
  return (
    <thead className="bg-arena-50 text-left text-xs font-semibold tracking-wide text-slate-600 uppercase">
      <tr>
        {columnas.map((c) => (
          <th
            key={typeof c === 'string' ? c : c.clave}
            scope="col"
            className={`px-4 py-3 font-semibold ${typeof c === 'object' && c.alineacion === 'derecha' ? 'text-right' : ''}`}
          >
            {typeof c === 'string' ? c : c.titulo}
          </th>
        ))}
      </tr>
    </thead>
  )
}

export function Cuerpo({ children }) {
  return <tbody className="divide-y divide-arena-200">{children}</tbody>
}

export function Fila({ children, className = '', ...props }) {
  return (
    <tr className={`hover:bg-arena-50/60 ${className}`} {...props}>
      {children}
    </tr>
  )
}

export function Celda({ children, className = '', numerica = false, ...props }) {
  return (
    <td
      className={`px-4 py-3 align-middle ${numerica ? 'tabular text-right' : ''} ${className}`}
      {...props}
    >
      {children}
    </td>
  )
}
