/* Catálogo: hero corto con 4 filtros (llegada, salida, región, personas) + «Más filtros»,
   tablero del afiliado (próxima estadía, por confirmar, por pagar) y la grilla de casas. */
import { useEffect, useMemo, useState } from 'react'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { getInmuebles } from '../../logica/api/inmuebles.js'
import { getReservas } from '../../logica/api/reservas.js'
import { getTarifasGestion } from '../../logica/api/administracion.js'
import { REGIONES, TIPOS_INMUEBLE } from '../../logica/fixtures/inmuebles.js'
import { fotosDe } from '../../logica/fotos.js'
import { useConsulta } from '../../nucleo/consulta.js'
import { useSesion } from '../../nucleo/sesion.js'
import { hoyISO, nombreRegion, pesos, dia } from '../../nucleo/textos.js'
import { porPagar } from '../../nucleo/pagos.js'
import { useEnVista } from '../../diseno/index.js'
import { Cargando, Chip, Cifra, Estrellas, Vacio } from '../../piezas/basicas.jsx'

const CLAVE = 'cabanas_v2_filtros'
const INICIAL = { llegada: '', salida: '', region: '', personas: '1', tipo: '', soloLibres: false }
const leerFiltros = () => { try { return { ...INICIAL, ...JSON.parse(sessionStorage.getItem(CLAVE)) } } catch { return INICIAL } }

/** Precio desde: temporada baja, tarifa del perfil. */
export function precioDesde(casa, tarifas, afiliado) {
  if (!tarifas) return null
  if (casa.tipo === 'veraneo') return { valor: tarifas.veraneo.fija.baja, por: 'noche' }
  return { valor: (afiliado ? tarifas.huespedes.afiliado : tarifas.huespedes.externo).baja, por: 'persona' }
}

function Tablero({ usuario }) {
  const { datos } = useConsulta(() => getReservas({ usuario_id: usuario.id }), [usuario.id])
  if (!datos) return null
  const hoy = hoyISO()
  const proxima = datos.items
    .filter((r) => ['recibida', 'confirmada'].includes(r.estado) && r.fecha_entrada >= hoy)
    .sort((a, b) => (a.fecha_entrada < b.fecha_entrada ? -1 : 1))[0]
  const porConfirmar = datos.items.filter((r) => r.estado === 'recibida').length
  const pagar = datos.items.filter(porPagar).length
  const faltan = proxima ? differenceInCalendarDays(parseISO(proxima.fecha_entrada), new Date()) : 0
  return (
    <section className="b-grilla cb-tablero cb-tablero-3" aria-label="Lo suyo hoy">
      {proxima
        ? <Cifra rotulo="Próxima estadía" valor={faltan} frase={`días · ${proxima.inmueble?.nombre?.replace(/^Casa de (Huéspedes|Veraneo) /, '')} · ${dia(proxima.fecha_entrada)}`} a="mis-reservas" />
        : <Cifra rotulo="Próxima estadía" valor={0} frase="Sin viajes por ahora" />}
      <Cifra rotulo="Por confirmar" valor={porConfirmar} frase="Solicitudes enviadas" a="mis-reservas" retraso={90} tono={porConfirmar ? 'aviso' : undefined} />
      <Cifra rotulo="Por pagar" valor={pagar} frase={pagar ? 'Elija cómo pagar' : 'Todo al día'} a="mis-reservas" retraso={180} tono={pagar ? 'aviso' : undefined} />
    </section>
  )
}

