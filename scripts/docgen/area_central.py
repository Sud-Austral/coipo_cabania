# -*- coding: utf-8 -*-
"""Oficina Central (PFX CEN): reservas de toda la red, nómina de descuentos por planilla,
reportes de uso y bloqueos y sanciones.

Leído en el commit 0d44fb3 (último que compila) el 2026-11-13: pages/central/*.jsx,
components/charts/graficos.jsx, api/gestion.js, api/reservas.js getReservas/crearReserva.
Sondas ejecutadas con Node sobre la capa api el 2026-11-13 (scratchpad sondas/central_sondas*.mjs):
la capa api no tiene servidor ni control de perfil; lo que se describe como «la capa api acepta»
es lo que se OBSERVÓ al llamarla.
"""
from .comun import PV

_ROL = "Oficina Central"
_USUARIO = "Patricia Herrera Muñoz (RUT ficticio 11.874.336-9)"

# ---------------------------------------------------------------------------------------------
# Funcionalidades
# ---------------------------------------------------------------------------------------------
_F = {
    "Consultar las reservas de toda la red": {
        "objetivo": "Ver y filtrar las reservas de las 13 regiones para el cálculo de cobros y la revisión de casos.",
        "quien": _ROL + ".",
        "precondiciones": ["Haber elegido «Oficina Central» en el selector de perfil (RN-01)."],
        "pasos": ["En el menú, abrir «Reservas de toda la red» (/central, pantalla de llegada del perfil).",
                  "Opcional: filtrar por «Región», «Motivo» o escribir en «Buscar por titular, RUT, código o inmueble».",
                  "Opcional: elegir un estado en la barra de filtros (recibida, confirmada, en curso, finalizada, "
                  "lista de espera, anulada).",
                  "Leer la tabla: Código, Inmueble, Región, Titular (nombre y RUT), Fechas, Motivo, Estado, Monto."],
        "resultado": "La tabla muestra las reservas filtradas y el contador «N de M reservas».",
        "validaciones": ["Los filtros son de la interfaz: getReservas({}) entrega todas las reservas y la página filtra "
                         "en el navegador (ReservasPais.jsx:25-46)."],
        "errores": [],
        "consideraciones": ["La barra de estados no ofrece «rechazada» (ReservasPais.jsx:113): las rechazadas solo se "
                            "ven con el filtro «todos».",
                            "La capa api entrega por cada reserva también los ocupantes con nombre y RUT, el historial "
                            "y las observaciones, aunque la tabla no los muestre (ver hallazgos; ver captura "
                            "12-cen-reservas-pais.png)."],
        "restricciones": ["Solo lectura: desde esta pantalla no se cambia el estado de ninguna reserva."],
        "alternativos": ["Buscar por código (p. ej. «R-2026-0004») para ir directo a una reserva."],
    },
    "Consultar la nómina de descuentos por planilla": {
        "objetivo": "Revisar los cobros por período que se envían a Remuneraciones para descontar en planilla.",
        "quien": _ROL + ".",
        "precondiciones": ["Perfil Oficina Central."],
        "pasos": ["En el menú, abrir «Nómina de descuentos por planilla» (/central/descuentos).",
                  "Elegir el período en «Período» (los cerrados aparecen con «(cerrado)»).",
                  "Leer las tarjetas «Total del período», «Por informar» y «Ya descontado».",
                  "Leer la tabla: RUT, Afiliado/a, Reserva, Inmueble, Noches, Monto, Estado y la fila de total."],
        "resultado": "Se ven los cobros del período con su estado (Pendiente, Informado, Descontado) (RN-19).",
        "validaciones": [],
        "errores": [],
        "consideraciones": ["Los períodos y sus cobros vienen de las semillas (fixtures/gestion.seed.js): la maqueta no "
                            "genera cobros nuevos a partir de las estadías finalizadas, aunque el texto de la pantalla "
                            "lo diga. " + PV + " cómo se calcularán en la versión real.",
                            "Ver captura 13-cen-nomina.png."],
        "restricciones": ["Solo los períodos existentes en el estado de la demostración."],
        "alternativos": [],
    },
    "Marcar pendientes como informados": {
        "objetivo": "Dejar constancia de que los cobros pendientes del período se incluyeron en el archivo enviado a "
                    "Remuneraciones.",
        "quien": _ROL + ".",
        "precondiciones": ["Período elegido con al menos un cobro pendiente (si no, el botón está deshabilitado)."],
        "pasos": ["En «Nómina de descuentos por planilla», elegir el período.",
                  "Pulsar «Marcar pendientes como informados (n)»."],
        "resultado": "Todos los cobros pendientes del período pasan a Informado; queda la pista «Actualización de "
                     "nómina» en auditoría (RN-04, RN-19).",
        "validaciones": ["Solo pasan a informado los cobros en pendiente; los demás no cambian (gestion.js:63-66).",
                         "Período inexistente: 404 «Período no encontrado»."],
        "errores": [["Período no encontrado", "El período pedido no existe (solo alcanzable llamando a la capa api)."]],
        "consideraciones": ["No hay confirmación: un clic aplica el cambio a todo el período.",
                            "No se puede marcar un cobro individual."],
        "restricciones": ["No se puede deshacer desde la interfaz (solo «Reiniciar demostración»)."],
        "alternativos": [],
    },
    "Marcar informados como descontados": {
        "objetivo": "Registrar que Remuneraciones aplicó los descuentos informados.",
        "quien": _ROL + ".",
        "precondiciones": ["Período con al menos un cobro informado (si no, el botón está deshabilitado)."],
        "pasos": ["En «Nómina de descuentos por planilla», elegir el período.",
                  "Pulsar «Marcar informados como descontados (n)»."],
        "resultado": "Los cobros informados del período pasan a Descontado; los pendientes no cambian (RN-19). Pista "
                     "«Actualización de nómina» (RN-04).",
        "validaciones": ["Solo cambian los cobros en informado (gestion.js:65)."],
        "errores": [["Período no encontrado", "Período inexistente (solo por la capa api)."]],
        "consideraciones": ["La conciliación con Remuneraciones es manual: la pantalla lo declara «por definir con "
                            "Bienestar» (NominaDescuentos.jsx:165-172)."],
        "restricciones": ["Sin deshacer ni marcar por cobro."],
        "alternativos": [],
    },
    "Exportar la nómina de descuentos": {
        "objetivo": "Descargar el archivo del período para enviarlo a Remuneraciones.",
        "quien": _ROL + ".",
        "precondiciones": ["Un período elegido."],
        "pasos": ["En «Nómina de descuentos por planilla», elegir el período.",
                  "Pulsar «Exportar CSV»."],
        "resultado": "Se descarga «nomina_descuentos_<período>.csv» (separador «;», UTF-8 con BOM) con RUT, Nombre, "
                     "Reserva, Inmueble, Noches, Monto, Estado y el total.",
        "validaciones": [],
        "errores": [],
        "consideraciones": ["El archivo contiene RUT y nombre completo de cada persona con cobro: dato personal "
                            "(Ley 19.628) que sale del sistema sin pista de auditoría (la exportación no llama a la "
                            "capa api).",
                            "Exportar no cambia el estado de los cobros: hay que marcarlos como informados aparte."],
        "restricciones": ["Se arma en el navegador con los datos en pantalla."],
        "alternativos": [],
    },
    "Consultar los reportes de uso": {
        "objetivo": "Ver ocupación por región, reservas por motivo y los inmuebles más demandados.",
        "quien": _ROL + ".",
        "precondiciones": ["Perfil Oficina Central."],
        "pasos": ["En el menú, abrir «Reportes de uso» (/central/dashboard).",
                  "Leer las cifras: Inmuebles, Reservas, Noches vendidas, Ingresos por cobros, Anulaciones, Por revisar.",
                  "Leer los gráficos «Noches ocupadas por región», «Reservas por motivo» e «Inmuebles más demandados».",
                  "Opcional: pulsar «Ver como tabla» para ver las mismas cifras en tablas (y «Ver gráficos» para volver)."],
        "resultado": "Cifras calculadas en el momento sobre todas las reservas del estado de la demostración.",
        "validaciones": ["Noches, ingresos, región y ranking cuentan solo reservas confirmadas, en curso y finalizadas; "
                         "«Reservas» y «por motivo» cuentan todas (gestion.js:113-160) (RN-52)."],
        "errores": [],
        "consideraciones": ["El ranking muestra los ocho inmuebles con más noches.",
                            "No hay filtro por período: «En el período» de la tarjeta Anulaciones es todo el estado.",
                            "Ver captura 14-cen-reportes.png."],
        "restricciones": ["Solo lectura; sin PDF (la pantalla lo anuncia para la versión definitiva)."],
        "alternativos": ["«Ver como tabla» es la alternativa accesible a los gráficos."],
    },
    "Exportar los reportes de uso": {
        "objetivo": "Descargar las cifras de uso en un CSV.",
        "quien": _ROL + ".",
        "precondiciones": ["Reportes cargados."],
        "pasos": ["En «Reportes de uso», pulsar «Exportar CSV»."],
        "resultado": "Se descarga «reporte_uso_maqueta.csv» con ocupación por región, reservas por motivo e inmuebles "
                     "más demandados.",
        "validaciones": [],
        "errores": [],
        "consideraciones": ["No contiene datos personales (solo agregados).",
                            "Las cifras de la cabecera (totales) no van al archivo."],
        "restricciones": [],
        "alternativos": [],
    },
    "Consultar los bloqueos y sanciones": {
        "objetivo": "Ver el registro de usuarios sancionados y su estado.",
        "quien": _ROL + ".",
        "precondiciones": ["Perfil Oficina Central."],
        "pasos": ["En el menú, abrir «Bloqueos y sanciones» (/central/sanciones).",
                  "Leer las tarjetas «Sanciones vigentes», «Levantadas» e «Indefinidas».",
                  "Leer la tabla: Usuario (nombre y RUT), Motivo de la sanción, Vigencia, Respaldo, Estado."],
        "resultado": "Se ven todas las sanciones, las más recientes arriba; las vigentes tienen el botón «Levantar».",
        "validaciones": [],
        "errores": [],
        "consideraciones": ["El aviso «Efecto de una sanción vigente» dice que el sistema impide nuevas reservas; en la "
                            "maqueta NO lo hace (ver hallazgos y RN-53).",
                            "Una sanción temporal no pasa sola a levantada al vencer su «Hasta»: el estado lo cambia "
                            "solo «Levantar» (RN-54).",
                            "Ver captura 15-cen-sanciones.png."],
        "restricciones": [],
        "alternativos": [],
    },
    "Registrar una sanción": {
        "objetivo": "Dejar registrado el bloqueo de un usuario por deuda, daños, no presentación o normas.",
        "quien": _ROL + ".",
        "precondiciones": ["Perfil Oficina Central.", "Conocer nombre y RUT del usuario y el hecho que origina la sanción."],
        "pasos": ["En «Bloqueos y sanciones», pulsar «Registrar sanción».",
                  "En el diálogo «Registrar una sanción», completar Nombre del usuario, RUT, Tipo de sanción, Motivo, "
                  "Respaldo o evidencia (opcional), Duración, Desde y, si es temporal, Hasta.",
                  "Pulsar «Registrar sanción»."],
        "resultado": "La sanción queda vigente al inicio de la tabla y se registra la pista «Registro de sanción» "
                     "(RN-04, RN-50).",
        "validaciones": ["Interfaz: el botón se habilita con nombre y RUT no vacíos, motivo de más de 5 caracteres, "
                         "«Desde» y, si es temporal, «Hasta» (Sanciones.jsx:101-106).",
                         "Interfaz: «Hasta» tiene min = «Desde», pero el botón no lo compara.",
                         "Capa api: ninguna validación; acepta cualquier cuerpo (RN-50, sondas S1-S11)."],
        "errores": [],
        "consideraciones": ["El RUT no se valida ni se normaliza: «13.457.902-1» (DV malo), «134579028», "
                            "«25.447.128-k» y «hola» se guardan tal cual.",
                            "Se puede registrar otra sanción vigente al mismo RUT, y sancionar a la propia usuaria de "
                            "Oficina Central.",
                            "Si la capa api fallara, la pantalla no muestra mensaje (try/finally sin catch, "
                            "Sanciones.jsx:58-85).",
                            "Ver captura 15b-cen-registrar-sancion.png."],
        "restricciones": ["No se puede editar una sanción registrada."],
        "alternativos": ["Duración «Indefinida»: desaparece «Hasta» y la vigencia se muestra «→ indefinida»."],
    },
    "Levantar la sanción": {
        "objetivo": "Terminar una sanción vigente dejando el fundamento.",
        "quien": _ROL + ".",
        "precondiciones": ["Sanción en estado vigente (solo esas tienen el botón «Levantar»)."],
        "pasos": ["En la fila de la sanción, pulsar «Levantar».",
                  "En el diálogo «Levantar la sanción», escribir el «Fundamento del levantamiento».",
                  "Pulsar «Levantar sanción»."],
        "resultado": "La sanción pasa a Levantada y muestra el fundamento bajo el estado; pista «Levantamiento de "
                     "sanción» (RN-04, RN-51).",
        "validaciones": ["Interfaz: el botón exige fundamento no vacío (Sanciones.jsx:318).",
                         "Capa api: solo comprueba que el id exista (404 «Sanción no encontrada»); acepta fundamento "
                         "vacío y sanciones ya levantadas (RN-51)."],
        "errores": [["Sanción no encontrada", "El id no existe (solo alcanzable por la capa api)."]],
        "consideraciones": ["El texto del diálogo dice que «se le notifica el cambio» al usuario: la maqueta no "
                            "notifica a nadie.",
                            "Ver captura 15c-cen-levantar-sancion.png."],
        "restricciones": ["No se puede volver a dejar vigente una sanción levantada."],
        "alternativos": ["«Cancelar» cierra el diálogo sin cambios."],
    },
}


