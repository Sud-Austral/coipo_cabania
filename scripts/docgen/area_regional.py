# -*- coding: utf-8 -*-
"""Área de la Encargada regional: pages/regional/PanelRegional.jsx y CalendarioOperativo.jsx,
components/reservas/ListaEspera.jsx y TablaReservas.jsx, components/inmuebles/
CalendarioDisponibilidad.jsx; capa api: api/reservas.js (cambiarEstado, registrarEstadia) y
api/inmuebles.js (crearBloqueo, eliminarBloqueo, getDisponibilidad, rangoDisponible).

Código documentado: commit 0d44fb3 (último que compila). Sondas ejecutadas el 2026-11-13 con
Node importando la capa api (scratchpad/coipo_cabania/sondas/regional_sondas*.mjs), store en
memoria con las semillas; date-fns 4.4.0 de frontend/node_modules."""

ROL = "Encargada regional"
_PANEL = "PanelRegional (/regional)"
_CAL = "CalendarioOperativo (/regional/calendario)"
_NOSERV = ("En la maqueta no hay servidor que lo deniegue: la capa api no recibe la región de quien "
           "actúa ni la compara con la del inmueble (RN-02).")

CAMPOS = {
    "Confirmar la reserva": [
        ["Fundamento de la confirmación", "Sí (solo interfaz)",
         "El botón «Confirmar reserva» queda deshabilitado mientras el texto esté vacío o tenga solo espacios (RN-43).",
         "La capa api acepta confirmar sin fundamento; se guarda en reserva.fundamento y en la auditoría."],
    ],
    "Rechazar la solicitud": [
        ["Fundamento del rechazo", "Sí (solo interfaz)",
         "El botón «Rechazar solicitud» queda deshabilitado mientras el texto esté vacío o tenga solo espacios (RN-43).",
         "Ayuda en pantalla: «Obligatorio: el afiliado recibe este motivo junto con la notificación.» "
         "Por API se rechaza sin fundamento (sonda S2) o con solo espacios (S23)."],
    ],
    "Asignar cupo": [
        ["Fundamento de la confirmación", "Sí (solo interfaz)",
         "Mismo diálogo «Confirmar la reserva»: no se reverifica la disponibilidad (RN-46).", ""],
    ],
    "Registrar ingreso (check-in)": [
        ["Observaciones del ingreso", "No",
         "Texto libre. Si se escribe, reemplaza las observaciones de la reserva.",
         "Ayuda: «Opcional: estado del inmueble, hora efectiva de llegada, etc.»"],
    ],
    "Registrar salida (check-out)": [
        ["Observaciones de la estadía y estado del inmueble", "No",
         "Texto libre. Si se escribe, reemplaza las observaciones de la reserva.",
         "Ayuda: «Estos registros respaldan eventuales sanciones por daños o destrozos.»"],
    ],
    "Bloquear fechas": [
        ["Desde", "Sí (solo interfaz)", "Fecha (selector de fecha).", "La capa api no la exige: sin ella el bloqueo se guarda y rompe el calendario del inmueble (S16)."],
        ["Hasta", "Sí (solo interfaz)", "Fecha; el selector propone como mínimo la fecha «Desde» (atributo min).",
         "El min se puede saltar escribiendo la fecha; la capa api acepta Hasta anterior a Desde (S10)."],
        ["Tipo de bloqueo", "Sí", "Lista: Mantención o reparación (mantencion), Destinación institucional "
         "(institucional), Bloqueo de temporada (temporada). Por defecto, mantencion.",
         "La capa api acepta cualquier valor (S15); solo «mantencion» se pinta distinto en el calendario (RN-48)."],
        ["Motivo", "Sí (solo interfaz)", "Más de 3 caracteres sin contar espacios de los extremos.",
         "Queda en la pista de auditoría. La capa api acepta motivo vacío."],
    ],
}

ENDPOINTS = [
    ["GET", "/api/reservas?region=&estado=&usuario_id=&inmueble_id=",
     "Listar las reservas de la región (la interfaz pasa la región de la usuaria) y las de un inmueble en el calendario",
     "Encargada regional (sin restricción de región en la capa api)"],
    ["PATCH", "/api/reservas/{codigo}/estado",
     "Confirmar, rechazar o asignar cupo (cambiarEstado); acepta cualquier estado de destino",
     "Encargada regional"],
    ["POST", "/api/reservas/{codigo}/check-in | check-out",
     "Registrar ingreso (en_curso) o salida (finalizada) con registrarEstadia", "Encargada regional"],
    ["GET", "/api/inmuebles/{id}/disponibilidad?desde=&hasta=",
     "Estado de cada día (disponible, ocupado, bloqueado, mantencion) para el calendario", "Encargada regional"],
    ["GET", "/api/bloqueos?inmueble_id=", "Bloqueos del inmueble y los de toda la red", "Encargada regional"],
    ["POST", "/api/inmuebles/{id}/bloqueos", "Bloquear fechas de un inmueble (crearBloqueo)", "Encargada regional"],
    ["DELETE", "/api/bloqueos/{id}", "Levantar un bloqueo (eliminarBloqueo)", "Encargada regional"],
]

