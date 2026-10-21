/* Portada de la encargada regional: tablero (por revisar, llegan, alojados, en espera),
   solicitudes ordenadas por prioridad (salud > trabajo > descanso) con choque de fechas,
   lista de espera y llegadas/salidas por registrar. */
import { useState } from 'react'
import { getReservas } from '../../logica/api/reservas.js'
import { rangoDisponible } from '../../logica/api/inmuebles.js'
import { REGIONES } from '../../logica/fixtures/inmuebles.js'
import { useConsulta } from '../../nucleo/consulta.js'
import { cambiarRegion, useSesion } from '../../nucleo/sesion.js'
import { dia, hoyISO, motivoCorto, nombreRegion, pesos, plural, prelacion, rangoCorto } from '../../nucleo/textos.js'
import { Modulo } from '../../diseno/index.js'
import { Cargando, Chip, ChipEstado, Cifra, Titulo, Vacio } from '../../piezas/basicas.jsx'
import Gestion from './Gestion.jsx'

const TONO_MOTIVO = { medica: 'error', laboral: 'info', personal: 'correcto' }

export function SelectorRegion() {
  const { region } = useSesion()
  return (
    <label className="cb-campo cb-campo-linea">
      <span>Región</span>
      <select value={region} onChange={(e) => cambiarRegion(e.target.value)}>
        {REGIONES.map((r) => <option key={r.codigo} value={r.codigo}>{r.nombre}</option>)}
      </select>
    </label>
  )
}

function Cupo({ r }) {
  const c = rangoDisponible(r.inmueble_id, r.fecha_entrada, r.fecha_salida, { excluirCodigo: r.codigo })
  return c.libre
    ? <p className="cb-cupo" data-libre>✓ Fechas libres</p>
    : <p className="cb-cupo">⚠ {c.motivo ?? 'Choca con otra reserva'}</p>
}

function Fila({ r, children, conCupo }) {
  return (
    <li className="cb-fila" data-codigo={r.codigo}>
      <div className="cb-fila-datos">
        <p className="cb-fila-sup">
          <Chip tono={TONO_MOTIVO[r.motivo]}>{prelacion(r.motivo)}° {motivoCorto(r.motivo)}</Chip>
          {!r.titular_es_afiliado && <Chip tono="aviso">No afiliado</Chip>}
          <span className="cb-codigo-mini">{r.codigo}</span>
        </p>
        <h3>{r.inmueble?.nombre}</h3>
        <p className="cb-tenue">{rangoCorto(r.fecha_entrada, r.fecha_salida)} · {plural(r.ocupantes?.length ?? 1, 'persona', 'personas')} · {pesos(r.monto_total)}</p>
        <p className="cb-tenue">{r.titular_nombre}</p>
        {conCupo && <Cupo r={r} />}
        {r.observaciones && ['recibida', 'lista_espera'].includes(r.estado) && <p className="cb-consulta-mini">«{r.observaciones}»{r.respuesta_observacion && <> · <b>Respondida</b></>}</p>}
      </div>
      <div className="cb-fila-acciones">{children}</div>
    </li>
  )
}

