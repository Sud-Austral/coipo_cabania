// Pruebas del motor de tarifas (logica/lib/tarifas.js) con las tarifas y temporadas de maqueta.
import { describe, expect, it } from 'vitest'
import { calcularTarifa, categoriaOcupante, cobroPorDesistimiento, contarNoches, temporadaDe } from './lib/tarifas.js'
import { tarifas } from './fixtures/tarifas.js'
import { temporadas } from './fixtures/temporadas.js'

const huespedes = { tipo: 'huespedes', capacidad_maxima: 6 }
const veraneo = { tipo: 'veraneo', capacidad_maxima: 8 }
const t = (args) => calcularTarifa({ temporadas, tarifasConfig: tarifas, ...args })

describe('noches y temporadas', () => {
  it('cuenta noches entre fechas', () => {
    expect(contarNoches('2026-08-14', '2026-08-17')).toBe(3)
    expect(contarNoches('2026-08-17', '2026-08-14')).toBe(0)
    expect(contarNoches(null, '2026-08-14')).toBe(0)
  })
  it('vacaciones de invierno son alta; octubre es baja', () => {
    expect(temporadaDe('2026-07-15', temporadas)).toBe('alta')
    expect(temporadaDe('2026-10-20', temporadas)).toBe('baja')
  })
})

describe('categoría del ocupante', () => {
  it('titular, cónyuge e hijo de un afiliado pagan tarifa de afiliado', () => {
    expect(['titular', 'conyuge', 'hijo'].map((p) => categoriaOcupante(p, true))).toEqual(['afiliado', 'afiliado', 'afiliado'])
  })
  it('otro familiar o acompañante paga como externo', () => {
    expect(categoriaOcupante('familiar', true)).toBe('externo')
    expect(categoriaOcupante('acompanante', true)).toBe('externo')
  })
  it('si el titular no es afiliado, todos pagan como externo', () => {
    expect(categoriaOcupante('titular', false)).toBe('externo')
  })
  it('socio del sindicato', () => {
    expect(categoriaOcupante('titular', true, true)).toBe('sindicato')
  })
})

describe('casa de huéspedes: por persona y por noche', () => {
  it('afiliado con cónyuge, 2 noches en baja = 2 × 2 × 8.000', () => {
    const r = t({ inmueble: huespedes, fechaEntrada: '2026-10-20', fechaSalida: '2026-10-22', ocupantes: [{ parentesco: 'titular' }, { parentesco: 'conyuge' }] })
    expect(r.total).toBe(32000)
    expect(r.temporada).toBe('baja')
  })
  it('acompañante de un afiliado se cobra con tarifa externa', () => {
    const r = t({ inmueble: huespedes, fechaEntrada: '2026-10-20', fechaSalida: '2026-10-21', ocupantes: [{ parentesco: 'titular' }, { parentesco: 'acompanante' }] })
    expect(r.total).toBe(8000 + 15000)
    expect(r.lineas).toHaveLength(2)
  })
  it('usuario no afiliado: tarifa externa', () => {
    const r = t({ inmueble: huespedes, fechaEntrada: '2026-10-20', fechaSalida: '2026-10-21', titularEsAfiliado: false, ocupantes: [{ parentesco: 'titular' }] })
    expect(r.total).toBe(15000)
  })
  it('motivo médico: tarifa preferente para los beneficiarios', () => {
    const r = t({ inmueble: huespedes, fechaEntrada: '2026-10-20', fechaSalida: '2026-10-21', motivo: 'medica', ocupantes: [{ parentesco: 'titular' }, { parentesco: 'hijo' }, { parentesco: 'familiar' }] })
    expect(r.total).toBe(5000 * 2 + 15000)
  })
  it('temporada alta de invierno', () => {
    const r = t({ inmueble: huespedes, fechaEntrada: '2026-07-14', fechaSalida: '2026-07-16', ocupantes: [{ parentesco: 'titular' }] })
    expect(r.total).toBe(2 * 10000)
    expect(r.temporada).toBe('alta')
  })
})

describe('casa de veraneo: valor fijo por noche', () => {
  it('3 noches en baja, sin recargo por personas', () => {
    const uno = t({ inmueble: veraneo, fechaEntrada: '2026-10-20', fechaSalida: '2026-10-23', ocupantes: [{ parentesco: 'titular' }] })
    const seis = t({ inmueble: veraneo, fechaEntrada: '2026-10-20', fechaSalida: '2026-10-23', ocupantes: Array.from({ length: 6 }, () => ({ parentesco: 'acompanante' })) })
    expect(uno.total).toBe(90000)
    expect(seis.total).toBe(90000)
  })
  it('estadía que cruza al verano se cobra por tramo (mixta)', () => {
    const r = t({ inmueble: veraneo, fechaEntrada: '2026-12-13', fechaSalida: '2026-12-17', ocupantes: [{ parentesco: 'titular' }] })
    expect(r.temporada).toBe('mixta')
    expect(r.total).toBe(2 * 30000 + 2 * 45000)
  })
  it('sin noches no hay cobro', () => {
    expect(t({ inmueble: veraneo, fechaEntrada: '2026-10-20', fechaSalida: '2026-10-20', ocupantes: [] }).total).toBe(0)
  })
})

describe('cancelación', () => {
  it('con 7 días o más de aviso no tiene cobro', () => {
    expect(cobroPorDesistimiento({ montoTotal: 90000, noches: 3, diasAviso: 7 }).monto).toBe(0)
  })
  it('con poco aviso se cobra el total', () => {
    expect(cobroPorDesistimiento({ montoTotal: 90000, noches: 3, diasAviso: 3 }).monto).toBe(90000)
  })
  it('emergencia: valor de los días de limpieza', () => {
    expect(cobroPorDesistimiento({ montoTotal: 90000, noches: 3, diasAviso: 1, fuerzaMayor: true }).monto).toBe(30000)
    expect(cobroPorDesistimiento({ montoTotal: 90000, noches: 3, diasAviso: 1, fuerzaMayor: true, diasCobroFuerzaMayor: 2 }).monto).toBe(60000)
  })
  it('el umbral de días sin cobro es configurable', () => {
    expect(cobroPorDesistimiento({ montoTotal: 90000, noches: 3, diasAviso: 7, diasSinCobro: 10 }).monto).toBe(90000)
  })
})
