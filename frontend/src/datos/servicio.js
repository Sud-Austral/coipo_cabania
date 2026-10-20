/**
 * Capa de datos de la maqueta.
 *
 * Cada función corresponde a un endpoint de la futura API (FastAPI) y
 * devuelve los mismos campos. Hoy guarda en el navegador (localStorage);
 * en la versión real este archivo se reemplaza por llamadas HTTP.
 *
 *   listarCasas() / obtenerCasa(id)           GET   /api/casas[/{id}]
 *   actualizarCasa(id, cambios)               PATCH /api/casas/{id}
 *   ocupacionesDe(id) / bloqueosDe(id)        GET   /api/casas/{id}/ocupacion | /bloqueos
 *   crearBloqueo(...) / eliminarBloqueo(id)   POST | DELETE /api/bloqueos
 *   todasLasReservas()                        GET   /api/reservas
 *   misReservas(usuarioId)                    GET   /api/reservas?titular=me
 *   reservasRegion(region)                    GET   /api/reservas?region={region}
 *   obtenerReserva(codigo)                    GET   /api/reservas/{codigo}
 *   crearReserva(datos)                       POST  /api/reservas   (confirma si hay disponibilidad)
 *   desistirReserva(codigo)                   POST  /api/reservas/{codigo}/desistimiento
 *   registrarPago(codigo, datos, actor)       POST  /api/reservas/{codigo}/pago
 *   nominaPlanilla(periodo)                   GET   /api/nomina-descuentos/{AAAA-MM}
 *   cambiarEstadoNomina(periodo, estado)      PATCH /api/nomina-descuentos/{AAAA-MM}
 *   inventarioDe(casaId) / guardarInventario  GET | PUT /api/casas/{id}/inventario
 *   sorteoVigente()                           GET   /api/sorteos/vigente
 *   postular(datos) / retirarPostulacion(c)   POST | DELETE /api/sorteos/{id}/postulaciones
 *   realizarSorteo(actor)                     POST  /api/sorteos/{id}/sorteo
 *   responderOferta(codigo, acepta)           POST  /api/sorteos/{id}/postulaciones/{codigo}/oferta
 *   nochesLiberadas(casaId)                   GET   /api/casas/{id}/vacantes-temporada-alta
 */

import { useSyncExternalStore } from 'react'
import { CASAS } from './casas.js'
import { inventarioInicial } from './inventarios.js'
import { NOMINA } from './usuarios.js'
import { diasEntre, hoyISO, mesDe, primerDiaMes, sumarDias, sumarMeses } from '../lib/fechas.js'
import { ADICIONAL_TARIFA, PARAMETROS, TEMPORADAS_ALTAS, cargoDesistimiento, formasDePago, glosaTransferencia, noches, temporadaAltaDe } from '../lib/reglas.js'
import { HORAS_OFERTA, puedePostular, sortear, turnosDe } from '../lib/sorteo.js'

const CLAVE = 'reserva_veraneo_v10'
const ADICIONAL_BASE = { ...ADICIONAL_TARIFA }

const ahora = () => new Date().toISOString().slice(0, 19)

/** Desde el 20-10-2026 toda reserva se confirma sola si hay disponibilidad. */
const AUTOMATICA = 'Confirmación automática'
const casaBase = (id) => CASAS.find((c) => c.id === id)

/* ---------- Personas ficticias ---------- */

function rutFicticio(cuerpo) {
  let s = 0
  let f = 2
  for (const d of String(cuerpo).split('').reverse()) {
    s += Number(d) * f
    f = f === 7 ? 2 : f + 1
  }
  const r = 11 - (s % 11)
  const dv = r === 11 ? '0' : r === 10 ? 'K' : String(r)
  return `${String(cuerpo).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${dv}`
}

const NOMBRES = ['Luis', 'Ana', 'Pedro', 'Claudia', 'Óscar', 'Ximena', 'Javiera', 'Rodrigo', 'Soledad', 'Manuel', 'Camila', 'Felipe', 'Daniela', 'Cristián', 'Valentina', 'Jorge', 'Paola', 'Andrés', 'Carolina', 'Mauricio', 'Francisca', 'Gonzalo', 'Marcela', 'Patricio', 'Lorena', 'Sebastián', 'Verónica', 'Héctor', 'Fernanda', 'Ricardo']
const APELLIDOS = ['Cárdenas', 'Villalobos', 'Millán', 'Sandoval', 'Maldonado', 'Bravo', 'Toro', 'Escobar', 'Ríos', 'Aguirre', 'Henríquez', 'Navarro', 'Fuentealba', 'Poblete', 'Jara', 'Soto', 'Quezada', 'Rivas', 'Vera', 'Alarcón', 'Sepúlveda', 'Paredes', 'Peña', 'Lizana', 'Rojas', 'Godoy', 'Mora', 'Arce', 'Cortés', 'Muñoz']
const ROLES = ['Guardaparque', 'Brigadista', 'Técnico forestal', 'Administrativa', 'Profesional de fiscalización', 'Conductor', 'Viverista', 'Profesional de fomento']
const INSTITUCIONES = ['Servicio Agrícola y Ganadero', 'INDAP', 'Servicio de Salud Valparaíso', 'Ministerio de Agricultura', 'SERNAPESCA']
const REGIONES_PERSONAL = ['02', '03', '04', '05', '05', '06', '07', '08', '08', '09', '09', '10', '10', '11', '12', '13', '13', '13', '14']

