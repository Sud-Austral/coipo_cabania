# -*- coding: utf-8 -*-
"""Portal de reservas: perfiles Afiliado/a (afiliado, AFI) y Usuario no afiliado (no_afiliado, NOA).

Mismas pantallas para los dos perfiles (pages/publico/*); la diferencia es la tarifa de usuario
externo para todos los ocupantes y la franja de aviso del no afiliado.
Leído sobre el commit 0d44fb3 (frontend/src). Sondas ejecutadas el 2026-11-13 con Node importando
api/*.js (sin navegador): scratchpad/coipo_cabania/sondas/portal_sondas.mjs y portal_s2.mjs.
"""
from .comun import PV
from .decisiones import ROLES

_ETIQ = {c: n for c, n, *_ in ROLES}
_PFX = {c: p for c, _n, _a, _pi, p in ROLES}
_USUARIO = {"afiliado": "María Fuentes Rojas (RUT 13.457.902-8)",
            "no_afiliado": "Jorge Pavez Contreras (RUT 15.336.204-1)"}
_CAP = {"afiliado": "afi", "no_afiliado": "noa"}

_NOA_TARIFA = ("Como Usuario no afiliado, todos los ocupantes (incluido el titular) pagan tarifa de usuario "
               "externo (RN-12, RN-30).")
_AFI_TARIFA = ("Como Afiliado/a, el titular, el cónyuge o conviviente civil y los hijos inscritos pagan tarifa de "
               "afiliado; los demás acompañantes, tarifa de usuario externo (RN-10, RN-12).")


def _tarifa(rol):
    return _NOA_TARIFA if rol == "no_afiliado" else _AFI_TARIFA