def funcionalidad(nombre, rol):
    if rol != "central" or nombre not in _F:
        raise KeyError(nombre)
    return dict(_F[nombre])


# ---------------------------------------------------------------------------------------------
# Casos de uso
# ---------------------------------------------------------------------------------------------
_NO_SERV = "No hay servidor que deniegue: la capa api (api/gestion.js) se ejecuta en el navegador y no verifica perfil (RN-02)."


def _c(n, nombre, func, pantalla, servicio, tablas, **kw):
    base = {"id": "CU-CEN-%03d" % n, "nombre": nombre, "objetivo": "", "descripcion": "",
            "permisos": "Perfil Oficina Central (guarda RequiereRol, solo de interfaz, RN-02).",
            "precondiciones": ["Haber elegido «Oficina Central» en el selector (RN-01)."], "entradas": [],
            "flujo": [], "resultado": "", "fa": [], "fe": [], "rn": ["RN-01", "RN-02"], "validaciones": [],
            "datos": "", "traz": ["Oficina Central", func, pantalla, servicio, tablas], "verifica": "",
            "secundarios": "—"}
    base.update(kw)
    return base


def casos(rol):
    if rol != "central":
        return []
    return [
        _c(2, "Consultar las reservas de toda la red", "Consultar las reservas de toda la red",
           "ReservasPais.jsx", "getReservas({}) — GET /api/reservas", "store.reservas, store.inmuebles",
           objetivo="Ver las reservas de todas las regiones.",
           descripcion="Listado nacional de reservas con filtros de región, motivo, estado y búsqueda.",
           flujo=["Abrir «Reservas de toda la red» en el menú.", "Comprobar el contador «N de M reservas».",
                  "Filtrar por Región «Valparaíso» y por estado «confirmada».",
                  "Buscar «R-2026-0004» en «Buscar por titular, RUT, código o inmueble»."],
           resultado="La tabla muestra solo las reservas que cumplen los filtros.",
           fa=[["FA-01", "Sin coincidencias: «No hay reservas que cumplan con los filtros aplicados.»"]],
           rn=["RN-02", "RN-05", "RN-55"], validaciones=["Filtros solo en el navegador."],
           datos="44 reservas en la sonda del 2026-11-13 (semillas más las creadas por la sonda).",
           verifica="Sonda P1: getReservas({}) devolvió también ocupantes con RUT, historial_estados y observaciones."),
        _c(3, "Revisar los datos personales que entrega la consulta nacional", "Consultar las reservas de toda la red",
           "ReservasPais.jsx", "getReservas({})", "store.reservas",
           objetivo="Conocer qué datos personales recibe el navegador al abrir la pantalla.",
           descripcion="La tabla muestra nombre y RUT del titular; la capa api entrega además a todos los ocupantes.",
           flujo=["Abrir «Reservas de toda la red».", "Observar las columnas visibles (Titular con nombre y RUT).",
                  "Llamar getReservas({}) desde la capa api (sonda P1) y listar las claves de cada reserva."],
           resultado="Cada reserva trae ocupantes[] con nombre, RUT, parentesco y categoría tarifaria (incluye "
                     "menores, p. ej. hijos con RUT 24.115.663-4), aunque la pantalla no los muestre.",
           rn=["RN-20", "RN-55"], datos="Sonda P1.",
           verifica="Observado (sonda P1, 2026-11-13)."),
        _c(4, "Consultar la nómina de descuentos por planilla", "Consultar la nómina de descuentos por planilla",
           "NominaDescuentos.jsx", "getNominas() — GET /api/nominas-descuento", "store.nominas",
           objetivo="Revisar los cobros de un período.",
           descripcion="Selección del período y lectura de totales y cobros.",
           flujo=["Abrir «Nómina de descuentos por planilla».", "Elegir «Julio 2026» en «Período».",
                  "Leer «Total del período», «Por informar» y «Ya descontado» y la tabla."],
           resultado="Se ven 8 cobros de julio 2026 con sus estados.", rn=["RN-19"],
           datos="fixtures/gestion.seed.js: períodos 2026-07 (abierto) y 2026-06 (cerrado)."),
        _c(5, "Marcar pendientes como informados", "Marcar pendientes como informados",
           "NominaDescuentos.jsx", "marcarNomina(periodo, 'informado') — PATCH /api/nominas-descuento/{periodo}",
           "store.nominas, store.auditoria",
           objetivo="Pasar a informado los cobros pendientes del período.",
           descripcion="Marca masiva del período.",
           entradas=["Período: 2026-07"],
           flujo=["Elegir el período «Julio 2026».", "Pulsar «Marcar pendientes como informados (2)»."],
           resultado="Los 2 cobros pendientes pasan a Informado; el botón queda en (0) y deshabilitado.",
           fe=[["FE-01", "Período inexistente por la capa api: 404 «Período no encontrado» (sonda N2)."]],
           rn=["RN-04", "RN-19"], validaciones=["Solo cambian los pendientes."],
           verifica="Sonda N4: julio quedó informado,informado,descontado… ."),
        _c(6, "Marcar informados como descontados", "Marcar informados como descontados",
           "NominaDescuentos.jsx", "marcarNomina(periodo, 'descontado')", "store.nominas, store.auditoria",
           objetivo="Registrar los descuentos aplicados por Remuneraciones.",
           descripcion="Marca masiva de los informados del período.",
           flujo=["Elegir «Julio 2026».", "Pulsar «Marcar informados como descontados (3)»."],
           resultado="Los informados pasan a Descontado; los pendientes siguen pendientes (RN-19).",
           rn=["RN-04", "RN-19"],
           verifica="Sonda N3: con 2 pendientes y 3 informados, solo los 3 informados pasaron a descontado."),
        _c(7, "Marcar la nómina con un estado fuera de lista", "Marcar pendientes como informados",
           "— (capa api)", "marcarNomina('2026-07', 'pagado')", "store.nominas, store.auditoria",
           objetivo="Intentar un estado que no existe.",
           descripcion="Sonda de valor de lista falso. " + _NO_SERV,
           flujo=["Llamar marcarNomina('2026-07', 'pagado', actor) desde la capa api."],
           resultado="Responde 200 sin cambiar ningún cobro, pero deja la pista «Cobros marcados como \"pagado\".» "
                     "en auditoría (RN-56).",
           rn=["RN-04", "RN-19", "RN-56"], verifica="Observado (sonda N1, 2026-11-13)."),
        _c(8, "Exportar la nómina de descuentos", "Exportar la nómina de descuentos",
           "NominaDescuentos.jsx", "descargarCSV (navegador, sin capa api)", "store.nominas (lectura)",
           objetivo="Obtener el archivo del período para Remuneraciones.",
           descripcion="Descarga del CSV del período elegido.",
           flujo=["Elegir el período.", "Pulsar «Exportar CSV».", "Abrir «nomina_descuentos_2026-07.csv»."],
           resultado="El CSV trae RUT, Nombre, Reserva, Inmueble, Noches, Monto y Estado por cobro, y el total.",
           rn=["RN-19", "RN-20", "RN-57"],
           validaciones=["Las comillas dentro de un valor no se escapan (NominaDescuentos.jsx:19)."],
           verifica="No lo comprobé descargando: la descarga necesita navegador; leído en NominaDescuentos.jsx:91-110."),
        _c(9, "Consultar los reportes de uso", "Consultar los reportes de uso",
           "Reportes.jsx, components/charts/graficos.jsx", "getReportes() — GET /api/reportes/uso",
           "store.reservas, store.inmuebles",
           objetivo="Ver los indicadores de uso de la red.",
           descripcion="Cifras, gráficos y vista de tabla.",
           flujo=["Abrir «Reportes de uso».", "Leer las seis cifras.", "Pulsar «Ver como tabla».",
                  "Pulsar «Ver gráficos»."],
           resultado="Se alternan gráficos y tablas con las mismas cifras.", rn=["RN-05", "RN-52"],
           verifica="Sonda R1: totales {inmuebles 34, reservas 44, noches 114, ingresos 2.752.000, anuladas 3, "
                    "lista_espera 1, pendientes 9} sobre el estado de la sonda."),
        _c(10, "Exportar los reportes de uso", "Exportar los reportes de uso",
           "Reportes.jsx", "descargarCSV (navegador)", "—",
           objetivo="Descargar el reporte.", descripcion="CSV de agregados.",
           flujo=["En «Reportes de uso», pulsar «Exportar CSV».", "Abrir «reporte_uso_maqueta.csv»."],
           resultado="Archivo con tres bloques: ocupación por región, reservas por motivo e inmuebles más demandados.",
           rn=["RN-20"], verifica="No lo comprobé descargando; leído en Reportes.jsx:50-68."),
        _c(11, "Consultar los bloqueos y sanciones", "Consultar los bloqueos y sanciones",
           "Sanciones.jsx", "getSanciones() — GET /api/sanciones", "store.sanciones",
           objetivo="Ver el registro de sanciones.", descripcion="Tabla y tarjetas de conteo.",
           flujo=["Abrir «Bloqueos y sanciones».", "Leer las tarjetas y la tabla."],
           resultado="Se ven las sanciones semilla (p. ej. Héctor Salgado Ibáñez, indefinida, vigente).",
           rn=["RN-53", "RN-54"]),
        _c(12, "Registrar una sanción", "Registrar una sanción",
           "Sanciones.jsx (modal)", "crearSancion(datos, actor) — POST /api/sanciones",
           "store.sanciones, store.auditoria",
           objetivo="Registrar un bloqueo.", descripcion="Alta de una sanción temporal.",
           entradas=["Nombre", "RUT", "Tipo", "Motivo", "Respaldo", "Duración", "Desde", "Hasta"],
           flujo=["Pulsar «Registrar sanción».",
                  "En «Registrar una sanción», completar los datos (motivo de más de 5 caracteres).",
                  "Pulsar «Registrar sanción» del diálogo."],
           resultado="La sanción aparece primera, Vigente, y la pista «Registro de sanción» queda en auditoría.",
           fa=[["FA-01", "Duración «Indefinida»: no se pide «Hasta»."]],
           rn=["RN-04", "RN-50"], validaciones=["Habilitación del botón solo en la interfaz."]),
        _c(13, "Registrar una sanción con RUT inválido", "Registrar una sanción",
           "Sanciones.jsx (modal) y capa api", "crearSancion", "store.sanciones",
           objetivo="Comprobar si se valida el RUT.",
           descripcion="Sonda de dígito verificador. " + _NO_SERV,
           entradas=["13.457.902-1 (DV malo)", "134579028 (sin puntos ni guion)", "25.447.128-k (minúscula)",
                     "hola", "vacío"],
           flujo=["Llamar crearSancion con cada RUT."],
           resultado="Todas se registran vigentes con el RUT tal cual fue escrito; ninguno se normaliza ni rechaza.",
           rn=["RN-50"], verifica="Observado (sondas S1-S5, 2026-11-13)."),
        _c(14, "Registrar una sanción con «Hasta» anterior a «Desde»", "Registrar una sanción",
           "Sanciones.jsx (modal) y capa api", "crearSancion", "store.sanciones",
           objetivo="Comprobar la validación del rango.", descripcion="Sonda de inicio posterior al fin.",
           entradas=["Desde 2026-12-01", "Hasta 2026-01-01"],
           flujo=["Llamar crearSancion con desde 2026-12-01 y hasta 2026-01-01."],
           resultado="Se registra vigente. La interfaz solo pone min en «Hasta» y el botón no compara las fechas.",
           rn=["RN-50"], verifica="Observado (sonda S6)."),
        _c(15, "Registrar dos sanciones vigentes solapadas al mismo RUT", "Registrar una sanción",
           "Sanciones.jsx (modal) y capa api", "crearSancion", "store.sanciones",
           objetivo="Comprobar si se impiden duplicados.", descripcion="Sonda de datos solapados.",
           flujo=["Registrar una sanción a 13.457.902-8 del 2026-11-01 al 2026-12-01.",
                  "Registrar otra al mismo RUT del 2026-11-15 al 2026-12-01."],
           resultado="Ambas quedan vigentes (2 sanciones vigentes para el mismo RUT).",
           rn=["RN-50"], verifica="Observado (sonda S7)."),
        _c(16, "Sancionarse a sí misma", "Registrar una sanción",
           "Sanciones.jsx (modal) y capa api", "crearSancion", "store.sanciones",
           objetivo="Intentar sancionar a la usuaria de Oficina Central.", descripcion="Sonda de autoafectación.",
           entradas=["Patricia Herrera Muñoz", "11.874.336-9"],
           flujo=["Registrar una sanción con el RUT de Patricia Herrera Muñoz, la actora."],
           resultado="Se registra vigente; nada lo impide.", rn=["RN-50"], verifica="Observado (sonda S8)."),
        _c(17, "Registrar una sanción con tipo, id y estado forzados", "Registrar una sanción",
           "— (capa api)", "crearSancion", "store.sanciones, store.auditoria",
           objetivo="Comprobar si la capa api controla los campos del cuerpo.",
           descripcion="Sonda de valor de lista falso. " + _NO_SERV,
           flujo=["Llamar crearSancion con tipo «inventado» e id 999.",
                  "Llamar crearSancion con id 2 (ya existente) y estado «levantada».",
                  "Llamar crearSancion({}) sin datos."],
           resultado="Acepta el tipo «inventado»; el cuerpo pisa id y estado (queda una segunda sanción con id 2, "
                     "nacida levantada, y levantarSancion(2) actúa sobre ella y no sobre la semilla); con cuerpo "
                     "vacío guarda una sanción vigente sin datos y la pista «Usuario undefined».",
           rn=["RN-04", "RN-50"], verifica="Observado (sondas S9-S11)."),
        _c(18, "Levantar la sanción", "Levantar la sanción",
           "Sanciones.jsx (modal)", "levantarSancion(id, fundamento, actor) — PATCH /api/sanciones/{id}/levantar",
           "store.sanciones, store.auditoria",
           objetivo="Terminar una sanción vigente.", descripcion="Levantamiento con fundamento.",
           flujo=["En una sanción vigente, pulsar «Levantar».",
                  "En «Levantar la sanción», escribir el fundamento.", "Pulsar «Levantar sanción»."],
           resultado="Pasa a Levantada con el fundamento visible; pista «Levantamiento de sanción».",
           fa=[["FA-01", "«Cancelar»: sin cambios."]],
           fe=[["FE-01", "Id inexistente por la capa api: 404 «Sanción no encontrada» (sonda L4)."]],
           rn=["RN-04", "RN-51"]),
        _c(19, "Levantar una sanción ya levantada o sin fundamento", "Levantar la sanción",
           "— (capa api)", "levantarSancion", "store.sanciones, store.auditoria",
           objetivo="Comprobar las validaciones del levantamiento.", descripcion=_NO_SERV,
           flujo=["Llamar levantarSancion(1, 'otra vez') sobre la sanción 1, ya levantada.",
                  "Llamar levantarSancion(2, '') y levantarSancion(3, undefined)."],
           resultado="Las tres responden 200: la 1 sobrescribe su fundamento original; la 2 queda con fundamento "
                     "vacío y la 3 sin fundamento.", rn=["RN-51"], verifica="Observado (sondas L1-L3)."),
        _c(20, "Efecto de una sanción vigente sobre una nueva reserva", "Consultar los bloqueos y sanciones",
           "Sanciones.jsx (aviso) y capa api", "crearReserva (api/reservas.js)", "store.sanciones, store.reservas",
           objetivo="Comprobar que un usuario sancionado no puede reservar, como afirma la pantalla.",
           descripcion="La página «Bloqueos y sanciones» dice «Un usuario con sanción vigente no puede generar "
                       "nuevas reservas».",
           flujo=["Abrir «Bloqueos y sanciones» y leer el aviso «Efecto de una sanción vigente».",
                  "Con 13.457.902-8 (María Fuentes Rojas) sancionada vigente, llamar crearReserva como María.",
                  "Repetir con Héctor Salgado Ibáñez (12.443.076-5), sanción semilla indefinida vigente."],
           resultado="Ambas reservas se crean en estado recibida (R-2026-0043 y R-2026-0044 en la sonda): la sanción "
                     "no tiene efecto. crearReserva no consulta store.sanciones (reservas.js:57-139).",
           rn=["RN-53"], verifica="Observado (sondas E1-E2, 2026-11-13)."),
        _c(21, "Entrar a las pantallas de Oficina Central con otro perfil", "Consultar los bloqueos y sanciones",
           "App.jsx RequiereRol", "—", "—",
           objetivo="Intento de salir del ámbito: otro perfil abre /central/sanciones.",
           descripcion="La guarda es solo de interfaz. " + _NO_SERV,
           flujo=["Con perfil Afiliado/a, abrir /central/sanciones.",
                  "Comprobar la tarjeta «Esta sección corresponde a otro perfil»."],
           resultado="La interfaz bloquea la vista; la capa api (crearSancion, levantarSancion, marcarNomina) "
                     "responde a cualquiera que la llame, como muestran las sondas sin perfil.",
           rn=["RN-02"], verifica="La tarjeta no la comprobé en navegador; las sondas llamaron la capa api sin perfil."),
    ]


