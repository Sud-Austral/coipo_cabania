/* Administrador: cuatro opciones, cada una con su cifra. */
import { getInmueblesAdmin, getUsuariosGestion } from '../../logica/api/administracion.js'
import { getAuditoria } from '../../logica/api/gestion.js'
import { useConsulta } from '../../nucleo/consulta.js'
import { Cargando, Cifra, Titulo } from '../../piezas/basicas.jsx'
import { leerParametros } from '../../nucleo/parametros.js'

export default function InicioAdmin() {
  const { datos } = useConsulta(async () => {
    const [i, u, a] = await Promise.all([getInmueblesAdmin(), getUsuariosGestion(), getAuditoria()])
    return { casas: i.items, usuarios: u.items, auditoria: a.items }
  }, [])
  if (!datos) return <Cargando />
  const activas = datos.casas.filter((c) => c.activo !== false).length
  const hoy = new Date().toISOString().slice(0, 10)
  const deHoy = datos.auditoria.filter((a) => a.fecha_hora.startsWith(hoy)).length
  return (
    <div className="cb-pagina">
      <Titulo pre="Administrador">¿Qué quiere ajustar?</Titulo>
      <section className="b-grilla cb-tablero cb-tablero-admin" aria-label="Opciones">
        <Cifra rotulo="Inmuebles" valor={activas} frase={`casas activas de ${datos.casas.length} · temporadas y cierres`} a="inmuebles" />
        <Cifra rotulo="Tarifas y reglas" valor={Object.keys(leerParametros()).length} frase="reglas escritas como frases" a="reglas" retraso={90} />
        <Cifra rotulo="Usuarios y afiliados" valor={datos.usuarios.length} frase="usuarios · cargar CSV de afiliados" a="usuarios" retraso={180} />
        <Cifra rotulo="Auditoría" valor={datos.auditoria.length} frase={deHoy ? `${deHoy} cambios hoy` : 'registros'} a="auditoria" retraso={270} />
      </section>
    </div>
  )
}
