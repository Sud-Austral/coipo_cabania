/* Bloqueos y sanciones: bloqueados primero («Desbloquear»), problemas informados por las encargadas
   al registrar una salida, y «Bloquear a alguien». Quien está bloqueado no puede reservar (crearReserva). */
import { useState } from 'react'
import { getReservas } from '../../logica/api/reservas.js'
import { crearSancion, getSanciones, levantarSancion } from '../../logica/api/gestion.js'
import { resolverIncidencia } from '../../logica/api/administracion.js'
import { formatearRut, rutValido } from '../../logica/lib/rut.js'
import { useAccion, useConsulta } from '../../nucleo/consulta.js'
import { useSesion } from '../../nucleo/sesion.js'
import { fecha, hoyISO } from '../../nucleo/textos.js'
import Hoja from '../../piezas/Hoja.jsx'
import { Campo, Cargando, Chip, Falla, Titulo, Vacio } from '../../piezas/basicas.jsx'

const TIPOS = [
  { valor: 'no_pago', etiqueta_tipo: 'Deuda por uso del beneficio', corto: 'Deuda' },
  { valor: 'destrozos', etiqueta_tipo: 'Daños al inmueble', corto: 'Daños' },
  { valor: 'no_show', etiqueta_tipo: 'No presentación reiterada', corto: 'No llegó' },
  { valor: 'normas', etiqueta_tipo: 'Incumplimiento de normas de uso', corto: 'Normas' },
]
const INCIDENCIA = { danos: 'Daños', no_show: 'No llegó', conducta: 'No respetó las normas' }

function Bloquear({ alCerrar, previo }) {
  const { actor } = useSesion()
  const [s, setS] = useState({ usuario_nombre: previo?.nombre ?? '', usuario_rut: previo?.rut ?? '', tipo: previo?.tipo ?? 'no_pago', motivo: '', desde: hoyISO(), hasta: '', duracion: 'temporal' })
  const [correr, { ocupado, error }] = useAccion()
  const cambiar = (k) => (e) => setS((x) => ({ ...x, [k]: e.target.value }))
  const rutMalo = s.usuario_rut && !rutValido(s.usuario_rut)
  const listo = s.usuario_nombre.trim() && s.usuario_rut && !rutMalo && s.motivo.trim() && (s.duracion === 'indefinida' || s.hasta)
  const guardar = async () => {
    const tipo = TIPOS.find((t) => t.valor === s.tipo)
    const x = await correr(async () => {
      await crearSancion({ ...s, etiqueta_tipo: tipo.etiqueta_tipo, hasta: s.duracion === 'indefinida' ? null : s.hasta, respaldo: previo?.codigo ? `Reserva ${previo.codigo}` : '' }, actor)
      if (previo?.codigo) await resolverIncidencia(previo.codigo, 'sancionada', s.motivo.trim(), actor)
    })
    if (x.ok) alCerrar()
  }
  return (
    <Hoja abierta titulo="Bloquear a alguien" sub="No podrá reservar" alCerrar={alCerrar}
      pie={<><button type="button" className="cb-btn cb-btn-sec" onClick={alCerrar}>Volver</button>
        <button type="button" className="cb-btn cb-btn-peligro" disabled={!listo} aria-busy={ocupado || undefined} onClick={ocupado ? undefined : guardar}>Bloquear</button></>}>
      <Campo etiqueta="Nombre" value={s.usuario_nombre} onChange={cambiar('usuario_nombre')} />
      <Campo etiqueta="RUT" value={s.usuario_rut} onChange={cambiar('usuario_rut')} onBlur={(e) => setS((x) => ({ ...x, usuario_rut: formatearRut(e.target.value) }))} error={rutMalo ? 'RUT no válido' : null} />
      <Campo etiqueta="Por qué" como="select" value={s.tipo} onChange={cambiar('tipo')}>
        {TIPOS.map((t) => <option key={t.valor} value={t.valor}>{t.etiqueta_tipo}</option>)}
      </Campo>
      <Campo etiqueta="Detalle" como="textarea" rows={2} value={s.motivo} onChange={cambiar('motivo')} />
      <div className="cb-segmento" role="radiogroup" aria-label="Duración">
        <button type="button" role="radio" aria-checked={s.duracion === 'temporal'} onClick={() => setS((x) => ({ ...x, duracion: 'temporal' }))}>Hasta una fecha</button>
        <button type="button" role="radio" aria-checked={s.duracion === 'indefinida'} onClick={() => setS((x) => ({ ...x, duracion: 'indefinida' }))}>Sin fecha</button>
      </div>
      {s.duracion === 'temporal' && <Campo etiqueta="Hasta" type="date" value={s.hasta} min={hoyISO()} onChange={cambiar('hasta')} />}
      <Falla>{error}</Falla>
    </Hoja>
  )
}

