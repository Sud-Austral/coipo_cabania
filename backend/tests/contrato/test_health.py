"""/health — ARCHIVO CONGELADO DE LA SEMILLA.

Su sha256 esta en semilla.lock. La aplicacion generada no lo edita.

EL FALLO QUE MOTIVA CADA REGLA
==============================
Este endpoint ya se diseno mal una vez en esta flota y se corrigio en dos repos
por separado, con el mismo razonamiento escrito dos veces:

  COIPO_ENTREGA_PLANTA/backend/app/routers/health.py:36-40
    "El catalogo vacio se REPORTA pero NO cambia el codigo de estado... Un 503
     aca dejaria el sitio entero sin arrancar por un problema de datos — peor
     que el problema que se quiere senalar."

  coipo_prensa2/backend/app/routers/salud.py
    "Deliberadamente se responde 200 y no 503: un 503 dejaria el contenedor
     unhealthy y, por el depends_on de docker-compose, `app` no arrancaria — un
     502 mudo en vez de una pantalla que dice que falta."

Con una base recien creada el catalogo esta vacio POR DEFINICION, asi que un 503
por datos deja el contenedor `app` sin arrancar nunca y el smoke test del
reusable recibe connection-refused, no un 503: no hay nada que diagnosticar.

LAS CUATRO REGLAS
=================
 1. Sin autenticacion. `/health` es lo que consulta el healthcheck de compose y
    el `curl -sf` del runner: si pidiera sesion, el contenedor nunca estaria
    healthy.
 2. Sin 3xx. `curl -sf` NO sigue redirecciones: un 307 es un fallo del smoke
    test con la aplicacion perfectamente sana.
 3. 503 SOLO si el esquema no se aplico — infraestructura del propio proceso.
    Un fallo de DATOS no cambia el codigo de estado: vive en /health/detalle,
    que ninguna sonda usa y que lee el smoke test del despliegue. Build rojo, sitio
    arriba.
 4. `app`, `version`, `commit` y `construido_en` en el cuerpo. Sin `app` no se
    puede detectar una colision de APP_PORT (el `curl` daria verde contra el
    /health de OTRA aplicacion); sin `commit` no se puede saber si el contenedor
    se reconstruyo o quedo vivo el de antes.

APP_NOMBRE ES UN LITERAL VERSIONADO Y NO VIENE DEL ENTORNO: si viniera del
entorno, la comprobacion de identidad de el smoke test del despliegue compararia el .env del
servidor consigo mismo y no probaria nada.
"""

from __future__ import annotations

import ast
import re

import pytest

from tests.conftest import (
    RAIZ_BACKEND, RAIZ_REPO, arbol_python, cargar_yaml, constante_de_modulo,
    exigir, leer, rutas_declaradas, texto_de,
)

MODULO_SALUD = RAIZ_BACKEND / "app" / "adaptadores" / "entrada" / "http" / "rutas" / "salud.py"
QUE_ES = "el router de /health y /health/detalle (arbol canonico, seccion 4.1)"

CLAVES_OBLIGATORIAS = ("status", "app", "version", "commit", "construido_en")

# Palabras que, en la condicion de un `if`, significan "el esquema del propio
# proceso". Es lo unico que puede producir un 503 en /health.
SENALES_DE_ESQUEMA = ("esquema", "schema", "migracion", "bootstrap", "arranque")


def _arbol():
    return arbol_python(MODULO_SALUD, que_es=QUE_ES)


def _handler_de(camino: str):
    arbol = _arbol()
    rutas = rutas_declaradas(arbol, MODULO_SALUD)
    for ruta in rutas:
        if ruta.metodo == "get" and ruta.camino.rstrip("/") == camino:
            return arbol, ruta
    exigir(
        False,
        f"{MODULO_SALUD.name} no declara GET {camino}.\n"
        f"  Declaradas: {[r.clave for r in rutas] or 'ninguna'}\n"
        f"  /health lo consulta el healthcheck de compose y el runner; /health/detalle\n"
        f"  es donde vive el 503 por datos, que pone rojo el build sin bajar el sitio.",
    )
    raise AssertionError  # pragma: no cover — exigir() ya corto


