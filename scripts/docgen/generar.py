# -*- coding: utf-8 -*-
"""Genera los DOCX y el XLSX de docs/Documentacion_Sistema2 desde los módulos de datos."""
import os
import re
import unicodedata

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

from . import imagenes, roles
from .comun import (FECHA, PV, RAIZ_DOC, VERSION, aviso, imagen, nuevo_documento, parrafo, pasos,
                    tabla, titulo, vinetas)
from .datos_base import (ACCESO, ESTADOS, MATRIZ_PERMISOS, HALLAZGOS, HALLAZGOS_CAPTURAS, MATRIZ_ROLES, NEGATIVAS, REGLAS_COMUNES,
                         ROLES_NO_APLICABLES, SONDAS, HALLAZGOS_CAPTURAS_BASE)

MODULOS = roles.MODULOS
REGLAS_NEGOCIO = REGLAS_COMUNES + roles.REGLAS_NUEVAS

# Integración (sección 8): un id por defecto, numerados después de leer los informes.
_ORDEN_SEV = {"Alta": 0, "Media": 1, "Baja": 2, "Por validar": 3, "Riesgo aceptado": 4}
# Un defecto, un id: estos dos los vieron dos áreas; se conserva una sola fila (la del portal).
_DUPLICADOS = ("Una sanción vigente no impide reservar, aunque", "Días máximos por afiliado no se aplican")
_h = sorted([h for a in roles.AREAS.values() for h in a.HALLAZGOS_AREA if not h[1].startswith(_DUPLICADOS)],
            key=lambda h: _ORDEN_SEV.get(h[0], 9))
HALLAZGOS = HALLAZGOS + [["H-%02d" % (i + 1)] + list(h) for i, h in enumerate(_h)]
HALLAZGOS_CAPTURAS = HALLAZGOS_CAPTURAS + [["HC-%02d" % (i + 1)] + list(h) for i, h in enumerate(HALLAZGOS_CAPTURAS_BASE)]
SONDAS = SONDAS + [list(x) for a in roles.AREAS.values() for x in a.SONDAS_AREA]
DIR = {k: os.path.join(RAIZ_DOC, v) for k, v in (("analisis", "00_Analisis"), ("manuales", "01_Manuales"),
                                                ("casos", "02_Casos_de_Uso"), ("qa", "03_QA"),
                                                ("traz", "04_Trazabilidad"))}

GLOSARIO = [
    ["Maqueta", "Versión de validación solo-frontend: sin servidor, sin base de datos y con datos ficticios."],
    ["Selector de perfil", "Lista «Ver el sistema como» del encabezado: reemplaza al inicio de sesión en la maqueta."],
    ["Casa de huéspedes", "Inmueble con tarifa por persona y por noche."],
    ["Casa de veraneo", "Inmueble con tarifa fija por noche para el grupo familiar."],
    ["Beneficiario", "Titular afiliado, cónyuge o conviviente civil e hijo/a inscrito (RN-12)."],
    ["Lista de espera", "Estado de una solicitud sin cupo en las fechas pedidas (RN-07)."],
    ["Prelación", "Orden por motivo: médica, laboral, personal (RN-17)."],
    ["Nómina de descuentos", "Cobros que Oficina Central informa a Remuneraciones para descontar por planilla."],
    ["Pista de auditoría", "Registro de quién hizo qué y cuándo (RN-04)."],
    [PV, "Información que no pudo determinarse leyendo el sistema y requiere confirmación."],
]


def _d(k):
    os.makedirs(DIR[k], exist_ok=True)
    return DIR[k]


def sin_tildes(s):
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn").lower()


def categoria(c):
    t = sin_tildes(c["nombre"] + " " + c["descripcion"])
    if "seguridad" in t or "fuera de" in t or "intentar" in t or "sin permiso" in t or "otra region" in t:
        return "Seguridad"
    if "ingresar" in t or "sesion" in t:
        return "Acceso"
    if "descargar" in t or "exportar" in t or "pdf" in t:
        return "Descargas"
    if "corregir" in t or "anular" in t or "eliminar" in t:
        return "Corrección"
    if "registrar" in t or "crear" in t or "aplicar" in t or "cargar" in t:
        return "Registro"
    return "Consulta"