# ---------------------------------------------------------------------------------------------
# Funcionalidades
# ---------------------------------------------------------------------------------------------
def funcionalidad(nombre, rol):
    et = _ETIQ[rol]
    noa = rol == "no_afiliado"
    if nombre == "Consultar el catálogo de inmuebles":
        return {
            "objetivo": "Buscar inmuebles de la red de Bienestar y elegir uno para ver su ficha.",
            "quien": et + ".",
            "precondiciones": ["Haber ingresado como %s con el selector de perfil." % et],
            "pasos": ["Abrir «Catálogo» en el menú (pantalla de llegada del perfil, /catalogo).",
                      "Leer el aviso «Postulación estival 2026-2027».",
                      "Filtrar por región, tipo de inmueble, capacidad mínima o texto («Ej.: Pichilemu, Puyehue…»).",
                      "Pulsar una tarjeta de inmueble para abrir su ficha."],
            "resultado": "Lista de tarjetas con nombre, tipo, capacidad y tarifa «desde» de cada inmueble.",
            "validaciones": ["Los filtros solo acotan la lista; no hay campos obligatorios."],
            "errores": [["No hay inmuebles con esos criterios", "Los filtros no dejan ningún inmueble; «Limpiar filtros» los vacía."]],
            "consideraciones": ["La tarifa «desde» de las casas de huéspedes es la de usuario externo para el Usuario no "
                                "afiliado y la de afiliado para el Afiliado/a (InmuebleCard.jsx:11-17).",
                                "Las tarifas son de referencia, por validar (RN-20)."]
                               + (["La franja ámbar superior recuerda que las solicitudes quedan sujetas a la prioridad "
                                   "de los afiliados (RN-31)."] if noa else []),
            "restricciones": ["La ruta /catalogo no exige perfil: cualquier perfil la abre (App.jsx:31)."],
            "alternativos": ["Entrar directo a la ficha por su dirección /inmuebles/{id}."],
        }
    if nombre == "Consultar la ficha del inmueble":
        return {
            "objetivo": "Ver el detalle de un inmueble y su disponibilidad antes de solicitar.",
            "quien": et + ".",
            "precondiciones": ["Haber elegido un inmueble en el catálogo."],
            "pasos": ["Abrir la ficha (/inmuebles/{id}).",
                      "Revisar fotos, descripción, equipamiento, ubicación, zonas de interés y valoraciones de huéspedes.",
                      "En el recuadro «Disponibilidad», mirar el calendario del mes.",
                      "Revisar «Tarifas de referencia».",
                      "Pulsar «Solicitar reserva» para iniciar la solicitud."],
            "resultado": "Ficha completa con calendario de días libres, ocupados, bloqueados y en mantención.",
            "validaciones": [],
            "errores": [["Inmueble no encontrado", "El id de la dirección no existe (api/inmuebles.js getInmueble, 404)."]],
            "consideraciones": ["Las valoraciones muestran el nombre del autor junto a su comentario (FichaInmueble.jsx:116-120).",
                                "El calendario se calcula con RN-06."] +
                               (["Las tarifas de referencia se muestran como usuario externo."] if noa else []),
            "restricciones": ["El botón «Solicitar reserva» solo aparece con un perfil del portal (FichaInmueble.jsx:193)."],
            "alternativos": ["«Volver al catálogo»."],
        }
    if nombre == "Solicitar reserva":
        return {
            "objetivo": "Registrar una solicitud de reserva de un inmueble para el titular y su grupo.",
            "quien": et + " como titular de la solicitud.",
            "precondiciones": ["Estar en la ficha del inmueble."],
            "pasos": ["Pulsar «Solicitar reserva» en la ficha.",
                      "Paso 1 «Fechas y motivo»: elegir fechas y motivo.",
                      "Paso 2 «Ocupantes»: registrar a quienes se alojarán.",
                      "Paso 3 «Tarifa estimada»: revisar el desglose y, si se quiere, escribir observaciones.",
                      "Paso 4 «Confirmación» («Revise y confirme su solicitud»): pulsar «Enviar solicitud»."],
            "resultado": "Se crea la reserva con código R-2026-NNNN (RN-18) en estado recibida, o lista_espera si no hay "
                         "cupo (RN-07), y se abre su comprobante.",
            "validaciones": ["Salida posterior a la entrada (RN-08).",
                             "Al menos un ocupante y no más que la capacidad (RN-09).",
                             "El estado y el monto los calcula la capa api, no los toma del formulario (RN-37)."],
            "errores": [["La fecha de salida debe ser posterior a la de entrada.", "Fechas iguales, invertidas o vacías (422)."],
                        ["Debe registrar al menos un ocupante.", "Lista de ocupantes vacía (422)."],
                        ["La reserva excede la capacidad máxima del inmueble (N personas).", "Más ocupantes que la capacidad (422)."],
                        ["Inmueble no encontrado", "Inmueble inexistente (404)."],
                        ["No fue posible registrar la solicitud.", "Error sin detalle (Reservar.jsx:199)."]],
            "consideraciones": [_tarifa(rol),
                                "La solicitud no verifica sanciones vigentes del titular ni los días máximos por afiliado "
                                "de la temporada (ver hallazgos).",
                                "El aviso lateral «Política de desistimiento» explica RN-15."],
            "restricciones": ["Solo los perfiles del portal ven el formulario; los demás ven «Perfil sin acceso a este "
                              "formulario» (Reservar.jsx:163-170). Es una guarda de interfaz (RN-02)."],
            "alternativos": ["«Cancelar» en el paso 1 vuelve a la ficha; «Anterior» retrocede un paso."],
        }
    if nombre == "Seleccionar las fechas":
        return {
            "objetivo": "Elegir el día de ingreso, el de salida y el motivo de la solicitud.",
            "quien": et + ".",
            "precondiciones": ["Haber pulsado «Solicitar reserva»."],
            "pasos": ["En «Seleccione las fechas», pulsar el día de ingreso y luego el de salida en el calendario de dos meses.",
                      "Comprobar el aviso «Fechas seleccionadas» con el número de noches.",
                      "Elegir el «Motivo de la solicitud»: Razones médicas, Cometido laboral o Razones personales / descanso.",
                      "Pulsar «Continuar»."],
            "resultado": "Queda definido el rango y el motivo; el panel lateral muestra noches y tarifa estimada.",
            "validaciones": ["«Continuar» queda deshabilitado mientras no haya ingreso, salida y al menos una noche "
                             "(Reservar.jsx:176); mensaje «Seleccione el día de ingreso y el de salida para continuar.»",
                             "El calendario deshabilita días pasados y no disponibles (CalendarioDisponibilidad.jsx:63) — "
                             "solo interfaz (RN-39).",
                             "La temporada se toma por la fecha de entrada (RN-14)."],
            "errores": [],
            "consideraciones": ["En casas de huéspedes se informa la prelación médica, laboral, personal (RN-17, RN-36).",
                                "Motivo médico baja la tarifa de los beneficiarios en casas de huéspedes (RN-13)"
                                + ("; para el Usuario no afiliado no hay beneficiarios, así que no cambia el cobro." if noa else ".")],
            "restricciones": ["La capa api acepta fechas pasadas y motivos fuera de la lista (sondas S4c y S6)."],
            "alternativos": ["Elegir un rango que incluye días ocupados: la solicitud quedará en lista de espera (RN-07)."],
        }
    if nombre == "Registrar los ocupantes":
        return {
            "objetivo": "Indicar quiénes se alojarán, porque la categoría de cada uno define la tarifa.",
            "quien": et + ".",
            "precondiciones": ["Haber completado el paso de fechas."],
            "pasos": ["En «Registro de ocupantes», revisar al titular precargado (%s)." % _USUARIO[rol]]
                     + ([] if noa else ["Marcar las casillas del «Grupo familiar inscrito en Bienestar» que viajan."])
                     + ["Para otras personas, pulsar «Agregar acompañante» y completar «Nombre completo», «RUT» y «Parentesco».",
                        "Revisar el contador «Total de ocupantes registrados N de M personas».",
                        "Pulsar «Continuar»."],
            "resultado": "Lista final de ocupantes con su categoría tarifaria («Tarifa afiliado» o «Tarifa usuario externo»).",
            "validaciones": ["«Continuar» deshabilitado si se excede la capacidad o si un acompañante no tiene nombre o RUT "
                             "(Reservar.jsx:172-177) — solo interfaz; la capa api repite solo la capacidad (RN-09).",
                             "El RUT del acompañante no se valida (ni formato ni dígito verificador) en la interfaz ni en la api (sonda S5)."],
            "errores": [["Se excede la capacidad máxima del inmueble", "Más ocupantes que la capacidad."],
                        ["Faltan datos de un acompañante", "Un acompañante sin nombre o sin RUT."]],
            "consideraciones": [_tarifa(rol)]
                               + (["El grupo familiar del perfil no se muestra al no afiliado (OcupantesForm.jsx:577, RN-33): "
                                   "todos se ingresan como acompañantes."] if noa else
                                  ["Un acompañante manual puede declararse «Cónyuge o conviviente civil» o «Hijo/a inscrito en "
                                   "Bienestar» y recibe tarifa de afiliado sin cruzarse con el grupo inscrito (ver hallazgos)."]),
            "restricciones": ["El titular no se puede quitar ni cambiar."],
            "alternativos": ["Quitar un acompañante con el botón de papelera."],
        }
    if nombre == "Consultar el comprobante de solicitud":
        return {
            "objetivo": "Ver e imprimir el comprobante de una solicitud enviada.",
            "quien": et + ".",
            "precondiciones": ["Haber enviado una solicitud, o conocer su código."],
            "pasos": ["Tras «Enviar solicitud», la app abre /reservas/{código} con el título «Comprobante de solicitud».",
                      "Leer el aviso de estado («Su solicitud fue registrada correctamente» o «Su solicitud quedó en lista de espera»).",
                      "Revisar inmueble, fechas, ocupantes y desglose de tarifa; imprimir si se desea."],
            "resultado": "Comprobante con el código R-2026-NNNN, estado y monto estimado.",
            "validaciones": [],
            "errores": [["Comprobante no encontrado", "El código no existe (getReserva: «Reserva no encontrada», 404)."]],
            "consideraciones": ["El comprobante se abre por código sin comprobar que la reserva sea del perfil: cualquier "
                                "código de otra persona muestra sus datos y RUT (sonda S9)."],
            "restricciones": ["La ruta /reservas/{código} no exige perfil (App.jsx:33)."],
            "alternativos": ["Abrirlo desde «Mis reservas»."],
        }
    if nombre == "Consultar mis reservas":
        return {
            "objetivo": "Ver las reservas propias, vigentes e históricas, con sus cobros.",
            "quien": et + ".",
            "precondiciones": ["Haber ingresado como %s." % et],
            "pasos": ["Abrir «Mis reservas» en el menú (/mis-reservas).",
                      "Revisar las tarjetas de reservas vigentes (hasta tres).",
                      "Filtrar por estado: recibida, confirmada, en curso, finalizada, anulada.",
                      "Usar las acciones de cada fila: «Desistir» o «Valorar»."],
            "resultado": "Tabla de reservas del titular con región, fechas, estado y monto.",
            "validaciones": ["La lista se pide con usuario_id del perfil (MisReservas.jsx:44, RN-38): es un filtro de la "
                             "interfaz; getReservas sin filtro devuelve las de todos (sonda S9b)."],
            "errores": [["Todavía no registra reservas con ese estado. Explore el catálogo para generar una solicitud.",
                         "No hay reservas en el estado filtrado."]],
            "consideraciones": ["El filtro de estados no incluye lista_espera ni rechazada como chip, aunque «Todos» las muestra "
                                "(MisReservas.jsx:152)."],
            "restricciones": ["Ruta protegida por RequiereRol solo en la interfaz (RN-02)."],
            "alternativos": ["«Nueva reserva» lleva al catálogo."],
        }
    if nombre == "Desistir de la reserva":
        return {
            "objetivo": "Anular una reserva propia aplicando la política de desistimiento.",
            "quien": et + " titular de la reserva.",
            "precondiciones": ["Reserva en estado recibida, confirmada o lista_espera (MisReservas.jsx:27, RN-34)."],
            "pasos": ["En «Mis reservas», pulsar «Desistir» en la fila.",
                      "En el diálogo «Desistir de la reserva», leer los días de aviso y el cobro estimado.",
                      "Pulsar «Confirmar desistimiento» (o «Mantener la reserva»)."],
            "resultado": "La reserva pasa a anulada y su monto queda en el cobro por desistimiento (RN-15).",
            "validaciones": ["Siete días o más de aviso: sin cobro; menos: el total (RN-15).",
                             "La interfaz siempre envía fuerza mayor = no; «La calificación de fuerza mayor la realiza "
                             "Oficina Central»."],
            "errores": [["Reserva no encontrada", "Código inexistente (404)."]],
            "consideraciones": ["Si la capa api fallara, el diálogo no muestra error: confirmarAnulacion no tiene catch "
                                "(MisReservas.jsx:104-113)."],
            "restricciones": ["La capa api no comprueba titular ni estado: anula reservas ajenas, ya anuladas, en curso o "
                              "finalizadas, y acepta fuerza mayor del cliente (sondas S8-S8e)."],
            "alternativos": ["«Mantener la reserva» cierra el diálogo sin cambios."],
        }
    if nombre == "Valorar la estadía":
        return {
            "objetivo": "Calificar con estrellas una estadía terminada.",
            "quien": et + " titular de la reserva finalizada.",
            "precondiciones": ["Reserva finalizada y sin valoración (el botón «Valorar» solo aparece entonces)."],
            "pasos": ["En «Mis reservas», pulsar «Valorar» en la reserva finalizada.",
                      "En el diálogo «Valorar la estadía», elegir de 1 a 5 estrellas en «¿Cómo estuvo la estadía?».",
                      "Opcional: escribir un «Comentario» (máximo 150 caracteres).",
                      "Pulsar «Enviar valoración»."],
            "resultado": "La valoración queda en la ficha del inmueble con el nombre del autor; la fila muestra las estrellas.",
            "validaciones": ["Entero de 1 a 5, solo finalizadas, una vez por reserva (RN-16).",
                             "«Enviar valoración» deshabilitado con 0 estrellas; el comentario se corta en 150 en la "
                             "interfaz, la api acepta más (sonda S7f, RN-35)."],
            "errores": [["La valoración debe ser un número entero de 1 a 5 estrellas.", "Estrellas fuera de rango o no entero (422)."],
                        ["Solo se pueden valorar estadías finalizadas.", "Reserva no finalizada (409)."],
                        ["Esta reserva ya fue valorada.", "Segunda valoración (409)."],
                        ["Reserva no encontrada", "Código inexistente (404)."],
                        ["No fue posible registrar la valoración.", "Error sin detalle."]],
            "consideraciones": ["«Su valoración queda visible en la ficha del inmueble junto a su nombre.»"],
            "restricciones": ["La api no comprueba que quien valora sea el titular ni que el inmueble sea el de la reserva "
                              "(sondas S7 y S7b)."],
            "alternativos": ["«Cancelar» cierra sin guardar."],
        }
    raise KeyError(nombre)


