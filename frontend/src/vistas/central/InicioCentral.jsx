/* Portada de Oficina Central: lo que importa hoy en el país, en cifras que cuentan. */
import { getReservas, getPagosTransferenciaPendientes } from '../../logica/api/reservas.js'
import { getNominas, getReportes, getSanciones } from '../../logica/api/gestion.js'
import { etiquetaPeriodo } from '../../logica/lib/cobros.js'
import { useConsulta } from '../../nucleo/consulta.js'
import { useSesion } from '../../nucleo/sesion.js'
import { Contador, Modulo } from '../../diseno/index.js'
import { Cargando, Cifra, Titulo } from '../../piezas/basicas.jsx'

export const periodoActual = () => new Date().toISOString().slice(0, 7)

export default function InicioCentral() {
  const { usuario } = useSesion()
  const { datos } = useConsulta(async () => {
    const [reservas, nominas, transf, sanciones, reportes] = await Promise.all([getReservas(), getNominas(), getPagosTransferenciaPendientes(), getSanciones(), getReportes()])
    return { reservas: reservas.items, nominas: nominas.items, transf: transf.items, sanciones: sanciones.items, reportes }
  }, [])
  if (!datos) return <Cargando />
  const { reservas, nominas, transf, sanciones, reportes } = datos
  const porConfirmar = reservas.filter((r) => r.estado === 'recibida').length
  const emergencias = reservas.filter((r) => r.estado === 'fuerza_mayor_pendiente').length
  const incidencias = reservas.filter((r) => r.incidencia?.estado === 'informada').length
  const periodo = periodoActual()
  const mes = nominas.find((n) => n.periodo === periodo)
  const cuotasMes = (mes?.items ?? []).filter((i) => !i.retenido_por_transferencia)
  const totalMes = cuotasMes.reduce((s, i) => s + i.monto, 0)
  const porEnviar = cuotasMes.filter((i) => i.estado === 'pendiente').length
  const bloqueados = sanciones.filter((s) => s.estado === 'vigente').length
  const regiones = reportes.por_region.slice(0, 6)
  const max = Math.max(1, ...regiones.map((r) => r.noches))

  return (
    <div className="cb-pagina">
      <Titulo pre={`Hola, ${usuario.nombre.split(' ')[0]}`}>Oficina Central</Titulo>
      <section className="b-grilla cb-tablero cb-tablero-central" aria-label="Hoy en el país">
        <Cifra className="cb-c-confirmar" rotulo="Por confirmar en el país" valor={porConfirmar} frase="Solicitudes esperando a la encargada" a="reservas" tono={porConfirmar ? 'aviso' : undefined} />
        <Cifra className="cb-c-cobros" rotulo={`Cobros de ${etiquetaPeriodo(periodo)}`} valor={totalMes} pesos frase={`${cuotasMes.length} cuotas · ${porEnviar} por enviar`} a="cobros" retraso={90} />
        <Cifra className="cb-c-emerg" rotulo="Emergencias" valor={emergencias} frase="Por resolver" a="reservas/emergencias" tono={emergencias ? 'aviso' : undefined} retraso={150} />
        <Cifra className="cb-c-transf" rotulo="Transferencias" valor={transf.length} frase="Por confirmar" a="cobros" retraso={210} />
        <Cifra className="cb-c-bloq" rotulo="Bloqueados" valor={bloqueados} frase={incidencias ? `${incidencias} problemas informados` : 'Personas sin reservar'} a="bloqueos" retraso={270} />
        <Modulo className="cb-c-regiones" retraso={120}>{(v) => (
          <>
            <p className="b-rotulo">Noches ocupadas</p>
            <h2 className="b-titulo-mod">Por región</h2>
            <ol className="b-barras">
              {regiones.map((r, i) => (
                <li key={r.region} style={{ '--i': i }}>
                  <span className="b-barra-nombre">{r.nombre}</span>
                  <span className="b-barra"><span style={{ '--p': r.noches / max }} /></span>
                  <span className="b-barra-valor">{v ? <Contador a={r.noches} activo={v} dur={900} /> : 0}</span>
                </li>
              ))}
            </ol>
          </>
        )}</Modulo>
      </section>
    </div>
  )
}
