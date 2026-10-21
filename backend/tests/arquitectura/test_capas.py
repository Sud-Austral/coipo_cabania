"""El dominio no importa infraestructura — ARCHIVO CONGELADO DE LA SEMILLA.

Su sha256 esta en semilla.lock. La aplicacion generada no lo edita.

POR QUE SE PARSEA Y NO SE IMPORTA
=================================
Un ImportError dentro del dominio se confundiria con "no importa nada prohibido"
y el test pasaria por el motivo equivocado. Con `ast` se lee lo que el archivo
DICE, no lo que el interprete consigue cargar hoy con las dependencias que haya
instaladas.

POR QUE NO SE USA grep
======================
`grep -n "sqlalchemy" app/dominio` se pone rojo por un docstring que explique por
que sqlalchemy esta prohibido, y verde ante `__import__("sqlalchemy")`. Un
verificador que se queja de su propia documentacion es un verificador que alguien
desactiva, y el modo de muerte mas probable de este artefacto es el juez
desactivado de hecho por acumulacion de excepciones.

POR QUE LOS IMPORTS RELATIVOS ESTAN PROHIBIDOS EN LAS CAPAS INTERNAS
====================================================================
Sin esa regla, `from ..adaptadores import repositorio` esquiva el chequeo entero:
el AST guarda `module="adaptadores"` con `level=2`, que no empieza por
"app.adaptadores" y por lo tanto no coincide con ningun prohibido. El juez
seguiria verde mientras el dominio importa el ORM. Es la unica forma conocida de
hacer mentir a este archivo, y por eso se cierra explicitamente.

POR QUE HAY UN TEST DEL TEST
============================
`assert not violaciones` sobre un arbol VACIO pasa. Borrar `app/dominio/` entero
dejaria esta suite en verde, que es la peor forma posible de aprobar. Por eso hay
dos defensas: `assert archivos` antes del bucle, y dos tests que PLANTAN una
violacion en un arbol temporal y exigen que el verificador la encuentre.
"""

from __future__ import annotations

import ast
from pathlib import Path

import pytest

from tests.conftest import RAIZ_BACKEND, exigir  # noqa: F401 — RAIZ_BACKEND se usa abajo

# ── El contrato, tal como esta escrito en la decision de arquitectura ─────────
#
# Cada entrada es un PREFIJO de modulo. "sqlalchemy" caza `sqlalchemy.orm`;
# "app.adaptadores" caza `app.adaptadores.salida.postgres.motor`.
#
# `os` esta en la lista del dominio y no en la de aplicacion a proposito: en el
# dominio, `os.environ` seria una regla de negocio que depende del entorno, y una
# regla que cambia con una variable no se puede probar. En aplicacion tampoco
# deberia aparecer, pero el limite duro esta una capa mas adentro.
#
# `pydantic` esta prohibido en el dominio porque los esquemas pydantic son del
# BORDE (adaptadores/entrada/http/esquemas/): un modelo de dominio validado por
# pydantic acaba con las reglas de negocio escritas como validadores de un DTO.
PROHIBIDOS: dict[str, frozenset[str]] = {
    "dominio": frozenset({
        "fastapi", "starlette", "sqlalchemy", "psycopg", "psycopg2", "httpx", "boto3",
        "pydantic", "pydantic_settings", "itsdangerous", "jose", "os",
        "app.adaptadores", "app.composicion", "app.main",
    }),
    "aplicacion": frozenset({
        "fastapi", "starlette", "sqlalchemy", "psycopg", "psycopg2", "httpx",
        "app.adaptadores",
    }),
}

CAPAS_INTERNAS = tuple(PROHIBIDOS)


# ══════════════════════════════════════════════════════════════════════════════
# El verificador. Funciones puras sobre una ruta: lo mismo que corre contra
# app/ corre contra el arbol plantado del test del test.
# ══════════════════════════════════════════════════════════════════════════════


