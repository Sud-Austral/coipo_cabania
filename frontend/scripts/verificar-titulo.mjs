/**
 * verificar-titulo.mjs -- comprueba EJECUTANDO la hoja real que el texto superpuesto del
 * banner no tapa la marca, no pisa el remate y no lleva caja.
 * =========================================================================================
 * POR QUE EXISTE. `verify-banner.mjs` mide el alto del banner y el filete, y deja el titulo
 * FUERA de su arnes "a proposito". Es exactamente lo que se rompio: hasta el 2026-10-05 toda
 * aplicacion sembrada pintaba una caja opaca con "0.0.0" encima de la marca, y ninguna
 * maquina se entero. Este script mira lo que aquel no mira.
 *
 * NO ESTA SELLADO. Es del ESQUELETO: la aplicacion puede adaptarlo. Cuando se selle la
 * siguiente version de `verify-banner.mjs`, su logica pasa alli y este archivo sobra.
 *
 * Uso (desde frontend/):
 *   npm run verificar:titulo                    P1 + P2, y P3 si existe dist/
 *   npm run verificar:titulo -- --sin-dist      sin P3
 *   npm run verificar:titulo -- --autoprueba    comprueba que los controles NEGATIVOS fallan
 *
 * Necesita un navegador (`npx playwright install chromium`) y esta CALIBRADO PARA
 * `chromium.launch()` a secas, o sea el headless shell: en Chromium completo y en Chrome
 * la captura con/sin da pixeles falsos tras cargar (se mide en el primer paso, y por eso
 * se fuerza una invalidacion antes de capturar), y no se ha medido en Firefox ni Safari.
 *
 * LAS TRES PASADAS
 *   P1  La medida es de ESTE JPEG. Con sharp recalcula del public/banner.jpg donde termina
 *       la marca, donde empieza el campo plano y donde empieza el remate, y exige que la
 *       zona del titulo (marca.json -> titulo) no toque ninguno. El oraculo sale del JPEG,
 *       NUNCA de marca.json ni de tokens.css: si saliera de ahi, un fin de marca heredado
 *       de otra gerencia saldria verde por tautologia.
 *   P2  La hoja REAL con un titulo largo, en 10 anchos: sin fondo en ninguna capa (tampoco
 *       en ::before/::after), dentro de la zona, SIN TOCAR NI UN PIXEL FUERA DEL CUADRO DEL
 *       TEXTO, y legible. "Legible" se MIDE sobre los pixeles pintados (cuantos cambia el
 *       texto y con que contraste), tambien en colores forzados: el color y la opacidad
 *       declarados no bastan, porque un `visibility`, un `filter`, un `mix-blend-mode` o un
 *       `z-index` en el CONTENEDOR dejan el color intacto y el texto ilegible o ausente.
 *       Y sin el texto, el banner tiene que ser el JPEG y nada mas (una caja que pinte el
 *       propio banner es igual con y sin texto, y la comparacion con/sin no la ve).
 *   P3  La aplicacion construida (dist/). Si no hay `.banner-titulo`, el banner pintado
 *       tiene que ser el JPEG y nada mas; si lo hay, se le aplica lo de P2 sobre su texto.
 *
 * LOS CODIGOS DE LO QUE FALLA
 *   H scroll horizontal · T token computado distinto de marca.json · V el titulo no se ve o no
 *   existe · M position equivocado · A fondo/imagen/sombra en el subarbol del titulo · B un
 *   ::before/::after que pinta · I el texto cae sobre la marca o la transicion · F el calc() no
 *   sigue a la imagen · D llega al remate · E el titulo de prueba no desborda (error del
 *   arnes) · X pixeles que cambian fuera del cuadro del texto · L el texto no deja tinta ·
 *   W el texto va sobre una caja (un fondo, o la placa de colores forzados) · C contraste
 *   medido < 4,5:1 · Y sin texto, el banner no es el JPEG · U la franja movil.
 *
 * SIN_EVALUAR NO ES OK. Cuando algo no se pudo mirar (una app sembrada antes de la zona del
 * titulo, una app construida cuyo banner esta tras un login) se dice con esas palabras, sale
 * con 0 y, en GitHub Actions, deja una anotacion `::warning`: un verde que no miro no es verde.
 *
 * QUE FUENTE TIENE CADA ASERCION (AGENTS.md, regla 5: una regla sin fuente es inventada)
 *   - no texto sobre la marca ni sobre el remate, y contraste AA contra el color REAL:
 *     identidad/implementacion_banner.md:431-434 y UI-5 de identidad/ESTANDAR_UI.md;
 *   - no apilar bandas del mismo color: implementacion_banner.md:324-326;
 *   - sin cortes de ancho nuevos: UI-17;
 *   - la maqueta objetivo es identidad/como_se_veria.jpg (titulo blanco SIN caja);
 *   - el resto -el aire de 24 px de asset a la marca, los 40 al remate, los umbrales de
 *     pixeles- son DECISIONES DE ESTE SCRIPT y estan marcadas como tales.
 */
import { createServer } from 'node:http'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import sharp from 'sharp'
import { chromium } from 'playwright'

const FRONTEND = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SALIDA = path.join(FRONTEND, 'verificacion')
const ARGS = new Set(process.argv.slice(2))

// ---- Decisiones de este script (no son medidas) ------------------------------------------
const AIRE_A_LA_MARCA_PX = 24 // px del ASSET entre el fin de la marca y el inicio de la zona
const AIRE_AL_REMATE_PX = 40 // px del ASSET entre el fin de la zona y el inicio del remate
const TOLERANCIA_PLANO = 12 // distancia Manhattan al campo para llamar "plana" a una columna
const UMBRAL_PIXEL = 8 // Manhattan a partir del cual un pixel "cambio" entre dos capturas
const MARGEN_TEXTO_PX = 2 // px CSS de holgura alrededor del cuadro del texto (antialiasing)
const TOL_GEOMETRIA = 0.6 // px CSS de error aceptado entre el CSS y la cuenta del oraculo
const CONTRASTE_MINIMO = 4.5 // WCAG 1.4.3
// La legibilidad se mide en pixeles (ver `medirTinta`). Los numeros de abajo son decisiones de este
// script, y se calibraron contra el texto real en dos maquinas (2026-10-06, el titulo largo de P2):
//   Windows        el texto cambia el 11-17 % de los pixeles de su cuadro; contraste mediano 9,15:1
//   conaf-ci Linux el texto cambia el 32-37 %; contraste mediano 6,96-8,02:1 (110 filas, run 37482281234)
// La fuente y el antialiasing de cada maquina pintan distinto, y por eso el umbral esta lejos de los dos.
const MIN_TINTA_PX = 12 // pixeles que el texto tiene que cambiar, como minimo, para darse por pintado
const MIN_TINTA_FRACCION = 0.02 // ... y que fraccion del area de su cuadro (P2: el titulo de prueba es largo)
const MIN_TINTA_FRACCION_APP = 0.005 // ... en P3, donde el texto es el real y puede ser de dos letras
const NUCLEO_DEL_TRAZO = 0.85 // un pixel es "centro del trazo" si cambia al menos esta fraccion del maximo
// Por encima de esta cobertura lo que cambia no es el trazo de las letras sino una CAJA detras de
// ellas (un fondo, o la placa que el navegador pinta en colores forzados). Medido: un texto cambia
// como mucho el 37 % de su cuadro (Linux) y la placa de colores forzados el 99-100 % (Windows).
const MAX_TINTA_FRACCION = 0.6
const ANCHOS = [
  { w: 1920 },
  { w: 1536, dpr: 1.25 }, // 1920 a zoom 125 %, que es lo que se vio en la captura original
  { w: 1366 },
  { w: 1165 },
  { w: 1110 },
  { w: 768 },
  { w: 600 },
  { w: 560 }, // el primero con texto superpuesto
  { w: 559 }, // el ultimo con franja
  { w: 390 },
]
const TITULO_LARGO =
  'Sistema de seguimiento, alertas y plazos de evaluacion ambiental de la Gerencia de ' +
  'Fiscalizacion Forestal y Evaluacion Ambiental de CONAF para todas las regiones del pais, ' +
  'con el detalle de cada expediente'
