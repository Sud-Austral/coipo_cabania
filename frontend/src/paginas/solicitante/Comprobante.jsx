import { Link, useParams, useSearchParams } from 'react-router-dom'
import { CheckCircle2, FileDown, Printer } from 'lucide-react'
import { REGIONES } from '../../datos/casas.js'
import { aceptarReserva, obtenerReserva, useDatos } from '../../datos/servicio.js'
import { INICIO, useSesion } from '../../componentes/Perfil.jsx'
import { correoEncargada } from '../../datos/usuarios.js'
import { CATEGORIAS_INVENTARIO } from '../../datos/inventarios.js'
import { fechaCorta, fechaLarga } from '../../lib/fechas.js'
import { pesos, plural } from '../../lib/formato.js'
import { PARAMETROS, estadoReserva, glosaTransferencia, noches } from '../../lib/reglas.js'
import { Aviso, Boton, Estado, Tarjeta } from '../../componentes/ui.jsx'
import { enVisor } from '../../lib/guardar.js'
import { DatosCuenta } from '../../componentes/Transferencia.jsx'

const PAGO = {
  planilla: (f) => `Descuento por planilla en ${plural(f.cuotas, 'cuota', 'cuotas')}`,
  transferencia: () => 'Transferencia, antes de llegar',
}

