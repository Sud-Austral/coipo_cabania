// Recorrido de QA en Chrome (Playwright) sobre `vite preview`:
//   afiliado reserva Bahía Inglesa 1 (id 2) en 3 pasos → comprobante
//   regional la confirma (y registra llegada y salida: el cobro nace al registrar la salida)
//   Oficina Central ve el cobro en Nómina mensual
//   administrador cambia una regla
// Además: errores de página y de consola, «NaN|undefined» en el texto, desborde a 390 px,
// y capturas de escritorio y 390 px de cada perfil.
// Uso: npx vite preview --port 5390 --strictPort --host 127.0.0.1  y luego  node qa/recorrido.mjs
import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'

const URL = process.env.URL ?? 'http://127.0.0.1:5390/'
const CAPS = process.env.CAPS ?? 'C:/Users/alfredo.cespedes/AppData/Local/hermes/cache/scratch/cabanas_v2_caps'
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
mkdirSync(CAPS, { recursive: true })

const informe = { pasos: [], errores: [], red: [], textoMalo: [], desborde: [], capturas: [] }
const paso = (ok, msg) => { informe.pasos.push({ ok, msg }); console.log(`${ok ? 'OK   ' : 'FALLA'} ${msg}`) }

const browser = await chromium.launch({ executablePath: CHROME, headless: true })