const META_LARGA =
  'Actualizado el 5 de octubre de 2026 a las 18:30 horas, hora de Chile continental, con ' +
  'datos del sistema de informacion de fiscalizacion y sus resoluciones vigentes'

// ---- Utilidades --------------------------------------------------------------------------
const hexARgb = (hex) => {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const manhattan = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2])
const luminancia = ([r, g, b]) => {
  const f = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
const contraste = (a, b) => {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

/** Alfa de un color computado. Lo que no se entiende cuenta como OPACO: falla cerrado. */
function alfaDe(css) {
  if (!css || css === 'transparent') return 0
  const m = css.match(/rgba?\(([^)]+)\)/)
  if (!m) return 1
  const partes = m[1].split(/[,/ ]+/).filter(Boolean)
  if (partes.length < 4) return 1
  const a = partes[3]
  return a.endsWith('%') ? parseFloat(a) / 100 : parseFloat(a)
}

async function pixeles(buffer) {
  const { data, info } = await sharp(buffer).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  return {
    ancho: info.width,
    alto: info.height,
    en: (x, y) => {
      const i = (y * info.width + x) * 3
      return [data[i], data[i + 1], data[i + 2]]
    },
  }
}

/**
 * En un paso con `continue-on-error` el job sale verde y nadie abre el registro: esta anotacion es
 * lo que lo hace visible en la pagina de la ejecucion. Fuera de GitHub Actions no hace nada.
 */
function anotarEnActions(mensaje) {
  if (process.env.GITHUB_ACTIONS) console.log(`::warning title=verificar:titulo::${mensaje}`)
}

// ---- Entradas ---------------------------------------------------------------------------
const marca = JSON.parse(await readFile(path.join(FRONTEND, 'src', 'marca.json'), 'utf8'))

if (!marca.titulo || !Number.isFinite(marca.titulo.desdePx)) {
  // Una app sembrada ANTES de la zona del titulo: no hay nada que comparar. Esto NO es un
  // "OK": es "no se pudo evaluar", y se dice con esas palabras para que nadie lo lea como verde.
  console.log(
    'SIN_EVALUAR: src/marca.json no trae la clave `titulo` (la app se sembro antes de la zona del\n' +
      '  titulo medida). No se comprobo nada. Se pone al dia con semilla/patrones/banner/ de la fabrica.',
  )
  anotarEnActions('SIN EVALUAR: src/marca.json no trae la clave `titulo`, asi que no se comprobo nada del texto superpuesto del banner')
  process.exit(0)
}

const ZONA = marca.titulo
const CAMPO = hexARgb(marca.colores.campoPrincipal)
const RAZON = marca.razon
const ALTO_MINIMO = marca.altoMinimo
const ANCHO_ASSET = marca.largo.ancho

// ---- P1: la medida es de este JPEG ------------------------------------------------------
/**
 * Mide la marca, el campo plano y el remate sobre los PIXELES del JPEG. El metodo es el de
 * identidad/ESTANDAR_UI.md seccion 2.2 (medido con Pillow; sharp da lo mismo, +-1 px):
 * la marca termina en la ultima columna del 45 % izquierdo con al menos 3 filas (y >= 16, para
 * no contar el filete) de pixeles casi blancos; el campo plano es el tramo mas largo, a la
 * derecha de la marca, de columnas cuyas filas estan TODAS a <= 12 del verde principal.
 */
async function medirJpeg(ruta) {
  const { data, info } = await sharp(ruta).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width: w, height: h } = info
  const px = (x, y) => {
    const i = (y * w + x) * 3
    return [data[i], data[i + 1], data[i + 2]]
  }
  let finMarca = -1
  for (let x = Math.floor(w * 0.45); x >= 0 && finMarca < 0; x--) {
    let filas = 0
    for (let y = 16; y < h; y++) {
      const [r, g, b] = px(x, y)
      if (Math.min(r, g, b) >= 200 && ++filas >= 3) {
        finMarca = x
        break
      }
    }
  }
  const plana = new Array(w).fill(false)
  for (let x = 0; x < w; x++) {
    let ok = true
    for (let y = 0; y < h; y++) {
      if (manhattan(px(x, y), CAMPO) > TOLERANCIA_PLANO) {
        ok = false
        break
      }
    }
    plana[x] = ok
  }
  let mejor = { ini: -1, fin: -2 }
  let ini = -1
  for (let x = finMarca + 1; x <= w; x++) {
    if (x < w && plana[x]) {
      if (ini < 0) ini = x
    } else if (ini >= 0) {
      if (x - ini > mejor.fin - mejor.ini + 1) mejor = { ini, fin: x - 1 }
      ini = -1
    }
  }
  return { ancho: w, alto: h, finMarca, campoDesde: mejor.ini, campoHasta: mejor.fin, remateDesde: mejor.fin + 1 }
}

function pasadaP1(medida) {
  const fallos = []
  if (medida.ancho !== ZONA.anchoAssetPx || medida.ancho !== ANCHO_ASSET) {
    fallos.push(
      `el JPEG mide ${medida.ancho} px y marca.json dice ${ANCHO_ASSET} (zona: ${ZONA.anchoAssetPx}): ` +
        'el asset cambio y la zona del titulo ya no vale',
    )
  }
  if (medida.finMarca < 0) fallos.push('no se encontro la marca en el JPEG (no hay pixeles casi blancos a la izquierda)')
  if (medida.campoDesde < 0) fallos.push('no hay campo plano a la derecha de la marca')
  if (ZONA.desdePx >= ZONA.hastaPx) fallos.push(`titulo.desdePx (${ZONA.desdePx}) >= titulo.hastaPx (${ZONA.hastaPx})`)
  if (ZONA.desdePx < medida.campoDesde) {
    fallos.push(
      `titulo.desdePx=${ZONA.desdePx} empieza ANTES del campo plano (${medida.campoDesde}): el texto ` +
        'caeria sobre la cuna oscura de transicion, que es donde se veia la costura',
    )
  }
  if (medida.finMarca + AIRE_A_LA_MARCA_PX > ZONA.desdePx) {
    fallos.push(
      `la marca de este JPEG termina en ${medida.finMarca} y titulo.desdePx=${ZONA.desdePx} deja menos ` +
        `de ${AIRE_A_LA_MARCA_PX} px de aire: el texto tocaria la marca (UI-1)`,
    )
  }
  if (ZONA.hastaPx > medida.remateDesde - AIRE_AL_REMATE_PX) {
    fallos.push(
      `titulo.hastaPx=${ZONA.hastaPx} pasa de ${medida.remateDesde - AIRE_AL_REMATE_PX}: el remate empieza ` +
        `en ${medida.remateDesde} y se piden ${AIRE_AL_REMATE_PX} px de aire (UI-5)`,
    )
  }
  return fallos
}

