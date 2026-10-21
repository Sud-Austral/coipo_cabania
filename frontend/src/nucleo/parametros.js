/* Reglas que edita el administrador (store.parametros). La lógica (logica/api/reservas.js) las lee
   con sus propios valores por omisión; aquí se usan LOS MISMOS, para que la pantalla muestre la
   regla que de verdad se aplica. v1 mostraba 2 días de anticipación mínima mientras la API aplicaba
   0 hasta el primer guardado: ver docs/HALLAZGOS.md. */
import { store, persistir, registrarAuditoria } from '../logica/api/store.js'

export const PREDETERMINADAS = {
  anticipacion_minima: 0, // reservas.js: `anticipacion_minima = 0`
  anticipacion_maxima: 180, // reservas.js
  desistimiento_sin_cobro: 7, // reservas.js → cobroPorDesistimiento
  cobro_fuerza_mayor_dias: 1, // reservas.js → anular y resolver emergencia
  plazo_resolucion_dias: 5, // solo informativo (v1: ReglasReserva.jsx)
  maximo_adjunto_mb: 2, // tope del respaldo de una emergencia
}

/** Cada regla se lee como una frase, con el número editable en medio. */
export const REGLAS = [
  { clave: 'anticipacion_minima', antes: 'Reservar con al menos', despues: 'días de anticipación.' },
  { clave: 'anticipacion_maxima', antes: 'Reservar como máximo', despues: 'días antes de llegar.' },
  { clave: 'desistimiento_sin_cobro', antes: 'Cancelar con', despues: 'días o más de aviso no tiene cobro.' },
  { clave: 'cobro_fuerza_mayor_dias', antes: 'Una emergencia aprobada cobra', despues: 'día(s) de limpieza.' },
  { clave: 'plazo_resolucion_dias', antes: 'La encargada responde en', despues: 'días.' },
  { clave: 'maximo_adjunto_mb', antes: 'Los respaldos pesan hasta', despues: 'MB.' },
]

export const leerParametros = () => ({ ...PREDETERMINADAS, ...(store.parametros ?? {}) })

export function guardarParametros(p, actor) {
  store.parametros = { ...p }
  persistir()
  registrarAuditoria({
    usuario: actor?.nombre ?? 'Administrador',
    perfil: actor?.perfil ?? 'Administrador',
    accion: 'Actualización de parámetros',
    entidad: 'Reglas de reserva',
    detalle: JSON.stringify(p),
  })
}