function ConFundamento({ titulo, boton, alCerrar, alConfirmar, peligro }) {
  const [texto, setTexto] = useState('')
  const [correr, { ocupado, error }] = useAccion()
  const ok = async () => { const x = await correr(() => alConfirmar(texto.trim())); if (x.ok) alCerrar() }
  return (
    <Hoja abierta titulo={titulo} alCerrar={alCerrar}
      pie={<><button type="button" className="cb-btn cb-btn-sec" onClick={alCerrar}>Volver</button>
        <button type="button" className={peligro ? 'cb-btn cb-btn-peligro' : 'b-boton'} disabled={!texto.trim()} aria-busy={ocupado || undefined} onClick={ocupado ? undefined : ok}>{boton}</button></>}>
      <Campo etiqueta="Fundamento" como="textarea" rows={2} value={texto} onChange={(e) => setTexto(e.target.value)} required />
      <Falla>{error}</Falla>
    </Hoja>
  )
}

export default function Bloqueos() {
  const { actor } = useSesion()
  const { datos } = useConsulta(async () => {
    const [s, r] = await Promise.all([getSanciones(), getReservas()])
    return { sanciones: s.items, incidencias: r.items.filter((x) => x.incidencia?.estado === 'informada') }
  }, [])
  const [hoja, setHoja] = useState(null)
  if (!datos) return <Cargando />
  const vigentes = datos.sanciones.filter((s) => s.estado === 'vigente')
  const levantadas = datos.sanciones.filter((s) => s.estado !== 'vigente')
  const cerrar = () => setHoja(null)

  return (
    <div className="cb-pagina">
      <Titulo pre="Oficina Central" accion={<button type="button" className="b-boton" onClick={() => setHoja({ tipo: 'bloquear' })}>Bloquear a alguien</button>}>Bloqueos</Titulo>

      <h2 className="cb-h2">Bloqueados <small>{vigentes.length}</small></h2>
      {vigentes.length ? (
        <ul className="b-cola cb-cola">
          {vigentes.map((s) => (
            <li key={s.id}>
              <span className="b-cola-nombre"><b>{s.usuario_nombre}</b><span>{s.usuario_rut} · {s.motivo}</span></span>
              <Chip tono="error">{s.etiqueta_tipo}</Chip>
              <span className="b-cola-meta"><span>{s.hasta ? `Hasta ${fecha(s.hasta)}` : 'Sin fecha'}</span>
                <button type="button" className="cb-btn cb-btn-sec" onClick={() => setHoja({ tipo: 'levantar', s })}>Desbloquear</button></span>
            </li>
          ))}
        </ul>
      ) : <Vacio>Nadie bloqueado.</Vacio>}

      {datos.incidencias.length > 0 && (
        <>
          <h2 className="cb-h2">Problemas informados</h2>
          <ul className="b-cola cb-cola">
            {datos.incidencias.map((r) => (
              <li key={r.codigo}>
                <span className="b-cola-nombre"><b>{r.titular_nombre}</b><span>{r.inmueble?.nombre} · {r.incidencia.descripcion ?? 'Sin detalle'}</span></span>
                <Chip tono="aviso">{INCIDENCIA[r.incidencia.tipo] ?? 'Problema'}{r.incidencia.recomendacion_bloqueo ? ' · pide bloqueo' : ''}</Chip>
                <span className="b-cola-meta">
                  <button type="button" className="cb-btn cb-btn-sec" onClick={() => setHoja({ tipo: 'cerrar', r })}>Cerrar</button>
                  <button type="button" className="cb-btn cb-btn-peligro" onClick={() => setHoja({ tipo: 'bloquear', previo: { nombre: r.titular_nombre, rut: r.titular_rut, codigo: r.codigo, tipo: r.incidencia.tipo === 'danos' ? 'destrozos' : r.incidencia.tipo === 'no_show' ? 'no_show' : 'normas' } })}>Bloquear</button>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <h2 className="cb-h2">Desbloqueados</h2>
      {levantadas.length ? (
        <ul className="b-cola cb-cola">
          {levantadas.map((s) => (
            <li key={s.id}>
              <span className="b-cola-nombre"><b>{s.usuario_nombre}</b><span>{s.fundamento_levantamiento ?? s.motivo}</span></span>
              <Chip tono="correcto">Desbloqueado</Chip>
              <span className="b-cola-meta">{s.etiqueta_tipo}</span>
            </li>
          ))}
        </ul>
      ) : <Vacio>Sin historial.</Vacio>}

      {hoja?.tipo === 'bloquear' && <Bloquear previo={hoja.previo} alCerrar={cerrar} />}
      {hoja?.tipo === 'levantar' && <ConFundamento titulo={`Desbloquear a ${hoja.s.usuario_nombre}`} boton="Desbloquear" alCerrar={cerrar} alConfirmar={(f) => levantarSancion(hoja.s.id, f, actor)} />}
      {hoja?.tipo === 'cerrar' && <ConFundamento titulo="Cerrar sin bloqueo" boton="Cerrar" alCerrar={cerrar} alConfirmar={(f) => resolverIncidencia(hoja.r.codigo, 'cerrada', f, actor)} />}
    </div>
  )
}
