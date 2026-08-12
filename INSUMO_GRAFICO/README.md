# INSUMO_GRAFICO — material gráfico de la maqueta Red de Casas Bienestar CONAF

Fuente de verdad del material gráfico: el asset recibido, todo lo que se derivó de él, y la
evidencia de que la maqueta quedó bien. Nada de esto tiene datos personales — a diferencia de
`INSUMO/`, que está en `.gitignore` justamente porque sí los tiene.

El material tiene dos escalas previas: se integró primero en el **Consolidador Previred** y
después en el **panel COIPO IAM**, de donde llegó a este repo. `implementacion_banner.md` es
portable a propósito y **no se toca**: su metodología transfiere íntegra. Lo que sí hubo que
rehacer al aterrizarlo aquí es la tabla de rutas de este README, porque describía COIPO IAM
—`src/styles/tokens.css`, `components/Banner.jsx`, `IsotipoConaf.jsx`, `scripts/verify-banner.mjs`,
las rutas `/login` y `/registro`, el apilado `.app-frame`/`.app-shell`— y **nada de eso existe
en `coipo_cabania`**. Es una maqueta React 19 + Vite + **Tailwind v4**, sin autenticación y con
scroll de documento.

⚠️ **`banner3.jpg` se rediseñó conservando el nombre de archivo.** El asset actual es un banner
de cabecera web (17,13:1); el anterior era un membrete de documento (10,39:1). **El nombre no te
avisa de nada**: si heredas un CSS o unas medidas escritas contra el membrete, sus números están
todos mal. Por eso la copia que usa la app se llama `banner-conaf-uia.jpg`.

## Qué hay aquí

| Archivo | Qué es |
| --- | --- |
| `banner3.jpg` | **Original recibido, intacto.** 3032 × 177, 50 055 B. Es la procedencia; no se toca. |
| `implementacion_banner.md` | Prompt reutilizable para integrar un banner institucional en cualquier stack, con el anexo de medidas de este asset. Portable: sirve para otros proyectos tal cual. |
| `derivados/favicon-32.png` | 32 × 32. Isotipo CONAF recortado del banner sobre `#064928`. |
| `derivados/apple-touch-icon-180.png` | 180 × 180, mismo recorte. |
| `verificacion/*.png` + `medidas.json` | **Línea base heredada de COIPO IAM**, no salida de este repo — `captura-app-1366.png` y `captura-app-390.png` muestran el panel IAM (barra lateral azul, Usuarios/Roles/Asignaciones). Se conserva para poder comparar el mismo asset en dos maquetas distintas. |
| `verificacion/coipo_cabania/` | Salida de `node qa/banner-institucional.mjs` **en este repo**: los seis anchos, el caso sin imagen, la marca ampliada ×4 a 390 px, el comprobante impreso y `medidas.json`. |

Las medidas de las dos maquetas **coinciden fila a fila** —mismo alto pintado, mismas
posiciones del filete, misma columna en el borde derecho en los seis anchos—, que es lo que
cabía esperar del mismo asset con la misma opción A y el mismo piso, y sirve de comprobación
cruzada de que la maqueta de aquí no se desvió.

No hay copia del banner en `derivados/`: la que usa la app es `frontend/src/assets/banner-conaf-uia.jpg`
y tiene los mismos bytes que `banner3.jpg` (SHA-256 `2f5d01a9…22f70`). Tres copias del mismo archivo
son 150 KB de lo mismo.

## Dónde vive cada cosa en el proyecto

| Qué | Dónde |
| --- | --- |
| El asset que compila Vite | `frontend/src/assets/banner-conaf-uia.jpg` (importado desde JS: hash de contenido y el `base` del build resuelto solo) |
| El componente | `frontend/src/components/layout/BannerInstitucional.jsx` |
| Dónde sale | En **todas** las rutas, sin condicional: en `App.jsx` cada `<Route>` cuelga de `<Route element={<AppLayout/>}>`. Esta app no tiene login, ni pantalla de error, ni esqueleto de pre-pintado (`index.html` trae un `<div id="root">` vacío), así que las excepciones del §7.3 del prompt no tienen a qué aplicarse |
| El landmark | El banner va **dentro** del `<header>` que ya existía, como primer hijo. Un solo `<header>` en todo el DOM → un solo landmark `banner`, sin degradar nada a `<div>`. Lo comprueba el script de QA contando en el DOM renderizado |
| Los números de la maqueta | `frontend/src/index.css`: `--color-banner` en el bloque `@theme`; `--banner-razon` y `--banner-alto-minimo` en `:root`. **No hay `src/styles/`** — con Tailwind v4 `index.css` *es* la hoja de tokens |
| La decisión de paleta, escrita | comentario de `--color-banner` y de `.banner-institucional` en `frontend/src/index.css`, y el de la cabecera despintada en `AppLayout.jsx` |
| El apilado banner + cabecera | No hace falta receta de app shell: la app usa scroll de documento (`min-h-dvh`) y nada es `sticky`, así que el banner se va al scrollear. **No reintroducir `.app-frame`/`.app-shell`** |
| Los iconos que se publican | `frontend/public/favicon-32.png`, `frontend/public/apple-touch-icon.png`, enlazados en `frontend/index.html` con el marcador de `BASE_URL` de Vite, que el build reemplaza por el `base` del destino. **No con `./`**: con `BrowserRouter`, desde una ruta profunda como `/inmuebles/22` el relativo pediría `/inmuebles/favicon-32.png` y el fallback de SPA devolvería el `index.html` con un 200 |
| Cómo se generan los iconos | **A mano**, con la caja de recorte de la tabla de abajo. No hay script: los PNG entregados ya están aceptados y el asset está congelado, así que un generador solo produciría archivos idénticos. |
| Cómo se verifica | `node qa/banner-institucional.mjs`, a mano, con el servidor en `http://localhost:5199/`. **No hay `npm run verify:banner` ni `frontend/scripts/`**. No corre en CI: el runner del despliegue no trae navegador para `puppeteer-core` |

