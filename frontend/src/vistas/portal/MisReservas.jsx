/* Mis reservas: próximas y anteriores. Una acción principal por tarjeta:
   Cancelar (con o sin emergencia) · Pagar (cuotas por sueldo o transferencia) · Valorar. */
import { useState } from 'react'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { anularReserva, getDatosTransferencia, getReservas, informarPagoTransferencia, seleccionarDescuentoPlanilla } from '../../logica/api/reservas.js'
import { crearValoracion } from '../../logica/api/valoraciones.js'
import { fotosDe } from '../../logica/fotos.js'
import { contarNoches, cobroPorDesistimiento } from '../../logica/lib/tarifas.js'
import { repartirCuotas } from '../../logica/lib/cobros.js'
import { useAccion, useConsulta } from '../../nucleo/consulta.js'
import { useSesion } from '../../nucleo/sesion.js'
import { ir } from '../../nucleo/ruta.js'
import { leerParametros } from '../../nucleo/parametros.js'
import { situacionPago } from '../../nucleo/pagos.js'
import { pesos, plural, rangoCorto } from '../../nucleo/textos.js'
import Hoja from '../../piezas/Hoja.jsx'
import { Campo, Cargando, Chip, ChipEstado, Falla, SelectorEstrellas, Titulo, Vacio } from '../../piezas/basicas.jsx'

const ANULABLES = ['recibida', 'confirmada', 'lista_espera']
const PROXIMAS = ['recibida', 'confirmada', 'lista_espera', 'en_curso', 'fuerza_mayor_pendiente']

function Cancelar({ r, alCerrar }) {
  const { actor } = useSesion()
  const p = leerParametros()
  const [emergencia, setEmergencia] = useState(false)
  const [que, setQue] = useState('')
  const [respaldo, setRespaldo] = useState(null)
  const [errorArchivo, setErrorArchivo] = useState('')
  const [correr, { ocupado, error }] = useAccion()
  const diasAviso = differenceInCalendarDays(parseISO(r.fecha_entrada), new Date())
  const cobro = cobroPorDesistimiento({ montoTotal: r.monto_total, noches: contarNoches(r.fecha_entrada, r.fecha_salida), diasAviso, fuerzaMayor: false, diasSinCobro: p.desistimiento_sin_cobro, diasCobroFuerzaMayor: p.cobro_fuerza_mayor_dias })
  const elegir = (f) => {
    setErrorArchivo('')
    if (!f) return setRespaldo(null)
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(f.type)) { setRespaldo(null); return setErrorArchivo('Use PDF, JPG o PNG.') }
    if (f.size > p.maximo_adjunto_mb * 1024 * 1024) { setRespaldo(null); return setErrorArchivo(`Máximo ${p.maximo_adjunto_mb} MB.`) }
    setRespaldo({ nombre: f.name, tamano: f.size, tipo: f.type })
  }
  const listo = !emergencia || que.trim()
  const confirmar = async () => {
    const x = await correr(() => anularReserva(r.codigo, { fuerzaMayor: emergencia, motivoFuerzaMayor: que.trim(), respaldo, actor }))
    if (x.ok) alCerrar()
  }
  return (
    <Hoja abierta titulo="Cancelar reserva" sub={`${r.inmueble?.nombre} · ${rangoCorto(r.fecha_entrada, r.fecha_salida)}`} alCerrar={alCerrar}
      pie={<><button type="button" className="cb-btn cb-btn-sec" onClick={alCerrar}>Volver</button>
        <button type="button" className="cb-btn cb-btn-peligro" disabled={!listo} aria-busy={ocupado || undefined} onClick={ocupado ? undefined : confirmar}>Cancelar reserva</button></>}>
      {!emergencia && (
        <div className="cb-cobro" data-cero={cobro.monto === 0 || undefined}>
          <p className="b-rotulo">{cobro.monto === 0 ? 'Sin cobro' : 'Se cobra'}</p>
          <p className="cb-total">{pesos(cobro.monto)}</p>
          <p className="cb-tenue">{diasAviso >= p.desistimiento_sin_cobro ? `Avisa con ${diasAviso} días.` : `Menos de ${p.desistimiento_sin_cobro} días de aviso.`}</p>
        </div>
      )}
      <label className="cb-casilla cb-casilla-grande">
        <input type="checkbox" checked={emergencia} onChange={(e) => setEmergencia(e.target.checked)} />
        <span><b>Es una emergencia</b><small>Oficina Central revisa. Si aprueba, paga {plural(p.cobro_fuerza_mayor_dias, 'día', 'días')}.</small></span>
      </label>
      {emergencia && (
        <>
          <Campo etiqueta="¿Qué pasó?" como="textarea" rows={3} value={que} onChange={(e) => setQue(e.target.value)} required />
          <Campo etiqueta="Respaldo (opcional)" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => elegir(e.target.files?.[0])} error={errorArchivo || null} />
        </>
      )}
      <Falla>{error}</Falla>
    </Hoja>
  )
}

