# El contenedor `app` — ARCHIVO CONGELADO DE LA SEMILLA.
#
# Es el ÚNICO servicio que publica puerto. Compila la SPA y la sirve con nginx,
# que además proxea al backend por la red interna de Docker (ver nginx.conf, que
# explica por qué el upstream va en una variable y no escrito a pelo).
#
# CONTEXTO DE BUILD: LA RAÍZ DEL REPOSITORIO (regla R4), aunque esta imagen sólo
# necesite `frontend/`. Se mantiene igual que el backend a propósito: con dos
# contextos distintos, el `.dockerignore` de la raíz deja de aplicar a uno de los
# dos builds y nadie se entera hasta que algo se cuela en una capa.

FROM node:26-slim AS build
WORKDIR /app/frontend

# El manifiesto primero, y sólo el manifiesto: mientras las dependencias no
# cambien, esta capa se reutiliza y el build no vuelve a bajar node_modules.
# El lock SIN `*` y `npm ci` SIN `|| npm install`: el lock esta versionado en la
# semilla desde el 2026-09-09. Con el `*` y el `||`, una imagen de produccion se
# construia resolviendo los rangos `^` de nuevo en cada `docker compose build
# --pull` de cada push -- exactamente lo que requirements-base.txt prohibe para
# Python, en el otro lenguaje del mismo proyecto.
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY frontend/ ./

# La identidad del build viaja también al frontend: la pantalla de error puede
# decir qué versión está sirviendo, y eso ahorra la mitad de un diagnóstico.
ARG APP_VERSION=0.0.0
ARG APP_COMMIT=desconocido
ENV VITE_APP_VERSION=${APP_VERSION} \
    VITE_APP_COMMIT=${APP_COMMIT}

RUN npm run build


# ── Servicio ─────────────────────────────────────────────────────────────────
# La misma imagen que corre `coipo_n8n` desde 2026-08 con 128m y sin un solo
# OOM: es de donde sale el `mem_limit` del compose, medido y no inventado.
FROM nginx:1.27-alpine

# La configuración congelada. `default.conf` es el nombre que el `nginx.conf` de
# la imagen incluye desde `conf.d/`.
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
RUN rm -f /usr/share/nginx/html/index.html

COPY --from=build /app/frontend/dist /usr/share/nginx/html

# El healthcheck del compose usa `wget`, que busybox SÍ trae. `curl` NO está
# garantizado en las imágenes alpine, y esa trampa ya se pagó una vez con MinIO
# en `coipo_archivo`: el healthcheck fallaba siempre y el contenedor quedaba
# unhealthy con el servicio funcionando.

EXPOSE 8000