def modulos_python(raiz: Path) -> list[Path]:
    """Todos los .py bajo `raiz`, en orden estable. Incluye los __init__.py.

    Los __init__.py NO se excluyen: `app/dominio/__init__.py` con un
    `from app.adaptadores...` dentro es exactamente igual de grave, y es donde
    mas facil pasa desapercibido porque casi nadie lo abre.
    """
    if not raiz.is_dir():
        return []
    return sorted(p for p in raiz.rglob("*.py") if "__pycache__" not in p.parts)


def imports_de(archivo: Path) -> list[tuple[str, int, int]]:
    """Devuelve (modulo, level, linea) por cada import del archivo.

    Para `from app import adaptadores` se emiten DOS entradas: "app" y
    "app.adaptadores". Sin la segunda, esa forma —perfectamente valida— esquiva
    la lista de prohibidos, porque el `module` del AST es solo "app".
    """
    arbol = ast.parse(archivo.read_text(encoding="utf-8"), filename=str(archivo))
    encontrados: list[tuple[str, int, int]] = []
    for nodo in ast.walk(arbol):
        if isinstance(nodo, ast.Import):
            for alias in nodo.names:
                encontrados.append((alias.name, 0, nodo.lineno))
        elif isinstance(nodo, ast.ImportFrom):
            base = nodo.module or ""
            encontrados.append((base, nodo.level, nodo.lineno))
            for alias in nodo.names:
                if alias.name != "*":
                    compuesto = f"{base}.{alias.name}" if base else alias.name
                    encontrados.append((compuesto, nodo.level, nodo.lineno))
    return encontrados


def _coincide(modulo: str, prohibido: str) -> bool:
    return modulo == prohibido or modulo.startswith(prohibido + ".")


def violaciones(raiz: Path, capa: str) -> list[str]:
    """Las violaciones de `capa` en el arbol `raiz`. Lista vacia = limpio."""
    prohibidos = PROHIBIDOS[capa]
    fallos: list[str] = []
    for archivo in modulos_python(raiz):
        try:
            imports = imports_de(archivo)
        except SyntaxError as e:
            # Un archivo que no compila NO se ignora: seria la forma trivial de
            # esconder un import prohibido detras de un error de sintaxis.
            fallos.append(f"{archivo}: no compila (linea {e.lineno}: {e.msg})")
            continue
        for modulo, level, linea in imports:
            if level > 0:
                fallos.append(
                    f"{archivo}:{linea}: import RELATIVO (level={level}) a "
                    f"'{'.' * level}{modulo}'. Prohibido en {capa}/: un "
                    f"`from ..adaptadores import x` esquiva la lista de prohibidos "
                    f"y el verificador mentiria"
                )
                continue
            for prohibido in prohibidos:
                if _coincide(modulo, prohibido):
                    fallos.append(
                        f"{archivo}:{linea}: {capa}/ importa '{modulo}' "
                        f"(prohibido: '{prohibido}')"
                    )
                    break
    return fallos


def _raiz_de(capa: str) -> Path:
    return RAIZ_BACKEND / "app" / capa


# ══════════════════════════════════════════════════════════════════════════════
# Los tests
# ══════════════════════════════════════════════════════════════════════════════


@pytest.mark.contrato
@pytest.mark.invariante
@pytest.mark.nucleo
@pytest.mark.t0
@pytest.mark.parametrize("capa", CAPAS_INTERNAS)
def test_la_capa_interna_existe_y_tiene_archivos(capa: str) -> None:
    """`assert archivos` antes del bucle: si no, el test pasaria por vacio.

    Sin esto, borrar `app/dominio/` deja la suite entera en verde. Es el mismo
    fallo que `test_capas` existe para evitar, aplicado a si mismo.
    """
    raiz = _raiz_de(capa)
    exigir(
        raiz.is_dir(),
        f"no existe backend/app/{capa}/. Sin esa carpeta este test no verifica NADA "
        f"y pasaria en verde: un arbol vacio no tiene imports prohibidos.",
    )
    archivos = modulos_python(raiz)
    exigir(
        archivos,
        f"backend/app/{capa}/ existe pero no tiene ningun .py. El test pasaria por vacio.",
    )