function crearPersonas(cantidad, azar) {
  const lista = []
  for (let i = 0; i < cantidad; i++) {
    const g = Math.floor(i / 30)
    const nombre = `${NOMBRES[i % 30]} ${APELLIDOS[(i * 7 + g * 11) % 30]} ${APELLIDOS[(i * 13 + g * 17 + 5) % 30]}`
    const x = azar()
    const calidad = x < 0.72 ? 'afiliado' : x < 0.84 ? 'no_afiliado' : x < 0.94 ? 'jubilado' : 'otro_servicio'
    const correoBase = nombre.split(' ').slice(0, 2).join('.').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    lista.push({
      id: `p${i}`,
      nombre,
      rut: rutFicticio(10234567 + ((i * 97919) % 9000000)),
      rol: calidad === 'otro_servicio' ? `Funcionario/a de ${INSTITUCIONES[i % 5]}` : calidad === 'jubilado' ? 'Afiliado jubilado' : ROLES[i % ROLES.length],
      region: REGIONES_PERSONAL[i % REGIONES_PERSONAL.length],
      calidad,
      plazo_fijo: calidad === 'afiliado' && azar() < 0.1,
      correo: calidad === 'jubilado' ? `${correoBase}@gmail.com` : calidad === 'otro_servicio' ? `${correoBase}@servicio.gob.cl` : `${correoBase}@conaf.cl`,
      telefono: `+56 9 ${5000 + ((i * 37) % 4999)} ${1000 + ((i * 53) % 8999)}`,
    })
  }
  return lista
}

/* ---------- Semillas ---------- */

/** Demanda relativa de cada casa (1 = normal): define cuánto se usa en la demostración. */
const DEMANDA = { 2: 1.6, 6: 1.7, 10: 1.5, 5: 1.4, 22: 1.4, 3: 1.2, 8: 1.2, 11: 1.1, 19: 1.2, 26: 1.1, 7: 1.0, 15: 1.0, 21: 1.0, 30: 0.9, 1: 0.5, 29: 0.4, 28: 0.5, 16: 0.6, 13: 0.7, 34: 0.7 }
const tarifaSegun = (casa, calidad) => casa.tarifa_noche + (ADICIONAL_BASE[calidad] ?? 0)

function nuevaReserva(codigo, casaId, entrada, nochesN, titular, extra = {}) {
  const casa = casaBase(casaId)
  const salida = sumarDias(entrada, nochesN)
  const personas = Math.min(casa.capacidad, 2 + (codigo.charCodeAt(codigo.length - 1) % 4))
  const tarifa = tarifaSegun(casa, titular.calidad)
  const anticipado = ['jubilado', 'otro_servicio'].includes(titular.calidad)
  return {
    codigo,
    titular_id: titular.id ?? null,
    titular,
    casa_id: casaId,
    entrada,
    salida,
    tarifa_noche: tarifa,
    total: tarifa * nochesN,
    ocupantes: [
      { nombre: titular.nombre, parentesco: 'titular' },
      ...Array.from({ length: personas - 1 }, (_, i) => ({ nombre: `Acompañante ${i + 1}`, edad: i === 0 ? 41 : 6 + i * 4, parentesco: i === 0 ? 'conyuge' : 'hijo' })),
    ],
    contacto: { correo: titular.correo, telefono: titular.telefono },
    forma_pago: anticipado ? { tipo: 'transferencia', anticipado: true } : { tipo: 'planilla', cuotas: 1, autorizacion: true },
    estado: 'confirmada',
    creada_en: sumarDias(entrada, -21) + 'T10:15:00',
    notificaciones: [],
    ...extra,
  }
}

