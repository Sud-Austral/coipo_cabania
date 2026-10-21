/* Inmuebles: casas (editar, activar/desactivar, nueva), temporadas y cierres de fechas. */
import { useState } from 'react'
import { cambiarEstadoInmueble, crearInmueble, getInmueblesAdmin } from '../../logica/api/administracion.js'
import { actualizarInmueble, crearBloqueo, eliminarBloqueo, getBloqueos } from '../../logica/api/inmuebles.js'
import { crearTemporada, getTemporadasGestion } from '../../logica/api/gestion.js'
import { REGIONES, TIPOS_INMUEBLE, etiquetaTipo } from '../../logica/fixtures/inmuebles.js'
import { useAccion, useConsulta } from '../../nucleo/consulta.js'
import { useSesion } from '../../nucleo/sesion.js'
import { fecha, hoyISO, nombreRegion } from '../../nucleo/textos.js'
import Hoja from '../../piezas/Hoja.jsx'
import { Campo, Cargando, Chip, Falla, Titulo, Vacio } from '../../piezas/basicas.jsx'

const ORIGEN = { temporada: 'Temporada', mantencion: 'Mantención', institucional: 'Uso institucional' }

function EditarCasa({ casa, alCerrar }) {
  const { actor } = useSesion()
  const [c, setC] = useState(casa ?? { nombre: '', tipo: 'huespedes', region: '05', localidad: '', direccion: '', capacidad_maxima: 4, dormitorios: 2, descripcion: '', lat: -33.45, lng: -70.66 })
  const [correr, { ocupado, error }] = useAccion()
  const cambiar = (k) => (e) => setC((x) => ({ ...x, [k]: e.target.value }))
  const listo = c.nombre.trim() && c.localidad.trim() && Number(c.capacidad_maxima) > 0
  const guardar = async () => {
    const datos = { nombre: c.nombre.trim(), tipo: c.tipo, region: c.region, localidad: c.localidad.trim(), direccion: c.direccion, capacidad_maxima: Number(c.capacidad_maxima), dormitorios: Number(c.dormitorios), descripcion: c.descripcion }
    const x = await correr(() => (casa ? actualizarInmueble(casa.id, datos, actor) : crearInmueble({ ...datos, lat: c.lat, lng: c.lng }, actor)))
    if (x.ok) alCerrar()
  }
  return (
    <Hoja abierta titulo={casa ? 'Editar casa' : 'Nueva casa'} alCerrar={alCerrar}
      pie={<><button type="button" className="cb-btn cb-btn-sec" onClick={alCerrar}>Volver</button>
        <button type="button" className="b-boton" disabled={!listo} aria-busy={ocupado || undefined} onClick={ocupado ? undefined : guardar}>Guardar</button></>}>
      <Campo etiqueta="Nombre" value={c.nombre} onChange={cambiar('nombre')} />
      <div className="cb-dos-campos">
        <Campo etiqueta="Tipo" como="select" value={c.tipo} onChange={cambiar('tipo')}>{TIPOS_INMUEBLE.map((t) => <option key={t.valor} value={t.valor}>{t.etiqueta}</option>)}</Campo>
        <Campo etiqueta="Región" como="select" value={c.region} onChange={cambiar('region')}>{REGIONES.map((r) => <option key={r.codigo} value={r.codigo}>{r.nombre}</option>)}</Campo>
      </div>
      <Campo etiqueta="Localidad" value={c.localidad} onChange={cambiar('localidad')} />
      <div className="cb-dos-campos">
        <Campo etiqueta="Personas" type="number" min="1" value={c.capacidad_maxima} onChange={cambiar('capacidad_maxima')} />
        <Campo etiqueta="Dormitorios" type="number" min="0" value={c.dormitorios} onChange={cambiar('dormitorios')} />
      </div>
      <Campo etiqueta="Descripción" como="textarea" rows={3} value={c.descripcion} onChange={cambiar('descripcion')} />
      <Falla>{error}</Falla>
    </Hoja>
  )
}