// ---- Servidor del arnes -------------------------------------------------------------------
const MIME = {
  '.css': 'text/css',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.json': 'application/json',
  '.js': 'text/javascript',
  '.html': 'text/html; charset=utf-8',
}

/** `sustituciones`: ruta -> funcion(texto) -> texto. Sirve para los controles NEGATIVOS. */
function servir({ raiz, html, sustituciones = {}, publico = true }) {
  const servidor = createServer(async (req, res) => {
    const ruta = req.url.split('?')[0]
    // El JPEG solo, a un tamano dado y sin hoja alguna: la referencia contra la que se compara
    // el banner SIN texto (codigo Y).
    if (ruta === '/__solo-imagen') {
      const q = new URL(req.url, 'http://arnes.invalid').searchParams
      const src = q.get('src') ?? ''
      const [ancho, alto] = [Number(q.get('w')), Number(q.get('h'))]
      if (!/^[\w.-]+\.(jpg|jpeg|png)$/i.test(src) || !(ancho > 0) || !(alto > 0)) {
        res.writeHead(400).end('parametros no validos')
        return
      }
      res
        .writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        .end(
          '<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#fff}' +
            `img{display:block;max-width:none;width:${ancho}px;height:${alto}px}</style></head>` +
            `<body><img src="/${src}"></body></html>`,
        )
      return
    }
    if (html !== undefined && ruta === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(html)
      return
    }
    // La aplicacion construida (P3) corre SIN backend. Con el fallback de SPA, `/api/*` contestaba
    // el `index.html` con un 200, y una vista que pide datos al montar recibia HTML donde esperaba
    // JSON, reventaba, React desmontaba todo el arbol y el banner desaparecia: P3 salia SIN_EVALUAR
    // en `coipo_visor_saff` (2026-10-06) sin que el banner tuviera nada que ver. Un backend caido
    // es un JSON con un 503, que es lo que una vista bien hecha ya sabe mostrar.
    if (!publico && /^\/api(\/|$)/.test(ruta)) {
      res
        .writeHead(503, { 'Content-Type': 'application/json' })
        .end('{"detail":"sin backend: es una prueba del banner"}')
      return
    }
    try {
      const rel = path.normalize(decodeURIComponent(ruta)).replace(/^[\\/]+/, '')
      const candidatos = publico ? [path.join(FRONTEND, 'public', rel), path.join(FRONTEND, rel)] : [path.join(raiz, rel)]
      let abs
      let cuerpo
      for (const c of candidatos) {
        if (!c.startsWith(raiz) && !c.startsWith(FRONTEND)) continue
        cuerpo = await readFile(c).catch(() => null)
        if (cuerpo !== null) {
          abs = c
          break
        }
      }
      if (cuerpo === null || cuerpo === undefined) {
        if (!publico) {
          abs = path.join(raiz, 'index.html') // fallback de SPA, como el nginx real
          cuerpo = await readFile(abs)
        } else {
          res.writeHead(404).end('no existe')
          return
        }
      }
      const clave = '/' + rel.replace(/\\/g, '/')
      if (sustituciones[clave]) cuerpo = Buffer.from(sustituciones[clave](cuerpo.toString('utf8')), 'utf8')
      res.writeHead(200, { 'Content-Type': MIME[path.extname(abs)] || 'application/octet-stream' }).end(cuerpo)
    } catch {
      res.writeHead(404).end('no existe')
    }
  })
  return new Promise((ok) => servidor.listen(0, '127.0.0.1', () => ok(servidor)))
}

/**
 * El DOM que pinta el componente con titulo y subtitulo. Se construye aqui y NO se lee del
 * JSX, y eso es un riesgo conocido (es el defecto que se le critico al arnes de
 * verify-banner.mjs): lo cubren el chequeo estructural de `chequearEstructuraDelJsx()` y P3,
 * que ejecuta el componente de verdad.
 */