# ---------------------------------------------------------------------------------------------
# Casos de uso
# ---------------------------------------------------------------------------------------------
def casos(rol):
    et, p = _ETIQ[rol], _PFX[rol]
    noa = rol == "no_afiliado"
    cap = _CAP[rol]
    base = {"secundarios": "—", "fa": [], "fe": [], "rn": ["RN-02"], "validaciones": [], "verifica": "",
            "permisos": "Perfil %s elegido en el selector (sin credenciales, RN-01)." % et,
            "precondiciones": ["Haber ingresado como %s." % et]}
    L = []

    def c(n, **kw):
        d = dict(base)
        d.update(kw)
        d["id"] = "CU-%s-%03d" % (p, n)
        L.append(d)

    c(2, nombre="Buscar un inmueble en el catálogo", objetivo="Encontrar un inmueble según región, tipo y capacidad.",
      descripcion="Filtrar el «Catálogo de inmuebles» y abrir una ficha.",
      entradas=["Región", "Tipo de inmueble", "Capacidad mínima", "Texto de búsqueda"],
      flujo=["Abrir «Catálogo» en el menú: título «Catálogo de inmuebles».",
             "Elegir región y tipo, escribir capacidad mínima o un texto.",
             "Pulsar una tarjeta (ver captura %s)." % ("01-afi-catalogo.png" if not noa else "07-noa-catalogo.png")],
      resultado="Tarjetas filtradas; la tarifa «desde» corresponde a %s." % ("usuario externo" if noa else "afiliado"),
      fa=[["FA-01", "Ningún resultado: «No hay inmuebles con esos criterios»; «Limpiar filtros»."]],
      rn=["RN-10", "RN-20"] + (["RN-30", "RN-31"] if noa else []), datos="Inmuebles semilla (fixtures/inmuebles.js).",
      traz=["Portal", "Consultar el catálogo de inmuebles", "pages/publico/Catalogo.jsx", "GET /api/inmuebles (getInmuebles)", "inmuebles"])

    c(3, nombre="Revisar la ficha y la disponibilidad", objetivo="Decidir si solicitar, viendo días libres y tarifas.",
      descripcion="Abrir la ficha y leer el calendario «Disponibilidad».",
      entradas=["Id del inmueble"],
      flujo=["Abrir la ficha desde el catálogo.", "Leer el recuadro «Disponibilidad» y su calendario.",
             "Revisar «Tarifas de referencia» y «Valoraciones de huéspedes»."],
      resultado="Se ven los días libres, ocupados y bloqueados.",
      fe=[["FE-01", "Id inexistente: «Inmueble no encontrado»."]], rn=["RN-06", "RN-16"],
      datos="Reservas que ocupan y bloqueos (RN-05, RN-06).",
      traz=["Portal", "Consultar la ficha del inmueble", "pages/publico/FichaInmueble.jsx",
            "GET /api/inmuebles/{id}, GET /api/inmuebles/{id}/disponibilidad, GET /api/inmuebles/{id}/valoraciones",
            "inmuebles, reservas, bloqueos, valoraciones"])

    c(4, nombre="Solicitar una reserva con cupo", objetivo="Registrar una solicitud que queda recibida.",
      descripcion="Completar los cuatro pasos del asistente con un rango libre.",
      entradas=["Fechas", "Motivo", "Ocupantes", "Observaciones (opcional)"],
      flujo=["En la ficha, pulsar «Solicitar reserva».", "Elegir fechas libres y motivo; «Continuar».",
             "Registrar ocupantes; «Continuar».", "Revisar la tarifa estimada; «Continuar».",
             "En «Revise y confirme su solicitud», pulsar «Enviar solicitud»."],
      resultado="Se abre el comprobante con estado recibida y aviso «Su solicitud fue registrada correctamente».",
      fe=[["FE-01", "Error de la capa api: aviso «No se pudo registrar» con el mensaje."]],
      rn=["RN-04", "RN-08", "RN-09", "RN-10", "RN-11", "RN-12", "RN-18", "RN-32", "RN-37"] + (["RN-30"] if noa else []),
      validaciones=["RN-08", "RN-09"],
      datos="Nueva fila en reservas y una pista de auditoría «Creación de reserva».",
      traz=["Portal", "Solicitar reserva", "pages/publico/Reservar.jsx", "POST /api/reservas (crearReserva)",
            "reservas, auditoria"],
      verifica="Observado (sonda S1 sin sanción equivalente): crearReserva devuelve estado recibida y código R-2026-NNNN.")

    c(5, nombre="Solicitar en fechas sin cupo (lista de espera)", objetivo="Registrar la solicitud aunque el inmueble esté ocupado.",
      descripcion="El rango choca con una reserva que ocupa o con un bloqueo.",
      entradas=["Fechas que incluyen días ocupados", "Ocupantes"],
      flujo=["Pulsar «Solicitar reserva».", "En «Seleccione las fechas», elegir un rango (el calendario deshabilita días "
             "no disponibles; puede quedar un choque si cambió la disponibilidad).", "Completar y enviar."],
      resultado="Comprobante con «Su solicitud quedó en lista de espera» y el motivo del choque.",
      rn=["RN-06", "RN-07", "RN-17"], datos="reserva en lista_espera con observaciones = motivo del choque.",
      traz=["Portal", "Seleccionar las fechas", "pages/publico/Reservar.jsx (paso 1)",
            "POST /api/reservas, rangoDisponible (api/inmuebles.js)", "reservas, bloqueos"])

    c(6, nombre="Registrar a los ocupantes y acompañantes", objetivo="Declarar a todas las personas que se alojan.",
      descripcion="Titular precargado, " + ("acompañantes ingresados a mano." if noa else "grupo familiar con casillas y acompañantes a mano."),
      entradas=["Grupo familiar marcado"] * (0 if noa else 1) + ["Nombre, RUT y parentesco de cada acompañante"],
      flujo=["En el paso 2 «Registro de ocupantes», revisar el titular.",
             ("Pulsar «Agregar acompañante» y completar nombre, RUT y parentesco." if noa else
              "Marcar familiares inscritos; agregar acompañantes con nombre, RUT y parentesco."),
             "Comprobar «Total de ocupantes registrados» y pulsar «Continuar»."],
      resultado="Cada ocupante con su badge de tarifa.",
      fa=[["FA-01", "Quitar un acompañante con la papelera."]],
      fe=[["FE-01", "Exceso de capacidad: «Se excede la capacidad máxima del inmueble», no se puede continuar."],
          ["FE-02", "Acompañante sin nombre o RUT: «Faltan datos de un acompañante»."]],
      rn=["RN-09", "RN-12", "RN-33"] + (["RN-30"] if noa else []), validaciones=["RN-09"],
      datos="ocupantes[] dentro de la reserva.",
      traz=["Portal", "Registrar los ocupantes", "components/reservas/OcupantesForm.jsx", "— (estado local; se envía en POST /api/reservas)", "reservas.ocupantes"])

    c(7, nombre="Ingresar un acompañante con RUT inválido", objetivo="Comprobar qué pasa con un RUT mal escrito.",
      descripcion="Intento de salirse de la regla: RUT con dígito verificador malo, sin puntos, en minúscula o vacío.",
      entradas=["RUT «12.345.678-0», «12345678-5», «25.447.128-k», «abc», vacío"],
      flujo=["En «Registro de ocupantes», agregar un acompañante con RUT «12.345.678-0».", "Continuar y enviar."],
      resultado="La interfaz solo exige que el RUT no esté vacío; la capa api guarda cualquier texto, incluso vacío. "
                "No hay servidor que lo rechace.",
      rn=["RN-02"], datos="ocupantes[].rut tal como se escribió.",
      traz=["Portal", "Registrar los ocupantes", "components/reservas/OcupantesForm.jsx", "POST /api/reservas", "reservas.ocupantes"],
      verifica="Observado (sonda S5): los seis RUT se aceptaron y se guardaron literales, incluido «» y «abc».")

    c(8, nombre="Revisar la tarifa estimada", objetivo="Conocer el cobro antes de enviar.",
      descripcion="Paso 3 del asistente con el desglose de ResumenTarifa (ver captura 0%s)." %
                  ("8-noa-reservar-tarifa.png" if noa else "3c-afi-reservar-tarifa.png"),
      entradas=["Observaciones (opcional)"],
      flujo=["Pulsar «Solicitar reserva» y completar los pasos 1 y 2.", "En «Tarifa estimada», leer líneas, cantidades y total."],
      resultado=("Una sola línea «Tarifa usuario externo, por persona/noche» para todos." if noa else
                 "Líneas de tarifa afiliado (o preferente médica) y de usuario externo según parentesco."),
      rn=["RN-10", "RN-11", "RN-12", "RN-13", "RN-14"] + (["RN-30"] if noa else []),
      datos="detalle_tarifa y monto_total de la reserva.",
      traz=["Portal", "Solicitar reserva", "components/reservas/ResumenTarifa.jsx", "calcularTarifa (lib/tarifas.js)", "temporadas"],
      verifica="Observado (sonda S10): 2 noches, motivo médico, Casa de Huéspedes Toconao: afiliado $10.000 "
               "(preferente médica); no afiliado $30.000 (usuario externo).")

    c(9, nombre="Consultar el comprobante de la solicitud", objetivo="Tener la constancia de la solicitud.",
      descripcion="Pantalla que se abre tras enviar.", entradas=["Código R-2026-NNNN"],
      flujo=["Enviar la solicitud o abrir /reservas/{código}.", "Leer el «Comprobante de solicitud» e imprimir."],
      resultado="Comprobante con estado, ocupantes y tarifa.",
      fe=[["FE-01", "Código inexistente: «Comprobante no encontrado»."]], rn=["RN-18"],
      datos="Lectura de reservas.",
      traz=["Portal", "Consultar el comprobante de solicitud", "pages/publico/Comprobante.jsx",
            "GET /api/reservas/{codigo} (getReserva)", "reservas, inmuebles"])

    c(10, nombre="Abrir el comprobante de otra persona", objetivo="Comprobar si se ven datos ajenos.",
      descripcion="Intento de salirme de mi ámbito: abrir /reservas/{código} de una reserva de otro titular.",
      entradas=["Código de una reserva ajena (p. ej. R-2026-0001)"],
      flujo=["Escribir en la barra la dirección /reservas/R-2026-0001.", "Ver el «Comprobante de solicitud»."],
      resultado="Se muestra completo, con nombre y RUT del titular y de los ocupantes. No hay servidor que deniegue.",
      rn=["RN-02"], datos="titular_rut y ocupantes[].rut de otra persona.",
      traz=["Portal", "Consultar el comprobante de solicitud", "pages/publico/Comprobante.jsx", "GET /api/reservas/{codigo}", "reservas"],
      verifica="Observado (sonda S9): getReserva('R-2026-0001') con el perfil %s devolvió titular_rut 12.665.309-4 y "
               "tres RUT de ocupantes; getReservas sin filtro devolvió 61 reservas de 12 usuarios (S9b)." % et)

    c(11, nombre="Consultar mis reservas", objetivo="Seguir el estado de las solicitudes propias.",
      descripcion="Lista filtrada por el usuario del perfil (ver captura %s)." % ("09-noa-mis-reservas.png" if noa else "05-afi-mis-reservas.png"),
      entradas=["Filtro de estado"],
      flujo=["Abrir «Mis reservas».", "Elegir un estado en el filtro.", "Revisar montos y acciones."],
      resultado="Reservas del titular con su estado.",
      fa=[["FA-01", "Sin reservas en el estado: «Todavía no registra reservas con ese estado…»."]],
      rn=["RN-05", "RN-38"], datos="reservas con usuario_id del perfil.",
      traz=["Portal", "Consultar mis reservas", "pages/publico/MisReservas.jsx", "GET /api/reservas?usuario_id= (getReservas)", "reservas, valoraciones"])

    c(12, nombre="Desistir de una reserva propia", objetivo="Anular una reserva vigente.",
      descripcion="Desde «Mis reservas», con la política de desistimiento.",
      entradas=["Reserva recibida, confirmada o en lista de espera"],
      flujo=["En «Mis reservas», pulsar «Desistir».", "Leer el diálogo «Desistir de la reserva» (días de aviso y cobro).",
             "Pulsar «Confirmar desistimiento»."],
      resultado="La reserva pasa a anulada; el monto queda en $0 (≥ 7 días) o el total (< 7 días).",
      fa=[["FA-01", "«Mantener la reserva»: no cambia nada."]],
      fe=[["FE-01", "Error de la capa api: el diálogo no lo muestra (sin catch, MisReservas.jsx:104-113)."]],
      rn=["RN-04", "RN-15", "RN-34"], datos="estado anulada, monto_total = cobro, anulada_en, dias_aviso; auditoría «Anulación de reserva».",
      traz=["Portal", "Desistir de la reserva", "pages/publico/MisReservas.jsx", "POST /api/reservas/{codigo}/anular (anularReserva)", "reservas, auditoria"])

    c(13, nombre="Anular una reserva ajena, ya anulada o finalizada", objetivo="Comprobar los límites de la anulación.",
      descripcion="Intento de salirme de mi ámbito llamando a la capa api con códigos que la interfaz no ofrece.",
      entradas=["Código de reserva de otra persona", "Código ya anulado", "Código finalizado o en curso", "fuerzaMayor = true"],
      flujo=["Llamar anularReserva con el código de una reserva confirmada de otra persona.",
             "Repetir con la misma (ya anulada), con una finalizada y con una en curso.",
             "Llamar con fuerzaMayor = true."],
      resultado="Todas se aceptan: no hay servidor que compruebe titular, estado ni quién califica la fuerza mayor.",
      rn=["RN-02", "RN-15", "RN-34"], datos="historial_estados con «anulada» repetido; monto_total reescrito.",
      traz=["Portal", "Desistir de la reserva", "pages/publico/MisReservas.jsx", "POST /api/reservas/{codigo}/anular", "reservas"],
      verifica="Observado (sondas S8-S8e): R-2026-0014 ajena → anulada; otra vez → historial «recibida>anulada>anulada»; "
               "R-2026-0006 finalizada → anulada con monto 32000; R-2026-0005 en curso → anulada; fuerzaMayor autodeclarada "
               "→ cobro de un día ($30.000).")

    c(14, nombre="Valorar una estadía finalizada", objetivo="Dejar la calificación de la estadía.",
      descripcion="Desde «Mis reservas», en una reserva finalizada sin valorar.",
      entradas=["Estrellas 1-5", "Comentario (opcional, 150)"],
      flujo=["En «Mis reservas», pulsar «Valorar».", "En el diálogo «Valorar la estadía», elegir estrellas y comentar.",
             "Pulsar «Enviar valoración»."],
      resultado="La fila muestra las estrellas y la ficha del inmueble la valoración con el nombre del autor.",
      fa=[["FA-01", "«Cancelar» cierra sin guardar."]],
      fe=[["FE-01", "«Esta reserva ya fue valorada.»"], ["FE-02", "«Solo se pueden valorar estadías finalizadas.»"]],
      rn=["RN-04", "RN-16", "RN-35"], validaciones=["RN-16"],
      datos="Nueva fila en valoraciones; auditoría «Valoración de estadía».",
      traz=["Portal", "Valorar la estadía", "pages/publico/MisReservas.jsx", "POST /api/inmuebles/{id}/valoraciones (crearValoracion)", "valoraciones, auditoria"],
      verifica="Observado (sondas S7c-S7e, S7g): 0 y 4,5 estrellas → 422; segunda vez → 409; no finalizada → 409.")

    c(15, nombre="Valorar una reserva de otra persona", objetivo="Comprobar si se puede calificar una estadía ajena.",
      descripcion="Intento de salirme de mi ámbito: crearValoracion con el código de una reserva finalizada de otro titular.",
      entradas=["Código ajeno finalizado", "inmueble_id arbitrario"],
      flujo=["Llamar crearValoracion con R-2026-0021 (de otra persona) y 1 estrella.",
             "Llamar con otra reserva y inmueble_id 9999.", "Llamar con un comentario de 500 caracteres."],
      resultado="Se acepta: la valoración queda a nombre del perfil, puede quedar en un inmueble que no es el de la "
                "reserva y supera el límite de 150. No hay servidor que deniegue.",
      rn=["RN-02", "RN-16"], datos="valoraciones con autor del perfil e inmueble_id del cliente.",
      traz=["Portal", "Valorar la estadía", "pages/publico/MisReservas.jsx", "POST /api/inmuebles/{id}/valoraciones", "valoraciones"],
      verifica="Observado (sondas S7, S7b, S7f): R-2026-0021 de Óscar Maldonado Vera valorada con autor «María Fuentes "
               "Rojas»; R-2026-0011 guardada con inmueble_id 9999 (real 2); comentario de 500 caracteres guardado.")

    c(16, nombre="Solicitar con una sanción vigente", objetivo="Comprobar si una sanción impide reservar.",
      descripcion="Intento de salirme de la regla: Oficina Central registra una sanción vigente al RUT del titular y "
                  "el titular solicita.",
      entradas=["Sanción vigente con usuario_rut del perfil"],
      flujo=["Registrar una sanción (crearSancion) con el RUT del titular.", "Pulsar «Solicitar reserva» y enviar."],
      resultado="La solicitud se registra recibida: crearReserva no consulta sanciones. No hay servidor que deniegue.",
      rn=["RN-02"], datos="reserva recibida pese a la sanción.",
      traz=["Portal", "Solicitar reserva", "pages/publico/Reservar.jsx", "POST /api/reservas", "reservas, sanciones"],
      verifica="Observado (sonda S1): con sanción vigente al RUT %s, crearReserva devolvió estado recibida." %
               ("15.336.204-1" if noa else "13.457.902-8 (R-2026-0043)"))

    c(17, nombre="Exceder los días máximos de la temporada", objetivo="Comprobar el tope de días por afiliado.",
      descripcion="Intento de salirme de la regla: 20 noches dentro de la temporada estival (dias_maximos_por_afiliado = 10).",
      entradas=["Entrada 2027-01-05, salida 2027-01-25"],
      flujo=["En «Seleccione las fechas», elegir 20 noches en la temporada estival.", "Completar y enviar."],
      resultado="Se registra recibida por 20 noches: el tope de la temporada no se aplica en ninguna parte.",
      rn=["RN-14"], datos="temporadas.dias_maximos_por_afiliado (no se lee).",
      traz=["Portal", "Seleccionar las fechas", "pages/publico/Reservar.jsx (paso 1)", "POST /api/reservas", "reservas, temporadas"],
      verifica="Observado (sondas S2 y portal_s2): 20 noches en estival → recibida, $900.000; 60 noches → recibida.")

    c(18, nombre="Enviar un motivo o fechas fuera de regla", objetivo="Comprobar las listas y fechas en la capa api.",
      descripcion="Intento de salirse de la regla con motivo «vacaciones», fechas invertidas, vacías o pasadas, y "
                  "parentesco fuera de lista.",
      entradas=["motivo «vacaciones»", "salida antes de entrada", "fechas 2020", "parentesco «primo»"],
      flujo=["En «Seleccione las fechas» la interfaz solo ofrece los tres motivos y días futuros; se llama crearReserva directamente.",
             "Enviar cada variante."],
      resultado="Fechas invertidas o vacías se rechazan; motivo, fecha pasada y parentesco fuera de lista se aceptan.",
      fe=[["FE-01", "«La fecha de salida debe ser posterior a la de entrada.» (422)."]],
      rn=["RN-08", "RN-17", "RN-39"], validaciones=["RN-08"],
      datos="reserva con motivo «vacaciones» (sin prelación).",
      traz=["Portal", "Seleccionar las fechas", "pages/publico/Reservar.jsx (paso 1)", "POST /api/reservas", "reservas"],
      verifica="Observado (sondas S4, S4b, S4c, S6, S6b2): invertidas y vacías → 422; 2020-01-01 → recibida; "
               "«vacaciones» → recibida $8.000; «primo» → tarifa externo.")

    if noa:
        c(19, nombre="Presentarse como afiliado sin serlo", objetivo="Comprobar de dónde sale la categoría tarifaria.",
          descripcion="Intento de salirme de mi ámbito: el no afiliado envía un actor con tipo «afiliado» o un acompañante "
                      "con parentesco «conyuge».",
          entradas=["actor.tipo = afiliado", "parentesco conyuge"],
          flujo=["Llamar crearReserva con el actor del no afiliado y tipo «afiliado».", "Llamar con un acompañante «conyuge»."],
          resultado="Con tipo «afiliado» la reserva queda titular_es_afiliado = true (tarifa afiliado). Con su actor real, "
                    "el parentesco no cambia nada: todos externos. No hay servidor que lo decida.",
          rn=["RN-12", "RN-30"], datos="reservas.titular_es_afiliado.",
          traz=["Portal", "Solicitar reserva", "pages/publico/Reservar.jsx", "POST /api/reservas", "reservas"],
          verifica="Observado (sondas S6c, S6c2): titular_es_afiliado true con actor manipulado; «conyuge» con actor real → "
                   "2 × tarifa externo.")
    else:
        c(19, nombre="Declarar un acompañante como hijo o cónyuge", objetivo="Comprobar si el parentesco declarado cambia la tarifa.",
          descripcion="Intento de salirse de la regla: un acompañante ingresado a mano con parentesco «Hijo/a inscrito en "
                      "Bienestar» que no está en el grupo inscrito.",
          entradas=["Acompañante con parentesco hijo"],
          flujo=["En «Registro de ocupantes», «Agregar acompañante» y elegir parentesco «Hijo/a inscrito en Bienestar».",
                 "Ver el badge «Tarifa afiliado» y enviar."],
          resultado="Recibe tarifa de afiliado sin cruzarse con el grupo inscrito; la api tampoco lo cruza.",
          rn=["RN-12"], datos="ocupantes[].parentesco declarado por el usuario.",
          traz=["Portal", "Registrar los ocupantes", "components/reservas/OcupantesForm.jsx", "POST /api/reservas", "reservas"],
          verifica="Observado (sonda S6b): un único ocupante «hijo» con motivo médico → línea «Tarifa afiliado preferente "
                   "(motivo médico)». Leído en OcupantesForm.jsx:662 (la lista ofrece cónyuge e hijo).")
    return L


