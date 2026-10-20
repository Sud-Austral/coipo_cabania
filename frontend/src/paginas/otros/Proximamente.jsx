import { Tarjeta } from '../../componentes/ui.jsx'

const CONTENIDO = {
  uia: {
    titulo: 'Mantenimiento UIA',
    paso: 4,
    puntos: [
      'Usuarios, perfiles y regiones asignadas.',
      'Carga de nóminas de afiliados y de personal.',
      'Parámetros del reglamento, auditoría de cambios y estado del sistema.',
    ],
  },
}

export function Proximamente({ perfil }) {
  const c = CONTENIDO[perfil]
  return (
    <div className="mx-auto max-w-xl">
      <Tarjeta className="p-6">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-verde-700">Se construye en el paso {c.paso}</p>
        <h1 className="mt-1 text-2xl font-bold">{c.titulo}</h1>
        <p className="mt-3 text-[15px] text-tinta-700">Este perfil tendrá un panel propio y simple, con:</p>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[15px] text-tinta-700">
          {c.puntos.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </Tarjeta>
    </div>
  )
}