function arnesHtml({ conTexto, corto }) {
  const asset = corto ? marca.corto : marca.largo
  const texto = conTexto
    ? `<div class="banner-titulo"><span class="banner-titulo-nombre">${TITULO_LARGO}</span>` +
      `<span class="banner-titulo-meta">${META_LARGA}</span></div>`
    : ''
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<link rel="stylesheet" href="/src/componentes/BannerInstitucional.css">
<link rel="stylesheet" href="/src/estilos/tokens.css">
<link rel="stylesheet" href="/src/estilos/interfaz.css">
<style>html, body { margin: 0; }</style>
</head><body>
<header class="banner-institucional" role="banner">
<a class="banner-enlace" href="/" aria-label="Ir al inicio"><img class="banner-imagen" src="/${asset.archivo}"
 alt="CONAF" width="${asset.ancho}" height="${asset.alto}"></a>
${texto}
</header>
</body></html>`
}

/**
 * El arnes arma el DOM a mano; esto comprueba que el JSX sigue emitiendo ESA forma: el texto
 * es un `div.banner-titulo` hijo directo del <header>, fuera del <a>, con los dos spans y sin
 * ninguna envoltura `franja`. Mira nombres Y anidamiento; lo que no puede ver es el
 * renderizado condicional, y para eso esta P3.
 */
async function chequearEstructuraDelJsx() {
  const jsx = await readFile(path.join(FRONTEND, 'src', 'componentes', 'BannerInstitucional.jsx'), 'utf8')
  const fallos = []
  if (/franja/i.test(jsx.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\/.*$/gm, ''))) {
    fallos.push('el JSX vuelve a mencionar una `franja` en codigo: la caja que tapaba la marca era esa envoltura')
  }
  const cuerpo = jsx.replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
  const idxA = cuerpo.indexOf('</a>')
  const idxT = cuerpo.indexOf('className="banner-titulo"')
  if (idxT < 0) fallos.push('el JSX no tiene un elemento con className="banner-titulo"')
  else if (idxA >= 0 && idxT < idxA) fallos.push('`.banner-titulo` esta DENTRO del <a>: dejaria de ser un hijo directo del <header>')
  for (const clase of ['banner-titulo-nombre', 'banner-titulo-meta']) {
    if (!cuerpo.includes(`className="${clase}"`)) fallos.push(`el JSX no emite la clase ${clase} que usa el arnes`)
  }
  return fallos
}

// ---- Medicion en el navegador -------------------------------------------------------------
const MEDIR_EN_PAGINA = () => {
  const num = (v) => Math.round(v * 100) / 100
  const caja = (el) => {
    const b = el.getBoundingClientRect()
    return { l: num(b.left), t: num(b.top), r: num(b.right), b: num(b.bottom) }
  }
  const raiz = getComputedStyle(document.documentElement)
  const banner = document.querySelector('.banner-institucional')
  const img = banner?.querySelector('.banner-imagen')
  const titulo = banner?.querySelector('.banner-titulo')
  const informe = {
    existeBanner: Boolean(banner),
    existeTitulo: Boolean(titulo),
    tokens: {
      ancho: raiz.getPropertyValue('--ancho-asset').trim(),
      desde: raiz.getPropertyValue('--titulo-desde').trim(),
      hasta: raiz.getPropertyValue('--titulo-hasta').trim(),
    },
    scrollHorizontal: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    banner: banner ? caja(banner) : null,
    imagen: img ? caja(img) : null,
    // Sin redondear: la referencia de la imagen sola se pinta a ESTE tamano
    imagenExacta: img
      ? { archivo: (img.getAttribute('src') || '').replace(/^\//, ''), w: img.getBoundingClientRect().width, h: img.getBoundingClientRect().height }
      : null,
    titulo: titulo ? caja(titulo) : null,
    posicion: titulo ? getComputedStyle(titulo).position : null,
    opacos: [],
    pseudo: [],
    textos: [],
  }
  if (titulo) {
    // Cada elemento del subarbol, y cada pseudo-elemento, con lo que pinta
    for (const el of [titulo, ...titulo.querySelectorAll('*')]) {
      const cs = getComputedStyle(el)
      informe.opacos.push({
        clase: el.className || el.tagName,
        fondo: cs.backgroundColor,
        imagenDeFondo: cs.backgroundImage,
        sombra: cs.boxShadow,
      })
      for (const p of ['::before', '::after']) {
        const ps = getComputedStyle(el, p)
        if (ps.content !== 'none' && ps.content !== 'normal') {
          informe.pseudo.push({ en: `${el.className || el.tagName}${p}`, fondo: ps.backgroundColor, imagenDeFondo: ps.backgroundImage, sombra: ps.boxShadow })
        }
      }
    }
    for (const el of titulo.querySelectorAll('.banner-titulo-nombre, .banner-titulo-meta')) {
      const rg = document.createRange()
      rg.selectNodeContents(el)
      const a = rg.getBoundingClientRect()
      const b = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      // El texto VISIBLE es el rango recortado por la caja del propio span: con elipsis, el
      // rango mide el texto entero y se sale de la caja (medido: hasta +627 px).
      informe.textos.push({
        clase: el.className,
        l: num(Math.max(a.left, b.left)),
        t: num(Math.max(a.top, b.top)),
        r: num(Math.min(a.right, b.right)),
        b: num(Math.min(a.bottom, b.bottom)),
        desborda: el.scrollWidth > el.clientWidth + 0.5,
        color: cs.color,
        opacidad: parseFloat(cs.opacity),
      })
    }
  }
  return informe
}

/** goto -> decode -> fuentes -> UNA invalidacion -> 2 rAF. Es la receta que da 0 pixeles de ruido. */
async function prepararCaptura(pagina, selector = '.banner-institucional img') {
  await pagina.evaluate(async (sel) => {
    const img = document.querySelector(sel)
    if (img) await img.decode().catch(() => {})
    await document.fonts.ready
    if (img) {
      img.style.visibility = 'hidden'
      void img.offsetWidth
      img.style.visibility = ''
    }
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  }, selector)
}

/** Cuenta los pixeles que cambian entre dos capturas fuera de los rectangulos permitidos. */
async function compararCapturas(bufA, bufB, permitidos, dpr) {
  const [A, B] = await Promise.all([pixeles(bufA), pixeles(bufB)])
  if (A.ancho !== B.ancho || A.alto !== B.alto) return { cambiados: -1, fuera: -1, nota: 'las dos capturas no miden igual' }
  const m = Math.ceil(MARGEN_TEXTO_PX * dpr)
  const dentro = (x, y) =>
    permitidos.some((r) => x >= Math.floor(r.l * dpr) - m && x <= Math.ceil(r.r * dpr) + m && y >= Math.floor(r.t * dpr) - m && y <= Math.ceil(r.b * dpr) + m)
  let cambiados = 0
  let fuera = 0
  let peor = null
  for (let y = 0; y < A.alto; y++) {
    for (let x = 0; x < A.ancho; x++) {
      const d = manhattan(A.en(x, y), B.en(x, y))
      if (d >= UMBRAL_PIXEL) {
        cambiados++
        if (!dentro(x, y)) {
          fuera++
          if (!peor || d > peor.d) peor = { x, y, d }
        }
      }
    }
  }
  return { cambiados, fuera, peor }
}

/**
 * LA LEGIBILIDAD SE MIDE EN LOS PIXELES, NO SE DEDUCE DE LOS ESTILOS. Hasta el 2026-10-06 el
 * contraste salia del `color` y la `opacity` del propio <span>, y eso no es lo que se ve: un
 * `visibility:hidden`, una `opacity` o un `filter` en el CONTENEDOR, un `mix-blend-mode`, un
 * `clip-path` o un `z-index` que lo mande detras de la imagen dejan el color declarado intacto y
 * el texto ilegible o ausente, y el verificador decia "Todo cuadra" (cada caso esta en la autoprueba).
 *
 * Se compara la captura CON el texto contra la que lo tiene oculto o transparente, dentro del
 * cuadro de cada texto:
 *   - `tinta`: cuantos pixeles cambia el texto. Sin tinta no hay nada que leer.
 *   - `contraste`: la MEDIANA, sobre el CENTRO de los trazos (los pixeles que mas cambian: los de
 *     cobertura casi completa, no los bordes suavizados), del contraste WCAG entre el pixel
 *     pintado y el que habia debajo.
 * `textos` lleva rectangulos en px CSS relativos al origen de las capturas.
 */
async function medirTinta(bufCon, bufSin, textos, dpr) {
  const [C, S] = await Promise.all([pixeles(bufCon), pixeles(bufSin)])
  if (C.ancho !== S.ancho || C.alto !== S.alto) return null
  const filas = []
  for (const t of textos) {
    const x0 = Math.max(0, Math.floor(t.l * dpr))
    const x1 = Math.min(C.ancho, Math.ceil(t.r * dpr))
    const y0 = Math.max(0, Math.floor(t.t * dpr))
    const y1 = Math.min(C.alto, Math.ceil(t.b * dpr))
    const area = Math.max(0, x1 - x0) * Math.max(0, y1 - y0)
    let tinta = 0
    let maximo = 0
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const d = manhattan(C.en(x, y), S.en(x, y))
        if (d >= UMBRAL_PIXEL) {
          tinta++
          if (d > maximo) maximo = d
        }
      }
    }
    const nucleo = []
    if (tinta) {
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const [a, b] = [C.en(x, y), S.en(x, y)]
          if (manhattan(a, b) >= NUCLEO_DEL_TRAZO * maximo) nucleo.push(contraste(a, b))
        }
      }
      nucleo.sort((p, q) => p - q)
    }
    filas.push({ clase: t.clase, area, tinta, contraste: nucleo.length ? nucleo[nucleo.length >> 1] : 0 })
  }
  return filas
}

/**
 * Convierte lo medido por `medirTinta` en fallos: L (no se ve), W (va sobre una caja) y C (se ve
 * pero no se lee). Con una caja detras, "el contraste" medido seria el de la caja contra la
 * imagen y no el del texto contra la caja, asi que W corta antes de C.
 */
function juzgarTinta(filas, falla, { fraccion, forzados }) {
  if (!filas) {
    falla('L', 'las capturas con y sin texto no miden igual: no se pudo medir la tinta (error del arnes, no un OK)')
    return
  }
  const en = forzados ? ' EN COLORES FORZADOS' : ''
  for (const f of filas) {
    const minimo = Math.max(MIN_TINTA_PX, Math.ceil(fraccion * f.area))
    const cobertura = f.area ? f.tinta / f.area : 0
    if (f.tinta < minimo) {
      falla('L', `el texto .${f.clase} no se ve${en}: cambia ${f.tinta} pixeles y se piden >= ${minimo} (un visibility, una opacidad, un filtro, un recorte o una capa encima lo oculta)`)
    } else if (cobertura > MAX_TINTA_FRACCION) {
      falla('W', `el texto .${f.clase} va sobre una CAJA${en}: cambia el ${Math.round(cobertura * 100)} % de su cuadro y un trazo de letra cambia como mucho el 40 % (un fondo, o la placa que el navegador pinta detras en colores forzados)`)
    } else if (f.contraste < CONTRASTE_MINIMO) {
      falla('C', `contraste medido sobre los pixeles de .${f.clase}: ${f.contraste.toFixed(2)}:1 < ${CONTRASTE_MINIMO}:1${en}`)
    }
  }
}

/** Lo que muestra la tabla de P2 de la tinta: el peor contraste y la menor cobertura entre los textos. */
function resumirTinta(fila, tinta) {
  const contrastes = tinta.map((f) => f.contraste).filter((c) => c > 0)
  if (contrastes.length) fila.contraste = Math.round(Math.min(...contrastes) * 100) / 100
  const cobertura = tinta.filter((f) => f.area > 0).map((f) => f.tinta / f.area)
  if (cobertura.length) fila.tinta = Math.round(Math.min(...cobertura) * 100)
}

/**
 * Las dos capturas (con el texto, y sin el) y lo que de ellas sale. Superpuesto: sin el texto =
 * `display:none`, y ademas se cuentan los pixeles que cambian FUERA de su cuadro (X). Franja: el
 * texto va en su propia banda y quitarlo mueve el resto de la pagina, asi que se deja puesto y se
 * pone TRANSPARENTE; se captura solo el cuadro de la franja.
 */
async function pixelesDelTexto(pagina, medida, w, dpr, { png, falla, forzados, fraccion }) {
  const franja = medida.posicion !== 'absolute'
  let clip
  let textos = medida.textos
  if (franja) {
    const T = medida.titulo
    const x = Math.max(0, Math.floor(T.l))
    const y = Math.max(0, Math.floor(T.t))
    clip = { x, y, width: Math.min(w, Math.ceil(T.r)) - x, height: Math.ceil(T.b) - y }
    textos = textos.map((t) => ({ ...t, l: t.l - clip.x, r: t.r - clip.x, t: t.t - clip.y, b: t.b - clip.y }))
  } else {
    clip = { x: 0, y: 0, width: w, height: Math.ceil(medida.banner.b) }
  }
  await prepararCaptura(pagina)
  const conTexto = await pagina.screenshot({ clip, path: png })
  await pagina.addStyleTag({
    content: franja
      ? '.banner-titulo, .banner-titulo *{color:transparent !important;text-shadow:none !important}'
      : '.banner-titulo{display:none !important}',
  })
  await prepararCaptura(pagina)
  const sinTexto = await pagina.screenshot({ clip })
  if (!franja) {
    const cmp = await compararCapturas(conTexto, sinTexto, textos, dpr)
    if (cmp.fuera !== 0) {
      const p = cmp.peor
      falla('X', `${cmp.fuera} pixeles cambian FUERA del cuadro del texto (de ${cmp.cambiados} en total)` + (p ? `; el peor en (${(p.x / dpr).toFixed(0)}, ${(p.y / dpr).toFixed(0)}) con distancia ${p.d}` : ''))
    }
  }
  const tinta = await medirTinta(conTexto, sinTexto, textos, dpr)
  juzgarTinta(tinta, falla, { fraccion, forzados })
  return tinta
}

/**
 * Y: SIN el texto, el banner pintado ES el JPEG y nada mas. `X` solo mira lo que cambia al quitar
 * el texto, asi que una caja pintada por el propio banner (un `::before` del <header>, un fondo
 * del <a>...) -igual con y sin texto- le pasa inadvertida. Se compara contra el mismo JPEG, a su
 * mismo tamano, en una pagina sin hoja alguna. Se mira solo la region de la imagen: a la derecha
 * del asset corto el banner pinta el verde del campo, a proposito.
 */
async function comprobarImagenSola(pagina, contexto, base, medida, w, dpr, falla) {
  const clip = { x: 0, y: 0, width: Math.min(w, Math.floor(medida.imagen.r)), height: Math.floor(medida.imagen.b) }
  await prepararCaptura(pagina)
  const banner = await pagina.screenshot({ clip })
  const ref = await contexto.newPage()
  try {
    const { archivo, w: ancho, h: alto } = medida.imagenExacta
    await ref.goto(`${base}__solo-imagen?src=${encodeURIComponent(archivo)}&w=${ancho}&h=${alto}`)
    await prepararCaptura(ref, 'img')
    const solo = await ref.screenshot({ clip })
    const cmp = await compararCapturas(banner, solo, [], dpr)
    if (cmp.cambiados < 0) {
      falla('Y', 'el banner y el JPEG solo no miden igual: no se pudo comparar (error del arnes, no un OK)')
    } else if (cmp.fuera !== 0) {
      const p = cmp.peor
      falla('Y', `sin el texto, ${cmp.fuera} pixeles del banner NO son los del JPEG` + (p ? `; el peor en (${(p.x / dpr).toFixed(0)}, ${(p.y / dpr).toFixed(0)}) con distancia ${p.d}` : '') + ': algo del banner pinta encima de la imagen')
    }
  } finally {
    await ref.close()
  }
}

// ---- P2: la hoja real con un titulo largo -------------------------------------------------
/**
 * @param oraculo   lo medido en el JPEG por P1
 * @param opciones  { sustituciones, forcedColors, anchos, soloGeometria }
 * @returns         filas { ancho, modo, fallos: [{codigo, detalle}] }
 */
async function pasadaP2(navegador, oraculo, opciones = {}) {
  const filas = []
  const anchos = opciones.anchos ?? ANCHOS
  for (const { w, dpr = 1 } of anchos) {
    const corto = w < 560
    const servidor = await servir({
      raiz: FRONTEND,
      html: arnesHtml({ conTexto: true, corto }),
      sustituciones: opciones.sustituciones,
    })
    const base = `http://127.0.0.1:${servidor.address().port}/`
    const contexto = await navegador.newContext({
      viewport: { width: w, height: 300 },
      deviceScaleFactor: dpr,
      forcedColors: opciones.forcedColors ? 'active' : 'none',
      bypassCSP: true, // ver el comentario de P3: el arnes inyecta hojas inline
    })
    const pagina = await contexto.newPage()
    const fallos = []
    const falla = (codigo, detalle) => fallos.push({ codigo, detalle })
    try {
      await pagina.goto(base)
      await pagina.waitForSelector('.banner-institucional img')
      await prepararCaptura(pagina)
      const medida = await pagina.evaluate(MEDIR_EN_PAGINA)
      const escala = Math.max(w, ALTO_MINIMO * RAZON) / ANCHO_ASSET
      const fila = { ancho: dpr === 1 ? w : `${w}@${dpr}`, modo: corto ? 'franja' : 'superpuesto' }

      if (medida.scrollHorizontal) falla('H', 'hay scroll horizontal')
      // Los tokens que el NAVEGADOR calcula tienen que ser los de marca.json y numeros sin unidad
      for (const [clave, esperado] of [['ancho', ZONA.anchoAssetPx], ['desde', ZONA.desdePx], ['hasta', ZONA.hastaPx]]) {
        const visto = medida.tokens[clave]
        if (!/^\d+(\.\d+)?$/.test(visto) || Number(visto) !== esperado) {
          falla('T', `--${clave === 'ancho' ? 'ancho-asset' : 'titulo-' + clave} computado = "${visto}" y marca.json dice ${esperado}`)
        }
      }

      if (!medida.existeTitulo) {
        falla('V', 'no se pinto .banner-titulo en el arnes')
      } else if (!corto) {
        // ---------------- SUPERPUESTO (>= 560 px) ----------------
        const T = medida.titulo
        if (medida.posicion !== 'absolute') falla('M', `position computado = ${medida.posicion}, se esperaba absolute`)

        // Sin fondo en NINGUNA capa, y ninguna pseudo-capa que pinte
        for (const o of medida.opacos) {
          if (alfaDe(o.fondo) > 0) falla('A', `fondo opaco en .${o.clase}: ${o.fondo} (el recuadro que tapaba la marca)`)
          if (o.imagenDeFondo !== 'none') falla('A', `imagen de fondo en .${o.clase}: ${o.imagenDeFondo}`)
          if (o.sombra !== 'none') falla('A', `sombra de caja en .${o.clase}: ${o.sombra}`)
        }
        for (const p of medida.pseudo) {
          if (alfaDe(p.fondo) > 0 || p.imagenDeFondo !== 'none' || p.sombra !== 'none') {
            falla('B', `el pseudo-elemento ${p.en} pinta (${p.fondo} ${p.imagenDeFondo} ${p.sombra})`)
          }
        }

        // La caja del titulo contra el ORACULO del JPEG, no contra los tokens
        const izqEsperada = ZONA.desdePx * escala
        const derTopeOraculo = (oraculo.remateDesde - AIRE_AL_REMATE_PX) * escala
        const izqMinimaOraculo = Math.max(oraculo.campoDesde, oraculo.finMarca + AIRE_A_LA_MARCA_PX) * escala
        if (T.l < izqMinimaOraculo - TOL_GEOMETRIA) {
          falla('I', `la caja arranca en x=${T.l} y el JPEG pide >= ${izqMinimaOraculo.toFixed(1)} (marca hasta ${(oraculo.finMarca * escala).toFixed(1)}, campo plano desde ${(oraculo.campoDesde * escala).toFixed(1)}): el texto cae sobre la marca o la transicion`)
        }
        if (Math.abs(T.l - izqEsperada) > TOL_GEOMETRIA) {
          falla('F', `la caja arranca en x=${T.l} y desde*escala da ${izqEsperada.toFixed(2)}: el calc() no sigue el ancho al que se pinta la imagen`)
        }
        if (T.r > Math.min(w, derTopeOraculo) + TOL_GEOMETRIA) {
          falla('D', `la caja llega a x=${T.r} y el remate (menos ${AIRE_AL_REMATE_PX}) pide <= ${Math.min(w, derTopeOraculo).toFixed(1)}`)
        }
        if (!(T.r - T.l > 40 && T.l < w - 40)) {
          falla('V', `el titulo no se ve: caja de x=${T.l} a x=${T.r} en un viewport de ${w} (un token ausente o mal escrito lo saca de pantalla)`)
        }

        // El texto VISIBLE tiene que caber en la caja y la elipsis tiene que ser real
        for (const t of medida.textos) {
          if (t.l < T.l - TOL_GEOMETRIA || t.r > T.r + TOL_GEOMETRIA) falla('I', `el texto .${t.clase} (${t.l}..${t.r}) se sale de la caja (${T.l}..${T.r})`)
          if (!t.desborda && t.clase === 'banner-titulo-nombre') {
            falla('E', 'el titulo de prueba NO desborda: no se probo la elipsis (error del arnes, no un OK)')
          }
        }

        if (!opciones.soloGeometria) {
          // Dos capturas con la receta fija -con texto y sin el- y lo que de ellas sale: X, L y C
          const png = path.join(SALIDA, `titulo-${w}${dpr === 1 ? '' : '@' + dpr}.png`)
          const tinta = await pixelesDelTexto(pagina, medida, w, dpr, {
            png: opciones.guardar === false ? undefined : png,
            falla,
            forzados: opciones.forcedColors,
            fraccion: MIN_TINTA_FRACCION,
          })
          if (tinta) resumirTinta(fila, tinta)
          // Y: sin el texto, lo que queda es el JPEG (la pagina ya tiene el texto oculto)
          await comprobarImagenSola(pagina, contexto, base, medida, w, dpr, falla)
        }
      } else {
        // ---------------- FRANJA (< 560 px) ----------------
        const T = medida.titulo
        if (medida.posicion !== 'static') falla('M', `position computado = ${medida.posicion}, se esperaba static bajo la imagen`)
        if (T.t < medida.imagen.b - 0.5) falla('U', `la franja empieza en y=${T.t} y la imagen termina en y=${medida.imagen.b}: se superponen`)
        const conFondo = medida.opacos.filter((o) => alfaDe(o.fondo) > 0)
        if (conFondo.length !== 1) falla('U', `hay ${conFondo.length} elementos con fondo opaco en la franja y se esperaba exactamente 1 (doble relleno)`)
        else if (conFondo[0].fondo.replace(/\s/g, '') !== `rgb(${CAMPO.join(',')})`) falla('U', `el fondo de la franja es ${conFondo[0].fondo} y no el campo principal ${marca.colores.campoPrincipal} (UI-2)`)
        const alto = medida.banner.b - medida.banner.t
        const esperado = medida.imagen.b - medida.imagen.t + (T.b - T.t)
        if (Math.abs(alto - esperado) > 1) falla('U', `el banner mide ${alto} y imagen + franja miden ${esperado}`)

        if (!opciones.soloGeometria) {
          // La legibilidad de la franja se mide igual que la del texto superpuesto: en sus pixeles
          const tinta = await pixelesDelTexto(pagina, medida, w, dpr, {
            png: undefined,
            falla,
            forzados: opciones.forcedColors,
            fraccion: MIN_TINTA_FRACCION,
          })
          if (tinta) resumirTinta(fila, tinta)
          // Y: la imagen de la franja movil tambien es el JPEG y nada mas (el texto queda fuera de su region)
          await comprobarImagenSola(pagina, contexto, base, medida, w, dpr, falla)
        }
      }
      fila.fallos = fallos
      filas.push(fila)
    } finally {
      await contexto.close()
      servidor.close()
    }
  }
  return filas
}