# ---------------------------------------------------------------------------------------------
# Textos de rol
# ---------------------------------------------------------------------------------------------
def _texto(rol):
    noa = rol == "no_afiliado"
    et = _ETIQ[rol]
    return {
        "resumen": ("Persona externa o trabajador/a CONAF no afiliado que solicita inmuebles de la red de Bienestar pagando "
                    "tarifa de usuario externo." if noa else
                    "Trabajador/a afiliado al Servicio de Bienestar que solicita inmuebles de la red para sí y su grupo familiar."),
        "objetivo": "Encontrar un inmueble, solicitarlo, seguir la solicitud, desistir a tiempo y valorar la estadía.",
        "alcance": ["Catálogo y ficha de inmuebles con disponibilidad.", "Solicitud de reserva en cuatro pasos.",
                    "Comprobante de solicitud.", "Mis reservas: desistir y valorar."],
        "fuera_alcance": ["Confirmar, rechazar o gestionar reservas (Encargada regional).",
                          "Calificar la fuerza mayor (Oficina Central).", "Mantener inmuebles y tarifas (Administrador)."]
                         + (["Grupo familiar inscrito: no se le ofrece."] if noa else []),
        "requisitos": ["Navegador con JavaScript.", "Elegir «%s» en «Ver el sistema como»." % et],
        "interfaz": [["Menú «Catálogo» / «Mis reservas»", "Las dos secciones del perfil."],
                     ["Botón «Solicitar reserva»", "En la ficha, abre el asistente de cuatro pasos."],
                     ["Indicador de pasos", "Fechas y motivo · Ocupantes · Tarifa estimada · Confirmación."],
                     ["Panel «Resumen de la solicitud»", "Inmueble, motivo, noches, ocupantes y tarifa en vivo."],
                     ["Badges de tarifa", "«Tarifa afiliado» (verde) o «Tarifa usuario externo» (ámbar)."]]
                    + ([["Franja ámbar superior", "«Está navegando como usuario no afiliado…» (RN-31)."]] if noa else []),
        "errores_frecuentes": [["«Continuar» no se activa en el paso 1", "Falta el día de salida o es el mismo que el de entrada.",
                                "Pulsar ingreso y luego salida en el calendario."],
                               ["«Continuar» no se activa en el paso 2", "Se excede la capacidad o un acompañante no tiene nombre o RUT.",
                                "Quitar personas o completar los datos."],
                               ["La solicitud quedó en lista de espera", "El rango choca con una reserva o un bloqueo (RN-07).",
                                "Esperar asignación de cupo o elegir otras fechas."],
                               ["No aparece «Desistir»", "La reserva ya está en curso, finalizada, rechazada o anulada.",
                                "Contactar a la encargada regional."]],
        "buenas_practicas": ["Desistir con siete días o más de aviso para no pagar (RN-15).",
                             "Revisar el RUT de cada acompañante: el sistema no lo valida.",
                             "Guardar o imprimir el comprobante con el código R-2026-NNNN."],
        "faq": [["¿Por qué pago tarifa de usuario externo?", ("Porque el perfil es no afiliado: todos los ocupantes pagan esa "
                                                            "tarifa (RN-30)." if noa else
                                                            "Los acompañantes que no son cónyuge o hijo inscrito pagan tarifa externa (RN-12).")],
                ["¿Mi solicitud ya está confirmada?", "No: queda recibida hasta que la encargada regional la confirme."],
                ["¿Quién califica la fuerza mayor?", "Oficina Central; desde el portal se desiste sin fuerza mayor."],
                ["¿Las tarifas son oficiales?", "No: son de referencia, por validar (RN-20)."]]
               + ([["¿Qué significa «sujetas a la prioridad de los afiliados»?",
                    PV + " el código solo muestra el aviso; no hay regla que ordene por afiliación."]] if noa else []),
    }