function NuevaTemporada({ alCerrar }) {
  const { actor } = useSesion()
  const [t, setT] = useState({ nombre: '', tipo: 'alta', desde: hoyISO(), hasta: hoyISO(), dias_maximos_por_afiliado: '', observaciones: '' })
  const [correr, { ocupado, error }] = useAccion()
  const cambiar = (k) => (e) => setT((x) => ({ ...x, [k]: e.target.value }))
  const listo = t.nombre.trim() && t.hasta >= t.desde
  const guardar = async () => {
    const x = await correr(() => crearTemporada({ ...t, nombre: t.nombre.trim(), dias_maximos_por_afiliado: t.dias_maximos_por_afiliado ? Number(t.dias_maximos_por_afiliado) : null }, actor))
    if (x.ok) alCerrar()
  }
  return (
    <Hoja abierta titulo="Nueva temporada" alCerrar={alCerrar}
      pie={<><button type="button" className="cb-btn cb-btn-sec" onClick={alCerrar}>Volver</button>
        <button type="button" className="b-boton" disabled={!listo} aria-busy={ocupado || undefined} onClick={ocupado ? undefined : guardar}>Guardar</button></>}>
      <Campo etiqueta="Nombre" value={t.nombre} onChange={cambiar('nombre')} placeholder="Ej.: Semana Santa 2027" />
      <div className="cb-segmento" role="radiogroup" aria-label="Tipo">
        <button type="button" role="radio" aria-checked={t.tipo === 'alta'} onClick={() => setT((x) => ({ ...x, tipo: 'alta' }))}>Alta</button>
        <button type="button" role="radio" aria-checked={t.tipo === 'baja'} onClick={() => setT((x) => ({ ...x, tipo: 'baja' }))}>Baja</button>
      </div>
      <div className="cb-dos-campos">
        <Campo etiqueta="Desde" type="date" value={t.desde} onChange={cambiar('desde')} />
        <Campo etiqueta="Hasta" type="date" value={t.hasta} min={t.desde} onChange={cambiar('hasta')} />
      </div>
      <Campo etiqueta="Máximo de días por afiliado (opcional)" type="number" min="1" value={t.dias_maximos_por_afiliado} onChange={cambiar('dias_maximos_por_afiliado')} />
      <Falla>{error}</Falla>
    </Hoja>
  )
}

