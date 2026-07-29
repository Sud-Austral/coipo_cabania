import { useEffect, useState } from 'react'
import {
  BedDouble,
  Building2,
  CalendarX,
  ClipboardList,
  Coins,
  Download,
  Table2,
} from 'lucide-react'
import { getReportes } from '../../api/gestion.js'
import { numero, pesos } from '../../lib/formato.js'
import {
  BarrasMagnitud,
  BarrasMotivo,
  TONOS_MOTIVO,
} from '../../components/charts/graficos.jsx'
import { Tabla, Encabezado, Cuerpo, Fila, Celda } from '../../components/ui/Tabla.jsx'
import {
  Boton,
  Cargando,
  StatCard,
  Tarjeta,
  TituloSeccion,
} from '../../components/ui/Elementos.jsx'

/** Descarga real de un CSV construido en el navegador (sin backend). */
function descargarCSV(nombre, filas) {
  const contenido = filas.map((f) => f.map((c) => `"${String(c ?? '')}"`).join(';')).join('\n')
  const blob = new Blob(['﻿' + contenido], { type: 'text/csv;charset=utf-8;' })
  const enlace = document.createElement('a')
  enlace.href = URL.createObjectURL(blob)
  enlace.download = nombre
  enlace.click()
  URL.revokeObjectURL(enlace.href)
}

