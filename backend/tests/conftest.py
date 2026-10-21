"""Arnes de la suite — ARCHIVO CONGELADO DE LA SEMILLA.

Su sha256 esta en semilla.lock y el job `semilla-intacta` falla si cambia. La
aplicacion generada no lo edita: aqui viven las tres protecciones que, si se
pueden apagar, hacen que toda la suite mienta.

EL ORDEN DE ESTE ARCHIVO ES DELIBERADO Y NO SE REORDENA
=======================================================
  1. sys.path y entorno de test    — antes de que nada importe `app`.
  2. Guard de base de datos        — en pytest_configure, antes de recolectar.
  3. Taxonomia obligatoria         — en la recoleccion.
  4. Un skip es un fallo           — en el cierre de la sesion.
  5. Utilidades para los tests.
  6. Dobles en memoria de los puertos que NO son la base.

── 1. Por que se pobla os.environ antes de importar nada ─────────────────────
En pydantic-settings las variables de entorno tienen precedencia sobre el
`env_file`. Poblar `os.environ` aqui desactiva de hecho cualquier `.env` que
haya en el arbol. Esto no es paranoia: en COIPO_USUARIOS el `.env` esta
VERSIONADO desde el commit 1b475c2 del 2026-04-20 con los datos de la base
compartida de produccion, y sin este paso la primera prueba que abriera una
conexion la abriria contra produccion.

Se usa `setdefault` a proposito: si el CI o quien desarrolla ya definieron la
variable, se respeta su valor — y de las consecuencias se encarga el guard.

── 2. Por que el guard va en pytest_configure y no en una fixture ────────────
pytest_configure es el primer hook que corre despues de cargar este modulo y
antes de recolectar, de importar los tests y de instanciar cualquier fixture. Un
guard que fuera fixture ya llegaria tarde: bastaria un test que no la pidiera
para saltarselo.

DIFERENCIA DELIBERADA CON EL GUARD DE COIPO_USUARIOS (tests/conftest.py:164-189),
del que este desciende: alli el guard aborta si no consigue construir la
configuracion de la aplicacion. Aqui NO. La razon es que esta semilla se usa
sobre proyectos a medio construir, y abortar la sesion entera porque
`app/composicion/ajustes.py` todavia no existe convierte "la app no esta escrita"
en "la suite no corre", que es un rojo que no dice nada. Lo que se hace en su
lugar es mas fuerte, no mas debil: se guarda SIEMPRE `os.environ`, que por D-06
es la unica fuente de la que el backend puede sacar el DSN (cinco variables,
nunca DATABASE_URL), y ADEMAS se guarda `ajustes` cuando se puede importar. Un
Settings que sacara el destino de otro sitio violaria D-06 y lo caza j06.

── 3. Por que tres ejes de marcas y no uno ───────────────────────────────────
El CI corre `-m nucleo`, `-m t0` y `-m "dominio or aplicacion"`. Un test sin
marca de tier no entra en ninguna de las tres: no corre nunca, nadie lo nota, y
su estado permanente es "verde por ausencia". Es la misma enfermedad que el
skipif de test_inmutabilidad_pg.py, solo que sin dejar ni la linea de "skipped".

── 4. Por que un skip es un fallo ────────────────────────────────────────────
`COIPO_ENTREGA_PLANTA/backend/tests/test_inmutabilidad_pg.py:30-33` y
`test_concurrencia_pg.py:52-55` llevan `skipif(not TEST_POSTGRES_URL)`, y como
ese repositorio no tiene CI esa variable no existe en ningun sitio automatizado.
Los tests de los triggers de inmutabilidad, de fn_purgar_logs, de los CHECK de
stock y de las condiciones de carrera SE SALTAN SIEMPRE. Son justo los que
sostienen las promesas ante la Contraloria, y su estado permanente es
"skipped, verde".

La dependencia ausente FALLA CON INSTRUCCIONES, nunca hace skip.

── 5. Por que MagicMock esta prohibido en L1 y L2 ────────────────────────────
MagicMock acepta cualquier metodo con cualquier firma. Un caso de uso que llama
a `iam.obtener_token()` —un metodo que el puerto no tiene A PROPOSITO, porque el
patron BFF exige que el token muera dentro del adaptador— pasa en verde contra un
MagicMock y revienta en produccion. Los dobles de este archivo implementan el
Protocol y revientan con AttributeError, que es lo que se necesita.
"""

from __future__ import annotations

import ast
import datetime as _dt
import functools
import inspect
import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any, Callable, Iterable, Mapping

import pytest

# ══════════════════════════════════════════════════════════════════════════════
# 1. sys.path y entorno de test (antes de importar nada de `app`)
# ══════════════════════════════════════════════════════════════════════════════

RAIZ_BACKEND = Path(__file__).resolve().parent.parent
RAIZ_REPO = RAIZ_BACKEND.parent

# Se inserta explicitamente en vez de confiar en el cwd. `python -m pytest` mete
# el directorio actual en sys.path y `pytest` a secas NO, asi que sin esta linea
# la suite funciona con un comando y falla con el otro por un motivo que no tiene
# nada que ver con el codigo.
if str(RAIZ_BACKEND) not in sys.path:
    sys.path.insert(0, str(RAIZ_BACKEND))

# Valores de test, evidentemente falsos. Ninguno es un secreto: si alguno llegara
# a produccion, la aplicacion no arrancaria contra nada real. Los nombres siguen
# los decretos: cinco variables de base de datos (nunca DATABASE_URL), prefijo
# IAM_ (D-07) y SESSION_ con dos S (D-08).
ENTORNO_DE_TEST: dict[str, str] = {
    "APP_ENV": "test",
    "DATABASE_HOST": "localhost",
    "DATABASE_PORT": "5432",
    "DATABASE_USER": "coipo_test",
    "DATABASE_PASSWORD": "coipo_test",
    # El sufijo `_test` no es decorativo: el guard lo exige.
    "DATABASE_NAME": "app_test",
    "IAM_BASE_URL": "http://iam.invalid",
    "IAM_CLIENT_ID": "test-client-id",
    "IAM_CLIENT_SECRET": "test-client-secret-jamas-usar-en-produccion",
    "IAM_REDIRECT_URI": "http://testserver/auth/callback",
    "SESSION_SECRET": "t0-gate-session-secret-jamas-usar-en-produccion",
    "SESSION_HTTPS_ONLY": "false",
}

for _clave, _valor in ENTORNO_DE_TEST.items():
    os.environ.setdefault(_clave, _valor)


# ══════════════════════════════════════════════════════════════════════════════
# 2. Guard de base de datos
# ══════════════════════════════════════════════════════════════════════════════