REGLAS_NUEVAS = [
    ["RN-40", "Ámbito regional por interfaz",
     "Las pantallas regionales piden las reservas e inmuebles con la región del usuario ficticio (por defecto «05», "
     "Valparaíso). La capa api no exige ni compara la región: confirmar, rechazar, bloquear o levantar en otra "
     "región funciona por API (RN-02).",
     "pages/regional/PanelRegional.jsx:37,48; CalendarioOperativo.jsx:30,48"],
    ["RN-41", "Solicitudes por revisar por prelación",
     "Las reservas en estado recibida se listan ordenadas por la prelación del motivo (RN-17); el resto de la "
     "región se ve en la tabla «Todas las reservas de la región».", "pages/regional/PanelRegional.jsx:57-63"],
    ["RN-42", "Orden de la lista de espera",
     "Primero la prelación del motivo (RN-17) y, a igual prelación, la solicitud más antigua (creada_en). El avance "
     "es manual («Asignar cupo»); si debe ser automático queda por definir con Bienestar (aviso en pantalla).",
     "components/reservas/ListaEspera.jsx:18-23,78-80"],
    ["RN-43", "Fundamento obligatorio al confirmar y rechazar (solo interfaz)",
     "El botón del diálogo queda deshabilitado sin fundamento; check-in y check-out no lo exigen. La capa api "
     "guarda el fundamento solo si viene con texto.",
     "PanelRegional.jsx:116,123,320; api/reservas.js:147"],
    ["RN-44", "Acción según el estado (solo interfaz)",
     "En la tabla: «Check-in» solo para confirmada, «Check-out» solo para en_curso, «Gestionar» solo para recibida. "
     "La capa api no verifica el estado de origen.", "PanelRegional.jsx:281-297; api/reservas.js:142-190"],
    ["RN-45", "Efecto del check-in y del check-out",
     "Check-in deja la reserva en_curso y guarda la hora en check_in; cualquier otro tipo (incluido check_out) la "
     "deja finalizada y guarda check_out. Ambos agregan una entrada al historial y a la auditoría (RN-04).",
     "api/reservas.js:174-199"],
    ["RN-46", "Asignar cupo es confirmar",
     "«Asignar cupo» abre el mismo diálogo «Confirmar la reserva» y llama a cambiarEstado(…, 'confirmada'); no "
     "se vuelve a calcular la disponibilidad del rango (RN-06).", "PanelRegional.jsx:82,94; ListaEspera.jsx:65-69"],
    ["RN-47", "Formulario de bloqueo (solo interfaz)",
     "Exige Desde, Hasta y un motivo de más de 3 caracteres; tipos: mantencion, institucional, temporada. El "
     "bloqueo se crea para el inmueble elegido en el selector. La capa api no valida nada de esto.",
     "CalendarioOperativo.jsx:22-26,101-121,131-132; api/inmuebles.js:113-135"],
    ["RN-48", "Cómo se pinta un bloqueo",
     "Un día bloqueado se marca «mantencion» si el origen es mantencion y «bloqueado» en otro caso, pero solo si el "
     "día estaba disponible: una reserva que ocupa gana sobre el bloqueo. Los bloqueos de toda la red (inmueble "
     "vacío) aplican a todos los inmuebles.", "api/inmuebles.js:84-94"],
    ["RN-49", "Bloqueos de toda la red, sin botón para levantarlos",
     "La lista «Bloqueos registrados» muestra los de toda la red con la nota «Aplica a toda la red» y sin el "
     "botón de levantar; los del inmueble llevan el botón «Levantar bloqueo del …».",
     "CalendarioOperativo.jsx:252-267"],
]

HALLAZGOS_AREA = [
    ["Alta", "cambiarEstado acepta cualquier transición y cualquier texto como estado: finalizada → recibida y "
     "recibida → «volando» se guardan sin error.",
     "Observado (sondas S3 y S4): R-2026-0006 pasó de finalizada a recibida y R-2026-0002 quedó en estado "
     "«volando», ambas con respuesta OK. Leído en api/reservas.js:142-146 (no hay lista de estados ni de transiciones).",
     "Una reserva puede volver atrás o quedar en un estado que ninguna pantalla sabe mostrar ni filtrar."],
    ["Alta", "«Asignar cupo» desde la lista de espera confirma aunque el rango siga ocupado: doble reserva solapada.",
     "Observado (sonda S9): con R-2026-0001 confirmada (inmueble 6, 14→17 ago), una nueva solicitud del mismo rango "
     "quedó en lista_espera («Hay una reserva confirmada en esas fechas.») y al confirmarla quedaron dos reservas "
     "confirmadas solapadas (R-2026-0043 y R-2026-0001); getDisponibilidad solo nombra a una. Leído en "
     "PanelRegional.jsx:82 y api/reservas.js:142-146.",
     "Dos grupos con el mismo inmueble y las mismas noches; el calendario oculta el choque."],
    ["Media", "Check-in y check-out no verifican el estado de la reserva; un tipo distinto de check_in se trata "
     "como check-out.",
     "Observado (sondas S5, S6, S7): check-in de una recibida (R-2026-0003) → en_curso; check-out de una anulada "
     "(R-2026-0008) → finalizada; tipo «salto» sobre R-2026-0007 → finalizada con nuevo check_out. Leído en "
     "api/reservas.js:174-190.",
     "Una anulada puede terminar «finalizada» y pasar a valoración y al ciclo de cobro."],
    ["Media", "Fuera de ámbito: la capa api deja confirmar, rechazar, bloquear y levantar bloqueos de otras regiones "
     "y levantar bloqueos de toda la red.",
     "Observado (sondas S1, S2, S13, S17, S18): confirmada R-2026-0040 (región 13), rechazada R-2026-0020 (región "
     "10), bloqueo en el inmueble 2 (región 03) y levantados el bloqueo 1 (toda la red) y el 2 (región 03), todo OK.",
     "En la maqueta es esperable (RN-02); para la fase con servidor, cada operación debe comparar la región."],
    ["Media", "Un bloqueo sin fechas, aceptado por la capa api, deja inservible el inmueble: el calendario, la "
     "disponibilidad y la creación de reservas lanzan TypeError.",
     "Observado (sonda S16): crearBloqueo({inmueble_id: 7}) → OK; luego getDisponibilidad, rangoDisponible y "
     "crearReserva del inmueble 7 → «TypeError: Cannot read properties of undefined (reading 'split')»; el inmueble "
     "6 sigue bien; al levantar ese bloqueo vuelve a funcionar. La excepción es síncrona (la sonda S16 de la primera "
     "corrida tumbó el proceso). Leído en components/inmuebles/CalendarioDisponibilidad.jsx:29-31: el .catch no "
     "atrapa una excepción síncrona; el efecto en el navegador no lo comprobé.",
     "Desde la pantalla no ocurre (el botón exige fechas); sí por API o con un dato importado mal."],
    ["Media", "Rechazar sin fundamento por API: la solicitud queda rechazada con fundamento null; con solo espacios "
     "se guarda el texto en blanco.",
     "Observado (sondas S2 y S23): R-2026-0020 rechazada con fundamento null; R-2026-0029 con fundamento «   ». "
     "Leído en PanelRegional.jsx:320 (la exigencia es solo del botón).",
     "El afiliado no recibe motivo del rechazo."],
    ["Baja", "Bloqueo con Desde posterior a Hasta: se acepta y, con date-fns 4.4.0, NO lanza RangeError: los días "
     "del rango invertido se tratan como bloqueados.",
     "Observado (sonda S10): bloqueo 10→1 oct en el inmueble 7 → OK; getDisponibilidad marca 1-10 oct como "
     "«mantencion»; rangoDisponible devuelve {libre: false, motivo: 'invertido'}; una solicitud queda en "
     "lista_espera; getDisponibilidad con desde>hasta en la consulta devuelve los días en orden inverso sin error.",
     "Hoy no rompe nada, pero depende de la versión de date-fns: en versiones anteriores eachDayOfInterval "
     "lanzaba con un intervalo invertido [POR VALIDAR: no se probó otra versión]."],
    ["Baja", "Bloqueos solapados entre sí, sobre una reserva confirmada o con tipo fuera de lista se aceptan sin aviso.",
     "Observado (sondas S11, S12, S15): dos bloqueos solapados en el inmueble 9; bloqueo sobre R-2026-0004 "
     "(confirmada, sigue confirmada; el calendario muestra «ocupado» porque la reserva gana, RN-48); origen «fiesta» aceptado.",
     "La encargada puede creer que bloqueó fechas que ya tienen huéspedes."],
    ["Baja", "Un bloqueo con una fecha no válida («mañana») se guarda y se ignora en silencio.",
     "Observado (sonda S16h-j): crearBloqueo con desde «mañana» → OK; getDisponibilidad y rangoDisponible del "
     "inmueble lo ignoran (libre: true).", "El bloqueo aparece en la lista pero no bloquea nada."],
    ["Baja", "La capa api entrega nombre, RUT y ocupantes de reservas de cualquier región.",
     "Observado (sonda S20): getReservas({region: '13'}) devolvió titular, RUT y ocupantes con RUT. La pantalla "
     "regional muestra el RUT del titular solo de su región (PanelRegional.jsx:230; TablaReservas.jsx:61).",
     "Sin servidor, cualquier perfil lee los datos personales de toda la red."],
    ["Por validar", "Los errores de la capa api no se muestran en las pantallas regionales: confirmar, rechazar, "
     "check-in/out, bloquear y levantar no tienen catch.",
     "Leído en PanelRegional.jsx:89-107 y CalendarioOperativo.jsx:101-127 (try/finally sin catch). No lo comprobé "
     "en el navegador [POR VALIDAR: provocar un 404 desde la pantalla y mirar].",
     "Ante un fallo, el diálogo queda abierto sin mensaje."],
    ["Baja", "El filtro de la tabla regional no ofrece «Rechazada»: las rechazadas solo se ven en «todos».",
     "Leído en PanelRegional.jsx:270.", "Cuesta revisar los rechazos hechos."],
    ["Baja", "«Gestionar» en la tabla abre solo el diálogo de confirmación; para rechazar hay que ir a «Solicitudes por revisar».",
     "Leído en PanelRegional.jsx:293-297.", "Menor: el rechazo está en otra parte de la misma pantalla."],
]

