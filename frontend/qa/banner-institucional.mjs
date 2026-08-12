/**
 * QA del banner institucional (§8 de INSUMO_GRAFICO/implementacion_banner.md).
 *
 * Mide el alto pintado por DOS vías independientes que deben coincidir (el DOM
 * dice lo que el CSS declaró; el barrido del PNG dice lo que se pintó), barre
 * el filete por color con tolerancia Manhattan —nunca por igualdad— y deja los
 * recortes que un humano tiene que MIRAR.
 *
 * Requiere el servidor:  npm run dev -- --port 5199 --strictPort
 *                    o:  npm run preview -- --port 5199 --strictPort
 * Uso:                   node qa/banner-institucional.mjs
 *
 * No hay script npm ni job de CI a propósito: qa/ es un directorio manual y
 * pages.yml corre en ubuntu, donde puppeteer-core no trae navegador.
 */
import puppeteer from 'puppeteer-core'
import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const BASE = process.env.BASE ?? 'http://localhost:5199/coipo_cabania/'
// tmpdir() en vez de la ruta corta 8.3 que traen los otros scripts de qa: esa
// está atada a un usuario concreto y falla con EPERM en cualquier otra máquina.
const CAPS = process.env.CAPS ?? join(tmpdir(), 'caps-banner')
const CHROME =
  process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
mkdirSync(CAPS, { recursive: true })

// Medidos sobre el asset con Pillow. Si el banner cambia, volver a medirlos
// (§1) y actualizar también --banner-razon / --banner-alto-minimo en index.css.
const RAZON = 17.1299 // 3032 / 177
const ALTO_MIN = 68
const ANCHO_ASSET = 3032
const CRUCE = ALTO_MIN * RAZON // 1164,8362
const FILETE_AZUL_X = [67, 169]
const FILETE_ROJO_X = [170, 283]
const ZONA_SEGURA = [858, 2744] // columnas donde el corte no deja costura

const FONDO = [6, 73, 40] // #064928
const AZUL = [12, 107, 173] // #0c6bad — el README dice #0e69b0: distancia 12
const ROJO = [240, 60, 71] // #f03c47 — el README dice #eb3d49: distancia 8
const BLANCO = [255, 255, 255]
const TOL = 60 // Manhattan. NUNCA igualdad: el navegador reescala el JPEG.

// El 1110 no es un ancho redondo: es el peor caso de recorte, donde el piso
// corta 144 columnas dentro del remate decorativo.
const ANCHOS = [1920, 1366, 1165, 1110, 768, 390]

const man = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2])
const cerca = (a, b, tol = TOL) => man(a, b) <= tol

const fallos = []
const ok = (cond, msg) => {
  if (!cond) fallos.push(msg)
  return cond
}

const nav = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--hide-scrollbars'],
})

// Página auxiliar: decodifica PNG a píxeles con canvas, sin añadir dependencias
// (el repo solo tiene puppeteer-core; no hay sharp ni jimp).
const lector = await nav.newPage()
await lector.goto('about:blank')
const pixeles = (b64) =>
  lector.evaluate(async (datos) => {
    const img = new Image()
    img.src = 'data:image/png;base64,' + datos
    await img.decode()
    const c = document.createElement('canvas')
    c.width = img.naturalWidth
    c.height = img.naturalHeight
    const ctx = c.getContext('2d')
    ctx.drawImage(img, 0, 0)
    const d = ctx.getImageData(0, 0, c.width, c.height).data
    return { w: c.width, h: c.height, d: [...d] }
  }, b64)

const px = (img, x, y) => {
  const i = (y * img.w + x) * 4
  return [img.d[i], img.d[i + 1], img.d[i + 2]]
}

const p = await nav.newPage()
await p.goto(BASE, { waitUntil: 'networkidle2' })
await p.evaluate(() => localStorage.setItem('coipo_rol_v1', 'afiliado'))