# ---------------------------------------------------------------------------------------------
# Texto del rol
# ---------------------------------------------------------------------------------------------
ROL_TEXTO = {"central": {
    "resumen": "Oficina Central del Servicio de Bienestar: ve las reservas de toda la red, gestiona la nómina de "
               "descuentos por planilla, consulta los reportes de uso y registra o levanta sanciones. Usuario ficticio: "
               + _USUARIO + ".",
    "objetivo": "Controlar el uso del beneficio a nivel nacional y llevar los cobros a Remuneraciones.",
    "alcance": ["Reservas de toda la red (solo lectura).", "Nómina de descuentos: consultar, marcar y exportar.",
                "Reportes de uso y su CSV.", "Bloqueos y sanciones: consultar, registrar y levantar."],
    "fuera_alcance": ["Confirmar, rechazar o hacer check-in/out de reservas (Encargada regional).",
                      "Mantener inmuebles y temporadas, auditoría (Administrador).",
                      "Solicitar reservas (aviso de la interfaz)."],
    "requisitos": ["Navegador con JavaScript.", "Elegir «Oficina Central» en el selector (RN-01)."],
    "interfaz": [["Reservas de toda la red", "/central: filtros de región, motivo, búsqueda y estado; tabla nacional."],
                 ["Nómina de descuentos por planilla", "/central/descuentos: período, tarjetas, botones de marcado y "
                                                       "«Exportar CSV»."],
                 ["Reportes de uso", "/central/dashboard: cifras, gráficos, «Ver como tabla» y «Exportar CSV»."],
                 ["Bloqueos y sanciones", "/central/sanciones: tarjetas, aviso, tabla, «Registrar sanción» y "
                                          "«Levantar»."]],
    "errores_frecuentes": [
        ["El botón «Registrar sanción» del diálogo no se habilita", "Falta un campo obligatorio o el motivo tiene 5 "
         "caracteres o menos", "Completar nombre, RUT, motivo (6+ caracteres), Desde y Hasta si es temporal."],
        ["Los botones de marcado están deshabilitados", "No hay cobros pendientes (o informados) en el período",
         "Elegir otro período."],
        ["Un usuario sancionado pudo reservar", "La maqueta no aplica la sanción (RN-53)", "Revisar a mano; "
         "hallazgo abierto."],
        ["No veo las reservas rechazadas", "La barra de estados no tiene «rechazada»", "Usar «todos» y buscar."]],
    "buenas_practicas": ["Revisar el RUT antes de registrar una sanción: el sistema no lo valida.",
                         "Comprobar que el usuario no tenga ya una sanción vigente.",
                         "Exportar el CSV antes de marcar como informados, y tratarlo como dato personal.",
                         "Escribir un fundamento verificable al levantar."],
    "faq": [["¿La sanción impide reservar?", "La pantalla lo afirma, pero en la maqueta no: crearReserva no la "
             "consulta (RN-53)."],
            ["¿Se puede deshacer un marcado de nómina?", "No; solo «Reiniciar demostración»."],
            ["¿La sanción temporal vence sola?", "No: sigue vigente hasta que se levanta (RN-54)."],
            ["¿De dónde salen los cobros de la nómina?", "De las semillas de la maqueta. " + PV +
             " el cálculo real a partir de estadías y anulaciones."]],
}}