# ------------------------------------------------------------------ cobertura
def cobertura():
    """Por funcionalidad: casos que la declaran, casos cuyo flujo nombra su rótulo y si todos son de error."""
    filas = []
    for mod in MODULOS:
        for f in mod.ROL["funcionalidades"]:
            casos = [c for c in mod.CASOS if c["traz"][1] == f["nombre"]]
            rot = sin_tildes(mod.ROTULOS[f["nombre"]])
            nombran = [c["id"] for c in casos if rot in sin_tildes(" ".join(c["flujo"]))]
            solo_error = bool(casos) and all(categoria(c) == "Seguridad" for c in casos)
            filas.append([mod.ROL["nombre"], f["nombre"], mod.ROTULOS[f["nombre"]], len(casos),
                          ", ".join(c["id"] for c in casos), ", ".join(nombran) or "NINGUNO",
                          "Sí" if solo_error else "No"])
    return filas


def validar():
    """Validaciones por script (sección 8.3 del prompt). Devuelve la lista de errores."""
    err = []
    archivos = {v[0] for v in imagenes.CATALOGO.values()}
    en_disco = set(os.listdir(imagenes.DIR)) if os.path.isdir(imagenes.DIR) else set()
    err += ["captura sin archivo: %s" % a for a in sorted(archivos - en_disco)]
    err += ["archivo sin clave: %s" % a for a in sorted(en_disco - archivos)]
    ids_rn = [r[0] for r in REGLAS_NEGOCIO]
    if len(ids_rn) != len(set(ids_rn)):
        err.append("ids de regla duplicados")
    for mod in MODULOS:
        nombres = {f["nombre"] for f in mod.ROL["funcionalidades"]}
        ids = [c["id"] for c in mod.CASOS]
        if len(ids) != len(set(ids)):
            err.append("ids de caso duplicados")
        err += ["CAMPOS huérfano: %s" % k for k in mod.CAMPOS if k not in nombres]
        err += ["ROTULOS huérfano: %s" % k for k in mod.ROTULOS if k not in nombres]
        err += ["%s: funcionalidad inexistente %s" % (c["id"], c["traz"][1]) for c in mod.CASOS if c["traz"][1] not in nombres]
        err += ["%s cita regla indefinida %s" % (c["id"], r) for c in mod.CASOS for r in c["rn"] if r not in ids_rn]
        for (rol, fn), clave in imagenes.POR_FUNCIONALIDAD.items():
            if rol == mod.ROL["clave"] and (fn not in nombres or clave not in imagenes.CATALOGO):
                err.append("mapeo de imagen roto: %s / %s" % (rol, fn))
    todos = {c["id"] for m in MODULOS for c in m.CASOS}
    err += ["POR_CASO con caso inexistente: %s" % k for k in imagenes.POR_CASO if k not in todos]
    ids_todos = [c["id"] for m in MODULOS for c in m.CASOS]
    if len(ids_todos) != len(set(ids_todos)):
        err.append("ids de caso duplicados entre roles")
    for mod in MODULOS:
        claves = ["id", "nombre", "objetivo", "descripcion", "permisos", "precondiciones", "entradas", "flujo",
                  "resultado", "fa", "fe", "rn", "validaciones", "datos", "traz", "verifica"]
        err += ["%s sin clave %s" % (c["id"], k) for c in mod.CASOS for k in claves if k not in c]
    return err


