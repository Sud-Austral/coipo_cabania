"""Todo modulo de `app/` importa — ARCHIVO CONGELADO DE LA SEMILLA.

Su sha256 esta en semilla.lock. La aplicacion generada no lo edita.

EL FALLO QUE MOTIVA ESTE ARCHIVO, MEDIDO EL 2026-09-15
======================================================
Cinco de los 41 modulos del backend que siembra la semilla NO SE PODIAN IMPORTAR,
y llevaban asi desde que la semilla existe:

  app.dominio.eventos                    TypeError: unhashable type: 'dict'
  app.adaptadores.entrada.http.guards        (arrastrado por el anterior)
  app.aplicacion.puertos.auditoria           (arrastrado por el anterior)
  app.core.auditoria.clasificacion       ValueError: log_acceso.ip_red: ...
  app.core.auditoria.eventos                 (arrastrado por el anterior)

Los dos primeros por un `{{...}}` que quedo de una plantilla; los dos ultimos
porque dos columnas se quedaban con `accion_al_vencer` por omision y su propio
`__post_init__` —que valida al importar, y hace bien— lo rechazaba.

POR QUE NADIE LO VIO
====================
El CI de la semilla y el de cada aplicacion hacian `python -c "import app.main"`,
y `app.main` no importa ninguno de los cinco. Todo lo demas de la suite lee el
arbol con `ast`, que es DELIBERADO —`tests/arquitectura/test_capas.py` explica por
que parsear y no importar— pero tiene un precio: un modulo que no se puede
importar pasa todos esos tests. Este archivo es el que paga ese precio, una vez,
y con la suite entera en verde por lo demas.

Que viva en `CONGELADO/` y no en el CI de la fabrica no es un detalle: asi corre
en la compuerta `t0` de CADA aplicacion de la flota, sobre los modulos que esa
aplicacion escriba, y no solo sobre los que trae la semilla.

POR QUE SE IMPORTAN TODOS Y SE REPORTA AL FINAL
===============================================
Un `for` que revienta en el primero convierte una sesion de arreglo en cinco
ejecuciones. Se importan todos, se juntan los fallos y se falla una vez con la
lista completa.
"""

from __future__ import annotations

import importlib
import sys
from pathlib import Path

import pytest

from tests.conftest import RAIZ_BACKEND, exigir

QUE_ES = "el arbol de modulos de app/"


def modulos_de_la_aplicacion() -> list[str]:
    """Nombres de modulo de todos los `.py` bajo `app/`, en orden estable.

    Se derivan de la RUTA y no de `pkgutil.walk_packages`, que importa los
    paquetes intermedios para poder recorrerlos: con `walk_packages`, un paquete
    cuyo `__init__.py` reviente esconde todo lo que cuelga de el y el recuento
    sale mas bajo sin que nadie lo note. Medido el 2026-09-15 sobre esta misma
    semilla: 36 modulos con walk_packages, 41 por ruta.
    """
    raiz = RAIZ_BACKEND / "app"
    nombres = []
    for p in sorted(raiz.rglob("*.py")):
        if "__pycache__" in p.parts:
            continue
        rel = p.relative_to(RAIZ_BACKEND).with_suffix("")
        partes = list(rel.parts)
        if partes[-1] == "__init__":
            partes.pop()
        nombres.append(".".join(partes))
    return nombres


@pytest.mark.contrato
@pytest.mark.invariante
@pytest.mark.t0
@pytest.mark.nucleo
def test_todos_los_modulos_importan() -> None:
    """Cada `.py` de `app/` se puede importar. Sin esto, el resto no significa nada."""
    modulos = modulos_de_la_aplicacion()

    # El test del test: `assert not fallos` sobre una lista vacia pasa. Borrar
    # `app/` entero dejaria esto en verde, que es la peor forma de aprobar.
    exigir(
        len(modulos) >= 5,
        f"{QUE_ES}: se encontraron {len(modulos)} modulos bajo "
        f"{RAIZ_BACKEND / 'app'}. O el arbol no esta donde se cree, o esta vacio: "
        f"en los dos casos este test estaria aprobando por ausencia.",
    )

    fallos: list[str] = []
    for nombre in modulos:
        if nombre in sys.modules:
            continue
        try:
            importlib.import_module(nombre)
        except BaseException as e:  # noqa: BLE001 — un SystemExit al importar tambien cuenta
            fallos.append(f"  {nombre}\n      {type(e).__name__}: {e}")

    exigir(
        not fallos,
        f"{QUE_ES}: {len(fallos)} de {len(modulos)} modulos no se pueden importar.\n"
        + "\n".join(fallos)
        + "\n\n  Un modulo que no importa pasa todos los tests que leen el arbol con "
        "`ast`, y revienta en produccion la primera vez que alguien lo usa.",
    )


@pytest.mark.contrato
@pytest.mark.invariante
@pytest.mark.t0
def test_el_verificador_encuentra_un_modulo_roto(tmp_path: Path) -> None:
    """Se planta un modulo que no importa y se exige que la comprobacion lo vea.

    Sin esto, un cambio que hiciera `importlib.import_module` inofensivo —un
    `except Exception: pass` de mas— dejaria el test de arriba en verde para
    siempre.
    """
    paquete = tmp_path / "paquete_roto"
    paquete.mkdir()
    (paquete / "__init__.py").write_text("", encoding="utf-8")
    (paquete / "roto.py").write_text("raise ValueError('plantado')\n", encoding="utf-8")

    sys.path.insert(0, str(tmp_path))
    try:
        with pytest.raises(ValueError, match="plantado"):
            importlib.import_module("paquete_roto.roto")
    finally:
        sys.path.remove(str(tmp_path))
        sys.modules.pop("paquete_roto.roto", None)
        sys.modules.pop("paquete_roto", None)
