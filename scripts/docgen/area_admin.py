# -*- coding: utf-8 -*-
"""Perfil Administrador: mantención de inmuebles, temporadas, nómina de afiliados y pistas de
auditoría (pages/admin/*.jsx, api/inmuebles.js actualizarInmueble, api/gestion.js).

Código leído en el commit 0d44fb3 (último que compila). Sondas ejecutadas el 2026-11-13 con
Node sobre la capa api/ (sin navegador, store en memoria): scratchpad/coipo_cabania/sondas/
admin_sondas.mjs, admin_sondas2.mjs y admin_sondas3.mjs.
"""

ADM = "Administrador"
_PANT_INM = "Mantención de inmuebles (/admin/inmuebles)"
_PANT_TEMP = "Gestión de temporadas (/admin/temporadas)"
_PANT_NOM = "Nómina de afiliados y cargas familiares (/admin/nomina)"
_PANT_AUD = "Pistas de auditoría (/admin/auditoria)"
_SIN_SERV = ("No hay servidor que deniegue: la capa api/ no recibe ni verifica el perfil (RN-02); "
             "solo la interfaz restringe.")


def funcionalidad(nombre, rol):
    if rol != "admin":
        raise KeyError((nombre, rol))
    if nombre == "Mantener los inmuebles":
        return {
            "objetivo": "Corregir los datos de la ficha de un inmueble de la red (nombre, tipo, localidad, dirección, "
                        "capacidad, dormitorios, descripción y equipamiento).",
            "quien": ADM + ".",
            "precondiciones": ["Haber ingresado como Administrador con el selector de perfil."],
            "pasos": ["Abrir «Inmuebles» en el menú: se muestra «Mantención de inmuebles» con la tabla de la red.",
                      "Opcional: escribir en «Buscar inmueble» (nombre o localidad).",
                      "En la fila del inmueble, pulsar «Editar»: se abre el diálogo «Editar inmueble».",
                      "Cambiar los campos (la región aparece deshabilitada: «La región no se modifica en la maqueta.»).",
                      "Pulsar «Guardar cambios»."],
            "resultado": "Aviso «Cambios guardados»: «Se guardaron los cambios de «<nombre>». Los cambios se reflejan de "
                         "inmediato en el catálogo público.» Queda una pista «Actualización de inmueble» con los campos "
                         "enviados (RN-04).",
            "validaciones": ["La interfaz marca «Nombre» como requerido y limita capacidad a 1-20 y dormitorios a 1-12 "
                             "(atributos min/max del campo), pero el botón «Guardar cambios» no se deshabilita y "
                             "api/inmuebles.js actualizarInmueble no valida nada (RN-60).",
                             "Inmueble inexistente: «Inmueble no encontrado» (404)."],
            "errores": [["Inmueble no encontrado", "El id no existe en el store (404)."]],
            "consideraciones": ["La interfaz siempre envía los ocho campos del formulario, aunque no cambien: la pista "
                                "de auditoría los lista todos como «Campos modificados».",
                                "Fotografías y zonas de interés no se editan: «La carga de fotografías y zonas de interés "
                                "se hará en el sistema definitivo.»",
                                "Ver captura 16-adm-inmuebles.png y 16b-adm-editar-inmueble.png."],
            "restricciones": ["No se crean ni se dan de baja inmuebles: solo se editan los existentes.",
                              "La región no se cambia desde la interfaz (sí por la capa api: hallazgo RN-60)."],
            "alternativos": ["«Ver ficha» abre la ficha pública del inmueble (/inmuebles/<id>).",
                             "«Cancelar» cierra el diálogo sin guardar."],
        }
    if nombre == "Gestionar las temporadas":
        return {
            "objetivo": "Consultar las temporadas y los bloqueos de fechas, y crear una temporada nueva que fija la "
                        "tarifa (alta o baja) de las reservas cuya fecha de entrada cae en ella.",
            "quien": ADM + ".",
            "precondiciones": ["Haber ingresado como Administrador."],
            "pasos": ["Abrir «Temporadas» en el menú: «Gestión de temporadas» con «Temporadas definidas» y «Bloqueos "
                      "de fechas».",
                      "Pulsar «Nueva temporada».",
                      "Completar «Nombre», «Tarifa aplicable» (Temporada alta / Temporada baja), «Desde», «Hasta», "
                      "opcionalmente «Días máximos por afiliado» y «Observaciones».",
                      "Pulsar «Crear temporada»."],
            "resultado": "La temporada aparece en «Temporadas definidas» y queda la pista «Creación de temporada» "
                         "(RN-04). Si es de tipo alta, desde ese momento las reservas con entrada en su rango se "
                         "cotizan con tarifa alta (RN-14; observado en la sonda T7).",
            "validaciones": ["La interfaz deshabilita «Crear temporada» si falta nombre, desde o hasta, y propone "
                             "«Hasta» con mínimo igual a «Desde»; api/gestion.js crearTemporada acepta cualquier dato "
                             "(RN-61).",
                             "Sin validación de solapamiento con otras temporadas (RN-62)."],
            "errores": [],
            "consideraciones": ["Los «Días máximos por afiliado» solo se muestran: ningún cálculo los aplica (RN-63).",
                                "Los bloqueos de fechas se muestran aquí, pero no se crean desde esta pantalla (los crea "
                                "la Encargada regional en el calendario operativo).",
                                "La tarjeta «Conversión de casas de huéspedes a uso de veraneo» es solo informativa.",
                                "Ver captura 17-adm-temporadas.png y 17b-adm-nueva-temporada.png."],
            "restricciones": ["No se editan ni se eliminan temporadas: solo se crean.",
                              "Solo el tipo «alta» cambia la tarifa; cualquier otro valor equivale a baja (RN-14)."],
            "alternativos": ["«Cancelar» cierra el diálogo sin crear."],
        }
    if nombre == "Consultar la nómina de afiliados y cargas familiares":
        return {
            "objetivo": "Ver el resumen de la última carga de la nómina de afiliados y cargas familiares contra la que "
                        "se decide quién paga tarifa de afiliado.",
            "quien": ADM + ".",
            "precondiciones": ["Haber ingresado como Administrador."],
            "pasos": ["Abrir «Nómina de afiliados» en el menú.",
                      "Leer los indicadores: «Afiliados vigentes», «Cargas familiares», «Nuevos en la última carga», "
                      "«Registros procesados».",
                      "Leer «Última carga registrada» (archivo, fecha, cargada por, resultado) y la «Vista previa del "
                      "archivo (ejemplo)»."],
            "resultado": "Se ve el resumen fijo de la carga «nomina_afiliados_2026-07.xlsx» (1.240 registros).",
            "validaciones": [],
            "errores": [],
            "consideraciones": ["Pantalla solo demostrativa: «Integración pendiente de definición». El botón "
                                "«Seleccionar archivo» está deshabilitado: «La carga real se habilita en el sistema "
                                "definitivo.» (RN-64).",
                                "La vista previa son cinco filas fijas escritas en la página, no datos del store.",
                                "Ver captura 18-adm-nomina-afiliados.png."],
            "restricciones": ["No se puede cargar ni corregir la nómina en la maqueta."],
            "alternativos": [],
        }
    if nombre == "Consultar las pistas de auditoría":
        return {
            "objetivo": "Revisar quién hizo qué, sobre qué dato y cuándo.",
            "quien": ADM + ".",
            "precondiciones": ["Haber ingresado como Administrador."],
            "pasos": ["Abrir «Auditoría» en el menú: «Pistas de auditoría».",
                      "Opcional: elegir un «Perfil» o escribir en «Buscar por usuario, acción o entidad».",
                      "Leer la tabla: Fecha y hora, Usuario, Perfil, Acción, Entidad, Detalle."],
            "resultado": "Se muestran «N de M registros», del más reciente al más antiguo.",
            "validaciones": [],
            "errores": [],
            "consideraciones": ["Las pistas incluyen nombres completos de personas y, en sanciones, el RUT en la "
                                "entidad («Usuario 17.005.882-4») (RN-65).",
                                "La hora de los registros nuevos se guarda en UTC y se muestra como hora local: aparece "
                                "adelantada (3 horas el 2026-11-13) (RN-66).",
                                "Las consultas de datos personales no se registran solas: el registro «Consulta de datos "
                                "personales» es de ejemplo (semilla).",
                                "Ver captura 19-adm-auditoria.png."],
            "restricciones": ["Solo lectura: no se pueden borrar ni corregir pistas."],
            "alternativos": ["Exportar lo filtrado con «Exportar CSV»."],
        }
    if nombre == "Exportar las pistas de auditoría":
        return {
            "objetivo": "Descargar las pistas visibles como archivo CSV.",
            "quien": ADM + ".",
            "precondiciones": ["Estar en «Pistas de auditoría»."],
            "pasos": ["Filtrar si se desea.", "Pulsar «Exportar CSV»."],
            "resultado": "Se descarga «auditoria_maqueta.csv» (separador «;», UTF-8 con BOM) con las columnas Fecha y "
                         "hora, Usuario, Perfil, Acción, Entidad, Detalle de los registros visibles.",
            "validaciones": [],
            "errores": [],
            "consideraciones": ["Exporta solo lo filtrado en pantalla.",
                                "El archivo lleva los mismos datos personales que la tabla (RN-65).",
                                "La exportación no deja pista de auditoría (a diferencia del registro semilla "
                                "«Exportación de nómina»)."],
            "restricciones": ["Las comillas dentro de un texto no se escapan [POR VALIDAR: no se probó un detalle con "
                              "comillas en un programa de planillas]."],
            "alternativos": [],
        }
    raise KeyError(nombre)