function semillas(hoy) {
  const azar = aleatorio(20261020)
  const personas = crearPersonas(210, azar)
  const maria = { id: 1, nombre: 'María Fuentes Rojas', rut: '13.457.902-1', rol: 'Técnica administrativa', region: '05', calidad: 'afiliado', correo: 'maria.fuentes@conaf.cl', telefono: '+56 9 6123 4587' }
  const hernan = { id: 3, nombre: 'Hernán Soto Valenzuela', rut: '6.884.215-8', rol: 'Afiliado jubilado', region: '08', calidad: 'jubilado', correo: 'hsoto.valenzuela@gmail.com', telefono: '+56 9 8455 1290' }
  const externo = { nombre: 'Rodrigo Pérez Leiva', rut: rutFicticio(14552310), rol: 'Funcionario de Servicio Agrícola y Ganadero', region: '05', calidad: 'otro_servicio', correo: 'rodrigo.perez@sag.gob.cl', telefono: '+56 9 7712 4410' }
  const jubilada = { ...personas[3], nombre: 'Nora Castillo Vergara', calidad: 'jubilado', rol: 'Afiliada jubilada', correo: 'nora.castillo@gmail.com', region: '05' }
  const conf = (dias) => ({ confirmada_por: AUTOMATICA, creada_en: sumarDias(hoy, -dias) + 'T09:30:00', confirmada_en: sumarDias(hoy, -dias) + 'T09:30:00' })
  const auto = (creada) => ({ confirmada_por: AUTOMATICA, creada_en: creada, confirmada_en: creada })
  const pagado = (r, dias) => ({ ...r, pago: { registrado_en: sumarDias(hoy, -dias) + 'T12:00:00', comprobante: 'TRF-' + (480000 + dias * 37), por: 'Patricia Herrera Muñoz' } })

  const bloqueos = [
    { id: 'B-1', casa_id: 7, entrada: sumarDias(hoy, 12), salida: sumarDias(hoy, 20), motivo: 'Mantención de techumbre', creado_por: 'Patricia Herrera Muñoz', creado_en: sumarDias(hoy, -6) + 'T10:00:00' },
  ]

  // Reservas de los usuarios de demostración.
  const lista = [
    nuevaReserva('R-2026-0118', 6, sumarDias(hoy, -70), 4, maria, conf(95)),
    nuevaReserva('R-2026-0187', 19, sumarDias(hoy, 26), 3, maria, { ...conf(10), forma_pago: { tipo: 'planilla', cuotas: 2, autorizacion: true } }),
    pagado(nuevaReserva('R-2026-0142', 15, sumarDias(hoy, -40), 3, hernan, conf(60)), 45),
  ]

  // Escenario de la Región de Valparaíso y pendientes en otras regiones.
  lista.push(
    nuevaReserva('R-2026-0171', 8, hoy, 3, { ...personas[0], calidad: 'afiliado', plazo_fijo: false }, conf(10)),
    nuevaReserva('R-2026-0166', 9, sumarDias(hoy, -2), 3, { ...personas[1], calidad: 'afiliado', plazo_fijo: false }, conf(12)),
    nuevaReserva('R-2026-0174', 6, sumarDias(hoy, 1), 2, { ...personas[2], calidad: 'afiliado', plazo_fijo: false }, conf(8)),
    nuevaReserva('R-2026-0179', 7, sumarDias(hoy, 25), 4, { ...personas[4], calidad: 'afiliado', plazo_fijo: false }, conf(4)),
    nuevaReserva('R-2026-0190', 6, sumarDias(hoy, 12), 3, { ...personas[5], calidad: 'afiliado', plazo_fijo: false }, { ...auto(sumarDias(hoy, -2) + 'T16:42:00') }),
    nuevaReserva('R-2026-0193', 9, sumarDias(hoy, 12), 2, externo, { ...auto(sumarDias(hoy, -1) + 'T11:05:00') }),
    nuevaReserva('R-2026-0195', 8, sumarDias(hoy, 30), 4, jubilada, { ...auto(hoy + 'T08:12:00') }),
    // Confirmadas con pago anticipado pendiente de registrar.
    nuevaReserva('R-2026-0181', 2, sumarDias(hoy, 4), 3, { ...personas[6], calidad: 'jubilado', rol: 'Afiliado jubilado' }, conf(9)),
    nuevaReserva('R-2026-0183', 26, sumarDias(hoy, 8), 4, { ...personas[7], calidad: 'otro_servicio', rol: 'Funcionario/a de INDAP' }, conf(5)),
    // Otras reservas recientes de otras regiones.
    nuevaReserva('R-2026-0158', 22, sumarDias(hoy, 9), 3, { ...personas[8], calidad: 'afiliado', plazo_fijo: false }, { ...auto(sumarDias(hoy, -6) + 'T09:20:00') }),
    nuevaReserva('R-2026-0162', 30, sumarDias(hoy, 18), 4, { ...personas[9], calidad: 'no_afiliado' }, { ...auto(sumarDias(hoy, -4) + 'T15:10:00') }),
    nuevaReserva('R-2026-0185', 10, sumarDias(hoy, 7), 2, { ...personas[10], calidad: 'afiliado', plazo_fijo: false }, { ...auto(sumarDias(hoy, -1) + 'T18:45:00') }),
  )

  // Historial de todo 2026 y reservas futuras de terceros, sin chocar con lo anterior.
  let n = 300
  const inicio = '2026-01-03'
  const finFuturo = sumarDias(hoy, 110)
  for (const casa of CASAS) {
    const rnd = aleatorio(casa.id * 7919)
    const demanda = DEMANDA[casa.id] ?? 0.85
    let d = sumarDias(inicio, Math.floor(rnd() * 5))
    while (d < finFuturo) {
      const mes = Number(d.slice(5, 7))
      const alta = mes <= 2 || (mes === 7 && Number(d.slice(8, 10)) >= 6 && Number(d.slice(8, 10)) <= 26)
      const largo = alta ? 5 + Math.floor(rnd() * 3) : 2 + Math.floor(rnd() * 4)
      const salida = sumarDias(d, largo)
      const brecha = Math.max(1, Math.round((alta ? 1 + rnd() * 3 : 3 + rnd() * 11) / demanda))
      const choca = lista.some((p) => p.casa_id === casa.id && d <= sumarDias(p.salida, 1) && sumarDias(p.entrada, -1) <= salida)
      const enBloqueo = bloqueos.some((b) => b.casa_id === casa.id && d <= b.salida && b.entrada <= salida)
      const futuraAlta = d > hoy && (temporadaAltaDe(d) || temporadaAltaDe(salida))
      if (!choca && !enBloqueo && !futuraAlta) {
        n += 1
        const titular = personas[Math.floor(rnd() * personas.length)]
        const codigo = `R-2026-${String(n).padStart(4, '0')}`
        const anticipacion = 5 + Math.floor(rnd() * 55)
        const creada = sumarDias(d, -anticipacion) + `T${String(8 + Math.floor(rnd() * 11)).padStart(2, '0')}:${String(Math.floor(rnd() * 60)).padStart(2, '0')}:00`
        const creadaEn = creada < hoy ? creada : hoy + 'T08:00:00'
        const r = nuevaReserva(codigo, casa.id, d, largo, titular, { ...auto(creadaEn) })
        const sinAnticipo = r.forma_pago.anticipado !== true
        if (sinAnticipo) {
          const p = rnd()
          r.forma_pago = titular.plazo_fijo && p < 0.4 ? { tipo: 'transferencia', anticipado: true } : { tipo: 'planilla', cuotas: 1 + Math.floor(rnd() * 3), autorizacion: true }
        }
        const x = rnd()
        if (d < hoy && x < 0.06) {
          r.estado = 'desistida'
          r.desistida_en = sumarDias(d, -Math.floor(rnd() * 14))
          r.cargo_desistimiento = cargoDesistimiento({ ...r, estado: 'confirmada' }, r.desistida_en)
        } else if (r.forma_pago.tipo !== 'planilla' && (salida <= hoy || r.forma_pago.anticipado)) {
          if (salida <= hoy || rnd() < 0.85) r.pago = { registrado_en: (salida <= hoy ? sumarDias(salida, -1) : sumarDias(hoy, -2)) + 'T12:00:00', comprobante: 'TRF-' + (500000 + n), por: 'Encargada regional' }
        }
        lista.push(r)
      }
      d = sumarDias(salida, brecha)
    }
  }

  const inventarios = inventarioInicial(hoy)
  const sorteo = semillaSorteo(hoy, personas, lista, hernan)
  estado = { reservas: lista, correlativo: n, inventarios, bloqueos, tarifas: {}, inactivas: [], adicionales: { ...ADICIONAL_BASE }, nominas: {}, sorteo }
  for (const r of lista) {
    if (r.estado === 'confirmada' && r.salida > sumarDias(hoy, -15) && inventarios[r.casa_id]) {
      const cuando = (r.confirmada_en ?? '') > inventarios[r.casa_id].actualizado_en ? r.confirmada_en : inventarios[r.casa_id].actualizado_en
      enviarInventario(r, cuando)
    }
  }
  return estado
}