CAMPOS = {
    "Registrar una sanción": [
        ["Nombre del usuario", "Sí", "No vacío (solo interfaz).", "Texto libre."],
        ["RUT", "Sí", "No vacío (solo interfaz). Sin validación de formato ni dígito verificador.",
         "Marcador «12.345.678-9». RN-50."],
        ["Tipo de sanción", "Sí", "Lista: Deuda por uso del beneficio, Daños al inmueble, No presentación reiterada, "
         "Incumplimiento de normas de uso.", "La capa api acepta cualquier valor."],
        ["Motivo", "Sí", "Más de 5 caracteres (solo interfaz).", ""],
        ["Respaldo o evidencia", "No", "—", "Texto libre."],
        ["Duración", "Sí", "Temporal o Indefinida.", "Indefinida guarda hasta = null."],
        ["Desde", "Sí", "Fecha (solo interfaz).", ""],
        ["Hasta", "Si es temporal", "Fecha; min = Desde solo como atributo; no se compara.", "RN-50."],
    ],
    "Levantar la sanción": [
        ["Fundamento del levantamiento", "Sí", "No vacío (solo interfaz).", "La capa api acepta vacío (RN-51)."],
    ],
    "Consultar la nómina de descuentos por planilla": [
        ["Período", "Sí", "Lista de los períodos existentes.", "Por defecto, el primero."],
    ],
    "Consultar las reservas de toda la red": [
        ["Región", "No", "Lista de las 13 regiones.", ""],
        ["Motivo", "No", "Médico, laboral, personal.", ""],
        ["Buscar por titular, RUT, código o inmueble", "No", "Texto; el RUT se compara tal cual (con puntos).", ""],
    ],
}