export default function InicioRegional() {
  const { region, usuario } = useSesion()
  const { datos } = useConsulta(() => getReservas({ region }), [region])
  const [g, setG] = useState(null) // { accion, r }
  if (!datos) return <Cargando />
  const rs = datos.items
  const hoy = hoyISO()
  const porRevisar = rs.filter((r) => r.estado === 'recibida')
    .sort((a, b) => prelacion(a.motivo) - prelacion(b.motivo) || (a.creada_en < b.creada_en ? -1 : 1))
  const espera = rs.filter((r) => r.estado === 'lista_espera')
    .sort((a, b) => prelacion(a.motivo) - prelacion(b.motivo) || (a.creada_en < b.creada_en ? -1 : 1))
  const llegan = rs.filter((r) => r.estado === 'confirmada').sort((a, b) => (a.fecha_entrada < b.fecha_entrada ? -1 : 1))
  const alojados = rs.filter((r) => r.estado === 'en_curso').sort((a, b) => (a.fecha_salida < b.fecha_salida ? -1 : 1))
  const llegan7 = llegan.filter((r) => r.fecha_entrada <= hoyMas(hoy, 7)).length
  const abrir = (accion, r) => setG({ accion, r })

  return (
    <div className="cb-pagina">
      <Titulo pre={`Hola, ${usuario.nombre.split(' ')[0]}`} accion={<SelectorRegion />}>Región de {nombreRegion(region)}</Titulo>

      <section className="b-grilla cb-tablero cb-tablero-4" aria-label="Hoy">
        <Cifra rotulo="Por revisar" valor={porRevisar.length} frase="Solicitudes nuevas" tono={porRevisar.length ? 'aviso' : undefined} className="cb-mod-principal" />
        <Cifra rotulo="Llegan esta semana" valor={llegan7} frase={`${llegan.length} confirmadas`} retraso={90} />
        <Cifra rotulo="Alojados" valor={alojados.length} frase="Estadías en curso" retraso={180} />
        <Cifra rotulo="En espera" valor={espera.length} frase="Sin cupo aún" retraso={270} />
      </section>

      <section className="cb-bloque" aria-labelledby="cb-revisar">
        <h2 id="cb-revisar" className="cb-h2">Por revisar <small>Salud primero</small></h2>
        {porRevisar.length ? (
          <ul className="cb-filas">
            {porRevisar.map((r) => (
              <Fila key={r.codigo} r={r} conCupo>
                {r.observaciones && !r.respuesta_observacion && <button type="button" className="cb-btn cb-btn-sec" onClick={() => abrir('responder', r)}>Responder</button>}
                <button type="button" className="cb-btn cb-btn-sec cb-btn-rojo" onClick={() => abrir('rechazar', r)}>Rechazar</button>
                <button type="button" className="b-boton cb-boton-chico" onClick={() => abrir('confirmar', r)}>Confirmar</button>
              </Fila>
            ))}
          </ul>
        ) : <Vacio>Nada por revisar.</Vacio>}
      </section>

      {espera.length > 0 && (
        <section className="cb-bloque" aria-labelledby="cb-espera">
          <h2 id="cb-espera" className="cb-h2">Lista de espera</h2>
          <ul className="cb-filas">
            {espera.map((r) => (
              <Fila key={r.codigo} r={r} conCupo>
                <button type="button" className="b-boton cb-boton-chico" onClick={() => abrir('confirmar', r)}>Dar cupo</button>
              </Fila>
            ))}
          </ul>
        </section>
      )}

      <section className="b-grilla cb-dos" aria-label="Llegadas y salidas">
        <Modulo>
          <p className="b-rotulo">Llegan</p>
          <h2 className="b-titulo-mod">Registrar llegada</h2>
          {llegan.length ? (
            <ul className="cb-mini">
              {llegan.slice(0, 6).map((r) => (
                <li key={r.codigo} data-codigo={r.codigo}>
                  <span><b>{r.titular_nombre}</b><small>{r.inmueble?.nombre} · {rangoCorto(r.fecha_entrada, r.fecha_salida)}</small></span>
                  <button type="button" className="cb-btn cb-btn-sec" onClick={() => abrir('llegada', r)}>Llegó</button>
                </li>
              ))}
            </ul>
          ) : <Vacio>Nadie por llegar.</Vacio>}
        </Modulo>
        <Modulo retraso={90}>
          <p className="b-rotulo">Alojados</p>
          <h2 className="b-titulo-mod">Registrar salida</h2>
          {alojados.length ? (
            <ul className="cb-mini">
              {alojados.map((r) => (
                <li key={r.codigo} data-codigo={r.codigo}>
                  <span><b>{r.titular_nombre}</b><small>{r.inmueble?.nombre} · sale {dia(r.fecha_salida)}</small></span>
                  <button type="button" className="cb-btn cb-btn-sec" onClick={() => abrir('salida', r)}>Salió</button>
                </li>
              ))}
            </ul>
          ) : <Vacio>Nadie alojado.</Vacio>}
        </Modulo>
      </section>

      <section className="cb-bloque" aria-labelledby="cb-todas">
        <h2 id="cb-todas" className="cb-h2">Últimas de la región</h2>
        <ul className="b-cola">
          {rs.slice(0, 8).map((r) => (
            <li key={r.codigo}>
              <span className="b-cola-nombre"><b>{r.inmueble?.nombre}</b><span>{r.titular_nombre} · {rangoCorto(r.fecha_entrada, r.fecha_salida)}</span></span>
              <ChipEstado estado={r.estado} />
              <span className="b-cola-meta">{pesos(r.monto_total)}</span>
            </li>
          ))}
        </ul>
      </section>

      {g && <Gestion accion={g.accion} r={g.r} alCerrar={() => setG(null)} />}
    </div>
  )
}

function hoyMas(iso, n) {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}
