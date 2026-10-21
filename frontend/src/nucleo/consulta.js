/* Lectura de la API simulada (logica/api) con recarga tras cada cambio.
   `refrescar()` se llama después de toda escritura y vuelve a pedir lo que está en pantalla.
   Mientras recarga se conservan los datos anteriores: la lista no parpadea. */
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'

let version = 0
const subs = new Set()

export function refrescar() {
  version += 1
  subs.forEach((f) => f())
}

const suscribir = (f) => { subs.add(f); return () => subs.delete(f) }

/** { datos, cargando, error } de `fn()` (promesa). Se repite al cambiar `deps` o tras refrescar(). */
export function useConsulta(fn, deps = []) {
  const v = useSyncExternalStore(suscribir, () => version)
  const [estado, setEstado] = useState({ datos: null, cargando: true, error: null })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const pedir = useCallback(fn, deps)
  useEffect(() => {
    let vivo = true
    setEstado((e) => ({ ...e, cargando: true }))
    Promise.resolve()
      .then(pedir)
      .then((datos) => vivo && setEstado({ datos, cargando: false, error: null }))
      .catch((e) => vivo && setEstado({ datos: null, cargando: false, error: e?.detail ?? String(e) }))
    return () => { vivo = false }
  }, [pedir, v])
  return estado
}

/** Ejecuta una escritura: devuelve [correr, { ocupado, error }]. Al terminar bien, refresca. */
export function useAccion() {
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState(null)
  const correr = useCallback(async (fn) => {
    setOcupado(true)
    setError(null)
    try {
      const r = await fn()
      refrescar()
      return { ok: true, r }
    } catch (e) {
      setError(e?.detail ?? e?.message ?? 'No se pudo completar.')
      return { ok: false }
    } finally {
      setOcupado(false)
    }
  }, [])
  return [correr, { ocupado, error, limpiar: () => setError(null) }]
}