const filas = []

for (const W of ANCHOS) {
  await p.setViewport({ width: W, height: 900, deviceScaleFactor: 1 })
  await p.goto(BASE + '#/catalogo', { waitUntil: 'networkidle2' })
  await p.reload({ waitUntil: 'networkidle2' })
  await new Promise((r) => setTimeout(r, 2200))

  // --- Vía 1: el DOM ---
  const m = await p.evaluate(() => {
    const img = document.querySelector('.banner-institucional img')
    const caja = img?.getBoundingClientRect()
    return {
      alto: caja?.height ?? 0,
      arriba: caja?.top ?? 0,
      derecha: caja?.right ?? 0,
      clientW: document.documentElement.clientWidth,
      scrollW: document.documentElement.scrollWidth,
    }
  })
  const esperado = Math.max(m.clientW, CRUCE) / RAZON
  ok(
    Math.abs(m.alto - esperado) <= 0.5,
    `${W}: alto en página ${m.alto.toFixed(2)} ≠ esperado ${esperado.toFixed(2)}`,
  )
  ok(m.scrollW <= m.clientW + 2, `${W}: SCROLL HORIZONTAL (${m.scrollW} > ${m.clientW})`)

  // --- Vía 2: los píxeles ---
  // Repintar la cabecera de blanco ANTES de capturar. Recolorea solo al vecino,
  // nunca al banner, así que el borde inferior es siempre un salto enorme.
  // Es necesario, no cosmético: el borde inferior del asset son tres colores, y
  // a 390 px la columna de barrido cae en la transición diagonal #15301d→#064928,
  // que cambia de color justo en la última fila (reportaría 67 en vez de 68).
  const estilo = await p.addStyleTag({ content: 'header { background: #fff !important }' })
  const clip = { x: 0, y: 0, width: W, height: 260 }
  const maquina = await pixeles(await p.screenshot({ encoding: 'base64', clip }))
  await estilo.evaluate((el) => el.remove())
  const humana = await p.screenshot({ encoding: 'base64', clip })
  writeFileSync(`${CAPS}/banner-${W}.png`, Buffer.from(humana, 'base64'))

  const colBarrido = Math.round(0.75 * W)
  let pintado = 0
  while (pintado < maquina.h && !cerca(px(maquina, colBarrido, pintado), BLANCO)) pintado++
  ok(
    Math.abs(Math.round(m.alto) - pintado) <= 1,
    `${W}: las dos vías no coinciden — DOM ${m.alto.toFixed(2)} vs píxeles ${pintado}`,
  )

  // --- Filete, en y=2 (en y=0 el JPEG lo lava por ringing) ---
  const escala = Math.max(m.clientW, CRUCE) / ANCHO_ASSET
  const corrida = (color) => {
    const xs = []
    for (let x = 0; x < maquina.w; x++) if (cerca(px(maquina, x, 2), color)) xs.push(x)
    return xs.length ? [xs[0], xs[xs.length - 1]] : null
  }
  const azul = corrida(AZUL)
  const rojo = corrida(ROJO)
  const bien =
    azul &&
    rojo &&
    azul[1] < rojo[0] && // azul ANTES que rojo
    rojo[0] - azul[1] <= 3 && // adyacentes
    Math.abs(azul[0] - FILETE_AZUL_X[0] * escala) <= 3 &&
    Math.abs(rojo[1] - FILETE_ROJO_X[1] * escala) <= 3
  ok(bien, `${W}: filete incompleto o desalineado — azul ${azul} rojo ${rojo}`)

  // --- Qué columna del asset cae en el borde derecho ---
  const columna = Math.round((m.clientW * ANCHO_ASSET) / Math.max(m.clientW, CRUCE))
  const sinCostura =
    columna >= ANCHO_ASSET || (columna >= ZONA_SEGURA[0] && columna <= ZONA_SEGURA[1])
  if (!sinCostura) {
    console.log(
      `   aviso ${W}: el corte cae en la columna ${columna}, fuera de la zona segura ` +
        `[${ZONA_SEGURA}] — MIRAR banner-${W}.png (recorta el remate decorativo)`,
    )
  }

  filas.push({
    w: W,
    esperado: esperado.toFixed(2),
    enPagina: m.alto.toFixed(2),
    pintado,
    azul: azul ? `${azul[0]}-${azul[1]}` : null,
    rojo: rojo ? `${rojo[0]}-${rojo[1]}` : null,
    columna,
    ok: bien && Math.abs(Math.round(m.alto) - pintado) <= 1 ? 'OK' : 'REVISAR',
  })
  console.log(
    `${W}: alto ${m.alto.toFixed(2)} (píxeles ${pintado}) | filete azul ${filas.at(-1).azul} ` +
      `rojo ${filas.at(-1).rojo} | columna ${columna} → ${filas.at(-1).ok}`,
  )

  // --- Marca ampliada ×4, solo a 390: es lo único que juzga un ojo ---
  if (W === 390) {
    const recorte = await p.screenshot({
      encoding: 'base64',
      clip: { x: 0, y: Math.round(m.arriba), width: 220, height: ALTO_MIN },
    })
    const x4 = await lector.evaluate(async (datos) => {
      const img = new Image()
      img.src = 'data:image/png;base64,' + datos
      await img.decode()
      const c = document.createElement('canvas')
      c.width = img.naturalWidth * 4
      c.height = img.naturalHeight * 4
      const ctx = c.getContext('2d')
      ctx.imageSmoothingEnabled = false // vecino más cercano: no inventa nitidez
      ctx.drawImage(img, 0, 0, c.width, c.height)
      return c.toDataURL().split(',')[1]
    }, recorte)
    writeFileSync(`${CAPS}/banner-390-marca-x4.png`, Buffer.from(x4, 'base64'))
  }
}