def _c(i, nombre, func, pant, serv, flujo, **kw):
    d = {"id": "CU-ADM-%03d" % i, "nombre": nombre, "objetivo": kw.pop("objetivo", nombre + "."),
         "descripcion": kw.pop("descripcion", nombre + "."),
         "permisos": kw.pop("permisos", "Perfil Administrador (solo interfaz, RN-02)."),
         "precondiciones": kw.pop("precondiciones", ["Haber ingresado como Administrador."]),
         "entradas": kw.pop("entradas", []), "flujo": flujo, "resultado": kw.pop("resultado", ""),
         "fa": kw.pop("fa", []), "fe": kw.pop("fe", []), "rn": kw.pop("rn", ["RN-02", "RN-04"]),
         "validaciones": kw.pop("validaciones", []), "datos": kw.pop("datos", "—"),
         "traz": ["Administración", func, pant, serv, kw.pop("tablas", "store.inmuebles")],
         "verifica": kw.pop("verifica", ""), "secundarios": kw.pop("secundarios", "—")}
    assert not kw, kw
    return d


_INM, _TEMP = "Mantener los inmuebles", "Gestionar las temporadas"
_NOM, _AUD, _EXP = ("Consultar la nómina de afiliados y cargas familiares", "Consultar las pistas de auditoría",
                    "Exportar las pistas de auditoría")