SONDAS_AREA = [
    ["Fuera de ámbito (otra región)", ROL, "Confirmar R-2026-0040 (región 13) y rechazar R-2026-0020 (región 10)",
     "Aceptado (S1, S2): no hay servidor que deniegue."],
    ["Fuera de ámbito (otra región)", ROL, "Bloquear el inmueble 2 (región 03), levantar el bloqueo 2 (región 03) y el 1 (toda la red)",
     "Aceptado (S13, S17, S18)."],
    ["Valor de lista falso (estado)", ROL, "cambiarEstado a «volando»", "Aceptado y guardado (S4)."],
    ["Transición imposible", ROL, "finalizada → recibida (R-2026-0006)", "Aceptado (S3)."],
    ["Check-in de reserva no confirmada", ROL, "registrarEstadia check_in sobre una recibida (R-2026-0003)", "Aceptado: queda en_curso (S5)."],
    ["Check-out de anulada / tipo inventado", ROL, "check_out sobre R-2026-0008 anulada; tipo «salto» sobre una finalizada",
     "Aceptados: ambas quedan finalizada (S6, S7)."],
    ["Datos solapados (reservas)", ROL, "Confirmar desde lista de espera con el rango ocupado (inmueble 6, 14→17 ago)",
     "Aceptado: dos reservas confirmadas solapadas (S9)."],
    ["Datos solapados (bloqueos)", ROL, "Dos bloqueos solapados; bloqueo sobre una reserva confirmada", "Aceptados sin aviso (S11, S12)."],
    ["Inicio posterior al fin", ROL, "Bloqueo 10 oct → 1 oct; getDisponibilidad con desde>hasta",
     "Aceptado, sin RangeError (date-fns 4.4.0): los días se tratan como bloqueados (S10)."],
    ["Valor de lista falso (tipo de bloqueo)", ROL, "origen «fiesta»", "Aceptado; se pinta «bloqueado» (S15)."],
    ["Campos obligatorios vacíos", ROL, "crearBloqueo sin fechas ni motivo",
     "Aceptado; después getDisponibilidad, rangoDisponible y crearReserva del inmueble lanzan TypeError (S16)."],
    ["Fecha no válida", ROL, "Bloqueo con desde «mañana»", "Aceptado y luego ignorado (S16h-j)."],
    ["Rechazar sin fundamento por API", ROL, "cambiarEstado rechazada sin fundamento y con «   »", "Aceptado (S2, S23)."],
    ["Código inexistente", ROL, "cambiarEstado R-2026-9999; eliminarBloqueo 999",
     "Rechazado: 404 «Reserva no encontrada» (S8) y 404 «Bloqueo no encontrado» (S19)."],
    ["Datos personales por la API", ROL, "getReservas({region: '13'})", "Devuelve nombre, RUT y ocupantes de otra región (S20)."],
    ["Dígito verificador de RUT", ROL, "—", "No aplica: ninguna pantalla regional pide RUT."],
    ["Borrarse a sí mismo", ROL, "—", "No aplica: el perfil no administra usuarios."],
]

