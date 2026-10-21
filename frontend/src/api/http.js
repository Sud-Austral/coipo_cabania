// Capa HTTP unica del frontend. TODO lo que hable con el backend pasa por aqui.
// ============================================================================
// Por que existe y no un fetch suelto en cada vista: sin una capa comun, un 401 o un
// 500 sin manejar deja la pantalla en un estado vacio indistinguible de "no hay datos"
// -que es peor que un error visible, porque quien mira no sabe que algo se rompio-, y
// cada vista acaba reinventando su propio manejo, distinto y peor.
//
// Cuatro piezas, cada una por un fallo concreto que ya ocurrio en esta flota:
//   1. ApiError                     un error tipado, con el status y el `detail` reales
//   2. EVENTO_SESION_EXPIRADA       un canal unico para el 401
//   3. la guarda anti-bucle         contra el ciclo app <-> IAM que el navegador NO ve
//   4. el tope de 8 segundos        contra "Verificando sesion..." para siempre
//
// NO hay URL base configurable, NO hay VITE_API_URL y NO hay CORS (D-33): el nginx del
// contenedor `app` sirve la SPA y proxea /api/ al backend por la red interna de Docker,
// asi que es el MISMO origen. Cero variables de runtime en el frontend significa que no
// existe una variable que pueda quedar apuntando al entorno equivocado despues de un
// despliegue. En desarrollo, vite.config.js hace el mismo proxy hacia el backend local.

/** Prefijo de la API. D-03: /api/v1 con dos unicas excepciones cerradas,
 *  /health y /auth/callback, que NO se piden desde aqui. */
export const BASE_API = '/api/v1'

/**
 * Tope de tiempo de cualquier peticion.
 *
 * fetch() NO tiene timeout propio: si el backend acepta la conexion y no responde
 * nunca, la promesa no se resuelve JAMAS. Sin este tope, un backend colgado deja la
 * pantalla en "Verificando sesion..." indefinidamente, que a los ojos de quien la mira
 * a las 8:00 es la aplicacion caida — y no hay ni un error en la consola que lo diga.
 * Ocho segundos: por encima de cualquier consulta sana de esta flota (el presupuesto de
 * `statement_timeout` del backend es menor) y por debajo de la paciencia de nadie.
 */
export const TIEMPO_MAXIMO_MS = 8000

/**
 * Senal compartida de "sesion expirada".
 *
 * La sesion es una cookie httpOnly emitida por el backend, asi que el frontend NO PUEDE
 * VER si expiro: se entera solo cuando una llamada responde 401. Sin un canal comun,
 * cada consumidor trata ese 401 como "el backend fallo" y pinta un error; el caso real
 * es alguien enfocando a las 8:00 la pestana que dejo abierta el dia anterior, que se
 * encontraria con una pantalla vacia y sin ninguna forma de volver a entrar salvo
 * adivinar que hay que recargar.
 *
 * Lo emite `pedir()` una sola vez, desde aqui. Lo escucha ProveedorSesion.
 */
export const EVENTO_SESION_EXPIRADA = 'coipo:sesion-expirada'

// ---------------------------------------------------------------------------
// GUARDA ANTI-BUCLE app <-> IAM
// ---------------------------------------------------------------------------
// El bucle, paso a paso, tal como ocurre:
//
//   1. la SPA pide /api/v1/me y recibe 401
//   2. la SPA navega al backend, que redirige al COIPO IAM
//   3. el IAM ya tiene sesion propia, asi que NO pide clave: reemite un `code` y
//      redirige de vuelta a /auth/callback
//   4. el callback falla por algo PERMANENTE -la cookie descartada por `Secure` sobre
//      HTTP, el reloj del servidor desfasado, un `state` que ya no valida, la app
//      registrada con otra redirect_uri- y deja al usuario sin sesion
//   5. volver a 1
//
// Y lo que lo hace grave: son NAVEGACIONES COMPLETAS del documento, no redirecciones
// dentro de una misma peticion. El navegador NO lo detecta como redirect loop y no
// muestra ERR_TOO_MANY_REDIRECTS: la pantalla simplemente parpadea para siempre y el
// unico sintoma es que el ventilador del equipo sube. Sin sesion no hay como salir.
//
// La guarda es una marca de UN SOLO DISPARO por pestana: se pone justo antes de irse al
// IAM y se borra en cuanto una respuesta autenticada demuestra que el ciclo se cerro.
// Si al volver del IAM la marca sigue puesta, el intento anterior no dejo sesion: se
// para y se muestra una pantalla con un boton, en vez de reintentar.
//
// sessionStorage y NO localStorage: la marca debe morir con la pestana. Con
// localStorage, un fallo transitorio de ayer bloquearia el ingreso de hoy.
// NOTA: aqui NO se guarda ningun token. El token del IAM muere dentro del adaptador del
// backend (patron BFF) y j03 bloquea cualquier credencial en el almacenamiento del
// navegador. Esta marca es un booleano sin valor para nadie.