# ══════════════════════════════════════════════════════════════════════════════
# Mitad estatica — corre en la PUERTA 3, cuando el proyecto todavia no arranca
# ══════════════════════════════════════════════════════════════════════════════


@pytest.mark.contrato
@pytest.mark.invariante
@pytest.mark.nucleo
@pytest.mark.t0
def test_health_esta_declarado_fuera_de_api_v1() -> None:
    """D-03: `/health` es una de las DOS excepciones cerradas al prefijo /api/v1.

    La otra es `/auth/callback`. Las dos son contratos externos: el healthcheck y
    el `curl -sf` del reusable apuntan a `/health` a secas, y el IAM compara la
    redirect_uri por igualdad exacta de string.
    """
    _arbol_, ruta = _handler_de("/health")
    assert ruta.camino in ("/health", "/health/")
    _arbol2, detalle = _handler_de("/health/detalle")
    assert detalle.camino.startswith("/health/detalle")


@pytest.mark.contrato
@pytest.mark.invariante
@pytest.mark.nucleo
@pytest.mark.t0
def test_app_nombre_es_un_literal_versionado() -> None:
    arbol = _arbol()
    valor = constante_de_modulo(arbol, "APP_NOMBRE")
    exigir(
        isinstance(valor, str) and valor.strip(),
        f"{MODULO_SALUD.name} no define APP_NOMBRE como un literal de texto (vale {valor!r}).\n"
        f"  Es lo que compara el smoke test del despliegue contra el nombre de la app: si\n"
        f"  APP_PORT colisiona, el `curl` del reusable da VERDE contra el /health de otra\n"
        f"  aplicacion y el despliegue se declara exitoso sobre el contenedor equivocado.",
    )

    # Si viniera del entorno, el smoke test del despliegue compararia el .env del servidor
    # consigo mismo. La comprobacion de identidad no probaria nada.
    fuentes_de_entorno = [
        f"linea {n.lineno}: {ast.unparse(n)}"
        for n in ast.walk(arbol)
        if isinstance(n, ast.Attribute) and n.attr == "environ"
        or isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute) and n.func.attr == "getenv"
    ]
    exigir(
        not fuentes_de_entorno,
        f"{MODULO_SALUD.name} lee el entorno:\n"
        + "".join(f"    {f}\n" for f in fuentes_de_entorno)
        + "  APP_NOMBRE es un literal versionado. Del entorno vienen version, commit y\n"
        "  construido_en, que los inyecta el build — y esos llegan por el modulo de\n"
        "  ajustes, no por os.environ dentro de un router.",
    )


@pytest.mark.contrato
@pytest.mark.invariante
@pytest.mark.nucleo
@pytest.mark.t0
def test_el_503_de_health_solo_puede_venir_del_esquema() -> None:
    """Un fallo de DATOS no cambia el codigo de estado de /health."""
    _arbol_, ruta = _handler_de("/health")

    # Rangos de linea de los `if` cuya condicion habla del esquema del proceso.
    protegidos: list[tuple[int, int]] = []
    for nodo in ast.walk(ruta.nodo):
        if isinstance(nodo, ast.If):
            condicion = texto_de(nodo.test).lower()
            if any(s in condicion for s in SENALES_DE_ESQUEMA):
                protegidos.append((nodo.lineno, nodo.end_lineno or nodo.lineno))

    sueltos = [
        n.lineno
        for n in ast.walk(ruta.nodo)
        if isinstance(n, ast.Constant) and n.value == 503
        and not any(ini <= n.lineno <= fin for ini, fin in protegidos)
    ]
    exigir(
        not sueltos,
        f"{MODULO_SALUD.name}: hay un 503 en /health fuera de la condicion del esquema "
        f"(lineas {sueltos}).\n"
        f"  El servicio `app` cuelga de este healthcheck. Un 503 por datos deja el sitio\n"
        f"  entero sin arrancar por un problema de datos — peor que el problema que se\n"
        f"  quiere senalar (health.py:36-40 de COIPO_ENTREGA_PLANTA, y salud.py de\n"
        f"  coipo_prensa2 llega a la misma conclusion por su cuenta).\n"
        f"  Con la base recien creada el catalogo esta vacio POR DEFINICION: el\n"
        f"  contenedor `app` no arrancaria NUNCA y el smoke test recibiria\n"
        f"  connection-refused, que no se puede diagnosticar.\n"
        f"  El 503 por datos vive en /health/detalle.",
    )


