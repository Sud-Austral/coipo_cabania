/**
 * verify-banner.mjs — verificacion de la maqueta del banner institucional. CONGELADO.
 * =================================================================================
 * Portado de COIPO_USUARIOS/frontend/scripts/verify-banner.mjs, que es el unico
 * verificador visual que existe hoy en la flota. Dos cambios respecto del original,
 * los dos por decreto:
 *
 *   1. NINGUNA constante de geometria esta escrita aqui. RAZON, ALTO_MINIMO, los
 *      sha256, el umbral del asset corto, la fila del filete y su tolerancia salen de
 *      src/marca.json, que GENERA semilla/sembrar.py midiendo el marcador SOFn del
 *      propio JPEG. El original tenia `const RATIO = 17.1299` tecleado: el dia que el
 *      asset se rediseno conservando el nombre de archivo -que es lo que le paso a
 *      banner3.jpg, de 10,39:1 a 17,13:1- una constante tecleada verifica contra una
 *      maqueta que ya no existe, y sale VERDE.
 *   2. La pasada contra la aplicacion real NO siembra un token en localStorage. El
 *      patron BFF de esta flota prohibe que exista un token del IAM en el navegador
 *      (j03), asi que sembrarlo aqui verificaria una app que no es la que se despliega.
 *      Se pasa una cookie de sesion obtenida fuera de banda, o no se corre esa pasada.
 *
 * Que el codigo compile no verifica NADA de esto: hay que capturar y MIRAR. Este
 * script automatiza lo medible -el alto pintado en cada ancho, la integridad del filete
 * bicolor, el caso sin imagen y el numero de landmarks `banner`- y deja las capturas
 * para que una persona juzgue lo que no se puede medir: si la marca se lee a 390 px y
 * si el corte del remate decorativo es aceptable.
 *
 * Uso (el script se llama `verificar:banner`, en espanol como el resto; esta ayuda
 * decia `verify:banner` y npm respondia "Missing script" a quien la copiaba):
 *   npm run verificar:banner
 *   npm run verificar:banner -- --app=http://127.0.0.1:8104 --cookie=sesion=<valor>
 *
 * Necesita un navegador, y `npm ci` NO lo instala:
 *   npx playwright install chromium
 *
 * Sale con codigo 1 si alguna medida no cuadra.
 */
import { createServer } from 'node:http'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import sharp from 'sharp'
import { chromium } from 'playwright'

const FRONTEND = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SALIDA = path.join(FRONTEND, 'verificacion')

// --- Toda la geometria, MEDIDA, desde el artefacto generado ---------------------
const marca = JSON.parse(await readFile(path.join(FRONTEND, 'src', 'marca.json'), 'utf8'))

const RAZON = marca.razon
const ALTO_MINIMO = marca.altoMinimo
const ANCHO_ASSET = marca.largo.ancho
const UMBRAL_CORTO = marca.umbralAssetCorto
// Con `?.`: si `filete` o `colores` faltan, se llega al guard de abajo y sale el
// mensaje. Hasta el 2026-09-08 se desreferenciaba ANTES del guard, asi que un
// marca.json incompleto daba un TypeError y el mensaje que explica que hacer
// nunca se imprimia.
const FILA_FILETE = marca.filete?.fila
const TOL = marca.filete?.toleranciaManhattan
const FILETE_AZUL = marca.filete?.azul
const FILETE_ROJO = marca.filete?.rojo
const CAMPO = marca.colores?.campoPrincipal ? hexARgb(marca.colores.campoPrincipal) : null

if (![RAZON, ALTO_MINIMO, ANCHO_ASSET, UMBRAL_CORTO, FILA_FILETE, TOL].every(Number.isFinite)
    || !Array.isArray(FILETE_AZUL) || !Array.isArray(FILETE_ROJO) || !CAMPO) {
  console.error('src/marca.json no trae la geometria completa. Se regenera, no se parchea.')
  process.exit(1)
}
// El original leia y=0. En y=0 el JPEG esta lavado por ringing -en banner3.jpg la fila
// 0 en x=200 da #b7393a y la 1 da #eb3d49- y un verificador que la lea da por perdido
// un filete que esta intacto. Si alguien pone 0 en marca.json, se para aqui.
if (FILA_FILETE < 1) {
  console.error(`filete.fila = ${FILA_FILETE}. NUNCA y=0: ahi el JPEG tiene ringing.`)
  process.exit(1)
}