// ---- P3: la aplicacion construida ----------------------------------------------------------
async function pasadaP3(navegador, oraculo) {
  const dist = path.join(FRONTEND, 'dist')
  const hayDist = await readFile(path.join(dist, 'index.html')).then(() => true, () => false)
  if (!hayDist) return { estado: 'SIN_EVALUAR', detalle: 'no hay dist/ (corre `npm run build` antes)' }
  const servidor = await servir({ raiz: dist, publico: false })
  const base = `http://127.0.0.1:${servidor.address().port}/`
  // `bypassCSP`: la aplicacion real puede servir una CSP con `style-src 'self'` (coipo_api la sirve), y
  // este arnes inyecta una hoja inline para quitar o ocultar el texto y comparar capturas. Sin esto
  // `addStyleTag` lanza ("Applying inline style violates the following Content Security Policy") y el
  // verificador revienta en vez de medir. Ignorar la CSP aqui no cambia como se pinta el banner: la
  // CSP solo gobierna que se puede cargar, y la hoja del banner es del propio origen.
  const contexto = await navegador.newContext({ viewport: { width: 1366, height: 300 }, bypassCSP: true })
  const pagina = await contexto.newPage()
  const fallos = []
  let detalle = ''
  try {
    await pagina.goto(base, { waitUntil: 'load' })
    const hay = await pagina.waitForSelector('.banner-institucional img', { timeout: 8000 }).then(() => true, () => false)
    if (!hay) return { estado: 'SIN_EVALUAR', detalle: 'no hay .banner-institucional en `/`, ni con `/api/*` contestando 503 (¿una vista que revienta sin backend, o un banner tras el login? usa verify-banner.mjs --app --cookie)' }
    for (const w of [1920, 1366, 768, 390]) {
      await pagina.setViewportSize({ width: w, height: 300 })
      await pagina.reload({ waitUntil: 'load' })
      await pagina.waitForSelector('.banner-institucional img')
      await prepararCaptura(pagina)
      const medida = await pagina.evaluate(MEDIR_EN_PAGINA)
      if (medida.existeTitulo) {
        detalle = 'hay texto superpuesto en la app real: se mide su geometria y su legibilidad'
        const escala = Math.max(w, ALTO_MINIMO * RAZON) / ANCHO_ASSET
        if (w >= 560) {
          const T = medida.titulo
          const izqMinima = Math.max(oraculo.campoDesde, oraculo.finMarca + AIRE_A_LA_MARCA_PX) * escala
          if (T.l < izqMinima - TOL_GEOMETRIA) fallos.push({ codigo: 'I', detalle: `app real a ${w}: la caja arranca en x=${T.l} y el JPEG pide >= ${izqMinima.toFixed(1)}` })
          for (const o of medida.opacos) if (alfaDe(o.fondo) > 0) fallos.push({ codigo: 'A', detalle: `app real a ${w}: fondo opaco en .${o.clase}: ${o.fondo}` })
          if (T.r > Math.min(w, (oraculo.remateDesde - AIRE_AL_REMATE_PX) * escala) + TOL_GEOMETRIA) fallos.push({ codigo: 'D', detalle: `app real a ${w}: la caja llega a x=${T.r}, pisa el remate` })
        }
        // Y lo que la app REALMENTE pone en el banner, mirado en sus pixeles: se ve, y se lee
        await pixelesDelTexto(pagina, medida, w, 1, {
          png: undefined,
          falla: (codigo, d) => fallos.push({ codigo, detalle: `app real a ${w}: ${d}` }),
          forzados: false,
          fraccion: MIN_TINTA_FRACCION_APP,
        })
      } else {
        // Sin texto: el banner pintado tiene que ser el JPEG y nada mas, vea quien lo vea
        detalle = 'no hay texto superpuesto en la app real: el banner debe ser el JPEG y nada mas'
        const clip = { x: 0, y: 0, width: w, height: Math.ceil(medida.banner.b) }
        const normal = await pagina.screenshot({ clip })
        await pagina.addStyleTag({
          content:
            'body *{visibility:hidden !important} .banner-institucional,.banner-institucional a,.banner-institucional img{visibility:visible !important}',
        })
        await prepararCaptura(pagina)
        const soloImagen = await pagina.screenshot({ clip })
        const cmp = await compararCapturas(normal, soloImagen, [], 1)
        if (cmp.fuera !== 0) fallos.push({ codigo: 'X', detalle: `app real a ${w}: ${cmp.fuera} pixeles encima del banner que no son el JPEG` })
      }
    }
  } finally {
    await contexto.close()
    servidor.close()
  }
  return { estado: fallos.length ? 'FALLA' : 'OK', detalle, fallos }
}