# ------------------------------------------------------------------ análisis
def generar_analisis():
    doc = nuevo_documento("Análisis del sistema y matriz de roles", "Todos los roles", "Análisis funcional",
                          "Roles, permisos, reglas, hallazgos y cobertura. Es el documento de partida: el manual "
                          "y los casos de uso derivan de aquí.")
    titulo(doc, "1. El sistema", 1)
    parrafo(doc, "Maqueta de validación del sistema de reservas de la Red de Casas de Huéspedes y Veraneo del "
                 "Servicio de Bienestar CONAF: catálogo de 34 inmuebles, solicitud de reserva con cálculo de tarifa, "
                 "gestión regional (confirmar, lista de espera, check-in y check-out, bloqueos), descuentos por planilla, "
                 "reportes, sanciones y administración de inmuebles y temporadas. No tiene servidor: la «API» se emula "
                 "en el navegador y los datos son ficticios.")
    tabla(doc, ["Aspecto", "Detalle"], [
        ["Módulos", "Portal de reservas (catálogo, ficha, solicitud, comprobante, mis reservas), Encargada regional "
                    "(solicitudes y calendario operativo), Oficina Central (reservas del país, nómina, reportes, sanciones) "
                    "y Administrador (inmuebles, temporadas, nómina de afiliados, auditoría)"],
        ["Autenticación", "Ninguna: selector de perfil «Ver el sistema como» (RN-01)"],
        ["Integraciones", "Ninguna. Mapa con teselas de OpenStreetMap en la ficha del inmueble"],
        ["Datos", "Semillas en frontend/src/fixtures y estado en localStorage del navegador (RN-03)"],
        ["Tecnología", "React 19 + Vite, servido por nginx; backend FastAPI + PostgreSQL previsto para la fase 2"],
        ["Versión documentada", "Commit 0d44fb3 (2026-08-12), el último que compila; el HEAD (3b9bc29) no compila"],
    ], anchos=[4, 12])
    imagen(doc, "10-reg-solicitudes", ancho_cm=15)

    titulo(doc, "1 bis. Qué cambió desde la versión anterior", 1)
    parrafo(doc, "No hay versión anterior: esta es la primera versión del paquete documental en este repositorio "
                 "(no existía docs/Documentacion_Sistema). Se generó el %s desde el código de la rama manueales2, "
                 "creada desde origin/main (HEAD aeb3d7b). Se documenta el código del commit 0d44fb3 porque el HEAD no compila (hallazgo H-01)." % FECHA)
    tabla(doc, ["Fecha", "Cambio", "Dónde está el detalle"], [
        [FECHA, "Primera versión: análisis, manuales y casos de uso por rol, checklist QA, trazabilidad, capturas y PDF",
         "README.md del paquete"],
        [FECHA, "Documentos previos del repositorio (docs/ALCANCE.md, docs/GUIA_INDUCCION.md, VERSION_2026.08.25.*.md) "
                "se usaron como pista y se contrastaron con el código; no se modificaron.", "docs/"],
        [FECHA, "Lo que describen VERSION_2026.08.25.1 y .2 (pago por transferencia, transferencias por confirmar, "
                "disponibilidad en la ficha) está a medias en el HEAD, que no compila: no se documenta como "
                "funcionalidad.", "Hallazgo H-01"],
    ], anchos=[2.5, 9, 4.5])

    titulo(doc, "2. Matriz de roles", 1)
    tabla(doc, ["Rol", "Descripción", "Acceso", "Funcionalidades principales", "Restricciones"], MATRIZ_ROLES,
          anchos=[2.6, 3, 3, 4, 3.4])
    titulo(doc, "3. Roles que NO se documentan como perfiles de uso", 1)
    tabla(doc, ["Nombre", "Qué es", "Por qué no aplica"], ROLES_NO_APLICABLES, anchos=[3.5, 4.5, 8])

    titulo(doc, "4. Matriz de permisos por acción", 1)
    parrafo(doc, "No hay servidor: la separación la hace la interfaz (RequiereRol y el menú, RN-02); la capa de datos "
                 "acepta cualquier acción de cualquier perfil (ver sondas). Leyenda: Sí · Región (la de su usuario) · "
                 "Propias · Por URL (sin menú) · No (aviso) = la pantalla lo impide · No.")
    tabla(doc, ["Acción", "Afiliado/a", "Usuario no afiliado", "Encargada regional", "Oficina Central", "Administrador"],
          MATRIZ_PERMISOS, anchos=[4.6, 2.2, 2.2, 2.4, 2.3, 2.3])

    titulo(doc, "5. Estados", 1)
    tabla(doc, ["Entidad", "Estados", "Cómo cambia"], ESTADOS, anchos=[3.5, 5.5, 7])

    titulo(doc, "6. Reglas de negocio", 1)
    tabla(doc, ["ID", "Regla", "Descripción", "Dónde vive"], REGLAS_NEGOCIO, anchos=[1.5, 3, 7.5, 4])

    titulo(doc, "7. Hallazgos y puntos por validar", 1)
    aviso(doc, "Leerlos ANTES de ejecutar el checklist: condicionan qué pruebas son concluyentes.")
    tabla(doc, ["ID", "Severidad", "Hallazgo", "Estado y evidencia", "Efecto"], HALLAZGOS, anchos=[1.3, 1.8, 6, 4.4, 2.5])
    titulo(doc, "7 bis. Hallazgos encontrados al capturar las pantallas", 1)
    parrafo(doc, "Salen de mirar la aplicación funcionando con la demo, no de leer el código.")
    tabla(doc, ["ID", "Severidad", "Hallazgo", "Estado y evidencia", "Efecto"], HALLAZGOS_CAPTURAS, anchos=[1.3, 1.8, 6, 4.4, 2.5])
    imagen(doc, "20-gen-otro-perfil", ancho_cm=14)

    titulo(doc, "7 ter. Sondas fijas ejecutadas", 1)
    parrafo(doc, "Corridas el %s con Node contra la capa de datos de la maqueta (frontend/src/api del commit 0d44fb3), "
                 "con el estado en memoria y datos ficticios. Sin red ni producción." % FECHA)
    tabla(doc, ["Sonda", "Rol", "Qué se intentó", "Resultado observado"], SONDAS, anchos=[3, 2.5, 5.5, 5])

    titulo(doc, "8. Cobertura", 1)
    filas = cobertura()
    total_f = len(filas)
    con_caso = sum(1 for f in filas if f[3] > 0)
    nombran = sum(1 for f in filas if f[5] != "NINGUNO")
    tabla(doc, ["Indicador", "Valor"], [
        ["Roles documentados", len(MODULOS)],
        ["Funcionalidades", total_f],
        ["Casos de uso", sum(len(m.CASOS) for m in MODULOS)],
        ["Funcionalidades con al menos un caso", "%d de %d" % (con_caso, total_f)],
        ["Funcionalidades cuyo rótulo aparece en el flujo de algún caso", "%d de %d" % (nombran, total_f)],
        ["Funcionalidades cuyo único caso es de seguridad o error", sum(1 for f in filas if f[6] == "Sí")],
        ["Capturas", len(imagenes.CATALOGO)],
    ], anchos=[10, 6])
    parrafo(doc, "La cobertura se calcula: cruce por la funcionalidad que declara cada caso y, para que no sea "
                 "tautológica, búsqueda del rótulo de la app en el flujo del caso (sin tildes).")
    tabla(doc, ["Rol", "Funcionalidad", "Rótulo", "Casos", "IDs", "Flujo nombra el rótulo", "Solo error"], filas,
          anchos=[2.2, 3.8, 2.2, 1.2, 2.6, 2.4, 1.6])
    ruta = os.path.join(_d("analisis"), "Analisis_y_Matriz_de_Roles.docx")
    doc.save(ruta)
    return ruta