_S_INM = "PUT /api/inmuebles/{id} (actualizarInmueble)"
_S_TEMP = "POST /api/temporadas (crearTemporada)"


def casos(rol):
    if rol != "admin":
        return []
    return [
        _c(2, "Consultar y buscar inmuebles de la red", _INM, _PANT_INM, "GET /api/inmuebles (getInmuebles)",
           ["Abrir «Inmuebles»: se muestra «Mantención de inmuebles».", "Escribir parte del nombre o la localidad en "
            "«Buscar inmueble».", "Leer el conteo «N inmuebles» y la tabla."],
           resultado="La tabla muestra los inmuebles que coinciden (34 sin filtro).",
           fa=[["FA-01", "«Ver ficha» abre la ficha pública del inmueble."]], rn=["RN-02"],
           entradas=["Texto de búsqueda (opcional)"]),
        _c(3, "Editar los datos de un inmueble", _INM, _PANT_INM, _S_INM,
           ["En «Mantención de inmuebles», pulsar «Editar» en la fila.", "En «Editar inmueble», cambiar la capacidad "
            "máxima y el equipamiento (separado por comas).", "Pulsar «Guardar cambios»."],
           entradas=["Nombre, tipo, localidad, dirección, capacidad máxima, dormitorios, descripción, equipamiento"],
           resultado="Aviso «Cambios guardados» y pista «Actualización de inmueble»; el catálogo muestra el cambio.",
           fa=[["FA-01", "«Cancelar»: no se guarda nada."]],
           fe=[["FE-01", "Inmueble eliminado del store entre abrir y guardar: «Inmueble no encontrado» (404); la "
                         "interfaz no muestra el error (solo deja de girar el botón) [POR VALIDAR en pantalla]."]],
           rn=["RN-04", "RN-09", "RN-60"], tablas="store.inmuebles, store.auditoria",
           verifica="Sonda S1-S8 (admin_sondas.mjs)."),
        _c(4, "Guardar un inmueble con capacidad 0, negativa o texto", _INM, _PANT_INM, _S_INM,
           ["Llamar a actualizarInmueble(1, {capacidad_maxima: 0}).", "Repetir con -3 y con «muchos».",
            "En la interfaz: borrar el campo «Capacidad máxima» y pulsar «Guardar cambios» (Number('') = 0)."],
           objetivo="Comprobar si el sistema impide una capacidad inválida.",
           resultado="Observado: la capa api guardó 0, -3 y «muchos» sin error. Con capacidad 0 ninguna reserva cabe "
                     "(RN-09); con texto, la comparación de capacidad deja de funcionar.",
           rn=["RN-09", "RN-60"], verifica="Observado (sondas S1, S2, S3). La interfaz solo pone min=1 max=20 en el "
                                          "campo, sin impedir el envío."),
        _c(5, "Guardar un inmueble con nombre vacío", _INM, _PANT_INM, _S_INM,
           ["Abrir «Editar inmueble».", "Borrar «Nombre» (marcado requerido).", "Pulsar «Guardar cambios»."],
           resultado="Observado en la capa api: se guarda nombre «». El aviso dice «Se guardaron los cambios de «».» y "
                     "la pista queda con entidad vacía.",
           rn=["RN-60"], verifica="Observado (sonda S4)."),
        _c(6, "Intento de cambiar región o id de un inmueble por la API", _INM, "— (llamada directa)", _S_INM,
           ["Llamar a actualizarInmueble(1, {region: 'XX'}).", "Llamar a actualizarInmueble(1, {id: 999}).",
            "Consultar getInmueble(1) y getInmueble(999)."],
           objetivo="Comprobar si la API acepta campos que la interfaz no ofrece.",
           resultado="Observado: se aceptó región «XX» (inexistente) y el cambio de id; getInmueble(1) responde "
                     "«Inmueble no encontrado» y el inmueble pasa a ser el 999, dejando huérfanas sus reservas y "
                     "bloqueos. " + _SIN_SERV,
           fe=[["FE-01", "Inmueble no encontrado (404) al buscar el id original."]],
           rn=["RN-02", "RN-60"], verifica="Observado (sondas S5, S6, S6b, S6c)."),
        _c(7, "Intento de guardar un tipo de inmueble fuera de la lista", _INM, "— (llamada directa)", _S_INM,
           ["Llamar a actualizarInmueble(2, {tipo: 'castillo'})."],
           resultado="Observado: se guardó «castillo». La interfaz solo ofrece los tipos de TIPOS_INMUEBLE.",
           rn=["RN-60"], verifica="Observado (sonda S7). Efecto en la tarifa de ese inmueble [POR VALIDAR: no se "
                                  "cotizó un inmueble con tipo «castillo»]."),
        _c(8, "Crear una temporada alta", _TEMP, _PANT_TEMP, _S_TEMP,
           ["Abrir «Temporadas»: «Gestión de temporadas».", "Pulsar «Nueva temporada».",
            "Escribir «Semana Santa 2027», tarifa «Temporada alta», desde 05-04-2027, hasta 15-04-2027.",
            "Pulsar «Crear temporada»."],
           entradas=["Nombre", "Tarifa aplicable", "Desde", "Hasta", "Días máximos por afiliado (opcional)",
                     "Observaciones (opcional)"],
           resultado="La temporada aparece en la tabla y queda la pista «Creación de temporada». Observado: una casa "
                     "de veraneo cotizada con entrada el 10-04-2027 pasó de baja (60.000) a alta (90.000).",
           fa=[["FA-01", "«Cancelar»: no se crea."]], rn=["RN-04", "RN-14", "RN-61"],
           tablas="store.temporadas, store.auditoria", verifica="Observado (sonda T7)."),
        _c(9, "Crear una temporada con «desde» posterior a «hasta»", _TEMP, _PANT_TEMP, _S_TEMP,
           ["Llamar a crearTemporada({desde: '2027-05-10', hasta: '2027-04-01', tipo: 'alta'}).",
            "Cotizar una entrada el 10-04-2027."],
           resultado="Observado: se creó sin error y, en vez de no aplicar, rige como si el rango fuera 01-04 al "
                     "10-05-2027 (date-fns ordena los extremos): la entrada del 10-04 pasa a temporada alta. En la "
                     "interfaz, «Hasta» tiene mínimo «Desde», pero el botón no lo verifica [POR VALIDAR en pantalla: "
                     "si el navegador deja escribir una fecha menor].",
           rn=["RN-14", "RN-61"], tablas="store.temporadas", verifica="Observado (sonda T1)."),
        _c(10, "Crear una temporada que se solapa con otra", _TEMP, _PANT_TEMP, _S_TEMP,
           ["Crear «Solapa», alta, 01-10-2026 al 31-10-2026 (dentro de «Temporada baja 2026»).",
            "Cotizar una entrada el 15-10-2026."],
           resultado="Observado: se aceptó. La tarifa pasa a alta, pero el nombre de temporada del desglose sigue "
                     "siendo «Temporada baja 2026» (toma la primera que coincide).",
           rn=["RN-14", "RN-62"], tablas="store.temporadas", verifica="Observado (sonda T2)."),
        _c(11, "Crear una temporada con tipo fuera de lista o días máximos negativos", _TEMP, "— (llamada directa)",
           _S_TEMP,
           ["Llamar a crearTemporada con tipo «media».", "Llamar a crearTemporada con dias_maximos_por_afiliado -5."],
           resultado="Observado: ambas se guardan. «media» se comporta como baja; -5 se muestra en la tabla y no "
                     "limita nada (ningún cálculo usa ese campo).",
           rn=["RN-14", "RN-61", "RN-63"], tablas="store.temporadas", verifica="Observado (sondas T2, T3)."),
        _c(12, "Crear una temporada sin fechas o sin datos por la API", _TEMP, "— (llamada directa)", _S_TEMP,
           ["Llamar a crearTemporada({}) o con nombre y tipo pero sin desde/hasta.",
            "Como Afiliado/a, solicitar una reserva con entrada en una fecha no cubierta antes por otra temporada "
            "(p. ej. 10-07-2027)."],
           resultado="Observado: la temporada se crea (id 8, sin campos) y desde entonces crearReserva falla con "
                     "«TypeError: Cannot read properties of undefined (reading 'split')» para esas fechas: nadie puede "
                     "reservar en ellas hasta reiniciar la demostración. También duplica ids si se envía «id».",
           fe=[["FE-01", "Cannot read properties of undefined (reading 'split') — error de JavaScript, no un mensaje "
                         "del sistema."]],
           rn=["RN-03", "RN-61"], tablas="store.temporadas, store.reservas",
           verifica="Observado (sondas admin_sondas2/3: «con sin fechas» → TypeError; T5: ids [1,…,8,1]).",
           secundarios="Afiliado/a, Usuario no afiliado (no pueden reservar)"),
        _c(13, "Consultar la nómina de afiliados y cargas familiares", _NOM, _PANT_NOM,
           "GET /api/carga-nomina (getCargaNomina)",
           ["Abrir «Nómina de afiliados»: «Nómina de afiliados y cargas familiares».",
            "Leer indicadores y «Última carga registrada».", "Comprobar que «Seleccionar archivo» está deshabilitado."],
           resultado="Se ve el resumen fijo: 1.240 registros, 1.198 afiliados vigentes, 2.317 cargas.",
           rn=["RN-20", "RN-64"], tablas="store.carga_nomina", verifica="Observado (sonda CN)."),
        _c(14, "Consultar y filtrar las pistas de auditoría", _AUD, _PANT_AUD, "GET /api/auditoria (getAuditoria)",
           ["Abrir «Auditoría»: «Pistas de auditoría».", "Elegir el perfil «Administrador».",
            "Buscar «temporada»."],
           resultado="Se muestran los registros que coinciden, con el conteo «N de M registros».",
           rn=["RN-04", "RN-65", "RN-66"], tablas="store.auditoria",
           verifica="Observado (sonda A): campos id, fecha_hora, usuario, perfil, accion, entidad, detalle; hora "
                    "18:11 mostrada cuando eran las 15:11 locales."),
        _c(15, "Exportar las pistas de auditoría a CSV", _EXP, _PANT_AUD, "Sin API: descargarCSV en Auditoria.jsx",
           ["En «Pistas de auditoría», filtrar si se desea.", "Pulsar «Exportar CSV»."],
           resultado="Se descarga «auditoria_maqueta.csv» con lo visible, incluidos nombres y RUT.",
           rn=["RN-65"], tablas="store.auditoria",
           verifica="Leído en pages/admin/Auditoria.jsx:26-34 y 71-82; la descarga no se ejecutó (no hay navegador)."),
        _c(16, "Intento de operar funciones de otros perfiles por la API", _AUD, "— (llamada directa)",
           "crearSancion, marcarNomina, crearBloqueo",
           ["Con el actor Administrador, llamar a crearSancion, marcarNomina('2026-07', 'informado') y crearBloqueo.",
            "Ver las pistas de auditoría."],
           objetivo="Comprobar si la capa de datos limita al Administrador a su ámbito.",
           resultado="Observado: las tres escrituras se aceptaron (sanción 4, nómina 2026-07, bloqueo 5). Las pistas "
                     "quedan con el perfil que diga el actor enviado. " + _SIN_SERV,
           rn=["RN-02", "RN-04"], tablas="store.sanciones, store.nominas, store.bloqueos, store.auditoria",
           verifica="Observado (sondas X)."),
    ]


