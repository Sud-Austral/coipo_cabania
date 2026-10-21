# Backend — ARCHIVO CONGELADO DE LA SEMILLA.
#
# CONTEXTO DE BUILD: LA RAÍZ DEL REPOSITORIO, nunca `backend/`.
#
# Es la regla R4 del sobre de despliegue, y no es preferencia: este Dockerfile
# necesita copiar `db/` —el esquema, que es la única fuente de verdad y la
# comparten el backend y cualquier collector— al mismo layout relativo que se
# usa fuera de Docker. Con el contexto en la raíz, cualquier Dockerfile puede
# `COPY` desde cualquier ruta relativa a la raíz.
#
# CONTRAPARTIDA, Y ES LA RAZÓN DE QUE `.dockerignore` SEA OBLIGATORIO:
# el contexto pasa a ser el repositorio ENTERO. `COIPO_ENTREGA_PLANTA` construye
# sus tres imágenes con `context: .` y no tiene `.dockerignore`: el `.git`, los
# `INSUMO_*` y un MP4 de 21 MB viajan al daemon en cada build de cada imagen — y
# con ellos cualquier `.env` que esté en el disco del servidor.

FROM python:3.14-slim

# Sin dependencias de sistema: `psycopg[binary]` trae su propio libpq
# precompilado y no necesita gcc ni libpq-dev.

WORKDIR /app

# LOS DOS archivos: `requirements.txt` es de la aplicacion (ESQUELETO) y arranca
# con `-r requirements-base.txt`, que es el CONGELADO con los techos `<N.0` de la
# flota. pip resuelve el `-r` relativo al archivo que lo contiene, y aqui los dos
# quedan en /app. Hasta el 2026-09-09 solo existia el congelado: la primera
# dependencia de negocio obligaba a editarlo, y eso es un SEM-1 que solo se cierra
# suprimiendo el juez.
COPY backend/requirements.txt backend/requirements-base.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# El esquema, al mismo path relativo que fuera de Docker.
COPY db/ ./db/

COPY backend/ ./backend/

# La identidad del build. Sin `commit` en `/health` es imposible saber si el
# contenedor se reconstruyó o quedó vivo el anterior, que desde fuera son
# indistinguibles. Los inyecta el workflow con `--build-arg`.
ARG APP_VERSION=0.0.0
ARG APP_COMMIT=desconocido
ARG APP_CONSTRUIDO_EN=desconocido
ENV APP_VERSION=${APP_VERSION} \
    APP_COMMIT=${APP_COMMIT} \
    APP_CONSTRUIDO_EN=${APP_CONSTRUIDO_EN} \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Desde `backend/` para que `app.main:app` resuelva igual que en desarrollo.
WORKDIR /app/backend

# No se corre como root. Un contenedor comprometido con uid 0 puede escribir en
# cualquier bind-mount que le llegue del host, y este runner despliega todas las
# aplicaciones de la VM sobre su propio disco.
RUN useradd --create-home --uid 10001 coipo && chown -R coipo:coipo /app
USER coipo

EXPOSE 8000

# SIN `--forwarded-allow-ips=*`.
#
# Con esa opción uvicorn toma la PRIMERA entrada de `X-Forwarded-For`, que es la
# que pone el cliente. Una IP forjada acaba escrita en el registro de auditoría
# —que es inmutable por diseño— incriminando a un tercero, y ahí ya no se puede
# corregir. El proxy de confianza se resuelve en el middleware, contando desde
# la derecha.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
