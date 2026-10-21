/* Reservar en 3 pasos: Fechas y motivo → Quiénes viajan → Revisar y enviar (total grande).
   La tarifa la calcula la lógica (calcularTarifa) y la reserva la crea crearReserva. */
import { useEffect, useMemo, useState } from 'react'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { getInmueble, getTemporadas, validarDisponibilidadRango } from '../../logica/api/inmuebles.js'
import { crearReserva } from '../../logica/api/reservas.js'
import { getTarifasGestion } from '../../logica/api/administracion.js'
import { MOTIVOS, PARENTESCOS } from '../../logica/fixtures/tarifas.js'
import { fotosDe } from '../../logica/fotos.js'
import { calcularTarifa, categoriaOcupante } from '../../logica/lib/tarifas.js'
import { formatearRut, limpiarRut, rutValido } from '../../logica/lib/rut.js'
import { useAccion, useConsulta } from '../../nucleo/consulta.js'
import { useSesion } from '../../nucleo/sesion.js'
import { ir } from '../../nucleo/ruta.js'
import { leerParametros } from '../../nucleo/parametros.js'
import { diaSemana, pesos, plural } from '../../nucleo/textos.js'
import Calendario from '../../piezas/Calendario.jsx'
import { Campo, Cargando, Chip, Falla, Pasos, Volver } from '../../piezas/basicas.jsx'

const PASOS = ['Fechas y motivo', 'Quiénes viajan', 'Revisar y enviar']
const TARIFA = { afiliado: 'Afiliado', sindicato: 'Sindicato', externo: 'Externo' }
const ICONO_MOTIVO = { medica: '✚', laboral: '◆', personal: '☀' }