/**
 * Sorteo de la temporada de verano: postulación abierta, con postulaciones de
 * personas ficticias. La prioridad sale de quién tuvo casa en las vacaciones
 * de invierno 2026 (Art. 6 a) y quién desistió tarde en ellas (Art. 10 d).
 */
function semillaSorteo(hoy, personas, reservas, hernan) {
  const temporada = TEMPORADAS_ALTAS[0]
  const invierno = (r) => r.entrada >= '2026-07-06' && r.entrada <= '2026-07-26'
  const tuvieron = new Set(reservas.filter((r) => invierno(r) && r.estado !== 'desistida').map((r) => r.titular_id))
  const perdieron = new Set(reservas.filter((r) => invierno(r) && r.estado === 'desistida' && r.cargo_desistimiento > 0).map((r) => r.titular_id))
  const turnos = turnosDe(temporada)
  const azar = aleatorio(2027)
  const pesoTurno = [0.7, 1.1, 1.4, 1.5, 1.6, 1.5, 1.2, 0.8]
  const casas = CASAS.map((c) => ({ id: c.id, peso: (DEMANDA[c.id] ?? 0.85) ** 2 }))
  const elegir = (items, peso) => {
    const total = items.reduce((t, x) => t + peso(x), 0)
    let x = azar() * total
    for (const it of items) if ((x -= peso(it)) <= 0) return it
    return items[items.length - 1]
  }
  const desde = sumarDias(hoy, -12)
  const s = {
    id: 'V2027',
    nombre: 'Temporada de verano 2027',
    temporada: { desde: temporada.desde, hasta: temporada.hasta },
    anterior: { nombre: 'Vacaciones de invierno 2026', adjudicados: [...tuvieron].filter(Boolean), perdieron: [...perdieron].filter(Boolean) },
    postulacion: { desde, hasta: sumarDias(hoy, 18) },
    estado: 'postulacion',
    correlativo: 0,
    postulaciones: [],
  }
  const candidatos = personas.filter((p) => puedePostular(p))
  const agregar = (titular, casaId, turno, dia) => {
    const casa = casaBase(casaId)
    s.correlativo += 1
    const formas = formasDePago(titular)
    s.postulaciones.push({
      codigo: `P-V27-${String(s.correlativo).padStart(4, '0')}`,
      usuario_id: titular.id,
      titular: { nombre: titular.nombre, rut: titular.rut, rol: titular.rol, region: titular.region, calidad: titular.calidad, plazo_fijo: Boolean(titular.plazo_fijo), correo: titular.correo, telefono: titular.telefono },
      casa_id: casaId,
      turno,
      personas: Math.min(casa.capacidad, 2 + Math.floor(azar() * 4)),
      forma_pago: formas[0] === 'planilla' ? { tipo: 'planilla', cuotas: 1 + Math.floor(azar() * 3), autorizacion: true } : { tipo: 'transferencia', anticipado: true },
      contacto: { correo: titular.correo, telefono: titular.telefono },
      prioridad: !tuvieron.has(titular.id),
      pierde_posibilidad: perdieron.has(titular.id),
      estado: 'postulada',
      creada_en: sumarDias(desde, dia) + `T${String(8 + Math.floor(azar() * 12)).padStart(2, '0')}:${String(Math.floor(azar() * 60)).padStart(2, '0')}:00`,
      notificaciones: [{ tipo: 'postulacion', en: sumarDias(desde, dia) + 'T12:00:00', detalle: 'Comprobante de postulación' }],
    })
  }
  const usados = new Set()
  const dias = Math.max(1, diasEntre(desde, hoy))
  for (let i = 0; i < 900; i++) {
    const p = candidatos[Math.floor(azar() * candidatos.length)]
    if (usados.has(p.id) || perdieron.has(p.id)) continue
    usados.add(p.id)
    agregar(p, elegir(casas, (c) => c.peso).id, elegir(turnos, (t) => pesoTurno[t.numero - 1] ?? 1).entrada, Math.floor(azar() * dias))
  }
  // Hernán (jubilado de demostración) ya postuló.
  agregar(hernan, 15, turnos[4].entrada, dias - 1)
  s.postulaciones.sort((a, b) => (a.creada_en < b.creada_en ? -1 : 1))
  return s
}

/** Generador determinista: mismos datos en cada carga. */
function aleatorio(semilla) {
  let s = semilla % 233280
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

/* ---------- Estado y suscripción ---------- */

let estado = null
let version = 0
const oyentes = new Set()
estado = cargar()
aplicarAdicionales()

function cargar() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE))
    if (guardado?.reservas && guardado?.inventarios && guardado?.bloqueos && guardado?.sorteo) return guardado
  } catch {
    // sin persistencia disponible
  }
  return semillas(hoyISO())
}

function guardar() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(estado))
  } catch {
    // sin persistencia disponible
  }
  version++
  oyentes.forEach((f) => f())
}

/** Las tarifas diferenciadas vigentes se aplican a las reglas de cálculo. */
function aplicarAdicionales() {
  Object.assign(ADICIONAL_TARIFA, estado.adicionales ?? ADICIONAL_BASE)
}

export function reiniciarDemo() {
  estado = semillas(hoyISO())
  aplicarAdicionales()
  guardar()
}

/** Hook: vuelve a renderizar cuando cambian los datos. */
export function useDatos() {
  return useSyncExternalStore(
    (f) => {
      oyentes.add(f)
      return () => oyentes.delete(f)
    },
    () => version,
  )
}

/* ---------- Casas, tarifas y bloqueos ---------- */

const conAjustes = (c) => ({ ...c, tarifa_noche: estado.tarifas[c.id] ?? c.tarifa_noche, activa: !estado.inactivas.includes(c.id) })

/** Casas activas (para el solicitante) o todas (para la Oficina Central). */
export const listarCasas = ({ incluirInactivas = false } = {}) => CASAS.map(conAjustes).filter((c) => incluirInactivas || c.activa)