# Marca que los tests del propio guard buscan en la salida del subproceso.
# Permite distinguir "el guard aborto" de "un test fallo", que es la diferencia
# entre estar protegido y creerlo.
MARCA_GUARD = "GUARD-BD-ABORTA"

# Hosts donde una base de datos de test puede vivir legitimamente. `postgres` y
# `db` son los alias de servicio habituales en GitHub Actions y en compose.
HOSTS_PERMITIDOS = frozenset({"localhost", "127.0.0.1", "::1", "postgres", "db"})

SUFIJO_OBLIGATORIO = "_test"

# Denylist explicita por direccion. Esta IP no es un secreto: esta escrita en el
# encabezado de los docker-compose de la flota y en DECRETOS.md. Se repite aqui
# para que el guard siga protegiendo aunque alguien borre el .env del repositorio.
HOSTS_DE_PRODUCCION = frozenset({"172.31.2.40"})

_CLAVES_VIGILADAS = ("DATABASE_HOST", "DATABASE_NAME")


def _abortar(motivo: str) -> None:
    """Detiene la sesion COMPLETA con codigo distinto de cero.

    Nunca pytest.skip: un skip deja la suite en verde y la compuerta diria que
    todo esta bien mientras la proteccion no existe.

    Los mensajes nombran la VARIABLE y el motivo, nunca el valor. Imprimir el
    host o el nombre de la base meteria datos de produccion en los registros de
    CI, que es justo lo que este guard existe para evitar.
    """
    pytest.exit(
        f"\n{MARCA_GUARD}: la suite NO se ejecuta.\n"
        f"  Motivo: {motivo}\n"
        f"  Impacto si esto no abortara: los tests escribirian y borrarian filas\n"
        f"  en una base de datos que no es de pruebas. El Postgres de esta flota\n"
        f"  es COMPARTIDO por toda CONAF y vive fuera de Docker.\n"
        f"  Que hacer: apunta DATABASE_HOST a un host de la allowlist\n"
        f"  ({', '.join(sorted(HOSTS_PERMITIDOS))}) y DATABASE_NAME a un nombre\n"
        f"  terminado en '{SUFIJO_OBLIGATORIO}'.\n",
        returncode=2,
    )


def _valores_declarados(archivo: Path) -> dict[str, str]:
    """Extrae DATABASE_HOST y DATABASE_NAME de un archivo tipo .env.

    No se importa dotenv a proposito: esto tiene que funcionar aunque el archivo
    este a medio escribir, y no debe tener efectos secundarios sobre os.environ.
    """
    if not archivo.is_file():
        return {}
    encontrados: dict[str, str] = {}
    for linea in archivo.read_text(encoding="utf-8", errors="replace").splitlines():
        linea = linea.strip()
        if not linea or linea.startswith("#") or "=" not in linea:
            continue
        clave, _, valor = linea.partition("=")
        if clave.strip() in _CLAVES_VIGILADAS:
            encontrados[clave.strip()] = valor.strip().strip('"').strip("'")
    return encontrados


def _denylist_desde_el_repositorio() -> tuple[frozenset[str], frozenset[str]]:
    """Denylist por direccion Y por nombre, leida del propio repositorio.

    Se leen `.env` y `.env.example` en vez de copiar los valores aqui. Asi, si la
    base de produccion se muda, el guard sigue protegiendo el destino correcto sin
    que nadie tenga que acordarse de actualizar esta lista — y ningun valor de
    produccion queda transcrito en el codigo de los tests.
    """
    hosts = set(HOSTS_DE_PRODUCCION)
    nombres: set[str] = set()
    for archivo in (RAIZ_REPO / ".env", RAIZ_REPO / ".env.example",
                    RAIZ_BACKEND / ".env", RAIZ_BACKEND / ".env.example"):
        declarados = _valores_declarados(archivo)
        # Un host de la allowlist NUNCA entra en la denylist, por mucho que
        # aparezca en un `.env`. Hasta el 2026-09-15 si entraba, y el efecto era
        # que quien montaba su entorno de desarrollo como manda la guia —un
        # Postgres en `localhost`, un `.env` con `DATABASE_HOST=localhost`— se
        # quedaba sin poder correr la suite: el guard abortaba con codigo 2
        # diciendo "host de PRODUCCION" sobre su propia maquina. Un guard que
        # castiga el uso correcto es un guard que alguien desactiva.
        if (host := declarados.get("DATABASE_HOST", "").strip()) and host not in HOSTS_PERMITIDOS:
            hosts.add(host)
        if nombre := declarados.get("DATABASE_NAME", "").strip():
            nombres.add(nombre)
    # Un nombre que termina en _test no puede ser el de produccion; si alguien
    # apunta su .env a una base de test, no debe bloquearse a si mismo.
    nombres = {n for n in nombres if not n.endswith(SUFIJO_OBLIGATORIO)}
    return frozenset(hosts), frozenset(nombres)


def _revisar_destino(host: str, nombre: str, fuente: str) -> None:
    hosts_prohibidos, nombres_prohibidos = _denylist_desde_el_repositorio()
    host = (host or "").strip()
    nombre = (nombre or "").strip()

    # Orden de comprobacion: primero lo explicitamente prohibido (el peor caso),
    # despues las reglas estructurales.
    if host in hosts_prohibidos:
        _abortar(f"{fuente}: DATABASE_HOST apunta a un host de base de datos de PRODUCCION")
    if nombre in nombres_prohibidos:
        _abortar(f"{fuente}: DATABASE_NAME es el nombre de la base de datos de PRODUCCION")
    if host not in HOSTS_PERMITIDOS:
        _abortar(f"{fuente}: DATABASE_HOST no esta en la allowlist de hosts de test")
    if not nombre.endswith(SUFIJO_OBLIGATORIO):
        _abortar(f"{fuente}: DATABASE_NAME no termina en '{SUFIJO_OBLIGATORIO}'")


def pytest_configure(config: pytest.Config) -> None:
    """Guard de base de datos. Corre antes de recolectar e importar tests."""
    # (a) DATABASE_URL no se lee JAMAS del entorno. Un DSN de una sola pieza es
    #     la forma mas comoda de apuntar sin querer a produccion, y ademas se
    #     lleva por delante los connect_args (sslmode/gssencmode) que esta flota
    #     necesita contra su Postgres. Si esta puesta, se aborta: no se ignora en
    #     silencio, porque quien la puso cree que esta usandola.
    if os.environ.get("DATABASE_URL"):
        _abortar(
            "DATABASE_URL esta definida en el entorno. La conexion se arma con CINCO "
            "variables (DATABASE_HOST/PORT/USER/PASSWORD/NAME) y nunca con un DSN "
            "completo del entorno"
        )

    # (b) El entorno, que por D-06 es la fuente de la que el backend saca el DSN.
    _revisar_destino(os.environ.get("DATABASE_HOST", ""),
                     os.environ.get("DATABASE_NAME", ""),
                     "entorno")

    # (c) Y ademas los ajustes de la aplicacion, si ya existen. No abortar cuando
    #     no se pueden importar es deliberado (ver el encabezado de este archivo).
    try:
        from app.composicion.ajustes import ajustes  # type: ignore[import-not-found]
    except Exception:  # noqa: BLE001 — la app puede no estar escrita todavia
        return
    _revisar_destino(getattr(ajustes, "database_host", ""),
                     getattr(ajustes, "database_name", ""),
                     "app.composicion.ajustes")


