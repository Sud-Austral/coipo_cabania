/**
 * Cliente simulado de la API.
 *
 * En la fase 2 este archivo se reemplaza por llamadas `fetch` reales al backend
 * FastAPI. Por eso todas las funciones de `api/*` son asíncronas y devuelven
 * datos con la misma forma que devolvería el backend (snake_case, listas
 * paginadas como {items, total}, errores como {status, detail}).
 *
 * NINGÚN componente debe importar fixtures ni tocar localStorage directamente:
 * todo pasa por esta capa.
 */

/** Latencia simulada, para que la interfaz muestre sus estados de carga. */
const LATENCIA_MS = 180

export function responder(datos, ms = LATENCIA_MS) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(estructurar(datos)), ms)
  })
}

export function fallar(status, detail, ms = LATENCIA_MS) {
  return new Promise((_, reject) => {
    setTimeout(() => reject({ status, detail }), ms)
  })
}

/** Copia profunda: evita que la interfaz mute el estado del store por accidente. */
function estructurar(datos) {
  return typeof structuredClone === 'function'
    ? structuredClone(datos)
    : JSON.parse(JSON.stringify(datos))
}

/** Envuelve una lista con la forma paginada del backend. */
export const lista = (items) => ({ items, total: items.length })