function Pagar({ r, alCerrar }) {
  const { actor, esAfiliado } = useSesion()
  const sit = situacionPago(r)
  const noches = Math.max(1, contarNoches(r.fecha_entrada, r.fecha_salida))
  const [modo, setModo] = useState(esAfiliado && r.titular_es_afiliado ? 'sueldo' : 'transferencia')
  const [cuotas, setCuotas] = useState(r.descuento_planilla?.cuotas ?? 1)
  const [comprobante, setComprobante] = useState(null)
  const { datos: banco } = useConsulta(getDatosTransferencia, [])
  const [correr, { ocupado, error }] = useAccion()
  const montos = repartirCuotas(r.monto_total, cuotas)
  const confirmar = async () => {
    const x = await correr(() => (modo === 'sueldo'
      ? seleccionarDescuentoPlanilla(r.codigo, { cuotas, actor })
      : informarPagoTransferencia(r.codigo, { comprobante, actor })))
    if (x.ok) alCerrar()
  }
  return (
    <Hoja abierta titulo="¿Cómo paga?" sub={`${r.codigo} · ${pesos(r.monto_total)}`} alCerrar={alCerrar}
      pie={<><button type="button" className="cb-btn cb-btn-sec" onClick={alCerrar}>Volver</button>
        <button type="button" className="b-boton" aria-busy={ocupado || undefined} onClick={ocupado ? undefined : confirmar}>{modo === 'sueldo' ? `Elegir ${plural(cuotas, 'cuota', 'cuotas')}` : 'Ya transferí'}</button></>}>
      {esAfiliado && r.titular_es_afiliado && (
        <div className="cb-segmento" role="radiogroup" aria-label="Forma de pago">
          <button type="button" role="radio" aria-checked={modo === 'sueldo'} onClick={() => setModo('sueldo')}>Descuento por sueldo</button>
          <button type="button" role="radio" aria-checked={modo === 'transferencia'} onClick={() => setModo('transferencia')}>Transferencia</button>
        </div>
      )}
      {modo === 'sueldo' ? (
        <>
          <Campo etiqueta="Cuotas" como="select" value={cuotas} onChange={(e) => setCuotas(Number(e.target.value))}>
            {Array.from({ length: noches }, (_, i) => <option key={i + 1} value={i + 1}>{plural(i + 1, 'cuota', 'cuotas')}</option>)}
          </Campo>
          <div className="cb-cobro">
            <p className="b-rotulo">Cada mes</p>
            <p className="cb-total">{pesos(montos[0])}</p>
            {montos.at(-1) !== montos[0] && <p className="cb-tenue">Última: {pesos(montos.at(-1))}</p>}
          </div>
          {sit?.clave === 'planilla' && <p className="cb-tenue">Hoy: {sit.texto}.</p>}
        </>
      ) : (
        <>
          {banco && (
            <dl className="cb-resumen cb-banco">
              <div><dt>Banco</dt><dd>{banco.banco}</dd></div>
              <div><dt>Cuenta</dt><dd>{banco.tipo_cuenta} {banco.numero_cuenta}</dd></div>
              <div><dt>Titular</dt><dd>{banco.titular}</dd></div>
              <div><dt>Monto</dt><dd>{pesos(r.monto_total)}</dd></div>
            </dl>
          )}
          <Campo etiqueta="Comprobante (opcional)" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => { const f = e.target.files?.[0]; setComprobante(f ? { nombre: f.name, tamano: f.size, tipo: f.type } : null) }} />
        </>
      )}
      <Falla>{error}</Falla>
    </Hoja>
  )
}

