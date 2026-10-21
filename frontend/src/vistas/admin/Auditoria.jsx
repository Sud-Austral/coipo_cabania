/* Auditoría: quién hizo qué y cuándo. Buscar y filtrar por perfil. */
import { useState } from 'react'
import { getAuditoria } from '../../logica/api/gestion.js'
import { useConsulta } from '../../nucleo/consulta.js'
import { fechaHora } from '../../nucleo/textos.js'
import { Cargando, Titulo, Vacio } from '../../piezas/basicas.jsx'

const POR_PAGINA = 40

export default function Auditoria() {
  const { datos } = useConsulta(getAuditoria, [])
  const [buscar, setBuscar] = useState('')
  const [perfil, setPerfil] = useState('')
  const [n, setN] = useState(POR_PAGINA)
  if (!datos) return <Cargando />
  const perfiles = [...new Set(datos.items.map((a) => a.perfil))].sort()
  const q = buscar.trim().toLowerCase()
  const visibles = datos.items
    .filter((a) => !perfil || a.perfil === perfil)
    .filter((a) => !q || `${a.usuario} ${a.accion} ${a.entidad} ${a.detalle}`.toLowerCase().includes(q))
  return (
    <div className="cb-pagina">
      <Titulo pre="Administrador">Auditoría</Titulo>
      <div className="cb-barra-herr">
        <label className="cb-campo cb-campo-linea"><span>Buscar</span><input type="search" value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Nombre, acción o código" /></label>
        <label className="cb-campo cb-campo-linea"><span>Perfil</span>
          <select value={perfil} onChange={(e) => setPerfil(e.target.value)}>
            <option value="">Todos</option>
            {perfiles.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
      </div>
      {visibles.length ? (
        <>
          <ol className="b-cola cb-cola cb-auditoria">
            {visibles.slice(0, n).map((a) => (
              <li key={a.id}>
                <span className="b-cola-nombre"><b>{a.accion}</b><span>{a.entidad} · {a.usuario} ({a.perfil})</span></span>
                <span className="cb-tenue cb-detalle-audit" title={a.detalle}>{a.detalle?.length > 90 ? `${a.detalle.slice(0, 90)}…` : a.detalle}</span>
                <span className="b-cola-meta">{fechaHora(a.fecha_hora)}</span>
              </li>
            ))}
          </ol>
          {visibles.length > n && <p className="cb-centro"><button type="button" className="cb-btn cb-btn-sec" onClick={() => setN((x) => x + POR_PAGINA)}>Ver más</button></p>}
        </>
      ) : <Vacio>Sin registros.</Vacio>}
    </div>
  )
}
