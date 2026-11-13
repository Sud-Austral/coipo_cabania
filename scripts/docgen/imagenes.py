# -*- coding: utf-8 -*-
"""Catálogo de capturas y su asociación a funcionalidades y casos de uso.

Las produce scripts/capturar_pantallas.py contra la demo local (scripts/demo_docs.py:
frontend del commit 0d44fb3 compilado y servido en local, sin red, con datos ficticios). Los nombres
de archivo salen de decisiones.CAPTURAS; títulos y pies los completa el agente de capturas
DESPUÉS de mirar cada PNG.
"""
import os

from .comun import RAIZ_DOC
from .decisiones import CAPTURAS, FUNCIONALIDADES

DIR = os.path.join(RAIZ_DOC, "_imagenes")

# archivo -> (título, pie). Lo completa quien miró la captura.
from .textos_capturas import TEXTOS


def _clave(archivo):
    return archivo[:-4]


CATALOGO = {_clave(a): (a, TEXTOS.get(a, (a, ""))[0], TEXTOS.get(a, (a, ""))[1]) for a, _r, _f in CAPTURAS}
POR_ROL = {}
POR_FUNCIONALIDAD = {}
for _a, _r, _f in CAPTURAS:
    POR_ROL.setdefault(_r, []).append(_clave(_a))
    if _f and (_r, _f) not in POR_FUNCIONALIDAD:
        POR_FUNCIONALIDAD[(_r, _f)] = _clave(_a)
# Un rol que usa la pantalla de otro reutiliza la captura (sección 7).
for (_r, _f), _k in list(POR_FUNCIONALIDAD.items()):
    if _r == "afiliado":
        for _otro in [c for f in FUNCIONALIDADES if f[0] == _f for c in f[3] if c != "afiliado"]:
            POR_FUNCIONALIDAD.setdefault((_otro, _f), _k)
POR_CASO = {}   # id de caso -> clave; lo completan las áreas si un caso cita una captura


def ruta(clave):
    if clave not in CATALOGO:
        return None
    r = os.path.join(DIR, CATALOGO[clave][0])
    return r if os.path.exists(r) else None


def titulo(clave):
    return CATALOGO[clave][1]


def pie(clave):
    return CATALOGO[clave][2]