# ══════════════════════════════════════════════════════════════════════════════
# 3. Taxonomia obligatoria, MagicMock y cuarentena
# ══════════════════════════════════════════════════════════════════════════════

CAPAS_DE_LA_PIRAMIDE = ("dominio", "aplicacion", "adaptador", "e2e")
CAPAS = frozenset(CAPAS_DE_LA_PIRAMIDE) | {"contrato"}
TIPOS = frozenset({"invariante", "caracterizacion", "guardia"})
TIERS = frozenset({"t0", "t1"})

# Capas donde el doble tiene que ser un objeto de verdad. Ver el encabezado.
CAPAS_SIN_MOCK = frozenset({"dominio", "aplicacion"})

CUARENTENA_MAXIMA = 3
CUARENTENA_DIAS = 14

_IMPORTS_DE_MOCK = ("unittest.mock", "mock")


@functools.lru_cache(maxsize=None)
def _usa_mock(ruta: str) -> str | None:
    """Devuelve el import de mock que aparece en el archivo, o None.

    Se PARSEA con ast en vez de buscar la palabra con una expresion regular: la
    palabra "MagicMock" aparece tambien dentro de un docstring que explique por
    que esta prohibida, y un verificador que se ponga rojo por su propia
    documentacion es un verificador que alguien desactiva.
    """
    try:
        arbol = ast.parse(Path(ruta).read_text(encoding="utf-8"))
    except (OSError, SyntaxError):
        return None
    for nodo in ast.walk(arbol):
        if isinstance(nodo, ast.Import):
            for alias in nodo.names:
                if alias.name.split(".")[0] in _IMPORTS_DE_MOCK or alias.name in _IMPORTS_DE_MOCK:
                    return f"import {alias.name}"
        elif isinstance(nodo, ast.ImportFrom) and nodo.module:
            if nodo.module in _IMPORTS_DE_MOCK or nodo.module.startswith("unittest.mock"):
                return f"from {nodo.module} import {', '.join(a.name for a in nodo.names)}"
    return None


def _fecha(texto: str) -> _dt.date | None:
    try:
        return _dt.date.fromisoformat(str(texto))
    except (TypeError, ValueError):
        return None


def pytest_collection_modifyitems(config: pytest.Config, items: list[pytest.Item]) -> None:
    """Rechaza en la recoleccion todo lo que haria mentir a la suite.

    Se hace cumplir aqui y no por revision humana porque la revision humana se
    salta un viernes por la tarde.
    """
    problemas: list[str] = []
    en_cuarentena: list[str] = []

    for item in items:
        marcas = {m.name for m in item.iter_markers()}
        capas = marcas & CAPAS
        tipos = marcas & TIPOS
        tiers = marcas & TIERS

        if len(capas) != 1:
            problemas.append(
                f"  {item.nodeid}\n"
                f"      tiene {len(capas)} marcas de capa ({', '.join(sorted(capas)) or 'ninguna'}); "
                f"debe tener exactamente una de: {', '.join(sorted(CAPAS))}"
            )
        if len(tipos) != 1:
            problemas.append(
                f"  {item.nodeid}\n"
                f"      tiene {len(tipos)} marcas de tipo ({', '.join(sorted(tipos)) or 'ninguna'}); "
                f"debe tener exactamente una de: {', '.join(sorted(TIPOS))}"
            )

        if "cuarentena" in marcas:
            en_cuarentena.append(item.nodeid)
            problemas.extend(_revisar_cuarentena(item))
        elif len(tiers) != 1:
            # La cuarentena queda exenta del tier: esta fuera de la compuerta por
            # definicion, y exigirle t0/t1 obligaria a mentir sobre donde corre.
            problemas.append(
                f"  {item.nodeid}\n"
                f"      tiene {len(tiers)} marcas de tier ({', '.join(sorted(tiers)) or 'ninguna'}); "
                f"debe tener exactamente una de: {', '.join(sorted(TIERS))}. "
                f"Sin tier el test no entra en `pytest -m t0` y NO CORRE NUNCA en la compuerta"
            )

        if capas & CAPAS_SIN_MOCK:
            if (donde := _usa_mock(str(item.path))) is not None:
                problemas.append(
                    f"  {item.nodeid}\n"
                    f"      L1/L2 con mock ({donde}). PROHIBIDO: MagicMock acepta cualquier\n"
                    f"      metodo con cualquier firma, asi que un caso de uso que llama a un\n"
                    f"      metodo inexistente pasa en verde. Usa los dobles de tests/conftest.py,\n"
                    f"      que implementan el Protocol y revientan con AttributeError."
                )
            if "monkeypatch" in getattr(item, "fixturenames", ()):
                problemas.append(
                    f"  {item.nodeid}\n"
                    f"      L1/L2 pidiendo la fixture `monkeypatch`. El doble vive en el BORDE:\n"
                    f"      si hay algo que parchear dentro de dominio/ o aplicacion/, es que la\n"
                    f"      dependencia deberia entrar por parametro. Si de verdad estas probando\n"
                    f"      un adaptador, la marca correcta es `adaptador`."
                )

    if len(en_cuarentena) > CUARENTENA_MAXIMA:
        problemas.append(
            f"  hay {len(en_cuarentena)} tests en cuarentena y el maximo son {CUARENTENA_MAXIMA}:\n"
            + "".join(f"        {n}\n" for n in sorted(en_cuarentena))
            + "      Una cuarentena que crece deja de ser una excepcion y pasa a ser la suite."
        )

    _escribir_censo(items)

    if problemas:
        raise pytest.UsageError(
            "TAXONOMIA DE TESTS INCUMPLIDA — la suite no se ejecuta.\n"
            + "\n".join(problemas)
            + "\n\n  Las marcas y su significado estan en backend/pytest.ini."
        )