export function obtenerCasa(id) {
  const c = casaBase(Number(id))
  return c ? conAjustes(c) : null
}

export function actualizarCasa(id, { tarifa_noche, activa }) {
  if (tarifa_noche !== undefined) estado.tarifas[id] = Number(tarifa_noche)
  if (activa !== undefined) estado.inactivas = activa ? estado.inactivas.filter((x) => x !== id) : [...new Set([...estado.inactivas, id])]
  guardar()
}

export const tarifasDiferenciadas = () => ({ ...estado.adicionales })

export function actualizarTarifasDiferenciadas(valores) {
  estado.adicionales = { ...estado.adicionales, ...Object.fromEntries(Object.entries(valores).map(([k, v]) => [k, Number(v)])) }
  aplicarAdicionales()
  guardar()
}

export const listarBloqueos = () => [...estado.bloqueos].sort((a, b) => (a.entrada < b.entrada ? -1 : 1))

export const bloqueosDe = (casaId) => estado.bloqueos.filter((b) => b.casa_id === casaId)

const ocupa = (r) => !['desistida', 'anulada'].includes(r.estado)

export const ocupacionesDe = (casaId) => [
  ...estado.reservas.filter((r) => r.casa_id === casaId && ocupa(r)).map(({ entrada, salida }) => ({ entrada, salida })),
  ...bloqueosDe(casaId),
]

/** Reservas vigentes que chocan con un bloqueo propuesto. */
export const reservasAfectadas = (casaId, entrada, salida) =>
  estado.reservas.filter((r) => r.casa_id === casaId && r.estado === 'confirmada' && r.entrada < salida && entrada < r.salida && r.salida > hoyISO()).map(conCasa)

/**
 * Bloquea fechas por mantención o fuerza mayor (Art. 11). Las reservas
 * afectadas se anulan, se avisa al usuario y se marca la devolución de lo pagado.
 */
export function crearBloqueo({ casa_id, entrada, salida, motivo }, actor) {
  const afectadas = reservasAfectadas(casa_id, entrada, salida)
  for (const a of afectadas) {
    const r = estado.reservas.find((x) => x.codigo === a.codigo)
    r.estado = 'anulada'
    r.motivo_anulacion = `Bienestar no puede ofrecer la casa en esas fechas: ${motivo}. Se devolverá lo pagado y le ofreceremos otra casa o fecha (Art. 11).`
    r.anulada_en = ahora()
    if (r.pago) r.devolucion_pendiente = true
    r.notificaciones ??= []
    r.notificaciones.push({ tipo: 'anulacion', en: ahora(), detalle: r.motivo_anulacion })
  }
  estado.bloqueos.push({ id: 'B-' + Date.now().toString(36), casa_id, entrada, salida, motivo, creado_por: actor.nombre, creado_en: ahora() })
  guardar()
  return afectadas.length
}

export function eliminarBloqueo(id) {
  estado.bloqueos = estado.bloqueos.filter((b) => b.id !== id)
  guardar()
}

/* ---------- Reservas ---------- */

const conCasa = (r) => (r ? { ...r, casa: obtenerCasa(r.casa_id) } : null)

export const todasLasReservas = () => estado.reservas.map(conCasa)

export const misReservas = (usuarioId) =>
  estado.reservas.filter((r) => r.titular_id === usuarioId).map(conCasa).sort((a, b) => (a.entrada < b.entrada ? 1 : -1))

export const reservasRegion = (region) => estado.reservas.filter((r) => casaBase(r.casa_id)?.region === region).map(conCasa)

export const obtenerReserva = (codigo) => conCasa(estado.reservas.find((r) => r.codigo === codigo))

/**
 * Reserva con confirmación automática (decisión 20-10-2026): si las fechas
 * están disponibles y se cumple la anticipación, queda confirmada al instante
 * y se envían el comprobante y el acta de entrega. La validación final de
 * disponibilidad la hace el backend dentro de una transacción, para que dos
 * personas no tomen las mismas fechas a la vez.
 */
export function crearReserva({ usuario, casa, entrada, salida, tarifa_noche, ocupantes, contacto, perro_asistencia, forma_pago, titular_viaja = true, a_cargo, registrada_por, aceptacion_pendiente }) {
  const choca = ocupacionesDe(casa.id).some((o) => entrada < o.salida && o.entrada < salida)
  if (choca) return null
  const codigo = nuevoCodigo()
  const r = {
    codigo,
    titular_id: usuario.id,
    titular: { nombre: usuario.nombre, rut: usuario.rut, rol: usuario.rol, region: usuario.region, calidad: usuario.calidad, correo: contacto.correo, telefono: contacto.telefono },
    casa_id: casa.id,
    entrada,
    salida,
    tarifa_noche,
    total: tarifa_noche * noches(entrada, salida),
    ocupantes,
    contacto,
    titular_viaja,
    a_cargo: a_cargo ?? usuario.nombre,
    perro_asistencia,
    forma_pago,
    acepta_reglamento: !aceptacion_pendiente,
    ...(registrada_por && { registrada_por, aceptacion_pendiente: true }),
    estado: 'confirmada',
    creada_en: ahora(),
    confirmada_por: AUTOMATICA,
    confirmada_en: ahora(),
    notificaciones: [{ tipo: 'confirmacion', en: ahora(), detalle: 'Comprobante de reserva confirmada' }],
  }
  if (registrada_por)
    r.notificaciones.push({
      tipo: 'aceptacion',
      en: ahora(),
      detalle: `Enlace para aceptar el reglamento${forma_pago.tipo === 'planilla' ? ' y autorizar el descuento' : ''} (reserva registrada por ${registrada_por.nombre})`,
    })
  enviarInventario(r)
  estado.reservas.push(r)
  guardar()
  return codigo
}

function nuevoCodigo() {
  estado.correlativo += 1
  return `R-${hoyISO().slice(0, 4)}-${String(estado.correlativo).padStart(4, '0')}`
}

/** Código que recibirá la próxima reserva (para la glosa de la transferencia). */
export const proximoCodigo = () => `R-${hoyISO().slice(0, 4)}-${String(estado.correlativo + 1).padStart(4, '0')}`