export default function Reservar({ args }) {
  const [id, entradaUrl, salidaUrl] = args
  const { usuario, actor, esAfiliado } = useSesion()
  const { datos: casa } = useConsulta(() => getInmueble(id), [id])
  const { datos: temporadas } = useConsulta(getTemporadas, [])
  const { datos: tarifas } = useConsulta(getTarifasGestion, [])
  const [paso, setPaso] = useState(1)
  const [rango, setRango] = useState(entradaUrl && salidaUrl ? { entrada: entradaUrl, salida: salidaUrl } : null)
  const [disp, setDisp] = useState(null)
  const [motivo, setMotivo] = useState('')
  const [familiares, setFamiliares] = useState([])
  const [acomp, setAcomp] = useState([])
  const [consulta, setConsulta] = useState('')
  const [enviar, { ocupado, error }] = useAccion()

  const entrada = rango?.entrada
  const salida = rango?.salida
  const titularEsAfiliado = esAfiliado
  const sindicato = titularEsAfiliado && usuario?.tarifa_sindicato === true

  useEffect(() => {
    let vivo = true
    setDisp(null)
    if (entrada && salida) validarDisponibilidadRango(id, entrada, salida).then((d) => vivo && setDisp(d))
    return () => { vivo = false }
  }, [id, entrada, salida])

  const ocupantes = useMemo(() => {
    if (!usuario) return []
    const cat = (p) => categoriaOcupante(p, titularEsAfiliado, sindicato)
    return [
      { nombre: usuario.nombre, rut: usuario.rut, parentesco: 'titular', categoria_tarifa: cat('titular') },
      ...(usuario.grupo_familiar ?? []).filter((f) => familiares.includes(f.rut)).map((f) => ({ ...f, categoria_tarifa: cat(f.parentesco) })),
      ...acomp.map((a) => ({ ...a, categoria_tarifa: cat(a.parentesco) })),
    ]
  }, [usuario, familiares, acomp, titularEsAfiliado, sindicato])

  const tarifa = useMemo(() => (casa && entrada && salida && temporadas && tarifas
    ? calcularTarifa({ inmueble: casa, fechaEntrada: entrada, fechaSalida: salida, motivo: motivo || 'personal', ocupantes, temporadas: temporadas.items, titularEsAfiliado, aplicaTarifaSindicato: sindicato, tarifasConfig: tarifas })
    : null), [casa, entrada, salida, motivo, ocupantes, temporadas, tarifas, titularEsAfiliado, sindicato])

  if (!casa || !usuario) return <Cargando />

  // Anticipación: la misma regla que aplica crearReserva, avisada antes del paso 3.
  const p = leerParametros()
  const anticipacion = entrada ? differenceInCalendarDays(parseISO(entrada), new Date()) : null
  const avisoAnticipacion = anticipacion == null ? null
    : anticipacion < p.anticipacion_minima ? `Reserve con ${plural(p.anticipacion_minima, 'día', 'días')} de anticipación.`
      : anticipacion > p.anticipacion_maxima ? `Máximo ${p.anticipacion_maxima} días antes.` : null

  const exceso = ocupantes.length > casa.capacidad_maxima
  const ruts = ocupantes.map((o) => limpiarRut(o.rut))
  const faltan = acomp.some((a) => !a.nombre.trim() || !a.rut.trim())
  const rutMalo = acomp.some((a) => a.rut.trim() && !rutValido(a.rut))
  const repetido = new Set(ruts).size !== ruts.length
  const puede = {
    1: Boolean(entrada && salida && motivo && disp?.libre && !avisoAnticipacion),
    2: !exceso && !faltan && !rutMalo && !repetido,
    3: true,
  }[paso]

  const mandar = async () => {
    const r = await enviar(() => crearReserva({ inmueble_id: casa.id, fecha_entrada: entrada, fecha_salida: salida, motivo, ocupantes, observaciones: consulta.trim() || null }, actor))
    if (r.ok) ir('reserva', r.r.codigo, 'nueva')
  }
  const cambiarAcomp = (i, k, v) => setAcomp((xs) => xs.map((a, n) => (n === i ? { ...a, [k]: v } : a)))

  return (
    <div className="cb-pagina cb-reservar">
      <Volver a={`casa/${casa.id}`}>{casa.nombre}</Volver>
      <header className="cb-reservar-cab">
        <img src={fotosDe(casa)[0].ruta} alt="" />
        <div>
          <p className="b-hero-pre">Reservar</p>
          <h1>{casa.nombre}</h1>
        </div>
      </header>
      <Pasos pasos={PASOS} actual={paso} />

      <section className="b-mod cb-panel" data-visto aria-label={PASOS[paso - 1]}>
        {paso === 1 && (
          <>
            <h2 className="cb-h2">¿Cuándo viaja?</h2>
            <Calendario inmuebleId={casa.id} rango={rango} alElegir={setRango} inicio={entradaUrl} />
            <div className="cb-estado-fechas" aria-live="polite">
              {!entrada ? <p className="cb-tenue">Toque llegada y salida.</p>
                : !salida ? <p className="cb-tenue">Llegada {diaSemana(entrada)}. Ahora la salida.</p>
                  : !disp ? <p className="cb-tenue">Revisando…</p>
                    : disp.libre
                      ? <p><Chip tono="correcto">Libre</Chip> {diaSemana(entrada)} → {diaSemana(salida)} · {plural(tarifa?.noches ?? 0, 'noche', 'noches')}</p>
                      : <p><Chip tono="error">No disponible</Chip> {disp.motivo}</p>}
              {avisoAnticipacion && <p className="cb-error" role="alert">{avisoAnticipacion}</p>}
            </div>
            <h2 className="cb-h2">¿Por qué viaja?</h2>
            <div className="cb-opciones" role="radiogroup" aria-label="Motivo">
              {MOTIVOS.map((m) => (
                <button key={m.valor} type="button" role="radio" aria-checked={motivo === m.valor} className="cb-opcion" onClick={() => setMotivo(m.valor)}>
                  <i aria-hidden="true">{ICONO_MOTIVO[m.valor]}</i>{m.corto}
                  {m.prelacion === 1 && <small>Tiene prioridad</small>}
                </button>
              ))}
            </div>
          </>
        )}

        {paso === 2 && (
          <>
            <h2 className="cb-h2">¿Quiénes viajan?</h2>
            <p className="cb-capacidad" data-exceso={exceso || undefined}><b>{ocupantes.length}</b> de {casa.capacidad_maxima} personas</p>
            <ul className="cb-personas">
              <li><span><b>{usuario.nombre}</b><small>Titular</small></span><Chip tono="correcto">{TARIFA[ocupantes[0].categoria_tarifa]}</Chip></li>
              {(usuario.grupo_familiar ?? []).map((f) => (
                <li key={f.rut}>
                  <label className="cb-casilla">
                    <input type="checkbox" checked={familiares.includes(f.rut)} onChange={(e) => setFamiliares((xs) => (e.target.checked ? [...xs, f.rut] : xs.filter((x) => x !== f.rut)))} />
                    <span><b>{f.nombre}</b><small>{PARENTESCOS.find((x) => x.valor === f.parentesco)?.etiqueta}</small></span>
                  </label>
                </li>
              ))}
            </ul>
            {acomp.map((a, i) => (
              <fieldset key={i} className="cb-acomp">
                <legend>Acompañante {i + 1}</legend>
                <Campo etiqueta="Nombre" value={a.nombre} onChange={(e) => cambiarAcomp(i, 'nombre', e.target.value)} autoComplete="off" />
                <Campo etiqueta="RUT" value={a.rut} inputMode="text" placeholder="12.345.678-9" onChange={(e) => cambiarAcomp(i, 'rut', e.target.value)} onBlur={(e) => cambiarAcomp(i, 'rut', formatearRut(e.target.value))} error={a.rut.trim() && !rutValido(a.rut) ? 'RUT no válido' : null} />
                <Campo etiqueta="Relación" como="select" value={a.parentesco} onChange={(e) => cambiarAcomp(i, 'parentesco', e.target.value)}>
                  {PARENTESCOS.filter((x) => x.valor !== 'titular').map((x) => <option key={x.valor} value={x.valor}>{x.etiqueta}</option>)}
                </Campo>
                <button type="button" className="cb-enlace cb-quitar" onClick={() => setAcomp((xs) => xs.filter((_, n) => n !== i))}>Quitar</button>
              </fieldset>
            ))}
            <button type="button" className="cb-btn cb-btn-sec" onClick={() => setAcomp((xs) => [...xs, { nombre: '', rut: '', parentesco: 'acompanante' }])} disabled={ocupantes.length >= casa.capacidad_maxima}>+ Agregar acompañante</button>
            {exceso && <p className="cb-error" role="alert">Supera la capacidad de la casa.</p>}
            {repetido && <p className="cb-error" role="alert">Hay un RUT repetido.</p>}
          </>
        )}

        {paso === 3 && tarifa && (
          <>
            <h2 className="cb-h2">Revise y envíe</h2>
            <div className="cb-total-caja">
              <p className="b-rotulo">Total</p>
              <p className="cb-total" data-total={tarifa.total}>{pesos(tarifa.total)}</p>
              <p className="cb-tenue">{plural(tarifa.noches, 'noche', 'noches')} · {plural(ocupantes.length, 'persona', 'personas')}</p>
            </div>
            <dl className="cb-resumen">
              <div><dt>Llegada</dt><dd>{diaSemana(entrada)}</dd></div>
              <div><dt>Salida</dt><dd>{diaSemana(salida)}</dd></div>
              <div><dt>Motivo</dt><dd>{MOTIVOS.find((m) => m.valor === motivo)?.corto}</dd></div>
              <div><dt>Personas</dt><dd>{ocupantes.map((o) => o.nombre.split(' ')[0]).join(', ')}</dd></div>
            </dl>
            <details className="cb-detalle">
              <summary>Ver detalle del valor</summary>
              <ul>{tarifa.lineas.map((l) => <li key={l.concepto}><span>{l.concepto}<small>{l.detalle_cantidad}</small></span><b>{pesos(l.subtotal)}</b></li>)}</ul>
            </details>
            <Campo etiqueta="Consulta para la encargada (opcional)" como="textarea" rows={2} value={consulta} onChange={(e) => setConsulta(e.target.value)} placeholder="Ej.: ¿Tiene estufa?" />
            <p className="cb-tenue cb-nota-corta">Se paga al terminar la estadía.</p>
            <Falla>{error}</Falla>
          </>
        )}

        <div className="cb-panel-pie">
          <button type="button" className="cb-btn cb-btn-sec" onClick={() => (paso === 1 ? ir('casa', casa.id) : setPaso(paso - 1))}>{paso === 1 ? 'Cancelar' : 'Atrás'}</button>
          {paso < 3
            ? <button type="button" className="b-boton" disabled={!puede} onClick={() => setPaso(paso + 1)}>Continuar</button>
            : <button type="button" className="b-boton" aria-busy={ocupado || undefined} onClick={ocupado ? undefined : mandar}>Enviar solicitud</button>}
        </div>
      </section>
    </div>
  )
}
