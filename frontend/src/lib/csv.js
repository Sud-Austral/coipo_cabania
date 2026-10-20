import { guardarArchivo } from './guardar.js'

/** Entrega filas como CSV legible en Excel (separador ';', BOM UTF-8). */
export function descargarCSV(nombre, encabezados, filas) {
  const celda = (v) => {
    const t = v == null ? '' : String(v)
    return /[;"\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t
  }
  const texto = [encabezados, ...filas].map((f) => f.map(celda).join(';')).join('\r\n')
  return guardarArchivo(nombre, new Blob(['\ufeff' + texto], { type: 'text/csv;charset=utf-8' }))
}
