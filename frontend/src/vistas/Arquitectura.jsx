/* Arquitectura: qué es real, qué no y qué falta pedir a Bienestar. Corta, en bento. */
import { Modulo, useEnVista } from '../diseno/index.js'

const REAL = [
  ['Reglas', 'tarifas, temporadas, cuotas, emergencias, bloqueos y prioridad salud > trabajo > descanso (la lógica de v1, con pruebas)'],
  ['Red', 'los 34 nombres, regiones y localidades del anexo de Bienestar'],
  ['Fotos', 'solo Bahía Inglesa 1; el resto son de referencia'],
]
const NO_REAL = [
  ['Personas', 'nombres, RUT y reservas ficticios'],
  ['Valores', 'tarifas y fechas de temporada de ejemplo'],
  ['Datos', 'se guardan en este navegador; «Volver a los datos de inicio» los reinicia'],
  ['Acceso', 'sin login: el perfil se elige arriba'],
  ['Avisos', 'no se envían correos'],
]
const PENDIENTES = [
  'Tarifas oficiales y su vigencia',
  'Fechas oficiales de temporadas',
  'Fotos y normas de cada casa',
  'Nómina de afiliados y cargas',
  'Formato que pide Remuneraciones',
  'Datos bancarios para transferir',
  'Encargadas de cada región',
]
const CAPAS = [
  ['web', 'Front (esta maqueta)', 'React + Vite · Bento · nginx en Forge LAB'],
  ['api', 'API FastAPI', 'fase 2: mismas funciones que logica/api'],
  ['db', 'PostgreSQL', 'reemplaza a localStorage'],
  ['user', 'IAM CONAF', 'login real y perfiles'],
]

export default function Arquitectura() {
  const [ref, v] = useEnVista(0.1)
  return (
    <>
      <section className="b-hero cb-hero cb-hero-corto" ref={ref} data-visto={v || undefined}>
        <div className="b-aurora" aria-hidden="true" />
        <p className="b-hero-pre">Arquitectura</p>
        <h1>Qué es real<br /><span>y qué no</span></h1>
      </section>
      <section className="b-grilla cb-arq" aria-label="Estado de la maqueta">
        <Modulo className="cb-a-real">
          <p className="b-rotulo">Real</p>
          <h2 className="b-titulo-mod">Lo que ya sirve</h2>
          <ul className="cb-vinetas">{REAL.map(([b, t]) => <li key={b}><b>{b}:</b> {t}</li>)}</ul>
        </Modulo>
        <Modulo className="cb-a-no" retraso={90}>
          <p className="b-rotulo b-rotulo-ambar">De prueba</p>
          <h2 className="b-titulo-mod">Lo que no es real</h2>
          <ul className="cb-vinetas">{NO_REAL.map(([b, t]) => <li key={b}><b>{b}:</b> {t}</li>)}</ul>
        </Modulo>
        <Modulo className="cb-a-pend" retraso={60}>
          <p className="b-rotulo">Con Bienestar</p>
          <h2 className="b-titulo-mod">Pendientes</h2>
          <ol className="cb-vinetas">{PENDIENTES.map((t) => <li key={t}>{t}</li>)}</ol>
        </Modulo>
        <Modulo className="cb-a-capas" retraso={150}>
          <p className="b-rotulo">Cómo sigue</p>
          <h2 className="b-titulo-mod">Capas</h2>
          <ul className="cb-nodos">{CAPAS.map(([t, n, d]) => <li key={n} data-t={t}><b>{n}</b><small>{d}</small></li>)}</ul>
        </Modulo>
      </section>
    </>
  )
}