ROL_TEXTO = {"afiliado": _texto("afiliado"), "no_afiliado": _texto("no_afiliado")}

# ---------------------------------------------------------------------------------------------
CAMPOS = {
    "Seleccionar las fechas": [
        ["Fecha de ingreso", "Sí", "Día no pasado y disponible en el calendario (solo interfaz).", "La api acepta fechas pasadas (S4c)."],
        ["Fecha de salida", "Sí", "Posterior a la de ingreso (RN-08).", "422 «La fecha de salida debe ser posterior a la de entrada.»"],
        ["Motivo de la solicitud", "Sí", "Razones médicas, Cometido laboral, Razones personales / descanso.",
         "Por defecto «personal»; la api acepta cualquier texto (S6)."],
    ],
    "Registrar los ocupantes": [
        ["Titular", "Sí", "Precargado del perfil, no editable.", ""],
        ["Grupo familiar inscrito", "No", "Casillas; solo para Afiliado/a.", "Tarifa afiliado."],
        ["Nombre completo (acompañante)", "Sí", "No vacío (solo interfaz).", ""],
        ["RUT (acompañante)", "Sí", "No vacío (solo interfaz); sin validación de formato ni dígito.", "S5: se guarda cualquier texto."],
        ["Parentesco (acompañante)", "Sí", "Cónyuge o conviviente civil, Hijo/a inscrito, Otro familiar, Otro acompañante.",
         "Decide la tarifa sin cruzarse con el grupo inscrito."],
    ],
    "Solicitar reserva": [
        ["Observaciones", "No", "Texto libre.", "Si se omite y no hay cupo, guarda el motivo del choque."],
    ],
    "Valorar la estadía": [
        ["Estrellas", "Sí", "Entero de 1 a 5 (RN-16).", "422 si no."],
        ["Comentario", "No", "Máximo 150 caracteres (solo interfaz).", "La api acepta 500 (S7f)."],
    ],
}