ROL_TEXTO = {"admin": {
    "resumen": "El Administrador mantiene el catálogo de inmuebles y las temporadas, y consulta la nómina de afiliados "
               "y las pistas de auditoría.",
    "objetivo": "Mantener al día los datos de los inmuebles y las temporadas que fijan la tarifa, y revisar la "
                "trazabilidad del sistema.",
    "alcance": ["Editar datos de los 34 inmuebles (no la región, ni fotos ni zonas).",
                "Crear temporadas alta o baja.", "Ver la última carga de la nómina de afiliados (demostrativa).",
                "Consultar, filtrar y exportar las pistas de auditoría."],
    "fuera_alcance": ["Crear o dar de baja inmuebles.", "Editar o eliminar temporadas.",
                      "Crear bloqueos de fechas (los ve, no los crea).", "Cargar la nómina real.",
                      "Gestionar usuarios o perfiles: la maqueta no tiene gestión de usuarios (no aplica «borrarse a sí "
                      "mismo»).", "Tarifas: el registro «Actualización de tarifas» es semilla; no hay pantalla."],
    "requisitos": ["Navegador con JavaScript.", "Elegir «Administrador» en «Ver el sistema como»."],
    "interfaz": [["Inmuebles", "Mantención de inmuebles: tabla, búsqueda, «Editar» y «Ver ficha»."],
                 ["Temporadas", "Gestión de temporadas: temporadas definidas, bloqueos y «Nueva temporada»."],
                 ["Nómina de afiliados", "Resumen de la última carga y vista previa de ejemplo."],
                 ["Auditoría", "Pistas de auditoría con filtro por perfil, búsqueda y «Exportar CSV»."]],
    "errores_frecuentes": [
        ["Guardé y la capacidad quedó en 0", "Se borró el campo: la página convierte vacío en 0 y la API no valida "
                                             "(RN-60).", "Volver a editar e ingresar un número de 1 a 20."],
        ["Las reservas dejaron de crearse en ciertas fechas", "Una temporada sin fechas creada por la API rompe el "
                                                              "cálculo de tarifa (CU-ADM-012).",
         "Reiniciar la demostración."],
        ["La hora de la auditoría está adelantada", "Se guarda en UTC y se muestra como local (RN-66).",
         "Restar la diferencia horaria [POR VALIDAR: corrección en el sistema definitivo]."],
        ["La tarifa salió alta pero el desglose nombra una temporada baja", "Temporadas solapadas (RN-62).",
         "No crear temporadas que se crucen."]],
    "buenas_practicas": ["Revisar que «Hasta» sea posterior a «Desde» antes de crear una temporada.",
                         "No dejar campos numéricos vacíos al editar un inmueble.",
                         "Filtrar antes de exportar la auditoría y tratar el CSV como dato personal."],
    "faq": [["¿Puedo borrar una temporada creada por error?", "No: no hay edición ni borrado; solo «Reiniciar "
                                                              "demostración»."],
            ["¿Los días máximos por afiliado se aplican?", "No en la maqueta: solo se muestran (RN-63)."],
            ["¿Puedo cargar la nómina?", "No: la pantalla es demostrativa (RN-64)."],
            ["¿Puedo administrar usuarios?", "No hay gestión de usuarios: cada perfil tiene un usuario ficticio fijo."]],
}}

