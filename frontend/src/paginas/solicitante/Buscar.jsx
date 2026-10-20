import { Link, useSearchParams } from 'react-router-dom'
import { Users } from 'lucide-react'
import { REGIONES } from '../../datos/casas.js'
import { listarCasas, postulacionAbierta, postulacionDe, sorteoVigente, useDatos } from '../../datos/servicio.js'
import { puedePostular } from '../../lib/sorteo.js'
import { fechaLarga } from '../../lib/fechas.js'
import { pesos, plural } from '../../lib/formato.js'
import { PARAMETROS, tarifaPara } from '../../lib/reglas.js'
import { rutaFoto } from '../../componentes/fotos.js'
import { Aviso, Campo, claseEntrada } from '../../componentes/ui.jsx'
import { useSesion } from '../../componentes/Perfil.jsx'

const nombreRegion = (c) => REGIONES.find((r) => r.codigo === c)?.nombre ?? ''

export function Buscar() {
  useDatos()
  const { usuario } = useSesion()
  const [p, setP] = useSearchParams()
  const region = p.get('region') ?? ''

  const fijar = (v) => {
    const n = new URLSearchParams(p)
    if (v) n.set('region', v)
    else n.delete('region')
    setP(n, { replace: true })
  }

  // Fechas y personas se eligen en la ficha de cada casa, con su calendario.
  const resultados = listarCasas().filter((c) => !region || c.region === region)

  return (
    <>
      <h1 className="text-2xl font-bold text-tinta-900 sm:text-[28px]">
        Hola, {usuario.nombre.split(' ')[0]}. ¿Dónde quiere descansar?
      </h1>
      <p className="mt-1 text-[15px] text-tinta-500">
        {usuario.calidad === 'otro_servicio'
          ? `Reserve una casa de veraneo de Bienestar con hasta ${PARAMETROS.anticipacion_maxima_otro_servicio_dias} días de anticipación. Si las fechas están libres, queda confirmada al instante.`
          : `Reserve una casa de veraneo de Bienestar con hasta ${PARAMETROS.anticipacion_maxima_dias} días de anticipación. Si las fechas están libres, queda confirmada al instante.`}
      </p>
      <AvisoSorteo usuario={usuario} />
      {usuario.calidad === 'otro_servicio' && (
        <div className="mt-4">
          <Aviso tipo="info">
            Como funcionario/a de otro servicio público, puede reservar cupos que el personal de CONAF no ha tomado, con hasta {PARAMETROS.anticipacion_maxima_otro_servicio_dias} días de anticipación, tarifa diferenciada y pago anticipado de toda la estadía (Art. 9).
          </Aviso>
        </div>
      )}

      <div className="mt-5 rounded-xl border border-borde bg-white p-4" role="search">
        <Campo etiqueta="Región" className="max-w-sm">
          <select className={claseEntrada} value={region} onChange={(e) => fijar(e.target.value)}>
            <option value="">Todas las regiones</option>
            {REGIONES.filter((r) => listarCasas().some((c) => c.region === r.codigo)).map((r) => (
              <option key={r.codigo} value={r.codigo}>
                {r.nombre}
              </option>
            ))}
          </select>
        </Campo>
        <p className="mt-2 text-[13px] text-tinta-500">Elija una casa para ver su calendario de disponibilidad y reservar.</p>
      </div>

      <div className="mt-6 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-tinta-900">
          {plural(resultados.length, 'casa', 'casas')}
        </h2>
        {region && (
          <button type="button" className="text-sm font-medium text-verde-700 hover:underline" onClick={() => setP({}, { replace: true })}>
            Ver todas
          </button>
        )}
      </div>

      {resultados.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-borde bg-white p-8 text-center text-tinta-500">
          No hay casas en esa región.
        </p>
      ) : (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {resultados.map((c) => (
            <li key={c.id}>
              <Link to={`/casa/${c.id}`} className="group block overflow-hidden rounded-xl border border-borde bg-white transition-shadow hover:shadow-md">
                <div className="aspect-[16/10] overflow-hidden bg-stone-200">
                  <img src={rutaFoto(c.fotos[0])} alt="" loading="lazy" className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                </div>
                <div className="p-4">
                  <p className="text-[13px] font-medium uppercase tracking-wide text-tinta-500">{nombreRegion(c.region)}</p>
                  <h3 className="mt-0.5 text-[17px] font-semibold text-tinta-900">{c.nombre}</h3>
                  <div className="mt-3 flex items-end justify-between">
                    <span className="flex items-center gap-1.5 text-sm text-tinta-500">
                      <Users className="size-4" aria-hidden /> Hasta {c.capacidad}
                    </span>
                    <span className="text-right">
                      <span className="text-[17px] font-bold text-tinta-900">{pesos(tarifaPara(c, usuario))}</span>
                      <span className="text-[13px] text-tinta-500"> / noche</span>
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

/** Invitación a postular al sorteo de temporada alta, o acceso a la postulación hecha. */
function AvisoSorteo({ usuario }) {
  const s = sorteoVigente()
  if (!s || !puedePostular(usuario)) return null
  const mia = postulacionDe(usuario.id)
  if (!postulacionAbierta() && !mia && s.estado !== 'sorteado') return null
  return (
    <div className="mt-4 flex flex-col gap-3 rounded-xl border border-verde-200 bg-verde-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[15px] text-verde-800">
        {mia
          ? `Usted postuló al sorteo de la ${s.nombre.toLowerCase()}.`
          : s.estado === 'sorteado'
            ? `El sorteo de la ${s.nombre.toLowerCase()} ya se realizó: revise los turnos que quedaron vacantes.`
            : `Enero y febrero se asignan por sorteo. Postule a la ${s.nombre.toLowerCase()} hasta el ${fechaLarga(s.postulacion.hasta)}.`}
      </p>
      <Link to={mia ? '/mis-reservas' : '/sorteo'} className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-verde-700 px-4 text-[15px] font-semibold text-white hover:bg-verde-800">
        {mia ? 'Ver mi postulación' : s.estado === 'sorteado' ? 'Ver vacantes' : 'Postular al sorteo'}
      </Link>
    </div>
  )
}