_P = "Afiliado/a, Usuario no afiliado"
ENDPOINTS = [
    ["GET", "/api/inmuebles?region=&tipo=&capacidad_min=&busqueda=", "Catálogo filtrado", _P],
    ["GET", "/api/inmuebles/{id}", "Ficha del inmueble", _P],
    ["GET", "/api/inmuebles/{id}/disponibilidad?desde=&hasta=", "Calendario de disponibilidad", _P],
    ["GET", "/api/inmuebles/{id}/valoraciones", "Valoraciones y promedio del inmueble", _P],
    ["POST", "/api/inmuebles/{id}/valoraciones", "Valorar una estadía finalizada", _P],
    ["POST", "/api/reservas", "Crear la solicitud de reserva", _P],
    ["GET", "/api/reservas?region=&estado=&usuario_id=&inmueble_id=", "Mis reservas (filtro usuario_id)", _P],
    ["GET", "/api/reservas/{codigo}", "Comprobante de solicitud", _P],
    ["POST", "/api/reservas/{codigo}/anular", "Desistir de la reserva", _P],
    ["GET", "/api/reservas/simular-tarifa", "Simular tarifa (la interfaz no la usa: Reservar.jsx llama calcularTarifa directo)", _P],
]

REGLAS_NUEVAS = [
    ["RN-30", "Tarifa externa del no afiliado", "El titular es afiliado si actor.tipo ≠ «externo»; si no, todos los ocupantes "
     "pagan tarifa de usuario externo.", "api/reservas.js:88, lib/tarifas.js categoriaOcupante"],
    ["RN-31", "Aviso del no afiliado", "Franja ámbar: tarifas de usuario externo y solicitudes «sujetas a la prioridad de los "
     "afiliados y su grupo familiar».", "components/layout/AppLayout.jsx:142-151"],
    ["RN-32", "Asistente en cuatro pasos", "Fechas y motivo, Ocupantes, Tarifa estimada, Confirmación; «Continuar» se habilita "
     "con fechas válidas (paso 1) y sin exceso de capacidad ni acompañantes incompletos (paso 2).", "pages/publico/Reservar.jsx:175-180"],
    ["RN-33", "Grupo familiar solo para afiliado", "Las casillas del grupo inscrito se muestran solo si el titular es afiliado.",
     "components/reservas/OcupantesForm.jsx:577"],
    ["RN-34", "Estados desistibles", "«Desistir» aparece solo en recibida, confirmada y lista_espera (solo interfaz).",
     "pages/publico/MisReservas.jsx:27, 162"],
    ["RN-35", "Valorar desde la fila", "«Valorar» aparece solo en finalizadas sin valoración; comentario de hasta 150 caracteres "
     "(solo interfaz).", "pages/publico/MisReservas.jsx:170-178, 262-266"],
    ["RN-36", "Prelación informada", "En casas de huéspedes el paso 1 informa el orden médico, laboral, personal.",
     "pages/publico/Reservar.jsx:279-285"],
    ["RN-37", "Estado y monto calculados", "crearReserva fija estado (recibida o lista_espera) y monto con calcularTarifa; ignora "
     "estado y monto enviados.", "api/reservas.js:57-139"],
    ["RN-38", "Mis reservas por usuario", "La lista se pide con usuario_id del perfil (filtro de interfaz).",
     "pages/publico/MisReservas.jsx:44"],
    ["RN-39", "Días pasados no seleccionables", "El calendario de rango deshabilita días anteriores a hoy y no disponibles "
     "(solo interfaz).", "components/inmuebles/CalendarioDisponibilidad.jsx:62-63"],
]

