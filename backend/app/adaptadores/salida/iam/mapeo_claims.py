"""De la respuesta de `/oauth/userinfo` a `Identidad` — adaptador de salida, funcion pura.

POR QUE ESTE ARCHIVO EXISTE APARTE DE `cliente_iam.py`
------------------------------------------------------
El mapeo lo necesitan DOS sitios: el cliente real, en el callback, y el doble del IAM
de `tests/conftest.py`, que lo busca aqui por nombre (`a_identidad`). Hasta el
2026-09-15 este modulo no existia: el doble fallaba con `ErrorDeDoble` en toda prueba de
login de cualquier aplicacion sembrada, y el mapeo vivia solo dentro de `ClienteIam`.

Una sola funcion para los dos es lo que impide que el doble normalice el rol de una
manera y produccion de otra: la regla escrita dos veces se separa, y lo hace justo en lo
que nadie especifico (mayusculas, espacios, un `app_id` raro).

Sin HTTP, sin estado, sin configuracion global: se prueba con un dict.
"""

from __future__ import annotations

import logging
from collections.abc import Mapping
from typing import Any

from app.dominio.modelo.identidad import (
    AUSENTE,
    Identidad,
    normalizar_correo,
    normalizar_rol,
)

logger = logging.getLogger(__name__)


def a_identidad(info: Mapping[str, Any], claves_declaradas: tuple[str, ...] = ()) -> Identidad:
    """Normaliza la respuesta de `/oauth/userinfo`.

    `clave in info` y NO `info.get(clave) is None`: ausente y null son casos distintos y
    esa distincion es el puente de transicion entero. Ver el docstring de
    `dominio/modelo/identidad.py`.

    Los atributos se guardan CRUDOS. La coercion ocurre en `Identidad.entero()`, solo para
    la clave que el rol usa de verdad.

    `claves_declaradas` vacio por defecto: asi lo llama el doble del IAM, que no conoce la
    ficha de la aplicacion. El cliente real le pasa las de `AjustesIam`.
    """
    return Identidad(
        sub=str(info.get("sub") or ""),
        usuario=str(info.get("username") or "").strip(),
        correo=normalizar_correo(info.get("email")),
        rol=normalizar_rol(info.get("role")),
        app_id=_app_id(info.get("app_id")),
        atributos={
            clave: (info[clave] if clave in info else AUSENTE)
            for clave in claves_declaradas
        },
    )


def _app_id(crudo: Any) -> int | None:
    """`app_id` es informativo, asi que un valor raro NO tumba el login.

    Distinto de los atributos declarados, que si lo tumban: la diferencia es que sobre
    `app_id` esta aplicacion no decide nada —el IAM ya emitio el token para esta app— y
    sobre un ambito decide todo. Un `None` aca solo deja el campo vacio en el log; un
    ambito mal convertido daria acceso a la gerencia equivocada.
    """
    if crudo is None:
        return None
    try:
        return int(crudo)
    except (TypeError, ValueError):
        logger.warning("El IAM devolvio un app_id no numerico (tipo %s)", type(crudo).__name__)
        return None