export function desistirReserva(codigo) {
  const r = estado.reservas.find((x) => x.codigo === codigo)
  if (!r) return
  r.cargo_desistimiento = cargoDesistimiento(r)
  r.estado = 'desistida'
  r.desistida_en = hoyISO()
  if (r.origen === 'sorteo') {
    // Art. 10 d): desistir tarde en temporada alta hace perder el sorteo siguiente.
    if (r.cargo_desistimiento > 0) r.pierde_sorteo_siguiente = true
    ofrecerSiguiente(r.casa_id, r.entrada)
  }
  guardar()
}

/* ---------- Cobros (Art. 21, Anexo A) ---------- */

/** Pagos por transferencia o en Bienestar aún no registrados, de reservas confirmadas. */
export const pagosPorRegistrar = () =>
  estado.reservas
    .filter((r) => r.estado === 'confirmada' && r.forma_pago.tipo !== 'planilla' && !r.pago)
    .map(conCasa)
    .sort((a, b) => (a.entrada < b.entrada ? -1 : 1))

export function registrarPago(codigo, { comprobante }, actor) {
  const r = estado.reservas.find((x) => x.codigo === codigo)
  if (!r) return
  r.pago = { registrado_en: ahora(), comprobante, por: actor.nombre }
  r.notificaciones ??= []
  r.notificaciones.push({ tipo: 'pago', en: ahora(), detalle: `Pago registrado (${comprobante})` })
  guardar()
}

/**
 * Líneas de la nómina de descuentos de un período (AAAA-MM). Cada estadía
 * finalizada con planilla se descuenta en cuotas a partir del mes siguiente
 * a la salida; los cargos por desistimiento, en el mes siguiente al aviso.
 */
export function nominaPlanilla(periodo) {
  const lineas = []
  for (const r of estado.reservas) {
    if (r.forma_pago.tipo !== 'planilla') continue
    if (r.estado === 'confirmada' && r.salida <= hoyISO()) {
      const cuotas = r.forma_pago.cuotas ?? 1
      for (let k = 1; k <= cuotas; k++) {
        if (mesDe(sumarMeses(r.salida, k)) === periodo) {
          lineas.push({ reserva: r.codigo, titular: r.titular, casa: casaBase(r.casa_id).nombre, concepto: `Estadía ${r.entrada} a ${r.salida}`, cuota: `${k} de ${cuotas}`, monto: Math.round(r.total / cuotas) })
        }
      }
    }
    if (r.estado === 'desistida' && r.cargo_desistimiento > 0 && mesDe(sumarMeses(r.desistida_en, 1)) === periodo) {
      lineas.push({ reserva: r.codigo, titular: r.titular, casa: casaBase(r.casa_id).nombre, concepto: 'Cargo por desistimiento (Art. 10)', cuota: '1 de 1', monto: r.cargo_desistimiento })
    }
  }
  return lineas.sort((a, b) => a.titular.nombre.localeCompare(b.titular.nombre))
}

/** pendiente → informada (enviada a Remuneraciones) → descontada. Los meses pasados se dan por descontados. */
export function estadoNomina(periodo) {
  if (estado.nominas[periodo]) return estado.nominas[periodo]
  const actual = mesDe(hoyISO())
  if (periodo < actual) return { estado: 'descontada' }
  return { estado: periodo === actual ? 'pendiente' : 'programada' }
}

export function cambiarEstadoNomina(periodo, nuevo, actor) {
  estado.nominas[periodo] = { estado: nuevo, en: ahora(), por: actor.nombre }
  guardar()
}

export const periodosNomina = () => {
  const actual = primerDiaMes(hoyISO())
  return Array.from({ length: 8 }, (_, i) => mesDe(sumarMeses(actual, 2 - i)))
}

/* ---------- Inventario y acta de entrega (Art. 2 e-f, Art. 13, Anexo B) ---------- */

export const inventarioDe = (casaId) => estado.inventarios[casaId] ?? null

/**
 * Genera el acta de entrega (Anexo B) con una copia del inventario vigente y
 * la "envía" al correo del usuario. Cada envío queda en el historial de la
 * reserva como un archivo descargable.
 */
function enviarInventario(r, cuando = ahora()) {
  const inv = estado.inventarios[r.casa_id]
  if (!inv) return false
  r.actas ??= []
  const numero = `ACTA-${r.codigo.slice(2)}-${r.actas.length + 1}`
  r.actas.push({ numero, generada_en: cuando, enviada_a: r.contacto?.correo ?? r.titular.correo, inventario: structuredClone(inv) })
  r.notificaciones ??= []
  r.notificaciones.push({ tipo: 'acta', en: cuando, detalle: `Acta de entrega ${numero} (inventario versión ${inv.version})`, acta: numero })
  return true
}

/** Reservas confirmadas que aún no comienzan: reciben cada nueva versión del acta. */
export const reservasPorRecibirInventario = (casaId) =>
  estado.reservas.filter((r) => r.casa_id === casaId && r.estado === 'confirmada' && r.entrada >= hoyISO())

/** Guarda una nueva versión y la envía automáticamente. Devuelve cuántas reservas la recibieron. */
export function guardarInventario(casaId, { items, seguridad }, actor) {
  const previo = inventarioDe(casaId)
  estado.inventarios[casaId] = {
    version: (previo?.version ?? 0) + 1,
    actualizado_en: ahora(),
    actualizado_por: actor.nombre,
    items,
    seguridad,
  }
  const destino = reservasPorRecibirInventario(casaId)
  destino.forEach((r) => enviarInventario(r))
  guardar()
  return destino.length
}

export function registrarDevolucion(codigo, actor) {
  const r = estado.reservas.find((x) => x.codigo === codigo)
  if (!r) return
  r.devolucion_pendiente = false
  r.devolucion = { registrada_en: ahora(), por: actor.nombre }
  r.notificaciones ??= []
  r.notificaciones.push({ tipo: 'devolucion', en: ahora(), detalle: 'Devolución registrada' })
  guardar()
}

