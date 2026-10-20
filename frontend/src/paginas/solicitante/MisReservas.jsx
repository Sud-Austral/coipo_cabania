import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { desistirReserva, misReservas, postulacionDe, sorteoVigente, useDatos } from '../../datos/servicio.js'
import { TarjetaPostulacion } from '../../componentes/Postulacion.jsx'
import { diasEntre, hoyISO, rangoFechas } from '../../lib/fechas.js'
import { pesos, plural } from '../../lib/formato.js'
import { PARAMETROS, cargoDesistimiento, estadoReserva, noches } from '../../lib/reglas.js'
import { rutaFoto } from '../../componentes/fotos.js'
import { Boton, Estado } from '../../componentes/ui.jsx'
import { useSesion } from '../../componentes/Perfil.jsx'

const GRUPOS = [
  { titulo: 'En curso', estados: ['en_curso'] },
  { titulo: 'Próximas', estados: ['confirmada'] },
  { titulo: 'Anteriores', estados: ['finalizada', 'desistida', 'anulada'] },
]

export function MisReservas() {
  useDatos()
  const { usuario } = useSesion()
  const [desistiendo, setDesistiendo] = useState(null)
  const navegar = useNavigate()
  const reservas = misReservas(usuario.id).map((r) => ({ ...r, visible: estadoReserva(r) }))
  const postulacion = postulacionDe(usuario.id)

  return (
    <>
      <h1 className="text-2xl font-bold">Mis reservas</h1>

      {postulacion && (
        <section className="mt-6">
          <h2 className="mb-3 text-[15px] font-semibold uppercase tracking-wide text-tinta-500">Sorteo de temporada alta</h2>
          <TarjetaPostulacion postulacion={postulacion} sorteo={sorteoVigente()} onReserva={(c) => navegar(`/reserva/${c}?nueva=1`)} />
        </section>
      )}

      {reservas.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-borde bg-white p-10 text-center">
          <p className="text-tinta-500">Todavía no tiene reservas.</p>
          <Boton a="/" className="mt-4">
            Buscar una casa
          </Boton>
        </div>
      ) : (
        GRUPOS.map((g) => {
          const lista = reservas.filter((r) => g.estados.includes(r.visible))
          if (!lista.length) return null
          const proximas = g.titulo === 'Próximas'
          return (
            <section key={g.titulo} className="mt-6">
              <h2 className="mb-3 text-[15px] font-semibold uppercase tracking-wide text-tinta-500">{g.titulo}</h2>
              <ul className="space-y-3">
                {lista
                  .sort((a, b) => (proximas ? (a.entrada > b.entrada ? 1 : -1) : 0))
                  .map((r) => (
                    <li key={r.codigo} className="flex flex-col gap-4 rounded-xl border border-borde bg-white p-3 sm:flex-row sm:items-center">
                      <img src={rutaFoto(r.casa.fotos[0])} alt="" className="h-36 w-full rounded-lg object-cover sm:h-20 sm:w-28" loading="lazy" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{r.casa.nombre}</p>
                          <Estado estado={r.visible} />
                        </div>
                        <p className="mt-0.5 text-[15px] text-tinta-700">
                          {rangoFechas(r.entrada, r.salida)} · {plural(noches(r.entrada, r.salida), 'noche', 'noches')}
                        </p>
                        {r.aceptacion_pendiente && proximas && <p className="text-sm font-medium text-alerta-700">Registrada por {r.registrada_por.nombre}: falta que acepte el reglamento (Ver detalle).</p>}
                        <p className="text-sm text-tinta-500">
                          {r.codigo} · {pesos(r.total)}
                          {proximas && ` · faltan ${plural(diasEntre(hoyISO(), r.entrada), 'día', 'días')}`}
                        </p>
                      </div>
                      <div className="flex gap-2 sm:flex-col">
                        <Boton variante="secundario" a={`/reserva/${r.codigo}`} className="flex-1 sm:flex-none">
                          Ver detalle
                        </Boton>
                        {proximas && (
                          <Boton variante="textoPeligro" onClick={() => setDesistiendo(r)} className="flex-1 sm:flex-none">
                            Desistir
                          </Boton>
                        )}
                      </div>
                    </li>
                  ))}
              </ul>
            </section>
          )
        })
      )}

      {desistiendo && <DialogoDesistir reserva={desistiendo} onCerrar={() => setDesistiendo(null)} />}
    </>
  )
}

function DialogoDesistir({ reserva, onCerrar }) {
  const cargo = cargoDesistimiento(reserva)
  useEffect(() => {
    const tecla = (e) => e.key === 'Escape' && onCerrar()
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [onCerrar])
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/40 p-0 sm:place-items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="titulo-desistir" onClick={onCerrar}>
      <div className="w-full max-w-md rounded-t-2xl bg-white p-6 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 id="titulo-desistir" className="text-lg font-bold">
          ¿Desistir de la reserva?
        </h2>
        <p className="mt-2 text-[15px] text-tinta-700">
          {reserva.casa.nombre}, {rangoFechas(reserva.entrada, reserva.salida)}.
        </p>
        <p className={`mt-4 rounded-lg px-4 py-3 text-[15px] ${cargo ? 'bg-alerta-50 text-alerta-700' : 'bg-verde-50 text-verde-800'}`}>
          {cargo
              ? `Faltan menos de ${PARAMETROS.aviso_desistimiento_sin_costo_dias} días corridos: se cobrará una noche (${pesos(cargo)}). Si es por fuerza mayor acreditada (enfermedad, duelo, catástrofe o requerimiento laboral urgente), envíe el respaldo a Bienestar y no tendrá costo.`
              : 'Avisa con 7 o más días corridos: no tiene costo.'}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Boton variante="secundario" onClick={onCerrar} autoFocus>
            Volver
          </Boton>
          <Boton
            variante="peligro"
            onClick={() => {
              desistirReserva(reserva.codigo)
              onCerrar()
            }}
          >
            Sí, desistir
          </Boton>
        </div>
      </div>
    </div>
  )
}
