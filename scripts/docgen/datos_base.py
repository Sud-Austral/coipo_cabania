# -*- coding: utf-8 -*-
"""Datos comunes: matriz de roles, reglas comunes, permisos, estados y pruebas transversales.

Las reglas de cada área viven en su módulo (REGLAS_NUEVAS) y se SUMAN a REGLAS_NEGOCIO en
generar.py: una sola lista. Los hallazgos los numera el coordinador al integrar.
Leído en frontend/src el 2026-11-13, sobre el commit 0d44fb3 (el último que compila; ver H del build).
"""
from .comun import PV

MATRIZ_ROLES = [
    ["Afiliado/a", "Trabajador/a afiliado al Servicio de Bienestar.", "Selector de perfil (sin credenciales).",
     "Catálogo y ficha, solicitud de reserva con su grupo familiar, comprobante, mis reservas, desistir, valorar.",
     "Solo ve sus propias reservas en «Mis reservas» (filtro de la interfaz)."],
    ["Usuario no afiliado", "Trabajador/a CONAF no afiliado o persona externa.", "Selector de perfil (sin credenciales).",
     "Lo mismo que Afiliado/a, con tarifa de usuario externo para todos los ocupantes.",
     "Sus solicitudes quedan sujetas a la prioridad de los afiliados (aviso de la app; " + PV + " cómo se aplica)."],
    ["Encargada regional", "Encargada de Bienestar de una región (en la maqueta, Valparaíso).",
     "Selector de perfil (sin credenciales).",
     "Revisar solicitudes de su región, confirmar, rechazar, asignar cupo desde la lista de espera, check-in, "
     "check-out, calendario operativo y bloqueos de fechas.",
     "Su región la fija la interfaz con la región del usuario ficticio; la capa de datos no la exige (RN-02)."],
    ["Oficina Central", "Servicio de Bienestar, Oficina Central.", "Selector de perfil (sin credenciales).",
     "Reservas de toda la red, nómina de descuentos por planilla, reportes de uso, bloqueos y sanciones.",
     "Sin mantención de inmuebles ni temporadas."],
    ["Administrador", "Administración funcional del sistema.", "Selector de perfil (sin credenciales).",
     "Mantención de inmuebles, temporadas, nómina de afiliados (vista) y pistas de auditoría.",
     "No gestiona reservas."],
]

ROLES_NO_APLICABLES = [
    ["Invitado", "Valor de respaldo del actor en RolContext.jsx cuando el perfil no tiene usuario",
     "Ningún perfil del selector cae en él: los cinco tienen usuario ficticio."],
    ["Remuneraciones / Personal", "Destino del CSV de la nómina de descuentos",
     "No entra a la maqueta: recibe el archivo fuera del sistema."],
    ["TI / operador del servidor", "Despliegue del contenedor nginx (deploy-prod.yml)",
     "Sin pantalla; fuera del alcance funcional."],
]