/**
 * Los seis anchos.
 * 1165 es el cruce (ALTO_MINIMO * RAZON = 1164,83): debajo de el manda el piso.
 * 1110 no es un ancho "redondo": es el PEOR CASO de la banda entre el cruce y el ancho
 * donde el corte vuelve a caer en zona uniforme, donde el recorte entra mas adentro del
 * remate decorativo. Hay que MIRAR esa captura; medirla no basta.
 * 390 esta por debajo de UMBRAL_CORTO, asi que ejercita el <picture> con el asset corto.
 */
const ANCHOS = [1920, 1366, 1165, 1110, 768, 390]
const ALTO_CAPTURA = 400

function hexARgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/**
 * Alto esperado del banner, en px CSS.
 *
 * Por encima del cruce manda la proporcion natural; por debajo, el piso. Bajo
 * UMBRAL_CORTO el <picture> sirve el asset corto con `height: var(--alto-minimo)`, que
 * da el mismo numero: las dos ramas coinciden en ALTO_MINIMO y por eso una sola
 * formula cubre los seis anchos. No es casualidad, es la razon de ser del piso.
 */
const altoEsperado = (w) => Math.max(w / RAZON, ALTO_MINIMO)

/**
 * Comparacion por distancia Manhattan, NUNCA por igualdad.
 * El navegador reescala el JPEG y los valores se mueven unas unidades. Que esto no es
 * teorico lo demuestra el propio material: identidad/README.md registra el filete
 * como #0e69b0/#eb3d49 y implementacion_banner.md como #0c6bad/#f03c47 -distancia 7 y
 * 8-, y una comparacion exacta habria dado por perdido un filete intacto.
 */
const cerca = (px, c) =>
  Math.abs(px[0] - c[0]) + Math.abs(px[1] - c[1]) + Math.abs(px[2] - c[2]) < TOL

/**
 * Arnes: replica el DOM que pinta AppLayout.jsx y enlaza los CSS REALES del repo. No se
 * duplica ni una regla de las que estan bajo prueba: si alguien toca componentes.css o
 * BannerInstitucional.css, esto lo ve.
 *
 * El titulo superpuesto NO esta en el arnes a proposito. Lo que se verifica aqui es la
 * geometria que puede AMPUTAR un elemento de identidad -el alto pintado y el filete-, y
 * el titulo no puede amputar nada: se posiciona con --fin-marca, que este mismo script compara contra
 * `fin_de_marca_pct` de catalogos/gerencias.yaml. Meterlo aqui cambiaria el alto del
 * <header> bajo UMBRAL_CORTO (donde el titulo baja a su propia franja) y la medicion
 * dejaria de ser la del banner.
 *
 * El bloque blanco de abajo es el que hace medible el alto: se barre una columna hasta
 * la primera fila blanca. Se mide lo que se PINTO, no lo que el CSS declaro.
 */
const ARNES = `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<link rel="stylesheet" href="/src/estilos/tokens.css">
<!-- interfaz.css y no componentes.css: ese archivo no existe en la semilla y el
     navegador se lo tragaba con un 404 silencioso, o sea que el arnes media el
     banner sin la mitad de los tokens de interfaz. -->
<link rel="stylesheet" href="/src/estilos/interfaz.css">
<link rel="stylesheet" href="/src/componentes/BannerInstitucional.css">
<style>
  html, body { margin: 0; }
  /* Blanco puro y opaco: es el borde inferior que busca altoPintado(). */
  .medicion { height: 300px; background: #ffffff; }
</style>
</head><body>
<div class="marco-app">
  <header class="banner-institucional" role="banner">
    <a class="banner-enlace" href="/" aria-label="Ir al inicio">
      <picture>
        <source media="(max-width: ${UMBRAL_CORTO - 0.02}px)" srcset="/banner-corto.jpg">
        <img class="banner-imagen" src="/banner.jpg"
             alt="CONAF" width="${ANCHO_ASSET}" height="${marca.largo.alto}"
             fetchpriority="high" decoding="async">
      </picture>
    </a>
  </header>
  <div class="medicion"></div>
</div>
</body></html>`

