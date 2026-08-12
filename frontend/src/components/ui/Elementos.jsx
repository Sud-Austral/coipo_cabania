/** Componentes de interfaz reutilizables: tarjetas, botones, estados vacíos, avisos. */

import { AlertCircle, Inbox, Loader2 } from 'lucide-react'

export function Tarjeta({ children, className = '', ...props }) {
  return (
    <div
      className={`rounded-xl border border-arena-200 bg-white shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export function TituloSeccion({ titulo, descripcion, acciones }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-verde-900">{titulo}</h1>
        {descripcion && <p className="mt-1 max-w-3xl text-sm text-slate-600">{descripcion}</p>}
      </div>
      {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
    </div>
  )
}

const VARIANTES_BOTON = {
  primario:
    'bg-verde-600 text-white hover:bg-verde-700 disabled:bg-slate-300 disabled:text-slate-500',
  secundario:
    'border border-verde-600 text-verde-700 hover:bg-verde-50 disabled:border-slate-300 disabled:text-slate-400',
  neutro:
    'border border-arena-200 bg-white text-slate-700 hover:bg-arena-50 disabled:text-slate-400',
  peligro: 'border border-rose-300 text-rose-700 hover:bg-rose-50 disabled:text-slate-400',
}

export function Boton({
  children,
  variante = 'primario',
  cargando = false,
  className = '',
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      disabled={cargando || props.disabled}
      className={`inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${VARIANTES_BOTON[variante]} ${className}`}
      {...props}
    >
      {cargando && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
      {children}
    </button>
  )
}

export function Campo({ etiqueta, ayuda, error, requerido, children, className = '' }) {
  return (
    <div className={className}>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {etiqueta}
        {requerido && <span className="ml-0.5 text-rose-600">*</span>}
      </label>
      {children}
      {ayuda && !error && <p className="mt-1 text-xs text-slate-500">{ayuda}</p>}
      {error && (
        <p className="mt-1 flex items-center gap-1 text-xs text-rose-700" role="alert">
          <AlertCircle size={13} aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  )
}

export const clasesInput =
  'w-full min-h-11 box-border rounded-lg border border-arena-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-verde-500'

export function EstadoVacio({ titulo, descripcion, accion, icono: Icono = Inbox }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-arena-200 bg-white px-6 py-14 text-center">
      <Icono size={38} className="text-slate-300" aria-hidden="true" />
      <h3 className="mt-3 text-base font-medium text-slate-700">{titulo}</h3>
      {descripcion && <p className="mt-1 max-w-md text-sm text-slate-500">{descripcion}</p>}
      {accion && <div className="mt-4">{accion}</div>}
    </div>
  )
}

export function Cargando({ texto = 'Cargando…' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
      <Loader2 size={18} className="animate-spin" aria-hidden="true" />
      {texto}
    </div>
  )
}

export function Aviso({ tono = 'info', titulo, children, icono: Icono = AlertCircle }) {
  const tonos = {
    info: 'border-sky-200 bg-sky-50 text-sky-900',
    verde: 'border-verde-200 bg-verde-50 text-verde-900',
    ambar: 'border-amber-200 bg-amber-50 text-amber-900',
    rojo: 'border-rose-200 bg-rose-50 text-rose-900',
  }
  return (
    <div className={`flex gap-3 rounded-lg border p-3.5 text-sm ${tonos[tono]}`}>
      <Icono size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div>
        {titulo && <p className="font-medium">{titulo}</p>}
        <div className={titulo ? 'mt-0.5' : ''}>{children}</div>
      </div>
    </div>
  )
}

export function StatCard({ etiqueta, valor, detalle, icono: Icono }) {
  return (
    <Tarjeta className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">{etiqueta}</p>
          <p className="tabular mt-1.5 text-2xl font-semibold text-verde-900">{valor}</p>
          {detalle && <p className="mt-0.5 text-xs text-slate-500">{detalle}</p>}
        </div>
        {Icono && (
          <span className="rounded-lg bg-verde-50 p-2 text-verde-600">
            <Icono size={18} aria-hidden="true" />
          </span>
        )}
      </div>
    </Tarjeta>
  )
}