# Reglas comunes RN-01..RN-20. Tramos para reglas nuevas: RN-21..29 comunes, RN-30..39 portal,
# RN-40..49 Encargada regional, RN-50..59 Oficina Central, RN-60..69 Administrador.
REGLAS_COMUNES = [
    ["RN-01", "Ingreso sin autenticación", "El perfil se elige en el selector «Ver el sistema como»; se recuerda en "
     "localStorage «coipo_rol_v1». Por defecto, Afiliado/a.", "context/RolContext.jsx"],
    ["RN-02", "Guarda de perfil solo en la interfaz", "Cada ruta exige un perfil con RequiereRol; si no coincide, "
     "muestra «Esta sección corresponde a otro perfil» y ofrece cambiar. La capa de datos (api/) no recibe ni verifica "
     "el perfil: no hay servidor que deniegue.", "components/layout/RequiereRol.jsx, App.jsx"],
    ["RN-03", "Estado de la demostración en el navegador", "Los datos parten de las semillas (fixtures/) y se guardan en "
     "localStorage «coipo_demo_v1»; «Reiniciar demostración» los borra.", "api/store.js"],
    ["RN-04", "Pista de auditoría en cada escritura", "Crear, cambiar estado, check-in/out, anular, valorar, bloquear, "
     "sancionar, editar inmueble y crear temporada registran usuario, perfil, acción, entidad y detalle.",
     "api/store.js registrarAuditoria"],
    ["RN-05", "Estados de una reserva", "recibida, confirmada, lista_espera, rechazada, en_curso, finalizada, anulada; "
     "ocupan el inmueble: confirmada, en_curso y finalizada.", "lib/estados.js"],
    ["RN-06", "Disponibilidad de un rango", "Un rango está libre si ningún día choca con una reserva que ocupa ni con "
     "un bloqueo del inmueble o de toda la red; la noche de salida no se ocupa.", "api/inmuebles.js rangoDisponible"],
    ["RN-07", "Sin cupo, lista de espera", "Si el rango no está libre, la solicitud se registra igual, en estado "
     "lista_espera, con el motivo del choque como observación.", "api/reservas.js crearReserva"],
    ["RN-08", "Salida posterior a la entrada", "«La fecha de salida debe ser posterior a la de entrada.» (422).",
     "api/reservas.js crearReserva"],
    ["RN-09", "Ocupantes y capacidad", "Al menos un ocupante («Debe registrar al menos un ocupante.») y no más que la "
     "capacidad máxima («La reserva excede la capacidad máxima del inmueble (N personas).»), ambos 422.",
     "api/reservas.js crearReserva"],
    ["RN-10", "Tarifa de casa de huéspedes", "Por persona y por noche: beneficiarios con tarifa afiliado, el resto con "
     "tarifa de usuario externo.", "lib/tarifas.js calcularTarifa"],
    ["RN-11", "Tarifa de casa de veraneo", "Valor fijo por noche para el grupo familiar más un adicional por cada "
     "acompañante no beneficiario por noche (marcado como supuesto en el código).", "lib/tarifas.js calcularTarifa"],
    ["RN-12", "Quién es beneficiario", "Titular, cónyuge o conviviente civil e hijo/a inscrito; si el titular no es "
     "afiliado, todos pagan tarifa de usuario externo.", "lib/tarifas.js categoriaOcupante, fixtures/tarifas.js"],
    ["RN-13", "Motivo médico", "En casas de huéspedes, los beneficiarios pagan la tarifa preferente de motivo médico.",
     "lib/tarifas.js calcularTarifa"],
    ["RN-14", "Temporada por la fecha de entrada", "Alta si la fecha de entrada cae dentro de una temporada de tipo "
     "alta; si no, baja. Toda la estadía se cobra con esa temporada.", "lib/tarifas.js temporadaDe"],
    ["RN-15", "Cobro por desistimiento", "Siete días o más de aviso: sin cobro; menos de siete: el total; fuerza mayor: "
     "un día por gastos de limpieza.", "lib/tarifas.js cobroPorDesistimiento"],
    ["RN-16", "Valoración de una estadía", "Entero de 1 a 5; solo reservas finalizadas («Solo se pueden valorar estadías "
     "finalizadas.», 409) y una vez por reserva («Esta reserva ya fue valorada.», 409).", "api/valoraciones.js"],
    ["RN-17", "Prelación por motivo", "Médica (1), laboral (2), personal (3): ordena la lista de espera y las "
     "solicitudes por revisar.", "fixtures/tarifas.js MOTIVOS"],
    ["RN-18", "Código de reserva", "R-2026-NNNN con el id correlativo.", "api/reservas.js crearReserva"],
    ["RN-19", "Ciclo del cobro en la nómina", "pendiente → informado → descontado, solo en ese orden y por período "
     "completo.", "api/gestion.js marcarNomina"],
    ["RN-20", "Datos ficticios", "Personas, RUT, tarifas y reservas de la maqueta son ficticios; la franja «maqueta sin "
     "valor operativo» no se quita sin decisión de Bienestar.", "fixtures/, AvisoDemostracion.jsx"],
]

HALLAZGOS = []
HALLAZGOS_CAPTURAS = []
SONDAS = []

NEGATIVAS = [
    "Entrar por URL a /central con el perfil Afiliado/a: debe aparecer «Esta sección corresponde a otro perfil».",
    "Enviar una solicitud con la fecha de salida igual a la de entrada: no debe avanzar ni registrarse.",
    "Registrar más ocupantes que la capacidad máxima: no debe permitir avanzar.",
    "Valorar dos veces la misma estadía: el segundo intento debe rechazarse.",
    "Abrir /reservas/R-2026-9999 (código inexistente): «Comprobante no encontrado».",
    "Bloquear fechas con «Hasta» anterior a «Desde»: debería rechazarse (ver hallazgos).",
    "Crear una temporada con «Hasta» anterior a «Desde»: debería rechazarse (ver hallazgos).",
    "Registrar una sanción con un RUT con dígito verificador malo: debería rechazarse (ver hallazgos).",
    "Solicitar una reserva como usuario con sanción vigente: debería impedirse (ver hallazgos).",
]