ENDPOINTS = [
    ["GET", "/api/reservas?region=&estado=&usuario_id=&inmueble_id=", "Reservas de toda la red (sin filtros)",
     "Oficina Central"],
    ["GET", "/api/nominas-descuento", "Períodos de la nómina con sus cobros", "Oficina Central"],
    ["PATCH", "/api/nominas-descuento/{periodo}", "Marcar cobros como informados o descontados", "Oficina Central"],
    ["GET", "/api/reportes/uso", "Cifras de uso de la red", "Oficina Central"],
    ["GET", "/api/sanciones", "Listado de sanciones", "Oficina Central"],
    ["POST", "/api/sanciones", "Registrar una sanción", "Oficina Central"],
    ["PATCH", "/api/sanciones/{id}/levantar", "Levantar una sanción", "Oficina Central"],
]

REGLAS_NUEVAS = [
    ["RN-50", "Registro de sanción sin validación en la capa api",
     "La sanción se crea vigente con lo que llegue en el cuerpo; solo la interfaz exige nombre, RUT, motivo de más de "
     "5 caracteres y fechas. No se valida RUT, rango, tipo ni duplicados.", "api/gestion.js:18-35; Sanciones.jsx:101-106"],
    ["RN-51", "Levantamiento de sanción", "Pasa a levantada con el fundamento dado; 404 «Sanción no encontrada» si el "
     "id no existe. La interfaz exige fundamento y solo ofrece levantar las vigentes.",
     "api/gestion.js:38-52; Sanciones.jsx:187,318"],
    ["RN-52", "Qué cuenta en los reportes de uso", "Noches, ingresos, región y ranking: reservas confirmadas, en curso "
     "y finalizadas; «Reservas» y «por motivo»: todas. Ranking: 8 inmuebles por noches.", "api/gestion.js:113-160"],
    ["RN-53", "Efecto declarado de una sanción vigente", "La pantalla declara que impide nuevas reservas; la capa api "
     "no lo aplica (crearReserva no consulta sanciones).", "Sanciones.jsx:112,142-146; api/reservas.js:57-139"],
    ["RN-54", "Vigencia de una sanción", "vigente o levantada; el estado no cambia al vencer «Hasta».",
     "api/gestion.js; Sanciones.jsx:56"],
    ["RN-55", "Alcance nacional de Oficina Central", "Ve todas las reservas sin filtro de región; los filtros son del "
     "navegador.", "ReservasPais.jsx:25-46"],
    ["RN-56", "Marcado de nómina por período", "Un estado distinto de informado/descontado no cambia cobros pero se "
     "registra en auditoría; período inexistente: 404 «Período no encontrado».", "api/gestion.js:60-76"],
    ["RN-57", "Contenido del CSV de nómina", "RUT, nombre, reserva, inmueble, noches, monto y estado por cobro, más "
     "el total; se genera en el navegador sin pista de auditoría.", "NominaDescuentos.jsx:91-110"],
]