# ------------------------------------------------------------------ manual
def generar_manual(mod):
    rol = mod.ROL
    doc = nuevo_documento("Manual de Usuario", rol["nombre"], "Manual de Usuario", rol["resumen"])
    titulo(doc, "1. Objetivo del manual", 1)
    parrafo(doc, rol["objetivo"])
    titulo(doc, "2. Alcance", 1)
    parrafo(doc, "Este manual cubre:")
    vinetas(doc, rol["alcance"])
    parrafo(doc, "Queda fuera:")
    vinetas(doc, rol["fuera_alcance"])
    titulo(doc, "Novedades de la versión %s (%s)" % (VERSION, FECHA), 2)
    tabla(doc, ["Qué cambió", "Qué significa para este rol"], [
        ["Primera versión del manual", "No hay versión anterior: todo lo descrito es el comportamiento vigente."]],
        anchos=[6, 10])
    titulo(doc, "3. Requisitos de acceso", 1)
    parrafo(doc, "Forma de acceso: " + rol["acceso"])
    vinetas(doc, rol["requisitos"])
    titulo(doc, "4. Inicio de sesión", 1)
    primera = rol["funcionalidades"][0]
    parrafo(doc, "Cómo se ingresa:")
    pasos(doc, primera["pasos"])
    parrafo(doc, "Resultado esperado: " + primera["resultado"])
    if True:
        parrafo(doc, "Cerrar sesión: no existe en la maqueta. Para dejar el perfil se elige otro en el selector.")
    titulo(doc, "5. Problemas de acceso", 1)
    tabla(doc, ["Situación", "Qué hacer"], [
        ["«Esta sección corresponde a otro perfil»", "Pulsar «Ver como …» o elegir el perfil en el selector."],
        ["Los datos no son los esperados", "Cada navegador guarda su propia copia; «Reiniciar demostración» vuelve al inicio."],
        ["Pantalla en blanco", "La versión actual del repositorio no compila (H-01): usar una versión publicada que funcione."],
    ], anchos=[7, 9])
    titulo(doc, "6. Interfaz principal", 1)
    tabla(doc, ["Elemento", "Descripción"], rol["interfaz"], anchos=[4, 12])
    titulo(doc, "7. Recorrido de pantallas", 1)
    parrafo(doc, "Capturas de la maqueta real (commit 0d44fb3) servida en local, sin red, con los datos de "
                 "demostración pasados a identificadores obviamente ficticios (RUT del bloque 99.999.xxx, "
                 "correos @ejemplo.cl). No son datos de personas reales.")
    for clave in imagenes.POR_ROL.get(rol["clave"], []):
        imagen(doc, clave)
    titulo(doc, "8. Funcionalidades", 1)
    for i, f in enumerate(rol["funcionalidades"], start=1):
        titulo(doc, "8.%d %s" % (i, f["nombre"]), 2)
        parrafo(doc, "Objetivo: " + f["objetivo"])
        parrafo(doc, "Quién puede utilizarla: " + f["quien"])
        if f["precondiciones"]:
            parrafo(doc, "Precondiciones:", negrita=True); vinetas(doc, f["precondiciones"])
        clave = imagenes.POR_FUNCIONALIDAD.get((rol["clave"], f["nombre"]))
        if clave:
            imagen(doc, clave, ancho_cm=14, con_titulo=False)
        parrafo(doc, "Pasos:", negrita=True); pasos(doc, f["pasos"])
        parrafo(doc, "Resultado esperado:", negrita=True); parrafo(doc, f["resultado"])
        campos = mod.CAMPOS.get(f["nombre"])
        if campos:
            parrafo(doc, "Campos de la pantalla:", negrita=True)
            tabla(doc, ["Campo", "¿Obligatorio?", "Regla", "Notas"], campos, anchos=[3.6, 2.2, 5.2, 5])
        for etiqueta, k in (("Validaciones:", "validaciones"), ("Consideraciones:", "consideraciones"),
                            ("Restricciones:", "restricciones"), ("Flujos alternativos:", "alternativos")):
            if f[k]:
                parrafo(doc, etiqueta, negrita=True); vinetas(doc, f[k])
        if f["errores"]:
            parrafo(doc, "Mensajes:", negrita=True)
            tabla(doc, ["Mensaje", "Cuándo aparece"], f["errores"], anchos=[7, 9])
    titulo(doc, "9. Servicios que usa este rol", 1)
    tabla(doc, ["Método", "Ruta", "Para qué", "Quién puede"], mod.ENDPOINTS, anchos=[1.8, 6, 5.5, 2.7])
    titulo(doc, "10. Códigos de respuesta", 1)
    parrafo(doc, "La maqueta emula las respuestas de la futura API: un error llega como {status, detail}.")
    tabla(doc, ["Código", "Significado", "Qué implica"], [
        ["200", "Correcto", "Datos entregados o cambio guardado en el navegador."],
        ["404", "No existe", "Reserva, inmueble, sanción, bloqueo o período no encontrado."],
        ["409", "Conflicto", "Valoración repetida o de una estadía no finalizada (RN-16)."],
        ["422", "Dato inválido", "Fechas, ocupantes, capacidad o estrellas fuera de regla (RN-08, RN-09, RN-16)."],
        ["401 / 403", "No existen", "La maqueta no autentica ni deniega por perfil (RN-02)."],
    ], anchos=[2.6, 3.4, 10])
    titulo(doc, "11. Errores frecuentes", 1)
    tabla(doc, ["Problema", "Causa probable", "Solución"], rol["errores_frecuentes"], anchos=[5, 5.5, 5.5])
    titulo(doc, "12. Buenas prácticas", 1)
    vinetas(doc, rol["buenas_practicas"])
    titulo(doc, "13. Preguntas frecuentes", 1)
    tabla(doc, ["Pregunta", "Respuesta"], rol["faq"], anchos=[6, 10])
    titulo(doc, "14. Glosario", 1)
    tabla(doc, ["Término", "Significado"], GLOSARIO, anchos=[4, 12])
    ruta = os.path.join(_d("manuales"), "Manual_%s.docx" % rol["archivo"])
    doc.save(ruta)
    return ruta


