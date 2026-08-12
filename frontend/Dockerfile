# Build context: la RAÍZ del repo (ver docker-compose.yml), no frontend/.
# Patrón CONAF (INSUMO/DOCKER.md): build de React y nginx sirviendo el
# resultado. A diferencia del resto de las apps, acá no hay ningún proxy hacia un
# backend porque todavía no existe: esto es una maqueta estática (fase 1), todo el
# estado vive en el localStorage del navegador.

# node:22 y no el node:20 del resto del ecosistema: Vite 8 declara
# engines ^20.19.0 || >=22.12.0, y .github/workflows/pages.yml ya construye con
# Node 22. Usar el mismo mayor en los dos destinos evita que el sitio del servidor
# y el de Pages salgan de toolchains distintos sin que nadie lo note.
FROM node:22-slim AS build-frontend
WORKDIR /build

# npm ci y no npm install, para respetar package-lock.json: el build del servidor
# debe instalar exactamente las mismas versiones que el local. Sin
# --legacy-peer-deps: este proyecto no lo necesita, y pages.yml ya corre npm ci
# limpio. Si algún día hiciera falta, hay que agregarlo TAMBIÉN allá o los dos
# sitios dejarían de ser el mismo build.
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/index.html frontend/vite.config.js ./
COPY frontend/public ./public
COPY frontend/src ./src

# En el servidor la app se sirve en la raíz del dominio; en GitHub Pages, bajo el
# subpath del repo. Por eso el base es un argumento del build y no un valor fijo
# en vite.config.js.
ARG BASE_PATH=/
RUN npm run build -- --base=${BASE_PATH}


FROM nginx:1.27-alpine
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build-frontend /build/dist /usr/share/nginx/html

EXPOSE 8000