def _revisar_cuarentena(item: pytest.Item) -> list[str]:
    marca = item.get_closest_marker("cuarentena")
    if marca is None:  # pragma: no cover — solo llega aqui si hay marca
        return []
    problemas: list[str] = []
    motivo = str(marca.kwargs.get("motivo", "")).strip()
    vence = marca.kwargs.get("vence")

    if len(motivo) < 20:
        problemas.append(
            f"  {item.nodeid}\n"
            f"      cuarentena sin motivo escrito (>= 20 caracteres). "
            f"'pendiente' no es un motivo: sin causa nadie sabe cuando se puede cerrar"
        )
    fecha = _fecha(vence)
    if fecha is None:
        problemas.append(
            f"  {item.nodeid}\n"
            f"      cuarentena sin `vence=\"AAAA-MM-DD\"` valido. Una cuarentena sin fecha "
            f"es un test borrado con otro nombre"
        )
        return problemas

    hoy = _dt.date.today()
    if fecha < hoy:
        problemas.append(
            f"  {item.nodeid}\n"
            f"      la cuarentena VENCIO el {fecha.isoformat()}. Se arregla el test o se "
            f"borra la funcionalidad que ya no se prueba; no se estira la fecha"
        )
    elif (fecha - hoy).days > CUARENTENA_DIAS:
        problemas.append(
            f"  {item.nodeid}\n"
            f"      la cuarentena vence en {(fecha - hoy).days} dias y el maximo son "
            f"{CUARENTENA_DIAS}"
        )
    return problemas


def _escribir_censo(items: Iterable[pytest.Item]) -> None:
    """Vuelca nodeid -> marcas si COIPO_CENSO apunta a un archivo.

    Lo usa tests/arquitectura/test_forma_de_la_piramide.py, que tiene que contar
    la suite ENTERA y no puede fiarse de lo que se recolecto en su propia
    ejecucion: `pytest tests/arquitectura/test_forma_de_la_piramide.py` recolecta
    un solo test y la piramide saldria perfecta.

    Es una variable de entorno y no una opcion de linea de comandos a proposito:
    `pytest_addoption` solo se atiende en el conftest inicial, y este vive en
    tests/, asi que la opcion no existiria si alguien invoca pytest con una ruta
    de fuera de tests/.
    """
    destino = os.environ.get("COIPO_CENSO")
    if not destino:
        return
    censo = {item.nodeid: sorted({m.name for m in item.iter_markers()}) for item in items}
    Path(destino).write_text(json.dumps(censo, indent=1, sort_keys=True), encoding="utf-8")


# ══════════════════════════════════════════════════════════════════════════════
# 4. Un skip es un fallo
# ══════════════════════════════════════════════════════════════════════════════

_SALTADOS: list[str] = []


def pytest_runtest_logreport(report: pytest.TestReport) -> None:
    if report.skipped and "cuarentena" not in report.keywords:
        # `wasxfail` cubre el xfail: un test que se declara "se espera que falle"
        # y falla produce un report.skipped. Es la via comoda para apagar un test
        # de contrato sin borrarlo, y por eso cuenta como salto.
        etiqueta = "xfail" if hasattr(report, "wasxfail") else "skip"
        _SALTADOS.append(f"{report.nodeid}  [{etiqueta}]")


def pytest_collectreport(report: pytest.CollectReport) -> None:
    # Un `pytest.skip(allow_module_level=True)` en la cabecera de un archivo
    # desaparece de la suite sin dejar ni una linea de test saltado. Se caza aqui.
    if report.skipped:
        _SALTADOS.append(f"{report.nodeid}  [modulo entero]")


def pytest_sessionfinish(session: pytest.Session, exitstatus: int) -> None:
    if not _SALTADOS:
        return
    escritor = getattr(session.config, "pluginmanager", None)
    reporte = session.config.pluginmanager.get_plugin("terminalreporter") if escritor else None
    lineas = [
        "",
        "UN SKIP ES UN FALLO — la sesion termina en rojo aunque no fallara ningun test.",
        "",
        "  Estos tests no se ejecutaron y no estan en cuarentena declarada:",
        *(f"    {n}" for n in _SALTADOS),
        "",
        "  Por que: en COIPO_ENTREGA_PLANTA los tests de inmutabilidad y de",
        "  concurrencia llevan skipif sobre una variable que ningun CI define, asi",
        "  que su estado permanente es 'skipped, verde' — y son justo los que",
        "  sostienen las promesas ante la Contraloria.",
        "",
        "  Que hacer: la dependencia ausente FALLA CON INSTRUCCIONES, nunca hace",
        "  skip. Si de verdad hace falta apagarlo un rato:",
        '    @pytest.mark.cuarentena(motivo="...", vence="AAAA-MM-DD")',
        f"  Maximo {CUARENTENA_MAXIMA} simultaneas y {CUARENTENA_DIAS} dias de vida.",
        "",
    ]
    if reporte is not None:
        reporte.write_line("\n".join(lineas))
    else:  # pragma: no cover — sin terminal (por ejemplo, -p no:terminal)
        print("\n".join(lineas), file=sys.stderr)
    session.exitstatus = 1


# ══════════════════════════════════════════════════════════════════════════════
# 5. Utilidades para los tests
# ══════════════════════════════════════════════════════════════════════════════


def exigir(condicion: Any, mensaje: str) -> None:
    """Falla con instrucciones. NUNCA hace skip.

    Existe para que la frase "la dependencia ausente falla con instrucciones" sea
    una funcion y no una intencion.
    """
    if not condicion:
        pytest.fail(mensaje, pytrace=False)


def leer(ruta: Path, *, que_es: str) -> str:
    exigir(
        ruta.is_file(),
        f"falta {ruta.relative_to(RAIZ_REPO) if ruta.is_relative_to(RAIZ_REPO) else ruta}\n"
        f"  {que_es}\n"
        f"  Este archivo es parte del contrato de la semilla: no se puede no tener.",
    )
    return ruta.read_text(encoding="utf-8")


def cargar_yaml(ruta: Path, *, que_es: str) -> Any:
    """Carga un YAML con PyYAML.

    Por que una dependencia y no un parser propio: los archivos que estos tests
    leen (ci.yml, docker-compose.yml, proyecto.coipo.yaml) usan mapas en linea,
    escalares de bloque y anclas. Un parser casero que se equivoque al leer un
    archivo de compuerta es peor que la dependencia: pondria verde una compuerta
    que no verifico lo que cree. PyYAML va en requirements-dev.txt.
    """
    try:
        import yaml  # noqa: PLC0415 — import local a proposito: solo lo usan estos tests
    except ImportError:  # pragma: no cover
        pytest.fail(
            "falta PyYAML. Anadelo a backend/requirements-dev.txt:\n"
            "    PyYAML==6.*\n"
            "  No se hace skip: sin el, estos tests de contrato no verifican nada.",
            pytrace=False,
        )
    texto = leer(ruta, que_es=que_es)
    try:
        return yaml.safe_load(texto)
    except Exception as e:  # noqa: BLE001
        pytest.fail(f"{ruta} no es YAML valido: {type(e).__name__}", pytrace=False)