const CLAVE_INTENTO = 'coipo_intento_ingreso'

/** sessionStorage lanza en contextos con almacenamiento bloqueado (modo privado de
 *  algunos navegadores, politicas de sitio). Un throw aqui romperia el arranque entero
 *  de la aplicacion por una guarda que es una optimizacion de seguridad, no un
 *  requisito. Si no hay almacenamiento, se degrada a "no hay marca". */
function almacen() {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

export function marcarIntentoDeIngreso() {
  try {
    almacen()?.setItem(CLAVE_INTENTO, '1')
  } catch {
    // Cuota llena o almacenamiento bloqueado: se pierde la guarda, no la aplicacion.
  }
}

export function yaSeIntentoIngresar() {
  try {
    return almacen()?.getItem(CLAVE_INTENTO) === '1'
  } catch {
    return false
  }
}

export function limpiarIntentoDeIngreso() {
  try {
    almacen()?.removeItem(CLAVE_INTENTO)
  } catch {
    // idem
  }
}

// ---------------------------------------------------------------------------
// El error
// ---------------------------------------------------------------------------

/** Error de la API, con el status HTTP y el `detail` que devuelve FastAPI. */
export class ApiError extends Error {
  constructor(mensaje, { status = 0, detail = null, payload = null, causa = null } = {}) {
    super(mensaje)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
    this.payload = payload
    this.causa = causa
  }

  /** No hay sesion o expiro: la interfaz debe volver a la puerta. */
  get esNoAutenticado() {
    return this.status === 401
  }

  /** Hay sesion, pero el rol o el ambito no alcanzan. NO es lo mismo que un 401:
   *  reintentar el ingreso no arregla un 403 y mandarlo al IAM produce un viaje inutil. */
  get esSinPermiso() {
    return this.status === 403
  }

  /** El backend no respondio dentro de TIEMPO_MAXIMO_MS. Se distingue de `status: 0`
   *  (sin red) porque el mensaje al usuario y la accion son distintos. */
  get esTiempoAgotado() {
    return this.causa === 'tiempo'
  }

  /** El backend arranco sin credenciales del IAM. NO es "anda a autenticarte" -no se
   *  puede- ni "el backend cayo": es un despliegue incompleto, y el cuerpo trae los
   *  NOMBRES de las variables que faltan. */
  get esNoConfigurado() {
    return this.status === 503
  }
}

/**
 * FastAPI devuelve `detail` como texto (HTTPException) o como lista de objetos (errores
 * de validacion 422). Se normaliza a un mensaje legible.
 *
 * Nunca se muestra el cuerpo crudo: un 500 puede traer una traza, y una traza puede
 * traer datos personales. Lo mismo que hace `hide_parameters=True` en el backend
 * (D-18), pero en el borde del navegador.
 */
function mensajeDesdeDetail(detail, status) {
  if (typeof detail === 'string' && detail.trim()) return detail
  if (Array.isArray(detail) && detail.length) {
    return detail
      .map((d) => {
        const campo = Array.isArray(d.loc) ? d.loc.filter((p) => p !== 'body').join('.') : ''
        return campo ? `${campo}: ${d.msg}` : d.msg
      })
      .filter(Boolean)
      .join(' · ')
  }
  if (status === 401) return 'Tu sesion expiro. Vuelve a ingresar.'
  if (status === 403) return 'No tienes permiso para realizar esta accion.'
  if (status === 404) return 'No se encontro lo que buscabas.'
  if (status === 503) return 'El servicio no esta disponible. Es un problema de despliegue.'
  if (status >= 500) return 'El servidor tuvo un problema. Intenta de nuevo en unos minutos.'
  return `Error ${status}`
}

function construirUrl(ruta, params) {
  // Ruta absoluta (empieza con /) se respeta tal cual: sirve para /health, que por
  // decreto vive fuera de /api/v1 (D-03).
  const base = ruta.startsWith('/') ? ruta : `${BASE_API}/${ruta}`
  if (!params) return base
  const qs = new URLSearchParams()
  for (const [clave, valor] of Object.entries(params)) {
    if (valor !== undefined && valor !== null && valor !== '') qs.append(clave, String(valor))
  }
  const s = qs.toString()
  return s ? `${base}?${s}` : base
}

/**
 * Hace la peticion.
 *
 * @param {string} ruta      '/api/v1/solicitudes' o 'solicitudes' (se le antepone BASE_API)
 * @param {object} opciones
 *   - metodo        'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
 *   - cuerpo        objeto que se serializa a JSON
 *   - params        objeto -> query string (se omiten null, undefined y '')
 *   - signal        AbortSignal del llamador, para cancelar al desmontar el componente
 *   - cabeceras     cabeceras extra (hoy solo `Idempotency-Key`)
 *   - tiempoMaximoMs  tope propio; por defecto TIEMPO_MAXIMO_MS
 * @returns el cuerpo JSON, o null si la respuesta fue 204
 * @throws {ApiError} siempre que no sea 2xx, y tambien sin red o por tiempo agotado
 */
export async function pedir(
  ruta,
  { metodo = 'GET', cuerpo, params, signal, cabeceras, tiempoMaximoMs = TIEMPO_MAXIMO_MS } = {},
) {
  const url = construirUrl(ruta, params)

  // Se compone el AbortSignal del llamador con el del tope de tiempo SIN usar
  // AbortSignal.any(): esa API no existe en navegadores anteriores a 2024 y este
  // frontend se sirve a equipos institucionales cuya version no controla el equipo.
  const control = new AbortController()
  let porTiempo = false
  const reloj = setTimeout(() => {
    porTiempo = true
    control.abort()
  }, tiempoMaximoMs)
  const propagarCancelacion = () => control.abort()
  signal?.addEventListener('abort', propagarCancelacion, { once: true })

  let respuesta
  try {
    respuesta = await fetch(url, {
      method: metodo,
      // 'same-origin' y no 'include': por decreto el frontend y la API comparten
      // origen (D-33). 'include' funcionaria igual hoy y ademas mandaria la cookie a
      // cualquier origen al que alguien apunte manana. La opcion mas estricta que
      // cumple el requisito es la que se declara.
      credentials: 'same-origin',
      // Sin esto, un GET a /me puede servirse desde la cache del navegador y la
      // aplicacion cree que hay sesion despues de cerrarla.
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        ...(cuerpo !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...cabeceras,
      },
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
      signal: control.signal,
    })
  } catch (err) {
    if (porTiempo) {
      throw new ApiError(
        'El servidor no respondio a tiempo. Reintenta en unos segundos.',
        { status: 0, causa: 'tiempo' },
      )
    }
    // Cancelacion pedida por el llamador (componente desmontado): se propaga tal cual
    // para que el llamador la ignore, no como error de la aplicacion.
    if (err.name === 'AbortError') throw err
    throw new ApiError('No se pudo conectar con el servidor. Revisa tu conexion.', {
      status: 0,
      causa: 'red',
    })
  } finally {
    clearTimeout(reloj)
    signal?.removeEventListener('abort', propagarCancelacion)
  }

  if (respuesta.status === 204) return null

  // `+json` tambien: un GeoJSON llega como `application/geo+json` y los errores RFC 9457 como
  // `application/problem+json`. Con `includes('application/json')` ambos daban `null` sin ningun error.
  const esJson = /application\/(?:[\w.-]+\+)?json(?![\w-])/i.test(respuesta.headers.get('content-type') || '')
  const payload = esJson ? await respuesta.json().catch(() => null) : null

  if (!respuesta.ok) {
    const detail = payload && typeof payload === 'object' ? payload.detail : null
    if (respuesta.status === 401) {
      // Se avisa UNA vez, desde aqui, en vez de repetir la logica en cada vista.
      window.dispatchEvent(new CustomEvent(EVENTO_SESION_EXPIRADA))
    }
    throw new ApiError(mensajeDesdeDetail(detail, respuesta.status), {
      status: respuesta.status,
      detail,
      payload,
    })
  }

  return payload
}
