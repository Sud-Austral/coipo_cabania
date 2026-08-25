/**
 * Motor de cálculo de tarifas — MÓDULO PURO.
 *
 * No importa React, ni el store, ni localStorage: recibe datos y devuelve el
 * desglose. Esta misma lógica debe portarse al backend FastAPI en la fase 2,
 * por eso se mantiene aislada y sin dependencias del navegador.
 *
 * Reglas implementadas (solicitud de desarrollo §5.5):
 *  1. Casa de huéspedes: tarifa por persona y por noche según categoría.
 *  2. Casa de veraneo: tarifa fija por noche (grupo familiar) + adicional por
 *     cada acompañante no beneficiario.
 *  3. Tarifa de afiliado para titular, cónyuge/conviviente civil e hijos
 *     inscritos; los demás pagan tarifa de usuario externo.
 *  4. Motivo médico: tarifa preferente para los ocupantes beneficiarios.
 */

import { addDays, differenceInCalendarDays, parseISO, isBefore, isWithinInterval } from 'date-fns'
import { tarifas, PARENTESCOS_BENEFICIARIOS } from '../fixtures/tarifas.js'

/** Noches entre dos fechas ISO ('2026-08-14' → '2026-08-17' = 3 noches). */
export function contarNoches(fechaEntrada, fechaSalida) {
  if (!fechaEntrada || !fechaSalida) return 0
  const noches = differenceInCalendarDays(parseISO(fechaSalida), parseISO(fechaEntrada))
  return noches > 0 ? noches : 0
}

/** Determina si una fecha cae en temporada 'alta' o 'baja'. */
export function temporadaDe(fechaISO, temporadas) {
  if (!fechaISO) return 'baja'
  const fecha = parseISO(fechaISO)
  const alta = temporadas.find(
    (t) =>
      t.tipo === 'alta' &&
      isWithinInterval(fecha, { start: parseISO(t.desde), end: parseISO(t.hasta) }),
  )
  return alta ? 'alta' : 'baja'
}

/** Nombre de la temporada que aplica, para mostrarlo en el desglose. */
export function nombreTemporadaDe(fechaISO, temporadas) {
  if (!fechaISO) return null
  const fecha = parseISO(fechaISO)
  return (
    temporadas.find((t) =>
      isWithinInterval(fecha, { start: parseISO(t.desde), end: parseISO(t.hasta) }),
    )?.nombre ?? null
  )
}

/**
 * Categoría tarifaria de un ocupante.
 * Si el titular no es afiliado vigente, TODOS pagan tarifa de usuario externo
 * (solicitud §5.5 regla 5).
 */
export function categoriaOcupante(parentesco, titularEsAfiliado) {
  if (!titularEsAfiliado) return 'externo'
  return PARENTESCOS_BENEFICIARIOS.includes(parentesco) ? 'afiliado' : 'externo'
}

/**
 * Calcula el detalle del cobro de una reserva.
 *
 * @returns {{noches:number, temporada:string, nombre_temporada:string|null,
 *            lineas:Array, total:number}}
 */
