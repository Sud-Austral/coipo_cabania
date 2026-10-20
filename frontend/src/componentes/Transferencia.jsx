import { useEffect, useRef, useState } from 'react'
import { Check, Copy, Landmark } from 'lucide-react'
import { DATOS_TRANSFERENCIA } from '../lib/reglas.js'
import { pesos } from '../lib/formato.js'
import { Boton } from './ui.jsx'

/** Filas de datos de la cuenta de destino, con botón para copiar cada valor. */
export function DatosCuenta({ monto, glosa }) {
  const d = DATOS_TRANSFERENCIA
  const filas = [
    ['Nombre', d.titular],
    ['RUT', d.rut],
    ['Banco', d.banco],
    ['Tipo de cuenta', d.tipo],
    ['N° de cuenta', d.numero],
    ...(monto ? [['Monto', pesos(monto)]] : []),
    ['Glosa', glosa],
  ]
  return (
    <dl className="divide-y divide-borde rounded-lg border border-borde">
      {filas.map(([t, v]) => (
        <div key={t} className={`grid grid-cols-[7.5rem_1fr_auto] items-center gap-2 px-3 py-2 ${t === 'Glosa' ? 'bg-verde-50' : ''}`}>
          <dt className="text-[13px] text-tinta-500">{t}</dt>
          <dd className={`min-w-0 break-words text-[15px] ${t === 'Glosa' ? 'font-semibold text-verde-800' : 'font-medium'}`}>{v}</dd>
          <Copiar valor={t === 'Monto' ? String(monto) : v} etiqueta={t} />
        </div>
      ))}
    </dl>
  )
}

function Copiar({ valor, etiqueta }) {
  const [ok, setOk] = useState(false)
  async function copiar() {
    try {
      await navigator.clipboard.writeText(valor)
      setOk(true)
      setTimeout(() => setOk(false), 1500)
    } catch {
      // Sin acceso al portapapeles: el valor queda visible para copiarlo a mano.
    }
  }
  return (
    <button
      type="button"
      onClick={copiar}
      className="grid size-9 place-items-center rounded-md text-tinta-400 hover:bg-stone-100 hover:text-tinta-900"
      aria-label={ok ? `${etiqueta} copiado` : `Copiar ${etiqueta.toLowerCase()}`}
      title={ok ? 'Copiado' : 'Copiar'}
    >
      {ok ? <Check className="size-4 text-verde-600" aria-hidden /> : <Copy className="size-4" aria-hidden />}
    </button>
  )
}

/**
 * Cuadro centrado con los datos para transferir. Se abre al elegir la
 * transferencia; el usuario debe cerrarlo para continuar.
 */
export function CuadroTransferencia({ monto, glosa, plazo, onCerrar }) {
  const boton = useRef(null)
  useEffect(() => {
    boton.current?.focus()
    const tecla = (e) => e.key === 'Escape' && onCerrar()
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [onCerrar])

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="titulo-transferencia">
      <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <Landmark className="size-8 text-verde-700" aria-hidden />
        <h2 id="titulo-transferencia" className="mt-2 text-lg font-bold">
          Datos para la transferencia
        </h2>
        <p className="mt-1 text-[15px] text-tinta-700">
          Transfiera {monto ? <strong>{pesos(monto)}</strong> : 'el total de la estadía'} {plazo} a la siguiente cuenta. Escriba la glosa tal como aparece: así Bienestar identifica su pago.
        </p>
        <div className="mt-4">
          <DatosCuenta monto={monto} glosa={glosa} />
        </div>
        <p className="mt-3 text-[13px] text-tinta-500">Estos datos también quedarán en su comprobante de reserva.</p>
        <Boton ref={boton} className="mt-5 w-full" onClick={onCerrar}>
          Entendido, cerrar
        </Boton>
      </div>
    </div>
  )
}
