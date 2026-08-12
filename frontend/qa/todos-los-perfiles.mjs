/**
 * QA de las cinco vistas de perfil: comprueba que cada pantalla carga poblada,
 * sin errores de consola y sin marcadores de "en construcción".
 */
import puppeteer from 'puppeteer-core'

const BASE = process.env.BASE ?? 'http://localhost:5199/'
const CAPS = process.env.CAPS ?? 'C:/Users/LUIS~1.MON/AppData/Local/Temp/caps'

// Sin '#': la app pasó de HashRouter a BrowserRouter (src/main.jsx). Se recorta
// la barra final de BASE en vez de usar new URL(ruta, BASE) porque con new URL
// una ruta absoluta descartaría un eventual subpath, y así el mismo script
// sirve tanto contra http://localhost:5199/ como contra el despliegue real.
const url = (ruta) => BASE.replace(/\/+$/, '') + ruta

const nav = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  defaultViewport: { width: 1366, height: 768 },
  args: ['--hide-scrollbars'],
})
const p = await nav.newPage()
const errores = []
p.on('pageerror', (e) => errores.push('pageerror: ' + e.message))
p.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()) })

await p.goto(BASE, { waitUntil: 'networkidle2' })

let fallas = 0
const revisar = async (rol, ruta, nombre, esperados, alto = 1500) => {
  await p.evaluate((r) => localStorage.setItem('coipo_rol_v1', r), rol)
  await p.setViewport({ width: 1366, height: alto })
  await p.goto(url(ruta), { waitUntil: 'networkidle2' })
  await p.reload({ waitUntil: 'networkidle2' })
  await new Promise((r) => setTimeout(r, 2200))
  await p.screenshot({ path: `${CAPS}/${nombre}.png`, fullPage: true })
  const t = (await p.evaluate(() => document.body.innerText)).toLowerCase()
  const problemas = []
  if (t.includes('en construcción')) problemas.push('vista sin construir')
  if (t.includes('corresponde a otro perfil')) problemas.push('guarda de perfil activada')
  esperados.forEach((e) => { if (!t.includes(e.toLowerCase())) problemas.push(`falta «${e}»`) })
  if (problemas.length) { fallas++; console.log(`  FALLA ${nombre}: ${problemas.join('; ')}`) }
  else console.log(`  OK    ${nombre}`)
}

console.log('Afiliado')
await revisar('afiliado', '/catalogo', 'p1-afiliado-catalogo', ['34 de 34 inmuebles', 'Bahía Inglesa'], 1500)
await revisar('afiliado', '/inmuebles/22', 'p2-afiliado-ficha', ['Termas de Aguas Calientes', 'Tarifas de referencia', 'Disponibilidad'], 1800)
await revisar('afiliado', '/mis-reservas', 'p3-afiliado-reservas', ['Mis reservas', 'R-2026'], 1200)

console.log('Usuario no afiliado')
await revisar('no_afiliado', '/catalogo', 'p4-noafiliado', ['usuario no afiliado', 'prioridad de los afiliados'], 1300)
await revisar('no_afiliado', '/inmuebles/30', 'p5-noafiliado-ficha', ['tarifa de usuario externo'], 1700)

console.log('Encargada regional')
await revisar('regional', '/regional', 'p6-regional', ['Solicitudes de la Región de Valparaíso', 'prelación', 'Confirmar'], 1500)
await revisar('regional', '/regional/calendario', 'p7-regional-calendario', ['Calendario operativo', 'Bloqueos registrados'], 1300)

console.log('Oficina Central')
await revisar('central', '/central', 'p8-central-reservas', ['Reservas de toda la red', 'R-2026'], 1600)
await revisar('central', '/central/descuentos', 'p9-central-nomina', ['Nómina de descuentos', 'descontado', 'informado'], 1400)
await revisar('central', '/central/dashboard', 'p10-central-reportes', ['Noches ocupadas por región', 'Inmuebles más demandados'], 1500)
await revisar('central', '/central/sanciones', 'p11-central-sanciones', ['Bloqueos y sanciones', 'vigente'], 1200)

console.log('Administrador')
await revisar('admin', '/admin/inmuebles', 'p12-admin-inmuebles', ['Mantención de inmuebles', 'Editar'], 1700)
await revisar('admin', '/admin/temporadas', 'p13-admin-temporadas', ['Temporadas definidas', 'Bloqueos de fechas'], 1500)
await revisar('admin', '/admin/nomina', 'p14-admin-nomina', ['Afiliados vigentes', 'Vista previa'], 1400)
await revisar('admin', '/admin/auditoria', 'p15-admin-auditoria', ['Pistas de auditoría', '19.628'], 1500)

console.log(errores.length ? `\nERRORES DE CONSOLA (${errores.length}):\n` + [...new Set(errores)].slice(0,8).join('\n') : '\nSin errores de consola.')
console.log(`\nRESULTADO: ${15 - fallas} vistas correctas, ${fallas} con problemas`)
await nav.close()
process.exit(fallas ? 1 : 0)
