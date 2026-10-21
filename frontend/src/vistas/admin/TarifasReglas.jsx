/* Tarifas y reglas. Las reglas se leen como frases con el número editable en medio.
   Guardar pide confirmación y queda en la auditoría. */
import { useState } from 'react'
import { getTarifasGestion, guardarTarifas } from '../../logica/api/administracion.js'
import { store } from '../../logica/api/store.js'
import { useAccion, useConsulta, refrescar } from '../../nucleo/consulta.js'
import { useSesion } from '../../nucleo/sesion.js'
import { REGLAS, guardarParametros, leerParametros } from '../../nucleo/parametros.js'
import { fechaHora } from '../../nucleo/textos.js'
import Hoja from '../../piezas/Hoja.jsx'
import { Cargando, Falla, Titulo } from '../../piezas/basicas.jsx'
import { Modulo } from '../../diseno/index.js'

const FILAS = [
  ['huespedes', 'afiliado', 'Huéspedes · afiliado', 'por persona'],
  ['huespedes', 'sindicato', 'Huéspedes · sindicato', 'por persona'],
  ['huespedes', 'afiliado_medica', 'Huéspedes · por salud', 'por persona'],
  ['huespedes', 'externo', 'Huéspedes · externo', 'por persona'],
  ['veraneo', 'fija', 'Veraneo · toda la casa', 'por noche'],
]

function Reglas() {
  const { actor } = useSesion()
  const [p, setP] = useState(leerParametros)
  const [confirmar, setConfirmar] = useState(false)
  const [hecho, setHecho] = useState(false)
  const ultimo = store.auditoria.find((a) => a.accion === 'Actualización de parámetros')
  const cambiado = JSON.stringify(p) !== JSON.stringify(leerParametros())
  const malo = Object.values(p).some((v) => !Number.isFinite(v) || v < 0)
  const guardar = () => { guardarParametros(p, actor); refrescar(); setConfirmar(false); setHecho(true) }
  return (
    <Modulo className="cb-reglas">
      <p className="b-rotulo">Reglas de reserva</p>
      <ul className="cb-frases">
        {REGLAS.map((r) => (
          <li key={r.clave}>
            <span>{r.antes}</span>
            <input type="number" min="0" inputMode="numeric" value={Number.isFinite(p[r.clave]) ? p[r.clave] : ''} aria-label={`${r.antes} … ${r.despues}`} data-regla={r.clave}
              onChange={(e) => { setHecho(false); setP((x) => ({ ...x, [r.clave]: e.target.value === '' ? NaN : Number(e.target.value) })) }} />
            <span>{r.despues}</span>
          </li>
        ))}
      </ul>
      <div className="cb-panel-pie">
        <p className="cb-tenue" role="status">{hecho ? '✓ Reglas guardadas.' : ultimo ? `Último cambio: ${fechaHora(ultimo.fecha_hora)}` : 'Sin cambios.'}</p>
        <button type="button" className="b-boton" disabled={!cambiado || malo} onClick={() => setConfirmar(true)}>Guardar reglas</button>
      </div>
      {confirmar && (
        <Hoja abierta titulo="¿Guardar las reglas?" sub="Rigen desde ahora" alCerrar={() => setConfirmar(false)}
          pie={<><button type="button" className="cb-btn cb-btn-sec" onClick={() => setConfirmar(false)}>Volver</button><button type="button" className="b-boton" onClick={guardar}>Sí, guardar</button></>}>
          <p className="cb-tenue">Queda en la auditoría con su nombre.</p>
        </Hoja>
      )}
    </Modulo>
  )
}

function Tarifas() {
  const { actor } = useSesion()
  const { datos } = useConsulta(getTarifasGestion, [])
  const [t, setT] = useState(null)
  const [confirmar, setConfirmar] = useState(false)
  const [hecho, setHecho] = useState(false)
  const [correr, { ocupado, error }] = useAccion()
  if (!datos) return <Cargando />
  const actual = t ?? datos
  const poner = (grupo, cat, temp, v) => { setHecho(false); setT({ ...actual, [grupo]: { ...actual[grupo], [cat]: { ...actual[grupo][cat], [temp]: v === '' ? NaN : Number(v) } } }) }
  const malo = FILAS.some(([g, c]) => ['baja', 'alta'].some((s) => !(actual[g][c]?.[s] >= 0)))
  const guardar = async () => {
    const x = await correr(() => guardarTarifas(actual, actor))
    setConfirmar(false)
    if (x.ok) { setT(null); setHecho(true) }
  }
  return (
    <Modulo className="cb-tarifas-admin" retraso={90}>
      <p className="b-rotulo">Tarifas {actual.vigencia.desde.slice(0, 4)}</p>
      <table className="cb-tabla-tarifas cb-tabla-editable">
        <thead><tr><th scope="col"><span className="cb-oculto">Tarifa</span></th><th scope="col">Baja</th><th scope="col">Alta</th></tr></thead>
        <tbody>
          {FILAS.map(([g, c, n, por]) => (
            <tr key={`${g}-${c}`}>
              <th scope="row">{n}<small>{por}</small></th>
              {['baja', 'alta'].map((s) => (
                <td key={s}><input type="number" min="0" step="500" inputMode="numeric" value={Number.isFinite(actual[g][c]?.[s]) ? actual[g][c][s] : ''} aria-label={`${n}, temporada ${s}`} onChange={(e) => poner(g, c, s, e.target.value)} /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <Falla>{error}</Falla>
      <div className="cb-panel-pie">
        <p className="cb-tenue" role="status">{hecho ? '✓ Tarifas guardadas.' : 'Pesos chilenos.'}</p>
        <button type="button" className="b-boton" disabled={!t || malo} onClick={() => setConfirmar(true)}>Guardar tarifas</button>
      </div>
      {confirmar && (
        <Hoja abierta titulo="¿Guardar las tarifas?" sub="Solo para reservas nuevas" alCerrar={() => setConfirmar(false)}
          pie={<><button type="button" className="cb-btn cb-btn-sec" onClick={() => setConfirmar(false)}>Volver</button><button type="button" className="b-boton" aria-busy={ocupado || undefined} onClick={ocupado ? undefined : guardar}>Sí, guardar</button></>}>
          <p className="cb-tenue">Queda en la auditoría con su nombre.</p>
        </Hoja>
      )}
    </Modulo>
  )
}

export default function TarifasReglas() {
  return (
    <div className="cb-pagina">
      <Titulo pre="Administrador">Tarifas y reglas</Titulo>
      <section className="b-grilla cb-dos cb-dos-ancho">
        <Reglas />
        <Tarifas />
      </section>
    </div>
  )
}