def arbol_python(ruta: Path, *, que_es: str) -> ast.Module:
    """Parsea un modulo. Se PARSEA, no se importa.

    Un ImportError dentro de la capa que se esta juzgando se confundiria con "no
    importa nada prohibido" y el test pasaria por el motivo equivocado.
    """
    texto = leer(ruta, que_es=que_es)
    try:
        return ast.parse(texto, filename=str(ruta))
    except SyntaxError as e:
        pytest.fail(f"{ruta} no compila: linea {e.lineno}: {e.msg}", pytrace=False)


def constante_de_modulo(arbol: ast.Module, nombre: str) -> Any:
    """Devuelve el valor de una asignacion literal de nivel de modulo, o NO_ESTA.

    Se usa ast.literal_eval en vez de importar el modulo: importar
    `guards.py` arrastraria fastapi, la configuracion y la base de datos, y un
    fallo en cualquiera de esos tres se leeria como "la constante no existe".
    """
    for nodo in arbol.body:
        objetivos: list[ast.expr] = []
        if isinstance(nodo, ast.Assign):
            objetivos = list(nodo.targets)
            valor = nodo.value
        elif isinstance(nodo, ast.AnnAssign) and nodo.value is not None:
            objetivos = [nodo.target]
            valor = nodo.value
        else:
            continue
        for objetivo in objetivos:
            if isinstance(objetivo, ast.Name) and objetivo.id == nombre:
                try:
                    return ast.literal_eval(valor)
                except (ValueError, SyntaxError):
                    return NO_LITERAL
    return NO_ESTA


class _Centinela:
    def __init__(self, nombre: str) -> None:
        self._nombre = nombre

    def __repr__(self) -> str:  # pragma: no cover — solo para mensajes de error
        return self._nombre

    def __bool__(self) -> bool:
        return False


NO_ESTA = _Centinela("<no esta declarada>")
NO_LITERAL = _Centinela("<declarada, pero no es un literal>")


def archivos_versionados() -> list[str]:
    """`git ls-files` desde la raiz del repositorio.

    Se pregunta a git y no al sistema de archivos porque lo que llega al servidor
    es lo versionado: desde que se anclaron los excludes del rsync (commit
    45c7c01 de infra-docker-base), un `.env` anidado SI llega al servidor.
    """
    try:
        salida = subprocess.run(
            ["git", "ls-files", "-z"],
            cwd=RAIZ_REPO, capture_output=True, text=True, timeout=60, check=True,
        )
    except (OSError, subprocess.SubprocessError) as e:
        pytest.fail(
            f"no se pudo ejecutar `git ls-files` ({type(e).__name__}). Estos tests "
            f"comprueban lo VERSIONADO, no lo que hay en el disco: sin git no verifican nada.",
            pytrace=False,
        )
    return [p for p in salida.stdout.split("\0") if p]


def archivos_de(paquete: str, *, sufijo: str = ".py") -> list[Path]:
    """Todos los archivos de un paquete de `app/`, en orden estable."""
    raiz = RAIZ_BACKEND / "app" / paquete
    if not raiz.is_dir():
        return []
    return sorted(p for p in raiz.rglob(f"*{sufijo}") if "__pycache__" not in p.parts)


@pytest.fixture(scope="session")
def raiz_repo() -> Path:
    return RAIZ_REPO


@pytest.fixture(scope="session")
def raiz_backend() -> Path:
    return RAIZ_BACKEND


# ══════════════════════════════════════════════════════════════════════════════
# 6. Dobles en memoria de los puertos que NO son la base
# ══════════════════════════════════════════════════════════════════════════════
#
# La base NUNCA se dobla: Postgres 17 efimero, siempre (D-24). Se doblan el IAM,
# el reloj, el almacen de archivos y la notificacion, que son los puertos cuyo
# doble no puede mentir sobre el esquema.
#
# Ninguno hereda de nada ni usa __getattr__ permisivo: si un caso de uso llama a
# un metodo que no existe, salta AttributeError. Esa es toda la diferencia con
# MagicMock, y es la diferencia entre una suite que prueba y una que acompana.


class ErrorDeDoble(AssertionError):
    """El doble se uso de una forma que el adaptador real no soportaria."""


# ── El IAM ────────────────────────────────────────────────────────────────────
#
# EL DOBLE TIENE QUE SER TAN HOSTIL COMO LA REALIDAD.
#
# `COIPO_USUARIOS/backend/services/application_attribute_service.py:430` arma los
# claims asi: parte de TODAS las claves declaradas en None y superpone los
# valores guardados. De ahi salen las dos cosas que este doble reproduce y que un
# doble amable esconderia:
#
#   1. `role` viene con el nombre EXACTO tecleado en el panel del IAM. En la
#      practica eso es "Encargado" con mayuscula, no "encargado". Una app que
#      compare `rol == "encargado"` funciona contra un doble amable y deja a la
#      persona sin permisos en produccion.
#   2. Una clave DECLARADA aparece SIEMPRE, con null si el administrador no la
#      completo. Entonces que una clave NO VENGA significa otra cosa: esta app
#      todavia no la declaro en el panel — falla de DESPLIEGUE, no de datos. Por
#      eso hay un payload de fabrica al que le FALTA la clave, y no solo uno que
#      la trae en null. `info.get(k) is None` colapsa los dos casos.

PAYLOADS_DE_FABRICA: dict[str, dict[str, Any]] = {
    # Camino feliz, y ya es hostil: el rol viene con mayuscula.
    "encargado": {
        "sub": "1042",
        "username": "j.perez",
        "email": "j.perez@conaf.cl",
        "app_id": 7,
        "role": "Encargado",
        "gerencia_id": 2,
    },
    # Administrador de ambito nacional: la clave DECLARADA viene, en null.
    "administrador": {
        "sub": "7",
        "username": "admin.flota",
        "email": "admin.flota@conaf.cl",
        "app_id": 7,
        "role": "administrador",
        "gerencia_id": None,
    },
    # LA CLAVE NO VIENE. No es lo mismo que venir en null: significa que la app
    # no declaro `gerencia_id` en el panel del IAM. Falla de despliegue.
    "sin_atributo_declarado": {
        "sub": "1043",
        "username": "m.soto",
        "email": "m.soto@conaf.cl",
        "app_id": 7,
        "role": "Encargado",
    },
    # Declarada y sin completar: falla de datos del administrador. Se rechaza.
    "atributo_en_null": {
        "sub": "1044",
        "username": "p.rojas",
        "email": "p.rojas@conaf.cl",
        "app_id": 7,
        "role": "Encargado",
        "gerencia_id": None,
    },
    # Sin rol asignado. Lo que pasa aqui lo decide la ficha
    # (iam.rol_sin_asignacion), y no hay default implicito.
    "sin_rol": {
        "sub": "1045",
        "username": "s.vera",
        "email": "s.vera@conaf.cl",
        "app_id": 7,
        "gerencia_id": 2,
    },
    # Rol que esta app no conoce: el IAM es de toda la flota y su panel acepta
    # cualquier nombre.
    "rol_desconocido": {
        "sub": "1046",
        "username": "c.diaz",
        "email": "c.diaz@conaf.cl",
        "app_id": 7,
        "role": "SuperAdmin",
        "gerencia_id": 2,
    },
}

