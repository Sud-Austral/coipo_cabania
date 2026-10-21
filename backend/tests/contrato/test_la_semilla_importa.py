"""La aplicacion importa y el login se puede mapear — ARCHIVO CONGELADO DE LA SEMILLA.

Su sha256 esta en semilla.lock. La aplicacion generada no lo edita.

EL FALLO QUE MOTIVA ESTE ARCHIVO
================================
La semilla pasaba los nueve jueces y su propia compuerta t0 con un login que NO
PODIA COMPLETARSE. Nadie lo habia visto porque ninguna prueba importaba el arbol
entero ni ejecutaba el mapeo de claims: los tests de contrato leen el arbol con
`ast`, y `ast.parse` acepta codigo que revienta al ejecutarse.

Lo que se encontro ejecutando, no leyendo, y que este archivo vigila:

  - `dominio/modelo/identidad.py` (CONGELADO) definia `class Identidad` DOS veces. La
    segunda pisaba a la primera y `cliente_iam.py` construye la primera: TypeError en
    el callback de la PRIMERA persona que iniciara sesion. Medido el 2026-09-29 al
    sembrar `coipo_avisete`: 26 pruebas t0 en verde con el defecto puesto.
  - `conftest.py` pide `adaptadores/salida/iam/mapeo_claims.py` para que `IamFalso`
    sepa construir una Identidad, y el archivo no existia: toda prueba de login con el
    doble fallaba con ErrorDeDoble.
  - Antes, y ya corregidos en la fabrica (commit 24b2308): `dominio/eventos.py`
    construia su catalogo con `MappingProxyType({{...}})` y `clasificacion.py`
    rechazaba dos columnas sin firma; los dos reventaban al importarse. Se dejan
    escritos porque este archivo es lo que impide que vuelvan.

POR QUE SE IMPORTA TODO Y NO UNA LISTA
======================================
Una lista de modulos escrita a mano es una lista que no se entera del modulo
nuevo. Se recorre `app/` entero: el modulo que una aplicacion agregue manana
queda cubierto sin tocar este archivo.
"""

from __future__ import annotations

import ast
import importlib

import pytest

from tests.conftest import (
    PAYLOADS_DE_FABRICA,
    RAIZ_BACKEND,
    IamFalso,
    exigir,
)

RAIZ_APP = RAIZ_BACKEND / "app"


def _modulos_de_app() -> list[str]:
    """Nombres importables de todos los `.py` de `app/`, en orden estable."""
    nombres: list[str] = []
    for ruta in sorted(RAIZ_APP.rglob("*.py")):
        if "__pycache__" in ruta.parts:
            continue
        partes = ruta.relative_to(RAIZ_BACKEND).with_suffix("").parts
        if partes[-1] == "__init__":
            partes = partes[:-1]
        nombres.append(".".join(partes))
    return nombres


@pytest.mark.contrato
@pytest.mark.invariante
@pytest.mark.nucleo
@pytest.mark.t0
def test_todo_modulo_de_app_importa() -> None:
    modulos = _modulos_de_app()
    exigir(modulos, f"no hay modulos bajo {RAIZ_APP}: la prueba no comprobaria nada")
    fallos: list[str] = []
    for nombre in modulos:
        try:
            importlib.import_module(nombre)
        except Exception as e:  # noqa: BLE001 — se reporta el tipo de CADA modulo roto
            fallos.append(f"    {nombre}: {type(e).__name__}: {e}")
    exigir(
        not fallos,
        f"{len(fallos)} de {len(modulos)} modulos de app/ no importan:\n"
        + "\n".join(fallos)
        + "\n  Un modulo que no importa pasa los jueces (leen con ast) y revienta al arrancar.",
    )


@pytest.mark.contrato
@pytest.mark.invariante
@pytest.mark.nucleo
@pytest.mark.t0
def test_ningun_modulo_define_dos_veces_el_mismo_nombre() -> None:
    duplicados: list[str] = []
    for ruta in sorted(RAIZ_APP.rglob("*.py")):
        if "__pycache__" in ruta.parts:
            continue
        vistos: dict[str, int] = {}
        for nodo in ast.parse(ruta.read_text(encoding="utf-8")).body:
            if isinstance(nodo, (ast.ClassDef, ast.FunctionDef, ast.AsyncFunctionDef)):
                if nodo.name in vistos:
                    duplicados.append(
                        f"    {ruta.relative_to(RAIZ_BACKEND)}: `{nodo.name}` en las lineas "
                        f"{vistos[nodo.name]} y {nodo.lineno}"
                    )
                vistos.setdefault(nodo.name, nodo.lineno)
    exigir(
        not duplicados,
        "hay clases o funciones definidas dos veces en el mismo modulo; gana la ULTIMA y "
        "quien use la primera revienta en ejecucion:\n" + "\n".join(duplicados),
    )


@pytest.mark.contrato
@pytest.mark.invariante
@pytest.mark.nucleo
@pytest.mark.t0
def test_el_cliente_iam_mapea_el_payload_de_userinfo() -> None:
    from app.adaptadores.salida.iam.cliente_iam import AjustesIam, ClienteIam

    cliente = ClienteIam(
        AjustesIam(
            url="http://iam.invalid",
            client_id="test-client-id",
            client_secret="test-client-secret",
            claves_declaradas=("gerencia_id",),
        )
    )
    # `_a_identidad` es la funcion pura que corre en el callback con la respuesta de
    # /oauth/userinfo. Se ejecuta de verdad: importar el modulo no la ejercita.
    identidad = cliente._a_identidad(dict(PAYLOADS_DE_FABRICA["encargado"]))

    exigir(identidad.sub == "1042", f"sub mal mapeado: {identidad.sub!r}")
    exigir(identidad.usuario == "j.perez", f"usuario mal mapeado: {identidad.usuario!r}")
    exigir(identidad.correo == "j.perez@conaf.cl", f"correo mal mapeado: {identidad.correo!r}")
    exigir(identidad.rol == "encargado", f"el rol no se normalizo: {identidad.rol!r}")
    exigir(identidad.app_id == 7, f"app_id mal mapeado: {identidad.app_id!r}")
    exigir(identidad.dato("gerencia_id") == 2, "el atributo declarado no llego a la identidad")


@pytest.mark.contrato
@pytest.mark.invariante
@pytest.mark.nucleo
@pytest.mark.t0
def test_el_doble_del_iam_completa_un_login_sin_mapeador() -> None:
    # Sin `mapeador=`: asi lo construyen las fixtures `iam_falso` e `iam_de_sesion`, de
    # modo que si esto falla, falla toda prueba de login de cualquier aplicacion.
    iam = IamFalso()
    redirect_uri = "http://testserver/auth/callback"
    iam.url_de_autorizacion(estado="estado-de-prueba", redirect_uri=redirect_uri)
    credencial = iam.canjear_codigo(codigo="encargado", redirect_uri=redirect_uri)
    identidad = iam.identidad(credencial)

    exigir(identidad.sub == "1042", f"el doble devolvio otra identidad: {identidad!r}")
    exigir(identidad.rol == "encargado", f"el rol no se normalizo: {identidad.rol!r}")
    exigir(iam.codigos_usados == {"encargado"}, "el doble no registro el canje de un solo uso")
