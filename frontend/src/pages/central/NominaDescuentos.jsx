import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCheck, Download, FileSpreadsheet, Send } from 'lucide-react'
import { getNominas, marcarNomina } from '../../api/gestion.js'
import { ESTADOS_COBRO } from '../../lib/estados.js'
import { numero, pesos } from '../../lib/formato.js'
import { useRol } from '../../context/RolContext.jsx'
import { Tabla, Encabezado, Cuerpo, Fila, Celda } from '../../components/ui/Tabla.jsx'
import {
  Aviso,
  Boton,
  Campo,
  Cargando,
  StatCard,
  TituloSeccion,
  clasesInput,
} from '../../components/ui/Elementos.jsx'

function descargarCSV(nombre, filas) {
  const contenido = filas.map((f) => f.map((c) => `"${String(c ?? '')}"`).join(';')).join('\n')
  const blob = new Blob(['﻿' + contenido], { type: 'text/csv;charset=utf-8;' })
  const enlace = document.createElement('a')
  enlace.href = URL.createObjectURL(blob)
  enlace.download = nombre
  enlace.click()
  URL.revokeObjectURL(enlace.href)
}

function BadgeCobro({ estado }) {
  const e = ESTADOS_COBRO[estado] ?? ESTADOS_COBRO.pendiente
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${e.clases}`}
    >
      {e.etiqueta}
    </span>
  )
}

export function NominaDescuentos() {
  const { actor } = useRol()
  const [nominas, setNominas] = useState([])
  const [periodo, setPeriodo] = useState('')
  const [cargando, setCargando] = useState(true)
  const [procesando, setProcesando] = useState(false)

  const cargar = useCallback(() => {
    setCargando(true)
    getNominas()
      .then((r) => {
        setNominas(r.items)
        setPeriodo((p) => p || r.items[0]?.periodo || '')
      })
      .finally(() => setCargando(false))
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  const nomina = useMemo(
    () => nominas.find((n) => n.periodo === periodo),
    [nominas, periodo],
  )

  const totales = useMemo(() => {
    if (!nomina) return null
    const suma = (estado) =>
      nomina.items.filter((i) => i.estado === estado).reduce((s, i) => s + i.monto, 0)
    return {
      registros: nomina.items.length,
      total: nomina.items.reduce((s, i) => s + i.monto, 0),
      pendiente: suma('pendiente'),
      informado: suma('informado'),
      descontado: suma('descontado'),
      nPendiente: nomina.items.filter((i) => i.estado === 'pendiente').length,
      nInformado: nomina.items.filter((i) => i.estado === 'informado').length,
      nDescontado: nomina.items.filter((i) => i.estado === 'descontado').length,
    }
  }, [nomina])

  const marcar = async (estado) => {
    setProcesando(true)
    try {
      await marcarNomina(periodo, estado, actor)
      cargar()
    } finally {
      setProcesando(false)
    }
  }

  const exportar = () => {
    const filas = [
      ['Nómina de descuentos por planilla', nomina.etiqueta],
      ['Servicio de Bienestar CONAF — datos de maqueta'],
      [],
      ['RUT', 'Nombre', 'Reserva', 'Inmueble', 'Noches', 'Monto', 'Estado'],
      ...nomina.items.map((i) => [
        i.rut,
        i.nombre,
        i.reserva_codigo,
        i.inmueble,
        i.noches,
        i.monto,
        ESTADOS_COBRO[i.estado]?.etiqueta ?? i.estado,
      ]),
      [],
      ['Total', '', '', '', '', totales.total],
    ]
    descargarCSV(`nomina_descuentos_${periodo}.csv`, filas)
  }

  if (cargando) return <Cargando texto="Cargando las nóminas de descuento…" />

  return (
    <>
      <TituloSeccion
        titulo="Nómina de descuentos por planilla"
        descripcion="Cobros calculados por el sistema a partir de las estadías finalizadas y las anulaciones, para su aplicación en remuneraciones."
        acciones={
          <Boton variante="secundario" onClick={exportar}>
            <Download size={16} aria-hidden="true" />
            Exportar CSV
          </Boton>
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Campo etiqueta="Período" className="sm:col-span-2 lg:col-span-1">
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className={clasesInput}
          >
            {nominas.map((n) => (
              <option key={n.periodo} value={n.periodo}>
                {n.etiqueta} {n.estado_general === 'cerrado' ? '(cerrado)' : ''}
              </option>
            ))}
          </select>
        </Campo>

        {totales && (
          <>
            <StatCard
              etiqueta="Total del período"
              valor={pesos(totales.total)}
              detalle={`${numero(totales.registros)} cobros`}
              icono={FileSpreadsheet}
            />
            <StatCard
              etiqueta="Por informar"
              valor={pesos(totales.pendiente)}
              detalle={`${totales.nPendiente} pendientes`}
            />
            <StatCard
              etiqueta="Ya descontado"
              valor={pesos(totales.descontado)}
              detalle={`${totales.nDescontado} confirmados en planilla`}
              icono={CheckCheck}
            />
          </>
        )}
      </div>

      <Aviso tono="info" titulo="Integración con Remuneraciones">
        El archivo exportado se envía a Remuneraciones para su aplicación en planilla. Cada
        cobro avanza por tres estados: <strong>pendiente</strong> (calculado por el sistema),{' '}
        <strong>informado</strong> (incluido en el archivo enviado) y{' '}
        <strong>descontado</strong> (aplicado efectivamente). Queda por definir con Bienestar
        si Remuneraciones informa de vuelta los descuentos aplicados o si esa conciliación es
        manual.
      </Aviso>

      {nomina && (
        <>
          <div className="my-5 flex flex-wrap gap-2">
            <Boton
              variante="secundario"
              cargando={procesando}
              disabled={totales.nPendiente === 0}
              onClick={() => marcar('informado')}
            >
              <Send size={15} aria-hidden="true" />
              Marcar pendientes como informados ({totales.nPendiente})
            </Boton>
            <Boton
              variante="secundario"
              cargando={procesando}
              disabled={totales.nInformado === 0}
              onClick={() => marcar('descontado')}
            >
              <CheckCheck size={15} aria-hidden="true" />
              Marcar informados como descontados ({totales.nInformado})
            </Boton>
          </div>

          <Tabla>
            <Encabezado
              columnas={[
                { clave: 'rut', titulo: 'RUT' },
                { clave: 'nombre', titulo: 'Afiliado/a' },
                { clave: 'reserva', titulo: 'Reserva' },
                { clave: 'inmueble', titulo: 'Inmueble' },
                { clave: 'noches', titulo: 'Noches', alineacion: 'derecha' },
                { clave: 'monto', titulo: 'Monto', alineacion: 'derecha' },
                { clave: 'estado', titulo: 'Estado' },
              ]}
            />
            <Cuerpo>
              {nomina.items.map((i) => (
                <Fila key={i.reserva_codigo}>
                  <Celda className="tabular">{i.rut}</Celda>
                  <Celda>{i.nombre}</Celda>
                  <Celda className="tabular text-verde-700">{i.reserva_codigo}</Celda>
                  <Celda className="text-slate-600">{i.inmueble}</Celda>
                  <Celda numerica>{i.noches}</Celda>
                  <Celda numerica className="font-medium">
                    {pesos(i.monto)}
                  </Celda>
                  <Celda>
                    <BadgeCobro estado={i.estado} />
                  </Celda>
                </Fila>
              ))}
              <Fila className="bg-verde-50">
                <Celda colSpan={5} className="font-semibold text-verde-900">
                  Total del período {nomina.etiqueta}
                </Celda>
                <Celda numerica className="text-base font-semibold text-verde-900">
                  {pesos(totales.total)}
                </Celda>
                <Celda />
              </Fila>
            </Cuerpo>
          </Tabla>
        </>
      )}
    </>
  )
}
