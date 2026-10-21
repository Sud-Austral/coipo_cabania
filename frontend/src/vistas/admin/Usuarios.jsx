/* Usuarios y afiliados: usuarios del sistema (editar, activar/desactivar, nuevo)
   y carga del CSV de afiliados (RUT y nombre). */
import { useState } from 'react'
import { cambiarEstadoUsuario, getUsuariosGestion, guardarUsuario, importarNomina } from '../../logica/api/administracion.js'
import { getCargaNomina } from '../../logica/api/gestion.js'
import { ROLES } from '../../logica/fixtures/usuarios.js'
import { REGIONES } from '../../logica/fixtures/inmuebles.js'
import { formatearRut, rutValido } from '../../logica/lib/rut.js'
import { useAccion, useConsulta } from '../../nucleo/consulta.js'
import { useSesion } from '../../nucleo/sesion.js'
import { fecha, nombreRegion, numero } from '../../nucleo/textos.js'
import Hoja from '../../piezas/Hoja.jsx'
import { Campo, Cargando, Chip, Falla, Titulo } from '../../piezas/basicas.jsx'
import { Modulo } from '../../diseno/index.js'

const ETIQUETA_ROL = Object.fromEntries(ROLES.map((r) => [r.valor, r.etiqueta]))

/** CSV de afiliados: columnas rut y nombre, separadas por ; o ,. La primera fila puede ser encabezado. */
export function leerCSV(texto) {
  const lineas = texto.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim())
  if (!lineas.length) return []
  const sep = lineas[0].includes(';') ? ';' : ','
  const celdas = (l) => l.split(sep).map((c) => c.trim().replace(/^"|"$/g, ''))
  const cab = celdas(lineas[0]).map((c) => c.toLowerCase())
  const conCab = cab.includes('rut')
  const iRut = conCab ? cab.indexOf('rut') : 0
  const iNombre = conCab ? Math.max(0, cab.indexOf('nombre')) : 1
  return (conCab ? lineas.slice(1) : lineas).map((l) => { const c = celdas(l); return { rut: c[iRut] ?? '', nombre: c[iNombre] ?? '' } })
}

