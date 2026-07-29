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

import { differenceInCalendarDays, parseISO, isWithinInterval } from 'date-fns'
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
}) {
  const noches = contarNoches(fechaEntrada, fechaSalida)
  const temporada = temporadaDe(fechaEntrada, temporadas)
  const nombre_temporada = nombreTemporadaDe(fechaEntrada, temporadas)
  const lineas = []

  if (!inmueble || noches === 0) {
    return { noches, temporada, nombre_temporada, lineas, total: 0 }
  }

  const categorias = ocupantes.map((o) =>
    categoriaOcupante(o.parentesco, titularEsAfiliado),
  )

  if (inmueble.tipo === 'huespedes') {
    const beneficiarios = categorias.filter((c) => c === 'afiliado').length
    const externos = categorias.filter((c) => c === 'externo').length

    if (beneficiarios > 0) {
      const medica = motivo === 'medica'
      const valor = medica
        ? tarifas.huespedes.afiliado_medica[temporada]
        : tarifas.huespedes.afiliado[temporada]
      lineas.push({
        concepto: medica
          ? 'Tarifa afiliado preferente (motivo médico), por persona/noche'
          : 'Tarifa afiliado, por persona/noche',
        cantidad: beneficiarios * noches,
        detalle_cantidad: `${beneficiarios} ${beneficiarios === 1 ? 'persona' : 'personas'} × ${noches} ${noches === 1 ? 'noche' : 'noches'}`,
        valor_unitario: valor,
        subtotal: valor * beneficiarios * noches,
      })
    }

    if (externos > 0) {
      const valor = tarifas.huespedes.externo[temporada]
      lineas.push({
        concepto: 'Tarifa usuario externo, por persona/noche',
        cantidad: externos * noches,
        detalle_cantidad: `${externos} ${externos === 1 ? 'persona' : 'personas'} × ${noches} ${noches === 1 ? 'noche' : 'noches'}`,
        valor_unitario: valor,
        subtotal: valor * externos * noches,
      })
    }
  } else {
    // Casa de veraneo: valor fijo por noche para el grupo familiar directo.
    const valorFijo = tarifas.veraneo.fija[temporada]
    lineas.push({
      concepto: `Tarifa fija casa de veraneo (temporada ${temporada}), por noche`,
      cantidad: noches,
      detalle_cantidad: `${noches} ${noches === 1 ? 'noche' : 'noches'}`,
      valor_unitario: valorFijo,
      subtotal: valorFijo * noches,
    })

    const externos = categorias.filter((c) => c === 'externo').length
    if (externos > 0) {
      const valor = tarifas.veraneo.adicional_externo[temporada]
      lineas.push({
        concepto: 'Adicional por acompañante no beneficiario, por persona/noche',
        cantidad: externos * noches,
        detalle_cantidad: `${externos} ${externos === 1 ? 'persona' : 'personas'} × ${noches} ${noches === 1 ? 'noche' : 'noches'}`,
        valor_unitario: valor,
        subtotal: valor * externos * noches,
        supuesto: true,
      })
    }
  }

  const total = lineas.reduce((suma, l) => suma + l.subtotal, 0)
  return { noches, temporada, nombre_temporada, lineas, total }
}

/**
 * Cobro que corresponde al anular una reserva (solicitud §5.5 regla 4).
 * @param diasAviso  días entre la anulación y la fecha de entrada
 */
export function cobroPorDesistimiento({ montoTotal, noches, diasAviso, fuerzaMayor }) {
  if (fuerzaMayor) {
    const valorDia = noches > 0 ? Math.round(montoTotal / noches) : 0
    return {
      monto: valorDia,
      glosa: 'Fuerza mayor justificada: se cobra un día por gastos de limpieza.',
    }
  }
  if (diasAviso >= 7) {
    return { monto: 0, glosa: 'Anulación avisada con más de una semana: sin cobro.' }
  }
  return {
    monto: montoTotal,
    glosa: 'Anulación con menos de una semana de aviso: se cobra el total de los días reservados.',
  }
}