const MIME = { '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.json': 'application/json' }

// LAS RUTAS SON `/banner.jpg` Y `/banner-corto.jpg`, no `/src/assets/...`.
//
// Este script se porto de COIPO_USUARIOS, que guarda los banners en
// `src/assets/`. La semilla NO: `sembrar.py` los copia a `frontend/public/`, que
// Vite sirve desde la raiz, y el componente del ESQUELETO los pide asi
// (`BannerInstitucional.jsx:72`, `src={`/${asset.archivo}`}`). Con la ruta
// portada, el arnes recibia un 404 y el navegador moria con
// `EncodingError: The source image cannot be decoded`: `npm run
// verificar:banner` NO PODIA PASAR en ninguna aplicacion recien sembrada.
//
// Se descubrio el 2026-09-09, el primer dia que el CI de la fabrica sembro un
// proyecto y le corrio su propio CI. Antes de eso nadie lo habia ejecutado
// sobre un sembrado: hacia falta chromium, y el paso vivia solo en las apps.
function servirArnes() {
  const servidor = createServer(async (req, res) => {
    const ruta = req.url.split('?')[0]
    if (ruta === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(ARNES)
      return
    }
    try {
      // Se resuelve COMO VITE: primero `public/`, que Vite sirve desde la raiz, y
      // luego el arbol del frontend. Sin lo primero, `/banner.jpg` -- que es la URL
      // que usa el componente real -- daba 404 aqui y el navegador moria con
      // `EncodingError: The source image cannot be decoded`.
      const rel = path.normalize(ruta).replace(/^[\\/]+/, '')
      const publico = path.join(FRONTEND, 'public')
      let abs = path.join(publico, rel)
      let cuerpo
      if (abs.startsWith(publico)) {
        cuerpo = await readFile(abs).catch(() => null)
      }
      if (cuerpo === null || cuerpo === undefined) {
        abs = path.join(FRONTEND, rel)
        if (!abs.startsWith(FRONTEND)) throw new Error('fuera del arbol')
        cuerpo = await readFile(abs)
      }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(abs)] || 'application/octet-stream' })
      res.end(cuerpo)
    } catch {
      res.writeHead(404).end('no existe')
    }
  })
  return new Promise((ok) => servidor.listen(0, '127.0.0.1', () => ok(servidor)))
}

/** Lee el PNG capturado y devuelve un lector de pixeles. */
async function pixeles(archivo) {
  const { data, info } = await sharp(archivo).raw().toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info
  return {
    width,
    height,
    at: (x, y) => {
      const i = (y * width + x) * channels
      return [data[i], data[i + 1], data[i + 2]]
    },
  }
}

/** Alto del banner barriendo una columna hasta la primera fila blanca (.medicion). */
function altoPintado(px, w) {
  const x = Math.floor(w * 0.75)
  for (let y = 0; y < px.height; y++) {
    const [r, g, b] = px.at(x, y)
    if (r > 240 && g > 240 && b > 240) return y
  }
  return -1
}

/** Posiciones del filete azul y del rojo en la fila FILA_FILETE. */
function filete(px, w) {
  const azul = []
  const rojo = []
  for (let x = 0; x < w; x++) {
    const p = px.at(x, FILA_FILETE)
    if (cerca(p, FILETE_AZUL)) azul.push(x)
    else if (cerca(p, FILETE_ROJO)) rojo.push(x)
  }
  return { azul, rojo }
}

/**
 * Cuenta landmarks `banner` en el documento.
 * Un <header> es landmark banner SOLO si no esta dentro de article, aside, main, nav o
 * section; y [role=banner] lo es siempre. Dos landmarks banner es un error de a11y, y es
 * exactamente lo que pasa cuando alguien convierte la barra superior en un <header>
 * porque "tambien es una cabecera". Ya se corrigio una vez en COIPO_USUARIOS.
 */