CAMPOS = {
    "Mantener los inmuebles": [
        ["Nombre", "Sí (marca de la interfaz)", "Texto", "La API acepta vacío (sonda S4)."],
        ["Tipo de inmueble", "Sí", "Lista TIPOS_INMUEBLE", "La API acepta cualquier valor (sonda S7)."],
        ["Región", "—", "Deshabilitada: «La región no se modifica en la maqueta.»", "La API la cambia (sonda S5)."],
        ["Localidad", "No", "Texto", ""],
        ["Dirección", "No", "Texto", ""],
        ["Capacidad máxima", "No", "Número, min 1 max 20 en el campo", "«El sistema impide reservas que la excedan.» "
                                                                        "La API acepta 0, negativos y texto."],
        ["Dormitorios", "No", "Número, min 1 max 12 en el campo", "Sin validación en la API."],
        ["Descripción", "No", "Texto largo", ""],
        ["Equipamiento", "No", "Separado por comas", "Se guarda como lista; elementos vacíos se descartan."]],
    "Gestionar las temporadas": [
        ["Nombre", "Sí", "Texto no vacío (botón deshabilitado)", "La API acepta sin nombre."],
        ["Tarifa aplicable", "Sí", "Temporada alta / Temporada baja", "La API acepta otros valores (= baja)."],
        ["Desde", "Sí", "Fecha", "La API acepta texto no fecha y la ausencia."],
        ["Hasta", "Sí", "Fecha, mínimo «Desde» en el selector", "La API acepta hasta < desde."],
        ["Días máximos por afiliado", "No", "Número 1-60 en el campo; vacío = «Sin tope»", "La API acepta -5; no se "
                                                                                          "aplica en ningún cálculo."],
        ["Observaciones", "No", "Texto", ""]],
}

