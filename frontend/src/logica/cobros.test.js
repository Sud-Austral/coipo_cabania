// Escenarios de cobro y descuento sobre la capa api (sin navegador).
// Port de per_red_casas/frontend/qa/cobros-escenarios.mjs: los mismos 30 casos, uno por `it`,
// en el mismo orden (comparten estado: cada escenario parte de lo que dejó el anterior).
import { beforeAll, describe, expect, it } from 'vitest'

const mem = new Map()
globalThis.localStorage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), removeItem: (k) => mem.delete(k) }

let store, R, G, A, calcularTarifa
const actor = { nombre: 'QA', perfil: 'Oficina Central' }
const err = async (p) => { try { await p; return null } catch (e) { return e } }
const cuotasDe = (codigo) => store.nominas.flatMap((n) => n.items.filter((i) => i.reserva_codigo === codigo).map((i) => ({ periodo: n.periodo, ...i }))).sort((a, b) => (a.periodo < b.periodo ? -1 : 1))

// Reserva afiliada en curso, 3 noches
function nueva(codigo, monto, extra = {}) {
  store.reservas.push({ id: 9000 + store.reservas.length, codigo, inmueble_id: 1, usuario_id: 1, titular_nombre: 'Afiliado QA', titular_rut: '1-9', titular_es_afiliado: true, fecha_entrada: '2026-09-01', fecha_salida: '2026-09-04', motivo: 'personal', estado: 'en_curso', monto_total: monto, ocupantes: [], detalle_tarifa: [], historial_estados: [], ...extra })
}

const hoy = new Date()
const en = (dias) => new Date(hoy.getTime() + dias * 864e5).toISOString().slice(0, 10)
const en3 = en(3)
const en5 = en(5)
let p0, per2

beforeAll(async () => {
  ;({ store } = await import('./api/store.js'))
  R = await import('./api/reservas.js')
  G = await import('./api/gestion.js')
  A = await import('./api/administracion.js')
  ;({ calcularTarifa } = await import('./lib/tarifas.js'))
})

describe('1. Cuotas repartidas en meses', () => {
  it('check-out genera 1 cuota por el total', async () => {
    nueva('QA-1', 100000)
    await R.registrarEstadia('QA-1', 'check_out', { actor })
    expect(cuotasDe('QA-1').length).toBe(1)
  })
  it('3 cuotas tras elegir 3', async () => {
    await R.seleccionarDescuentoPlanilla('QA-1', { cuotas: 3, actor })
    p0 = cuotasDe('QA-1')[0].periodo
    expect(cuotasDe('QA-1').length).toBe(3)
  })
  it('cuotas en 3 meses distintos', () => {
    expect(new Set(cuotasDe('QA-1').map((c) => c.periodo)).size).toBe(3)
  })
  it('suma de cuotas = total (100000)', () => {
    expect(cuotasDe('QA-1').reduce((s, c) => s + c.monto, 0)).toBe(100000)
  })
  it('redondeo a la última cuota', () => {
    expect(cuotasDe('QA-1').map((c) => c.monto).join()).toBe('33333,33333,33334')
  })
})

describe('2. Planilla bloquea transferencia', () => {
  it('con planilla elegida no se puede informar transferencia', async () => {
    expect((await err(R.informarPagoTransferencia('QA-1', { actor })))?.status).toBe(409)
  })
})

