/* Ficha de una casa: fotos, disponibilidad (elige fechas y reserva), tarifas por temporada,
   lugares cercanos, equipamiento, opiniones y mapa. */
import { lazy, Suspense, useState } from 'react'
import { getInmueble, getTemporadas } from '../../logica/api/inmuebles.js'
import { getValoraciones } from '../../logica/api/valoraciones.js'
import { getTarifasGestion } from '../../logica/api/administracion.js'
import { etiquetaTipo } from '../../logica/fixtures/inmuebles.js'
import { fotosDe } from '../../logica/fotos.js'
import { contarNoches } from '../../logica/lib/tarifas.js'
import { useConsulta } from '../../nucleo/consulta.js'
import { useSesion } from '../../nucleo/sesion.js'
import { ir } from '../../nucleo/ruta.js'
import { dia, fecha, nombreRegion, pesos, plural, numero } from '../../nucleo/textos.js'
import { Modulo } from '../../diseno/index.js'
import Calendario from '../../piezas/Calendario.jsx'
import { Cargando, Estrellas, Vacio, Volver } from '../../piezas/basicas.jsx'

const MapaCasa = lazy(() => import('./MapaCasa.jsx'))
const CATEGORIA = { parque: 'Parque', salud: 'Salud', servicios: 'Servicios', playa: 'Playa', transporte: 'Transporte' }