@pytest.mark.contrato
@pytest.mark.invariante
@pytest.mark.t0
def test_health_no_redirige() -> None:
    arbol = _arbol()
    redirecciones = [
        f"linea {n.lineno}: {ast.unparse(n)}"
        for n in ast.walk(arbol)
        if isinstance(n, ast.Name) and n.id == "RedirectResponse"
    ]
    exigir(
        not redirecciones,
        f"{MODULO_SALUD.name} construye una redireccion:\n"
        + "".join(f"    {r}\n" for r in redirecciones)
        + "  `curl -sf` NO sigue 3xx. Una redireccion aqui es un smoke test rojo con la\n"
        "  aplicacion sana, que es el peor tipo de fallo: nadie mira el codigo correcto.",
    )


# `(?<!/)` y no `(?<![\w/])`: lo que se rechaza es una barra DOBLE, no un caracter de
# palabra antes de la barra. La version anterior exigia que `/health` no fuera
# precedido de un caracter de palabra, y `http://127.0.0.1:8000/health` -- el
# healthcheck que escribe el propio ESQUELETO/docker-compose.yml -- va precedido de
# un `0`: el test SELLADO ponia rojo el t0 de toda aplicacion sembrada por una URL
# correcta, y la aplicacion no podia arreglarlo porque el archivo esta en el lock.
# Medido y corregido el 2026-09-09. `/healthz` lo sigue rechazando el `(?![\w])`.
RUTA_SALUD = re.compile(r"(?<!/)/health(?![\w])")


@pytest.mark.contrato
@pytest.mark.guardia
@pytest.mark.nucleo
@pytest.mark.t0
def test_el_detector_de_ruta_de_salud_detecta() -> None:
    """Una prueba que nunca falla no prueba nada, y esta fallaba al reves.

    El detector vive aqui y decide el color del t0 de 24 aplicaciones: sus casos
    limite se fijan, no se suponen.
    """
    for texto in (
        "curl -sf http://127.0.0.1:8000/health",          # el del ESQUELETO
        "wget -q -O- http://localhost:8000/health",
        "python -c \"urlopen('http://app:8000/health', timeout=3)\"",
        "/health",
    ):
        assert RUTA_SALUD.search(texto), texto
    for texto in (
        "curl -sf http://127.0.0.1:8000/healthz",         # otra ruta
        "curl -sf http://127.0.0.1:8000//health",         # barra doble
        "curl -sf http://127.0.0.1:8000/saludo",
    ):
        assert not RUTA_SALUD.search(texto), texto