HALLAZGOS_AREA = [
    ["Alta", "Una sanción vigente no impide reservar, aunque «Bloqueos y sanciones» afirma que sí.",
     "Observado (sondas E1-E2, 2026-11-13): crearReserva creó R-2026-0043 (María, sancionada en la sonda) y "
     "R-2026-0044 (Héctor Salgado, sanción semilla indefinida) en estado recibida. Leído en api/reservas.js:57-139: no "
     "consulta store.sanciones.", "La función central del módulo de sanciones no existe; el texto induce a error."],
    ["Media", "El RUT de la sanción no se valida ni se normaliza.",
     "Observado (sondas S1-S5): se guardaron «13.457.902-1» (DV malo), «134579028», «25.447.128-k», «hola» y vacío.",
     "Una sanción con RUT mal escrito no se asocia a la persona; impide cualquier cruce futuro con reservas."],
    ["Media", "Se aceptan sanciones con «Hasta» anterior a «Desde», duplicadas vigentes al mismo RUT y sobre la propia "
     "usuaria de Oficina Central.",
     "Observado (sondas S6-S8): las tres se registraron vigentes; RUT 13.457.902-8 quedó con 2 vigentes. Leído en "
     "Sanciones.jsx:101-106: el botón no compara fechas.", "Registro inconsistente y sin control de conflicto de interés."],
    ["Media", "El cuerpo de crearSancion pisa id y estado y acepta tipos fuera de lista o vacío.",
     "Observado (sondas S9-S11): id 999 y tipo «inventado» aceptados; una sanción nueva con id 2 nació levantada y "
     "levantarSancion(2) la tomó a ella; crearSancion({}) guardó una sanción vacía con pista «Usuario undefined». "
     "Leído en api/gestion.js:19-24 (…datos después de id y estado).",
     "Ids duplicados: levantar puede actuar sobre la sanción equivocada en la versión real si se replica."],
    ["Media", "levantarSancion acepta sanciones ya levantadas y fundamento vacío.",
     "Observado (sondas L1-L3): la sanción 1 sobrescribió su fundamento original; la 2 quedó con \"\" y la 3 con "
     "undefined.", "Se pierde el fundamento original; la interfaz lo evita, la capa api no."],
    ["Media", "El CSV de nómina y la consulta nacional exponen datos personales sin pista de auditoría.",
     "Leído en NominaDescuentos.jsx:91-110 (RUT y nombre por cobro, sin llamada a la capa api). Observado (sonda P1): "
     "getReservas({}) entrega ocupantes con nombre, RUT y parentesco (incluidos hijos menores), historial y "
     "observaciones, que la tabla no muestra.", "Ley 19.628 / 21.719: salida masiva de datos personales sin registro."],
    ["Baja", "marcarNomina acepta un estado fuera de lista y lo audita como si hubiera actuado.",
     "Observado (sonda N1): 'pagado' respondió 200, no cambió cobros y dejó «Cobros marcados como \"pagado\".».",
     "Pista de auditoría engañosa."],
    ["Baja", "El CSV no escapa comillas internas.",
     "Leído en NominaDescuentos.jsx:19 y Reportes.jsx:29 (`\"${String(c)}\"` sin duplicar comillas).",
     "Un nombre o inmueble con comillas descuadra las columnas."],
    ["Baja", "Errores de la capa api no se muestran en Sanciones y Nómina.",
     "Leído en Sanciones.jsx:58-97 y NominaDescuentos.jsx:81-89: try/finally sin catch.",
     "Un rechazo futuro del backend quedaría en silencio."],
    ["Baja", "La barra de estados de «Reservas de toda la red» no ofrece «rechazada».",
     "Leído en ReservasPais.jsx:113.", "Las rechazadas no se pueden aislar con un filtro."],
    ["Por validar", "Los textos prometen notificar al usuario al levantar y calcular cobros desde las estadías; la "
     "maqueta no hace ninguna de las dos cosas.",
     "Leído en Sanciones.jsx:325-327 y NominaDescuentos.jsx:118; " + PV + " si es alcance de la versión real.",
     "Expectativa no cubierta."],
]