# ------------------------------------------------------------------ casos
def generar_casos(mod):
    rol = mod.ROL
    doc = nuevo_documento("Casos de Uso", rol["nombre"], "Casos de Uso",
                          "Casos de uso derivados de las funcionalidades reales. Total: %d casos." % len(mod.CASOS))
    titulo(doc, "1. Resumen de casos de uso", 1)
    tabla(doc, ["ID", "Nombre", "Funcionalidad", "Categoría"],
          [[c["id"], c["nombre"], c["traz"][1], categoria(c)] for c in mod.CASOS], anchos=[1.6, 6.4, 5, 3])
    titulo(doc, "2. Reglas de negocio referenciadas", 1)
    usadas = {r for c in mod.CASOS for r in c["rn"]}
    tabla(doc, ["ID", "Regla", "Descripción", "Dónde vive"], [r for r in REGLAS_NEGOCIO if r[0] in usadas],
          anchos=[1.5, 3, 7.5, 4])
    titulo(doc, "3. Casos de uso", 1)
    for c in mod.CASOS:
        titulo(doc, "%s - %s" % (c["id"], c["nombre"]), 2)
        tabla(doc, ["Campo", "Valor"], [["Actor principal", rol["nombre"]], ["Actores secundarios", c["secundarios"]],
                                        ["Categoría", categoria(c)], ["Permisos requeridos", c["permisos"]]], anchos=[4, 12])
        parrafo(doc, "Objetivo: " + c["objetivo"])
        clave = imagenes.POR_CASO.get(c["id"])
        if clave:
            imagen(doc, clave, ancho_cm=13, con_titulo=False)
        parrafo(doc, "Precondiciones:", negrita=True); vinetas(doc, c["precondiciones"])
        parrafo(doc, "Datos de entrada:", negrita=True); vinetas(doc, c["entradas"] or ["Ninguno"])
        parrafo(doc, "Flujo principal:", negrita=True); pasos(doc, c["flujo"])
        parrafo(doc, "Resultado esperado:", negrita=True); parrafo(doc, c["resultado"])
        if c["fa"]:
            parrafo(doc, "Flujos alternativos:", negrita=True); tabla(doc, ["ID", "Descripción"], c["fa"], anchos=[2, 14])
        if c["fe"]:
            parrafo(doc, "Flujos de excepción:", negrita=True); tabla(doc, ["ID", "Descripción"], c["fe"], anchos=[2, 14])
        if c["rn"]:
            parrafo(doc, "Reglas de negocio involucradas: " + ", ".join(c["rn"]))
        if c["verifica"]:
            parrafo(doc, "Verificación: " + c["verifica"], cursiva=True)
        parrafo(doc, "Datos generados o modificados: " + c["datos"])
        parrafo(doc, "Trazabilidad:", negrita=True)
        tabla(doc, ["Módulo", "Funcionalidad", "Pantalla", "Servicio", "Tablas"], [c["traz"]], anchos=[2.4, 3.6, 3, 4.4, 2.6])
    ruta = os.path.join(_d("casos"), "Casos_Uso_%s.docx" % rol["archivo"])
    doc.save(ruta)
    return ruta