function NuevoCierre({ casas, alCerrar }) {
  const { actor } = useSesion()
  const [b, setB] = useState({ inmueble_id: '', desde: hoyISO(), hasta: hoyISO(), origen: 'temporada', motivo: '' })
  const [correr, { ocupado, error }] = useAccion()
  const cambiar = (k) => (e) => setB((x) => ({ ...x, [k]: e.target.value }))
  const guardar = async () => {
    const x = await correr(() => crearBloqueo({ ...b, inmueble_id: b.inmueble_id || null, motivo: b.motivo.trim() }, actor))
    if (x.ok) alCerrar()
  }
  return (
    <Hoja abierta titulo="Cerrar fechas" alCerrar={alCerrar}
      pie={<><button type="button" className="cb-btn cb-btn-sec" onClick={alCerrar}>Volver</button>
        <button type="button" className="b-boton" disabled={!b.motivo.trim() || b.hasta < b.desde} aria-busy={ocupado || undefined} onClick={ocupado ? undefined : guardar}>Cerrar fechas</button></>}>
      <Campo etiqueta="Dónde" como="select" value={b.inmueble_id} onChange={cambiar('inmueble_id')}>
        <option value="">Toda la red</option>
        {casas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
      </Campo>
      <div className="cb-dos-campos">
        <Campo etiqueta="Desde" type="date" value={b.desde} onChange={cambiar('desde')} />
        <Campo etiqueta="Hasta" type="date" value={b.hasta} min={b.desde} onChange={cambiar('hasta')} />
      </div>
      <Campo etiqueta="Por qué" como="select" value={b.origen} onChange={cambiar('origen')}>
        {Object.entries(ORIGEN).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </Campo>
      <Campo etiqueta="Detalle" value={b.motivo} onChange={cambiar('motivo')} />
      <Falla>{error}</Falla>
    </Hoja>
  )
}

export default function Inmuebles() {
  const { actor } = useSesion()
  const [pestana, setPestana] = useState('casas')
  const [hoja, setHoja] = useState(null)
  const [correr, { error }] = useAccion()
  const { datos } = useConsulta(async () => {
    const [c, t, b] = await Promise.all([getInmueblesAdmin(), getTemporadasGestion(), getBloqueos()])
    return { casas: c.items, temporadas: t.items, bloqueos: b.items }
  }, [])
  if (!datos) return <Cargando />
  const cerrar = () => setHoja(null)
  const nombreCasa = (id) => datos.casas.find((c) => c.id === id)?.nombre ?? 'Toda la red'
  const NUEVO = { casas: ['Nueva casa', 'casa'], temporadas: ['Nueva temporada', 'temporada'], cierres: ['Cerrar fechas', 'cierre'] }

  return (
    <div className="cb-pagina">
      <Titulo pre="Administrador" accion={<button type="button" className="b-boton" onClick={() => setHoja({ tipo: NUEVO[pestana][1] })}>{NUEVO[pestana][0]}</button>}>Inmuebles</Titulo>
      <div className="cb-segmento cb-pestanas" role="tablist" aria-label="Inmuebles">
        {[['casas', 'Casas'], ['temporadas', 'Temporadas'], ['cierres', 'Cierres']].map(([id, t]) => (
          <button key={id} type="button" role="tab" aria-selected={pestana === id} onClick={() => setPestana(id)}>{t}</button>
        ))}
      </div>
      <Falla>{error}</Falla>

      {pestana === 'casas' && (
        <ul className="b-cola cb-cola">
          {datos.casas.map((c) => (
            <li key={c.id}>
              <span className="b-cola-nombre"><b>{c.nombre}</b><span>{etiquetaTipo(c.tipo)} · {nombreRegion(c.region)} · {c.capacidad_maxima} personas</span></span>
              {c.activo === false ? <Chip tono="error">Inactiva</Chip> : <Chip tono="correcto">Activa</Chip>}
              <span className="b-cola-meta">
                <button type="button" className="cb-btn cb-btn-sec" onClick={() => setHoja({ tipo: 'casa', casa: c })}>Editar</button>
                <button type="button" className="cb-btn cb-btn-sec" onClick={() => correr(() => cambiarEstadoInmueble(c.id, c.activo === false, actor))}>{c.activo === false ? 'Activar' : 'Desactivar'}</button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {pestana === 'temporadas' && (
        <ul className="b-cola cb-cola">
          {datos.temporadas.map((t) => (
            <li key={t.id}>
              <span className="b-cola-nombre"><b>{t.nombre}</b><span>{fecha(t.desde)} – {fecha(t.hasta)}{t.dias_maximos_por_afiliado ? ` · máx. ${t.dias_maximos_por_afiliado} días` : ''}</span></span>
              <Chip tono={t.tipo === 'alta' ? 'aviso' : 'info'}>{t.tipo === 'alta' ? 'Alta' : 'Baja'}</Chip>
              <span className="b-cola-meta" />
            </li>
          ))}
        </ul>
      )}

      {pestana === 'cierres' && (datos.bloqueos.length ? (
        <ul className="b-cola cb-cola">
          {datos.bloqueos.map((b) => (
            <li key={b.id}>
              <span className="b-cola-nombre"><b>{nombreCasa(b.inmueble_id)}</b><span>{b.motivo}</span></span>
              <Chip tono="aviso">{ORIGEN[b.origen] ?? b.origen}</Chip>
              <span className="b-cola-meta"><span>{fecha(b.desde)} – {fecha(b.hasta)}</span>
                <button type="button" className="cb-btn cb-btn-sec" onClick={() => correr(() => eliminarBloqueo(b.id, actor))}>Quitar</button></span>
            </li>
          ))}
        </ul>
      ) : <Vacio>Sin cierres.</Vacio>)}

      {hoja?.tipo === 'casa' && <EditarCasa casa={hoja.casa} alCerrar={cerrar} />}
      {hoja?.tipo === 'temporada' && <NuevaTemporada alCerrar={cerrar} />}
      {hoja?.tipo === 'cierre' && <NuevoCierre casas={datos.casas} alCerrar={cerrar} />}
    </div>
  )
}