CODIGO_DE_FABRICA = "codigo-de-prueba-encargado"


class IamFalso:
    """Doble del puerto ProveedorDeIdentidad.

    NO tiene `obtener_token`, ni `cerrar_sesion`, ni `refrescar`, igual que el
    Protocol real y por las mismas razones: el patron BFF exige que el token del
    IAM muera dentro del adaptador; el IAM no tiene endpoint de logout (IAM-012);
    y no hay refresh tokens. Un metodo que el adaptador real no puede implementar
    es peor que su ausencia.

    `__getattr__` esta escrito para EXPLICAR la ausencia, no para tolerarla:
    devuelve AttributeError igual, pero con el motivo.
    """

    _METODOS_QUE_NO_EXISTEN = {
        "obtener_token": (
            "el patron BFF exige que el token del IAM muera dentro del adaptador. Si "
            "este metodo existiera, la tentacion de guardarlo en la sesion existiria y "
            "algun dia alguien la tomaria. Corolario: IAM_JWT_SECRET no puede existir en "
            "una app cliente — el JWT del IAM es HS256 con secreto GLOBAL de la flota y "
            "sin claim aud, asi que tenerlo permite firmar tokens validos para cualquier "
            "aplicacion de CONAF"
        ),
        "cerrar_sesion": "el IAM no tiene endpoint de logout (IAM-012). Se cierra la sesion LOCAL",
        "refrescar": "no hay refresh tokens en este IdP",
    }

    def __init__(
        self,
        *,
        payloads: Mapping[str, Mapping[str, Any]] | None = None,
        payload: Mapping[str, Any] | None = None,
        mapeador: Callable[[Mapping[str, Any]], Any] | None = None,
        base_de_autorizacion: str = "http://iam.invalid/oauth/authorize",
    ) -> None:
        if payload is not None:
            payloads = {CODIGO_DE_FABRICA: payload}
        self.payloads: dict[str, dict[str, Any]] = {
            str(k): dict(v) for k, v in (payloads or PAYLOADS_DE_FABRICA).items()
        }
        self._mapeador = mapeador
        self._base = base_de_autorizacion
        # Lo que el doble deja ver para que un test pueda afirmar sobre ello.
        self.autorizaciones: list[dict[str, str]] = []
        self.canjes: list[dict[str, str]] = []
        self.codigos_usados: set[str] = set()

    # -- el Protocol ---------------------------------------------------------

    def url_de_autorizacion(self, *, estado: str, redirect_uri: str) -> str:
        self.autorizaciones.append({"estado": estado, "redirect_uri": redirect_uri})
        from urllib.parse import urlencode

        return f"{self._base}?" + urlencode(
            {"response_type": "code", "state": estado, "redirect_uri": redirect_uri}
        )

    def canjear_codigo(self, *, codigo: str, redirect_uri: str) -> str:
        # El IAM compara la redirect_uri por igualdad exacta de string y el codigo
        # es de un solo uso. Las dos cosas se reproducen aqui: un doble que
        # aceptara el mismo codigo dos veces dejaria pasar un replay.
        if codigo in self.codigos_usados:
            raise ErrorDeDoble(
                f"codigo '{codigo}' canjeado dos veces. El codigo de autorizacion es de "
                f"UN SOLO USO: el IAM real devuelve 400 en el segundo canje"
            )
        if codigo not in self.payloads:
            raise ErrorDeDoble(
                f"codigo '{codigo}' desconocido. El IAM real devuelve 400. "
                f"Codigos de fabrica: {sorted(self.payloads)}"
            )
        anterior = next((a for a in reversed(self.autorizaciones)), None)
        if anterior is not None and anterior["redirect_uri"] != redirect_uri:
            raise ErrorDeDoble(
                "la redirect_uri del canje no es IDENTICA a la enviada a /authorize. "
                "El IAM las compara por igualdad exacta de string; por eso viaja "
                "congelada dentro del estado firmado"
            )
        self.codigos_usados.add(codigo)
        self.canjes.append({"codigo": codigo, "redirect_uri": redirect_uri})
        return f"credencial-de-prueba:{codigo}"

    def identidad(self, credencial: str) -> Any:
        codigo = credencial.split(":", 1)[1] if credencial.startswith("credencial-de-prueba:") else credencial
        payload = self.payloads.get(codigo)
        if payload is None:
            raise ErrorDeDoble(f"credencial '{credencial}' desconocida")
        return self._mapear(payload)

    # -- soporte -------------------------------------------------------------

    def payload(self, nombre: str) -> dict[str, Any]:
        """El payload crudo de /oauth/userinfo, para tests del mapeo de claims."""
        if nombre not in self.payloads:
            raise ErrorDeDoble(f"no hay payload de fabrica '{nombre}'")
        return dict(self.payloads[nombre])

    def _mapear(self, payload: Mapping[str, Any]) -> Any:
        if self._mapeador is not None:
            return self._mapeador(payload)
        try:
            from app.adaptadores.salida.iam import mapeo_claims  # type: ignore[import-not-found]
        except Exception as e:  # noqa: BLE001
            raise ErrorDeDoble(
                "IamFalso no sabe construir una Identidad. Pasale `mapeador=` con la "
                "funcion que convierte el payload de /oauth/userinfo en Identidad, o "
                "escribe app/adaptadores/salida/iam/mapeo_claims.py. "
                f"({type(e).__name__})"
            ) from e
        for nombre in ("a_identidad", "identidad_desde_claims", "mapear"):
            if (fn := getattr(mapeo_claims, nombre, None)) is not None:
                return fn(payload)
        raise ErrorDeDoble(
            "app/adaptadores/salida/iam/mapeo_claims.py no expone a_identidad(payload)"
        )

    def __getattr__(self, nombre: str) -> Any:
        motivo = self._METODOS_QUE_NO_EXISTEN.get(nombre)
        if motivo:
            raise AttributeError(
                f"ProveedorDeIdentidad NO tiene `{nombre}` a proposito: {motivo}"
            )
        raise AttributeError(
            f"IamFalso no tiene `{nombre}`. Si el adaptador real tampoco lo tiene, el "
            f"error esta en quien llama; si lo tiene, el puerto y el doble divergieron."
        )