# ------------------------------------------------------------------ QA
def generar_qa():
    doc = nuevo_documento("Checklist de QA", "Todos los roles", "Checklist QA",
                          "Una ficha por caso de uso, más pruebas negativas y de acceso. Todas parten en NOT TESTED.")
    titulo(doc, "1. Cómo se usa este documento", 1)
    parrafo(doc, "Ejecutar cada ficha en un ambiente de pruebas (nunca en producción), anotar el resultado obtenido "
                 "y el estado. Leer antes los hallazgos de la sección 7 del análisis.")
    titulo(doc, "2. Estados permitidos", 1)
    tabla(doc, ["Estado", "Cuándo se usa"], [["OK", "El resultado coincide con el esperado"],
                                              ["FALLA", "No coincide; registrar evidencia"],
                                              ["BLOQUEADO", "No se pudo ejecutar por una precondición"],
                                              ["NOT TESTED", "Aún no se ejecuta (estado inicial)"]], anchos=[4, 12])
    titulo(doc, "3. Identificación de la ejecución", 1)
    tabla(doc, ["Campo", "Valor"], [["Probador", ""], ["Fecha", ""], ["Ambiente y URL", ""], ["Commit o versión", ""],
                                    ["Navegador", ""]], anchos=[5, 11])
    casos = [(m.ROL["nombre"], c) for m in MODULOS for c in m.CASOS]
    titulo(doc, "4. Matriz de ejecución", 1)
    tabla(doc, ["ID", "Caso de uso", "Resultado esperado", "Estado"],
          [[c["id"], c["nombre"], c["resultado"], "NOT TESTED"] for _r, c in casos], anchos=[1.6, 5, 7, 2.4])
    titulo(doc, "5. Fichas de prueba", 1)
    for rol, c in casos:
        titulo(doc, "QA-%s - %s" % (c["id"], c["nombre"]), 2)
        tabla(doc, ["Campo", "Valor"], [["Rol", rol], ["Funcionalidad", c["traz"][1]],
                                        ["Reglas", ", ".join(c["rn"]) or "—"], ["Estado inicial", "NOT TESTED"]], anchos=[4, 12])
        parrafo(doc, "Precondiciones:", negrita=True); vinetas(doc, c["precondiciones"])
        parrafo(doc, "Pasos:", negrita=True); pasos(doc, c["flujo"])
        parrafo(doc, "Resultado esperado: " + c["resultado"])
        tabla(doc, ["Campo", "A completar por el probador"], [["Resultado obtenido", ""], ["Estado", ""],
                                                              ["Evidencia", ""], ["Observaciones", ""]], anchos=[4, 12])
    titulo(doc, "6. Pruebas negativas transversales", 1)
    tabla(doc, ["N", "Prueba negativa", "Estado", "Observación"],
          [[i, n, "NOT TESTED", ""] for i, n in enumerate(NEGATIVAS, 1)], anchos=[1, 9, 2.5, 3.5])
    titulo(doc, "7. Pruebas de acceso y del proveedor de identidad", 1)
    parrafo(doc, "La maqueta no tiene proveedor de identidad: se prueba el selector de perfil y la guarda RequiereRol.")
    tabla(doc, ["ID", "Prueba", "Resultado esperado", "Estado"], [a + ["NOT TESTED"] for a in ACCESO], anchos=[2, 6, 6, 2])
    titulo(doc, "8. Pruebas de concurrencia", 1)
    tabla(doc, ["ID", "Escenario", "Resultado esperado", "Estado"], [
        ["QA-CC-01", "Dos pestañas del mismo navegador cambian la misma reserva", "La última escritura pisa a la otra: no hay control de versión " + PV, "NOT TESTED"],
        ["QA-CC-02", "Doble clic en «Enviar solicitud»", "Se registra una sola solicitud " + PV, "NOT TESTED"],
        ["QA-CC-03", "Dos navegadores distintos", "Cada uno ve sus propios datos (RN-03)", "NOT TESTED"],
    ], anchos=[2, 6, 6, 2])
    titulo(doc, "9. Resumen de la ejecución", 1)
    tabla(doc, ["Indicador", "Valor"], [["Fichas", len(casos)], ["OK", ""], ["FALLA", ""], ["BLOQUEADO", ""],
                                        ["NOT TESTED", len(casos)]], anchos=[8, 8])
    ruta = os.path.join(_d("qa"), "Checklist_QA_Casos_de_Uso.docx")
    doc.save(ruta)
    return ruta