// --- Atributos y landmarks, una vez a 1366 ---
await p.setViewport({ width: 1366, height: 900, deviceScaleFactor: 1 })
await p.goto(BASE + '#/catalogo', { waitUntil: 'networkidle2' })
await new Promise((r) => setTimeout(r, 1500))
const dom = await p.evaluate(() => {
  const img = document.querySelector('.banner-institucional img')
  return {
    headers: document.querySelectorAll('header').length,
    mains: document.querySelectorAll('main').length,
    navs: document.querySelectorAll('nav[aria-label]').length,
    roles: document.querySelectorAll('[role="banner"]').length,
    alt: img?.alt,
    prioridad: img?.getAttribute('fetchpriority'),
    decoding: img?.getAttribute('decoding'),
    w: img?.getAttribute('width'),
    h: img?.getAttribute('height'),
  }
})
ok(dom.headers === 1, `hay ${dom.headers} <header>: landmark banner duplicado`)
ok(dom.mains === 1, `hay ${dom.mains} <main>`)
ok(dom.navs === 1, `hay ${dom.navs} <nav aria-label>`)
ok(dom.roles === 0, `hay ${dom.roles} role="banner" explícitos (el <header> ya lo es)`)
ok(dom.alt && dom.alt.toLowerCase() !== 'banner', `alt poco descriptivo: "${dom.alt}"`)
ok(dom.prioridad === 'high', `falta fetchpriority="high" (es ${dom.prioridad})`)
ok(dom.decoding === 'async', `falta decoding="async" (es ${dom.decoding})`)
ok(dom.w === String(ANCHO_ASSET) && dom.h === '177', `width/height ≠ originales: ${dom.w}×${dom.h}`)