HALLAZGOS_AREA = [
    ["Alta", "Una sanción vigente no impide solicitar reservas: crearReserva no consulta sanciones.",
     "Observado (sonda S1): con sanción vigente al RUT 13.457.902-8 (y al 15.336.204-1), crearReserva devolvió estado recibida.",
     "El bloqueo por sanción de Oficina Central no tiene efecto en el portal."],
    ["Alta", "La anulación no comprueba titular ni estado: anula reservas ajenas, ya anuladas, en curso y finalizadas, y "
     "acepta fuerza mayor declarada por el cliente.",
     "Observado (sondas S8-S8e): R-2026-0014 ajena → anulada; repetida → historial «anulada>anulada»; R-2026-0006 finalizada → "
     "anulada y monto 32000; R-2026-0005 en curso → anulada; fuerzaMayor → cobro de un día.",
     "Pérdida de reservas de terceros y cobros alterados; la regla «fuerza mayor la califica Oficina Central» solo vive en un texto."],
    ["Media", "No se aplica dias_maximos_por_afiliado de la temporada (existe en fixtures/temporadas.js pero ningún código lo lee).",
     "Observado (sonda portal_s2): 20 noches en temporada estival (máximo 10) → recibida, $900.000.",
     "Se pueden pedir estadías más largas que el tope de Bienestar."],
    ["Media", "Se puede valorar una reserva ajena y asignar la valoración a otro inmueble.",
     "Observado (sondas S7, S7b): R-2026-0021 de otra persona valorada con autor «María Fuentes Rojas»; R-2026-0011 guardada con "
     "inmueble_id 9999 (real 2).", "Valoraciones falsas o en la ficha equivocada."],
    ["Media", "El comprobante y la lista de reservas exponen datos personales de otras personas por código o sin filtro.",
     "Observado (sondas S9, S9b): getReserva('R-2026-0001') devolvió titular_rut y RUT de ocupantes ajenos; getReservas({}) "
     "devolvió 61 reservas de 12 usuarios.", "Exposición de RUT y grupos familiares de terceros."],
    ["Media", "El RUT del acompañante no se valida (formato ni dígito verificador) en interfaz ni api.",
     "Observado (sonda S5): «12.345.678-0», «12345678-5», «25.447.128-k», «abc» y «» se guardaron literales.",
     "Datos de ocupantes no confiables para control de ingreso."],
    ["Media", "La categoría tarifaria la decide el cliente: actor.tipo y el parentesco declarado del acompañante.",
     "Observado (sondas S6b, S6c): acompañante «hijo» → tarifa afiliado sin cruzar con el grupo inscrito; no afiliado con "
     "actor.tipo «afiliado» → titular_es_afiliado true. Leído en OcupantesForm.jsx:662 (la lista ofrece cónyuge e hijo).",
     "Tarifa afiliado para no beneficiarios."],
    ["Baja", "La capa api acepta motivo fuera de lista, fechas pasadas, solicitudes solapadas del mismo titular y comentarios "
     "de más de 150 caracteres; solo la interfaz lo impide.",
     "Observado (sondas S6, S4c, S3, S7f): «vacaciones» → recibida; 2020-01-01 → recibida; mismas fechas dos veces → recibida; "
     "comentario de 500 guardado.", "Datos fuera de regla si cambia la interfaz o se llama la api directo."],
    ["Baja", "El diálogo «Desistir de la reserva» no muestra errores: confirmarAnulacion tiene try/finally sin catch.",
     "Leído en pages/publico/MisReservas.jsx:104-113.", "Si la api falla, el usuario no se entera."],
    ["Por validar", "La tarifa que ve el usuario en el asistente usa fixtures/temporadas.js, y la que se guarda usa store.temporadas "
     "(que el Administrador puede ampliar).",
     "Leído en pages/publico/Reservar.jsx:15,146 y api/reservas.js:95. " + PV + " si una temporada creada por el Administrador "
     "hace diferir el monto mostrado del guardado (no lo comprobé).", "Posible diferencia entre tarifa estimada y monto registrado."],
    ["Por validar", "«Sujetas a la prioridad de los afiliados» (aviso del no afiliado) no tiene regla en el código.",
     "Leído en components/layout/AppLayout.jsx:148; ningún orden usa titular_es_afiliado (búsqueda de «prioridad» solo halla el aviso y una semilla).",
     "Promesa al usuario sin respaldo; falta la regla de Bienestar."],
]

