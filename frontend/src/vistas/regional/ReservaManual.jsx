/* Reserva manual (teléfono o presencial), en el orden de la conversación:
   quién → dónde y cuándo → por qué → resumen con el valor. */
import { useEffect, useMemo, useState } from 'react'
import { getInmuebles, validarDisponibilidadRango } from '../../logica/api/inmuebles.js'
import { crearReserva, simularTarifa } from '../../logica/api/reservas.js'
import { afiliadosEjemplo } from '../../logica/fixtures/usuarios.js'
import { MOTIVOS } from '../../logica/fixtures/tarifas.js'
import { limpiarRut } from '../../logica/lib/rut.js'
import { useAccion, useConsulta } from '../../nucleo/consulta.js'
import { useSesion } from '../../nucleo/sesion.js'
import { ir } from '../../nucleo/ruta.js'
import { diaSemana, hoyISO, nombreRegion, pesos, plural } from '../../nucleo/textos.js'
import { Campo, Chip, Falla, Titulo } from '../../piezas/basicas.jsx'
import { SelectorRegion } from './InicioRegional.jsx'

function Paso({ n, titulo, hecho, children }) {
  return (
    <section className="b-mod cb-paso-manual" data-visto data-hecho={hecho || undefined} aria-labelledby={`cb-pm-${n}`}>
      <h2 id={`cb-pm-${n}`} className="cb-h2"><span className="cb-num">{hecho ? '✓' : n}</span>{titulo}</h2>
      {children}
    </section>
  )
}

export default function ReservaManual() {
  const { region, actor } = useSesion()
  const afiliados = afiliadosEjemplo.filter((a) => a.region === region)
  const { datos: casas } = useConsulta(() => getInmuebles({ region }), [region])
  const [buscar, setBuscar] = useState('')
  const [titular, setTitular] = useState(null)
  const [casaId, setCasaId] = useState('')
  const [entrada, setEntrada] = useState('')
  const [salida, setSalida] = useState('')
  const [motivo, setMotivo] = useState('')
  const [canal, setCanal] = useState('telefonica')
  const [disp, setDisp] = useState(null)
  const [tarifa, setTarifa] = useState(null)
  const [guardar, { ocupado, error }] = useAccion()

  const coincidencias = useMemo(() => {
    const t = buscar.trim().toLowerCase()
    if (!t) return afiliados
    const rut = limpiarRut(t)
    return afiliados.filter((a) => a.nombre.toLowerCase().includes(t) || (rut && limpiarRut(a.rut).includes(rut)))
  }, [buscar, afiliados])

  const casa = casas?.items.find((c) => c.id === Number(casaId))
  const fechasOk = entrada && salida && salida > entrada

  useEffect(() => {
    let vivo = true
    setDisp(null); setTarifa(null)
    if (!casa || !fechasOk) return undefined
    validarDisponibilidadRango(casa.id, entrada, salida).then((d) => vivo && setDisp(d))
    simularTarifa({ inmueble_id: casa.id, fecha_entrada: entrada, fecha_salida: salida, motivo: motivo || 'personal', ocupantes: titular ? [{ nombre: titular.nombre, rut: titular.rut, parentesco: 'titular' }] : [{ parentesco: 'titular' }] })
      .then((t) => vivo && setTarifa(t))
    return () => { vivo = false }
  }, [casa, entrada, salida, fechasOk, motivo, titular])

  const listo = titular && casa && fechasOk && motivo
  const enviar = async () => {
    const x = await guardar(() => crearReserva({
      inmueble_id: casa.id, fecha_entrada: entrada, fecha_salida: salida, motivo, origen: canal,
      ocupantes: [{ nombre: titular.nombre, rut: titular.rut, parentesco: 'titular', categoria_tarifa: 'afiliado' }],
      titular: { ...titular },
    }, actor))
    if (x.ok) ir('reserva', x.r.codigo, 'nueva')
  }

  return (
    <div className="cb-pagina cb-manual">
      <Titulo pre="Nueva reserva" accion={<SelectorRegion />}>Reserva por teléfono</Titulo>

      <Paso n={1} titulo="¿Quién?" hecho={Boolean(titular)}>
        {titular ? (
          <div className="cb-elegido"><span><b>{titular.nombre}</b><small>{titular.rut}</small></span><button type="button" className="cb-enlace" onClick={() => setTitular(null)}>Cambiar</button></div>
        ) : (
          <>
            <Campo etiqueta="Nombre o RUT" value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Ej.: Cárdenas" autoComplete="off" />
            <ul className="cb-mini">
              {coincidencias.slice(0, 6).map((a) => (
                <li key={a.id}><span><b>{a.nombre}</b><small>{a.rut}</small></span><button type="button" className="cb-btn cb-btn-sec" onClick={() => setTitular(a)}>Elegir</button></li>
              ))}
              {!coincidencias.length && <li className="cb-tenue">Sin afiliados en {nombreRegion(region)}.</li>}
            </ul>
          </>
        )}
      </Paso>

      <Paso n={2} titulo="¿Dónde y cuándo?" hecho={Boolean(casa && fechasOk)}>
        <Campo etiqueta="Casa" como="select" value={casaId} onChange={(e) => setCasaId(e.target.value)}>
          <option value="">Elija una casa</option>
          {(casas?.items ?? []).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </Campo>
        <div className="cb-dos-campos">
          <Campo etiqueta="Llegada" type="date" value={entrada} min={hoyISO()} onChange={(e) => setEntrada(e.target.value)} />
          <Campo etiqueta="Salida" type="date" value={salida} min={entrada || hoyISO()} onChange={(e) => setSalida(e.target.value)} error={entrada && salida && !fechasOk ? 'Después de la llegada' : null} />
        </div>
        {disp && (disp.libre ? <p><Chip tono="correcto">Libre</Chip></p> : <p><Chip tono="aviso">Ocupada</Chip> <span className="cb-tenue">Quedará en lista de espera.</span></p>)}
      </Paso>

      <Paso n={3} titulo="¿Por qué?" hecho={Boolean(motivo)}>
        <div className="cb-opciones" role="radiogroup" aria-label="Motivo">
          {MOTIVOS.map((m) => <button key={m.valor} type="button" role="radio" aria-checked={motivo === m.valor} className="cb-opcion" onClick={() => setMotivo(m.valor)}>{m.corto}</button>)}
        </div>
        <div className="cb-segmento" role="radiogroup" aria-label="Canal">
          <button type="button" role="radio" aria-checked={canal === 'telefonica'} onClick={() => setCanal('telefonica')}>Por teléfono</button>
          <button type="button" role="radio" aria-checked={canal === 'presencial'} onClick={() => setCanal('presencial')}>En persona</button>
        </div>
      </Paso>

      <Paso n={4} titulo="Resumen">
        {listo && tarifa ? (
          <>
            <div className="cb-total-caja">
              <p className="b-rotulo">Valor</p>
              <p className="cb-total">{pesos(tarifa.total)}</p>
              <p className="cb-tenue">{plural(tarifa.noches, 'noche', 'noches')} · {diaSemana(entrada)} → {diaSemana(salida)}</p>
            </div>
            <p className="cb-tenue">{titular.nombre} · {casa.nombre}</p>
          </>
        ) : <p className="cb-tenue">Complete los pasos 1 a 3.</p>}
        <Falla>{error}</Falla>
        <div className="cb-panel-pie">
          <span />
          <button type="button" className="b-boton" disabled={!listo || !tarifa} aria-busy={ocupado || undefined} onClick={ocupado ? undefined : enviar}>Guardar reserva</button>
        </div>
      </Paso>
    </div>
  )
}
