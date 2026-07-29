import { useEffect, useState } from 'react'
import { CheckCircle2, FileUp, RefreshCw, Users } from 'lucide-react'
import { getCargaNomina } from '../../api/gestion.js'
import { fechaHora, numero } from '../../lib/formato.js'
import { Tabla, Encabezado, Cuerpo, Fila, Celda } from '../../components/ui/Tabla.jsx'
import {
  Aviso,
  Boton,
  Cargando,
  StatCard,
  Tarjeta,
  TituloSeccion,
} from '../../components/ui/Elementos.jsx'

/** Vista previa ficticia del archivo de nómina, para ilustrar la integración. */
const VISTA_PREVIA = [
  { rut: '13.457.902-8', nombre: 'María Fuentes Rojas', region: 'Valparaíso', estado: 'Vigente', cargas: 3 },
  { rut: '12.665.309-4', nombre: 'Luis Cárdenas Soto', region: 'Valparaíso', estado: 'Vigente', cargas: 2 },
  { rut: '15.902.114-7', nombre: 'Ana Villalobos Díaz', region: 'Valparaíso', estado: 'Vigente', cargas: 0 },
  { rut: '16.448.720-1', nombre: 'Soledad Ríos Peña', region: 'Los Lagos', estado: 'Vigente', cargas: 2 },
  { rut: '12.443.076-5', nombre: 'Héctor Salgado Ibáñez', region: 'Biobío', estado: 'Desafiliado', cargas: 1 },
]

export function CargaNomina() {
  const [carga, setCarga] = useState(null)

  useEffect(() => {
    getCargaNomina().then(setCarga)
  }, [])

  if (!carga) return <Cargando texto="Cargando el estado de la nómina…" />

  return (
    <>
      <TituloSeccion
        titulo="Nómina de afiliados y cargas familiares"
        descripcion="Registro contra el que el sistema valida quién es afiliado vigente y qué cargas dan derecho a tarifa de afiliado."
      />

      <Aviso tono="info" titulo="Integración pendiente de definición">
        En el sistema definitivo, esta nómina llegará desde el registro de afiliados del
        Servicio de Bienestar, por integración directa o por carga periódica de archivo. Falta
        confirmar con Bienestar la frecuencia de actualización y la unidad responsable del
        envío. En esta maqueta la pantalla es solo demostrativa.
      </Aviso>

      <div className="my-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          etiqueta="Afiliados vigentes"
          valor={numero(carga.afiliados_vigentes)}
          detalle="Habilitados para reservar"
          icono={Users}
        />
        <StatCard
          etiqueta="Cargas familiares"
          valor={numero(carga.cargas_familiares)}
          detalle="Con derecho a tarifa afiliado"
        />
        <StatCard
          etiqueta="Nuevos en la última carga"
          valor={carga.nuevos}
          detalle={`${carga.desafiliados} desafiliaciones`}
          icono={RefreshCw}
        />
        <StatCard
          etiqueta="Registros procesados"
          valor={numero(carga.registros_procesados)}
          detalle="Total del archivo"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Tarjeta className="p-5 lg:col-span-2">
          <h2 className="text-lg font-semibold text-verde-900">Cargar nueva nómina</h2>
          <p className="mt-1 mb-4 text-sm text-slate-600">
            Formato esperado: archivo Excel o CSV con RUT, nombre, región o unidad, estado de
            afiliación y las cargas familiares inscritas con su parentesco.
          </p>

          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-arena-200 bg-arena-50/60 px-6 py-10 text-center">
            <FileUp size={34} className="text-slate-300" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-slate-700">
              Arrastre aquí el archivo de nómina
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Formatos aceptados: .xlsx, .csv · Tamaño máximo 10 MB
            </p>
            <div className="mt-4">
              <Boton variante="secundario" disabled>
                Seleccionar archivo
              </Boton>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              La carga real se habilita en el sistema definitivo.
            </p>
          </div>

          <h3 className="mt-6 mb-2 text-sm font-semibold text-slate-800">
            Vista previa del archivo (ejemplo)
          </h3>
          <Tabla>
            <Encabezado
              columnas={[
                { clave: 'rut', titulo: 'RUT' },
                { clave: 'nombre', titulo: 'Nombre' },
                { clave: 'region', titulo: 'Región / unidad' },
                { clave: 'estado', titulo: 'Estado' },
                { clave: 'cargas', titulo: 'Cargas', alineacion: 'derecha' },
              ]}
            />
            <Cuerpo>
              {VISTA_PREVIA.map((f) => (
                <Fila key={f.rut}>
                  <Celda className="tabular">{f.rut}</Celda>
                  <Celda>{f.nombre}</Celda>
                  <Celda className="text-slate-600">{f.region}</Celda>
                  <Celda>
                    <span
                      className={
                        f.estado === 'Vigente'
                          ? 'text-verde-700'
                          : 'text-slate-500'
                      }
                    >
                      {f.estado}
                    </span>
                  </Celda>
                  <Celda numerica>{f.cargas}</Celda>
                </Fila>
              ))}
            </Cuerpo>
          </Tabla>
          <p className="mt-2 text-xs text-slate-500">
            Datos ficticios. Para la maqueta no se requiere la nómina real: basta la estructura
            de columnas con filas de ejemplo.
          </p>
        </Tarjeta>

        <Tarjeta className="p-5">
          <h2 className="text-base font-semibold text-verde-900">Última carga registrada</h2>
          <dl className="mt-3 space-y-2.5 text-sm">
            <div>
              <dt className="text-xs text-slate-500">Archivo</dt>
              <dd className="font-medium break-all text-slate-800">{carga.archivo}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Fecha</dt>
              <dd className="font-medium text-slate-800">{fechaHora(carga.fecha)}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Cargada por</dt>
              <dd className="font-medium text-slate-800">{carga.cargado_por}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Resultado</dt>
              <dd className="flex items-start gap-1.5 text-slate-700">
                <CheckCircle2
                  size={14}
                  className="mt-0.5 shrink-0 text-verde-600"
                  aria-hidden="true"
                />
                {carga.observaciones}
              </dd>
            </div>
          </dl>
        </Tarjeta>
      </div>
    </>
  )
}