# ── El reloj ──────────────────────────────────────────────────────────────────


class RelojFalso:
    """Doble del puerto Reloj. Controlable, y con zona horaria SIEMPRE.

    `datetime.utcnow()` devuelve un naive y comparar naive con aware revienta en
    tiempo de ejecucion y no en tiempo de test. Este doble no puede producir un
    naive: si le pasan uno, falla en el constructor.
    """

    def __init__(self, ahora: _dt.datetime | None = None) -> None:
        ahora = ahora or _dt.datetime(2026, 9, 5, 12, 0, 0, tzinfo=_dt.timezone.utc)
        if ahora.tzinfo is None:
            raise ErrorDeDoble("RelojFalso exige un datetime con tzinfo. Un naive miente al comparar")
        self._ahora = ahora

    def ahora(self) -> _dt.datetime:
        return self._ahora

    def avanzar(self, **delta: float) -> _dt.datetime:
        self._ahora = self._ahora + _dt.timedelta(**delta)
        return self._ahora


# ── La notificacion ───────────────────────────────────────────────────────────


class NotificadorFalso:
    """Doble del puerto de notificacion. Guarda lo enviado; nunca sale a la red.

    No guarda el cuerpo en un atributo publico por comodidad y ya: el cuerpo de
    un correo lleva datos personales, y un test que lo vuelque en la salida de CI
    los pone en un registro que nadie considero un tratamiento.
    """

    def __init__(self) -> None:
        self.enviados: list[dict[str, Any]] = []

    def enviar(self, *, destinatario: str, asunto: str, cuerpo: str) -> None:
        self.enviados.append({"destinatario": destinatario, "asunto": asunto,
                              "largo_cuerpo": len(cuerpo)})


# ── El almacen de archivos ────────────────────────────────────────────────────


class AlmacenFalso:
    """Doble del puerto de archivos. En memoria.

    Tiene `eliminar` a proposito: la retencion necesita borrar objetos, y hoy en
    la flota el PDF de la guia de despacho —con nombre y RUT dentro— no se toca
    NUNCA, con la fila del titular ya desidentificada apuntando a el. Un doble
    sin `eliminar` haria imposible escribir el test que caza eso.
    """

    def __init__(self) -> None:
        self.objetos: dict[str, bytes] = {}
        self.eliminados: list[str] = []

    def guardar(self, *, clave: str, contenido: bytes, tipo_mime: str) -> str:
        if not isinstance(contenido, (bytes, bytearray)):
            raise ErrorDeDoble("el almacen recibe bytes, no str: el adaptador real tambien")
        self.objetos[clave] = bytes(contenido)
        return clave

    def leer(self, clave: str) -> bytes:
        if clave not in self.objetos:
            raise KeyError(clave)
        return self.objetos[clave]

    def eliminar(self, clave: str) -> bool:
        existia = self.objetos.pop(clave, None) is not None
        self.eliminados.append(clave)
        return existia


# ── Comprobacion de que el doble sigue siendo el puerto ───────────────────────


def verificar_doble(doble: Any, protocolo: Any) -> None:
    """Exige que el doble tenga los mismos metodos y las mismas FIRMAS del puerto.

    isinstance() sobre un Protocol runtime_checkable solo compara NOMBRES de
    metodo: un doble con `enviar(self, destinatario)` y un puerto con
    `enviar(self, *, destinatario, asunto, cuerpo)` pasan como equivalentes, y el
    caso de uso revienta en produccion. Por eso se comparan los parametros.
    """
    faltan: list[str] = []
    difieren: list[str] = []
    for nombre, miembro in inspect.getmembers(protocolo, inspect.isfunction):
        if nombre.startswith("_"):
            continue
        real = getattr(type(doble), nombre, None)
        if real is None:
            faltan.append(nombre)
            continue
        esperada = [p for p in inspect.signature(miembro).parameters if p != "self"]
        obtenida = [p for p in inspect.signature(real).parameters if p != "self"]
        if esperada != obtenida:
            difieren.append(f"{nombre}: el puerto pide ({', '.join(esperada)}) y el doble "
                            f"ofrece ({', '.join(obtenida)})")
    problemas = [f"le falta el metodo `{n}`" for n in faltan] + difieren
    exigir(
        not problemas,
        f"{type(doble).__name__} ya no implementa {getattr(protocolo, '__name__', protocolo)}:\n"
        + "".join(f"    - {p}\n" for p in problemas)
        + "  El puerto y su doble divergieron. Si el doble se queda atras, los tests de\n"
        "  L2 prueban una interfaz que no existe.",
    )


def _puerto(modulo: str, nombre: str) -> Any:
    """Importa un Protocol de aplicacion/puertos/. Falla con instrucciones."""
    try:
        mod = __import__(f"app.aplicacion.puertos.{modulo}", fromlist=[nombre])
    except Exception as e:  # noqa: BLE001
        pytest.fail(
            f"no se puede importar app/aplicacion/puertos/{modulo}.py ({type(e).__name__}: {e}).\n"
            f"  Los dobles de tests/conftest.py se comprueban contra el Protocol real: sin el\n"
            f"  puerto, el doble no se puede verificar y los tests de L2 no valen nada.",
            pytrace=False,
        )
    obj = getattr(mod, nombre, None)
    exigir(obj is not None, f"app/aplicacion/puertos/{modulo}.py no define `{nombre}`")
    return obj


@pytest.fixture
def iam_falso() -> IamFalso:
    doble = IamFalso()
    verificar_doble(doble, _puerto("identidad", "ProveedorDeIdentidad"))
    return doble


@pytest.fixture
def reloj_falso() -> RelojFalso:
    doble = RelojFalso()
    verificar_doble(doble, _puerto("reloj", "Reloj"))
    return doble


@pytest.fixture
def notificador_falso() -> NotificadorFalso:
    doble = NotificadorFalso()
    verificar_doble(doble, _puerto("notificacion", "Notificador"))
    return doble


@pytest.fixture
def almacen_falso() -> AlmacenFalso:
    doble = AlmacenFalso()
    verificar_doble(doble, _puerto("archivos", "AlmacenDeArchivos"))
    return doble