function vigilar(page, etiqueta) {
  page.on('pageerror', (e) => informe.errores.push(`[${etiqueta}] pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() !== 'error') return
    const t = m.text()
    // Teselas de OSM o recursos de red: se informan aparte (dependen de la salida a internet).
    if (/Failed to load resource|tile\.openstreetmap|net::ERR/i.test(t)) informe.red.push(`[${etiqueta}] ${t}`)
    else informe.errores.push(`[${etiqueta}] console.error: ${t}`)
  })
}

async function abrir(page, hash) {
  await page.evaluate((h) => { location.hash = h }, hash)
  await page.waitForFunction(() => !document.querySelector('.cb-cargando'), null, { timeout: 8000 }).catch(() => {})
  await page.waitForTimeout(450)
}

async function revisarTexto(page, donde) {
  const t = await page.evaluate(() => document.body.innerText)
  const m = t.match(/.{0,30}\b(NaN|undefined)\b.{0,30}/g)
  if (m) informe.textoMalo.push({ donde, m })
}

async function medirDesborde(page, donde) {
  const r = await page.evaluate(() => {
    const ancho = innerWidth
    const fuera = []
    const recorta = (el) => { for (let p = el.parentElement; p; p = p.parentElement) { const s = getComputedStyle(p); if (['auto', 'scroll', 'hidden', 'clip'].includes(s.overflowX) && p !== document.documentElement && p !== document.body) return true } return false }
    for (const el of document.querySelectorAll('main *, .b-cabecera *, .cb-franja')) {
      const b = el.getBoundingClientRect()
      if (b.width && b.right > ancho + 1 && !recorta(el)) fuera.push(`${el.tagName.toLowerCase()}.${[...el.classList].join('.')} → ${Math.round(b.right)}px`)
    }
    return { scrollWidth: document.documentElement.scrollWidth, bodyScroll: document.body.scrollWidth, ancho, fuera: fuera.slice(0, 6) }
  })
  if (r.scrollWidth > r.ancho || r.bodyScroll > r.ancho || r.fuera.length) informe.desborde.push({ donde, ...r })
  return r
}

async function capturar(page, nombre) {
  const ruta = `${CAPS}/${nombre}.png`
  await page.screenshot({ path: ruta, fullPage: true })
  informe.capturas.push(ruta)
}

async function perfil(page, rol) {
  await page.selectOption('.cb-perfil select', rol)
  await page.waitForTimeout(600)
}

// ─────────────── 1. Flujo principal, escritorio ───────────────
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: 'es-CL', colorScheme: 'dark', reducedMotion: 'reduce' })
const page = await ctx.newPage()
vigilar(page, 'escritorio')
await page.goto(URL)
await page.evaluate(() => localStorage.clear())
await page.goto(`${URL}#casas`)
await page.waitForSelector('.cb-casa')
paso((await page.locator('.cb-casa').count()) === 34, `catálogo muestra las 34 casas (${await page.locator('.cb-casa').count()})`)
paso(/Versión de prueba · datos ficticios/.test(await page.locator('.cb-franja').innerText()), 'franja de prueba visible')

// Ficha de Bahía Inglesa 1
await abrir(page, 'casa/2')
await page.waitForSelector('.cb-cal-dia')
paso(/Bahía Inglesa 1/.test(await page.locator('h1').innerText()), 'ficha de Bahía Inglesa 1')
await page.locator('.cb-eleccion .b-boton').click()
await page.waitForSelector('.cb-pasos')
paso((await page.evaluate(() => location.hash)).startsWith('#reservar/2'), 'botón Reservar abre el paso 1')

// Paso 1: tres noches libres desde dentro de una semana
await page.waitForFunction(() => !document.querySelector('.cb-cal[data-cargando]'))
const fechas = await page.evaluate(() => {
  const libres = [...document.querySelectorAll('.cb-cal-dia[data-tipo="libre"]:not([disabled])')].map((b) => b.dataset.fecha)
  const set = new Set(libres)
  const mas = (iso, n) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }
  const hoy = new Date().toISOString().slice(0, 10)
  const llegada = libres.find((f) => f >= mas(hoy, 7) && set.has(mas(f, 1)) && set.has(mas(f, 2)) && document.querySelector(`.cb-cal-dia[data-fecha="${mas(f, 3)}"]`))
  return llegada ? { llegada, salida: mas(llegada, 3) } : null
})
paso(Boolean(fechas), `hay 3 noches libres (${fechas?.llegada} → ${fechas?.salida})`)
await page.click(`.cb-cal-dia[data-fecha="${fechas.llegada}"]`)
await page.click(`.cb-cal-dia[data-fecha="${fechas.salida}"]`)
await page.waitForSelector('.cb-estado-fechas .estado.correcto')
paso(true, 'calendario: fechas libres')
await page.click('.cb-opcion:has-text("Descanso")')
await capturar(page, 'afiliado-reservar-paso1-escritorio')
await page.click('.cb-panel-pie .b-boton')

// Paso 2: titular + cónyuge
await page.waitForSelector('.cb-personas')
await page.locator('.cb-personas input[type=checkbox]').first().check()
paso((await page.locator('.cb-capacidad b').innerText()) === '2', 'paso 2: 2 personas')
await page.click('.cb-panel-pie .b-boton')

// Paso 3: total grande y envío
await page.waitForSelector('.cb-total')
const total = await page.locator('.cb-total').innerText()
paso(/^\$\s?[\d.]+$/.test(total.trim()), `paso 3: total grande ${total}`)
await capturar(page, 'afiliado-reservar-paso3-escritorio')
await page.click('.cb-panel-pie .b-boton')
await page.waitForSelector('.cb-codigo', { timeout: 8000 })
const codigo = (await page.locator('.cb-codigo').innerText()).trim()
paso(/^R-2026-\d{4}$/.test(codigo), `comprobante con código ${codigo}`)
paso(/Por confirmar/.test(await page.locator('.cb-comp').innerText()), 'comprobante: Por confirmar')
await capturar(page, 'afiliado-comprobante-escritorio')
await revisarTexto(page, 'comprobante')

// ─────────────── 2. Regional confirma ───────────────
await perfil(page, 'regional')
await page.waitForSelector('.cb-tablero')
await page.selectOption('.cb-titulo select', '03')
await page.waitForSelector(`.cb-fila[data-codigo="${codigo}"]`)
const fila = page.locator(`.cb-fila[data-codigo="${codigo}"]`)
paso(/Fechas libres/.test(await fila.innerText()), 'regional ve la solicitud con «✓ Fechas libres»')
await capturar(page, 'regional-inicio-escritorio')
await fila.locator('button:has-text("Confirmar")').click()
await page.click('.cb-hoja-pie .b-boton')
await page.waitForSelector(`.cb-fila[data-codigo="${codigo}"]`, { state: 'detached' })
paso(true, 'regional confirma la reserva')
await page.locator(`.cb-mini li[data-codigo="${codigo}"] button`).click()
await page.click('.cb-hoja-pie .b-boton')
await page.waitForTimeout(600)
await page.locator(`.cb-mini li[data-codigo="${codigo}"] button:has-text("Salió")`).click()
await page.click('.cb-hoja-pie .b-boton')
await page.waitForTimeout(600)
const estado = await page.evaluate((c) => JSON.parse(localStorage.getItem('cabanas_v2_demo_v1')).reservas.find((r) => r.codigo === c)?.estado, codigo)
paso(estado === 'finalizada', `regional registra llegada y salida (estado: ${estado})`)

// ─────────────── 3. Oficina Central ve el cobro ───────────────
await perfil(page, 'central')
await page.waitForSelector('.cb-tablero')
await capturar(page, 'central-inicio-escritorio')
await abrir(page, 'cobros')
await page.waitForSelector('.cb-pasos-nomina')
const cuota = page.locator(`.cb-cola li[data-codigo="${codigo}"]`)
paso((await cuota.count()) === 1, `Nómina mensual (${await page.locator('.cb-select option:checked').innerText()}) incluye la cuota de ${codigo}`)
paso((await cuota.innerText()).includes(total.trim().replace(/\s/g, ' ')) || (await cuota.innerText()).includes(total.trim()), `la cuota vale el total de la reserva (${total})`)
await capturar(page, 'central-cobros-escritorio')

// ─────────────── 4. Administrador cambia una regla ───────────────
await perfil(page, 'admin')
await page.waitForSelector('.cb-tablero-admin')
await capturar(page, 'admin-inicio-escritorio')
await abrir(page, 'reglas')
await page.fill('input[data-regla="desistimiento_sin_cobro"]', '10')
await page.click('.cb-reglas .b-boton')
await page.click('.cb-hoja-pie .b-boton')
await page.waitForSelector('text=Reglas guardadas')
const regla = await page.evaluate(() => JSON.parse(localStorage.getItem('cabanas_v2_demo_v1')).parametros?.desistimiento_sin_cobro)
paso(regla === 10, `admin cambia «Cancelar con N días» a 10 (guardado: ${regla})`)
await capturar(page, 'admin-reglas-escritorio')
await abrir(page, 'auditoria')
paso(/Actualización de parámetros/.test(await page.locator('main').innerText()), 'el cambio queda en la auditoría')

// ─────────────── 5. Recorrido de vistas: texto y capturas de escritorio ───────────────
const VISTAS = {
  afiliado: ['casas', 'casa/2', 'mis-reservas', 'arquitectura'],
  no_afiliado: ['casas', 'mis-reservas'],
  regional: ['regional', 'calendario', 'manual'],
  central: ['central', 'reservas', 'cobros', 'reportes', 'bloqueos'],
  admin: ['admin', 'inmuebles', 'reglas', 'usuarios', 'auditoria'],
}
for (const [rol, vistas] of Object.entries(VISTAS)) {
  await perfil(page, rol)
  for (const v of vistas) {
    await abrir(page, v)
    await revisarTexto(page, `${rol} #${v}`)
    if (v === vistas[0]) await capturar(page, `${rol}-${v}-escritorio`)
  }
}
// Tema día
await page.click('.b-tema')
await perfil(page, 'afiliado')
await abrir(page, 'casa/2')
await capturar(page, 'afiliado-ficha-dia-escritorio')
await ctx.close()

// ─────────────── 6. 390 px: desborde y capturas ───────────────
const movil = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'es-CL', colorScheme: 'dark', reducedMotion: 'reduce' })
const m = await movil.newPage()
vigilar(m, '390')
await m.goto(`${URL}#casas`)
await m.waitForSelector('.cb-casa')
for (const [rol, vistas] of Object.entries({ ...VISTAS, afiliado: [...VISTAS.afiliado, 'reservar/2', `reserva/${codigo}`] })) {
  await perfil(m, rol)
  for (const v of vistas) {
    await abrir(m, v)
    await medirDesborde(m, `${rol} #${v}`)
    await revisarTexto(m, `390 ${rol} #${v}`)
    if (v === vistas[0] || ['casa/2', 'reservar/2', 'cobros'].includes(v)) await capturar(m, `${rol}-${v.replace('/', '-')}-390`)
  }
}
// Una hoja abierta en móvil
await perfil(m, 'afiliado')
await abrir(m, 'mis-reservas')
await m.locator('.cb-reserva button:has-text("Cancelar")').first().click()
await m.waitForSelector('.cb-hoja[open]')
await medirDesborde(m, 'hoja cancelar 390')
await capturar(m, 'afiliado-hoja-cancelar-390')
await movil.close()
await browser.close()

const fallas = informe.pasos.filter((p) => !p.ok).length
console.log(`\nPasos: ${informe.pasos.length - fallas}/${informe.pasos.length} OK`)
console.log(`Errores de página/consola: ${informe.errores.length}`); informe.errores.slice(0, 10).forEach((e) => console.log('  ', e))
console.log(`Errores de red (teselas, etc.): ${informe.red.length}`)
console.log(`Texto con NaN/undefined: ${informe.textoMalo.length}`); informe.textoMalo.forEach((t) => console.log('  ', t.donde, t.m))
console.log(`Vistas con desborde a 390 px: ${informe.desborde.length}`); informe.desborde.forEach((d) => console.log('  ', d.donde, d.scrollWidth, d.bodyScroll, d.fuera))
console.log(`Capturas: ${informe.capturas.length} en ${CAPS}`)
writeFileSync(`${CAPS}/informe.json`, JSON.stringify(informe, null, 2))
process.exit(fallas || informe.errores.length || informe.textoMalo.length || informe.desborde.length ? 1 : 0)