⚠️ **Dos trampas que este prompt no cubre y costaron una maqueta rota cada una.** Las dos son
silenciosas: el CSS es válido, no hay error en consola, y el banner *parece* funcionar.

1. **Tailwind declara `img { max-width: 100% }` en su preflight.** No gana al `width` del piso
   —no compite con él— pero **recorta el ancho usado**, que es donde el piso vive. El banner
   encogía hasta 23 px de alto a 390 px, o sea justo el fallo que el piso existe para evitar.
   Hace falta `max-width: none` explícito. En cualquier stack con un *reset* moderno, mirar
   esto antes que nada.
2. **Los atributos `width`/`height` del `<img>` no sostienen la banda si la imagen falla.**
   Reservan la caja mientras decodifica (que es para lo que están, y va bien), pero Chrome los
   descarta al fallar la carga y la banda colapsa a la caja del texto alternativo — 16 px en
   vez de 80. El caso «sin imagen» del §8 lo cazó. Se arregla declarando `aspect-ratio`
   también en CSS.

## Medidas, en una tabla

Verificadas píxel a píxel sobre `banner3.jpg`. Si el asset cambia, **hay que volver a medirlas**.

| Dato | Valor |
| --- | --- |
| Tamaño y razón | 3032 × 177, **17,1299:1** |
| Campo izquierdo (bajo la marca) | `#15301d` |
| Campo principal | `#064928` |
| Filete, **sólo en el borde superior** | azul `#0e69b0` en x 67–169, rojo `#eb3d49` en x 170–283, filas y 1–14 |
| Remate decorativo derecho | `#5e8f19` / `#388429`, desde x = 2745 |
| Zona segura para cortar sin costura | 858 ≤ x ≤ 2744 |
| Marca (isotipo + logotipo UIA) | hasta x = 540 (17,8 % izquierdo) |
| Isotipo CONAF: copa | x 105–189, y 51–99 |
| Isotipo CONAF: tronco | x 134–157, y 100–125 |
| Palabra "conaf" | desde x ≈ 155, y 100–135 |
| Recorte del favicon | x 105–190, y 51–127, tapando x 153–190 / y 97–127 con `#064928` |

⚠️ Los valores del filete difieren unas unidades entre este README (`#0e69b0`/`#eb3d49`) y el anexo
de `implementacion_banner.md` (`#0c6bad`/`#f03c47`): es el mismo color leído en píxeles distintos.
Por eso `qa/banner-institucional.mjs` compara con **tolerancia Manhattan 60**, nunca por igualdad.

## Qué mide `node qa/banner-institucional.mjs`

Los seis anchos, con el alto pintado medido por dos vías que deben coincidir
(`getBoundingClientRect` en página y un barrido de la columna `0,75 × W` sobre el PNG capturado):

| viewport | alto pintado | columna del asset en el borde derecho |
| --- | --- | --- |
| 1920 | **112 px** | 3032 (sin recorte) |
| 1366 | **80 px** | 3032 (sin recorte) |
| 1165 | **68 px** | 3032 (justo en el cruce) |
| 1110 | **68 px** | 2889 (peor caso: 144 columnas dentro del remate) |
| 768 | **68 px** | 1999 (zona segura) |
| 390 | **68 px** | 1015 (zona segura) |

Más el filete azul→rojo íntegro y en orden en la fila `y=2` de los seis, el caso sin imagen
(fondo `rgb(6,73,40)`, nunca blanco, y la banda entera), los landmarks (un solo `<header>`) y
los atributos del `<img>`. Lo que el script **no** puede juzgar y hay que mirar:
`banner-390-marca-x4.png` (¿se leen las tres líneas del logotipo UIA?),
`banner-1110.png` (¿es aceptable el corte del remate?) y
`comprobante-impresion.png` (¿sale el membrete y se lee todo en papel?).

El 1110 no está en la matriz del insumo; se añadió aquí porque es el ancho donde el piso corta más
adentro del remate decorativo, y «se ve bien» no es un juicio fiable sobre eso.

Para correrlo hace falta el servidor levantado en el puerto que esperan los scripts de `qa/`:

```
npm run dev -- --port 5199 --strictPort      # o npm run preview, contra el build
node qa/banner-institucional.mjs
```

La pasada contra `preview` es la única que prueba que el bundler emitió el asset al artefacto
desplegable; la de `dev` no lo prueba.

## Si el banner cambia

1. Reemplazar `banner3.jpg` y **volver a medirlo** (§1 de `implementacion_banner.md`).
2. Copiarlo a `frontend/src/assets/banner-conaf-uia.jpg`.
3. Actualizar `--banner-razon` y `--banner-alto-minimo` en `frontend/src/index.css`, y las
   constantes `RAZON` / `ALTO_MIN` / `FILETE_*` / `ZONA_SEGURA` de
   `frontend/qa/banner-institucional.mjs`.
4. Regenerar los dos PNG de `derivados/` con la caja de recorte de la tabla de arriba (sharp o
   Pillow; hay que tapar la palabra «conaf» con `#064928` **antes** de reducir, no después) y
   copiarlos a `frontend/public/`.
5. `npm run build`, levantar `npm run preview -- --port 5199 --strictPort`, correr
   `node qa/banner-institucional.mjs`, **mirar** `banner-390-marca-x4.png`, y dejar las capturas
   nuevas en `verificacion/coipo_cabania/`.
