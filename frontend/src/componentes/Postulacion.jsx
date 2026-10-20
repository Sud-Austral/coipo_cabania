import { useState } from 'react'
import { Clock } from 'lucide-react'
import { responderOferta, retirarPostulacion } from '../datos/servicio.js'
import { rangoFechas, sumarDias } from '../lib/fechas.js'
import { plural } from '../lib/formato.js'
import { PARAMETROS } from '../lib/reglas.js'
import { ESTADOS_POSTULACION, HORAS_OFERTA } from '../lib/sorteo.js'
import { rutaFoto } from './fotos.js'
import { Boton } from './ui.jsx'

export const salidaTurno = (turno) => sumarDias(turno, PARAMETROS.noches_max_temporada_alta)

export function EstadoPostulacion({ estado }) {
  const e = ESTADOS_POSTULACION[estado]
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${e.clase}`}>{e.etiqueta}</span>
}

const fechaHora = (iso) => {
  const [d, h] = iso.split('T')
  return `${Number(d.slice(8, 10))}/${d.slice(5, 7)} a las ${h.slice(0, 5)}`
}

/** Estado de la postulación del solicitante, con las acciones que correspondan. */
export function TarjetaPostulacion({ postulacion: p, sorteo, onReserva }) {
  const [confirmarRetiro, setConfirmarRetiro] = useState(false)
  const salida = salidaTurno(p.turno)

  const texto = {
    postulada: `El sorteo se realiza al cierre de la postulación. Le avisaremos el resultado por correo a ${p.contacto.correo}.`,
    adjudicada: `Se adjudicó el turno. Su reserva ${p.reserva} quedó confirmada y le enviamos el comprobante por correo.`,
    espera: `No se adjudicó el turno. Quedó en el lugar ${p.posicion} de la lista de espera: si alguien desiste, le ofreceremos el cupo por correo y tendrá ${HORAS_OFERTA} horas para aceptarlo.`,
    ofertada: 'Se liberó el turno al que postuló. Si no responde dentro del plazo, el cupo pasa a la siguiente persona de la lista.',
    excluida: p.motivo,
    sin_cupo: p.motivo,
  }[p.estado]

  return (
    <div className={`rounded-xl border bg-white p-4 ${p.estado === 'ofertada' ? 'border-alerta-700/40 ring-2 ring-alerta-50' : 'border-borde'}`}>
      <div className="flex flex-col gap-4 sm:flex-row">
        <img src={rutaFoto(p.casa.fotos[0])} alt="" className="h-32 w-full rounded-lg object-cover sm:h-20 sm:w-28" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">{p.casa.nombre}</p>
            <EstadoPostulacion estado={p.estado} />
          </div>
          <p className="mt-0.5 text-[15px] text-tinta-700">
            {sorteo.nombre} · {rangoFechas(p.turno, salida)} · {plural(p.personas, 'persona', 'personas')}
          </p>
          <p className="text-sm text-tinta-500">
            Postulación {p.codigo}
            {p.prioridad ? ' · con prioridad (Art. 6 a)' : ''}
          </p>
          {texto && <p className="mt-2 text-[15px] text-tinta-700">{texto}</p>}
          {p.estado === 'ofertada' && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-[15px] font-semibold text-alerta-700">
              <Clock className="size-4" aria-hidden /> Responda antes del {fechaHora(p.oferta.vence_en)}
            </p>
          )}
        </div>
      </div>

      {p.estado === 'ofertada' && (
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Boton variante="secundario" onClick={() => responderOferta(p.codigo, false)}>
            No, liberar el cupo
          </Boton>
          <Boton
            onClick={() => {
              const codigo = responderOferta(p.codigo, true)
              if (codigo) onReserva?.(codigo)
            }}
          >
            Aceptar el turno
          </Boton>
        </div>
      )}
      {p.estado === 'adjudicada' && p.reserva && (
        <div className="mt-4 flex justify-end">
          <Boton variante="secundario" a={`/reserva/${p.reserva}`}>
            Ver reserva
          </Boton>
        </div>
      )}
      {p.estado === 'postulada' && (
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          {confirmarRetiro ? (
            <>
              <span className="text-[15px] text-tinta-700">¿Retirar la postulación? Puede volver a postular mientras siga abierta.</span>
              <Boton variante="secundario" onClick={() => setConfirmarRetiro(false)}>
                Volver
              </Boton>
              <Boton variante="peligro" onClick={() => retirarPostulacion(p.codigo)}>
                Sí, retirar
              </Boton>
            </>
          ) : (
            <Boton variante="textoPeligro" onClick={() => setConfirmarRetiro(true)}>
              Retirar postulación
            </Boton>
          )}
        </div>
      )}
    </div>
  )
}
