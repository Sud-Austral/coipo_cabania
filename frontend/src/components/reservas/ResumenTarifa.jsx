import { Info } from 'lucide-react'
import { pesos } from '../../lib/formato.js'
import { Tabla, Encabezado, Cuerpo, Fila, Celda } from '../ui/Tabla.jsx'

/**
 * Desglose del cobro estimado (solicitud §5.1 req. 9).
 * Se reutiliza en el asistente de reserva, el comprobante y el detalle que ve
 * la encargada regional.
 */
export function ResumenTarifa({ tarifa, compacto = false }) {
  if (!tarifa || !tarifa.lineas?.length) {
    return (
      <p className="text-sm text-slate-500">
        Seleccione fechas y ocupantes para ver el detalle del cobro.
      </p>
    )
  }

  const hayNotaSupuesto = tarifa.lineas.some((l) => l.supuesto)

  if (compacto) {
    return (
      <div>
        <ul className="divide-y divide-arena-200">
          {tarifa.lineas.map((l) => (
            <li key={l.concepto} className="flex items-start justify-between gap-3 py-2">
              <span className="text-sm text-slate-700">
                {l.concepto}
                <span className="block text-xs text-slate-500">{l.detalle_cantidad}</span>
              </span>
              <span className="tabular text-sm font-medium whitespace-nowrap">
                {pesos(l.subtotal)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex items-center justify-between border-t-2 border-verde-600 pt-2.5">
          <span className="font-semibold text-verde-900">Total estimado</span>
          <span className="tabular text-lg font-semibold text-verde-900">
            {pesos(tarifa.total)}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Tabla>
        <Encabezado
          columnas={[
            { clave: 'c', titulo: 'Concepto' },
            { clave: 'd', titulo: 'Cantidad' },
            { clave: 'v', titulo: 'Valor unitario', alineacion: 'derecha' },
            { clave: 's', titulo: 'Subtotal', alineacion: 'derecha' },
          ]}
        />
        <Cuerpo>
          {tarifa.lineas.map((l) => (
            <Fila key={l.concepto}>
              <Celda>
                {l.concepto}
                {l.supuesto && <span className="ml-1 text-amber-600">*</span>}
              </Celda>
              <Celda className="text-slate-600">{l.detalle_cantidad}</Celda>
              <Celda numerica>{pesos(l.valor_unitario)}</Celda>
              <Celda numerica className="font-medium">
                {pesos(l.subtotal)}
              </Celda>
            </Fila>
          ))}
          <Fila className="bg-verde-50">
            <Celda colSpan={3} className="font-semibold text-verde-900">
              Total estimado por {tarifa.noches} {tarifa.noches === 1 ? 'noche' : 'noches'}
              {tarifa.nombre_temporada && (
                <span className="ml-1 font-normal text-slate-600">
                  · {tarifa.nombre_temporada}
                </span>
              )}
            </Celda>
            <Celda numerica className="text-base font-semibold text-verde-900">
              {pesos(tarifa.total)}
            </Celda>
          </Fila>
        </Cuerpo>
      </Tabla>

      <p className="mt-2 flex items-start gap-1.5 text-xs text-slate-500">
        <Info size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span>
          Cobro estimado con tarifas de referencia de la maqueta, pendientes de validación.
          {hayNotaSupuesto &&
            ' (*) El adicional por acompañante no beneficiario en casas de veraneo es un supuesto por confirmar con Bienestar.'}
        </span>
      </p>
    </div>
  )
}
