/* Comprobante de una reserva. Recién enviada, abre con un visto grande. */
import { getReserva } from '../../logica/api/reservas.js'
import { MOTIVOS } from '../../logica/fixtures/tarifas.js'
import { useConsulta } from '../../nucleo/consulta.js'
import { useSesion } from '../../nucleo/sesion.js'
import { ir } from '../../nucleo/ruta.js'
import { diaSemana, etiquetaEstado, fechaHora, pesos, plural } from '../../nucleo/textos.js'
import { contarNoches } from '../../logica/lib/tarifas.js'
import { Cargando, ChipEstado, Vacio } from '../../piezas/basicas.jsx'

export default function Comprobante({ args }) {
  const [codigo, marca] = args
  const { esPortal } = useSesion()
  const { datos: r, error } = useConsulta(() => getReserva(codigo), [codigo])
  if (error) return <div className="cb-pagina"><Vacio>No encontramos la reserva {codigo}.</Vacio></div>
  if (!r) return <Cargando />
  const nueva = marca === 'nueva'
  const noches = contarNoches(r.fecha_entrada, r.fecha_salida)

  return (
    <div className="cb-pagina cb-comprobante">
      {!nueva && <button type="button" className="cb-volver" onClick={() => history.back()}>‹ Atrás</button>}
      <section className="b-mod cb-comp" data-visto aria-labelledby="cb-comp-titulo">
        {nueva && (
          <svg className="cb-visto" viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="24" /><path d="M15 27l7 7 15-16" /></svg>
        )}
        <p className="b-rotulo">{nueva ? (r.estado === 'lista_espera' ? 'Quedó en lista de espera' : 'Solicitud enviada') : 'Comprobante'}</p>
        <h1 id="cb-comp-titulo" className="cb-codigo">{r.codigo}</h1>
        <ChipEstado estado={r.estado} />
        {nueva && r.estado === 'recibida' && <p className="b-texto">La encargada regional la revisa y le avisa.</p>}
        <dl className="cb-resumen">
          <div><dt>Casa</dt><dd>{r.inmueble?.nombre}</dd></div>
          <div><dt>Llegada</dt><dd>{diaSemana(r.fecha_entrada)}</dd></div>
          <div><dt>Salida</dt><dd>{diaSemana(r.fecha_salida)}</dd></div>
          <div><dt>Noches</dt><dd>{noches}</dd></div>
          <div><dt>Personas</dt><dd>{plural(r.ocupantes?.length ?? 1, 'persona', 'personas')}</dd></div>
          <div><dt>Motivo</dt><dd>{MOTIVOS.find((m) => m.valor === r.motivo)?.corto}</dd></div>
          <div><dt>Titular</dt><dd>{r.titular_nombre}</dd></div>
          <div className="cb-resumen-total"><dt>Total</dt><dd>{pesos(r.monto_total)}</dd></div>
        </dl>
        {r.observaciones && r.estado !== 'anulada' && (
          <div className="cb-consulta">
            <p><b>Su consulta:</b> {r.observaciones}</p>
            {r.respuesta_observacion && <p><b>Respuesta:</b> {r.respuesta_observacion.mensaje}</p>}
          </div>
        )}
        {r.fundamento && r.estado === 'rechazada' && <p className="cb-consulta"><b>Motivo:</b> {r.fundamento}</p>}
        <ol className="cb-historial" aria-label="Historial">
          {(r.historial_estados ?? []).map((h, i) => <li key={i}><b>{etiquetaEstado(h.estado)}</b><small>{fechaHora(h.fecha)}</small></li>)}
        </ol>
        <div className="cb-acciones cb-no-imprimir">
          {esPortal && <button type="button" className="b-boton" onClick={() => ir('mis-reservas')}>Mis reservas</button>}
          <button type="button" className="cb-btn cb-btn-sec" onClick={() => print()}>Imprimir</button>
        </div>
      </section>
    </div>
  )
}