export default function Catalogo() {
  const { usuario, esPortal, esAfiliado, rol } = useSesion()
  const [f, setF] = useState(leerFiltros)
  const [mas, setMas] = useState(Boolean(f.tipo || f.soloLibres))
  const [heroRef, heroV] = useEnVista(0.1)
  useEffect(() => { try { sessionStorage.setItem(CLAVE, JSON.stringify(f)) } catch { /* sin persistencia */ } }, [f])
  const cambiar = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const fechasMal = f.llegada && f.salida && f.salida <= f.llegada
  const conFechas = f.llegada && f.salida && !fechasMal
  const { datos, cargando } = useConsulta(() => getInmuebles({
    region: f.region || undefined,
    tipo: f.tipo || undefined,
    capacidad_min: Number(f.personas) > 1 ? f.personas : undefined,
    fecha_entrada: conFechas ? f.llegada : undefined,
    fecha_salida: conFechas ? f.salida : undefined,
  }), [f.region, f.tipo, f.personas, conFechas, f.llegada, f.salida])
  const { datos: tarifas } = useConsulta(getTarifasGestion, [])

  const casas = useMemo(() => {
    const items = datos?.items ?? []
    const filtradas = conFechas && f.soloLibres ? items.filter((c) => c.disponibilidad_rango?.libre) : items
    // De norte a sur, como la red.
    const orden = REGIONES.map((r) => r.codigo)
    return [...filtradas].sort((a, b) => orden.indexOf(a.region) - orden.indexOf(b.region))
  }, [datos, conFechas, f.soloLibres])
  const libres = casas.filter((c) => c.disponibilidad_rango?.libre).length
  const sufijo = conFechas ? `/${f.llegada}/${f.salida}` : ''
  const limpiar = () => setF(INICIAL)
  const hayFiltros = JSON.stringify(f) !== JSON.stringify(INICIAL)

  return (
    <>
      <section className="b-hero cb-hero" ref={heroRef} data-visto={heroV || undefined}>
        <div className="b-aurora" aria-hidden="true" />
        <p className="b-hero-pre">{rol === 'no_afiliado' ? 'Casas de Bienestar CONAF' : `Hola, ${usuario?.nombre?.split(' ')[0] ?? ''}`}</p>
        <h1>¿Dónde quiere<br /><span>descansar?</span></h1>
        <form className="cb-filtros b-vidrio" role="search" onSubmit={(e) => e.preventDefault()} aria-label="Buscar casa">
          <label className="cb-campo"><span>Llegada</span><input type="date" value={f.llegada} min={hoyISO()} onChange={cambiar('llegada')} /></label>
          <label className="cb-campo"><span>Salida</span><input type="date" value={f.salida} min={f.llegada || hoyISO()} onChange={cambiar('salida')} aria-invalid={fechasMal || undefined} /></label>
          <label className="cb-campo"><span>Región</span>
            <select value={f.region} onChange={cambiar('region')}>
              <option value="">Todo Chile</option>
              {REGIONES.map((r) => <option key={r.codigo} value={r.codigo}>{r.nombre}</option>)}
            </select>
          </label>
          <label className="cb-campo"><span>Personas</span>
            <select value={f.personas} onChange={cambiar('personas')}>
              {Array.from({ length: 10 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
            </select>
          </label>
          <button type="button" className="cb-btn cb-btn-sec cb-mas" aria-expanded={mas} onClick={() => setMas((m) => !m)}>Más filtros</button>
          {mas && (
            <div className="cb-filtros-mas">
              <label className="cb-campo"><span>Tipo de casa</span>
                <select value={f.tipo} onChange={cambiar('tipo')}>
                  <option value="">Todas</option>
                  {TIPOS_INMUEBLE.map((t) => <option key={t.valor} value={t.valor}>{t.etiqueta}</option>)}
                </select>
              </label>
              <label className="cb-casilla"><input type="checkbox" checked={f.soloLibres} onChange={cambiar('soloLibres')} disabled={!conFechas} />Solo libres en mis fechas</label>
              {hayFiltros && <button type="button" className="cb-enlace" onClick={limpiar}>Limpiar filtros</button>}
            </div>
          )}
          {fechasMal && <p className="cb-error cb-filtros-error" role="alert">La salida va después de la llegada.</p>}
        </form>
      </section>

      {esPortal && usuario && <Tablero usuario={usuario} />}

      <section className="cb-seccion" aria-labelledby="cb-casas-titulo">
        <div className="cb-seccion-cab">
          <h2 id="cb-casas-titulo">{casas.length} casas{f.region ? ` en ${nombreRegion(f.region)}` : ''}</h2>
          {conFechas && <p className="cb-tenue">{libres} libres del {dia(f.llegada)} al {dia(f.salida)}</p>}
        </div>
        {cargando && !datos ? <Cargando /> : casas.length === 0 ? <Vacio>No hay casas con esos filtros.</Vacio> : (
          <ul className="cb-casas">
            {casas.map((c) => {
              const p = precioDesde(c, tarifas, esAfiliado || !esPortal)
              const disp = c.disponibilidad_rango
              return (
                <li key={c.id}>
                  <a className="cb-casa" href={`#casa/${c.id}${sufijo}`}>
                    <img src={fotosDe(c)[0].ruta} alt="" loading="lazy" width="400" height="260" />
                    <div className="cb-casa-texto">
                      <p className="cb-casa-lugar">{c.localidad} · {nombreRegion(c.region)}</p>
                      <h3>{c.nombre}</h3>
                      <p className="cb-casa-datos"><span>Hasta {c.capacidad_maxima} personas</span><Estrellas valor={c.valoracion?.promedio} total={c.valoracion?.total} /></p>
                      <div className="cb-casa-pie">
                        {p && <p className="cb-precio"><b>{pesos(p.valor)}</b> / {p.por}</p>}
                        {disp && (disp.libre ? <Chip tono="correcto">Libre</Chip> : <Chip tono="error">Ocupada</Chip>)}
                      </div>
                    </div>
                  </a>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </>
  )
}
