/**
 * Entrega un archivo al usuario.
 *
 * Dentro del visor de claude.ai la página no puede descargar por sí misma:
 * se usa la capacidad `downloads`, que pide confirmación al usuario. Fuera
 * del visor (servidor local o institucional) se usa un enlace de descarga.
 */
export const enVisor = () => typeof window !== 'undefined' && typeof window.claude?.use === 'function'

export async function guardarArchivo(nombre, datos) {
  if (enVisor()) {
    const descargas = await window.claude.use('downloads')
    if (!descargas) throw new Error('Las descargas no están disponibles en esta vista.')
    try {
      await descargas.save({ filename: nombre, data: datos })
    } catch (e) {
      if (e?.code !== 'declined') throw e
    }
    return
  }
  const url = URL.createObjectURL(datos instanceof Blob ? datos : new Blob([datos]))
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