/* ---------- Sorteo de temporada alta (Art. 6) ---------- */

const sorteoActual = () => estado.sorteo

/** Datos del sorteo vigente, con sus turnos. */
export function sorteoVigente() {
  const s = sorteoActual()
  return s ? { ...s, turnos: turnosDe(s.temporada) } : null
}

export const postulacionAbierta = (hoy = hoyISO()) => {
  const s = sorteoActual()
  return Boolean(s && s.estado === 'postulacion' && hoy >= s.postulacion.desde && hoy <= s.postulacion.hasta)
}

const vigentes = (p) => p.estado !== 'retirada'

export const postulacionDe = (usuarioId) => {
  const p = sorteoActual()?.postulaciones.find((x) => x.usuario_id === usuarioId && vigentes(x))
  return p ? { ...p, casa: obtenerCasa(p.casa_id) } : null
}

export const postulaciones = () => (sorteoActual()?.postulaciones ?? []).map((p) => ({ ...p, casa: obtenerCasa(p.casa_id) }))

/** Postulaciones vigentes por casa y turno: { 'casa|turno': n }. */
export function demanda() {
  const m = {}
  for (const p of sorteoActual()?.postulaciones ?? []) if (vigentes(p)) m[`${p.casa_id}|${p.turno}`] = (m[`${p.casa_id}|${p.turno}`] ?? 0) + 1
  return m
}

/** Prioridad (Art. 6 a) y posibilidad (Art. 10 d) de una persona en este sorteo. */
export function condicionSorteo(usuarioId) {
  const a = sorteoActual()?.anterior
  return { prioridad: !a?.adjudicados.includes(usuarioId), pierde_posibilidad: Boolean(a?.perdieron.includes(usuarioId)), anterior: a?.nombre }
}

/** Registra una postulación. Devuelve el código o un mensaje de error. */
export function postular({ usuario, casa_id, turno, personas, forma_pago, contacto }) {
  const s = sorteoActual()
  if (!postulacionAbierta()) return { error: 'La postulación no está abierta.' }
  if (!puedePostular(usuario)) return { error: 'Los funcionarios de otros servicios públicos no postulan al sorteo (Art. 9).' }
  if (postulacionDe(usuario.id)) return { error: 'Ya tiene una postulación en este sorteo: se postula a un solo turno (Art. 6 b).' }
  const casa = obtenerCasa(casa_id)
  if (!casa || personas > casa.capacidad) return { error: 'La casa no admite esa cantidad de personas.' }
  s.correlativo += 1
  const codigo = `P-V27-${String(s.correlativo).padStart(4, '0')}`
  s.postulaciones.push({
    codigo,
    usuario_id: usuario.id,
    titular: { nombre: usuario.nombre, rut: usuario.rut, rol: usuario.rol, region: usuario.region, calidad: usuario.calidad, plazo_fijo: Boolean(usuario.plazo_fijo), correo: contacto.correo, telefono: contacto.telefono },
    casa_id,
    turno,
    personas,
    forma_pago,
    contacto,
    prioridad: condicionSorteo(usuario.id).prioridad,
    pierde_posibilidad: condicionSorteo(usuario.id).pierde_posibilidad,
    estado: 'postulada',
    creada_en: ahora(),
    notificaciones: [{ tipo: 'postulacion', en: ahora(), detalle: 'Comprobante de postulación' }],
  })
  guardar()
  return { codigo }
}

export function retirarPostulacion(codigo) {
  const p = sorteoActual()?.postulaciones.find((x) => x.codigo === codigo)
  if (!p || p.estado !== 'postulada') return
  p.estado = 'retirada'
  p.retirada_en = ahora()
  guardar()
}

/** Crea la reserva confirmada de una postulación adjudicada. */
function reservaDesdePostulacion(p, via) {
  const casa = obtenerCasa(p.casa_id)
  const salida = sumarDias(p.turno, PARAMETROS.noches_max_temporada_alta)
  const tarifa = casa.tarifa_noche + (ADICIONAL_TARIFA[p.titular.calidad] ?? 0)
  const codigo = nuevoCodigo()
  const r = {
    codigo,
    titular_id: p.usuario_id,
    titular: p.titular,
    casa_id: p.casa_id,
    entrada: p.turno,
    salida,
    tarifa_noche: tarifa,
    total: tarifa * noches(p.turno, salida),
    ocupantes: [{ nombre: p.titular.nombre, parentesco: 'titular' }, ...Array.from({ length: p.personas - 1 }, (_, i) => ({ nombre: `Acompañante ${i + 1}`, parentesco: 'acompanante' }))],
    contacto: p.contacto,
    perro_asistencia: false,
    forma_pago: p.forma_pago.tipo === 'transferencia' ? { ...p.forma_pago, glosa: glosaTransferencia(casa, codigo) } : p.forma_pago,
    acepta_reglamento: true,
    estado: 'confirmada',
    origen: 'sorteo',
    postulacion: p.codigo,
    creada_en: ahora(),
    confirmada_por: via,
    confirmada_en: ahora(),
    notificaciones: [{ tipo: 'confirmacion', en: ahora(), detalle: 'Comprobante de reserva confirmada' }],
  }
  enviarInventario(r)
  estado.reservas.push(r)
  p.reserva = codigo
  return r
}

/**
 * Cierra la postulación y realiza el sorteo (Art. 6). La semilla queda
 * registrada para que el resultado se pueda reproducir y auditar. Crea las
 * reservas adjudicadas y comunica el resultado a cada postulante (Art. 6 c).
 */