@pytest.mark.contrato
@pytest.mark.invariante
@pytest.mark.t0
def test_el_healthcheck_del_compose_apunta_a_la_misma_ruta() -> None:
    """El compose y el router tienen que hablar de la MISMA ruta.

    Es trivial y es exactamente el tipo de cosa que se rompe al anadir el prefijo
    /api/v1: el router pasa a servir /api/v1/health, el healthcheck sigue
    apuntando a /health, el contenedor queda unhealthy para siempre y `app` no
    arranca.
    """
    compose = cargar_yaml(RAIZ_REPO / "docker-compose.yml",
                          que_es="el compose de la aplicacion")
    servicios = compose.get("services") or {}
    exigir(servicios, "docker-compose.yml no declara `services`")

    pruebas: list[tuple[str, str]] = []
    for nombre, servicio in servicios.items():
        if not isinstance(servicio, dict):
            continue
        chequeo = (servicio.get("healthcheck") or {}).get("test")
        if chequeo:
            texto = " ".join(chequeo) if isinstance(chequeo, list) else str(chequeo)
            if "health" in texto:
                pruebas.append((nombre, texto))

    exigir(
        pruebas,
        "ningun servicio del compose tiene un healthcheck que consulte /health.\n"
        "  Sin healthcheck, `docker compose ps` dice 'running' de un proceso que no\n"
        "  responde, que es como coipo_cabania lleva 8 dias unhealthy sin que nadie se\n"
        "  entere.",
    )
    for nombre, texto in pruebas:
        exigir(
            RUTA_SALUD.search(texto) is not None,
            f"el healthcheck de `{nombre}` consulta una ruta que no es /health: {texto!r}",
        )
        exigir(
            "/api/v1/health" not in texto,
            f"el healthcheck de `{nombre}` apunta a /api/v1/health. D-03: /health es una "
            f"de las dos excepciones al prefijo, precisamente porque este healthcheck y "
            f"el `curl` del reusable la tienen cableada.",
        )


# ══════════════════════════════════════════════════════════════════════════════
# Mitad dinamica — contra la aplicacion montada y Postgres 17 efimero
# ══════════════════════════════════════════════════════════════════════════════


@pytest.mark.contrato
@pytest.mark.invariante
@pytest.mark.nucleo
@pytest.mark.t0
@pytest.mark.requiere_db
def test_health_responde_sin_autenticacion_y_sin_3xx(cliente) -> None:
    respuesta = cliente.get("/health")

    exigir(
        respuesta.status_code not in range(300, 400),
        f"/health responde {respuesta.status_code} (una redireccion). `curl -sf` no la "
        f"sigue: el smoke test del despliegue saldria rojo con la aplicacion sana.",
    )
    exigir(
        respuesta.status_code in (200, 503),
        f"/health responde {respuesta.status_code}. Solo puede ser 200, o 503 cuando el "
        f"esquema no se aplico. Un 401 o un 403 dejarian el contenedor unhealthy para "
        f"siempre: el healthcheck no lleva sesion.",
    )
    exigir(
        "set-cookie" not in {k.lower() for k in respuesta.headers},
        "/health devuelve Set-Cookie. Es un endpoint sin sesion que consulta una sonda "
        "cada 5 segundos: emitir cookies ahi crea sesiones que nadie cierra.",
    )

    cuerpo = respuesta.json()
    faltan = [c for c in CLAVES_OBLIGATORIAS if c not in cuerpo]
    exigir(
        not faltan,
        f"/health no publica {faltan}. Sin `app` no se detecta una colision de APP_PORT\n"
        f"  (el curl daria verde contra el /health de otra aplicacion); sin `commit` no se\n"
        f"  sabe si el contenedor se reconstruyo o quedo vivo el anterior.\n"
        f"  Devuelto: {sorted(cuerpo)}",
    )


@pytest.mark.contrato
@pytest.mark.invariante
@pytest.mark.t0
@pytest.mark.requiere_db
def test_health_publica_el_mismo_nombre_que_el_literal(cliente) -> None:
    esperado = constante_de_modulo(_arbol(), "APP_NOMBRE")
    assert cliente.get("/health").json().get("app") == esperado


@pytest.mark.contrato
@pytest.mark.invariante
@pytest.mark.t0
@pytest.mark.requiere_db
def test_health_detalle_existe_y_es_donde_vive_el_503_por_datos(cliente) -> None:
    """Ninguna sonda usa /health/detalle: lo lee el smoke test del despliegue.

    Ese es el mecanismo entero: un fallo de datos pone ROJO el build y deja el
    sitio ARRIBA. Si /health/detalle no existiera, el fallo de datos no tendria
    donde manifestarse y volveria a /health, que es de donde se lo saco.
    """
    respuesta = cliente.get("/health/detalle")
    exigir(
        respuesta.status_code in (200, 503),
        f"/health/detalle responde {respuesta.status_code}; solo puede ser 200 o 503.",
    )
