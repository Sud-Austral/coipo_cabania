import { useCallback, useEffect, useState } from 'react'
import { CalendarRange, Plus } from 'lucide-react'
import { crearTemporada, getTemporadasGestion } from '../../api/gestion.js'
import { getBloqueos } from '../../api/inmuebles.js'
import { inmuebles as todosLosInmuebles } from '../../fixtures/inmuebles.js'
import { fechaCorta } from '../../lib/formato.js'
import { useRol } from '../../context/RolContext.jsx'
import { Badge } from '../../components/ui/Badge.jsx'
import { Modal } from '../../components/ui/Modal.jsx'
import { Tabla, Encabezado, Cuerpo, Fila, Celda } from '../../components/ui/Tabla.jsx'
import {
  Aviso,
  Boton,
  Campo,
  Cargando,
  Tarjeta,
  TituloSeccion,
  clasesInput,
} from '../../components/ui/Elementos.jsx'

const ORIGENES = {
  mantencion: { etiqueta: 'Mantención', tono: 'ambar' },
  institucional: { etiqueta: 'Destinación institucional', tono: 'azul' },
  temporada: { etiqueta: 'Bloqueo de temporada', tono: 'arena' },
}

export function Temporadas() {
  const { actor } = useRol()
  const [temporadas, setTemporadas] = useState([])
  const [bloqueos, setBloqueos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modal, setModal] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [nueva, setNueva] = useState({
    nombre: '',
    tipo: 'alta',
    desde: '',
    hasta: '',
    dias_maximos_por_afiliado: '',
    observaciones: '',
  })

  const cargar = useCallback(() => {
    setCargando(true)
    Promise.all([getTemporadasGestion(), getBloqueos()])
      .then(([t, b]) => {
        setTemporadas(t.items)
        setBloqueos(b.items)
      })
      .finally(() => setCargando(false))
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  const guardar = async () => {
    setGuardando(true)
    try {
      await crearTemporada(
        {
          ...nueva,
          dias_maximos_por_afiliado: nueva.dias_maximos_por_afiliado
            ? Number(nueva.dias_maximos_por_afiliado)
            : null,
        },
        actor,
      )
      setModal(false)
      setNueva({
        nombre: '',
        tipo: 'alta',
        desde: '',
        hasta: '',
        dias_maximos_por_afiliado: '',
        observaciones: '',
      })
      cargar()
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) return <Cargando texto="Cargando temporadas y bloqueos…" />

  const valida = nueva.nombre.trim() && nueva.desde && nueva.hasta

  return (
    <>
      <TituloSeccion
        titulo="Gestión de temporadas"
        descripcion="Temporadas de verano e invierno, sus reglas de reserva y los bloqueos de fechas asociados. Las reglas de temporada priman sobre la disponibilidad general del calendario."
        acciones={
          <Boton onClick={() => setModal(true)}>
            <Plus size={16} aria-hidden="true" />
            Nueva temporada
          </Boton>
        }
      />

      <Aviso tono="info" titulo="Efecto de las temporadas">
        Las temporadas definen la tarifa aplicable (alta o baja) y pueden restringir el número
        máximo de días por afiliado. Los bloqueos asociados se muestran como fechas no
        disponibles en el calendario de todos los perfiles.
      </Aviso>

      <div className="mt-5 mb-6">
        <h2 className="mb-2.5 text-lg font-semibold text-verde-900">Temporadas definidas</h2>
        <Tabla>
          <Encabezado
            columnas={[
              { clave: 'nombre', titulo: 'Temporada' },
              { clave: 'tipo', titulo: 'Tarifa' },
              { clave: 'vigencia', titulo: 'Vigencia' },
              { clave: 'dias', titulo: 'Días máx. por afiliado', alineacion: 'derecha' },
              { clave: 'obs', titulo: 'Observaciones' },
            ]}
          />
          <Cuerpo>
            {temporadas.map((t) => (
              <Fila key={t.id}>
                <Celda className="font-medium text-slate-800">{t.nombre}</Celda>
                <Celda>
                  <Badge tono={t.tipo === 'alta' ? 'ambar' : 'verde'}>
                    {t.tipo === 'alta' ? 'Temporada alta' : 'Temporada baja'}
                  </Badge>
                </Celda>
                <Celda className="tabular whitespace-nowrap text-slate-600">
                  {fechaCorta(t.desde)} → {fechaCorta(t.hasta)}
                </Celda>
                <Celda numerica>
                  {t.dias_maximos_por_afiliado ?? <span className="text-slate-400">Sin tope</span>}
                </Celda>
                <Celda className="text-xs text-slate-500">{t.observaciones}</Celda>
              </Fila>
            ))}
          </Cuerpo>
        </Tabla>
      </div>

      <div>
        <h2 className="mb-2.5 text-lg font-semibold text-verde-900">Bloqueos de fechas</h2>
        <Tabla>
          <Encabezado
            columnas={[
              { clave: 'alcance', titulo: 'Alcance' },
              { clave: 'fechas', titulo: 'Fechas' },
              { clave: 'tipo', titulo: 'Tipo' },
              { clave: 'motivo', titulo: 'Motivo' },
            ]}
          />
          <Cuerpo>
            {bloqueos.map((b) => {
              const inmueble = todosLosInmuebles.find((i) => i.id === b.inmueble_id)
              const origen = ORIGENES[b.origen] ?? ORIGENES.temporada
              return (
                <Fila key={b.id}>
                  <Celda className="font-medium text-slate-800">
                    {inmueble ? inmueble.nombre : 'Toda la red (34 inmuebles)'}
                  </Celda>
                  <Celda className="tabular whitespace-nowrap text-slate-600">
                    {fechaCorta(b.desde)} → {fechaCorta(b.hasta)}
                  </Celda>
                  <Celda>
                    <Badge tono={origen.tono}>{origen.etiqueta}</Badge>
                  </Celda>
                  <Celda className="text-slate-600">{b.motivo}</Celda>
                </Fila>
              )
            })}
          </Cuerpo>
        </Tabla>
      </div>

      <Tarjeta className="mt-6 p-5">
        <h2 className="flex items-center gap-2 text-base font-semibold text-verde-900">
          <CalendarRange size={17} className="text-verde-600" aria-hidden="true" />
          Conversión de casas de huéspedes a uso de veraneo
        </h2>
        <p className="mt-1.5 text-sm text-slate-600">
          Durante la temporada estival y los fines de semana largos, algunas casas de huéspedes
          pueden destinarse a descanso familiar. En el sistema definitivo el administrador
          marcará aquí qué inmuebles cambian de uso y en qué fechas.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Queda pendiente definir con Bienestar quién decide cada año esa conversión (pregunta
          12 del listado de la reunión).
        </p>
      </Tarjeta>

      <Modal
        abierto={modal}
        onCerrar={() => setModal(false)}
        titulo="Nueva temporada"
        pie={
          <>
            <Boton variante="neutro" onClick={() => setModal(false)}>
              Cancelar
            </Boton>
            <Boton cargando={guardando} disabled={!valida} onClick={guardar}>
              Crear temporada
            </Boton>
          </>
        }
      >
        <div className="space-y-3">
          <Campo etiqueta="Nombre" requerido>
            <input
              type="text"
              value={nueva.nombre}
              onChange={(e) => setNueva((n) => ({ ...n, nombre: e.target.value }))}
              placeholder="Ej.: Temporada estival 2027-2028"
              className={clasesInput}
            />
          </Campo>

          <div className="grid gap-3 sm:grid-cols-3">
            <Campo etiqueta="Tarifa aplicable" requerido>
              <select
                value={nueva.tipo}
                onChange={(e) => setNueva((n) => ({ ...n, tipo: e.target.value }))}
                className={clasesInput}
              >
                <option value="alta">Temporada alta</option>
                <option value="baja">Temporada baja</option>
              </select>
            </Campo>
            <Campo etiqueta="Desde" requerido>
              <input
                type="date"
                value={nueva.desde}
                onChange={(e) => setNueva((n) => ({ ...n, desde: e.target.value }))}
                className={clasesInput}
              />
            </Campo>
            <Campo etiqueta="Hasta" requerido>
              <input
                type="date"
                value={nueva.hasta}
                min={nueva.desde || undefined}
                onChange={(e) => setNueva((n) => ({ ...n, hasta: e.target.value }))}
                className={clasesInput}
              />
            </Campo>
          </div>

          <Campo
            etiqueta="Días máximos por afiliado"
            ayuda="Dejar en blanco si no hay restricción."
          >
            <input
              type="number"
              min={1}
              max={60}
              value={nueva.dias_maximos_por_afiliado}
              onChange={(e) =>
                setNueva((n) => ({ ...n, dias_maximos_por_afiliado: e.target.value }))
              }
              className={`${clasesInput} tabular`}
            />
          </Campo>

          <Campo etiqueta="Observaciones">
            <textarea
              rows={2}
              value={nueva.observaciones}
              onChange={(e) => setNueva((n) => ({ ...n, observaciones: e.target.value }))}
              className={clasesInput}
            />
          </Campo>
        </div>
      </Modal>
    </>
  )
}
