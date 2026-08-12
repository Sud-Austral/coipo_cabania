# Build context: la RAÍZ del repo (ver docker-compose.yml), no frontend/.
# Patrón CONAF (INSUMO/DOCKER.md): build de React y nginx sirviendo el
# resultado. A diferencia del resto de las apps, acá no hay ningún proxy hacia un
# backend porque todavía no existe: esto es una maqueta estática (fase 1), todo el
# estado vive en el localStorage del navegador.

# node:22 y no el node:20 del resto del ecosistema: Vite 8 declara
# engines ^20.19.0 || >=22.12.0 y con node:20-slim el build falla al arrancar.
FROM node:22-slim AS build-frontend
WORKDIR /build

# npm ci y no npm install, para respetar package-lock.json: el build del servidor
# debe instalar exactamente las mismas versiones que el local. Sin
# --legacy-peer-deps, que este proyecto no necesita.
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/index.html frontend/vite.config.js ./
COPY frontend/public ./public
COPY frontend/src ./src

# El base va como argumento del build y no fijo en vite.config.js: es el patrón
# del resto de las apps del ecosistema (INSUMO/DOCKER.md) y permite servir la
# aplicación bajo un subpath sin tocar código. Hoy siempre vale "/".
ARG BASE_PATH=/
RUN npm run build -- --base=${BASE_PATH}


FROM nginx:1.27-alpine
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build-frontend /build/dist /usr/share/nginx/html

EXPOSE 8000