describe('3. Transferencia informada retiene la cuota', () => {
  it('cuota con transferencia informada aparece retenida', async () => {
    nueva('QA-2', 50000)
    await R.registrarEstadia('QA-2', 'check_out', { actor })
    await R.informarPagoTransferencia('QA-2', { actor })
    per2 = cuotasDe('QA-2')[0].periodo
    const nom = (await G.getNominas()).items.find((n) => n.periodo === per2)
    expect(nom.items.find((i) => i.reserva_codigo === 'QA-2').retenido_por_transferencia).toBe(true)
  })
  it('marcar "informado" no toca cuota retenida', async () => {
    await G.marcarNomina(per2, 'informado', actor)
    expect(cuotasDe('QA-2')[0].estado).toBe('pendiente')
  })
  it('con transferencia informada no se puede elegir planilla', async () => {
    expect((await err(R.seleccionarDescuentoPlanilla('QA-2', { cuotas: 1, actor })))?.status).toBe(409)
  })
  it('transferencia confirmada sale de la nómina', async () => {
    await R.confirmarPagoTransferencia('QA-2', actor)
    const nom = (await G.getNominas()).items.find((n) => n.periodo === per2)
    expect(nom.items.some((i) => i.reserva_codigo === 'QA-2')).toBe(false)
  })
})

describe('4. Cobro ya informado', () => {
  it('cuota informada a Remuneraciones', async () => {
    nueva('QA-3', 30000)
    await R.registrarEstadia('QA-3', 'check_out', { actor })
    await G.marcarNomina(cuotasDe('QA-3')[0].periodo, 'informado', actor)
    expect(cuotasDe('QA-3')[0].estado).toBe('informado')
  })
  it('cobro ya informado bloquea transferencia (sin doble cobro)', async () => {
    expect((await err(R.informarPagoTransferencia('QA-3', { actor })))?.status).toBe(409)
  })
  it('cobro ya informado bloquea cambio de cuotas', async () => {
    expect((await err(R.seleccionarDescuentoPlanilla('QA-3', { cuotas: 3, actor })))?.status).toBe(409)
  })
})

describe('5. Anulación tardía de afiliado', () => {
  it('anulación tardía genera cuota en nómina', async () => {
    nueva('QA-4', 40000, { estado: 'confirmada', fecha_entrada: en3, fecha_salida: en5 })
    await R.anularReserva('QA-4', { actor })
    const c = cuotasDe('QA-4')
    expect(c.length === 1 && c[0].monto === 40000 && c[0].concepto === 'Cancelación con poco aviso').toBe(true)
  })
})

describe('6. Emergencia (fuerza mayor) aprobada', () => {
  it('fuerza mayor pendiente no genera cuota', async () => {
    nueva('QA-5', 60000, { estado: 'confirmada', fecha_entrada: en3, fecha_salida: en5 })
    await R.anularReserva('QA-5', { fuerzaMayor: true, motivoFuerzaMayor: 'x', actor })
    expect(cuotasDe('QA-5').length).toBe(0)
  })
  it('fuerza mayor aprobada genera cuota por 1 día (30000)', async () => {
    await R.resolverFuerzaMayor('QA-5', { aprobar: true, fundamento: 'ok', actor })
    const c = cuotasDe('QA-5')
    expect(c.length === 1 && c[0].monto === 30000).toBe(true)
  })
})

describe('7. Externo', () => {
  it('usuario externo no entra a nómina de planilla', async () => {
    nueva('QA-6', 45000, { titular_es_afiliado: false })
    await R.registrarEstadia('QA-6', 'check_out', { actor })
    expect(cuotasDe('QA-6').length).toBe(0)
  })
})

