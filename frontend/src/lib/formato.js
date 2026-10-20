export const pesos = (n) => '$' + Math.round(n).toLocaleString('es-CL')

export const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`

/** Limpia y da formato 12.345.678-9 */
export function formatearRut(valor) {
  const limpio = String(valor).replace(/[^0-9kK]/g, '').toUpperCase()
  if (limpio.length < 2) return limpio
  const cuerpo = limpio.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${cuerpo}-${limpio.slice(-1)}`
}

/** Verifica el dígito verificador (módulo 11). */
export function rutValido(valor) {
  const limpio = String(valor).replace(/[^0-9kK]/g, '').toUpperCase()
  if (limpio.length < 7) return false
  const cuerpo = limpio.slice(0, -1)
  let suma = 0
  let factor = 2
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * factor
    factor = factor === 7 ? 2 : factor + 1
  }
  const resto = 11 - (suma % 11)
  const dv = resto === 11 ? '0' : resto === 10 ? 'K' : String(resto)
  return dv === limpio.slice(-1)
}
