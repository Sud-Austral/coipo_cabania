/**
 * Recorrido automatizado del flujo crítico del afiliado.
 * Verifica el RESULTADO real en el navegador, no el código.
 */
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE ?? 'http://localhost:5199/'
const CAPS = process.env.CAPS ?? 'C:/Users/LUIS~1.MON/AppData/Local/Temp/caps'
mkdirSync(CAPS, { recursive: true })

// Sin '#': la app pasó de HashRouter a BrowserRouter (src/main.jsx). Se recorta
// la barra final de BASE en vez de usar new URL(ruta, BASE) porque con new URL
// una ruta absoluta descartaría un eventual subpath, y así el mismo script
// sirve tanto contra http://localhost:5199/ como contra el despliegue real.
const url = (ruta) => BASE.replace(/\/+$/, '') + ruta

const pasos = []
const ok = (m) => { pasos.push(['OK', m]); console.log('  OK   ' + m) }
const fail = (m) => { pasos.push(['FALLA', m]); console.log('  FALLA ' + m) }

const navegador = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  defaultViewport: { width: 1366, height: 768 },
  args: ['--hide-scrollbars'],
})
const pag = await navegador.newPage()

const errores = []
pag.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()) })
pag.on('pageerror', (e) => errores.push('pageerror: ' + e.message))

const cap = (n) => pag.screenshot({ path: `${CAPS}/${n}.png`, fullPage: true })
const texto = () => pag.evaluate(() => document.body.innerText)
const textoNorm = async () => (await texto()).toLowerCase()
const esperarTexto = async (t, ms = 8000) => {
  const fin = Date.now() + ms
  while (Date.now() < fin) {
    if ((await texto()).includes(t)) return true
    await new Promise((r) => setTimeout(r, 150))
  }
  return false
}
const clicPorTexto = async (sel, t) => {
  const encontrado = await pag.evaluate((sel, t) => {
    const el = [...document.querySelectorAll(sel)].find((e) => e.innerText.trim().includes(t))
    if (!el) return false
    el.click()
    return true
  }, sel, t)
  await new Promise((r) => setTimeout(r, 700))
  return encontrado
}