export function realizarSorteo(actor) {
  const s = sorteoActual()
  if (!s || s.estado !== 'postulacion') return
  const semilla = Math.floor(Math.random() * 900000) + 100000
  const lista = s.postulaciones.filter((p) => p.estado === 'postulada')
  const resultados = sortear(lista, semilla)
  const porCodigo = new Map(lista.map((p) => [p.codigo, p]))
  for (const res of resultados) {
    const p = porCodigo.get(res.codigo)
    p.estado = res.resultado
    if (res.posicion) p.posicion = res.posicion
    if (res.motivo) p.motivo = res.motivo
    if (res.resultado === 'adjudicada') reservaDesdePostulacion(p, 'Sorteo de temporada alta')
    p.notificaciones.push({
      tipo: 'resultado',
      en: ahora(),
      detalle:
        res.resultado === 'adjudicada'
          ? `Resultado del sorteo: adjudicada (reserva ${p.reserva})`
          : res.resultado === 'espera'
            ? `Resultado del sorteo: lista de espera, lugar ${res.posicion}`
            : 'Resultado del sorteo: sin posibilidad (Art. 10 d)',
    })
  }
  s.estado = 'sorteado'
  s.semilla = semilla
  s.sorteado_en = ahora()
  s.sorteado_por = actor.nombre
  s.postulacion = { ...s.postulacion, cerrada_en: ahora() }
  guardar()
}

/** Ofrece el cupo liberado a la siguiente persona de la lista de espera (Art. 6 d). */
function ofrecerSiguiente(casaId, turno) {
  const s = sorteoActual()
  if (!s || s.estado !== 'sorteado') return
  const siguiente = s.postulaciones
    .filter((p) => p.casa_id === casaId && p.turno === turno && p.estado === 'espera')
    .sort((a, b) => a.posicion - b.posicion)[0]
  if (!siguiente) return
  const vence = new Date(Date.now() + HORAS_OFERTA * 3600000).toISOString().slice(0, 19)
  siguiente.estado = 'ofertada'
  siguiente.oferta = { enviada_en: ahora(), vence_en: vence }
  siguiente.notificaciones.push({ tipo: 'oferta', en: ahora(), detalle: `Se liberó el turno: tiene ${HORAS_OFERTA} horas para aceptarlo` })
}

/** La persona acepta o rechaza el cupo ofrecido. */
export function responderOferta(codigo, acepta) {
  const p = sorteoActual()?.postulaciones.find((x) => x.codigo === codigo)
  if (!p || p.estado !== 'ofertada') return null
  p.oferta.respondida_en = ahora()
  let reserva = null
  if (acepta) {
    p.estado = 'adjudicada'
    p.oferta.resultado = 'aceptada'
    reserva = reservaDesdePostulacion(p, 'Lista de espera del sorteo').codigo
  } else {
    p.estado = 'sin_cupo'
    p.oferta.resultado = 'rechazada'
    p.motivo = 'Rechazó el cupo ofrecido.'
    ofrecerSiguiente(p.casa_id, p.turno)
  }
  guardar()
  return reserva
}

/** Vence una oferta sin respuesta y pasa a la siguiente persona. En la maqueta, Oficina Central lo simula. */
export function vencerOferta(codigo) {
  const p = sorteoActual()?.postulaciones.find((x) => x.codigo === codigo)
  if (!p || p.estado !== 'ofertada') return
  p.estado = 'sin_cupo'
  p.oferta.resultado = 'vencida'
  p.motivo = `No respondió dentro de ${HORAS_OFERTA} horas.`
  ofrecerSiguiente(p.casa_id, p.turno)
  guardar()
}

/**
 * Turnos sin adjudicar después del sorteo: sin reserva vigente y sin nadie
 * esperando. Se publican como vacantes y se reservan directo, también por
 * funcionarios de otros servicios (Art. 6 c y Art. 9).
 */
export function turnosVacantes() {
  const s = sorteoActual()
  if (!s || s.estado !== 'sorteado') return []
  const lista = []
  for (const casa of listarCasas()) {
    for (const t of turnosDe(s.temporada)) {
      const tomado = estado.reservas.some((r) => r.casa_id === casa.id && r.origen === 'sorteo' && r.entrada === t.entrada && ocupa(r))
      const esperando = s.postulaciones.some((p) => p.casa_id === casa.id && p.turno === t.entrada && ['espera', 'ofertada'].includes(p.estado))
      if (!tomado && !esperando) lista.push({ casa, ...t })
    }
  }
  return lista
}

/** Noches de temporada alta liberadas para reserva directa (de una casa o de todas). */
export function nochesLiberadas(casaId) {
  const set = new Set()
  for (const v of turnosVacantes()) {
    if (casaId !== undefined && v.casa.id !== casaId) continue
    for (let d = v.entrada; d < v.salida; d = sumarDias(d, 1)) set.add(d)
  }
  return set
}

/* ---------- Reserva asistida (encargada regional u Oficina Central) ---------- */

const normalizar = (rut) => String(rut).replace(/[^0-9kK]/g, '').toUpperCase()
let personasBase = null

/**
 * Busca a una persona por RUT en la nómina de CONAF y Bienestar (en la
 * maqueta: la nómina de demostración y las personas ficticias de las semillas).
 * No devuelve funcionarios de otros servicios: esos datos se ingresan a mano.
 */
export function buscarPersona(rut) {
  const n = normalizar(rut)
  const demo = NOMINA.find((p) => p.perfil === 'solicitante' && normalizar(p.rut) === n)
  if (demo) return { ...demo, grupo_familiar: [] }
  personasBase ??= crearPersonas(210, aleatorio(20261020))
  const p = personasBase.find((x) => x.calidad !== 'otro_servicio' && normalizar(x.rut) === n)
  return p ? { ...p, perfil: 'solicitante', grupo_familiar: [] } : null
}

/** La persona acepta el reglamento (y autoriza el descuento) de una reserva registrada por otra persona. */
export function aceptarReserva(codigo) {
  const r = estado.reservas.find((x) => x.codigo === codigo)
  if (!r || !r.aceptacion_pendiente) return
  r.aceptacion_pendiente = false
  r.acepta_reglamento = true
  r.aceptada_en = ahora()
  if (r.forma_pago.tipo === 'planilla') r.forma_pago = { ...r.forma_pago, autorizacion: true }
  r.notificaciones.push({ tipo: 'aceptacion', en: ahora(), detalle: 'La persona aceptó el reglamento' + (r.forma_pago.tipo === 'planilla' ? ' y autorizó el descuento' : '') })
  guardar()
}
