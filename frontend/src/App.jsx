/* Casas de Bienestar v2 · cáscara: banner UIA, franja de prueba, cabecera Bento con perfil, vistas por #hash y pie. */
import { useEffect } from 'react'
import BannerInstitucional from './componentes/BannerInstitucional.jsx'
import Navegacion from './componentes/Navegacion.jsx'
import { InterruptorTema, useTema } from './diseno/index.js'
import { reiniciarDemo } from './logica/api/store.js'
import { refrescar } from './nucleo/consulta.js'
import { INICIO, VISTAS, ir, useRuta } from './nucleo/ruta.js'
import { PERFILES, cambiarPerfil, useSesion } from './nucleo/sesion.js'

import Catalogo from './vistas/portal/Catalogo.jsx'
import Ficha from './vistas/portal/Ficha.jsx'
import Reservar from './vistas/portal/Reservar.jsx'
import Comprobante from './vistas/portal/Comprobante.jsx'
import MisReservas from './vistas/portal/MisReservas.jsx'
import InicioRegional from './vistas/regional/InicioRegional.jsx'
import CalendarioOperativo from './vistas/regional/CalendarioOperativo.jsx'
import ReservaManual from './vistas/regional/ReservaManual.jsx'
import InicioCentral from './vistas/central/InicioCentral.jsx'
import ReservasPais from './vistas/central/ReservasPais.jsx'
import Cobros from './vistas/central/Cobros.jsx'
import Reportes from './vistas/central/Reportes.jsx'
import Bloqueos from './vistas/central/Bloqueos.jsx'
import InicioAdmin from './vistas/admin/InicioAdmin.jsx'
import Inmuebles from './vistas/admin/Inmuebles.jsx'
import TarifasReglas from './vistas/admin/TarifasReglas.jsx'
import Usuarios from './vistas/admin/Usuarios.jsx'
import Auditoria from './vistas/admin/Auditoria.jsx'
import Arquitectura from './vistas/Arquitectura.jsx'

const PORTAL = [{ id: 'casas', texto: 'Casas' }, { id: 'mis-reservas', texto: 'Mis reservas' }]
const SECCIONES = {
  afiliado: PORTAL,
  no_afiliado: PORTAL,
  regional: [{ id: 'regional', texto: 'Inicio' }, { id: 'calendario', texto: 'Calendario' }, { id: 'manual', texto: 'Nueva reserva' }, { id: 'casas', texto: 'Casas' }],
  central: [{ id: 'central', texto: 'Inicio' }, { id: 'reservas', texto: 'Reservas' }, { id: 'cobros', texto: 'Cobros' }, { id: 'reportes', texto: 'Reportes' }, { id: 'bloqueos', texto: 'Bloqueos' }],
  admin: [{ id: 'admin', texto: 'Inicio' }, { id: 'inmuebles', texto: 'Inmuebles' }, { id: 'reglas', texto: 'Tarifas y reglas' }, { id: 'usuarios', texto: 'Usuarios' }, { id: 'auditoria', texto: 'Auditoría' }],
}
// Vistas hijas que encienden su sección en la barra.
const SECCION_DE = { casa: 'casas', reservar: 'casas', reserva: 'mis-reservas' }

const VISTA = {
  casas: Catalogo, casa: Ficha, reservar: Reservar, reserva: Comprobante, 'mis-reservas': MisReservas,
  regional: InicioRegional, calendario: CalendarioOperativo, manual: ReservaManual,
  central: InicioCentral, reservas: ReservasPais, cobros: Cobros, reportes: Reportes, bloqueos: Bloqueos,
  admin: InicioAdmin, inmuebles: Inmuebles, reglas: TarifasReglas, usuarios: Usuarios, auditoria: Auditoria,
  arquitectura: Arquitectura,
}

function Cabecera({ rol, actual }) {
  const [tema, alternar] = useTema()
  const secciones = [...SECCIONES[rol], { id: 'arquitectura', texto: 'Arquitectura' }]
  return (
    <div className="b-cabecera cb-cabecera">
      <div className="b-cabecera-interior">
        <Navegacion secciones={secciones} actual={actual} alCambiar={(id) => ir(id)} />
        <label className="cb-perfil">
          <span className="cb-oculto">Perfil</span>
          <select value={rol} onChange={(e) => { cambiarPerfil(e.target.value); ir(INICIO[e.target.value]) }} aria-label="Perfil">
            {PERFILES.map((p) => <option key={p.valor} value={p.valor}>{p.etiqueta}</option>)}
          </select>
        </label>
        <InterruptorTema tema={tema} alCambiar={alternar} />
      </div>
    </div>
  )
}

export default function App() {
  const { rol } = useSesion()
  const { vista, args } = useRuta()
  const permitida = VISTAS[vista]?.includes(rol)

  useEffect(() => {
    if (!permitida) location.replace(`#${INICIO[rol]}`)
  }, [permitida, rol])

  const Vista = permitida ? VISTA[vista] : null
  const actual = rol === 'afiliado' || rol === 'no_afiliado' ? (SECCION_DE[vista] ?? vista) : vista

  return (
    <>
      <a className="salto-al-contenido" href="#contenido">Saltar al contenido</a>
      <BannerInstitucional href={`#${INICIO[rol]}`} titulo="Casas de Bienestar" subtitulo="Huéspedes y veraneo · CONAF" />
      <p className="cb-franja">Versión de prueba · datos ficticios</p>
      <Cabecera rol={rol} actual={actual} />

      <main id="contenido" className="contenido cb-contenido" tabIndex={-1} data-vista={vista}>
        {Vista && <Vista key={`${rol}-${vista}-${args.join('/')}`} args={args} />}
      </main>

      <footer className="pie-institucional">
        <div className="pie-institucional-interior">
          <p>Servicio de Bienestar · Corporación Nacional Forestal</p>
          <p>
            <button type="button" className="cb-enlace" onClick={() => { reiniciarDemo(); refrescar(); ir(INICIO[rol]) }}>
              Volver a los datos de inicio
            </button>
          </p>
        </div>
      </footer>
    </>
  )
}