const CONTAR_BANNERS = () => {
  const dentroDeSeccion = (el) => el.closest('article, aside, main, nav, section') !== null
  const cabeceras = [...document.querySelectorAll('header')].filter((h) => !dentroDeSeccion(h))
  const explicitos = [...document.querySelectorAll('[role="banner"]')]
  return new Set([...cabeceras, ...explicitos]).size
}

async function main() {
  const arg = (nombre) => process.argv.find((a) => a.startsWith(`--${nombre}=`))?.slice(nombre.length + 3)
  const urlApp = arg('app')
  const cookie = arg('cookie')

  await mkdir(SALIDA, { recursive: true })

  const servidor = await servirArnes()
  const base = `http://127.0.0.1:${servidor.address().port}/`
  const navegador = await chromium.launch()
  const filas = []
  let fallos = 0

  // --- Pasadas 1 y 2: geometria y filete en los seis anchos --------------------
  const pagina = await navegador.newPage()
  for (const w of ANCHOS) {
    await pagina.setViewportSize({ width: w, height: ALTO_CAPTURA })
    await pagina.goto(base)
    await pagina.waitForSelector('.banner-institucional img')
    await pagina.evaluate(() => document.querySelector('.banner-institucional img').decode())

    const enPagina = await pagina.evaluate(
      () => document.querySelector('.banner-institucional img').getBoundingClientRect().height,
    )
    const archivo = path.join(SALIDA, `captura-banner-${w}.png`)
    await pagina.screenshot({ path: archivo })

    const px = await pixeles(archivo)
    const pintado = altoPintado(px, w)
    const { azul, rojo } = filete(px, w)
    const esperado = altoEsperado(w)

    // Columna del asset que queda en el borde derecho: dice si el corte cae en la zona
    // uniforme del campo plano o se come el remate decorativo.
    const columna = Math.round(ANCHO_ASSET * Math.min(1, w / (ALTO_MINIMO * RAZON)))

    const okAlto = Math.abs(pintado - esperado) <= 1 && Math.abs(enPagina - esperado) <= 1
    const okFilete =
      azul.length >= 20 && rojo.length >= 20 && Math.max(...azul) < Math.min(...rojo)
    if (!okAlto || !okFilete) fallos++

    filas.push({
      ancho: w,
      esperado: esperado.toFixed(2),
      enPagina: enPagina.toFixed(2),
      pintado,
      azul: azul.length ? `${Math.min(...azul)}-${Math.max(...azul)}` : '—',
      rojo: rojo.length ? `${Math.min(...rojo)}-${Math.max(...rojo)}` : '—',
      columna,
      ok: okAlto && okFilete ? 'OK' : 'FALLA',
    })
  }

  // --- Un solo landmark `banner` en el arnes -----------------------------------
  const bannersArnes = await pagina.evaluate(CONTAR_BANNERS)
  const okLandmarkArnes = bannersArnes === 1
  if (!okLandmarkArnes) fallos++

  // --- Caso sin imagen: debe verse el campo principal, NUNCA blanco -------------
  // El <img> lleva width/height del original, asi que el aspect-ratio conserva la caja
  // aunque la imagen no cargue y la banda entera sigue ahi. Si esto sale blanco, el dia
  // que el asset no llegue al artefacto desplegado la cabecera desaparece sin avisar.
  await pagina.setViewportSize({ width: 1366, height: ALTO_CAPTURA })
  await pagina.route('**/*.jpg', (r) => r.abort())
  await pagina.goto(base)
  const sinImagen = path.join(SALIDA, 'captura-banner-sin-imagen.png')
  await pagina.screenshot({ path: sinImagen })
  await pagina.unroute('**/*.jpg')
  const pxSin = await pixeles(sinImagen)
  // x = 0,75·W para no caer sobre el icono de imagen rota ni sobre el texto alt, que
  // Chromium pinta arriba a la izquierda.
  const fondo = pxSin.at(Math.floor(1366 * 0.75), 40)
  const okSinImagen = cerca(fondo, CAMPO)
  if (!okSinImagen) fallos++

  // --- Pasada 3: la marca a 390, ampliada x4 por vecino mas cercano -------------
  // A tamano real es imposible juzgar si el logotipo se lee. Esta captura NO se mide:
  // se MIRA.
  await sharp(path.join(SALIDA, 'captura-banner-390.png'))
    .extract({ left: 0, top: 0, width: 220, height: ALTO_MINIMO })
    .resize({ width: 880, height: ALTO_MINIMO * 4, kernel: 'nearest' })
    .toFile(path.join(SALIDA, 'captura-banner-390-marca-x4.png'))

  // --- Pasada 4 (opcional): la aplicacion real ---------------------------------
  // El banner vive tras RutaProtegida. Un contexto de navegador limpio redirige al
  // acceso y CAPTURARIAS LA PANTALLA DE LOGIN CREYENDO QUE CAPTURASTE EL BANNER: la
  // imagen sale bien, solo que de otra pagina. Es un fallo silencioso, asi que sin
  // cookie esta pasada NO se corre en vez de correr y mentir.
  //
  // Y no se siembra un token en localStorage como hacia el original: en esta flota el
  // token del IAM muere dentro del adaptador del backend y la sesion es una cookie
  // httpOnly (patron BFF). j03 bloquea cualquier token en el almacenamiento del
  // navegador; sembrarlo aqui verificaria una aplicacion distinta de la que se despliega.
  let landmarksApp = null
  if (urlApp && !cookie) {
    console.error(
      '\n--app sin --cookie: se OMITE la pasada contra la aplicacion real.\n' +
        '  El banner vive tras RutaProtegida y sin sesion capturarias la pantalla de acceso.\n' +
        '  Obten la cookie fuera de banda y pasala:  --cookie=sesion=<valor>',
    )
  } else if (urlApp && cookie) {
    const [nombre, ...resto] = cookie.split('=')
    const { hostname } = new URL(urlApp)
    const ctx = await navegador.newContext()
    await ctx.addCookies([
      { name: nombre, value: resto.join('='), domain: hostname, path: '/', httpOnly: true },
    ])
    const app = await ctx.newPage()
    for (const w of [1366, 390]) {
      await app.setViewportSize({ width: w, height: 800 })
      await app.goto(urlApp, { waitUntil: 'networkidle' })
      await app.waitForSelector('.banner-institucional img')
      await app.screenshot({ path: path.join(SALIDA, `captura-app-${w}.png`) })
    }
    landmarksApp = await app.evaluate(CONTAR_BANNERS)
    if (landmarksApp !== 1) fallos++
    await ctx.close()
  }

  await navegador.close()
  servidor.close()

  console.table(filas)
  console.log(
    `landmark banner (arnes): ${bannersArnes} ${okLandmarkArnes ? 'OK' : 'FALLA (debe ser exactamente 1)'}`,
  )
  if (landmarksApp !== null) {
    console.log(
      `landmark banner (app real): ${landmarksApp} ${landmarksApp === 1 ? 'OK' : 'FALLA (debe ser exactamente 1)'}`,
    )
  }
  console.log(
    `sin imagen: fondo rgb(${fondo}) ${okSinImagen ? 'OK (campo principal)' : `FALLA (deberia ser ${marca.colores.campoPrincipal})`}`,
  )
  console.log(`\nCapturas en ${SALIDA}`)
  console.log('MIRA captura-banner-390-marca-x4.png  (se leen las lineas del logotipo?)')
  console.log('MIRA captura-banner-1110.png          (el corte del remate, peor caso)')

  await writeFile(
    path.join(SALIDA, 'medidas.json'),
    JSON.stringify(
      {
        gerencia: marca.gerencia,
        sha256Largo: marca.largo.sha256,
        razon: RAZON,
        altoMinimo: ALTO_MINIMO,
        filaFilete: FILA_FILETE,
        toleranciaManhattan: TOL,
        filas,
        sinImagen: okSinImagen,
        landmarkArnes: bannersArnes,
        landmarkApp: landmarksApp,
      },
      null,
      2,
    ) + '\n',
  )

  if (fallos) {
    console.error(`\n${fallos} comprobacion(es) fallaron.`)
    process.exit(1)
  }
  console.log('\nTodo cuadra. Ahora MIRA las dos capturas de arriba.')
}

main()