function Valorar({ r, alCerrar }) {
  const { actor } = useSesion()
  const [estrellas, setEstrellas] = useState(0)
  const [comentario, setComentario] = useState('')
  const [correr, { ocupado, error }] = useAccion()
  const guardar = async () => {
    const x = await correr(() => crearValoracion({ inmueble_id: r.inmueble_id, reserva_codigo: r.codigo, estrellas, comentario }, actor))
    if (x.ok) alCerrar()
  }
  return (
    <Hoja abierta titulo="¿Cómo le fue?" sub={r.inmueble?.nombre} alCerrar={alCerrar}
      pie={<><button type="button" className="cb-btn cb-btn-sec" onClick={alCerrar}>Volver</button>
        <button type="button" className="b-boton" disabled={!estrellas} aria-busy={ocupado || undefined} onClick={ocupado ? undefined : guardar}>Enviar</button></>}>
      <SelectorEstrellas valor={estrellas} alCambiar={setEstrellas} />
      <Campo etiqueta="Comentario (opcional)" como="textarea" rows={3} value={comentario} onChange={(e) => setComentario(e.target.value)} />
      <Falla>{error}</Falla>
    </Hoja>
  )
}

function Tarjeta({ r, alAbrir }) {
  const sit = situacionPago(r)
  return (
    <li className="cb-reserva" data-codigo={r.codigo}>
      <img src={fotosDe(r.inmueble)[0].ruta} alt="" loading="lazy" />
      <div className="cb-reserva-cuerpo">
        <p className="cb-reserva-sup"><ChipEstado estado={r.estado} />{sit && <Chip tono={sit.tono}>{sit.texto}</Chip>}</p>
        <h3>{r.inmueble?.nombre}</h3>
        <p className="cb-tenue">{rangoCorto(r.fecha_entrada, r.fecha_salida)} · {plural(r.ocupantes?.length ?? 1, 'persona', 'personas')} · <b className="cb-monto">{pesos(r.monto_total)}</b></p>
        {r.observaciones && PROXIMAS.includes(r.estado) && (
          <p className="cb-consulta-mini">«{r.observaciones}»{r.respuesta_observacion && <><br /><b>Respuesta:</b> {r.respuesta_observacion.mensaje}</>}</p>
        )}
        <div className="cb-acciones">
          {ANULABLES.includes(r.estado) && <button type="button" className="cb-btn cb-btn-sec" onClick={() => alAbrir('cancelar', r)}>Cancelar</button>}
          {sit?.cambiable && <button type="button" className="b-boton cb-boton-chico" onClick={() => alAbrir('pagar', r)}>{sit.clave === 'planilla' ? 'Cambiar pago' : 'Pagar'}</button>}
          {r.estado === 'finalizada' && !r.valoracion && <button type="button" className="b-boton cb-boton-chico" onClick={() => alAbrir('valorar', r)}>Valorar</button>}
          <a className="cb-enlace" href={`#reserva/${r.codigo}`}>Comprobante</a>
        </div>
      </div>
    </li>
  )
}

export default function MisReservas() {
  const { usuario } = useSesion()
  const { datos } = useConsulta(() => getReservas({ usuario_id: usuario?.id }), [usuario?.id])
  const [abierta, setAbierta] = useState(null) // { tipo, r }
  if (!datos) return <Cargando />
  const proximas = datos.items.filter((r) => PROXIMAS.includes(r.estado)).sort((a, b) => (a.fecha_entrada < b.fecha_entrada ? -1 : 1))
  const anteriores = datos.items.filter((r) => !PROXIMAS.includes(r.estado))
  const abrir = (tipo, r) => setAbierta({ tipo, r })
  const cerrar = () => setAbierta(null)

  return (
    <div className="cb-pagina">
      <Titulo pre={usuario?.nombre} accion={<button type="button" className="b-boton" onClick={() => ir('casas')}>Nueva reserva</button>}>Mis reservas</Titulo>
      <h2 className="cb-h2">Próximas</h2>
      {proximas.length ? <ul className="cb-reservas">{proximas.map((r) => <Tarjeta key={r.codigo} r={r} alAbrir={abrir} />)}</ul> : <Vacio>No tiene viajes próximos.</Vacio>}
      <h2 className="cb-h2">Anteriores</h2>
      {anteriores.length ? <ul className="cb-reservas">{anteriores.map((r) => <Tarjeta key={r.codigo} r={r} alAbrir={abrir} />)}</ul> : <Vacio>Sin reservas anteriores.</Vacio>}
      {abierta?.tipo === 'cancelar' && <Cancelar r={abierta.r} alCerrar={cerrar} />}
      {abierta?.tipo === 'pagar' && <Pagar r={abierta.r} alCerrar={cerrar} />}
      {abierta?.tipo === 'valorar' && <Valorar r={abierta.r} alCerrar={cerrar} />}
    </div>
  )
}
