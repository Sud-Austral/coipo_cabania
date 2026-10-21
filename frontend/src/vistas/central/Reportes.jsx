/* Reportes del uso de la red (getReportes): cifras, noches por región, motivos y casas más usadas. */
import { getReportes } from '../../logica/api/gestion.js'
import { useConsulta } from '../../nucleo/consulta.js'
import { Anillo, Contador, Modulo } from '../../diseno/index.js'
import { Cargando, Cifra, Titulo } from '../../piezas/basicas.jsx'

const COLOR_MOTIVO = { medica: 'var(--b-rojo)', laboral: 'var(--b-azul)', personal: 'var(--b-verde)' }
const CORTO = { medica: 'Salud', laboral: 'Trabajo', personal: 'Descanso' }

export default function Reportes() {
  const { datos: d } = useConsulta(getReportes, [])
  if (!d) return <Cargando />
  const t = d.totales
  const max = Math.max(1, ...d.por_region.map((r) => r.noches))
  const totalMotivos = d.por_motivo.reduce((s, m) => s + m.reservas, 0)
  const partes = d.por_motivo.map((m) => [m.nombre, m.reservas, COLOR_MOTIVO[m.motivo]])
  const salud = d.por_motivo.find((m) => m.motivo === 'medica')?.reservas ?? 0

  return (
    <div className="cb-pagina">
      <Titulo pre="Uso de la red">Reportes</Titulo>
      <section className="b-grilla cb-tablero cb-tablero-4" aria-label="Totales">
        <Cifra rotulo="Reservas" valor={t.reservas} frase={`${t.pendientes} por confirmar`} />
        <Cifra rotulo="Noches usadas" valor={t.noches} frase="Confirmadas y terminadas" retraso={90} />
        <Cifra rotulo="Valor de estadías" valor={t.ingresos} pesos frase="Cobrado o por cobrar" retraso={180} />
        <Cifra rotulo="Canceladas" valor={t.anuladas} frase={`${t.lista_espera} en espera`} retraso={270} />
      </section>
      <section className="b-grilla cb-reportes" aria-label="Detalle">
        <Modulo className="cb-r-regiones">{(v) => (
          <>
            <p className="b-rotulo">De norte a sur</p>
            <h2 className="b-titulo-mod">Noches por región</h2>
            <ol className="b-barras">
              {d.por_region.map((r, i) => (
                <li key={r.region} style={{ '--i': i }}>
                  <span className="b-barra-nombre">{r.nombre}</span>
                  <span className="b-barra"><span style={{ '--p': r.noches / max }} /></span>
                  <span className="b-barra-valor">{v ? <Contador a={r.noches} activo={v} dur={900} /> : 0}</span>
                </li>
              ))}
            </ol>
          </>
        )}</Modulo>
        <Modulo className="cb-r-motivos" retraso={90}>{(v) => (
          <>
            <p className="b-rotulo">Motivo</p>
            <div className="b-anillo-caja">
              <Anillo activo={v} partes={totalMotivos ? partes : [['Sin datos', 1, 'var(--b-linea)']]} />
              <div className="b-anillo-centro"><b><Contador a={totalMotivos ? Math.round((100 * salud) / totalMotivos) : 0} activo={v} /><small>%</small></b><span>por salud</span></div>
            </div>
            <ul className="b-leyenda">
              {d.por_motivo.map((m) => <li key={m.motivo}><i style={{ background: COLOR_MOTIVO[m.motivo] }} />{CORTO[m.motivo]}<b>{m.reservas}</b></li>)}
            </ul>
          </>
        )}</Modulo>
        <Modulo className="cb-r-ranking" retraso={150}>
          <p className="b-rotulo">Más usadas</p>
          <h2 className="b-titulo-mod">Casas</h2>
          <ol className="cb-ranking">
            {d.ranking_inmuebles.map((c) => <li key={c.id}><span><b>{c.nombre}</b><small>{c.localidad}</small></span><em>{c.noches} noches</em></li>)}
          </ol>
        </Modulo>
      </section>
    </div>
  )
}
