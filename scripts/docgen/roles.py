# -*- coding: utf-8 -*-
"""Arma un «módulo de rol» (apéndice B del prompt v4) por cada rol de decisiones.ROLES.

Cada área (area_*.py) expone:
    funcionalidad(nombre, rol) -> dict   (claves del apéndice B, salvo «nombre»)
    casos(rol)                 -> list   (ids CU-<PFX>-NNN)
    ROL_TEXTO = {rol: {resumen, objetivo, alcance, fuera_alcance, requisitos, interfaz,
                       errores_frecuentes, buenas_practicas, faq}}   (no en area_comun)
    CAMPOS, ENDPOINTS, REGLAS_NUEVAS, HALLAZGOS_AREA, SONDAS_AREA
"""
import types

from . import area_admin, area_central, area_comun, area_portal, area_regional
from .decisiones import FUNCIONALIDADES, ROLES, de_rol

AREAS = {"comun": area_comun, "portal": area_portal, "regional": area_regional,
         "central": area_central, "admin": area_admin}
_TEXTO = {"afiliado": area_portal, "no_afiliado": area_portal, "regional": area_regional,
          "central": area_central, "admin": area_admin}


def _modulo(clave, nombre, archivo, pfx_caso):
    m = types.SimpleNamespace()
    rol = dict(_TEXTO[clave].ROL_TEXTO[clave])
    rol.update({"clave": clave, "nombre": nombre, "archivo": archivo,
                "acceso": area_comun.ACCESO_TEXTO})
    funcs, rotulos, campos = [], {}, {}
    for fnombre, rotulo, area, _roles in de_rol(clave):
        a = AREAS[area]
        f = dict(a.funcionalidad(fnombre, clave))
        f["nombre"] = fnombre
        funcs.append(f)
        rotulos[fnombre] = rotulo
        if fnombre in a.CAMPOS:
            campos[fnombre] = a.CAMPOS[fnombre]
    rol["funcionalidades"] = funcs
    m.ROL, m.ROTULOS, m.CAMPOS = rol, rotulos, campos
    sirve = {f[2] for f in FUNCIONALIDADES if clave in f[3]}
    casos = [c for k, a in AREAS.items() if k in sirve for c in a.casos(clave)]
    m.CASOS = sorted(casos, key=lambda c: c["id"])
    m.ENDPOINTS = [e for a in AREAS.values() for e in a.ENDPOINTS
                   if nombre.lower() in e[3].lower() or "todos" in e[3].lower()]
    m.PFX = pfx_caso
    return m


MODULOS = [_modulo(c, n, a, pc) for c, n, a, _pi, pc in ROLES]
ENDPOINTS = [e for a in AREAS.values() for e in a.ENDPOINTS]
REGLAS_NUEVAS = [r for a in AREAS.values() for r in a.REGLAS_NUEVAS]