@pytest.mark.contrato
@pytest.mark.invariante
@pytest.mark.nucleo
@pytest.mark.t0
@pytest.mark.parametrize("capa", CAPAS_INTERNAS)
def test_la_capa_interna_no_importa_infraestructura(capa: str) -> None:
    raiz = _raiz_de(capa)
    archivos = modulos_python(raiz)
    assert archivos, "el test pasaria por vacio"

    fallos = violaciones(raiz, capa)
    exigir(
        not fallos,
        f"{capa}/ importa infraestructura ({len(fallos)} violaciones):\n"
        + "".join(f"    {f}\n" for f in fallos)
        + "\n  Que hacer: se MUEVE el codigo, no se anade una supresion. El sitio\n"
        "  correcto casi siempre es un puerto en app/aplicacion/puertos/ (typing.Protocol)\n"
        "  y un adaptador que lo implemente en app/adaptadores/salida/.\n"
        "  Si hace falta la supresion de verdad, exige una fila en DEUDA.md, y el CI\n"
        "  cuenta las supresiones y falla si crecen respecto de main.",
    )


@pytest.mark.contrato
@pytest.mark.invariante
@pytest.mark.t0
def test_el_dominio_no_importa_la_aplicacion() -> None:
    """La flecha va hacia adentro y solo hacia adentro.

    No esta en PROHIBIDOS["dominio"] porque esa lista es la de la decision de
    arquitectura y se copia literal; esto es su corolario y se comprueba aparte
    para que el mensaje diga lo que hay que hacer.
    """
    raiz = _raiz_de("dominio")
    archivos = modulos_python(raiz)
    assert archivos, "el test pasaria por vacio"

    fallos = [
        f"{archivo}:{linea}: dominio/ importa '{modulo}'"
        for archivo in archivos
        for modulo, _level, linea in imports_de(archivo)
        if _coincide(modulo, "app.aplicacion")
    ]
    exigir(
        not fallos,
        "el dominio importa la capa de aplicacion:\n"
        + "".join(f"    {f}\n" for f in fallos)
        + "  El dominio no conoce a nadie. Si una politica necesita orquestacion, la\n"
        "  orquestacion vive en aplicacion/casos/ y llama al dominio, no al reves.",
    )


# ══════════════════════════════════════════════════════════════════════════════
# EL TEST DEL TEST — se planta una violacion y se exige que el verificador la vea
# ══════════════════════════════════════════════════════════════════════════════
#
# Sin esto, un `violaciones()` que devolviera siempre [] —por un bug, por una
# regresion en el parseo, o porque alguien "simplifico" la funcion— dejaria la
# compuerta abierta y en verde. El verificador tiene que demostrar que sabe
# encontrar lo que dice buscar.


def _plantar(tmp_path: Path, capa: str, codigo: str) -> Path:
    raiz = tmp_path / capa
    (raiz / "modelo").mkdir(parents=True)
    (raiz / "__init__.py").write_text("", encoding="utf-8")
    (raiz / "modelo" / "sospechoso.py").write_text(codigo, encoding="utf-8")
    return raiz