export function Comprobante() {
  useDatos()
  const { codigo } = useParams()
  const [p] = useSearchParams()
  const r = obtenerReserva(codigo)
  if (!r) return <p>No encontramos la reserva {codigo}.</p>

  const estado = estadoReserva(r)
  const nueva = p.get('nueva') === '1'
  const n = noches(r.entrada, r.salida)
  const region = REGIONES.find((x) => x.codigo === r.casa.region)?.nombre
  const { usuario } = useSesion()
  const gestion = usuario.perfil !== 'solicitante'
  const planilla = r.forma_pago.tipo === 'planilla'

  return (
    <div className="mx-auto max-w-2xl">
      {nueva && (
        <div className="mb-6 text-center">
          <CheckCircle2 className="mx-auto size-12 text-verde-600" aria-hidden />
          <h1 className="mt-3 text-2xl font-bold">{gestion ? `Reserva confirmada a nombre de ${r.titular.nombre}` : '¡Reserva confirmada!'}</h1>
          <p className="mx-auto mt-1 max-w-md text-[15px] text-tinta-500">
            {gestion
              ? `Enviamos a ${r.contacto?.correo} el comprobante${r.actas?.length ? ', el acta de entrega' : ''} y un enlace para aceptar el reglamento${planilla ? ' y autorizar el descuento' : ''}. Avísele que lo revise.`
              : `Le enviamos el comprobante${r.actas?.length ? ' y el acta de entrega' : ''} a ${r.contacto?.correo ?? 'su correo'}.`}
            {r.forma_pago.anticipado ? (gestion ? ' Debe pagar por transferencia antes de llegar.' : ' Recuerde pagar antes de llegar.') : ''}
          </p>
        </div>
      )}

      {r.aceptacion_pendiente && ['confirmada', 'en_curso'].includes(estado) && (
        <div className="no-imprimir mb-6">
          {gestion ? (
            <Aviso>
              Pendiente: {r.titular.nombre} debe aceptar el reglamento{planilla ? ' y autorizar el descuento por planilla' : ''} con el enlace que recibió por correo.
            </Aviso>
          ) : (
            <div className="rounded-xl border border-alerta-700/30 bg-alerta-50 p-4">
              <p className="text-[15px] text-alerta-700">
                {r.registrada_por.nombre} registró esta reserva a su pedido. Para dejarla en regla, confirme que conoce y acepta el Reglamento General de Uso de Casas de Veraneo o Descanso
                {planilla ? ` y que autoriza el descuento por planilla de ${pesos(r.total)} en ${plural(r.forma_pago.cuotas, 'cuota', 'cuotas')}` : ''}.
              </p>
              <Boton className="mt-3" onClick={() => aceptarReserva(r.codigo)}>
                {planilla ? 'Acepto el reglamento y autorizo el descuento' : 'Acepto el reglamento'}
              </Boton>
            </div>
          )}
        </div>
      )}

      <Tarjeta className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-borde pb-4">
          <div>
            <p className="text-[13px] text-tinta-500">Código de reserva</p>
            <p className="text-2xl font-bold tracking-wide tabular-nums">{r.codigo}</p>
          </div>
          <Estado estado={estado} />
        </div>

        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <Dato t="Casa" v={r.casa.nombre} d={`${r.casa.localidad}, ${region}`} />
          <Dato t="Dirección" v={r.casa.direccion} />
          <Dato t="Llegada" v={fechaLarga(r.entrada)} d={`Desde las ${PARAMETROS.hora_ingreso}`} />
          <Dato t="Salida" v={fechaLarga(r.salida)} d={`Hasta las ${PARAMETROS.hora_salida}`} />
          {r.ocupantes.length > 0 && <Dato t="Personas" v={plural(r.ocupantes.length, 'persona', 'personas')} d={r.ocupantes.map((o) => o.nombre).join(', ')} />}
          {r.registrada_por && <Dato t="Registrada por" v={r.registrada_por.nombre} d={`${r.registrada_por.perfil === 'central' ? 'Oficina Central' : 'Encargada regional'}, a pedido de ${r.titular.nombre}`} />}
          {r.titular_viaja === false && <Dato t="A cargo en la casa" v={r.a_cargo} d={`${r.titular.nombre} no viaja y sigue siendo el usuario/a responsable`} />}
          {r.perro_asistencia && <Dato t="Perro de asistencia" v="Sí (Ley 20.422)" d={r.perro_asistencia.credencial ? 'Credencial y certificado sanitario adjuntos' : undefined} />}
          <Dato
            t="Pago"
            v={`${pesos(r.total)} · ${plural(n, 'noche', 'noches')}`}
            d={PAGO[r.forma_pago.tipo](r.forma_pago)}
          />
        </dl>

        {r.forma_pago.tipo === 'transferencia' && ['confirmada', 'en_curso'].includes(estado) && !r.pago && (
          <div className="mt-5 border-t border-borde pt-4">
            <h2 className="font-semibold">Datos para la transferencia</h2>
            <p className="mb-3 mt-1 text-[13px] text-tinta-500">Transfiera antes de llegar y escriba la glosa tal como aparece.</p>
            <DatosCuenta monto={r.total} glosa={r.forma_pago.glosa ?? glosaTransferencia(r.casa, r.codigo)} />
          </div>
        )}

        {estado === 'anulada' && r.motivo_anulacion && (
          <div className="mt-4 rounded-lg bg-error-50 px-4 py-3 text-[15px] text-error-700">
            <p className="font-semibold">Bienestar anuló esta reserva</p>
            <p className="mt-1">{r.motivo_anulacion}</p>
          </div>
        )}

        {estado === 'desistida' && r.cargo_desistimiento !== undefined && (
          <p className="mt-4 rounded-lg bg-stone-50 px-4 py-3 text-[15px]">
            Desistida el {fechaLarga(r.desistida_en)}. Cargo: {r.cargo_desistimiento ? pesos(r.cargo_desistimiento) : 'sin costo'}.
          </p>
        )}
      </Tarjeta>

      {['confirmada', 'en_curso'].includes(estado) && r.actas?.length > 0 && (
        <>
          <Tarjeta className="no-imprimir mt-6 flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="text-[15px]">
              Le enviamos el <strong>acta de entrega</strong> a {r.actas.at(-1).enviada_a}. Llévela o téngala a mano al llegar.
            </p>
            <Boton
              variante="secundario"
              onClick={async () => {
                const { descargarActa } = await import('../../lib/acta.js')
                descargarActa(r, r.actas.at(-1))
              }}
            >
              <FileDown className="size-4" aria-hidden /> Descargar acta (PDF)
            </Boton>
          </Tarjeta>
          <InventarioCasa inv={r.actas.at(-1).inventario} correo={correoEncargada(r.casa.region)} />
        </>
      )}

      <div className="no-imprimir mt-6 flex flex-wrap justify-center gap-3">
        {!enVisor() && (
          <Boton variante="secundario" onClick={() => window.print()}>
            <Printer className="size-4" aria-hidden /> Imprimir o guardar PDF
          </Boton>
        )}
        {gestion ? <Boton a={INICIO[usuario.perfil]}>Volver al inicio</Boton> : <Boton a="/mis-reservas">Ver mis reservas</Boton>}
      </div>
      <p className="no-imprimir mt-4 text-center text-sm">
        <Link to={gestion ? '/gestion/reservar' : '/'} className="font-medium text-verde-700 hover:underline">
          {gestion ? 'Reservar para otra persona' : 'Buscar otra casa'}
        </Link>
      </p>
    </div>
  )
}

