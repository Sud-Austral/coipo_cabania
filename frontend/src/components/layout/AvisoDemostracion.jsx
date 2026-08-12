import { TriangleAlert } from 'lucide-react'

/**
 * Franja permanente de advertencia: esto es una maqueta, no un sistema.
 *
 * Cobra sentido recién ahora: la maqueta pasa a vivir en un dominio
 * institucional (https://reserva-bienestar.conaf.cl), donde cualquiera de la red
 * CONAF puede entrar, cambiarse de perfil desde el selector del encabezado y
 * creer que está reservando de verdad.
 *
 * Va DEBAJO del <header>, nunca encima, y no es negociable: el banner
 * institucional tiene que empezar en y=0 porque qa/banner-institucional.mjs mide
 * su alto barriendo píxeles desde la fila 0 hacia abajo y lo compara con el alto
 * del DOM; el caso "sin imagen" además muestrea el color de fondo en y=34.
 * Cualquier banda pintada más arriba hace fallar las dos verificaciones, y el
 * fallo se lee como "el banner cambió de tamaño", que es la pista equivocada.
 *
 * Tampoco es un <header>, ni lleva role="banner", ni un <nav aria-label>: ese
 * mismo QA cuenta los landmarks y exige exactamente uno de cada.
 *
 * Amber-400 y no el amber-50 de la banda de "usuario no afiliado", que aparece
 * justo debajo: los dos tonos claros se leerían como un error de color en vez de
 * como dos avisos distintos.
 *
 * Se imprime a propósito: NO lleva `no-imprimir`. El comprobante de reserva es
 * justo el papel que alguien podría confundir con un documento válido. Como el
 * texto es oscuro sobre fondo claro sigue legible aunque Chrome imprima sin
 * fondos, que es el comportamiento por omisión.
 */
export function AvisoDemostracion() {
  return (
    <div className="border-b border-amber-500 bg-amber-400">
      <p className="mx-auto flex max-w-7xl items-start gap-2 px-4 py-2 text-sm text-amber-950">
        <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span>
          <strong>Maqueta de demostración.</strong> Los inmuebles, tarifas, personas y reservas que
          aparecen son ficticios y se guardan solo en este navegador. Nada de lo que se haga en esta
          pantalla constituye una reserva ni tiene valor operativo ante el Servicio de Bienestar
          CONAF.
        </span>
      </p>
    </div>
  )
}