try {
  // ---- 1. Catálogo ----
  await pag.goto(url('/catalogo'), { waitUntil: 'networkidle2' })
  await esperarTexto('Catálogo de inmuebles')
  const t1 = await texto()
  t1.includes('34 de 34 inmuebles') ? ok('Catálogo carga los 34 inmuebles') : fail('El catálogo no muestra 34 inmuebles')

  // ---- 2. Filtrar por región Atacama ----
  await pag.evaluate(() => {
    // El primer <select> del documento es el selector de rol del encabezado:
    // hay que tomar el de región, dentro del formulario de filtros.
    const sel = [...document.querySelectorAll('select')].find((s) =>
      [...s.options].some((o) => o.textContent.includes('Todas las regiones')))
    sel.value = '03'
    sel.dispatchEvent(new Event('change', { bubbles: true }))
  })
  await new Promise((r) => setTimeout(r, 800))
  const t2 = await texto()
  t2.includes('3 de 34 inmuebles') ? ok('Filtro por región Atacama devuelve 3 inmuebles') : fail('Filtro por región: ' + (t2.match(/\d+ de 34 inmuebles/)?.[0] ?? 'sin conteo'))
  t2.includes('Bahía Inglesa') ? ok('Bahía Inglesa aparece en el resultado filtrado') : fail('Bahía Inglesa no aparece')
  await cap('q1-catalogo-filtrado')

  // ---- 3. Ficha del inmueble vitrina ----
  await pag.goto(url('/inmuebles/2'), { waitUntil: 'networkidle2' })
  await esperarTexto('Casa de Veraneo Bahía Inglesa 1')
  const t3 = await texto()
  const enFicha = ['Disponibilidad', 'Tarifas de referencia', 'Zonas de interés', 'Equipamiento', 'Playa La Piscina']
  enFicha.forEach((s) => (t3.includes(s) ? ok(`Ficha muestra «${s}»`) : fail(`Ficha sin «${s}»`)))
  const nMapa = await pag.evaluate(() => document.querySelectorAll('.leaflet-tile').length)
  nMapa > 0 ? ok(`Mapa Leaflet cargó ${nMapa} teselas`) : fail('El mapa no cargó teselas')
  const nMini = await pag.evaluate(() => document.querySelectorAll('[aria-label^="Ver fotografía"]').length)
  nMini === 5 ? ok('Galería con 5 fotografías') : fail(`Galería con ${nMini} fotografías (se esperaban 5)`)

  // ---- 4. Iniciar reserva ----
  await pag.goto(url('/inmuebles/2/reservar'), { waitUntil: 'networkidle2' })
  await esperarTexto('Solicitud de reserva')
  ok('Asistente de reserva abre en el paso 1')

  // Elegir un rango de fechas disponible en el calendario
  const rango = await pag.evaluate(() => {
    const dias = [...document.querySelectorAll('.rdp-day:not(.rdp-disabled) .rdp-day_button')]
      .filter((b) => !b.disabled)
    if (dias.length < 5) return null
    dias[1].click()
    return { total: dias.length, primero: dias[1].textContent, segundo: dias[4].textContent }
  })
  if (!rango) { fail('No hay días disponibles para seleccionar'); throw new Error('sin fechas') }
  await new Promise((r) => setTimeout(r, 400))
  await pag.evaluate(() => {
    const dias = [...document.querySelectorAll('.rdp-day:not(.rdp-disabled) .rdp-day_button')].filter((b) => !b.disabled)
    dias[4].click()
  })
  await new Promise((r) => setTimeout(r, 700))
  const t4 = await texto()
  t4.includes('Fechas seleccionadas') ? ok('Rango de fechas seleccionado en el calendario') : fail('No se registró el rango de fechas')
  const noches = t4.match(/(\d+) noche/)?.[1]
  noches ? ok(`Calculó ${noches} noche(s)`) : fail('No calculó las noches')
  await cap('q2-reserva-paso1')

  // Motivo: razones personales (por omisión). Continuar al paso 2
  await clicPorTexto('button', 'Continuar')
  const t5 = await texto()
  t5.includes('Registro de ocupantes') ? ok('Avanza al paso 2 (ocupantes)') : fail('No avanzó al paso 2')

  // Marcar cónyuge
  await pag.evaluate(() => {
    const cajas = [...document.querySelectorAll('input[type=checkbox]')]
    if (cajas[0]) cajas[0].click()
  })
  await new Promise((r) => setTimeout(r, 400))

  // Agregar un acompañante externo
  await clicPorTexto('button', 'Agregar acompañante')
  await pag.evaluate(() => {
    const campos = [...document.querySelectorAll('input[type=text]')]
    const set = (el, v) => {
      const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')
      desc.set.call(el, v)
      el.dispatchEvent(new Event('input', { bubbles: true }))
    }
    if (campos[0]) set(campos[0], 'Rosa Quezada Lillo')
    if (campos[1]) set(campos[1], '9.774.302-6')
  })
  await new Promise((r) => setTimeout(r, 600))
  const t6 = await texto()
  t6.includes('3 de 8 personas') ? ok('Total de ocupantes: 3 de 8 (titular + cónyuge + acompañante)') : fail('Conteo de ocupantes: ' + (t6.match(/\d+ de \d+ personas/)?.[0] ?? 'no encontrado'))
  await cap('q3-reserva-paso2')

  // ---- 5. Validación de capacidad: agregar de más ----
  for (let i = 0; i < 6; i++) await clicPorTexto('button', 'Agregar acompañante')
  const t7 = await texto()
  t7.includes('Se excede la capacidad máxima') ? ok('Bloquea al exceder la capacidad máxima') : fail('NO bloquea al exceder capacidad')
  const btnBloqueado = await pag.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((e) => e.innerText.includes('Continuar'))
    return b ? b.disabled : null
  })
  btnBloqueado === true ? ok('El botón Continuar queda deshabilitado') : fail('Continuar sigue habilitado con exceso de capacidad')
  await cap('q4-exceso-capacidad')

  // Quitar los excedentes
  for (let i = 0; i < 6; i++) {
    await pag.evaluate(() => {
      const bs = [...document.querySelectorAll('button[aria-label^="Quitar acompañante"]')]
      if (bs.length) bs[bs.length - 1].click()
    })
    await new Promise((r) => setTimeout(r, 200))
  }
  await new Promise((r) => setTimeout(r, 400))
  const t8 = await texto()
  t8.includes('3 de 8 personas') ? ok('Vuelve a 3 ocupantes tras quitar los excedentes') : fail('No volvió a 3 ocupantes')

  // ---- 6. Paso 3: tarifa ----
  await clicPorTexto('button', 'Continuar')
  const t9 = await texto()
  t9.includes('Tarifa estimada') ? ok('Avanza al paso 3 (tarifa)') : fail('No avanzó al paso 3')
  const montos = await pag.evaluate(() => document.body.innerText.match(/\$[\d.]+/g) ?? [])
  montos.length ? ok(`Desglose de tarifa con montos: ${montos.slice(0, 4).join(', ')}`) : fail('Sin montos en el desglose')
  const totalTexto = await pag.evaluate(() => {
    const f = [...document.querySelectorAll('tr')].find((t) => t.innerText.includes('Total estimado'))
    return f ? f.innerText.replace(/\s+/g, ' ') : null
  })
  totalTexto ? ok('Total: ' + totalTexto) : fail('No se encontró la fila de total')
  await cap('q5-reserva-paso3-tarifa')

  // ---- 7. Paso 4 y envío ----
  await clicPorTexto('button', 'Continuar')
  const t10 = await texto()
  t10.includes('Revise y confirme') ? ok('Avanza al paso 4 (confirmación)') : fail('No avanzó al paso 4')
  await cap('q6-reserva-paso4')

  await clicPorTexto('button', 'Enviar solicitud')
  const llego = await esperarTexto('Comprobante de solicitud', 9000)
  llego ? ok('Envía la solicitud y llega al comprobante') : fail('No llegó al comprobante')
  const t11 = await texto()
  const codigo = t11.match(/R-2026-\d{4}/)?.[0]
  codigo ? ok(`Comprobante con código ${codigo}`) : fail('El comprobante no tiene código')
  t11.includes('Recibida') ? ok('Estado inicial: Recibida') : fail('Estado inicial distinto de Recibida')
  ;(await textoNorm()).includes('trazabilidad') ? ok('Comprobante incluye trazabilidad de estados') : fail('Sin trazabilidad')
  await cap('q7-comprobante')

  // ---- 8. Aparece en Mis reservas ----
  await pag.goto(url('/mis-reservas'), { waitUntil: 'networkidle2' })
  await esperarTexto('Mis reservas')
  const aparece = await esperarTexto(codigo, 8000)
  aparece ? ok('La nueva reserva aparece en Mis reservas') : fail('La reserva no aparece en Mis reservas')
  await cap('q8-mis-reservas')

  // ---- 9. Persistencia tras recargar ----
  await pag.reload({ waitUntil: 'networkidle2' })
  await esperarTexto('Mis reservas')
  const t13 = await texto()
  codigo && t13.includes(codigo) ? ok('La reserva persiste tras recargar la página') : fail('La reserva se pierde al recargar')

  console.log('\nCódigo de la reserva creada: ' + codigo)
} catch (e) {
  fail('Excepción: ' + e.message)
} finally {
  if (errores.length) {
    console.log('\nERRORES DE CONSOLA (' + errores.length + '):')
    ;[...new Set(errores)].slice(0, 10).forEach((e) => console.log('  - ' + e.slice(0, 220)))
  } else {
    console.log('\nSin errores de consola.')
  }
  const fallas = pasos.filter(([e]) => e === 'FALLA').length
  console.log(`\nRESULTADO: ${pasos.length - fallas} correctas, ${fallas} fallas`)
  await navegador.close()
  process.exit(fallas ? 1 : 0)
}