ROL_TEXTO = {
    "regional": {
        "resumen": "La Encargada regional revisa las solicitudes de reserva de los inmuebles de su región, las "
                   "confirma o rechaza con fundamento, asigna cupos desde la lista de espera, registra el ingreso y "
                   "la salida de los huéspedes y bloquea fechas del calendario por mantención, destinación "
                   "institucional o temporada.",
        "objetivo": "Administrar la ocupación diaria de los inmuebles de la región.",
        "alcance": ["Ver las reservas de su región y las solicitudes por revisar ordenadas por prelación (RN-41).",
                    "Confirmar o rechazar solicitudes con fundamento (RN-43).",
                    "Asignar cupo a una solicitud en lista de espera (RN-42, RN-46).",
                    "Registrar check-in y check-out (RN-45).",
                    "Consultar el calendario operativo, bloquear fechas y levantar bloqueos del inmueble (RN-47 a RN-49)."],
        "fuera_alcance": ["Solicitar reservas a nombre propio o de terceros (portal).",
                          "Anular reservas o aplicar el cobro por desistimiento (lo hace el titular, RN-15).",
                          "Sanciones, nómina de descuentos y reportes (Oficina Central).",
                          "Editar inmuebles, temporadas o tarifas (Administrador).",
                          "Levantar bloqueos de toda la red desde la pantalla (RN-49)."],
        "requisitos": ["Elegir «Encargada regional» en el selector «Ver el sistema como» (RN-01).",
                       "La región la fija el usuario ficticio (Carolina Núñez Vidal, Región de Valparaíso)."],
        "interfaz": [["Tarjetas de resumen", "Por revisar, Confirmadas, En curso y Lista de espera de la región."],
                     ["Solicitudes por revisar", "Reservas recibidas por prelación, con botones «Confirmar» y «Rechazar»."],
                     ["Lista de espera", "Solicitudes sin cupo en orden propuesto, con botón «Asignar cupo»."],
                     ["Todas las reservas de la región", "Tabla con filtro por estado y acciones Check-in, Check-out o Gestionar."],
                     ["Calendario operativo", "Selector de inmueble, calendario de dos meses, movimientos, bloqueos y próximas estadías."],
                     ["Bloquear fechas", "Diálogo «Bloquear fechas del inmueble» con Desde, Hasta, Tipo de bloqueo y Motivo."]],
        "errores_frecuentes": [
            ["El botón «Confirmar reserva» o «Rechazar solicitud» no se activa", "Falta el fundamento (RN-43).",
             "Escribir el fundamento en el diálogo."],
            ["El botón «Bloquear fechas» del diálogo no se activa", "Falta una fecha o el motivo tiene 3 caracteres o menos (RN-47).",
             "Completar Desde, Hasta y un motivo más largo."],
            ["No aparece el botón para levantar un bloqueo", "Es un bloqueo de toda la red (RN-49).",
             "Lo gestiona otro perfil [POR VALIDAR: ninguna pantalla de la maqueta levanta bloqueos de red]."],
            ["Al asignar cupo, el inmueble queda con dos reservas", "Asignar cupo no reverifica la disponibilidad (RN-46).",
             "Revisar el calendario del inmueble antes de asignar."]],
        "buenas_practicas": ["Antes de «Asignar cupo», revisar en el «Calendario operativo» que las fechas estén libres.",
                             "Escribir fundamentos que el afiliado pueda entender: se le comunican.",
                             "Registrar en el check-out el estado del inmueble: respalda eventuales sanciones.",
                             "Verificar que Desde sea anterior a Hasta al bloquear: la maqueta no lo controla."],
        "faq": [["¿Puedo ver reservas de otra región?", "La pantalla muestra solo su región; la maqueta no lo impide por API (RN-40)."],
                ["¿La lista de espera avanza sola?", "No: el avance es manual y queda por definir con Bienestar (RN-42)."],
                ["¿Un bloqueo cancela reservas confirmadas?", "No: la reserva sigue confirmada y el calendario la muestra ocupada (RN-48)."],
                ["¿Dónde queda el fundamento?", "En la reserva y en las pistas de auditoría (RN-04)."]],
    },
}


def _f(objetivo, precond, pasos, resultado, valid, errores, consid, restr, alt):
    return {"objetivo": objetivo, "quien": ROL + " (perfil «Encargada regional» del selector).",
            "precondiciones": precond, "pasos": pasos, "resultado": resultado, "validaciones": valid,
            "errores": errores, "consideraciones": consid, "restricciones": restr, "alternativos": alt}


_E404 = ["Reserva no encontrada", "El código no existe (404). La pantalla no lo muestra: el diálogo no tiene manejo de errores [POR VALIDAR en navegador]."]