ENDPOINTS = [
    ["GET", "/api/inmuebles", "Listar y buscar inmuebles", "Administrador"],
    ["PUT", "/api/inmuebles/{id}", "Editar un inmueble (actualizarInmueble)", "Administrador"],
    ["GET", "/api/temporadas (gestión)", "Listar temporadas (getTemporadasGestion)", "Administrador"],
    ["GET", "/api/bloqueos?inmueble_id=", "Listar bloqueos en Gestión de temporadas", "Administrador"],
    ["POST", "/api/temporadas", "Crear una temporada (crearTemporada)", "Administrador"],
    ["GET", "/api/carga-nomina", "Resumen de la última carga de afiliados", "Administrador"],
    ["GET", "/api/auditoria", "Pistas de auditoría", "Administrador"],
]

REGLAS_NUEVAS = [
    ["RN-60", "Edición de inmueble sin validación", "actualizarInmueble copia con Object.assign cualquier campo "
     "recibido (incluidos id y región) sin validar tipo ni rango; la interfaz envía ocho campos fijos y convierte "
     "capacidad y dormitorios con Number().", "api/inmuebles.js actualizarInmueble; pages/admin/InmueblesAdmin.jsx"],
    ["RN-61", "Creación de temporada sin validación", "crearTemporada guarda lo recibido con un id correlativo "
     "(que el propio dato puede pisar); la interfaz exige nombre, desde y hasta.", "api/gestion.js crearTemporada; "
     "pages/admin/Temporadas.jsx"],
    ["RN-62", "Temporadas solapadas", "Se permiten; la tarifa es alta si alguna temporada alta cubre la entrada, y el "
     "nombre mostrado es el de la primera temporada (en orden de creación) que la cubre.",
     "lib/tarifas.js temporadaDe, nombreTemporadaDe"],
    ["RN-63", "Días máximos por afiliado informativos", "Se guardan y se muestran («Sin tope» si vacío), pero ningún "
     "cálculo ni validación los aplica.", "pages/admin/Temporadas.jsx (único uso)"],
    ["RN-64", "Nómina de afiliados demostrativa", "Resumen fijo de la última carga; la carga de archivo está "
     "deshabilitada.", "api/gestion.js getCargaNomina; pages/admin/CargaNomina.jsx"],
    ["RN-65", "Datos personales en la auditoría", "Las pistas muestran y exportan nombre completo del usuario y, en "
     "sanciones, el RUT del afectado; el CSV contiene lo filtrado en pantalla.",
     "api/store.js registrarAuditoria; pages/admin/Auditoria.jsx"],
    ["RN-66", "Hora de la pista en UTC", "fecha_hora se toma de toISOString (UTC) sin zona y se formatea como hora "
     "local.", "api/store.js registrarAuditoria; lib/formato.js fechaHora"],
]