@pytest.mark.contrato
@pytest.mark.invariante
@pytest.mark.nucleo
@pytest.mark.t0
@pytest.mark.parametrize(
    "codigo,que_se_planta",
    [
        ("from sqlalchemy import select\n", "import absoluto de un paquete prohibido"),
        ("import sqlalchemy.orm\n", "import de submodulo del paquete prohibido"),
        ("from sqlalchemy.orm import Session\n", "import desde un submodulo"),
        ("from app.adaptadores.salida.postgres import motor\n", "import de un adaptador"),
        ("from app import adaptadores\n", "import del paquete adaptadores por su padre"),
        ("import os\n", "import de os en el dominio"),
        ("from fastapi import Depends\n", "import del framework web"),
        # psycopg v3 es el driver que fija requirements-base.txt. Hasta el 2026-09-15 la
        # lista solo nombraba `psycopg2`, y `_coincide("psycopg", "psycopg2")` es False:
        # el driver que de verdad se usa entraba al dominio en verde.
        ("import psycopg\n", "import del driver psycopg v3"),
        ("from psycopg import sql\n", "import desde el driver psycopg v3"),
    ],
)
def test_el_verificador_detecta_la_violacion_plantada(
    tmp_path: Path, codigo: str, que_se_planta: str
) -> None:
    raiz = _plantar(tmp_path, "dominio", codigo)
    fallos = violaciones(raiz, "dominio")
    assert fallos, (
        f"el verificador NO detecto {que_se_planta} ({codigo.strip()!r}). "
        f"Si no detecta una violacion plantada, su verde sobre app/dominio/ no "
        f"significa nada."
    )


@pytest.mark.contrato
@pytest.mark.invariante
@pytest.mark.nucleo
@pytest.mark.t0
@pytest.mark.parametrize(
    "codigo",
    [
        "from ..adaptadores import repositorio\n",
        "from . import otro\n",
        "from ...app.adaptadores import x\n",
    ],
)
def test_el_verificador_detecta_el_import_relativo_plantado(tmp_path: Path, codigo: str) -> None:
    """El import relativo es la unica forma conocida de hacer mentir a este juez."""
    raiz = _plantar(tmp_path, "aplicacion", codigo)
    fallos = violaciones(raiz, "aplicacion")
    assert fallos, (
        f"el verificador NO detecto el import relativo {codigo.strip()!r}. "
        f"Con eso, `from ..adaptadores import x` esquivaria la lista de prohibidos "
        f"y el juez seguiria verde mientras la capa interna importa el ORM."
    )


@pytest.mark.contrato
@pytest.mark.invariante
@pytest.mark.t0
def test_el_verificador_no_se_pone_rojo_por_codigo_legitimo(tmp_path: Path) -> None:
    """Calibracion inversa: un falso positivo mata al juez.

    Si `j02` rechaza un import legitimo, la gente aprende a poner supresiones y en
    tres meses el verificador esta desactivado de hecho. Se comprueba con lo que
    un dominio limpio SI puede importar: la biblioteca estandar de tipos y sus
    propios modulos.
    """
    raiz = _plantar(
        tmp_path,
        "dominio",
        "from __future__ import annotations\n"
        "import datetime\n"
        "from dataclasses import dataclass\n"
        "from decimal import Decimal\n"
        "from enum import StrEnum\n"
        "from typing import Protocol\n"
        "from app.dominio.errores import DominioError\n"
        "\n"
        "# Se menciona sqlalchemy en un comentario, y no pasa nada: se parsea, no se busca\n"
        "# la palabra. Un grep se pondria rojo justamente por esta linea.\n"
        '"""Y tambien en un docstring: fastapi, psycopg2, os."""\n',
    )
    assert violaciones(raiz, "dominio") == []


@pytest.mark.contrato
@pytest.mark.invariante
@pytest.mark.t0
def test_el_verificador_no_se_traga_un_archivo_que_no_compila(tmp_path: Path) -> None:
    """Un SyntaxError no puede ser una via de escape.

    Si `violaciones()` ignorara los archivos que no parsean, esconder un import
    prohibido seria tan facil como dejar el archivo a medio escribir.
    """
    raiz = _plantar(tmp_path, "dominio", "def roto(:\n    pass\n")
    fallos = violaciones(raiz, "dominio")
    assert fallos and "no compila" in fallos[0]