function Galeria({ casa }) {
  const fotos = fotosDe(casa)
  const [i, setI] = useState(0)
  return (
    <div className="cb-galeria">
      <img className="cb-galeria-grande" src={fotos[i].ruta} alt={`${casa.nombre}, foto ${i + 1} de ${fotos.length}`} />
      {fotos.length > 1 && (
        <div className="cb-galeria-tiras" role="group" aria-label="Fotos">
          {fotos.map((f, n) => (
            <button key={f.nombre + n} type="button" aria-label={`Foto ${n + 1}`} aria-pressed={n === i} onClick={() => setI(n)}>
              <img src={f.ruta} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Tarifas({ casa, tarifas, temporadas }) {
  if (!tarifas) return null
  const filas = casa.tipo === 'veraneo'
    ? [['Toda la casa', tarifas.veraneo.fija, 'noche']]
    : [['Afiliado', tarifas.huespedes.afiliado, 'persona'], ['Por salud', tarifas.huespedes.afiliado_medica, 'persona'], ['Externo', tarifas.huespedes.externo, 'persona']]
  const altas = (temporadas ?? []).filter((t) => t.tipo === 'alta')
  return (
    <>
      <table className="cb-tabla-tarifas">
        <thead><tr><th scope="col"><span className="cb-oculto">Tarifa</span></th><th scope="col">Baja</th><th scope="col">Alta</th></tr></thead>
        <tbody>
          {filas.map(([n, v, por]) => (
            <tr key={n}><th scope="row">{n}<small>por {por}</small></th><td>{pesos(v.baja)}</td><td>{pesos(v.alta)}</td></tr>
          ))}
        </tbody>
      </table>
      {altas.length > 0 && (
        <ul className="cb-temporadas">
          {altas.map((t) => <li key={t.id}><b>Alta</b> {dia(t.desde)} – {dia(t.hasta)}</li>)}
        </ul>
      )}
    </>
  )
}

export default function Ficha({ args }) {
  const [id, entradaUrl, salidaUrl] = args
  const { esPortal } = useSesion()
  const { datos: casa, error } = useConsulta(() => getInmueble(id), [id])
  const { datos: opiniones } = useConsulta(() => getValoraciones(id), [id])
  const { datos: tarifas } = useConsulta(getTarifasGestion, [])
  const { datos: temporadas } = useConsulta(getTemporadas, [])
  const [rango, setRango] = useState(entradaUrl && salidaUrl ? { entrada: entradaUrl, salida: salidaUrl } : null)

  if (error) return <div className="cb-pagina"><Volver a="casas">Casas</Volver><Vacio>No encontramos esa casa.</Vacio></div>
  if (!casa) return <Cargando />
  const noches = rango?.salida ? contarNoches(rango.entrada, rango.salida) : 0
  const reservar = () => ir('reservar', casa.id, rango?.entrada, rango?.salida)

  return (
    <div className="cb-pagina cb-ficha">
      <Volver a="casas">Casas</Volver>
      <header className="cb-ficha-cab">
        <p className="b-hero-pre">{casa.localidad} · {nombreRegion(casa.region)}</p>
        <h1>{casa.nombre}</h1>
        <p className="cb-ficha-datos">
          <span>{etiquetaTipo(casa.tipo)}</span>
          <span>Hasta {casa.capacidad_maxima} personas</span>
          {casa.dormitorios > 0 && <span>{plural(casa.dormitorios, 'dormitorio', 'dormitorios')}</span>}
          <Estrellas valor={casa.valoracion?.promedio} total={casa.valoracion?.total} />
        </p>
      </header>

      <Galeria casa={casa} />

      <section className="b-grilla cb-ficha-grilla" aria-label="Detalle de la casa">
        <Modulo className="cb-f-disp">
          <p className="b-rotulo">Disponibilidad</p>
          <h2 className="b-titulo-mod">{esPortal ? 'Elija sus fechas' : 'Calendario'}</h2>
          <Calendario inmuebleId={casa.id} rango={rango} alElegir={esPortal ? setRango : undefined} inicio={entradaUrl} />
          {esPortal && (
            <div className="cb-eleccion">
              <p>
                {!rango ? 'Toque el día de llegada.'
                  : !rango.salida ? <>Llegada {dia(rango.entrada)}. Toque la salida.</>
                    : <><b>{dia(rango.entrada)} → {dia(rango.salida)}</b> · {plural(noches, 'noche', 'noches')}</>}
              </p>
              <button type="button" className="b-boton" onClick={reservar}>Reservar</button>
            </div>
          )}
        </Modulo>

        <Modulo className="cb-f-tarifas" retraso={90}>
          <p className="b-rotulo">Tarifas {tarifas?.vigencia ? new Date(`${tarifas.vigencia.hasta}T12:00`).getFullYear() : ''}</p>
          <h2 className="b-titulo-mod">Por temporada</h2>
          <Tarifas casa={casa} tarifas={tarifas} temporadas={temporadas?.items} />
        </Modulo>

        <Modulo className="cb-f-cerca" retraso={60}>
          <p className="b-rotulo">Cerca</p>
          <h2 className="b-titulo-mod">Lugares cercanos</h2>
          {casa.zonas_interes?.length ? (
            <ul className="cb-lista-simple">
              {casa.zonas_interes.map((z) => (
                <li key={z.nombre}><span>{z.nombre}{z.categoria && <small>{CATEGORIA[z.categoria] ?? z.categoria}</small>}</span>{z.distancia_km != null && <b>{z.distancia_km < 1 ? `${Math.round(z.distancia_km * 1000)} m` : `${numero(z.distancia_km)} km`}</b>}</li>
              ))}
            </ul>
          ) : <Vacio>Sin datos.</Vacio>}
        </Modulo>

        <Modulo className="cb-f-casa" retraso={120}>
          <p className="b-rotulo">La casa</p>
          <p className="b-texto cb-descripcion">{casa.descripcion}</p>
          <ul className="cb-etiquetas">{(casa.equipamiento ?? []).map((e) => <li key={e}>{e}</li>)}</ul>
        </Modulo>

        <Modulo className="cb-f-opiniones" retraso={90}>
          <p className="b-rotulo">Opiniones</p>
          {opiniones?.resumen?.promedio ? <p className="b-grande">{opiniones.resumen.promedio.toLocaleString('es-CL', { minimumFractionDigits: 1 })}<small> / 5</small></p> : null}
          {opiniones?.items?.length ? (
            <ul className="cb-opiniones">
              {opiniones.items.slice(0, 3).map((o) => (
                <li key={o.id}><p>{'★'.repeat(o.estrellas)}<span className="cb-tenue">{'★'.repeat(5 - o.estrellas)}</span></p>{o.comentario && <q>{o.comentario}</q>}<small>{o.autor.split(' ')[0]} · {fecha(o.fecha)}</small></li>
              ))}
            </ul>
          ) : <p className="b-texto">Aún sin opiniones.</p>}
        </Modulo>

        <Modulo className="cb-f-mapa" retraso={150}>
          <p className="b-rotulo">Ubicación</p>
          <p className="b-texto">{casa.direccion}</p>
          <Suspense fallback={<div className="cb-mapa" />}>
            <MapaCasa lat={casa.lat} lng={casa.lng} nombre={casa.nombre} />
          </Suspense>
        </Modulo>
      </section>

      {esPortal && (
        <div className="cb-barra-accion">
          <span>{rango?.salida ? `${dia(rango.entrada)} → ${dia(rango.salida)}` : 'Elija sus fechas'}</span>
          <button type="button" className="b-boton" onClick={reservar}>Reservar</button>
        </div>
      )}
    </div>
  )
}