function Dato({ t, v, d }) {
  return (
    <div>
      <dt className="text-[13px] text-tinta-500">{t}</dt>
      <dd className="font-medium first-letter:uppercase">{v}</dd>
      {d && <dd className="text-sm text-tinta-500">{d}</dd>}
    </div>
  )
}

const ESTADO_ITEM = { regular: 'bg-alerta-50 text-alerta-700', malo: 'bg-error-50 text-error-700' }

/** Inventario que la encargada envió con la reserva (Art. 13, Anexo B). */
function InventarioCasa({ inv, correo }) {
  const s = inv.seguridad
  return (
    <Tarjeta className="mt-6 p-6">
      <h2 className="text-lg font-semibold">Inventario de la casa</h2>
      <p className="mt-1 text-[15px] text-tinta-700">
        Revíselo al llegar. Tiene <strong>{PARAMETROS.plazo_observaciones_horas} horas</strong> desde el ingreso para informar cualquier daño o faltante; después se entiende recibida conforme (Art. 13).
      </p>
      <ol className="mt-3 list-decimal space-y-1 rounded-lg bg-stone-50 py-3 pl-9 pr-4 text-[15px] text-tinta-700">
        <li>
          <strong>Al llegar:</strong> complete la sección 4 del acta y envíela a{' '}
          <a href={`mailto:${correo}`} className="font-medium text-verde-700 underline">
            {correo}
          </a>{' '}
          dentro de las {PARAMETROS.plazo_observaciones_horas} horas.
        </li>
        <li>
          <strong>Al salir:</strong> envíe el acta firmada al mismo correo.
        </li>
      </ol>
      <p className="mt-1 text-[13px] text-tinta-500">Actualizado el {fechaCorta(inv.actualizado_en.slice(0, 10), true)} por {inv.actualizado_por}.</p>
      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        {CATEGORIAS_INVENTARIO.map((cat) => {
          const items = inv.items.filter((x) => x.categoria === cat)
          if (!items.length) return null
          return (
            <section key={cat}>
              <h3 className="text-[13px] font-semibold uppercase tracking-wide text-tinta-500">{cat}</h3>
              <ul className="mt-1.5 space-y-1 text-[15px]">
                {items.map((x) => (
                  <li key={x.id}>
                    <span className="tabular-nums text-tinta-500">{x.cantidad} ×</span> {x.nombre}
                    {x.estado !== 'bueno' && <span className={`ml-1.5 rounded px-1.5 py-0.5 text-xs font-semibold ${ESTADO_ITEM[x.estado]}`}>{x.estado === 'malo' ? 'Malo' : 'Regular'}</span>}
                    {x.observacion && <span className="block text-sm text-tinta-500">{x.observacion}</span>}
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>
      {(s.llaves || s.controles || s.gas || s.observaciones) && (
        <dl className="mt-5 grid gap-3 border-t border-borde pt-4 text-[15px] sm:grid-cols-2">
          {s.llaves && <Dato t="Llaves" v={s.llaves} />}
          {s.controles && <Dato t="Controles" v={s.controles} />}
          {s.gas && <Dato t="Gas" v={s.gas} d="Cierre la llave de paso al salir (Art. 16)." />}
          {s.observaciones && <Dato t="Indicaciones" v={s.observaciones} />}
        </dl>
      )}
    </Tarjeta>
  )
}
