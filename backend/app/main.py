"""Punto de entrada de la aplicación.

LA FIRMA LA EXIGE LA SEMILLA, y `tests/conftest.py` falla nombrándola si cambia:

    crear_app(arrancar: bool = True, contenedor=None) -> FastAPI

`arrancar=False` existe para montar la aplicación SIN correr el lifespan. No es
una comodidad: es lo que permite que los tests de contrato y de arquitectura
corran en la Puerta 3, cuando todavía no hay ninguna base de datos levantada. Un
proyecto donde montar la app exige Postgres es un proyecto donde esos tests se
saltan, y un test saltado tiene el mismo color que uno que pasa.

POR QUÉ EL LIFESPAN NO ABORTA POR DATOS
=======================================
El reusable de despliegue hace `rsync --delete` y después `up -d`, **sin
rollback**: cuando el contenedor arranca, el árbol anterior ya no existe. Si el
arranque abortara porque un catálogo está vacío, el resultado no sería "un
despliegue detenido" sino la aplicación caída sin nada a lo que volver, y el
smoke test recibiría connection-refused, que no se puede diagnosticar.

Por eso el reparto es:

    esquema no aplicado  -> `/health` responde 503. Es infraestructura del
                            propio proceso: sin esquema no hay nada que servir.
    datos incompletos    -> `/health` sigue en 200 y lo reporta
                            `/health/detalle`. Build rojo, sitio arriba.

`/health` y `/auth/callback` son las DOS únicas rutas fuera del prefijo
`/api/v1`, y las dos por la misma razón: son contratos externos con algo que
tiene la ruta cableada. El `curl -sf` del reusable apunta a `/health` a secas, y
el IAM compara la `redirect_uri` por igualdad exacta de cadena.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI

from app.adaptadores.entrada.http.rutas import salud
from app.composicion.ajustes import ajustes as ajustes_por_defecto
from app.composicion.contenedor import construir

registro = logging.getLogger(__name__)

PREFIJO_API = "/api/v1"


def crear_app(arrancar: bool = True, contenedor: Any | None = None) -> FastAPI:
    contenedor = contenedor or construir(ajustes_por_defecto)

    @asynccontextmanager
    async def ciclo_de_vida(_: FastAPI):
        if arrancar:
            _avisar_de_la_configuracion(contenedor)
            _preparar_esquema(contenedor)
        yield

    aplicacion = FastAPI(
        title=salud.APP_NOMBRE,
        version=contenedor.ajustes.version,
        lifespan=ciclo_de_vida,
        # La documentación interactiva queda fuera en producción: publica el
        # mapa completo de la API —incluidos los endpoints administrativos— a
        # cualquiera que llegue al puerto.
        docs_url=None if contenedor.ajustes.es_produccion else "/docs",
        redoc_url=None,
        openapi_url=None if contenedor.ajustes.es_produccion else "/openapi.json",
    )
    aplicacion.state.contenedor = contenedor

    # Sin prefijo. Ver el docstring del módulo.
    aplicacion.include_router(salud.router)

    # Aquí van los routers de la aplicación, todos bajo PREFIJO_API:
    #   aplicacion.include_router(tramites.router, prefix=PREFIJO_API)

    return aplicacion


def _preparar_esquema(contenedor: Any) -> None:
    """Aplica el esquema y marca el resultado en los ajustes.

    NO usa `create_all()`, y no es purismo: `create_all()` construye el esquema
    a partir de los modelos ORM, que no declaran los `CHECK` ni las
    restricciones que sí están en el SQL de producción. Una suite que corre
    contra un esquema creado así prueba una base que no existe en ninguna parte.
    El esquema real lo aplica el runner de migraciones contra el mismo SQL que
    se despliega.

    `esquema_aplicado` sólo es True si el runner terminó. Un `True` por defecto
    sería el error de siempre —cero comprobaciones leídas como conformidad—, así
    que cualquier fallo deja `/health` en 503 diciendo exactamente eso, con el
    motivo en el log y sin tumbar el proceso.
    """
    try:
        aplicado = _aplicar_migraciones(contenedor)
    except Exception:  # noqa: BLE001 — se reporta y se sigue, ver el docstring
        registro.exception(
            "no se pudo aplicar el esquema: /health responderá 503 hasta que se resuelva"
        )
        aplicado = False

    contenedor.ajustes.esquema_aplicado = aplicado


def _avisar_de_la_configuracion(contenedor: Any) -> None:
    """Deja en el log lo que se leyó mal, sin abortar y sin imprimir un valor.

    Hasta el 2026-09-15 `ajustes.cargar()` se tragaba la `ConfiguracionInvalida` y
    devolvía unos ajustes vacíos en silencio, mientras su propio docstring decía
    que «el aborto de verdad ocurre en el lifespan de `app.main`» — y aquí no se
    comprobaba nada. Una aplicación con el `.env` incompleto arrancaba muda y el
    primer síntoma llegaba desde el driver de Postgres, sin nombrar la variable.
    """
    ajustes = contenedor.ajustes
    if ajustes.configuracion_invalida:
        registro.error("configuración incompleta: %s", ajustes.configuracion_invalida)
    for advertencia in ajustes.advertencias:
        registro.warning("configuración: %s", advertencia)


def _aplicar_migraciones(contenedor: Any) -> bool:
    """Devuelve True cuando el esquema quedó aplicado en esta base.

    Aplica `db/*.sql` con el motor de `adaptadores/salida/postgres/migraciones.py`,
    que es donde `db/0000_plataforma.sql` dice que vive el ledger. Una aplicación
    que necesite otra cosa —migraciones por partes, un `alembic` heredado— cambia
    ESTA función: el archivo está en el ESQUELETO, no congelado.

    Si la configuración está incompleta no se intenta: no hay a qué conectarse, y
    un `OperationalError` con el host vacío no dice lo que pasa.
    """
    from app.adaptadores.salida.postgres import migraciones  # noqa: PLC0415

    ajustes = contenedor.ajustes
    if ajustes.configuracion_invalida:
        return False

    aplicados = migraciones.aplicar(ajustes.dsn, salud.APP_NOMBRE)
    if aplicados:
        registro.info("esquema: %d migración(es) aplicada(s): %s",
                      len(aplicados), ", ".join(aplicados))
    return True


# `uvicorn app.main:app` — la forma que usa el Dockerfile.
app = crear_app()