function Editar({ u, alCerrar }) {
  const { actor } = useSesion()
  const [x, setX] = useState(u ?? { nombre: '', rut: '', correo: '', rol: 'afiliado', region: '13', afiliado_vigente: true })
  const [correr, { ocupado, error }] = useAccion()
  const cambiar = (k) => (e) => setX((v) => ({ ...v, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const rutMalo = x.rut && !rutValido(x.rut)
  const listo = x.nombre.trim() && x.rut && !rutMalo && x.correo.includes('@')
  const guardar = async () => { const r = await correr(() => guardarUsuario({ ...x, nombre: x.nombre.trim() }, actor)); if (r.ok) alCerrar() }
  return (
    <Hoja abierta titulo={u ? 'Editar usuario' : 'Nuevo usuario'} alCerrar={alCerrar}
      pie={<><button type="button" className="cb-btn cb-btn-sec" onClick={alCerrar}>Volver</button>
        <button type="button" className="b-boton" disabled={!listo} aria-busy={ocupado || undefined} onClick={ocupado ? undefined : guardar}>Guardar</button></>}>
      <Campo etiqueta="Nombre" value={x.nombre} onChange={cambiar('nombre')} />
      <Campo etiqueta="RUT" value={x.rut} onChange={cambiar('rut')} onBlur={(e) => setX((v) => ({ ...v, rut: formatearRut(e.target.value) }))} error={rutMalo ? 'RUT no válido' : null} />
      <Campo etiqueta="Correo" type="email" value={x.correo} onChange={cambiar('correo')} />
      <div className="cb-dos-campos">
        <Campo etiqueta="Perfil" como="select" value={x.rol} onChange={cambiar('rol')}>{ROLES.map((r) => <option key={r.valor} value={r.valor}>{r.etiqueta}</option>)}</Campo>
        <Campo etiqueta="Región" como="select" value={x.region} onChange={cambiar('region')}>{REGIONES.map((r) => <option key={r.codigo} value={r.codigo}>{r.nombre}</option>)}</Campo>
      </div>
      <label className="cb-casilla"><input type="checkbox" checked={x.afiliado_vigente !== false} onChange={cambiar('afiliado_vigente')} />Afiliado vigente</label>
      <Falla>{error}</Falla>
    </Hoja>
  )
}

function CargarCSV() {
  const { actor } = useSesion()
  const { datos: ultima } = useConsulta(getCargaNomina, [])
  const [filas, setFilas] = useState(null)
  const [nombre, setNombre] = useState('')
  const [resultado, setResultado] = useState(null)
  const [correr, { ocupado, error }] = useAccion()
  const elegir = async (f) => {
    setResultado(null)
    if (!f) { setFilas(null); return }
    setNombre(f.name)
    setFilas(leerCSV(await f.text()))
  }
  const cargar = async () => { const r = await correr(() => importarNomina(filas, actor)); if (r.ok) { setResultado(r.r); setFilas(null) } }
  return (
    <Modulo className="cb-csv" retraso={90}>
      <p className="b-rotulo">Afiliados</p>
      <h2 className="b-titulo-mod">Cargar CSV</h2>
      <p className="b-texto">Columnas: rut y nombre.</p>
      <Campo etiqueta="Archivo" type="file" accept=".csv,text/csv" onChange={(e) => elegir(e.target.files?.[0])} />
      {filas && (
        <div className="cb-panel-pie">
          <p className="cb-tenue">{nombre}: {numero(filas.length)} filas</p>
          <button type="button" className="b-boton" disabled={!filas.length} aria-busy={ocupado || undefined} onClick={ocupado ? undefined : cargar}>Cargar</button>
        </div>
      )}
      {resultado && (
        <div className="cb-resultado" role="status">
          <p><Chip tono="correcto">{numero(resultado.validas)} válidas</Chip> {resultado.errores.length > 0 && <Chip tono="error">{resultado.errores.length} con error</Chip>}</p>
          {resultado.errores.length > 0 && <ul className="cb-errores">{resultado.errores.slice(0, 8).map((e) => <li key={e.fila}>Fila {e.fila}: {e.error}</li>)}</ul>}
        </div>
      )}
      <Falla>{error}</Falla>
      {ultima && !resultado && <p className="cb-tenue">Última carga: {fecha(ultima.fecha)} · {numero(ultima.afiliados_vigentes)} vigentes</p>}
    </Modulo>
  )
}

export default function Usuarios() {
  const { actor } = useSesion()
  const { datos } = useConsulta(getUsuariosGestion, [])
  const [hoja, setHoja] = useState(null)
  const [correr, { error }] = useAccion()
  if (!datos) return <Cargando />
  return (
    <div className="cb-pagina">
      <Titulo pre="Administrador" accion={<button type="button" className="b-boton" onClick={() => setHoja({ u: null })}>Nuevo usuario</button>}>Usuarios y afiliados</Titulo>
      <section className="b-grilla cb-dos cb-dos-ancho">
        <Modulo className="cb-usuarios">
          <p className="b-rotulo">Usuarios</p>
          <Falla>{error}</Falla>
          <ul className="cb-mini">
            {datos.items.map((u) => (
              <li key={u.id}>
                <span><b>{u.nombre}</b><small>{ETIQUETA_ROL[u.rol] ?? u.rol} · {nombreRegion(u.region)} · {u.activo === false ? 'Inactivo' : 'Activo'}</small></span>
                <span className="cb-grupo">
                  <button type="button" className="cb-btn cb-btn-sec" onClick={() => setHoja({ u })}>Editar</button>
                  <button type="button" className="cb-btn cb-btn-sec" onClick={() => correr(() => cambiarEstadoUsuario(u.id, u.activo === false, actor))}>{u.activo === false ? 'Activar' : 'Desactivar'}</button>
                </span>
              </li>
            ))}
          </ul>
        </Modulo>
        <CargarCSV />
      </section>
      {hoja && <Editar u={hoja.u} alCerrar={() => setHoja(null)} />}
    </div>
  )
}
