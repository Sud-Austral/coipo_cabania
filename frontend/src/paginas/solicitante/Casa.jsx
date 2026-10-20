import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, BedDouble, Check, MapPin, Users } from 'lucide-react'
import { REGIONES } from '../../datos/casas.js'
import { misReservas, obtenerCasa, ocupacionesDe, nochesLiberadas, useDatos } from '../../datos/servicio.js'
import { rangoFechas } from '../../lib/fechas.js'
import { pesos, plural } from '../../lib/formato.js'
import { CONDICIONES_USO, PARAMETROS, nochesNoDisponibles, noches, tarifaPara, validarFechas } from '../../lib/reglas.js'
import { Calendario } from '../../componentes/Calendario.jsx'
import { rutaFoto } from '../../componentes/fotos.js'
import { Aviso, Boton, Tarjeta } from '../../componentes/ui.jsx'
import { useSesion } from '../../componentes/Perfil.jsx'

export function Casa() {
  useDatos()
  const { id } = useParams()
  const [p, setP] = useSearchParams()
  const navegar = useNavigate()
  const { usuario } = useSesion()
  const casa = obtenerCasa(id)
  const [foto, setFoto] = useState(0)

  if (!casa || !casa.activa) {
    return (
      <p>
        No encontramos esa casa. <Link to="/" className="text-verde-700 underline">Volver a la búsqueda</Link>
      </p>
    )
  }

  const entrada = p.get('entrada')
  const salida = p.get('salida')
  const noDisponibles = nochesNoDisponibles(ocupacionesDe(casa.id))
  const liberadas = nochesLiberadas(casa.id)
  const errores = entrada && salida ? validarFechas({ entrada, salida, noDisponibles, reservasUsuario: misReservas(usuario.id), calidad: usuario.calidad, liberadas }) : []
  const n = noches(entrada, salida)
  const region = REGIONES.find((r) => r.codigo === casa.region)?.nombre
  const tarifa = tarifaPara(casa, usuario)

  const cambiarFechas = ({ entrada: e, salida: s }) => {
    const q = new URLSearchParams()
    if (e) q.set('entrada', e)
    if (s) q.set('salida', s)
    setP(q, { replace: true })
  }

  return (
    <>
      <Link to="/" className="inline-flex items-center gap-1 text-sm font-medium text-verde-700 hover:underline">
        <ArrowLeft className="size-4" aria-hidden /> Volver a la búsqueda
      </Link>

      <h1 className="mt-3 text-2xl font-bold text-tinta-900 sm:text-[28px]">{casa.nombre}</h1>
      <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[15px] text-tinta-500">
        <span className="inline-flex items-center gap-1">
          <MapPin className="size-4" aria-hidden /> {casa.localidad}, {region}
        </span>
        <span className="inline-flex items-center gap-1">
          <Users className="size-4" aria-hidden /> Hasta {casa.capacidad} personas
        </span>
        <span className="inline-flex items-center gap-1">
          <BedDouble className="size-4" aria-hidden /> {plural(casa.dormitorios, 'dormitorio', 'dormitorios')}
        </span>
      </p>

      <div className="mt-5 grid gap-x-8 gap-y-6 lg:grid-cols-[1fr_400px]">
        <div className="order-1 min-w-0 lg:order-none">
          <div className="overflow-hidden rounded-xl bg-stone-200">
            <img src={rutaFoto(casa.fotos[foto])} alt={`Fotografía ${foto + 1} de ${casa.fotos.length}`} className="aspect-[16/10] w-full object-cover" />
          </div>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {casa.fotos.map((f, i) => (
              <button
                key={f + i}
                type="button"
                onClick={() => setFoto(i)}
                aria-label={`Ver fotografía ${i + 1}`}
                aria-pressed={i === foto}
                className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg ring-2 ${i === foto ? 'ring-verde-600' : 'ring-transparent opacity-80 hover:opacity-100'}`}
              >
                <img src={rutaFoto(f)} alt="" className="size-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
          <p className="mt-1 text-[13px] text-tinta-400">Fotografías de referencia, no corresponden a la casa real.</p>
        </div>

        <div className="order-3 min-w-0 lg:order-none lg:col-start-1 lg:row-start-2">

          <p className="max-w-prose text-[16px] leading-relaxed text-tinta-700">{casa.descripcion}</p>

          <h2 className="mt-8 text-lg font-semibold text-tinta-900">La casa incluye</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {casa.equipamiento.map((e) => (
              <li key={e} className="flex items-center gap-2 text-[15px] text-tinta-700">
                <Check className="size-4 text-verde-600" aria-hidden /> {e}
              </li>
            ))}
          </ul>

          {casa.cercanias.length > 0 && (
            <>
              <h2 className="mt-8 text-lg font-semibold text-tinta-900">Cerca de la casa</h2>
              <ul className="mt-3 divide-y divide-borde rounded-xl border border-borde bg-white">
                {casa.cercanias.map((z) => (
                  <li key={z.nombre} className="flex justify-between px-4 py-2.5 text-[15px]">
                    <span className="text-tinta-700">{z.nombre}</span>
                    <span className="text-tinta-500">{z.km < 1 ? `${Math.round(z.km * 1000)} m` : `${z.km} km`}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <a
            href={`https://www.openstreetmap.org/?mlat=${casa.lat}&mlon=${casa.lng}#map=14/${casa.lat}/${casa.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-verde-700 hover:underline"
          >
            <MapPin className="size-4" aria-hidden /> Ver ubicación en el mapa (se abre en otra pestaña)
          </a>

          <h2 className="mt-8 text-lg font-semibold text-tinta-900">Condiciones de uso</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] text-tinta-700 marker:text-tinta-400">
            {CONDICIONES_USO.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>

        <aside className="order-2 lg:order-none lg:sticky lg:top-4 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
          <Tarjeta className="p-5">
            <p>
              <span className="text-2xl font-bold text-tinta-900">{pesos(tarifa)}</span>
              <span className="text-[15px] text-tinta-500"> por noche, toda la casa</span>
            </p>
            <div className="mt-4 border-t border-borde pt-4">
              <Calendario noDisponibles={noDisponibles} entrada={entrada} salida={salida} onCambio={cambiarFechas} calidad={usuario.calidad} liberadas={liberadas} />
            </div>

            {entrada && salida && (
              <div className="mt-4 space-y-3 border-t border-borde pt-4">
                {errores.length > 0 ? (
                  errores.map((e) => (
                    <Aviso key={e} tipo="error">
                      {e}
                    </Aviso>
                  ))
                ) : (
                  <dl className="space-y-1 text-[15px]">
                    <div className="flex justify-between">
                      <dt className="text-tinta-500">{rangoFechas(entrada, salida)}</dt>
                      <dd className="text-tinta-700">{plural(n, 'noche', 'noches')} × {pesos(tarifa)}</dd>
                    </div>
                    <div className="flex justify-between text-[17px] font-bold">
                      <dt>Total</dt>
                      <dd>{pesos(tarifa * n)}</dd>
                    </div>
                  </dl>
                )}
              </div>
            )}

            <Boton
              className="mt-4 w-full"
              disabled={!entrada || !salida || errores.length > 0}
              onClick={() => navegar(`/casa/${casa.id}/reservar?entrada=${entrada}&salida=${salida}`)}
            >
              Reservar estas fechas
            </Boton>
            {(!entrada || !salida) && <p className="mt-2 text-center text-[13px] text-tinta-500">Marque la llegada y la salida en el calendario.</p>}
          </Tarjeta>
          {['afiliado', 'jubilado'].includes(usuario.calidad) && (
            <p className="mt-3 px-1 text-[13px] leading-snug text-tinta-500">
              ¿Se casó o firmó un acuerdo de unión civil en el último año? Tiene {PARAMETROS.noches_beneficio_matrimonio} noches liberadas, una sola vez, entre marzo y diciembre (Art. 20). Solicítelas a su encargada regional con el certificado del Registro Civil.
            </p>
          )}
        </aside>
      </div>
    </>
  )
}