HALLAZGOS_AREA = [
    ["Alta", "Una temporada sin fechas (o vacía) creada por la API rompe la creación de reservas: crearReserva lanza "
             "«TypeError: Cannot read properties of undefined (reading 'split')» en las fechas no cubiertas antes por "
             "otra temporada.",
     "Observado (sonda admin_sondas3.mjs): «antes» R-2026-0043 creada; tras crearTemporada({nombre, tipo}) la reserva "
     "del 10-07-2027 falla con ese TypeError. Leído en lib/tarifas.js:40-48 (nombreTemporadaDe sin guarda).",
     "Nadie puede reservar en esas fechas hasta reiniciar la demostración. La interfaz impide el caso (exige fechas)."],
    ["Alta", "actualizarInmueble acepta cambiar el id del inmueble: el inmueble desaparece con su id original.",
     "Observado (sonda S6): tras {id: 999}, getInmueble(1) → «Inmueble no encontrado» (404) y getInmueble(999) lo "
     "devuelve. Leído en api/inmuebles.js:157 (Object.assign).",
     "Reservas, bloqueos y valoraciones del inmueble quedan huérfanos. Solo por API."],
    ["Media", "Capacidad máxima 0, negativa o texto se guarda; borrar el campo en la interfaz guarda 0.",
     "Observado (sondas S1-S3: 0, -3, «muchos» guardados; Number('') = 0). Leído en "
     "pages/admin/InmueblesAdmin.jsx:51 y :249 (min=1 sin bloqueo del envío).",
     "Con 0 ninguna reserva cabe (RN-09) y el inmueble queda inutilizable sin aviso."],
    ["Media", "Temporada con «desde» posterior a «hasta» se acepta y rige con los extremos invertidos.",
     "Observado (sonda T1): 2027-05-10→2027-04-01 alta; temporadaDe('2027-04-10') = alta (antes baja).",
     "Cambia la tarifa de reservas en un rango que el administrador no quiso cubrir."],
    ["Media", "Temporadas solapadas: tarifa alta con nombre de temporada baja en el desglose.",
     "Observado (sonda T2): temporadaDe('2026-10-15') = alta; nombreTemporadaDe = «Temporada baja 2026».",
     "El desglose que ve el afiliado contradice el monto."],
    ["Media", "La hora de las pistas de auditoría nuevas aparece adelantada (UTC mostrado como local).",
     "Observado (sonda admin_sondas2.mjs): fecha_hora 2026-11-13T18:11:16 → «13 nov 2026, 18:11» cuando la hora local "
     "era 15:11 (GMT-3). Leído en api/store.js registrarAuditoria (toISOString().slice(0, 19)).",
     "La trazabilidad horaria no es fiable."],
    ["Media", "Auditoría y su CSV exponen nombres completos y RUT; la exportación no deja pista.",
     "Observado (sonda A: «Usuario 17.005.882-4» y 8 nombres de persona). Leído en pages/admin/Auditoria.jsx:71-82.",
     "Contradice el aviso de la propia pantalla («toda consulta o modificación de datos personales queda registrada»)."],
    ["Baja", "Tipo de temporada fuera de lista, días máximos negativos, ids duplicados y tipo de inmueble falso se "
             "aceptan por API.",
     "Observado (sondas T3, T2, T5, S7): «media», -5, ids [1,…,8,1], «castillo».",
     "Datos incoherentes; «media» equivale a baja."],
    ["Baja", "Días máximos por afiliado no se aplican en ningún cálculo.",
     "Leído en grep de fe_base/src: dias_maximos solo aparece en pages/admin/Temporadas.jsx y fixtures.",
     "El tope que la pantalla promete («pueden restringir el número máximo de días») no existe."],
    ["Baja", "Nombre de inmueble vacío se guarda.", "Observado (sonda S4).", "Ficha y aviso sin nombre."],
    ["Por validar", "Tras guardar un inmueble con error 404 la interfaz no muestra mensaje (try/finally sin catch).",
     "Leído en pages/admin/InmueblesAdmin.jsx:41-67; no se probó en navegador.", "El usuario no sabe que no se guardó."],
]