# ══════════════════════════════════════════════════════════════════════════════
# 7. La aplicacion, para los tests de contrato que la necesitan
# ══════════════════════════════════════════════════════════════════════════════
#
# CONTRATO QUE LA SEMILLA IMPONE A LA COMPOSICION. Si algo de esto falta, estas
# fixtures fallan nombrando el simbolo que falta; nunca hacen skip.
#
#   app.main:crear_app(arrancar: bool = True, contenedor=None) -> FastAPI
#   app.composicion.ajustes:ajustes
#   app.composicion.contenedor:construir(ajustes, **sustituciones) -> Contenedor
#
# `arrancar=False` existe para que un test pueda montar la aplicacion sin correr
# el lifespan (que aplica migraciones y siembra el catalogo de eventos). Los
# tests que SI quieren el arranque completo usan la fixture `cliente`, que lo
# hace con el runner de migraciones de produccion y nunca con create_all().


@pytest.fixture(scope="session")
def aplicacion(iam_de_sesion: "IamFalso") -> Any:
    try:
        from app.composicion.ajustes import ajustes  # type: ignore[import-not-found]
        from app.composicion.contenedor import construir  # type: ignore[import-not-found]
        from app.main import crear_app  # type: ignore[import-not-found]
    except Exception as e:  # noqa: BLE001
        pytest.fail(
            f"no se puede componer la aplicacion ({type(e).__name__}: {e}).\n"
            f"  La semilla exige:\n"
            f"    app.main:crear_app(arrancar=True, contenedor=None) -> FastAPI\n"
            f"    app.composicion.ajustes:ajustes\n"
            f"    app.composicion.contenedor:construir(ajustes, **sustituciones)\n",
            pytrace=False,
        )

    sustituciones = {"identidad": iam_de_sesion}
    try:
        contenedor = construir(ajustes, **sustituciones)
    except TypeError:
        # Composicion sin sustituciones: se construye y se sustituye despues. Si
        # el contenedor es inmutable, esto falla ruidosamente, que es lo correcto.
        contenedor = construir(ajustes)
        for nombre, doble in sustituciones.items():
            exigir(
                hasattr(contenedor, nombre),
                f"el contenedor no expone `{nombre}` y `construir()` no acepta "
                f"sustituciones. Sin una de las dos cosas, ningun test puede poner un "
                f"doble del IAM y todos acabarian hablando con el IdP real.",
            )
            setattr(contenedor, nombre, doble)
    return crear_app(arrancar=True, contenedor=contenedor)


@pytest.fixture(scope="session")
def iam_de_sesion() -> IamFalso:
    """El mismo IamFalso durante toda la sesion, para poder afirmar sobre el."""
    return IamFalso()


@pytest.fixture
def cliente(aplicacion: Any):
    """TestClient sin seguir redirecciones.

    `follow_redirects=False` a proposito: el smoke test del reusable usa
    `curl -sf`, que NO sigue 3xx. Un test que siguiera las redirecciones daria
    verde sobre un /health que responde 307, y el despliegue se caeria igual.
    """
    try:
        from fastapi.testclient import TestClient  # noqa: PLC0415
    except ImportError:  # pragma: no cover
        pytest.fail("falta fastapi[testclient] / httpx en requirements-dev.txt", pytrace=False)
    with TestClient(aplicacion, follow_redirects=False) as c:
        yield c


# ══════════════════════════════════════════════════════════════════════════════
# 8. Lectura de rutas HTTP por AST (la usan tres tests de contrato)
# ══════════════════════════════════════════════════════════════════════════════
#
# Se lee el AST y no el `app.routes` en vivo porque los tests estaticos tienen
# que poder correr en la PUERTA 3, cuando el proyecto todavia no arranca. Un test
# de contrato que exija una aplicacion montada para comprobar que toda ruta tiene
# guard llegaria tarde: la ruta sin guard ya estaria escrita.

METODOS_HTTP = ("get", "post", "put", "patch", "delete", "head", "options")


class RutaDeclarada:
    """Una ruta encontrada en el AST de un modulo de rutas."""

    __slots__ = ("metodo", "camino", "funcion", "linea", "kwargs", "nodo", "archivo")

    def __init__(self, metodo: str, camino: str, funcion: str, linea: int,
                 kwargs: dict[str, ast.expr], nodo: ast.FunctionDef | ast.AsyncFunctionDef,
                 archivo: Path) -> None:
        self.metodo = metodo
        self.camino = camino
        self.funcion = funcion
        self.linea = linea
        self.kwargs = kwargs
        self.nodo = nodo
        self.archivo = archivo

    @property
    def clave(self) -> str:
        return f"{self.metodo.upper()} {self.camino}"

    def __repr__(self) -> str:  # pragma: no cover — solo para mensajes de error
        return f"{self.clave} ({self.archivo.name}:{self.linea})"


def rutas_declaradas(arbol: ast.Module, archivo: Path) -> list[RutaDeclarada]:
    """Todas las funciones decoradas con @<algo>.<metodo>("/camino")."""
    rutas: list[RutaDeclarada] = []
    for nodo in ast.walk(arbol):
        if not isinstance(nodo, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue
        for deco in nodo.decorator_list:
            if not isinstance(deco, ast.Call) or not isinstance(deco.func, ast.Attribute):
                continue
            metodo = deco.func.attr
            if metodo not in METODOS_HTTP:
                continue
            camino = deco.args[0].value if (
                deco.args and isinstance(deco.args[0], ast.Constant)
                and isinstance(deco.args[0].value, str)
            ) else None
            if camino is None:
                continue
            kwargs = {k.arg: k.value for k in deco.keywords if k.arg}
            rutas.append(RutaDeclarada(metodo, camino, nodo.name, deco.lineno,
                                       kwargs, nodo, archivo))
    return rutas


def dependencias_del_router(arbol: ast.Module) -> str:
    """El texto de `dependencies=[...]` del APIRouter(...) del modulo, o "".

    Se devuelve TEXTO y no una estructura a proposito: lo que interesa es si la
    lista nombra un guard, y los guards se escriben de muchas formas
    (`Depends(exigir_rol("administrador"))`, `Depends(solo_auditor)`). Comparar
    texto es fragil para decidir CUAL es el guard, y suficiente para decidir si
    HAY guard, que es lo unico que este contrato afirma.
    """
    for nodo in ast.walk(arbol):
        if (isinstance(nodo, ast.Call) and isinstance(nodo.func, ast.Name)
                and nodo.func.id == "APIRouter"):
            for k in nodo.keywords:
                if k.arg == "dependencies":
                    return ast.unparse(k.value)
    return ""


def texto_de(nodo: ast.AST | None) -> str:
    return "" if nodo is None else ast.unparse(nodo)


def modulos_de_rutas() -> list[Path]:
    """Los modulos de adaptadores/entrada/http/rutas/, sin los __init__."""
    raiz = RAIZ_BACKEND / "app" / "adaptadores" / "entrada" / "http" / "rutas"
    if not raiz.is_dir():
        return []
    return sorted(p for p in raiz.rglob("*.py")
                  if p.name != "__init__.py" and "__pycache__" not in p.parts)