_FUNCS = {
    "Consultar las solicitudes": lambda: _f(
        "Ver las solicitudes y reservas de los inmuebles de la región.",
        ["Haber ingresado como Encargada regional (RN-01)."],
        ["Abrir /regional («Solicitudes de la Región de Valparaíso»).",
         "Leer las tarjetas Por revisar, Confirmadas, En curso y Lista de espera.",
         "Revisar «Solicitudes por revisar», ordenadas por prelación (RN-41).",
         "En «Todas las reservas de la región», filtrar por estado si hace falta."],
        "Se ven las reservas de la región con titular, RUT, fechas, ocupantes y monto.",
        ["Solo se piden las reservas de la región del usuario (RN-40)."],
        [], ["Las solicitudes de usuarios no afiliados llevan la marca «Usuario no afiliado».",
             "El filtro no ofrece el estado «Rechazada» (PanelRegional.jsx:270)."],
        ["La restricción de región es solo de interfaz (RN-02, RN-40)."],
        ["Si no hay solicitudes recibidas, la sección «Solicitudes por revisar» no aparece."]),
    "Confirmar la reserva": lambda: _f(
        "Confirmar una solicitud recibida con fundamento.",
        ["Reserva en estado recibida en la región."],
        ["Pulsar «Confirmar» en «Solicitudes por revisar» (o «Gestionar» en la tabla).",
         "En el diálogo «Confirmar la reserva», escribir el «Fundamento de la confirmación».",
         "Pulsar «Confirmar reserva»."],
        "La reserva queda confirmada, ocupa el inmueble (RN-05, RN-06) y se registra en la auditoría como "
        "«Confirmación de reserva» (RN-04).",
        ["Fundamento obligatorio solo en la interfaz (RN-43).",
         "La capa api no verifica el estado de origen ni la disponibilidad (hallazgos)."],
        [_E404], ["El fundamento se guarda en la reserva y como detalle de la auditoría."],
        ["No se reverifica que el rango esté libre."], ["«Cancelar» cierra el diálogo sin cambios."]),
    "Rechazar la solicitud": lambda: _f(
        "Rechazar una solicitud recibida con fundamento.",
        ["Reserva en estado recibida en la región."],
        ["Pulsar «Rechazar» en «Solicitudes por revisar».",
         "En el diálogo «Rechazar la solicitud», escribir el «Fundamento del rechazo».",
         "Pulsar «Rechazar solicitud»."],
        "La reserva queda rechazada con su fundamento; auditoría «Cambio de estado» (RN-04).",
        ["Fundamento obligatorio solo en la interfaz (RN-43); por API se rechaza sin él."],
        [_E404], ["El texto de ayuda dice que el afiliado recibe el motivo; la maqueta no envía notificaciones "
                  "[POR VALIDAR: no hay envío en el código]."],
        ["Desde la tabla «Gestionar» no ofrece rechazar."], ["«Cancelar» cierra el diálogo sin cambios."]),
    "Asignar cupo": lambda: _f(
        "Confirmar una solicitud que está en lista de espera.",
        ["Reserva en estado lista_espera en la región."],
        ["En «Lista de espera», ubicar la solicitud según el orden propuesto (RN-42).",
         "Pulsar «Asignar cupo».",
         "En el diálogo «Confirmar la reserva», escribir el fundamento y pulsar «Confirmar reserva»."],
        "La reserva pasa a confirmada (RN-46).",
        ["No se reverifica la disponibilidad: si el rango sigue ocupado queda una doble reserva (hallazgo Alta)."],
        [_E404], ["El orden es una propuesta; la encargada puede asignar a cualquiera de la lista."],
        ["Qué pasa al liberarse un cupo está por definir con Bienestar (RN-42)."],
        ["«Cancelar» cierra el diálogo sin cambios."]),
    "Registrar ingreso (check-in)": lambda: _f(
        "Registrar la llegada del huésped.",
        ["Reserva confirmada (la interfaz solo ofrece el botón en ese estado, RN-44)."],
        ["En la tabla, pulsar «Check-in» de la reserva.",
         "En el diálogo «Registrar ingreso (check-in)», escribir observaciones si las hay.",
         "Pulsar «Registrar ingreso»."],
        "La reserva queda en_curso con la hora del check-in (RN-45); auditoría «Registro de check-in».",
        ["Observaciones opcionales.", "La capa api no verifica el estado de origen (sonda S5)."],
        [_E404], ["Si se escriben observaciones, reemplazan las que tenía la reserva."],
        ["No se controla que la fecha de hoy coincida con la fecha de entrada."], ["«Cancelar» cierra sin cambios."]),
    "Registrar salida (check-out)": lambda: _f(
        "Registrar la salida del huésped y el estado del inmueble.",
        ["Reserva en_curso (RN-44)."],
        ["En la tabla, pulsar «Check-out» de la reserva.",
         "En el diálogo «Registrar salida (check-out)», anotar observaciones de la estadía y del inmueble.",
         "Pulsar «Registrar salida»."],
        "La reserva queda finalizada con la hora del check-out (RN-45); auditoría «Registro de check-out».",
        ["Observaciones opcionales.", "La capa api no verifica el estado de origen (sonda S6)."],
        [_E404], ["Una reserva finalizada puede ser valorada por el titular (RN-16)."],
        ["No se controla la fecha de salida."], ["«Cancelar» cierra sin cambios."]),
    "Consultar el calendario operativo": lambda: _f(
        "Ver la ocupación día a día, los movimientos y los bloqueos de un inmueble de la región.",
        ["Haber ingresado como Encargada regional."],
        ["Abrir /regional/calendario («Calendario operativo»).",
         "Elegir el inmueble en el selector (abre en el que tiene más estadías confirmadas o en curso).",
         "Revisar el calendario, los movimientos, los «Bloqueos registrados» y las «Próximas estadías»."],
        "Se ve cada día como disponible, ocupado, bloqueado o mantención (RN-06, RN-48).",
        ["Solo inmuebles de la región (RN-40)."],
        [["Inmueble no encontrado", "Identificador inexistente en getDisponibilidad (404); el calendario queda vacío."]],
        ["Movimientos: los de hoy si los hay; si no, los de los próximos 7 días.",
         "Una reserva que ocupa gana sobre un bloqueo en el calendario (RN-48)."],
        ["Si un bloqueo del inmueble no tiene fechas, el calendario de ese inmueble falla (hallazgo Media)."], []),
    "Bloquear fechas": lambda: _f(
        "Dejar no disponibles unas fechas del inmueble.",
        ["Inmueble elegido en el «Calendario operativo»."],
        ["Pulsar «Bloquear fechas».",
         "En «Bloquear fechas del inmueble», indicar Desde, Hasta, Tipo de bloqueo y Motivo.",
         "Pulsar «Bloquear fechas»."],
        "El bloqueo se agrega a «Bloqueos registrados», el calendario lo muestra y las nuevas solicitudes de esas "
        "fechas quedan en lista de espera (RN-06, RN-07); auditoría «Bloqueo de fechas».",
        ["Desde, Hasta y motivo de más de 3 caracteres, solo en la interfaz (RN-47).",
         "La capa api acepta Hasta anterior a Desde, solapes, tipo fuera de lista y bloqueo sin fechas (hallazgos)."],
        [], ["No afecta a reservas ya confirmadas: siguen confirmadas (sonda S12)."],
        ["Solo para el inmueble seleccionado; los de toda la red no se crean desde esta pantalla."],
        ["«Cancelar» cierra el diálogo sin cambios."]),
    "Levantar bloqueo": lambda: _f(
        "Quitar un bloqueo de fechas del inmueble.",
        ["Bloqueo propio del inmueble (no de toda la red, RN-49)."],
        ["En «Bloqueos registrados», pulsar el ícono de papelera («Levantar bloqueo del …»)."],
        "El bloqueo desaparece y el calendario se recarga; auditoría «Levantamiento de bloqueo».",
        ["No pide confirmación."],
        [["Bloqueo no encontrado", "El id no existe (404); la pantalla no lo muestra."]],
        ["Se aplica al pulsar, sin diálogo."],
        ["Por API se puede levantar cualquier bloqueo, también los de toda la red (sonda S17)."], []),
}