SONDAS_AREA = [
    ["Datos solapados", "Afiliado/a", "Misma persona, mismo inmueble y mismas fechas dos veces", "Aceptado: recibida ambas (S3)"],
    ["Inicio posterior al fin", "Afiliado/a", "Salida 2027-03-10 antes de entrada 2027-03-12; fechas vacías",
     "Rechazado 422 «La fecha de salida debe ser posterior a la de entrada.» (S4, S4b)"],
    ["Fecha pasada", "Afiliado/a", "Entrada 2020-01-01", "Aceptado: recibida (S4c); la interfaz deshabilita días pasados"],
    ["RUT de acompañante", "Afiliado/a", "Dígito malo, sin puntos, minúscula, «abc», vacío", "Aceptados y guardados literales (S5)"],
    ["Valor de lista falso", "Afiliado/a", "Motivo «vacaciones»; parentesco «primo»; estado «confirmada» en el payload",
     "Motivo y parentesco aceptados; estado ignorado, queda recibida (S6, S6b2, S6d)"],
    ["Fuera de ámbito: sanción", "Afiliado/a y Usuario no afiliado", "Solicitar con sanción vigente del titular",
     "Aceptado: recibida (S1)"],
    ["Fuera de regla: días máximos", "Afiliado/a y Usuario no afiliado", "20 noches en estival (máx. 10); 60 noches",
     "Aceptado: recibida (portal_s2, S2, S2b)"],
    ["Fuera de ámbito: otra persona", "Afiliado/a", "Valorar reserva ajena; inmueble_id falso",
     "Aceptado (S7, S7b)"],
    ["Fuera de ámbito: otra persona", "Afiliado/a", "Anular ajena, ya anulada, finalizada, en curso; fuerza mayor",
     "Aceptado en todos los casos (S8-S8e); código inexistente → 404 «Reserva no encontrada»"],
    ["Datos personales por la API", "Afiliado/a", "getReserva de otra persona; getReservas sin filtro; getValoraciones",
     "Devuelve RUT de titular y ocupantes ajenos; 61 reservas de 12 usuarios; valoraciones con usuario_id (S9-S9c)"],
    ["Capacidad y ocupantes", "Afiliado/a", "7 ocupantes en capacidad 6; lista vacía",
     "Rechazado 422 (S6e, S6f)"],
    ["Valoración fuera de rango", "Afiliado/a", "0 y 4,5 estrellas; segunda vez; no finalizada",
     "Rechazado 422, 409, 409 (S7c-S7e, S7g)"],
    ["Tarifa externa", "Usuario no afiliado", "Mismo rango y motivo médico que el afiliado",
     "No afiliado $30.000 externo vs afiliado $10.000 preferente (S10)"],
    ["Presentarse como afiliado", "Usuario no afiliado", "actor.tipo «afiliado»; acompañante «conyuge»",
     "titular_es_afiliado true; con actor real, todos externos (S6c, S6c2)"],
    ["Borrarse a sí mismo", "Afiliado/a y Usuario no afiliado", "—", "No aplica: el portal no gestiona usuarios."],
]