// ---- Autoprueba: los controles NEGATIVOS tienen que salir ROJOS ----------------------------
/**
 * "Calibrala al reves" (AGENTS.md, seccion 4): un verificador que no se ha visto fallar no
 * prueba nada. Cada control rompe la hoja EN MEMORIA de una forma conocida y exige que P2
 * falle con el codigo esperado. Se corre una vez en el CI de la fabrica.
 */
async function autoprueba(navegador, oraculo) {
  const quitarForzados = (css) => css.replace(/@media \(forced-colors: active\)\s*\{[^}]*\{[^}]*\}\s*\}/, '/* sin remedio de colores forzados */')
  const anadir = (regla) => (css) => css + '\n' + regla + '\n'
  const controles = [
    { nombre: 'fondo solido en .banner-titulo', espera: 'A', hoja: (c) => c + '\n.banner-titulo{background:#064928}\n' },
    { nombre: '::before solido sobre la imagen', espera: 'B', hoja: (c) => c + '\n.banner-titulo::before{content:"";position:absolute;inset:0;background:#064928}\n' },
    { nombre: 'la zona empieza DENTRO de la marca (desde=700)', espera: 'I', tokens: (c) => c + '\n:root{--titulo-desde:700}\n' },
    { nombre: 'la zona llega al borde del asset (hasta=3032)', espera: 'D', tokens: (c) => c + '\n:root{--titulo-hasta:3032}\n' },
    { nombre: 'tokens ausentes (un tokens.css de antes de la hoja)', espera: 'V', tokens: (c) => c.replace(/--titulo-desde:[^;]+;|--titulo-hasta:[^;]+;|--ancho-asset:[^;]+;/g, '') },
    { nombre: 'el texto sigue al contenedor y no a la imagen (24,57 %)', espera: 'I', hoja: (c) => c + '\n.banner-titulo{inset-inline-start:24.57% !important}\n', anchos: [768, 600] },
    // Sin el remedio, en colores forzados el navegador pinta el texto en negro sobre una PLACA
    // blanca pegada a cada linea (medido el 2026-10-06): se lee, pero es una caja sobre el banner.
    { nombre: 'sin el remedio de colores forzados (el navegador pinta una placa detras del texto)', espera: 'W', hoja: quitarForzados, forcedColors: true, anchos: [1920] },
    // Los de abajo son lo que el verificador de antes NO veia: dejan el color declarado intacto y
    // rompen lo que se VE. Cada uno solo lo caza la medicion sobre los pixeles pintados.
    { nombre: 'texto invisible (visibility:hidden en el contenedor)', espera: 'L', hoja: anadir('.banner-titulo{visibility:hidden}'), anchos: [1920] },
    { nombre: 'texto casi transparente (opacity:.2 en el contenedor)', espera: 'C', hoja: anadir('.banner-titulo{opacity:.2}'), anchos: [1920] },
    { nombre: 'texto oscurecido por un filtro del contenedor (brightness .2)', espera: 'C', hoja: anadir('.banner-titulo{filter:brightness(.2)}'), anchos: [1920] },
    { nombre: 'mezcla multiply: el blanco no cambia ningun pixel', espera: 'L', hoja: anadir('.banner-titulo{mix-blend-mode:multiply}'), anchos: [1920] },
    { nombre: 'texto DETRAS de la imagen (z-index:-1)', espera: 'L', hoja: anadir('.banner-titulo{z-index:-1}'), anchos: [1920] },
    { nombre: 'recorte vacio (clip-path)', espera: 'L', hoja: anadir('.banner-titulo{clip-path:inset(100%)}'), anchos: [1920] },
    {
      nombre: 'caja pintada por .banner-institucional::before (igual con y sin texto)',
      espera: 'Y',
      hoja: anadir('.banner-institucional::before{content:"";position:absolute;inset-block:0;inset-inline:0 75%;background:#064928}'),
      anchos: [1920],
    },
    { nombre: 'franja movil con el texto oscuro', espera: 'C', hoja: anadir('.banner-titulo{color:#000}'), anchos: [390] },
  ]
  const resultados = []
  for (const c of controles) {
    const sustituciones = {}
    if (c.hoja) sustituciones['/src/componentes/BannerInstitucional.css'] = c.hoja
    if (c.tokens) sustituciones['/src/estilos/tokens.css'] = c.tokens
    const anchos = c.anchos ? ANCHOS.filter((a) => c.anchos.includes(a.w)) : [ANCHOS[0], ANCHOS.find((a) => a.w === 768), ANCHOS.find((a) => a.w === 600)]
    const filas = await pasadaP2(navegador, oraculo, { sustituciones, anchos, forcedColors: c.forcedColors, guardar: false })
    const codigos = new Set(filas.flatMap((f) => f.fallos.map((x) => x.codigo)))
    resultados.push({ control: c.nombre, espera: c.espera, vio: [...codigos].join(',') || '(nada)', ok: codigos.has(c.espera) })
  }
  return resultados
}

