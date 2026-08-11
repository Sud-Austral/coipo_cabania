import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { CalendarPlus, CircleSlash, Star } from 'lucide-react'
import { anularReserva, getReservas } from '../../api/reservas.js'
import { crearValoracion } from '../../api/valoraciones.js'
import { contarNoches, cobroPorDesistimiento } from '../../lib/tarifas.js'
import { fechaCorta, pesos } from '../../lib/formato.js'
import { POLITICA_DESISTIMIENTO } from '../../fixtures/tarifas.js'
import { useRol } from '../../context/RolContext.jsx'
import {
  FiltroEstados,
  TablaReservas,
} from '../../components/reservas/TablaReservas.jsx'
import { Estrellas, SelectorEstrellas } from '../../components/inmuebles/Estrellas.jsx'
import { Modal } from '../../components/ui/Modal.jsx'
import {
  Aviso,
  Boton,
  Campo,
  Cargando,
  Tarjeta,
  TituloSeccion,
  clasesInput,
} from '../../components/ui/Elementos.jsx'

const ANULABLES = ['recibida', 'confirmada', 'lista_espera']

export function MisReservas() {
  const { usuario, actor } = useRol()
  const [reservas, setReservas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [filtro, setFiltro] = useState('todos')
  const [porAnular, setPorAnular] = useState(null)
  const [anulando, setAnulando] = useState(false)
  const [porValorar, setPorValorar] = useState(null)
  const [estrellas, setEstrellas] = useState(0)
  const [comentario, setComentario] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorValoracion, setErrorValoracion] = useState(null)

  const cargar = useCallback(() => {
    setCargando(true)
    getReservas({ usuario_id: usuario?.id })
      .then((r) => setReservas(r.items))
      .finally(() => setCargando(false))
  }, [usuario?.id])

  useEffect(() => {
    cargar()
  }, [cargar])

  const visibles = useMemo(
    () => (filtro === 'todos' ? reservas : reservas.filter((r) => r.estado === filtro)),
    [reservas, filtro],
  )

  const vigentes = reservas.filter((r) => ANULABLES.includes(r.estado))

  /** Cobro que se aplicaría si se anula ahora (política de desistimiento). */
  const cobroEstimado = useMemo(() => {
    if (!porAnular) return null
    const diasAviso = differenceInCalendarDays(parseISO(porAnular.fecha_entrada), new Date())
    return {
      diasAviso,
      ...cobroPorDesistimiento({
        montoTotal: porAnular.monto_total,
        noches: contarNoches(porAnular.fecha_entrada, porAnular.fecha_salida),
        diasAviso,
        fuerzaMayor: false,
      }),
    }
  }, [porAnular])

  const abrirValoracion = (reserva) => {
    setPorValorar(reserva)
    setEstrellas(0)
    setComentario('')
    setErrorValoracion(null)
  }

  const enviarValoracion = async () => {
    setGuardando(true)
    setErrorValoracion(null)
    try {
      await crearValoracion(
        {
          inmueble_id: porValorar.inmueble_id,
          reserva_codigo: porValorar.codigo,
          estrellas,
          comentario,
        },
        actor,
      )
      setPorValorar(null)
      cargar()
    } catch (e) {
      setErrorValoracion(e.detail ?? 'No fue posible registrar la valoración.')
    } finally {
      setGuardando(false)
    }
  }

  const confirmarAnulacion = async () => {
    setAnulando(true)
    try {
      await anularReserva(porAnular.codigo, { actor })
      setPorAnular(null)
      cargar()
    } finally {
      setAnulando(false)
    }
  }

  if (cargando) return <Cargando texto="Cargando sus reservas…" />

  return (
    <>
      <TituloSeccion
        titulo="Mis reservas"
        descripcion={`Reservas vigentes e históricas de ${usuario?.nombre}, con los cobros asociados.`}
        acciones={
          <Link
            to="/catalogo"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-verde-600 px-4 py-2 text-sm font-medium text-white hover:bg-verde-700"
          >
            <CalendarPlus size={16} aria-hidden="true" />
            Nueva reserva
          </Link>
        }
      />

      {vigentes.length > 0 && (
        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          {vigentes.slice(0, 3).map((r) => (
            <Tarjeta key={r.codigo} className="p-4">
              <p className="text-xs tracking-wide text-slate-500 uppercase">Próxima estadía</p>
              <p className="mt-1 text-sm font-semibold text-verde-900">{r.inmueble?.nombre}</p>
              <p className="tabular mt-0.5 text-sm text-slate-600">
                {fechaCorta(r.fecha_entrada)} → {fechaCorta(r.fecha_salida)}
              </p>
              <p className="tabular mt-1.5 text-sm font-medium text-slate-800">
                {pesos(r.monto_total)}
              </p>
            </Tarjeta>
          ))}
        </div>
      )}

      <FiltroEstados
        reservas={reservas}
        estados={['recibida', 'confirmada', 'en_curso', 'finalizada', 'anulada']}
        activo={filtro}
        onCambiar={setFiltro}
      />

      <TablaReservas
        reservas={visibles}
        mostrar={{ titular: false, region: true, monto: true }}
        vacio="Todavía no registra reservas con ese estado. Explore el catálogo para generar una solicitud."
        acciones={(r) => {
          if (ANULABLES.includes(r.estado)) {
            return (
              <Boton variante="peligro" onClick={() => setPorAnular(r)}>
                <CircleSlash size={14} aria-hidden="true" />
                Desistir
              </Boton>
            )
          }
          if (r.estado === 'finalizada') {
            return r.valoracion ? (
              <Estrellas valor={r.valoracion.estrellas} tamano={13} />
            ) : (
              <Boton variante="secundario" onClick={() => abrirValoracion(r)}>
                <Star size={14} aria-hidden="true" />
                Valorar
              </Boton>
            )
          }
          return null
        }}
      />

      <Modal
        abierto={Boolean(porAnular)}
        onCerrar={() => setPorAnular(null)}
        titulo="Desistir de la reserva"
        descripcion={porAnular ? `${porAnular.codigo} · ${porAnular.inmueble?.nombre}` : ''}
        pie={
          <>
            <Boton variante="neutro" onClick={() => setPorAnular(null)}>
              Mantener la reserva
            </Boton>
            <Boton variante="peligro" cargando={anulando} onClick={confirmarAnulacion}>
              Confirmar desistimiento
            </Boton>
          </>
        }
      >
        {cobroEstimado && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              La reserva comienza el{' '}
              <strong className="text-slate-800">{fechaCorta(porAnular.fecha_entrada)}</strong>,
              es decir en{' '}
              <strong className="text-slate-800">
                {cobroEstimado.diasAviso} {cobroEstimado.diasAviso === 1 ? 'día' : 'días'}
              </strong>
              .
            </p>

            <Aviso tono={cobroEstimado.monto === 0 ? 'verde' : 'ambar'}>
              {cobroEstimado.glosa}
            </Aviso>

            <div className="flex items-center justify-between rounded-lg border border-arena-200 bg-arena-50 px-3.5 py-3">
              <span className="text-sm text-slate-700">Cobro que se aplicaría</span>
              <span className="tabular text-base font-semibold text-verde-900">
                {pesos(cobroEstimado.monto)}
              </span>
            </div>

            <p className="text-xs text-slate-500">
              Política vigente: la anulación debe avisarse con al menos{' '}
              {POLITICA_DESISTIMIENTO.dias_aviso_sin_cobro} días de antelación.{' '}
              {POLITICA_DESISTIMIENTO.glosa_fuerza_mayor} La calificación de fuerza mayor la
              realiza Oficina Central.
            </p>
          </div>
        )}
      </Modal>

      <Modal
        abierto={Boolean(porValorar)}
        onCerrar={() => setPorValorar(null)}
        focusInicial={false}
        titulo="Valorar la estadía"
        descripcion={porValorar ? `${porValorar.codigo} · ${porValorar.inmueble?.nombre}` : ''}
        pie={
          <>
            <Boton variante="neutro" onClick={() => setPorValorar(null)}>
              Cancelar
            </Boton>
            <Boton
              cargando={guardando}
              disabled={estrellas === 0}
              onClick={enviarValoracion}
            >
              Enviar valoración
            </Boton>
          </>
        }
      >
        <div className="space-y-4">
          <Campo etiqueta="¿Cómo estuvo la estadía?" requerido>
            <SelectorEstrellas
              valor={estrellas}
              onCambiar={setEstrellas}
            />
          </Campo>

          <Campo etiqueta="Comentario (opcional)" ayuda="Máximo 150 caracteres.">
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              maxLength={150}
              rows={3}
              placeholder="Qué destacaría del inmueble o qué habría que mejorar."
              className={clasesInput}
            />
          </Campo>          
          {errorValoracion && <Aviso tono="rojo">{errorValoracion}</Aviso>}
          <p className="text-xs text-slate-500">
            Su valoración queda visible en la ficha del inmueble junto a su nombre.
          </p>
        </div>
      </Modal>
    </>
  )
}
