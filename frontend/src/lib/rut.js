export function limpiarRut(valor = '') {
  return valor.replace(/[^0-9kK]/g, '').toUpperCase()
}

export function formatearRut(valor = '') {
  const limpio = limpiarRut(valor)
  if (limpio.length < 2) return limpio
  const cuerpo = limpio.slice(0, -1)
  const dv = limpio.slice(-1)
  return `${Number(cuerpo).toLocaleString('es-CL')}-${dv}`
}

export function rutValido(valor) {
  const rut = limpiarRut(valor)
  if (rut.length < 8) return false
  const cuerpo = rut.slice(0, -1)
  const dv = rut.slice(-1)
  let suma = 0
  let multiplicador = 2
  for (let i = cuerpo.length - 1; i >= 0; i -= 1) {
    suma += Number(cuerpo[i]) * multiplicador
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1
  }
  const resto = 11 - (suma % 11)
  const esperado = resto === 11 ? '0' : resto === 10 ? 'K' : String(resto)
  return dv === esperado
}
