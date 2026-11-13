# -*- coding: utf-8 -*-
"""Funcionalidades comunes a los cinco perfiles: el ingreso por el selector de perfil y el
reinicio de la demostración (components/layout/AppLayout.jsx, context/RolContext.jsx,
api/store.js). Casos CU-<PFX>-001 (ingreso) y CU-<PFX>-090 (reinicio)."""
from .decisiones import ROLES

ACCESO_TEXTO = ("Sin autenticación: la maqueta no tiene cuentas ni contraseñas. El perfil se elige en "
                "el selector del encabezado («Ver el sistema como») y queda recordado en el navegador (RN-01).")

_ETIQ = {c: n for c, n, *_ in ROLES}
_PFX = {c: p for c, _n, _a, _pi, p in ROLES}
_LLEGADA = {"afiliado": "/catalogo (Catálogo de inmuebles)", "no_afiliado": "/catalogo (Catálogo de inmuebles)",
            "regional": "/regional (Solicitudes de la Región de Valparaíso)",
            "central": "/central (Reservas de toda la red)", "admin": "/admin/inmuebles (Mantención de inmuebles)"}
_USUARIO = {"afiliado": "María Fuentes Rojas", "no_afiliado": "Jorge Pavez Contreras",
            "regional": "Carolina Núñez Vidal", "central": "Patricia Herrera Muñoz",
            "admin": "Administrador del sistema"}

CAMPOS = {}
ENDPOINTS = [
    ["—", "localStorage coipo_rol_v1", "Recordar el perfil elegido en el selector", "Todos"],
    ["—", "localStorage coipo_demo_v1", "Estado de la demostración (reservas, bloqueos, sanciones…); "
                                       "«Reiniciar demostración» lo borra", "Todos"],
]
REGLAS_NUEVAS = []
HALLAZGOS_AREA = [
    ["Alta", "El código de la rama principal NO compila: el commit 3b9bc29 («feat final», 2026-08-27) dejó marcadores de "
     "conflicto «<<<<<<< Updated upstream / >>>>>>> Stashed changes» en api/reservas.js, api/store.js, "
     "pages/publico/FichaInmueble.jsx y pages/publico/Reservar.jsx. Resolver los conflictos por cualquiera de los dos lados "
     "tampoco basta: el lado «upstream» falla por exportaciones que faltan (getDatosTransferencia, "
     "informarPagoTransferencia) y el lado «stash» compila pero usa identificadores sin definir (usuariosSeed, tarifasSeed, "
     "detalles, useSearchParams, rutsInvalidos, rutsDuplicados), y store.js revienta al cargar.",
     "Verificado por el coordinador ejecutando: «npx vite build» sobre el HEAD sale con rc=1 y el error de marcadores de "
     "conflicto; sobre 0d44fb3 sale rc=0; «oxlint -D no-undef» sobre el lado stash lista los identificadores. "
     "No comprobé qué versión está publicada (producción fuera de alcance).",
     "Lo descrito en VERSION_2026.08.25.1/.2 (pago por transferencia, transferencias por confirmar, disponibilidad en la "
     "ficha) no existe en una versión que funcione; este paquete documenta 0d44fb3. Un despliegue desde main fallaría al construir " + "[POR VALIDAR]."],
    ["Media", "No hay autorización fuera de la interfaz: la capa api/ no recibe ni comprueba el perfil; cualquier perfil "
     "puede ejecutar cualquier acción, y /catalogo, /inmuebles/:id y /reservas/:codigo no exigen perfil (App.jsx).",
     "Verificado en el código (RequiereRol.jsx, App.jsx, api/*.js) y observado en las sondas de las cuatro áreas.",
     "Aceptable en una maqueta; la fase 2 debe poner la autorización en el servidor."],
]
SONDAS_AREA = []


