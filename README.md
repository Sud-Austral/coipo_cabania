
# coipo_cabania — Sistema de Reservas Bienestar CONAF

Maqueta del sistema de reservas de la **Red de Casas de Huéspedes y Veraneo** del Servicio de
Bienestar de CONAF (34 inmuebles entre Antofagasta y Magallanes).

Es **solo frontend** (React 19 + Vite, en `frontend/`): no hay backend ni base de datos, los
datos son ficticios y el estado de la demostración vive en el `localStorage` del navegador
(`frontend/src/api/store.js`). El backend FastAPI + PostgreSQL es la fase 2; `backend/` y `db/`
están vacíos a la espera de eso.


El alcance y las decisiones de esta fase están en [docs/ALCANCE.md](docs/ALCANCE.md); los
requisitos originales, en [INSUMO/](INSUMO/); la guía para incorporarse al proyecto, en
[docs/GUIA_INDUCCION.md](docs/GUIA_INDUCCION.md).

## Dónde está publicada

**https://reserva-bienestar.conaf.cl** — servidor CONAF, red interna, puerto 8114. La despliega
[.github/workflows/deploy-prod.yml](.github/workflows/deploy-prod.yml) en cada push a `main`.

El sitio muestra una franja permanente advirtiendo que es una maqueta sin valor operativo
([AvisoDemostracion.jsx](frontend/src/components/layout/AvisoDemostracion.jsx)).

> La maqueta se publicaba además en GitHub Pages. Esa publicación se retiró al desplegar en el
> servidor: Pages gratuito exige que el repositorio sea **público**, y el pipeline institucional
> exige que sea **privado** — su workflow reusable vive en un repositorio privado, que un repo
> público no puede invocar. Para mostrar la maqueta fuera de la red interna, `npm run dev` en el
> propio equipo.

## Desarrollo

```bash
cd frontend
npm ci
npm run dev          # http://localhost:5173/
npm run lint
npm run build
```

Todos los `npm` se ejecutan **dentro de `frontend/`**: el `package.json` de la raíz es solo el
CLI de Claude Code instalado localmente y está gitignoreado.

## QA

`frontend/qa/` son cuatro scripts de Puppeteer que se corren **a mano** contra un servidor ya
levantado (`npm run preview -- --port 5199 --strictPort`). No corren en CI: el runner no trae
navegador para `puppeteer-core`.

```bash
node qa/todos-los-perfiles.mjs      # las 15 vistas de los 5 perfiles
node qa/flujo-afiliado.mjs          # el flujo crítico de reserva
node qa/revision-movil.mjs          # desbordes horizontales a 375 px
node qa/banner-institucional.mjs    # geometría del banner CONAF · UIA
```

Se pueden apuntar a cualquier despliegue con `BASE=https://... node qa/...`.

## Despliegue

[INSUMO/](INSUMO/) documenta el pipeline institucional (guías 6 y 8, Docker y conexión a Postgres). Lo mínimo que hay que saber:

- La carpeta del servidor es `/opt/apps/coipo_cabania/`, derivada del nombre del repo. El `.env`
  real vive solo ahí y **no** lo crea el pipeline: si falta, el deploy falla en su primer paso.
  La plantilla es [.env.example](.env.example).
- [deploy/nginx-reserva-bienestar.conaf.cl.conf](deploy/nginx-reserva-bienestar.conaf.cl.conf) es la
  copia de referencia del vhost del servidor; instalarlo o editarlo es un paso manual.
- El pipeline valida el despliegue con un único `curl` a `/health`, cinco segundos después de
  levantar y sin reintentos. Lo responde el nginx del contenedor
  ([frontend/nginx.conf](frontend/nginx.conf)), no un backend.
