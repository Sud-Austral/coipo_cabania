import { useState } from 'react'
import { AlertTriangle, CheckCircle2, ClipboardList, Plus, Send, Trash2 } from 'lucide-react'
import { guardarInventario, inventarioDe, listarCasas, reservasPorRecibirInventario, useDatos } from '../../datos/servicio.js'
import { CATEGORIAS_INVENTARIO, ESTADOS_ITEM, plantillaInventario, seguridadVacia } from '../../datos/inventarios.js'
import { fechaCorta, hoyISO } from '../../lib/fechas.js'
import { plural } from '../../lib/formato.js'
import { Aviso, Boton, Campo, Tarjeta, claseEntrada } from '../../componentes/ui.jsx'
import { useSesion } from '../../componentes/Perfil.jsx'

const nuevoId = () => 'it-' + Math.random().toString(36).slice(2, 9)

export function InventarioEncargada() {
  useDatos()
  const { usuario } = useSesion()
  const casas = listarCasas().filter((c) => c.region === usuario.region)
  const [casaId, setCasaId] = useState(casas[0]?.id)
  const casa = casas.find((c) => c.id === casaId)

  return (
    <>
      <h1 className="text-2xl font-bold">Inventario de las casas</h1>
      <p className="mt-1 max-w-3xl text-[15px] text-tinta-500">
        Al guardar, se genera el acta de entrega con este inventario y se envía al correo de cada reserva confirmada que aún no comienza. El usuario lo revisa al llegar y tiene 12 horas para informar daños o faltantes (Art. 13, Anexo B).
      </p>

      <div className="mt-5 grid gap-6 lg:grid-cols-[280px_1fr]">
        <nav aria-label="Casas" className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
          {casas.map((c) => {
            const inv = inventarioDe(c.id)
            const activa = c.id === casaId
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCasaId(c.id)}
                aria-current={activa ? 'true' : undefined}
                className={`min-w-52 shrink-0 rounded-xl p-3 text-left ring-inset lg:min-w-0 ${activa ? 'bg-verde-50 ring-2 ring-verde-600' : 'bg-white ring-1 ring-borde hover:bg-stone-50'}`}
              >
                <span className="block font-semibold">{c.nombre}</span>
                {inv ? (
                  <span className="mt-0.5 flex items-center gap-1 text-[13px] text-tinta-500">
                    <CheckCircle2 className="size-3.5 text-verde-600" aria-hidden /> Actualizado el {fechaCorta(inv.actualizado_en.slice(0, 10), true)}
                  </span>
                ) : (
                  <span className="mt-0.5 flex items-center gap-1 text-[13px] text-alerta-700">
                    <AlertTriangle className="size-3.5" aria-hidden /> Sin inventario
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {casa && <Editor key={casa.id} casa={casa} usuario={usuario} />}
      </div>
    </>
  )
}

function Editor({ casa, usuario }) {
  const actual = inventarioDe(casa.id)
  const [items, setItems] = useState(() => actual?.items ?? null)
  const [seguridad, setSeguridad] = useState(() => actual?.seguridad ?? seguridadVacia())
  const [cambios, setCambios] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [intento, setIntento] = useState(false)
  const destinatarios = reservasPorRecibirInventario(casa.id).length
  const hoy = hoyISO()

  if (!items) {
    return (
      <Tarjeta className="p-8 text-center">
        <ClipboardList className="mx-auto size-10 text-tinta-400" aria-hidden />
        <h2 className="mt-3 text-lg font-semibold">{casa.nombre} aún no tiene inventario</h2>
        <p className="mx-auto mt-1 max-w-md text-[15px] text-tinta-500">
          {destinatarios > 0
            ? `Hay ${plural(destinatarios, 'reserva confirmada que lo recibirá', 'reservas confirmadas que lo recibirán')} en cuanto lo guarde.`
            : 'Complételo para que se envíe con cada reserva confirmada.'}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Boton
            onClick={() => {
              setItems(plantillaInventario(casa))
              setCambios(true)
            }}
          >
            Comenzar con la lista sugerida
          </Boton>
          <Boton
            variante="secundario"
            onClick={() => {
              setItems([])
              setCambios(true)
            }}
          >
            Comenzar en blanco
          </Boton>
        </div>
      </Tarjeta>
    )
  }

  const cambiar = (id, k, v) => {
    setItems(items.map((x) => (x.id === id ? { ...x, [k]: v } : x)))
    setCambios(true)
    setResultado(null)
  }
  const cambiarSeg = (k, v) => {
    setSeguridad({ ...seguridad, [k]: v })
    setCambios(true)
    setResultado(null)
  }
  const incompletos = items.filter((x) => !x.nombre.trim() || x.cantidad === '' || Number(x.cantidad) < 0)
  const extintorVencido = seguridad.extintor_vence && seguridad.extintor_vence < hoy

  function guardar() {
    setIntento(true)
    if (incompletos.length || items.length === 0) return
    const n = guardarInventario(
      casa.id,
      { items: items.map((x) => ({ ...x, nombre: x.nombre.trim(), cantidad: Number(x.cantidad), observacion: x.observacion.trim() })), seguridad },
      usuario,
    )
    setResultado(n)
    setCambios(false)
    setIntento(false)
  }

  return (
    <div className="min-w-0 space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-semibold">{casa.nombre}</h2>
        {actual && (
          <p className="text-[13px] text-tinta-500">
            Versión {actual.version} · {fechaCorta(actual.actualizado_en.slice(0, 10), true)} · {actual.actualizado_por}
          </p>
        )}
      </div>

      {resultado !== null && (
        <Aviso tipo="info">
          Inventario guardado.{' '}
          {resultado > 0 ? `Se envió el acta de entrega actualizada a ${plural(resultado, 'reserva confirmada', 'reservas confirmadas')} de esta casa.` : 'No hay reservas confirmadas próximas a las que enviar el acta.'}
        </Aviso>
      )}

      {CATEGORIAS_INVENTARIO.map((cat) => {
        const deCat = items.filter((x) => x.categoria === cat)
        return (
          <Tarjeta key={cat} className="p-4 sm:p-5">
            <h3 className="font-semibold">
              {cat} <span className="font-normal text-tinta-500">· {deCat.length}</span>
            </h3>
            <div className="mt-3 hidden grid-cols-[1fr_76px_200px_1fr_40px] gap-3 text-[13px] text-tinta-500 md:grid">
              <span>Elemento</span>
              <span>Cantidad</span>
              <span>Estado</span>
              <span>Observación</span>
              <span />
            </div>
            <ul className="divide-y divide-borde md:divide-y-0">
              {deCat.map((x) => {
                const malo = intento && (!x.nombre.trim() || x.cantidad === '')
                return (
                  <li key={x.id} className="grid gap-2 py-3 md:grid-cols-[1.2fr_76px_200px_1fr_40px] md:items-center md:gap-3 md:py-1.5">
                    <input
                      className={`${claseEntrada} ${malo && !x.nombre.trim() ? 'border-error-700' : ''}`}
                      value={x.nombre}
                      onChange={(e) => cambiar(x.id, 'nombre', e.target.value)}
                      aria-label="Elemento"
                      placeholder="Nombre del elemento"
                    />
                    <div className="grid grid-cols-[76px_1fr] gap-2 md:contents">
                      <input
                        className={`${claseEntrada} text-center ${malo && x.cantidad === '' ? 'border-error-700' : ''}`}
                        type="number"
                        min="0"
                        value={x.cantidad}
                        onChange={(e) => cambiar(x.id, 'cantidad', e.target.value)}
                        aria-label={`Cantidad de ${x.nombre || 'elemento'}`}
                      />
                      <div className="flex rounded-lg ring-1 ring-inset ring-borde" role="radiogroup" aria-label={`Estado de ${x.nombre || 'elemento'}`}>
                        {ESTADOS_ITEM.map((e) => (
                          <button
                            key={e.valor}
                            type="button"
                            role="radio"
                            aria-checked={x.estado === e.valor}
                            onClick={() => cambiar(x.id, 'estado', e.valor)}
                            className={`min-h-11 flex-1 text-sm first:rounded-l-lg last:rounded-r-lg ${
                              x.estado === e.valor
                                ? e.valor === 'bueno'
                                  ? 'bg-verde-700 font-semibold text-white'
                                  : e.valor === 'regular'
                                    ? 'bg-alerta-700 font-semibold text-white'
                                    : 'bg-error-700 font-semibold text-white'
                                : 'text-tinta-700 hover:bg-stone-50'
                            }`}
                          >
                            {e.etiqueta}
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      className={claseEntrada}
                      value={x.observacion}
                      onChange={(e) => cambiar(x.id, 'observacion', e.target.value)}
                      aria-label={`Observación de ${x.nombre || 'elemento'}`}
                      placeholder="Observación (opcional)"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setItems(items.filter((y) => y.id !== x.id))
                        setCambios(true)
                      }}
                      className="grid size-10 place-items-center justify-self-end rounded-lg text-tinta-400 hover:bg-error-50 hover:text-error-700"
                      aria-label={`Quitar ${x.nombre || 'elemento'}`}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </li>
                )
              })}
            </ul>
            <Boton
              variante="texto"
              className="mt-2 -ml-2"
              onClick={() => {
                setItems([...items, { id: nuevoId(), categoria: cat, nombre: '', cantidad: 1, estado: 'bueno', observacion: '' }])
                setCambios(true)
              }}
            >
              <Plus className="size-4" aria-hidden /> Agregar a {cat.toLowerCase()}
            </Boton>
          </Tarjeta>
        )
      })}

      <Tarjeta className="p-4 sm:p-5">
        <h3 className="font-semibold">Llaves, gas y seguridad</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Campo etiqueta="Llaves que se entregan">
            <input className={claseEntrada} value={seguridad.llaves} onChange={(e) => cambiarSeg('llaves', e.target.value)} placeholder="Ej.: 2 juegos (puerta y reja)" />
          </Campo>
          <Campo etiqueta="Controles remotos">
            <input className={claseEntrada} value={seguridad.controles} onChange={(e) => cambiarSeg('controles', e.target.value)} placeholder="Ej.: 1 portón" />
          </Campo>
          <Campo etiqueta="Gas (lectura o estado)">
            <input className={claseEntrada} value={seguridad.gas} onChange={(e) => cambiarSeg('gas', e.target.value)} placeholder="Ej.: cilindro 45 kg al 60%" />
          </Campo>
          <Campo etiqueta="Vencimiento del extintor" error={extintorVencido ? 'El extintor está vencido: gestione su recarga.' : null}>
            <input className={claseEntrada} type="date" value={seguridad.extintor_vence} onChange={(e) => cambiarSeg('extintor_vence', e.target.value)} />
          </Campo>
          <Campo etiqueta="Otras indicaciones para el usuario" className="sm:col-span-2">
            <input className={claseEntrada} value={seguridad.observaciones} onChange={(e) => cambiarSeg('observaciones', e.target.value)} placeholder="Ej.: llave de paso del gas bajo el lavaplatos" />
          </Campo>
        </div>
      </Tarjeta>

      {intento && (incompletos.length > 0 || items.length === 0) && (
        <Aviso tipo="error">{items.length === 0 ? 'Agregue al menos un elemento.' : `Hay ${plural(incompletos.length, 'elemento', 'elementos')} sin nombre o sin cantidad.`}</Aviso>
      )}

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-borde bg-fondo/95 px-4 py-3 backdrop-blur">
        <p className="text-sm text-tinta-500">
          {cambios ? 'Cambios sin guardar. ' : ''}
          {destinatarios > 0 ? `Se enviará el acta a ${plural(destinatarios, 'reserva confirmada', 'reservas confirmadas')}.` : 'Sin reservas confirmadas próximas.'}
        </p>
        <Boton onClick={guardar} disabled={!cambios}>
          <Send className="size-4" aria-hidden /> Guardar y enviar
        </Boton>
      </div>
    </div>
  )
}