SONDAS_AREA = [
    ["Borrarse a sí mismo", ADM, "No aplica: no hay gestión de usuarios ni cuentas.", "No aplica."],
    ["Inicio posterior al fin", ADM, "crearTemporada desde 2027-05-10 hasta 2027-04-01", "Aceptada; rige invertida "
                                                                                       "(temporadaDe 10-04 = alta)."],
    ["Datos solapados", ADM, "Temporada alta 01-10 al 31-10-2026 dentro de «Temporada baja 2026»",
     "Aceptada; tarifa alta, nombre «Temporada baja 2026»."],
    ["Valor de lista falso", ADM, "Temporada tipo «media»; inmueble tipo «castillo»", "Ambos guardados; «media» = baja."],
    ["Número inválido", ADM, "Capacidad 0, -3, «muchos»; días máximos -5", "Todos guardados sin error."],
    ["Texto obligatorio vacío", ADM, "Nombre de inmueble «»; temporada {}", "Guardados; la temporada vacía rompe "
                                                                           "crearReserva (TypeError)."],
    ["Campos no previstos", ADM, "region «XX», id 999 en actualizarInmueble; id 1 en crearTemporada",
     "Aceptados; inmueble 1 → 404, temporadas con id duplicado."],
    ["Fuera de ámbito", ADM, "crearSancion, marcarNomina, crearBloqueo con actor Administrador",
     "Aceptadas (sanción 4, nómina 2026-07, bloqueo 5): no hay servidor que deniegue."],
    ["Dígito verificador de RUT", ADM, "No aplica: ningún formulario del Administrador recibe RUT.", "No aplica."],
    ["Datos personales por la API", ADM, "getAuditoria, getCargaNomina",
     "Auditoría: nombres completos y RUT en entidad; carga de nómina: solo agregados."],
    ["Temporada cambia la tarifa", ADM, "Casa de veraneo, entrada 10-04-2027, antes y después de crear «Semana "
                                        "Santa 2027» alta", "Baja 60.000 → alta 90.000."],
]
