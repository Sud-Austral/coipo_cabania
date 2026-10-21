"""`/health` y `/health/detalle` — ARCHIVO CONGELADO DE LA SEMILLA.

Su contrato completo está en `tests/contrato/test_health.py`, que lo verifica
leyendo ESTE archivo con `ast` antes de que la aplicación arranque siquiera. Si
vas a cambiar algo aquí, lee ese test primero: cada regla de abajo cierra un
fallo que ya ocurrió en esta flota.

LAS CUATRO REGLAS
=================
 1. SIN AUTENTICACIÓN. Esto lo consulta el `healthcheck` del compose y el
    `curl -sf` del reusable de despliegue. Si pidiera sesión, el contenedor no
    estaría `healthy` nunca.

 2. SIN 3xx. `curl -sf` NO sigue redirecciones: un 307 aquí es un smoke test
    rojo con la aplicación perfectamente sana, que es el peor tipo de fallo
    porque nadie va a mirar el código correcto.

 3. EL 503 SOLO PUEDE VENIR DEL ESQUEMA. Un fallo de DATOS no cambia el código
    de estado: vive en `/health/detalle`, que ninguna sonda consulta.

    Con una base recién creada el catálogo está vacío POR DEFINICIÓN. Un 503 por
    datos dejaría el contenedor `app` sin arrancar nunca y el smoke test
    recibiría connection-refused, que no se puede diagnosticar. Dos repositorios
    de esta flota llegaron a esta misma conclusión por separado y la dejaron
    escrita: `COIPO_ENTREGA_PLANTA/backend/app/routers/health.py:36-40` y
    `coipo_prensa2/backend/app/routers/salud.py`.

    El mecanismo entero es ese: **build rojo, sitio arriba.**

 4. `app`, `version`, `commit` y `construido_en` VAN EN EL CUERPO.
    Sin `app` no se puede detectar una colisión de `APP_PORT`: el `curl` daría
    verde contra el `/health` de OTRA aplicación y el despliegue se declararía
    exitoso sobre el contenedor equivocado. Sin `commit` no se puede saber si el
    contenedor se reconstruyó o quedó vivo el anterior.

POR QUÉ `APP_NOMBRE` ES UN LITERAL Y NO VIENE DEL ENTORNO
=========================================================
Si viniera del entorno, la comprobación de identidad de el smoke test del despliegue
compararía el `.env` del servidor consigo mismo y no probaría absolutamente
nada. El nombre se versiona; la versión, el commit y la fecha de construcción
las inyecta el build y llegan por el módulo de ajustes, nunca por `os.environ`
dentro de un router.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Response

from app.composicion.ajustes import ajustes

# ── Lo único que esta aplicación tiene que cambiar de este archivo ────────────
# Literal versionado. el smoke test del despliegue lo compara contra el nombre de la
# aplicación que dice estar desplegando.
APP_NOMBRE = "coipo_cabania"

router = APIRouter(tags=["salud"])


def _esquema_aplicado() -> bool:
    """¿Se aplicó el esquema de la base a este proceso?

    Es lo ÚNICO que puede producir un 503 en `/health`: no es un problema de
    datos, es que la infraestructura del propio proceso no está montada, y en
    ese estado la aplicación no puede responder nada útil a nadie.

    Lo fija el lifespan de `app.main` tras correr el runner de migraciones. Que
    sea una función y no una lectura directa del atributo es para que el `if` de
    abajo se lea, y para que el test de contrato lo reconozca como la condición
    del esquema.
    """
    return bool(getattr(ajustes, "esquema_aplicado", False))


def _identidad() -> dict[str, Any]:
    """Las cuatro claves que hacen diagnosticable un despliegue."""
    return {
        "app": APP_NOMBRE,
        "version": ajustes.version,
        "commit": ajustes.commit,
        "construido_en": ajustes.construido_en,
    }


@router.get("/health")
def salud(respuesta: Response) -> dict[str, Any]:
    """Lo que consulta el `healthcheck` del compose y el `curl -sf` del runner.

    Devuelve 200 SIEMPRE, salvo que el esquema no se haya aplicado. Cualquier
    otro problema —catálogo vacío, colecta atrasada, una integración caída— se
    reporta en el cuerpo y en `/health/detalle`, y NO cambia el código.
    """
    cuerpo = {"status": "ok", **_identidad()}

    if not _esquema_aplicado():
        # Único 503 permitido en este handler, y el test de contrato lo verifica
        # leyendo el AST: comprueba que todo 503 de `/health` esté dentro de un
        # `if` cuya condición hable del esquema del proceso.
        respuesta.status_code = 503
        cuerpo["status"] = "esquema_no_aplicado"

    return cuerpo


@router.get("/health/detalle")
def salud_detalle(respuesta: Response) -> dict[str, Any]:
    """Donde SÍ vive el 503 por datos. Ninguna sonda lo consulta.

    Lo lee el smoke test del despliegue después del despliegue, y por eso puede
    ponerse en 503 sin tumbar el sitio: pone ROJO el resultado del despliegue y
    deja la aplicación ARRIBA, sirviendo lo que pueda servir.

    Si este endpoint no existiera, el fallo de datos no tendría dónde
    manifestarse y volvería a `/health`, que es justo de donde se lo sacó.
    """
    comprobaciones = _comprobaciones()
    fallidas = [c for c, ok in comprobaciones.items() if not ok]

    # Ojo con el orden: `comprobaciones` puede estar VACÍO si nadie registró
    # ninguna. Cero de cero NO es "todo bien" — es "no se comprobó nada", y se
    # dice así. Es el incidente de COIPO_PDF_EXCEL, donde una pantalla que
    # contaba totales fallidos daba "todos los totales cuadran" con cero
    # comparaciones hechas.
    if not comprobaciones:
        estado = "sin_evaluar"
    elif fallidas:
        estado = "degradado"
    else:
        estado = "ok"

    if estado != "ok":
        respuesta.status_code = 503

    return {
        "status": estado,
        **_identidad(),
        "comprobaciones": comprobaciones,
        "fallidas": fallidas,
    }


def _comprobaciones() -> dict[str, bool]:
    """Las comprobaciones de DATOS de esta aplicación.

    La semilla la deja vacía a propósito: cada aplicación registra aquí lo que
    para ella significa "los datos están bien" —el catálogo sembrado, la última
    colecta dentro de plazo, la tabla de referencia con filas—. Mientras esté
    vacía, `/health/detalle` responde `sin_evaluar` y 503, que es lo correcto:
    una aplicación que no declara qué comprobar no puede afirmar que está sana.
    """
    return {}