SONDAS_AREA = [
    ["RUT con DV malo / sin puntos / minúscula / basura", "Oficina Central", "crearSancion con 13.457.902-1, "
     "134579028, 25.447.128-k, «hola», vacío", "Todas aceptadas tal cual (S1-S5)."],
    ["Inicio posterior al fin", "Oficina Central", "crearSancion desde 2026-12-01 hasta 2026-01-01", "Aceptada (S6)."],
    ["Datos solapados", "Oficina Central", "Dos sanciones vigentes al RUT 13.457.902-8 con fechas solapadas",
     "Ambas vigentes (S7)."],
    ["Afectarse a sí misma", "Oficina Central", "Sanción al RUT 11.874.336-9 (Patricia Herrera)", "Aceptada (S8)."],
    ["Valor de lista falso (sanción)", "Oficina Central", "tipo «inventado», id/estado forzados, cuerpo vacío",
     "Aceptados; id duplicado 2 (S9-S11)."],
    ["Valor de lista falso (nómina)", "Oficina Central", "marcarNomina('2026-07','pagado')",
     "200, sin cambios, auditado (N1)."],
    ["Período inexistente", "Oficina Central", "marcarNomina('2099-01','informado')",
     "404 «Período no encontrado» (N2)."],
    ["Orden del ciclo de cobro", "Oficina Central", "marcarNomina 'descontado' con pendientes", "Solo informados → "
     "descontado; pendientes intactos (N3). Correcto."],
    ["Levantar ya levantada / sin fundamento", "Oficina Central", "levantarSancion(1,'otra vez'), (2,''), "
     "(3,undefined)", "Las tres 200; fundamento sobrescrito o vacío (L1-L3)."],
    ["Levantar id inexistente", "Oficina Central", "levantarSancion(9999)", "404 «Sanción no encontrada» (L4)."],
    ["Efecto de sanción vigente", "Oficina Central / Afiliado/a", "crearReserva como RUT sancionado",
     "Reserva creada recibida (E1-E2)."],
    ["Datos personales por la API", "Oficina Central", "getReservas({}), getNominas(), getSanciones()",
     "Ocupantes con RUT, historial, observaciones; nómina con RUT y nombre (P1, N6, P2)."],
    ["Fuera de ámbito (otra región)", "Oficina Central", "—",
     "No aplica: el perfil tiene alcance nacional por diseño."],
    ["Borrarse a sí mismo", "Oficina Central", "—", "No aplica: no hay borrado de usuarios ni de sanciones."],
]