// --- Caso sin imagen: debe verse el verde, jamás blanco ---
const sin = await nav.newPage()
await sin.setViewport({ width: 1366, height: 900, deviceScaleFactor: 1 })
await sin.setRequestInterception(true)
// Solo la petición de IMAGEN. En dev, Vite sirve el `import` del asset como un
// módulo JS que devuelve la URL: abortarlo por patrón de URL rompe el grafo de
// módulos y BannerInstitucional.jsx no llega a renderizar — la captura saldría
// en blanco y parecería que falló el fondo, cuando falló el montaje.
sin.on('request', (r) =>
  /banner-conaf-uia/.test(r.url()) && r.resourceType() === 'image' ? r.abort() : r.continue(),
)
await sin.goto(BASE + '#/catalogo', { waitUntil: 'networkidle2' })
await new Promise((r) => setTimeout(r, 2000))
const capSin = await sin.screenshot({
  encoding: 'base64',
  clip: { x: 0, y: 0, width: 1366, height: 120 },
})
writeFileSync(`${CAPS}/banner-sin-imagen.png`, Buffer.from(capSin, 'base64'))
const imgSin = await pixeles(capSin)
const puntoSin = px(imgSin, Math.round(0.75 * 1366), 34)
const altoSin = await sin.evaluate(
  () => document.querySelector('.banner-institucional img')?.getBoundingClientRect().height ?? 0,
)
ok(cerca(puntoSin, FONDO), `sin imagen: el fondo es ${puntoSin}, se esperaba ${FONDO}`)
ok(man(puntoSin, BLANCO) > 400, `sin imagen: el fondo tira a blanco (${puntoSin})`)
ok(altoSin > 60, `sin imagen: la caja colapsó a ${altoSin.toFixed(2)} px (¿aspect-ratio?)`)
console.log(`sin imagen: fondo rgb(${puntoSin}) alto ${altoSin.toFixed(2)} → ${fallos.length ? '' : 'OK'}`)

// --- El comprobante impreso: printBackground:false reproduce el defecto de
//     Chrome, que es donde se ve si algo sale blanco sobre blanco. Sin
//     aserciones: es para el ojo. ---
await sin.close()
await p.evaluate(() => localStorage.setItem('coipo_rol_v1', 'afiliado'))
await p.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 }) // A4 a 96 ppp
await p.goto(BASE + '#/reservas/R-2026-0001', { waitUntil: 'networkidle2' })
await new Promise((r) => setTimeout(r, 2000))
await p.pdf({ path: `${CAPS}/comprobante.pdf`, format: 'A4', printBackground: false })
// Además en PNG: un PDF no se puede mirar en cualquier parte, y esto es
// exactamente lo mismo que ve la impresora.
await p.emulateMediaType('print')
await new Promise((r) => setTimeout(r, 500))
await p.screenshot({ path: `${CAPS}/comprobante-impresion.png`, clip: { x: 0, y: 0, width: 794, height: 700 } })
await p.emulateMediaType(null)

writeFileSync(
  `${CAPS}/medidas.json`,
  JSON.stringify({ ratio: RAZON, minHeight: ALTO_MIN, filas, sinImagen: true }, null, 2),
)

await nav.close()
console.log(`\nRESULTADO: ${ANCHOS.length - filas.filter((f) => f.ok !== 'OK').length} de ${ANCHOS.length} anchos correctos`)
if (fallos.length) fallos.forEach((f) => console.log('  !! ' + f))
console.log(`\nCapturas en ${CAPS}`)
console.log('MIRAR A OJO (el script no lo puede juzgar):')
console.log('  banner-390-marca-x4.png  ¿se leen UNIDAD DE / INFORMACIÓN / Y ANÁLISIS?')
console.log('  banner-1110.png          ¿es aceptable el corte del remate decorativo?')
console.log('  banner-1920.png / -390   ¿filete entero, sin raya clara en los bordes?')
console.log('  banner-sin-imagen.png    ¿verde #064928, nunca blanco?')
console.log('  comprobante-impresion.png ¿sale el membrete y se lee todo el texto en papel?')
process.exit(fallos.length ? 1 : 0)