// ---- Principal -----------------------------------------------------------------------------
async function main() {
  await mkdir(SALIDA, { recursive: true })
  let fallos = 0
  const avisos = []

  // P1
  const medida = await medirJpeg(path.join(FRONTEND, 'public', marca.largo.archivo))
  const f1 = pasadaP1(medida)
  console.log(
    `P1  JPEG: ${medida.ancho}x${medida.alto} · la marca termina en ${medida.finMarca} · campo plano ${medida.campoDesde}-${medida.campoHasta} · remate desde ${medida.remateDesde}\n` +
      `    zona del titulo en marca.json: ${ZONA.desdePx} -> ${ZONA.hastaPx}   ${f1.length ? 'FALLA' : 'OK'}`,
  )
  for (const f of f1) console.error(`    - ${f}`)
  fallos += f1.length
  const estructura = await chequearEstructuraDelJsx()
  for (const f of estructura) console.error(`    - JSX: ${f}`)
  fallos += estructura.length

  const navegador = await chromium.launch()
  try {
    if (ARGS.has('--autoprueba')) {
      const res = await autoprueba(navegador, medida)
      console.table(res.map((r) => ({ control: r.control, 'debe fallar con': r.espera, 'fallo con': r.vio, resultado: r.ok ? 'OK (rojo, como debe)' : 'NO FALLA: el verificador no lo ve' })))
      const malos = res.filter((r) => !r.ok).length
      if (malos) {
        console.error(`\n${malos} control(es) negativo(s) NO se detectaron: este verificador no protege de eso.`)
        process.exit(1)
      }
      console.log('\nTodos los controles negativos fallan como deben.')
      return
    }

    // P2: la hoja con un titulo largo, y otra vez en colores forzados
    const filas = await pasadaP2(navegador, medida)
    console.log('\nP2  la hoja real con un titulo largo')
    console.table(filas.map((f) => ({ ancho: f.ancho, modo: f.modo, 'contraste min': f.contraste ?? '', 'tinta min %': f.tinta ?? '', estado: f.fallos.length ? 'FALLA' : 'OK' })))
    for (const f of filas) for (const x of f.fallos) console.error(`    ${f.ancho} [${x.codigo}] ${x.detalle}`)
    fallos += filas.reduce((n, f) => n + f.fallos.length, 0)

    const forzados = await pasadaP2(navegador, medida, { forcedColors: true, anchos: [ANCHOS[0], ANCHOS.find((a) => a.w === 600)], guardar: false })
    for (const f of forzados) for (const x of f.fallos) console.error(`    colores forzados, ${f.ancho} [${x.codigo}] ${x.detalle}`)
    console.log(`    colores forzados (alto contraste de Windows): ${forzados.some((f) => f.fallos.length) ? 'FALLA' : 'OK'}`)
    fallos += forzados.reduce((n, f) => n + f.fallos.length, 0)

    // P3
    if (ARGS.has('--sin-dist')) {
      console.log('\nP3  omitida (--sin-dist)')
    } else {
      const p3 = await pasadaP3(navegador, medida)
      console.log(`\nP3  la aplicacion construida: ${p3.estado}${p3.detalle ? ' · ' + p3.detalle : ''}`)
      if (p3.estado === 'SIN_EVALUAR') avisos.push(`P3 SIN_EVALUAR: ${p3.detalle}`)
      for (const x of p3.fallos ?? []) console.error(`    [${x.codigo}] ${x.detalle}`)
      fallos += (p3.fallos ?? []).length
    }
  } finally {
    await navegador.close()
  }

  await writeFile(path.join(SALIDA, 'titulo.json'), JSON.stringify({ gerencia: marca.gerencia, zona: ZONA, jpeg: medida, fallos, avisos }, null, 2) + '\n')
  for (const a of avisos) {
    console.log(`AVISO: ${a}`)
    anotarEnActions(`SIN EVALUAR: ${a}`)
  }
  if (fallos) {
    console.error(`\n${fallos} comprobacion(es) fallaron.`)
    anotarEnActions(`${fallos} comprobacion(es) del texto superpuesto del banner fallaron: abre el registro de este paso`)
    process.exit(1)
  }
  if (avisos.length) {
    // Un verde que no miro no es verde: las partes que SI se miraron cuadran, y lo demas se dice
    console.log(`\nNo fallo nada de lo que se pudo comprobar, pero ${avisos.length} parte(s) quedaron SIN EVALUAR (arriba): eso no es lo mismo que estar bien.`)
    return
  }
  console.log('\nTodo cuadra. Ahora MIRA verificacion/titulo-1920.png y verificacion/titulo-768.png: el texto va sin caja y la marca esta entera?')
}

main()
