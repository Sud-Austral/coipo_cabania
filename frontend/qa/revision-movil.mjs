import puppeteer from 'puppeteer-core'
const BASE=process.env.BASE ?? 'http://localhost:5199/coipo_cabania/'
const CAPS=process.env.CAPS ?? 'C:/Users/LUIS~1.MON/AppData/Local/Temp/caps-movil'
const nav = await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,defaultViewport:{width:375,height:812,isMobile:true,hasTouch:true},args:['--hide-scrollbars']})
const p = await nav.newPage()
await p.goto(BASE,{waitUntil:'networkidle2'})
const ver = async (rol, ruta, nombre) => {
  await p.evaluate(r=>localStorage.setItem('coipo_rol_v1',r), rol)
  await p.goto(BASE+'#'+ruta,{waitUntil:'networkidle2'})
  await p.reload({waitUntil:'networkidle2'})
  await new Promise(r=>setTimeout(r,2200))
  const m = await p.evaluate(()=>({
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
    // Elementos que se salen del ancho de la pantalla.
    // .banner-institucional se excluye: por debajo de 1165 px la imagen
    // desborda A PROPÓSITO (piso de altura, §3 del insumo gráfico) y el
    // contenedor la recorta con overflow:hidden. Sin esta exclusión el <img>
    // saldría listado en las diez rutas y taparía los desbordes reales.
    desbordan: [...document.querySelectorAll('body *')].filter(e=>{
      const r=e.getBoundingClientRect()
      return r.width>0 && r.right > window.innerWidth + 2 &&
             getComputedStyle(e).overflowX!=='auto' && getComputedStyle(e).overflowX!=='scroll' &&
             !e.closest('[class*="overflow-x-auto"], .banner-institucional')
    }).slice(0,4).map(e=>`${e.tagName}.${(e.className||'').toString().slice(0,45)}`)
  }))
  await p.screenshot({path:`${CAPS}/${nombre}.png`,fullPage:true})
  const scrollH = m.scrollW > m.clientW+2
  console.log(`${nombre}: ${scrollH?`!! SCROLL HORIZONTAL (${m.scrollW}>${m.clientW})`:'ok'}${m.desbordan.length?' | desbordan: '+m.desbordan.join(' , '):''}`)
}
await ver('afiliado','/catalogo','m1-catalogo')
await ver('afiliado','/inmuebles/2','m2-ficha')
await ver('afiliado','/inmuebles/2/reservar','m3-reservar')
await ver('afiliado','/mis-reservas','m4-mis-reservas')
await ver('regional','/regional','m5-regional')
await ver('regional','/regional/calendario','m6-calendario')
await ver('central','/central/dashboard','m7-reportes')
await ver('central','/central/descuentos','m8-nomina')
await ver('admin','/admin/inmuebles','m9-admin')
await ver('admin','/admin/auditoria','m10-auditoria')
await nav.close()