describe('8. Vista de cobros (solo lectura)', () => {
  let vista
  const de = (c) => vista.find((x) => x.reserva_codigo === c)
  beforeAll(async () => { vista = (await A.getCobros()).items })
  it('vista de cobros sin duplicados', () => {
    const cods = vista.map((c) => c.reserva_codigo)
    expect(cods.length).toBe(new Set(cods).size)
  })
  it('QA-1 en planilla con 3 cuotas', () => {
    expect(de('QA-1')?.cuotas.length === 3 && de('QA-1')?.situacion === 'en_planilla').toBe(true)
  })
  it('QA-2 pagado por transferencia, saldo 0', () => {
    expect(de('QA-2')?.situacion === 'pagado' && de('QA-2')?.saldo === 0).toBe(true)
  })
  it('externo QA-6 por pagar con saldo 45000', () => {
    expect(de('QA-6')?.situacion === 'por_pagar' && de('QA-6')?.saldo === 45000).toBe(true)
  })
  it('anulación tardía aparece en planilla', () => {
    expect(de('QA-4')?.monto === 40000 && de('QA-4')?.situacion === 'en_planilla').toBe(true)
  })
  it('fuerza mayor aprobada por 1 día', () => {
    expect(!de('QA-5') || de('QA-5').monto === 30000).toBe(true)
  })
  it('transferencia informada aparece por confirmar sin recargar nada', async () => {
    nueva('QA-7', 20000)
    await R.registrarEstadia('QA-7', 'check_out', { actor })
    await R.informarPagoTransferencia('QA-7', { actor })
    expect((await A.getCobros()).items.find((x) => x.reserva_codigo === 'QA-7')?.situacion).toBe('transferencia_por_confirmar')
  })
  it('cuota única descontada deja el cobro pagado', async () => {
    await G.marcarNomina(cuotasDe('QA-3')[0].periodo, 'descontado', actor)
    expect((await A.getCobros()).items.find((x) => x.reserva_codigo === 'QA-3')?.situacion).toBe('pagado')
  })
  it('primera cuota en el mes del check-out', () => {
    expect(p0).toBe(new Date().toISOString().slice(0, 7))
  })
})

describe('9. Emergencia con parámetro de días', () => {
  it('emergencia con parámetro 2 días cobra 2 noches reales', async () => {
    store.parametros = { ...(store.parametros ?? {}), cobro_fuerza_mayor_dias: 2 }
    nueva('QA-8', 90000, { estado: 'confirmada', inmueble_id: 2, fecha_entrada: en3, fecha_salida: en(6), ocupantes: [{ nombre: 'A', rut: '1-9', parentesco: 'titular' }] })
    await R.anularReserva('QA-8', { fuerzaMayor: true, motivoFuerzaMayor: 'x', actor })
    await R.resolverFuerzaMayor('QA-8', { aprobar: true, fundamento: 'ok', actor })
    const r8 = store.reservas.find((r) => r.codigo === 'QA-8')
    store.parametros.cobro_fuerza_mayor_dias = 1
    expect(r8.monto_total === 60000 && r8.detalle_tarifa[0].cantidad === 2).toBe(true)
  })
})

describe('10. Afiliado y socio del sindicato', () => {
  it('grupo sindicato cobra tarifa sindicato', () => {
    const cfg = structuredClone(store.tarifas_config); cfg.huespedes.sindicato = { baja: 6000, alta: 7000 }
    const t = calcularTarifa({ inmueble: { tipo: 'huespedes' }, fechaEntrada: '2026-10-20', fechaSalida: '2026-10-21', motivo: 'personal', ocupantes: [{ parentesco: 'titular' }, { parentesco: 'conyuge' }], temporadas: store.temporadas, aplicaTarifaSindicato: true, tarifasConfig: cfg })
    expect(t.lineas.length === 1 && t.lineas[0].concepto.startsWith('Tarifa sindicato') && t.total === 12000).toBe(true)
  })
})

describe('11. Cuota puntual', () => {
  it('cuota no descontada vuelve a pendiente para reenviar', async () => {
    nueva('QA-9', 25000)
    await R.registrarEstadia('QA-9', 'check_out', { actor })
    const c9 = cuotasDe('QA-9')[0]
    await G.marcarNomina(c9.periodo, 'informado', actor)
    await G.marcarCuota(c9.periodo, 'QA-9', 1, 'no_descontado', actor)
    expect(cuotasDe('QA-9')[0].estado).toBe('pendiente')
  })
  it('cuota puntual marcada como descontada', async () => {
    const c9 = cuotasDe('QA-9')[0]
    await G.marcarNomina(c9.periodo, 'informado', actor)
    await G.marcarCuota(c9.periodo, 'QA-9', 1, 'descontado', actor)
    expect(cuotasDe('QA-9')[0].estado).toBe('descontado')
  })
})