def funcionalidad(nombre, rol):
    et = _ETIQ[rol]
    if nombre == "Ingresar con el selector de perfil":
        return {
            "objetivo": "Entrar a la maqueta con el perfil %s." % et,
            "quien": et + " (cualquier persona que abra la maqueta puede elegir cualquier perfil).",
            "precondiciones": ["Abrir la dirección de la maqueta en un navegador con JavaScript."],
            "pasos": ["Abrir la maqueta: la primera vez entra como Afiliado/a (perfil por defecto).",
                      "En el encabezado, a la derecha, abrir el selector «Ver el sistema como».",
                      "Elegir «%s»." % et,
                      "La aplicación lleva a la pantalla de llegada del perfil: %s." % _LLEGADA[rol]],
            "resultado": "El encabezado muestra a «%s» y el menú del perfil %s; el pie dice «Perfil actual: %s»."
                         % (_USUARIO[rol], et, et),
            "validaciones": ["No se pide contraseña ni se verifica identidad (RN-01)."],
            "errores": [],
            "consideraciones": ["El perfil elegido se recuerda en el navegador (localStorage «coipo_rol_v1»): al volver "
                                "se entra con el último perfil usado.",
                                "No hay «Cerrar sesión»: para dejar el perfil se elige otro en el selector.",
                                "Cada perfil tiene un único usuario ficticio fijo (fixtures/usuarios.js)."],
            "restricciones": ["La separación entre perfiles es solo de interfaz (RN-02)."],
            "alternativos": ["Entrar por un enlace directo a una sección de otro perfil: la app muestra «Esta sección "
                             "corresponde a otro perfil» y el botón «Ver como …» (RN-02)."],
        }
    if nombre == "Reiniciar la demostración":
        return {
            "objetivo": "Volver todos los datos de la maqueta a su estado inicial.",
            "quien": "Cualquier perfil: el botón está en el pie de todas las pantallas.",
            "precondiciones": [],
            "pasos": ["En el pie de la pantalla, pulsar «Reiniciar demostración».",
                      "Leer el diálogo «Reiniciar la demostración».",
                      "Pulsar «Reiniciar» (o «Cancelar» para no hacer nada)."],
            "resultado": "Se descartan las reservas, confirmaciones, bloqueos y sanciones creados en la sesión, "
                         "y la página se recarga con los datos semilla (RN-03).",
            "validaciones": [],
            "errores": [],
            "consideraciones": ["Afecta solo al navegador donde se pulsa: cada navegador tiene su propia copia de los datos.",
                                "No cambia el perfil elegido."],
            "restricciones": ["No se puede deshacer."],
            "alternativos": ["«Cancelar» cierra el diálogo sin cambios."],
        }
    raise KeyError(nombre)


def casos(rol):
    et, p = _ETIQ[rol], _PFX[rol]
    base = {"secundarios": "—", "fa": [], "rn": ["RN-01", "RN-02"], "validaciones": [], "verifica": ""}
    c1 = dict(base, **{
        "id": "CU-%s-001" % p, "nombre": "Ingresar como %s con el selector de perfil" % et,
        "objetivo": "Entrar a la maqueta con el perfil %s." % et,
        "descripcion": "Ingreso sin credenciales eligiendo el perfil en el selector del encabezado.",
        "permisos": "Ninguno: la maqueta no autentica.",
        "precondiciones": ["Maqueta abierta en el navegador."],
        "entradas": ["Perfil: %s" % et],
        "flujo": ["Abrir el selector «Ver el sistema como» del encabezado.", "Elegir «%s»." % et,
                  "Comprobar que se abre %s." % _LLEGADA[rol]],
        "resultado": "Se ve la pantalla de llegada del perfil y el nombre «%s» en el encabezado." % _USUARIO[rol],
        "fe": [["FE-01", "Entrar por un enlace de otro perfil: aparece «Esta sección corresponde a otro perfil»."]],
        "datos": "localStorage «coipo_rol_v1».",
        "traz": ["Encabezado", "Ingresar con el selector de perfil", "AppLayout", "RolContext (sin API)", "—"],
    })
    c2 = dict(base, **{
        "id": "CU-%s-090" % p, "nombre": "Reiniciar la demostración", "rn": ["RN-03"],
        "objetivo": "Dejar los datos de la maqueta como al inicio.",
        "descripcion": "Desde el pie, descartar todo lo creado en la sesión.",
        "permisos": "Ninguno.",
        "precondiciones": ["Haber ingresado como %s." % et, "Haber creado o cambiado algún dato (opcional)."],
        "entradas": [],
        "flujo": ["Pulsar «Reiniciar demostración» en el pie.", "En el diálogo «Reiniciar la demostración», pulsar «Reiniciar»."],
        "resultado": "La página se recarga y los cambios de la sesión desaparecen.",
        "fa": [["FA-01", "Pulsar «Cancelar»: no cambia nada."]], "fe": [],
        "datos": "Borra localStorage «coipo_demo_v1».",
        "traz": ["Pie", "Reiniciar la demostración", "AppLayout", "reiniciarDemo() (api/store.js)", "—"],
    })
    return [c1, c2]