# ------------------------------------------------------------------ XLSX
def _hoja(wb, nombre, cab, filas, anchos):
    ws = wb.create_sheet(nombre)
    ws.append(cab)
    for f in filas:
        ws.append([("" if v is None else v) for v in f])
    for i, a in enumerate(anchos, 1):
        ws.column_dimensions[get_column_letter(i)].width = a
    for c in ws[1]:
        c.font = Font(bold=True); c.fill = PatternFill("solid", fgColor="E8F0E8")
    for fila in ws.iter_rows(min_row=2):
        for c in fila:
            c.alignment = Alignment(wrap_text=True, vertical="top")
    ws.freeze_panes = "A2"
    ws.auto_filter.ref = ws.dimensions
    return ws


def generar_trazabilidad():
    wb = Workbook(); wb.remove(wb.active)
    casos = [(m, c) for m in MODULOS for c in m.CASOS]
    _hoja(wb, "Trazabilidad", ["ID", "Rol", "Caso", "Módulo", "Funcionalidad", "Pantalla", "Servicio", "Tablas", "Reglas"],
          [[c["id"], m.ROL["nombre"], c["nombre"], *c["traz"], ", ".join(c["rn"])] for m, c in casos],
          [8, 16, 40, 12, 30, 20, 40, 18, 18])
    ws = _hoja(wb, "Checklist", ["ID", "Caso", "Resultado esperado", "Estado", "Probador", "Fecha", "Observación"],
               [[c["id"], c["nombre"], c["resultado"], "NOT TESTED", "", "", ""] for _m, c in casos],
               [8, 40, 50, 14, 16, 12, 30])
    dv = DataValidation(type="list", formula1='"OK,FALLA,BLOQUEADO,NOT TESTED"', allow_blank=False)
    ws.add_data_validation(dv); dv.add("D2:D%d" % (len(casos) + 1))
    _hoja(wb, "Funcionalidades", ["Rol", "Funcionalidad", "Rótulo", "Casos", "IDs", "Flujo nombra el rótulo", "Solo error"],
          cobertura(), [16, 38, 22, 8, 24, 22, 10])
    _hoja(wb, "Endpoints", ["Método", "Ruta", "Para qué", "Quién puede"], roles.ENDPOINTS, [8, 44, 44, 14])
    _hoja(wb, "Reglas", ["ID", "Regla", "Descripción", "Dónde vive"], REGLAS_NEGOCIO, [8, 26, 70, 36])
    _hoja(wb, "Hallazgos", ["ID", "Severidad", "Hallazgo", "Estado y evidencia", "Efecto"],
          HALLAZGOS + HALLAZGOS_CAPTURAS, [7, 14, 70, 50, 30])
    _hoja(wb, "Sondas", ["Sonda", "Rol", "Qué se intentó", "Resultado"], SONDAS, [24, 16, 60, 60])
    _hoja(wb, "Roles", ["Rol", "Descripción", "Acceso", "Funcionalidades", "Restricciones"], MATRIZ_ROLES, [18, 40, 40, 40, 40])
    ruta = os.path.join(_d("traz"), "Matriz_Trazabilidad.xlsx")
    wb.save(ruta)
    return ruta