ACCESO = [
    ["QA-AC-01", "Elegir cada perfil en el selector", "Lleva a su pantalla de llegada y cambia el menú"],
    ["QA-AC-02", "Recargar la página", "Se mantiene el último perfil elegido"],
    ["QA-AC-03", "Abrir en otro navegador", "Entra como Afiliado/a y con los datos semilla (estado por navegador)"],
    ["QA-AC-04", "Enlace directo a una sección de otro perfil", "Tarjeta «Esta sección corresponde a otro perfil» con «Ver como …»"],
]

MATRIZ_PERMISOS = [
    ["Ver catálogo y ficha de inmuebles", "Sí", "Sí", "Por URL", "Por URL", "Por URL"],
    ["Solicitar reserva", "Sí", "Sí", "No (aviso)", "No (aviso)", "No (aviso)"],
    ["Ver un comprobante por su código", "Sí", "Sí", "Sí", "Sí", "Sí"],
    ["Mis reservas: desistir y valorar", "Propias", "Propias", "No", "No", "No"],
    ["Confirmar, rechazar, asignar cupo, check-in, check-out", "No", "No", "Región", "No", "No"],
    ["Calendario operativo y bloqueos de fechas", "No", "No", "Región", "No", "No"],
    ["Reservas de toda la red", "No", "No", "No", "Sí", "No"],
    ["Nómina de descuentos y su CSV", "No", "No", "No", "Sí", "No"],
    ["Reportes de uso y su CSV", "No", "No", "No", "Sí", "No"],
    ["Sanciones: registrar y levantar", "No", "No", "No", "Sí", "No"],
    ["Mantener inmuebles, temporadas", "No", "No", "No", "No", "Sí"],
    ["Nómina de afiliados (vista), auditoría y su CSV", "No", "No", "No", "No", "Sí"],
    ["Reiniciar la demostración", "Sí", "Sí", "Sí", "Sí", "Sí"],
]

ESTADOS = [
    ["Reserva", "recibida, confirmada, lista_espera, rechazada, en_curso, finalizada, anulada",
     "Se crea recibida o en lista de espera (RN-07); la Encargada regional confirma o rechaza; check-in pasa a en curso "
     "y check-out a finalizada; el titular puede desistir (anulada)."],
    ["Cobro de nómina", "pendiente, informado, descontado", "Oficina Central marca por período (RN-19)."],
    ["Sanción", "vigente, levantada", "Oficina Central la registra vigente y la levanta con fundamento."],
    ["Día del calendario", "disponible, ocupado, bloqueado, mantencion", "Calculado con reservas que ocupan y bloqueos (RN-06)."],
]

HALLAZGOS_CAPTURAS_BASE = [
    ["Media", "El comprobante dice «Emitido el 13 nov 2026, 18:20» para una solicitud enviada a las 15:20 (hora de Chile): "
     "la hora se guarda en UTC y se muestra como local.",
     "Observado en la captura 04-afi-comprobante (2026-11-13). Mismo origen que el hallazgo de la hora de las pistas de "
     "auditoría (ahoraISO() con toISOString().slice(0, 19)).", "Horas de emisión y de auditoría adelantadas 3 o 4 horas."],
    ["Baja", "Estadías ya pasadas siguen como «Próxima estadía» y «Confirmada»: R-2026-0004 (18 al 21 sep 2026) aparece "
     "como próxima en «Mis reservas» con «Desistir», y cuenta como «Confirmadas · Estadías por venir» en el panel regional.",
     "Observado en las capturas 05-afi-mis-reservas y 10-reg-solicitudes (2026-11-13); las semillas tienen fechas fijas de 2026.",
     "En una demostración hecha después de agosto de 2026 los datos se ven incoherentes."],
    ["Baja", "Los diálogos de check-in y check-out traen el ejemplo «Ej.: disponibilidad verificada en el calendario del "
     "inmueble.», que es el de la confirmación.", "Observado en las capturas 10e-reg-check-in y 10f-reg-check-out.",
     "Texto de ayuda equivocado."],
]
