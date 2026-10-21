/* Reservas del país. Abre en lo pendiente (por confirmar, emergencias, lista de espera).
   Las emergencias se resuelven aquí: aprobar cobra los días de limpieza; rechazar mantiene el cobro. */
import { useState } from 'react'
import { getReservas, resolverFuerzaMayor } from '../../logica/api/reservas.js'
import { REGIONES } from '../../logica/fixtures/inmuebles.js'
import { useAccion, useConsulta } from '../../nucleo/consulta.js'
import { useSesion } from '../../nucleo/sesion.js'
import { leerParametros } from '../../nucleo/parametros.js'
import { nombreRegion, pesos, plural, rangoCorto } from '../../nucleo/textos.js'
import Hoja from '../../piezas/Hoja.jsx'
import { Campo, Cargando, ChipEstado, Falla, Titulo, Vacio } from '../../piezas/basicas.jsx'

const FILTROS = [
  ['pendientes', 'Pendientes', ['recibida', 'fuerza_mayor_pendiente', 'lista_espera']],
  ['emergencias', 'Emergencias', ['fuerza_mayor_pendiente', 'fuerza_mayor_aprobada', 'fuerza_mayor_rechazada']],
  ['confirmadas', 'Confirmadas', ['confirmada', 'en_curso']],
  ['terminadas', 'Terminadas', ['finalizada']],
  ['canceladas', 'Canceladas', ['anulada', 'rechazada']],
  ['todas', 'Todas', null],
]

function Emergencia({ r, alCerrar }) {
  const { actor } = useSesion()
  const p = leerParametros()
  const [fundamento, setFundamento] = useState('')
  const [correr, { ocupado, error }] = useAccion()
  const resolver = async (aprobar) => {
    const x = await correr(() => resolverFuerzaMayor(r.codigo, { aprobar, fundamento: fundamento.trim(), actor }))
    if (x.ok) alCerrar()
  }
  const s = r.solicitud_fuerza_mayor ?? {}
  return (
    <Hoja abierta titulo="Resolver emergencia" sub={`${r.codigo} · ${r.titular_nombre}`} alCerrar={alCerrar}
      pie={<>
        <button type="button" className="cb-btn cb-btn-sec cb-btn-rojo" disabled={!fundamento.trim()} aria-busy={ocupado || undefined} onClick={ocupado ? undefined : () => resolver(false)}>Rechazar</button>
        <button type="button" className="b-boton" disabled={!fundamento.trim()} aria-busy={ocupado || undefined} onClick={ocupado ? undefined : () => resolver(true)}>Aprobar</button>
      </>}>
      <p className="cb-consulta">«{s.motivo || 'Sin detalle'}»</p>
      <dl className="cb-resumen">
        <div><dt>Respaldo</dt><dd>{s.respaldo?.nombre ?? 'Sin archivo'}</dd></div>
        <div><dt>Casa</dt><dd>{r.inmueble?.nombre}</dd></div>
        <div><dt>Fechas</dt><dd>{rangoCorto(r.fecha_entrada, r.fecha_salida)}</dd></div>
        <div><dt>Si rechaza</dt><dd>{pesos(r.monto_total)}</dd></div>
        <div><dt>Si aprueba</dt><dd>{plural(p.cobro_fuerza_mayor_dias, 'día', 'días')} de limpieza</dd></div>
      </dl>
      <Campo etiqueta="Fundamento" como="textarea" rows={2} value={fundamento} onChange={(e) => setFundamento(e.target.value)} required />
      <Falla>{error}</Falla>
    </Hoja>
  )
}

export default function ReservasPais({ args }) {
  const [filtro, setFiltro] = useState(FILTROS.some((f) => f[0] === args[0]) ? args[0] : 'pendientes')
  const [region, setRegion] = useState('')
  const [buscar, setBuscar] = useState('')
  const [abierta, setAbierta] = useState(null)
  const { datos } = useConsulta(() => getReservas(region ? { region } : {}), [region])
  if (!datos) return <Cargando />
  const estados = FILTROS.find((f) => f[0] === filtro)[2]
  const q = buscar.trim().toLowerCase()
  const visibles = datos.items
    .filter((r) => !estados || estados.includes(r.estado))
    .filter((r) => !q || r.codigo.toLowerCase().includes(q) || r.titular_nombre.toLowerCase().includes(q) || r.inmueble?.nombre.toLowerCase().includes(q))
  const cuenta = (est) => datos.items.filter((r) => !est || est.includes(r.estado)).length

  return (
    <div className="cb-pagina">
      <Titulo pre="Todo Chile">Reservas</Titulo>
      <div className="cb-chips" role="tablist" aria-label="Filtrar">
        {FILTROS.map(([id, texto, est]) => (
          <button key={id} type="button" role="tab" aria-selected={filtro === id} className="bm-chip" onClick={() => setFiltro(id)}>{texto} <b>{cuenta(est)}</b></button>
        ))}
      </div>
      <div className="cb-barra-herr">
        <label className="cb-campo cb-campo-linea"><span>Región</span>
          <select value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="">Todas</option>
            {REGIONES.map((r) => <option key={r.codigo} value={r.codigo}>{r.nombre}</option>)}
          </select>
        </label>
        <label className="cb-campo cb-campo-linea"><span>Buscar</span><input type="search" value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Nombre, casa o código" /></label>
      </div>
      {visibles.length ? (
        <ul className="b-cola cb-cola">
          {visibles.map((r) => (
            <li key={r.codigo} data-codigo={r.codigo}>
              <span className="b-cola-nombre"><b>{r.titular_nombre}</b><span>{r.inmueble?.nombre} · {nombreRegion(r.inmueble?.region)} · {rangoCorto(r.fecha_entrada, r.fecha_salida)}</span></span>
              <ChipEstado estado={r.estado} />
              <span className="b-cola-meta">
                {pesos(r.monto_total)}
                {r.estado === 'fuerza_mayor_pendiente'
                  ? <button type="button" className="b-boton cb-boton-chico" onClick={() => setAbierta(r)}>Resolver</button>
                  : <a className="cb-enlace" href={`#reserva/${r.codigo}`}>Ver</a>}
              </span>
            </li>
          ))}
        </ul>
      ) : <Vacio>Nada en este filtro.</Vacio>}
      {abierta && <Emergencia r={abierta} alCerrar={() => setAbierta(null)} />}
    </div>
  )
}
