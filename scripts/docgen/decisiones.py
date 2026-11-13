# -*- coding: utf-8 -*-
"""Decisiones fijas del coordinador (sección 5 bis y 7 del prompt v4), tomadas ANTES de
escribir el contenido de cada rol. Los módulos de rol las usan textuales.

Primera versión del paquete: no hay v1, así que los nombres de rol salen de la etiqueta que
muestra la app (frontend/src/fixtures/usuarios.js, ROLES[].etiqueta) con la gramática
corregida, y todas las capturas son «sin pariente».
"""

# clave técnica (la del código) -> nombre, archivo, prefijo de captura, prefijo de caso.
# Orden: el del selector de perfil de la app (fixtures/usuarios.js).
ROLES = [
    ("afiliado", "Afiliado/a", "Afiliado", "afi", "AFI"),
    ("no_afiliado", "Usuario no afiliado", "No_Afiliado", "noa", "NOA"),
    ("regional", "Encargada regional", "Encargada_Regional", "reg", "REG"),
    ("central", "Oficina Central", "Oficina_Central", "cen", "CEN"),
    ("admin", "Administrador", "Administrador", "adm", "ADM"),
]

PORTAL = ["afiliado", "no_afiliado"]
TODOS = [r[0] for r in ROLES]

# (nombre de la funcionalidad, rótulo de la app que la identifica, módulo que la escribe, roles)
# El rótulo se buscó en frontend/src (en el comentario: dónde).
FUNCIONALIDADES = [
    # <select> «Ver el sistema como» de components/layout/AppLayout.jsx
    ("Ingresar con el selector de perfil", "Ver el sistema como", "comun", TODOS),
    # pages/publico/Catalogo.jsx titulo
    ("Consultar el catálogo de inmuebles", "Catálogo de inmuebles", "portal", PORTAL),
    # pages/publico/FichaInmueble.jsx h2 «Disponibilidad»
    ("Consultar la ficha del inmueble", "Disponibilidad", "portal", PORTAL),
    # FichaInmueble.jsx botón «Solicitar reserva»; Reservar.jsx paso 4 «Revise y confirme su solicitud»
    ("Solicitar reserva", "Solicitar reserva", "portal", PORTAL),
    # Reservar.jsx paso 1, h2 «Seleccione las fechas»
    ("Seleccionar las fechas", "Seleccione las fechas", "portal", PORTAL),
    # Reservar.jsx paso 2, h2 «Registro de ocupantes»
    ("Registrar los ocupantes", "Registro de ocupantes", "portal", PORTAL),
    # pages/publico/Comprobante.jsx h1
    ("Consultar el comprobante de solicitud", "Comprobante de solicitud", "portal", PORTAL),
    # pages/publico/MisReservas.jsx titulo
    ("Consultar mis reservas", "Mis reservas", "portal", PORTAL),
    # MisReservas.jsx botón «Desistir», modal «Desistir de la reserva»
    ("Desistir de la reserva", "Desistir de la reserva", "portal", PORTAL),
    # MisReservas.jsx botón «Valorar», modal «Valorar la estadía»
    ("Valorar la estadía", "Valorar la estadía", "portal", PORTAL),
    # pages/regional/PanelRegional.jsx titulo «Solicitudes de la Región de …» (sin la región)
    ("Consultar las solicitudes", "Solicitudes por revisar", "regional", ["regional"]),
    # PanelRegional.jsx modal «Confirmar la reserva» (botones «Confirmar» y «Gestionar»)
    ("Confirmar la reserva", "Confirmar la reserva", "regional", ["regional"]),
    # PanelRegional.jsx modal «Rechazar la solicitud»
    ("Rechazar la solicitud", "Rechazar la solicitud", "regional", ["regional"]),
    # components/reservas/ListaEspera.jsx botón «Asignar cupo»
    ("Asignar cupo", "Asignar cupo", "regional", ["regional"]),
    # PanelRegional.jsx modal «Registrar ingreso (check-in)»
    ("Registrar ingreso (check-in)", "Registrar ingreso", "regional", ["regional"]),
    # PanelRegional.jsx modal «Registrar salida (check-out)»
    ("Registrar salida (check-out)", "Registrar salida", "regional", ["regional"]),
    # pages/regional/CalendarioOperativo.jsx titulo
    ("Consultar el calendario operativo", "Calendario operativo", "regional", ["regional"]),
    # CalendarioOperativo.jsx botón «Bloquear fechas»
    ("Bloquear fechas", "Bloquear fechas", "regional", ["regional"]),
    # CalendarioOperativo.jsx aria-label «Levantar bloqueo del …»
    ("Levantar bloqueo", "Levantar bloqueo", "regional", ["regional"]),
    # pages/central/ReservasPais.jsx titulo
    ("Consultar las reservas de toda la red", "Reservas de toda la red", "central", ["central"]),
    # pages/central/NominaDescuentos.jsx titulo
    ("Consultar la nómina de descuentos por planilla", "Nómina de descuentos por planilla", "central", ["central"]),
    # NominaDescuentos.jsx botón «Marcar pendientes como informados (n)»
    ("Marcar pendientes como informados", "Marcar pendientes como informados", "central", ["central"]),
    # NominaDescuentos.jsx botón «Marcar informados como descontados (n)»
    ("Marcar informados como descontados", "Marcar informados como descontados", "central", ["central"]),
    # NominaDescuentos.jsx botón «Exportar CSV»
    ("Exportar la nómina de descuentos", "Exportar CSV", "central", ["central"]),
    # pages/central/Reportes.jsx titulo
    ("Consultar los reportes de uso", "Reportes de uso", "central", ["central"]),
    # Reportes.jsx botón «Exportar CSV»
    ("Exportar los reportes de uso", "Exportar CSV", "central", ["central"]),
    # pages/central/Sanciones.jsx titulo
    ("Consultar los bloqueos y sanciones", "Bloqueos y sanciones", "central", ["central"]),
    # Sanciones.jsx modal «Registrar una sanción»
    ("Registrar una sanción", "Registrar una sanción", "central", ["central"]),
    # Sanciones.jsx modal «Levantar la sanción»
    ("Levantar la sanción", "Levantar la sanción", "central", ["central"]),
    # pages/admin/InmueblesAdmin.jsx titulo «Mantención de inmuebles»
    ("Mantener los inmuebles", "Mantención de inmuebles", "admin", ["admin"]),
    # pages/admin/Temporadas.jsx titulo «Gestión de temporadas»
    ("Gestionar las temporadas", "Gestión de temporadas", "admin", ["admin"]),
    # pages/admin/CargaNomina.jsx titulo
    ("Consultar la nómina de afiliados y cargas familiares", "Nómina de afiliados y cargas familiares", "admin", ["admin"]),
    # pages/admin/Auditoria.jsx titulo
    ("Consultar las pistas de auditoría", "Pistas de auditoría", "admin", ["admin"]),
    # Auditoria.jsx botón «Exportar CSV»
    ("Exportar las pistas de auditoría", "Exportar CSV", "admin", ["admin"]),
    # AppLayout.jsx botón del pie «Reiniciar demostración», modal «Reiniciar la demostración»
    ("Reiniciar la demostración", "Reiniciar demostración", "comun", TODOS),
]


