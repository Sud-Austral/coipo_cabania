/**
 * Gráficos de los reportes de uso (solicitud §5.3 req. 21).
 *
 * Criterios aplicados:
 *  - Magnitud (ocupación por región, ranking de inmuebles): barras horizontales
 *    de un solo tono, porque el color no codifica identidad sino cantidad.
 *  - Identidad (reservas por motivo): tres tonos categóricos validados para
 *    daltonismo (ΔE 10,4 en protanopia; 23,9 en visión normal; contraste ≥ 3:1
 *    sobre fondo blanco).
 *  - El color nunca es el único indicador: cada barra lleva su etiqueta en el
 *    eje y su valor rotulado, y existe una vista de tabla equivalente.
 */

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { numero } from '../../lib/formato.js'

/** Un solo tono para magnitud; tres tonos validados para identidad. */
export const TONO_MAGNITUD = '#1f6b3b'
export const TONOS_MOTIVO = {
  medica: '#1f6b3b',
  laboral: '#eb6834',
  personal: '#2a78d6',
}

const EJE = { fill: '#64748b', fontSize: 12 }
const REJILLA = '#e2e8f0'

function Etiqueta({ activo, payload, sufijo }) {
  if (!activo || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-arena-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-slate-800">{d.nombre}</p>
      <p className="tabular mt-0.5 text-slate-600">
        {numero(payload[0].value)} {sufijo}
      </p>
      {d.reservas !== undefined && (
        <p className="tabular text-slate-500">{numero(d.reservas)} reservas</p>
      )}
    </div>
  )
}

/** Barras horizontales de un solo tono, para comparar magnitudes. */
export function BarrasMagnitud({ datos, clave = 'noches', sufijo = 'noches', alto = 320 }) {
  return (
    <ResponsiveContainer width="100%" height={alto}>
      <BarChart
        data={datos}
        layout="vertical"
        margin={{ top: 4, right: 44, bottom: 4, left: 4 }}
        barCategoryGap="28%"
      >
        <CartesianGrid horizontal={false} stroke={REJILLA} />
        <XAxis
          type="number"
          tick={EJE}
          axisLine={{ stroke: REJILLA }}
          tickLine={false}
          tickFormatter={numero}
        />
        <YAxis
          type="category"
          dataKey="nombre"
          tick={EJE}
          axisLine={false}
          tickLine={false}
          width={165}
        />
        <Tooltip
          cursor={{ fill: 'rgba(31,107,59,0.06)' }}
          content={<Etiqueta sufijo={sufijo} />}
        />
        <Bar
          dataKey={clave}
          fill={TONO_MAGNITUD}
          radius={[0, 4, 4, 0]}
          barSize={14}
          isAnimationActive={false}
        >
          <LabelList
            dataKey={clave}
            position="right"
            formatter={numero}
            style={{ fill: '#52514e', fontSize: 11 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Barras por motivo: tres categorías con tono propio y etiqueta directa. */
export function BarrasMotivo({ datos, alto = 200 }) {
  return (
    <ResponsiveContainer width="100%" height={alto}>
      <BarChart
        data={datos}
        layout="vertical"
        margin={{ top: 4, right: 44, bottom: 4, left: 4 }}
        barCategoryGap="30%"
      >
        <CartesianGrid horizontal={false} stroke={REJILLA} />
        <XAxis
          type="number"
          tick={EJE}
          axisLine={{ stroke: REJILLA }}
          tickLine={false}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="nombre"
          tick={EJE}
          axisLine={false}
          tickLine={false}
          width={165}
        />
        <Tooltip
          cursor={{ fill: 'rgba(31,107,59,0.06)' }}
          content={<Etiqueta sufijo="reservas" />}
        />
        <Bar dataKey="reservas" radius={[0, 4, 4, 0]} barSize={18} isAnimationActive={false}>
          {datos.map((d) => (
            <Cell key={d.motivo} fill={TONOS_MOTIVO[d.motivo] ?? TONO_MAGNITUD} />
          ))}
          <LabelList
            dataKey="reservas"
            position="right"
            style={{ fill: '#52514e', fontSize: 11 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
