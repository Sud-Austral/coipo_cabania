import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CalendarClock, Search, SlidersHorizontal, X } from 'lucide-react'
import { getInmuebles } from '../../api/inmuebles.js'
import { REGIONES, TIPOS_INMUEBLE } from '../../fixtures/inmuebles.js'
import { useRol } from '../../context/RolContext.jsx'
import { InmuebleCard } from '../../components/inmuebles/InmuebleCard.jsx'
import {
  Aviso,
  Boton,
  Campo,
  Cargando,
  EstadoVacio,
  Tarjeta,
  TituloSeccion,
  clasesInput,
} from '../../components/ui/Elementos.jsx'

const FILTROS_VACIOS = { region: '', tipo: '', capacidad_min: '', busqueda: '', fecha_entrada: '', fecha_salida: '' }

export function Catalogo() {
  const { esNoAfiliado } = useRol()
  const [, setParametros] = useSearchParams()
  const [filtros, setFiltros] = useState(FILTROS_VACIOS)
  const [inmuebles, setInmuebles] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let vigente = true
    setCargando(true)
    getInmuebles(filtros)
      .then((r) => vigente && setInmuebles(r.items))
      .finally(() => vigente && setCargando(false))
    return () => {
      vigente = false
    }
  }, [filtros])

  useEffect(() => {
    const p = new URLSearchParams()
    if (filtros.fecha_entrada) p.set('entrada', filtros.fecha_entrada)
    if (filtros.fecha_salida) p.set('salida', filtros.fecha_salida)
    setParametros(p, { replace: true })
  }, [filtros.fecha_entrada, filtros.fecha_salida, setParametros])

  const hayFiltros = useMemo(
    () => Object.values(filtros).some((v) => v !== ''),
    [filtros],
  )
  const fechasIncompletas = Boolean(filtros.fecha_entrada) !== Boolean(filtros.fecha_salida)
  const fechasInvalidas = Boolean(filtros.fecha_entrada && filtros.fecha_salida && filtros.fecha_salida <= filtros.fecha_entrada)
  const ordenados = useMemo(() => [...inmuebles].sort((a, b) => Number(Boolean(b.disponibilidad_rango?.libre)) - Number(Boolean(a.disponibilidad_rango?.libre))), [inmuebles])

  const cambiar = (campo) => (e) => setFiltros((f) => ({ ...f, [campo]: e.target.value }))

  return (
    <>
      <TituloSeccion
        titulo="Catálogo de inmuebles"
        descripcion="Red de 34 casas de huéspedes y de veraneo del Servicio de Bienestar, entre las regiones de Antofagasta y Magallanes. Revise la ficha de cada inmueble para ver fotografías, ubicación, equipamiento y disponibilidad."
      />

      {/* Bloqueo de temporada vigente: se informa antes de que el usuario
          descubra que el calendario está cerrado (solicitud §5.4 req. 24). */}
      <div className="mb-5">
        <Aviso tono="ambar" icono={CalendarClock} titulo="Postulación estival 2026-2027">
          Entre el <strong>3 y el 28 de noviembre</strong> las reservas de temporada estival
          estarán cerradas en toda la red mientras se realiza el proceso de postulación y
          sorteo. Durante ese período el calendario mostrará esas fechas como no disponibles.
        </Aviso>
      </div>

      <Tarjeta className="mb-6 p-4">
        <div className="flex items-center gap-2 pb-3 text-sm font-medium text-slate-700">
          <SlidersHorizontal size={16} className="text-verde-600" aria-hidden="true" />
          Filtrar la búsqueda
        </div>
        {(fechasIncompletas || fechasInvalidas) && <div className="mt-3"><Aviso tono="rojo">{fechasIncompletas ? 'Seleccione ingreso y salida para consultar disponibilidad.' : 'La fecha de salida debe ser posterior al ingreso.'}</Aviso></div>}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Campo etiqueta="Fecha de ingreso">
            <input type="date" value={filtros.fecha_entrada} onChange={cambiar('fecha_entrada')} className={clasesInput} />
          </Campo>
          <Campo etiqueta="Fecha de salida">
            <input type="date" min={filtros.fecha_entrada || undefined} value={filtros.fecha_salida} onChange={cambiar('fecha_salida')} className={clasesInput} />
          </Campo>
          <Campo etiqueta="Región">
            <select value={filtros.region} onChange={cambiar('region')} className={clasesInput}>
              <option value="">Todas las regiones</option>
              {REGIONES.map((r) => (
                <option key={r.codigo} value={r.codigo}>
                  {r.nombre}
                </option>
              ))}
            </select>
          </Campo>

          <Campo etiqueta="Tipo de inmueble">
            <select value={filtros.tipo} onChange={cambiar('tipo')} className={clasesInput}>
              <option value="">Huéspedes y veraneo</option>
              {TIPOS_INMUEBLE.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.etiqueta}
                </option>
              ))}
            </select>
          </Campo>

          <Campo etiqueta="Capacidad mínima">
            <select
              value={filtros.capacidad_min}
              onChange={cambiar('capacidad_min')}
              className={clasesInput}
            >
              <option value="">Cualquier capacidad</option>
              {[2, 4, 5, 6, 8, 10].map((n) => (
                <option key={n} value={n}>
                  {n} personas o más
                </option>
              ))}
            </select>
          </Campo>

          <Campo etiqueta="Buscar por nombre o localidad">
            <div className="relative">
              <Search
                size={16}
                className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={filtros.busqueda}
                onChange={cambiar('busqueda')}
                placeholder="Ej.: Pichilemu, Puyehue…"
                className={`${clasesInput} pl-9`}
              />
            </div>
          </Campo>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-arena-200 pt-3">
          <p className="text-sm text-slate-600">
            {cargando ? 'Buscando…' : `${inmuebles.length} de 34 inmuebles`}
          </p>
          {hayFiltros && (
            <Boton variante="neutro" onClick={() => setFiltros(FILTROS_VACIOS)}>
              <X size={15} aria-hidden="true" />
              Limpiar filtros
            </Boton>
          )}
        </div>
      </Tarjeta>

      {cargando ? (
        <Cargando texto="Cargando inmuebles…" />
      ) : inmuebles.length === 0 ? (
        <EstadoVacio
          titulo="No hay inmuebles con esos criterios"
          descripcion="Pruebe con otra región, un tipo distinto de inmueble o una capacidad menor."
          accion={
            <Boton variante="secundario" onClick={() => setFiltros(FILTROS_VACIOS)}>
              Ver los 34 inmuebles
            </Boton>
          }
        />
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {ordenados.map((inmueble) => (
            <li key={inmueble.id} className="flex">
              <div className="flex w-full">
                <InmuebleCard inmueble={inmueble} esExterno={esNoAfiliado} fechas={{ entrada: filtros.fecha_entrada, salida: filtros.fecha_salida }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