def funcionalidad(nombre, rol):
    if rol != "regional" or nombre not in _FUNCS:
        raise KeyError(nombre)
    return _FUNCS[nombre]()


def _c(n, nombre, objetivo, descripcion, precond, entradas, flujo, resultado, func, pantalla, servicio,
       rn, fa=None, fe=None, valid=None, datos="store.reservas", tablas="reservas, auditoria", verifica=""):
    return {"id": "CU-REG-%03d" % n, "nombre": nombre, "objetivo": objetivo, "descripcion": descripcion,
            "permisos": "Perfil Encargada regional elegido en el selector (sin autenticación, RN-01).",
            "precondiciones": precond, "entradas": entradas, "flujo": flujo, "resultado": resultado,
            "fa": fa or [], "fe": fe or [], "rn": rn, "validaciones": valid or [], "datos": datos,
            "traz": ["Encargada regional", func, pantalla, servicio, tablas], "verifica": verifica,
            "secundarios": "—"}


def casos(rol):
    if rol != "regional":
        return []
    return [
        _c(2, "Revisar las solicitudes de la región", "Conocer qué hay por resolver.",
           "Abrir el panel regional y revisar las solicitudes por prelación.",
           ["Ingreso como Encargada regional."], [],
           ["Abrir /regional.", "Leer «Solicitudes por revisar» (orden médica, laboral, personal).",
            "Filtrar la tabla por estado."],
           "Se ven solo las reservas de la Región de Valparaíso. Ver captura 10-reg-solicitudes.png.",
           "Consultar las solicitudes", _PANEL, "getReservas({region}) (api/reservas.js)",
           ["RN-17", "RN-40", "RN-41"], fa=[["FA-01", "Sin solicitudes recibidas: no se muestra la sección."]]),
        _c(3, "Confirmar una solicitud con fundamento", "Dejar confirmada una solicitud recibida.",
           "Confirmación desde el diálogo «Confirmar la reserva».",
           ["Reserva recibida en la región (p. ej. R-2026-0001)."], ["Fundamento de la confirmación"],
           ["Pulsar «Confirmar».", "En «Confirmar la reserva», escribir el fundamento.", "Pulsar «Confirmar reserva»."],
           "Reserva confirmada; fechas ocupadas en el calendario; auditoría «Confirmación de reserva». Ver captura 10b-reg-confirmar.png.",
           "Confirmar la reserva", _PANEL, "cambiarEstado(codigo, 'confirmada') (api/reservas.js)",
           ["RN-04", "RN-05", "RN-43"], fa=[["FA-01", "Desde la tabla con «Gestionar»: mismo diálogo."],
                                           ["FA-02", "«Cancelar»: sin cambios."]],
           fe=[["FE-01", "Fundamento vacío: el botón queda deshabilitado."]],
           valid=["Fundamento no vacío (solo interfaz)."], verifica="Sonda S9a: confirmar R-2026-0001 → OK."),
        _c(4, "Confirmar una reserva de otra región (fuera de ámbito)", "Comprobar si la capa api deniega.",
           "Intento de confirmar por API una reserva de un inmueble de otra región.",
           ["R-2026-0040 recibida, inmueble de la región 13."], ["Código R-2026-0040", "Estado confirmada"],
           ["Llamar cambiarEstado('R-2026-0040', 'confirmada') sin pasar por la pantalla (Confirmar la reserva por API)."],
           "Se confirma: NO hay servidor que deniegue; solo la pantalla filtra por región.",
           "Confirmar la reserva", _PANEL, "cambiarEstado (api/reservas.js:142)", ["RN-02", "RN-40"],
           verifica="Observado (sonda S1): respuesta OK, estado confirmada."),
        _c(5, "Cambiar a un estado imposible o inexistente por API", "Comprobar las transiciones.",
           "Intento de llevar una finalizada a recibida y una recibida a un estado inventado.",
           ["R-2026-0006 finalizada; R-2026-0002 recibida."], ["Estado recibida", "Estado «volando»"],
           ["Llamar cambiarEstado('R-2026-0006', 'recibida').", "Llamar cambiarEstado('R-2026-0002', 'volando') "
            "(misma operación que Confirmar la reserva)."],
           "Ambas se aceptan: no hay validación de transiciones ni de estados.",
           "Confirmar la reserva", _PANEL, "cambiarEstado (api/reservas.js:142-146)", ["RN-05"],
           fe=[["FE-01", "Código inexistente: «Reserva no encontrada» (404)."]],
           verifica="Observado (sondas S3, S4, S8)."),
        _c(6, "Rechazar una solicitud con fundamento", "Rechazar una solicitud recibida.",
           "Rechazo desde el diálogo «Rechazar la solicitud».",
           ["Reserva recibida en la región."], ["Fundamento del rechazo"],
           ["Pulsar «Rechazar».", "En «Rechazar la solicitud», escribir el fundamento.", "Pulsar «Rechazar solicitud»."],
           "Reserva rechazada con fundamento; auditoría «Cambio de estado». Ver captura 10c-reg-rechazar.png.",
           "Rechazar la solicitud", _PANEL, "cambiarEstado(codigo, 'rechazada') (api/reservas.js)",
           ["RN-04", "RN-43"], fa=[["FA-01", "«Cancelar»: sin cambios."]],
           fe=[["FE-01", "Fundamento vacío: el botón queda deshabilitado."]], valid=["Fundamento no vacío (solo interfaz)."]),
        _c(7, "Rechazar sin fundamento y de otra región por API (fuera de ámbito)",
           "Comprobar si la capa api exige fundamento y región.",
           "Rechazo por API de R-2026-0020 (región 10) sin fundamento y de R-2026-0029 con solo espacios.",
           ["Reservas recibidas de otras regiones."], ["Sin fundamento", "Fundamento «   »"],
           ["Llamar cambiarEstado('R-2026-0020', 'rechazada') sin fundamento (Rechazar la solicitud por API).",
            "Llamar cambiarEstado('R-2026-0029', 'rechazada', {fundamento: '   '})."],
           "Ambas quedan rechazadas: fundamento null y «   ». NO hay servidor que deniegue.",
           "Rechazar la solicitud", _PANEL, "cambiarEstado (api/reservas.js:147)", ["RN-02", "RN-40", "RN-43"],
           verifica="Observado (sondas S2, S23)."),
        _c(8, "Asignar cupo a una solicitud en lista de espera", "Confirmar una solicitud sin cupo inicial.",
           "Desde «Lista de espera», pulsar «Asignar cupo» y confirmar.",
           ["Reserva lista_espera en la región (p. ej. R-2026-0009) con el rango ya libre."], ["Fundamento"],
           ["En «Lista de espera», pulsar «Asignar cupo».", "En «Confirmar la reserva», escribir el fundamento.",
            "Pulsar «Confirmar reserva»."],
           "La reserva pasa a confirmada. Ver captura 10d-reg-lista-espera.png.",
           "Asignar cupo", _PANEL + ", ListaEspera", "cambiarEstado(codigo, 'confirmada') (api/reservas.js)",
           ["RN-17", "RN-42", "RN-46"], fa=[["FA-01", "«Cancelar»: sin cambios."]],
           verifica="Sonda S0: rangoDisponible(8, 14→17 ago) libre para R-2026-0009 en las semillas."),
        _c(9, "Asignar cupo con el rango aún ocupado (doble reserva)", "Comprobar si se reverifica la disponibilidad.",
           "Confirmar desde lista de espera una solicitud cuyo rango tiene otra reserva confirmada.",
           ["R-2026-0001 confirmada (inmueble 6, 14→17 ago).", "Nueva solicitud del mismo rango en lista_espera."],
           ["Fundamento"],
           ["Pulsar «Asignar cupo» sobre la solicitud en espera.", "Confirmar con fundamento."],
           "Se acepta: quedan dos reservas confirmadas solapadas; el calendario nombra solo una.",
           "Asignar cupo", _PANEL + ", ListaEspera", "cambiarEstado (api/reservas.js:142-146); getDisponibilidad",
           ["RN-06", "RN-07", "RN-46"], verifica="Observado (sonda S9): R-2026-0043 y R-2026-0001 confirmadas."),
        _c(10, "Registrar el ingreso de una reserva confirmada", "Marcar la llegada del huésped.",
           "Check-in desde la tabla de la región.",
           ["Reserva confirmada (p. ej. R-2026-0004)."], ["Observaciones del ingreso (opcional)"],
           ["Pulsar «Check-in» en la tabla.", "En «Registrar ingreso (check-in)», anotar observaciones.",
            "Pulsar «Registrar ingreso»."],
           "Reserva en_curso con hora de check-in; auditoría «Registro de check-in». Ver captura 10e-reg-check-in.png.",
           "Registrar ingreso (check-in)", _PANEL, "registrarEstadia(codigo, 'check_in') (api/reservas.js)",
           ["RN-04", "RN-44", "RN-45"], fa=[["FA-01", "«Cancelar»: sin cambios."]],
           verifica="Sonda S22: check-in de R-2026-0004 → en_curso."),
        _c(11, "Registrar ingreso de una reserva no confirmada por API", "Comprobar el estado de origen.",
           "Check-in por API de una reserva recibida.",
           ["R-2026-0003 recibida."], [],
           ["Llamar registrarEstadia('R-2026-0003', 'check_in') (Registrar ingreso por API)."],
           "Se acepta: queda en_curso sin haber sido confirmada. La pantalla no ofrece el botón (RN-44).",
           "Registrar ingreso (check-in)", _PANEL, "registrarEstadia (api/reservas.js:174)", ["RN-44", "RN-45"],
           verifica="Observado (sonda S5)."),
        _c(12, "Registrar la salida de una estadía en curso", "Cerrar la estadía.",
           "Check-out desde la tabla de la región.",
           ["Reserva en_curso (p. ej. R-2026-0005)."], ["Observaciones de la estadía y estado del inmueble"],
           ["Pulsar «Check-out».", "En «Registrar salida (check-out)», anotar el estado del inmueble.",
            "Pulsar «Registrar salida»."],
           "Reserva finalizada con hora de check-out; auditoría «Registro de check-out». Ver captura 10f-reg-check-out.png.",
           "Registrar salida (check-out)", _PANEL, "registrarEstadia(codigo, 'check_out') (api/reservas.js)",
           ["RN-04", "RN-16", "RN-45"], fa=[["FA-01", "«Cancelar»: sin cambios."]]),
        _c(13, "Registrar salida de una reserva anulada o con tipo inventado por API", "Comprobar el estado de origen y el tipo.",
           "Check-out por API de una anulada y llamada con tipo «salto».",
           ["R-2026-0008 anulada; R-2026-0007 finalizada."], ["Tipo check_out", "Tipo «salto»"],
           ["Llamar registrarEstadia('R-2026-0008', 'check_out') (Registrar salida por API).",
            "Llamar registrarEstadia('R-2026-0007', 'salto')."],
           "Ambas quedan finalizada: cualquier tipo distinto de check_in se trata como salida.",
           "Registrar salida (check-out)", _PANEL, "registrarEstadia (api/reservas.js:182-190)", ["RN-45"],
           verifica="Observado (sondas S6, S7)."),
        _c(14, "Consultar el calendario operativo de un inmueble", "Ver ocupación, movimientos y bloqueos.",
           "Revisión del «Calendario operativo» de la región.",
           ["Ingreso como Encargada regional."], ["Inmueble"],
           ["Abrir /regional/calendario («Calendario operativo»).", "Elegir el inmueble.",
            "Revisar el calendario de dos meses, movimientos, bloqueos y próximas estadías."],
           "Cada día aparece como disponible, ocupado, bloqueado o mantención. Ver captura 11-reg-calendario.png.",
           "Consultar el calendario operativo", _CAL, "getDisponibilidad, getBloqueos, getReservas (api/)",
           ["RN-06", "RN-40", "RN-48"], datos="store.reservas, store.bloqueos", tablas="reservas, bloqueos, inmuebles"),
        _c(15, "Bloquear fechas por mantención", "Impedir reservas en unas fechas.",
           "Bloqueo de un inmueble de la región desde el diálogo «Bloquear fechas del inmueble».",
           ["Inmueble elegido."], ["Desde", "Hasta", "Tipo de bloqueo", "Motivo"],
           ["Pulsar «Bloquear fechas».", "Completar Desde, Hasta, Tipo y Motivo (más de 3 caracteres).",
            "Pulsar «Bloquear fechas»."],
           "El bloqueo aparece en la lista y en el calendario; auditoría «Bloqueo de fechas». Ver captura 11b-reg-bloquear.png.",
           "Bloquear fechas", _CAL, "crearBloqueo (api/inmuebles.js:113)", ["RN-04", "RN-06", "RN-47", "RN-48"],
           fa=[["FA-01", "«Cancelar»: sin cambios."]],
           fe=[["FE-01", "Falta una fecha o el motivo es corto: el botón queda deshabilitado."]],
           valid=["Desde, Hasta y motivo > 3 caracteres (solo interfaz)."],
           datos="store.bloqueos", tablas="bloqueos, auditoria"),
        _c(16, "Bloquear fechas con Desde posterior a Hasta", "Comprobar el rango invertido.",
           "Bloqueo por API del 10 al 1 de octubre en el inmueble 7.",
           ["Inmueble 7 de la región."], ["Desde 2026-10-10", "Hasta 2026-10-01"],
           ["Llamar crearBloqueo con desde > hasta (Bloquear fechas por API).",
            "Consultar getDisponibilidad y crear una solicitud en ese rango."],
           "Se acepta; no lanza RangeError: los días 1-10 oct salen «mantencion» y la solicitud queda en lista de espera.",
           "Bloquear fechas", _CAL, "crearBloqueo; getDisponibilidad; rangoDisponible (api/inmuebles.js)",
           ["RN-06", "RN-47"], datos="store.bloqueos", tablas="bloqueos",
           verifica="Observado (sonda S10), con date-fns 4.4.0."),
        _c(17, "Bloquear fechas solapadas, sobre una reserva o con tipo falso", "Comprobar choques y lista de tipos.",
           "Bloqueos por API solapados entre sí, sobre una reserva confirmada y con origen «fiesta».",
           ["Inmuebles 9, 6 y 7."], ["Rangos solapados", "Origen «fiesta»"],
           ["Crear dos bloqueos solapados en el inmueble 9 (Bloquear fechas por API).",
            "Bloquear 18-20 sep en el inmueble 6 (R-2026-0004 confirmada).", "Bloquear con origen «fiesta»."],
           "Todos se aceptan sin aviso; R-2026-0004 sigue confirmada y el calendario la muestra ocupada.",
           "Bloquear fechas", _CAL, "crearBloqueo (api/inmuebles.js:113)", ["RN-48"],
           datos="store.bloqueos", tablas="bloqueos", verifica="Observado (sondas S11, S12, S15)."),
        _c(18, "Bloquear sin fechas por API y su efecto en el calendario", "Comprobar campos obligatorios.",
           "Bloqueo por API sin desde, hasta ni motivo.",
           ["Inmueble 7."], ["Solo inmueble_id"],
           ["Llamar crearBloqueo({inmueble_id: 7}) (Bloquear fechas por API).",
            "Consultar la disponibilidad y crear una solicitud en el inmueble 7.", "Levantar ese bloqueo."],
           "Se acepta; luego getDisponibilidad, rangoDisponible y crearReserva del inmueble lanzan TypeError hasta levantarlo.",
           "Bloquear fechas", _CAL, "crearBloqueo; getDisponibilidad (api/inmuebles.js:87)", ["RN-06", "RN-47"],
           datos="store.bloqueos", tablas="bloqueos", verifica="Observado (sonda S16)."),
        _c(19, "Bloquear fechas en un inmueble de otra región (fuera de ámbito)", "Comprobar si la capa api deniega.",
           "Bloqueo por API del inmueble 2 (región 03) y de toda la red.",
           ["Ingreso como Encargada regional (región 05)."], ["inmueble_id 2", "inmueble_id vacío"],
           ["Llamar crearBloqueo con inmueble_id 2 (Bloquear fechas por API).", "Llamar crearBloqueo sin inmueble_id."],
           "Ambos se aceptan; el segundo queda como bloqueo de toda la red. NO hay servidor que deniegue.",
           "Bloquear fechas", _CAL, "crearBloqueo (api/inmuebles.js:113-116)", ["RN-02", "RN-40"],
           datos="store.bloqueos", tablas="bloqueos", verifica="Observado (sondas S13, S14)."),
        _c(20, "Levantar un bloqueo del inmueble", "Liberar fechas bloqueadas.",
           "Desde «Bloqueos registrados», quitar un bloqueo del inmueble.",
           ["Bloqueo propio del inmueble."], [],
           ["En «Bloqueos registrados», pulsar la papelera («Levantar bloqueo del …»)."],
           "El bloqueo desaparece y el calendario se recarga; auditoría «Levantamiento de bloqueo».",
           "Levantar bloqueo", _CAL, "eliminarBloqueo (api/inmuebles.js:138)", ["RN-04", "RN-49"],
           fe=[["FE-01", "Id inexistente: «Bloqueo no encontrado» (404), sin mensaje en pantalla."]],
           datos="store.bloqueos", tablas="bloqueos, auditoria", verifica="Sonda S19: id 999 → 404."),
        _c(21, "Levantar bloqueos de toda la red o de otra región por API (fuera de ámbito)",
           "Comprobar si la capa api deniega.", "Levantar por API el bloqueo 1 (toda la red) y el 2 (región 03).",
           ["Bloqueos semilla 1 y 2."], ["Id 1", "Id 2"],
           ["Llamar eliminarBloqueo(1) y eliminarBloqueo(2) (Levantar bloqueo por API)."],
           "Ambos se levantan. La pantalla no muestra el botón para los de toda la red (RN-49), pero NO hay servidor que deniegue.",
           "Levantar bloqueo", _CAL, "eliminarBloqueo (api/inmuebles.js:138)", ["RN-02", "RN-40", "RN-49"],
           datos="store.bloqueos", tablas="bloqueos", verifica="Observado (sondas S17, S18)."),
    ]