export function Reportes() {
  const [datos, setDatos] = useState(null)
  const [verTabla, setVerTabla] = useState(false)

  useEffect(() => {
    getReportes().then(setDatos)
  }, [])

  if (!datos) return <Cargando texto="Calculando los reportes de uso…" />

  const { totales, por_region, por_motivo, ranking_inmuebles } = datos

  const exportar = () => {
    const filas = [
      ['Reporte de uso — Red de Casas de Huéspedes y Veraneo'],
      ['Datos de maqueta, no oficiales'],
      [],
      ['Ocupación por región'],
      ['Región', 'Reservas', 'Noches', 'Ingresos'],
      ...por_region.map((r) => [r.nombre, r.reservas, r.noches, r.ingresos]),
      [],
      ['Reservas por motivo'],
      ['Motivo', 'Reservas'],
      ...por_motivo.map((m) => [m.nombre, m.reservas]),
      [],
      ['Inmuebles más demandados'],
      ['Inmueble', 'Localidad', 'Reservas', 'Noches'],
      ...ranking_inmuebles.map((i) => [i.nombre, i.localidad, i.reservas, i.noches]),
    ]
    descargarCSV('reporte_uso_maqueta.csv', filas)
  }

  return (
    <>
      <TituloSeccion
        titulo="Reportes de uso"
        descripcion="Ocupación, motivos de reserva e inmuebles más demandados en toda la red. Base para la fijación anual de tarifas y la planificación de mantenciones."
        acciones={
          <>
            <Boton variante="neutro" onClick={() => setVerTabla((v) => !v)}>
              <Table2 size={16} aria-hidden="true" />
              {verTabla ? 'Ver gráficos' : 'Ver como tabla'}
            </Boton>
            <Boton variante="secundario" onClick={exportar}>
              <Download size={16} aria-hidden="true" />
              Exportar CSV
            </Boton>
          </>
        }
      />

      {/* Cifras principales */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard etiqueta="Inmuebles" valor={totales.inmuebles} icono={Building2} />
        <StatCard etiqueta="Reservas" valor={numero(totales.reservas)} icono={ClipboardList} />
        <StatCard etiqueta="Noches vendidas" valor={numero(totales.noches)} icono={BedDouble} />
        <StatCard
          etiqueta="Ingresos por cobros"
          valor={pesos(totales.ingresos)}
          icono={Coins}
        />
        <StatCard
          etiqueta="Anulaciones"
          valor={totales.anuladas}
          detalle="En el período"
          icono={CalendarX}
        />
        <StatCard
          etiqueta="Por revisar"
          valor={totales.pendientes}
          detalle={`${totales.lista_espera} en lista de espera`}
          icono={ClipboardList}
        />
      </div>

      {verTabla ? (
        <div className="space-y-6">
          <section>
            <h2 className="mb-2 text-lg font-semibold text-verde-900">Ocupación por región</h2>
            <Tabla>
              <Encabezado
                columnas={[
                  { clave: 'r', titulo: 'Región' },
                  { clave: 'res', titulo: 'Reservas', alineacion: 'derecha' },
                  { clave: 'n', titulo: 'Noches', alineacion: 'derecha' },
                  { clave: 'i', titulo: 'Ingresos', alineacion: 'derecha' },
                ]}
              />
              <Cuerpo>
                {por_region.map((r) => (
                  <Fila key={r.region}>
                    <Celda>{r.nombre}</Celda>
                    <Celda numerica>{numero(r.reservas)}</Celda>
                    <Celda numerica>{numero(r.noches)}</Celda>
                    <Celda numerica>{pesos(r.ingresos)}</Celda>
                  </Fila>
                ))}
              </Cuerpo>
            </Tabla>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-verde-900">Reservas por motivo</h2>
            <Tabla>
              <Encabezado
                columnas={[
                  { clave: 'm', titulo: 'Motivo' },
                  { clave: 'res', titulo: 'Reservas', alineacion: 'derecha' },
                ]}
              />
              <Cuerpo>
                {por_motivo.map((m) => (
                  <Fila key={m.motivo}>
                    <Celda>{m.nombre}</Celda>
                    <Celda numerica>{numero(m.reservas)}</Celda>
                  </Fila>
                ))}
              </Cuerpo>
            </Tabla>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-verde-900">
              Inmuebles más demandados
            </h2>
            <Tabla>
              <Encabezado
                columnas={[
                  { clave: 'i', titulo: 'Inmueble' },
                  { clave: 'l', titulo: 'Localidad' },
                  { clave: 'res', titulo: 'Reservas', alineacion: 'derecha' },
                  { clave: 'n', titulo: 'Noches', alineacion: 'derecha' },
                ]}
              />
              <Cuerpo>
                {ranking_inmuebles.map((i) => (
                  <Fila key={i.id}>
                    <Celda>{i.nombre}</Celda>
                    <Celda className="text-slate-600">{i.localidad}</Celda>
                    <Celda numerica>{numero(i.reservas)}</Celda>
                    <Celda numerica>{numero(i.noches)}</Celda>
                  </Fila>
                ))}
              </Cuerpo>
            </Tabla>
          </section>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Tarjeta className="p-5 lg:col-span-2">
            <h2 className="text-lg font-semibold text-verde-900">Noches ocupadas por región</h2>
            <p className="mt-0.5 mb-4 text-sm text-slate-600">
              Suma de noches de reservas confirmadas, en curso y finalizadas.
            </p>
            <BarrasMagnitud datos={por_region} clave="noches" sufijo="noches" alto={340} />
          </Tarjeta>

          <Tarjeta className="p-5">
            <h2 className="text-lg font-semibold text-verde-900">Reservas por motivo</h2>
            <p className="mt-0.5 mb-4 text-sm text-slate-600">
              Distribución según el motivo declarado, que define el orden de prelación.
            </p>
            <BarrasMotivo datos={por_motivo} alto={190} />
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-arena-200 pt-3 text-xs text-slate-600">
              {por_motivo.map((m) => (
                <li key={m.motivo} className="flex items-center gap-1.5">
                  <span
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ background: TONOS_MOTIVO[m.motivo] }}
                    aria-hidden="true"
                  />
                  {m.nombre}
                </li>
              ))}
            </ul>
          </Tarjeta>

          <Tarjeta className="p-5">
            <h2 className="text-lg font-semibold text-verde-900">Inmuebles más demandados</h2>
            <p className="mt-0.5 mb-4 text-sm text-slate-600">
              Los ocho inmuebles con más noches ocupadas de la red.
            </p>
            <BarrasMagnitud
              datos={ranking_inmuebles}
              clave="noches"
              sufijo="noches"
              alto={300}
            />
          </Tarjeta>
        </div>
      )}

      <p className="mt-5 text-xs text-slate-500">
        Los reportes definitivos serán exportables en PDF y CSV/Excel. En esta maqueta la
        exportación genera un CSV con los datos ficticios en pantalla.
      </p>
    </>
  )
}