export function calcularTarifa({
  inmueble,
  fechaEntrada,
  fechaSalida,
  motivo = 'personal',
  ocupantes = [],
  temporadas = [],
  titularEsAfiliado = true,
  tarifasConfig = tarifas,
}) {
  const noches = contarNoches(fechaEntrada, fechaSalida)
  if (!inmueble || noches === 0) {
    return { noches, temporada: 'baja', nombre_temporada: null, lineas: [], total: 0 }
  }
  const nochesPorTemporada = { alta: 0, baja: 0 }
  const nombres = new Set()
  for (let fecha = parseISO(fechaEntrada); fechaSalida && isBefore(fecha, parseISO(fechaSalida)); fecha = addDays(fecha, 1)) {
    const iso = fecha.toISOString().slice(0, 10)
    nochesPorTemporada[temporadaDe(iso, temporadas)] += 1
    const nombre = nombreTemporadaDe(iso, temporadas)
    if (nombre) nombres.add(nombre)
  }
  const temporada = nochesPorTemporada.alta && nochesPorTemporada.baja ? 'mixta' : nochesPorTemporada.alta ? 'alta' : 'baja'
  const nombre_temporada = [...nombres].join(' / ') || null
  const lineas = []

  const categorias = ocupantes.map((o) =>
    categoriaOcupante(o.parentesco, titularEsAfiliado),
  )

  if (inmueble.tipo === 'huespedes') {
    const beneficiarios = categorias.filter((c) => c === 'afiliado').length
    const externos = categorias.filter((c) => c === 'externo').length

    ;['baja', 'alta'].forEach((tipoTemporada) => {
      const nochesTramo = nochesPorTemporada[tipoTemporada]
      if (!nochesTramo) return
      if (beneficiarios > 0) {
        const medica = motivo === 'medica'
        const valor = medica ? tarifasConfig.huespedes.afiliado_medica[tipoTemporada] : tarifasConfig.huespedes.afiliado[tipoTemporada]
        lineas.push({
          concepto: `${medica ? 'Tarifa afiliado preferente (motivo médico)' : 'Tarifa afiliado'} · temporada ${tipoTemporada}`,
          cantidad: beneficiarios * nochesTramo,
          detalle_cantidad: `${beneficiarios} ${beneficiarios === 1 ? 'persona' : 'personas'} × ${nochesTramo} ${nochesTramo === 1 ? 'noche' : 'noches'}`,
          valor_unitario: valor,
          subtotal: valor * beneficiarios * nochesTramo,
        })
      }
      if (externos > 0) {
        const valor = tarifasConfig.huespedes.externo[tipoTemporada]
        lineas.push({
          concepto: `Tarifa usuario externo · temporada ${tipoTemporada}`,
          cantidad: externos * nochesTramo,
          detalle_cantidad: `${externos} ${externos === 1 ? 'persona' : 'personas'} × ${nochesTramo} ${nochesTramo === 1 ? 'noche' : 'noches'}`,
          valor_unitario: valor,
          subtotal: valor * externos * nochesTramo,
        })
      }
    })
  } else {
    const externos = categorias.filter((c) => c === 'externo').length
    ;['baja', 'alta'].forEach((tipoTemporada) => {
      const nochesTramo = nochesPorTemporada[tipoTemporada]
      if (!nochesTramo) return
      const valorFijo = tarifasConfig.veraneo.fija[tipoTemporada]
      lineas.push({
        concepto: `Tarifa fija casa de veraneo · temporada ${tipoTemporada}`,
        cantidad: nochesTramo,
        detalle_cantidad: `${nochesTramo} ${nochesTramo === 1 ? 'noche' : 'noches'}`,
        valor_unitario: valorFijo,
        subtotal: valorFijo * nochesTramo,
      })
      if (externos > 0) {
        const valor = tarifasConfig.veraneo.adicional_externo[tipoTemporada]
        lineas.push({
          concepto: `Adicional por acompañante no beneficiario · temporada ${tipoTemporada}`,
          cantidad: externos * nochesTramo,
          detalle_cantidad: `${externos} ${externos === 1 ? 'persona' : 'personas'} × ${nochesTramo} ${nochesTramo === 1 ? 'noche' : 'noches'}`,
          valor_unitario: valor,
          subtotal: valor * externos * nochesTramo,
          supuesto: true,
        })
      }
    })
  }

  const total = lineas.reduce((suma, l) => suma + l.subtotal, 0)
  return { noches, temporada, nombre_temporada, lineas, total }
}

/**
 * Cobro que corresponde al anular una reserva (solicitud §5.5 regla 4).
 * @param diasAviso  días entre la anulación y la fecha de entrada
 */
export function cobroPorDesistimiento({ montoTotal, noches, diasAviso, fuerzaMayor, diasSinCobro = 7, diasCobroFuerzaMayor = 1 }) {
  if (fuerzaMayor) {
    const valorDia = noches > 0 ? Math.round(montoTotal / noches) : 0
    return {
      monto: valorDia * diasCobroFuerzaMayor,
      glosa: `Fuerza mayor justificada: se cobran ${diasCobroFuerzaMayor} día(s) por gastos de limpieza.`,
    }
  }
  if (diasAviso >= diasSinCobro) {
    return { monto: 0, glosa: 'Anulación avisada con más de una semana: sin cobro.' }
  }
  return {
    monto: montoTotal,
    glosa: 'Anulación con menos de una semana de aviso: se cobra el total de los días reservados.',
  }
}