def de_rol(clave):
    """Funcionalidades de un rol, en orden: (nombre, rótulo, módulo, roles)."""
    return [f for f in FUNCIONALIDADES if clave in f[3]]


# (archivo, rol, funcionalidad que ilustra o None). Orden: roles en el orden de ROLES y,
# dentro de cada rol, el de sus funcionalidades. Sin v1: todas son «sin pariente» salvo
# los pasos y diálogos de una misma pantalla (letra).
CAPTURAS = [
    ("01-afi-catalogo.png", "afiliado", "Consultar el catálogo de inmuebles"),
    ("02-afi-ficha.png", "afiliado", "Consultar la ficha del inmueble"),
    ("03-afi-reservar-fechas.png", "afiliado", "Seleccionar las fechas"),
    ("03b-afi-reservar-ocupantes.png", "afiliado", "Registrar los ocupantes"),
    ("03c-afi-reservar-tarifa.png", "afiliado", None),
    ("03d-afi-reservar-confirmar.png", "afiliado", "Solicitar reserva"),
    ("04-afi-comprobante.png", "afiliado", "Consultar el comprobante de solicitud"),
    ("05-afi-mis-reservas.png", "afiliado", "Consultar mis reservas"),
    ("05b-afi-desistir.png", "afiliado", "Desistir de la reserva"),
    ("05c-afi-valorar.png", "afiliado", "Valorar la estadía"),
    ("06-afi-reiniciar.png", "afiliado", "Reiniciar la demostración"),
    ("07-noa-catalogo.png", "no_afiliado", "Consultar el catálogo de inmuebles"),
    ("08-noa-reservar-tarifa.png", "no_afiliado", None),
    ("09-noa-mis-reservas.png", "no_afiliado", "Consultar mis reservas"),
    ("10-reg-solicitudes.png", "regional", "Consultar las solicitudes"),
    ("10b-reg-confirmar.png", "regional", "Confirmar la reserva"),
    ("10c-reg-rechazar.png", "regional", "Rechazar la solicitud"),
    ("10d-reg-lista-espera.png", "regional", "Asignar cupo"),
    ("10e-reg-check-in.png", "regional", "Registrar ingreso (check-in)"),
    ("10f-reg-check-out.png", "regional", "Registrar salida (check-out)"),
    ("11-reg-calendario.png", "regional", "Consultar el calendario operativo"),
    ("11b-reg-bloquear.png", "regional", "Bloquear fechas"),
    ("12-cen-reservas-pais.png", "central", "Consultar las reservas de toda la red"),
    ("13-cen-nomina.png", "central", "Consultar la nómina de descuentos por planilla"),
    ("14-cen-reportes.png", "central", "Consultar los reportes de uso"),
    ("15-cen-sanciones.png", "central", "Consultar los bloqueos y sanciones"),
    ("15b-cen-registrar-sancion.png", "central", "Registrar una sanción"),
    ("15c-cen-levantar-sancion.png", "central", "Levantar la sanción"),
    ("16-adm-inmuebles.png", "admin", "Mantener los inmuebles"),
    ("16b-adm-editar-inmueble.png", "admin", None),
    ("17-adm-temporadas.png", "admin", "Gestionar las temporadas"),
    ("17b-adm-nueva-temporada.png", "admin", None),
    ("18-adm-nomina-afiliados.png", "admin", "Consultar la nómina de afiliados y cargas familiares"),
    ("19-adm-auditoria.png", "admin", "Consultar las pistas de auditoría"),
    # Interfaz general (al final): la guarda de perfil al entrar por enlace directo con otro perfil.
    ("20-gen-otro-perfil.png", "general", None),
]
