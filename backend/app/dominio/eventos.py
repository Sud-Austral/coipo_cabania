"""GENERADO desde `catalogos/eventos.yaml`. NO SE EDITA A MANO.

    fuente:  catalogos/eventos.yaml (version 1)
    sha256:  9fe482fa0f192052d316f762194482be58b6257aced144403b23ff716973c0c1
    eventos: 38

Para cambiar un evento se edita el catálogo del master y se vuelve a generar. Si este
archivo y el catálogo divergen, el juez `j04` pone el build en rojo: son la misma cosa
escrita dos veces y una de las dos es la copia.

LOS TRES CERROJOS CONTRA INVENTAR UN EVENTO
-------------------------------------------
 1. AQUÍ. `registrar()` no acepta un `str`: recibe un `Evento` congelado, y los `Evento`
    solo existen en este archivo. Un código nuevo no se puede escribir en el punto de
    llamada.
 2. EN LA BASE. `catalogo_evento` se materializa como tabla y `log_auditoria.accion` es
    una FK real contra su clave primaria. La siembra corre en el `lifespan`, ANTES del
    `yield` y dentro del MISMO `pg_advisory_lock` del arranque, con `ON CONFLICT DO
    UPDATE`: si falla, el arranque falla ruidosamente en vez de escribir un log mudo.
 3. EN EL CI. `j04` recorre el AST y falla si el primer argumento de `registrar*` es un
    `ast.Constant`, si el catálogo y la tabla difieren, si un evento no aparece en el RAT,
    o si algún `campos_detalle` declara una clave que está en `CAMPOS_PII`.

POR QUÉ EL FORMATO `<clase>.<entidad>.<verbo>`, MEDIDO
------------------------------------------------------
Hoy hay TRES vocabularios en producción: `auth.iam_callback` (COIPO_ENTREGA_PLANTA, 47
valores), `LOGIN_OK` (coipo_prensa2) y `LOGIN_SUCCESS` (COIPO_USUARIOS, en inglés). Los
tres son el mismo evento: `autenticacion.sesion.completar`. Y viven en tres esquemas de
tabla distintos, con tres nombres de columna de tiempo y tres de actor. El día que pidan
el rastro de la flota, lo que hace falta es un `SELECT` que funcione igual en las ocho
apps, y hoy no existe.

CÓMO SE AÑADE UN EVENTO DE DOMINIO
----------------------------------
No aquí: en la ficha del proyecto y en el catálogo, siguiendo `plantillas_de_dominio`
(`escritura.<entidad>.crear` es ATÓMICO y de retención `acto`; `escritura.<entidad>.actualizar`
además exige `valores_previos`). La clase y el verbo salen de las listas cerradas: un verbo
nuevo es una modificación del patrón de la flota entera, no la decisión de una aplicación.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum
from types import MappingProxyType
from typing import Mapping

# `Estrato` NO se redeclara aquí: se importa del sitio donde vive la política de retención.
# Dos enumeraciones con las mismas tres palabras en dos archivos es exactamente la deriva de
# vocabulario que este catálogo existe para deshacer, y no se nota hasta que alguien añade un
# valor a una sola de las dos.
from app.dominio.politicas.retencion import Estrato as Retencion

FUENTE = "catalogos/eventos.yaml"
FUENTE_VERSION = 1
FUENTE_SHA256 = "9fe482fa0f192052d316f762194482be58b6257aced144403b23ff716973c0c1"

# El mismo patrón que el CHECK de `catalogo_evento.codigo` en db/0000_plataforma.sql.
PATRON_EVENTO = r"^[a-z][a-z0-9_]{1,20}\.[a-z][a-z0-9_]{1,24}\.[a-z][a-z0-9_]{1,16}$"
LARGO_MAXIMO = 64


class Criticidad(StrEnum):
    """Ordena informes y alertas. NO decide comportamiento.

    El comportamiento lo decide `Regimen`, y punto. Dos campos que ambos deciden lo mismo
    derivan el día que alguien cambia uno solo.
    """

    BAJA = "baja"
    MEDIA = "media"
    ALTA = "alta"
    CRITICA = "critica"


class Regimen(StrEnum):
    """Qué pasa con la OPERACIÓN si la escritura del log falla. Lo decide el evento, no
    el programador que lo emite.

    ATOMICO     la operación de negocio se revierte junto con el log. Como el registro va en
                la MISMA transacción que el cambio, si Postgres no responde no hay cambio
                que perder: el coste de disponibilidad es cero.
    CRITICO     la operación NO se ejecuta; 503 con `Retry-After`. No hay exportación ni
                lectura masiva de datos personales sin rastro.
    DEGRADADO   la operación sigue; el evento va al respaldo duradero y se contabiliza. Un
                403 que se convierte en 500 le regala al atacante un canal de denegación de
                servicio y un oráculo — y además el 403 ya quedó en `log_acceso`, porque ese
                middleware corre por fuera de `ExceptionMiddleware`.
    BEST_EFFORT igual que DEGRADADO, y además NO se intenta si el fallo es `OperationalError`:
                `registrar_autonomo` abre otra sesión del mismo pool y, durante una caída,
                esa escritura también falla pero antes consume `connect_timeout` (10 s)
                reteniendo un hilo. La auditoría amplificaría la caída que pretende reportar.
    """

    ATOMICO = "ATOMICO"
    CRITICO = "CRITICO"
    DEGRADADO = "DEGRADADO"
    BEST_EFFORT = "BEST_EFFORT"


class Accion(StrEnum):
    """El vocabulario cerrado. Su valor es exactamente la clave primaria de `catalogo_evento`."""

    AUTENTICACION_SESION_INICIAR = "autenticacion.sesion.iniciar"
    AUTENTICACION_SESION_COMPLETAR = "autenticacion.sesion.completar"
    AUTENTICACION_SESION_RECHAZAR = "autenticacion.sesion.rechazar"
    AUTENTICACION_SESION_CERRAR = "autenticacion.sesion.cerrar"
    AUTORIZACION_ENDPOINT_DENEGAR = "autorizacion.endpoint.denegar"
    AUTORIZACION_RECURSO_DENEGAR = "autorizacion.recurso.denegar"
    LECTURA_TITULAR_VER_DETALLE = "lectura.titular.ver_detalle"
    LECTURA_TITULAR_LISTAR = "lectura.titular.listar"
    LECTURA_AUDITORIA_CONSULTAR = "lectura.auditoria.consultar"
    LECTURA_MIS_DATOS_CONSULTAR = "lectura.mis_datos.consultar"
    EXPORTACION_EVIDENCIA_EXPORTAR = "exportacion.evidencia.exportar"
    EXPORTACION_DATOS_DESCARGAR = "exportacion.datos.descargar"
    EXPORTACION_MIS_DATOS_EXPORTAR = "exportacion.mis_datos.exportar"
    ESCRITURA_MIS_DATOS_ACTUALIZAR = "escritura.mis_datos.actualizar"
    ESCRITURA_SOLICITUD_SUPRESION_CREAR = "escritura.solicitud_supresion.crear"
    CONFIGURACION_PARAMETRO_ACTUALIZAR = "configuracion.parametro.actualizar"
    CONFIGURACION_CATALOGO_ACTIVAR = "configuracion.catalogo.activar"
    CONFIGURACION_CATALOGO_DESACTIVAR = "configuracion.catalogo.desactivar"
    ADMINISTRACION_SESION_CERRAR = "administracion.sesion.cerrar"
    ADMINISTRACION_ACCESO_ACTIVAR = "administracion.acceso.activar"
    ADMINISTRACION_ACCESO_DESACTIVAR = "administracion.acceso.desactivar"
    EMERGENCIA_BREAK_GLASS_ABRIR_EMERGENCIA = "emergencia.break_glass.abrir_emergencia"
    EMERGENCIA_BREAK_GLASS_CERRAR_EMERGENCIA = "emergencia.break_glass.cerrar_emergencia"
    RETENCION_LOG_TECNICO_PURGAR = "retencion.log_tecnico.purgar"
    RETENCION_LOG_AUDITORIA_PURGAR = "retencion.log_auditoria.purgar"
    RETENCION_TITULAR_DESIDENTIFICAR = "retencion.titular.desidentificar"
    RETENCION_OBJETO_ELIMINAR = "retencion.objeto.eliminar"
    RETENCION_PLAN_FALLAR = "retencion.plan.fallar"
    PROCESO_RESPALDO_EJECUTAR = "proceso.respaldo.ejecutar"
    PROCESO_RESPALDO_FALLAR = "proceso.respaldo.fallar"
    PROCESO_SELLO_DIARIO_SELLAR = "proceso.sello_diario.sellar"
    PROCESO_RECONCILIACION_EJECUTAR = "proceso.reconciliacion.ejecutar"
    PROCESO_RESTAURACION_EJECUTAR = "proceso.restauracion.ejecutar"
    SISTEMA_DESPLIEGUE_COMPLETAR = "sistema.despliegue.completar"
    SISTEMA_MIGRACION_EJECUTAR = "sistema.migracion.ejecutar"
    SISTEMA_CATALOGO_EVENTO_CARGAR = "sistema.catalogo_evento.cargar"
    SISTEMA_AUDITORIA_DEGRADAR = "sistema.auditoria.degradar"
    SISTEMA_AUDITORIA_FALLAR = "sistema.auditoria.fallar"

@dataclass(frozen=True, slots=True)
class Evento:
    """Lo que `registrar()` recibe. Congelado: no se puede construir uno nuevo en un router.

    `campos_detalle` es una lista blanca. `registro.py` valida cada clave contra ella: una
    clave no declarada es `AssertionError` en tests y, en producción, se escribe
    `<no declarado>` más un evento `sistema.auditoria.degradar`. Es la corrección de lo que
    hoy vive EN CLARO en la única tabla que la desidentificación no puede tocar — el correo
    del ciudadano (`correo_service.py:548`), un RUT (`auth.py:544`), un RUT como `entidad_id`
    (`admin_lista_negra.py:33-42`) y el nombre del archivo que sube el ciudadano
    (`solicitudes.py:745`; la gente los llama `CI_12345678.pdf`).
    """

    codigo: Accion
    clase: str
    criticidad: Criticidad
    regimen: Regimen
    retencion: Retencion
    finalidad: str
    base_legal: str
    campos_detalle: frozenset[str] = frozenset()
    valores_cerrados: Mapping[str, frozenset[str]] = field(
        default_factory=lambda: MappingProxyType({})
    )
    exige_valores_previos: bool = False

    def __post_init__(self) -> None:
        # Se valida al importar, no al emitir: son 38 expresiones regulares una vez en la
        # vida del proceso, y a cambio un archivo generado con un código mal formado no
        # llega a arrancar. Si esperara a la emisión, el fallo aparecería el día que ese
        # evento concreto ocurriera por primera vez en producción.
        import re

        if not re.match(PATRON_EVENTO, self.codigo.value):
            raise ValueError(f"código de evento inválido: {self.codigo.value}")
        if len(self.codigo.value) > LARGO_MAXIMO:
            raise ValueError(f"código de evento demasiado largo: {self.codigo.value}")



# --------------------------------------------------------------- autenticacion

AUTENTICACION_SESION_INICIAR = Evento(
    codigo=Accion.AUTENTICACION_SESION_INICIAR,
    clase="autenticacion",
    criticidad=Criticidad.BAJA,
    regimen=Regimen.BEST_EFFORT,
    retencion=Retencion.TECNICA,
    finalidad="trazar el inicio del flujo OAuth para poder investigar un canje fallido",
    base_legal="cumplimiento_funciones_publicas",
    campos_detalle=frozenset({"estado_id", "ruta_destino"}),
)

AUTENTICACION_SESION_COMPLETAR = Evento(
    codigo=Accion.AUTENTICACION_SESION_COMPLETAR,
    clase="autenticacion",
    criticidad=Criticidad.ALTA,
    regimen=Regimen.BEST_EFFORT,
    retencion=Retencion.PII,
    finalidad="acreditar que el actor de un acto administrativo se autentico",
    base_legal="cumplimiento_funciones_publicas",
    campos_detalle=frozenset({"rol", "ambitos_declarados", "claims_ausentes", "duracion_canje_ms"}),
)

AUTENTICACION_SESION_RECHAZAR = Evento(
    codigo=Accion.AUTENTICACION_SESION_RECHAZAR,
    clase="autenticacion",
    criticidad=Criticidad.ALTA,
    regimen=Regimen.BEST_EFFORT,
    retencion=Retencion.TECNICA,
    finalidad="detectar intentos de acceso invalidos y fallos de configuracion del IAM",
    base_legal="cumplimiento_funciones_publicas",
    campos_detalle=frozenset({"motivo"}),
    valores_cerrados=MappingProxyType(
        {
            "motivo": frozenset({"estado_invalido", "estado_expirado", "estado_reusado", "codigo_invalido", "userinfo_fallo", "rol_sin_asignacion", "atributo_obligatorio_ausente"}),
        }
    ),
)

AUTENTICACION_SESION_CERRAR = Evento(
    codigo=Accion.AUTENTICACION_SESION_CERRAR,
    clase="autenticacion",
    criticidad=Criticidad.BAJA,
    regimen=Regimen.BEST_EFFORT,
    retencion=Retencion.PII,
    finalidad="acotar la ventana en que una sesion estuvo viva",
    base_legal="cumplimiento_funciones_publicas",
    campos_detalle=frozenset({"motivo", "duracion_min"}),
    valores_cerrados=MappingProxyType(
        {
            "motivo": frozenset({"voluntario", "inactividad", "tope_absoluto", "forzado"}),
        }
    ),
)

# ---------------------------------------------------------------- autorizacion

AUTORIZACION_ENDPOINT_DENEGAR = Evento(
    codigo=Accion.AUTORIZACION_ENDPOINT_DENEGAR,
    clase="autorizacion",
    criticidad=Criticidad.ALTA,
    regimen=Regimen.DEGRADADO,
    retencion=Retencion.PII,
    finalidad="evidenciar el control de acceso: quien intento que y con que rol",
    base_legal="cumplimiento_funciones_publicas",
    campos_detalle=frozenset({"ruta_patron", "metodo", "rol_efectivo", "motivo"}),
    valores_cerrados=MappingProxyType(
        {
            "motivo": frozenset({"rol_insuficiente", "ambito_ajeno", "rol_sin_asignacion", "sesion_expirada"}),
        }
    ),
)

AUTORIZACION_RECURSO_DENEGAR = Evento(
    codigo=Accion.AUTORIZACION_RECURSO_DENEGAR,
    clase="autorizacion",
    criticidad=Criticidad.ALTA,
    regimen=Regimen.DEGRADADO,
    retencion=Retencion.PII,
    finalidad="registrar el acceso denegado a un recurso fuera del ambito del actor",
    base_legal="cumplimiento_funciones_publicas",
    campos_detalle=frozenset({"entidad", "entidad_id_num", "motivo"}),
    valores_cerrados=MappingProxyType(
        {
            "motivo": frozenset({"ambito_ajeno", "inexistente"}),
        }
    ),
)

# --------------------------------------------------------------------- lectura

LECTURA_TITULAR_VER_DETALLE = Evento(
    codigo=Accion.LECTURA_TITULAR_VER_DETALLE,
    clase="lectura",
    criticidad=Criticidad.MEDIA,
    regimen=Regimen.DEGRADADO,
    retencion=Retencion.PII,
    finalidad="acreditar quien accedio a los datos personales de una persona",
    base_legal="cumplimiento_funciones_publicas",
    campos_detalle=frozenset({"entidad", "entidad_id_num", "campos_devueltos"}),
)

LECTURA_TITULAR_LISTAR = Evento(
    codigo=Accion.LECTURA_TITULAR_LISTAR,
    clase="lectura",
    criticidad=Criticidad.ALTA,
    regimen=Regimen.CRITICO,
    retencion=Retencion.PII,
    finalidad="acreditar los accesos masivos a datos personales",
    base_legal="cumplimiento_funciones_publicas",
    campos_detalle=frozenset({"entidad", "filtro_aplicado", "ambito_forzado", "total_filas"}),
)

LECTURA_AUDITORIA_CONSULTAR = Evento(
    codigo=Accion.LECTURA_AUDITORIA_CONSULTAR,
    clase="lectura",
    criticidad=Criticidad.ALTA,
    regimen=Regimen.CRITICO,
    retencion=Retencion.PII,
    finalidad="auditar al auditor: quien miro el log y con que alcance",
    base_legal="cumplimiento_funciones_publicas",
    campos_detalle=frozenset({"rango_desde", "rango_hasta", "total_filas", "ancla"}),
)

LECTURA_MIS_DATOS_CONSULTAR = Evento(
    codigo=Accion.LECTURA_MIS_DATOS_CONSULTAR,
    clase="lectura",
    criticidad=Criticidad.MEDIA,
    regimen=Regimen.DEGRADADO,
    retencion=Retencion.PII,
    finalidad="acreditar el ejercicio del derecho de acceso del propio titular",
    base_legal="obligacion_legal",
    campos_detalle=frozenset({"campos_devueltos"}),
)

# ----------------------------------------------------------------- exportacion

EXPORTACION_EVIDENCIA_EXPORTAR = Evento(
    codigo=Accion.EXPORTACION_EVIDENCIA_EXPORTAR,
    clase="exportacion",
    criticidad=Criticidad.CRITICA,
    regimen=Regimen.CRITICO,
    retencion=Retencion.ACTO,
    finalidad="dejar constancia de cada entrega de evidencia a un tercero",
    base_legal="cumplimiento_funciones_publicas",
    campos_detalle=frozenset({"motivo", "solicitante_externo_organismo", "referencia_oficio", "archivos", "total_filas", "sha256_manifiesto"}),
)

EXPORTACION_DATOS_DESCARGAR = Evento(
    codigo=Accion.EXPORTACION_DATOS_DESCARGAR,
    clase="exportacion",
    criticidad=Criticidad.ALTA,
    regimen=Regimen.CRITICO,
    retencion=Retencion.ACTO,
    finalidad="trazar la salida de datos personales del sistema en un archivo",
    base_legal="cumplimiento_funciones_publicas",
    campos_detalle=frozenset({"entidad", "entidad_id_num", "formato", "total_filas"}),
    valores_cerrados=MappingProxyType(
        {
            "formato": frozenset({"csv", "xlsx", "pdf", "zip", "json"}),
        }
    ),
)

EXPORTACION_MIS_DATOS_EXPORTAR = Evento(
    codigo=Accion.EXPORTACION_MIS_DATOS_EXPORTAR,
    clase="exportacion",
    criticidad=Criticidad.ALTA,
    regimen=Regimen.CRITICO,
    retencion=Retencion.ACTO,
    finalidad="acreditar el ejercicio del derecho de portabilidad",
    base_legal="obligacion_legal",
    campos_detalle=frozenset({"formato", "total_campos"}),
    valores_cerrados=MappingProxyType(
        {
            "formato": frozenset({"csv", "json"}),
        }
    ),
)

# ------------------------------------------------------------------- escritura

ESCRITURA_MIS_DATOS_ACTUALIZAR = Evento(
    codigo=Accion.ESCRITURA_MIS_DATOS_ACTUALIZAR,
    clase="escritura",
    criticidad=Criticidad.ALTA,
    regimen=Regimen.ATOMICO,
    retencion=Retencion.ACTO,
    finalidad="acreditar la rectificacion pedida por el titular",
    base_legal="obligacion_legal",
    campos_detalle=frozenset({"campos_modificados"}),
    exige_valores_previos=True,
)

ESCRITURA_SOLICITUD_SUPRESION_CREAR = Evento(
    codigo=Accion.ESCRITURA_SOLICITUD_SUPRESION_CREAR,
    clase="escritura",
    criticidad=Criticidad.ALTA,
    regimen=Regimen.ATOMICO,
    retencion=Retencion.ACTO,
    finalidad="acreditar la solicitud de supresion y su plazo de respuesta",
    base_legal="obligacion_legal",
    campos_detalle=frozenset({"alcance", "plazo_respuesta"}),
    valores_cerrados=MappingProxyType(
        {
            "alcance": frozenset({"total", "parcial"}),
        }
    ),
)

# --------------------------------------------------------------- configuracion

CONFIGURACION_PARAMETRO_ACTUALIZAR = Evento(
    codigo=Accion.CONFIGURACION_PARAMETRO_ACTUALIZAR,
    clase="configuracion",
    criticidad=Criticidad.ALTA,
    regimen=Regimen.ATOMICO,
    retencion=Retencion.ACTO,
    finalidad="trazar el cambio de un parametro que altera el comportamiento del sistema",
    base_legal="cumplimiento_funciones_publicas",
    campos_detalle=frozenset({"parametro", "ambito"}),
    exige_valores_previos=True,
)

CONFIGURACION_CATALOGO_ACTIVAR = Evento(
    codigo=Accion.CONFIGURACION_CATALOGO_ACTIVAR,
    clase="configuracion",
    criticidad=Criticidad.MEDIA,
    regimen=Regimen.ATOMICO,
    retencion=Retencion.ACTO,
    finalidad="trazar el alta o reactivacion de un elemento de catalogo administrativo",
    base_legal="cumplimiento_funciones_publicas",
    campos_detalle=frozenset({"catalogo", "entidad_id_num"}),
    exige_valores_previos=True,
)

CONFIGURACION_CATALOGO_DESACTIVAR = Evento(
    codigo=Accion.CONFIGURACION_CATALOGO_DESACTIVAR,
    clase="configuracion",
    criticidad=Criticidad.MEDIA,
    regimen=Regimen.ATOMICO,
    retencion=Retencion.ACTO,
    finalidad="trazar la baja de un elemento de catalogo administrativo",
    base_legal="cumplimiento_funciones_publicas",
    campos_detalle=frozenset({"catalogo", "entidad_id_num"}),
    exige_valores_previos=True,
)

# -------------------------------------------------------------- administracion

ADMINISTRACION_SESION_CERRAR = Evento(
    codigo=Accion.ADMINISTRACION_SESION_CERRAR,
    clase="administracion",
    criticidad=Criticidad.ALTA,
    regimen=Regimen.CRITICO,
    retencion=Retencion.ACTO,
    finalidad="trazar el cierre forzado de la sesion de otro actor",
    base_legal="cumplimiento_funciones_publicas",
    campos_detalle=frozenset({"actor_afectado_seudonimo", "motivo"}),
)

ADMINISTRACION_ACCESO_ACTIVAR = Evento(
    codigo=Accion.ADMINISTRACION_ACCESO_ACTIVAR,
    clase="administracion",
    criticidad=Criticidad.ALTA,
    regimen=Regimen.CRITICO,
    retencion=Retencion.ACTO,
    finalidad="trazar el alta de un acceso local que esta app administra",
    base_legal="cumplimiento_funciones_publicas",
    campos_detalle=frozenset({"actor_afectado_seudonimo", "rol", "ambito"}),
)

ADMINISTRACION_ACCESO_DESACTIVAR = Evento(
    codigo=Accion.ADMINISTRACION_ACCESO_DESACTIVAR,
    clase="administracion",
    criticidad=Criticidad.ALTA,
    regimen=Regimen.CRITICO,
    retencion=Retencion.ACTO,
    finalidad="trazar la baja de un acceso local que esta app administra",
    base_legal="cumplimiento_funciones_publicas",
    campos_detalle=frozenset({"actor_afectado_seudonimo", "rol", "ambito", "motivo"}),
)

# ------------------------------------------------------------------ emergencia

EMERGENCIA_BREAK_GLASS_ABRIR_EMERGENCIA = Evento(
    codigo=Accion.EMERGENCIA_BREAK_GLASS_ABRIR_EMERGENCIA,
    clase="emergencia",
    criticidad=Criticidad.CRITICA,
    regimen=Regimen.CRITICO,
    retencion=Retencion.ACTO,
    finalidad="dejar constancia del uso de una via excepcional de acceso",
    base_legal="cumplimiento_funciones_publicas",
    campos_detalle=frozenset({"motivo", "referencia_incidente", "responsable", "vence_en"}),
)

EMERGENCIA_BREAK_GLASS_CERRAR_EMERGENCIA = Evento(
    codigo=Accion.EMERGENCIA_BREAK_GLASS_CERRAR_EMERGENCIA,
    clase="emergencia",
    criticidad=Criticidad.CRITICA,
    regimen=Regimen.CRITICO,
    retencion=Retencion.ACTO,
    finalidad="cerrar la ventana excepcional y dejar que se hizo dentro de ella",
    base_legal="cumplimiento_funciones_publicas",
    campos_detalle=frozenset({"acciones_realizadas", "duracion_min"}),
)

# ------------------------------------------------------------------- retencion

RETENCION_LOG_TECNICO_PURGAR = Evento(
    codigo=Accion.RETENCION_LOG_TECNICO_PURGAR,
    clase="retencion",
    criticidad=Criticidad.MEDIA,
    regimen=Regimen.ATOMICO,
    retencion=Retencion.ACTO,
    finalidad="probar que la purga del estrato tecnico se ejecuto",
    base_legal="obligacion_legal",
    campos_detalle=frozenset({"corte", "filas_borradas", "duracion_ms"}),
)

RETENCION_LOG_AUDITORIA_PURGAR = Evento(
    codigo=Accion.RETENCION_LOG_AUDITORIA_PURGAR,
    clase="retencion",
    criticidad=Criticidad.ALTA,
    regimen=Regimen.ATOMICO,
    retencion=Retencion.ACTO,
    finalidad="probar que la purga del log de actos se ejecuto y donde quedo el corte",
    base_legal="obligacion_legal",
    campos_detalle=frozenset({"corte", "filas_borradas", "hash_ultimo_borrado", "hash_primero_conservado"}),
)

RETENCION_TITULAR_DESIDENTIFICAR = Evento(
    codigo=Accion.RETENCION_TITULAR_DESIDENTIFICAR,
    clase="retencion",
    criticidad=Criticidad.ALTA,
    regimen=Regimen.ATOMICO,
    retencion=Retencion.ACTO,
    finalidad="probar que la desidentificacion se ejecuto sobre que y cuando",
    base_legal="obligacion_legal",
    campos_detalle=frozenset({"corte", "filas_afectadas", "campos_afectados", "catalogo_version"}),
)

RETENCION_OBJETO_ELIMINAR = Evento(
    codigo=Accion.RETENCION_OBJETO_ELIMINAR,
    clase="retencion",
    criticidad=Criticidad.ALTA,
    regimen=Regimen.ATOMICO,
    retencion=Retencion.ACTO,
    finalidad="probar la eliminacion de los objetos con datos personales del almacen",
    base_legal="obligacion_legal",
    campos_detalle=frozenset({"almacen", "objetos_eliminados", "corte"}),
)

RETENCION_PLAN_FALLAR = Evento(
    codigo=Accion.RETENCION_PLAN_FALLAR,
    clase="retencion",
    criticidad=Criticidad.CRITICA,
    regimen=Regimen.DEGRADADO,
    retencion=Retencion.ACTO,
    finalidad="distinguir 'no habia nada que purgar' de 'lleva un año reventando'",
    base_legal="obligacion_legal",
    campos_detalle=frozenset({"job", "etapa", "tipo_error", "codigo"}),
    # excepción de régimen declarada en el catálogo: Su clase es ATOMICA pero este evento es DEGRADADO A PROPOSITO: se emite FUERA de la transaccion del job, que acaba de hacer rollback. Con regimen atomico, el registro del fallo se iria con el rollback del fallo y no quedaria ni una fila — que es exactamente lo que pasa hoy en anonimizacion.py y purga_logs.py.
)

# --------------------------------------------------------------------- proceso

PROCESO_RESPALDO_EJECUTAR = Evento(
    codigo=Accion.PROCESO_RESPALDO_EJECUTAR,
    clase="proceso",
    criticidad=Criticidad.ALTA,
    regimen=Regimen.ATOMICO,
    retencion=Retencion.ACTO,
    finalidad="probar que el respaldo cifrado se genero y con que clave de periodo",
    base_legal="cumplimiento_funciones_publicas",
    campos_detalle=frozenset({"destino", "bytes", "duracion_ms", "clave_periodo"}),
)

PROCESO_RESPALDO_FALLAR = Evento(
    codigo=Accion.PROCESO_RESPALDO_FALLAR,
    clase="proceso",
    criticidad=Criticidad.CRITICA,
    regimen=Regimen.DEGRADADO,
    retencion=Retencion.ACTO,
    finalidad="que un respaldo que no ocurrio sea visible sin mirar logs de contenedor",
    base_legal="cumplimiento_funciones_publicas",
    campos_detalle=frozenset({"etapa", "tipo_error", "codigo"}),
    # excepción de régimen declarada en el catálogo: mismo motivo que retencion.plan.fallar: se emite tras el rollback
)

PROCESO_SELLO_DIARIO_SELLAR = Evento(
    codigo=Accion.PROCESO_SELLO_DIARIO_SELLAR,
    clase="proceso",
    criticidad=Criticidad.ALTA,
    regimen=Regimen.ATOMICO,
    retencion=Retencion.ACTO,
    finalidad="anclar el estado del log del dia anterior fuera del alcance del DBA",
    base_legal="cumplimiento_funciones_publicas",
    campos_detalle=frozenset({"fecha_sellada", "filas", "hash_sello"}),
)

PROCESO_RECONCILIACION_EJECUTAR = Evento(
    codigo=Accion.PROCESO_RECONCILIACION_EJECUTAR,
    clase="proceso",
    criticidad=Criticidad.MEDIA,
    regimen=Regimen.ATOMICO,
    retencion=Retencion.ACTO,
    finalidad="probar que el respaldo JSONL se drena y cuanto queda pendiente",
    base_legal="cumplimiento_funciones_publicas",
    campos_detalle=frozenset({"lineas_drenadas", "lineas_pendientes", "mas_antigua_horas"}),
)

PROCESO_RESTAURACION_EJECUTAR = Evento(
    codigo=Accion.PROCESO_RESTAURACION_EJECUTAR,
    clase="proceso",
    criticidad=Criticidad.ALTA,
    regimen=Regimen.ATOMICO,
    retencion=Retencion.ACTO,
    finalidad="probar que la reversibilidad del respaldo se verifico antes de un pase",
    base_legal="cumplimiento_funciones_publicas",
    campos_detalle=frozenset({"host", "base_de_prueba", "filas_verificadas", "resultado"}),
    valores_cerrados=MappingProxyType(
        {
            "resultado": frozenset({"ok", "fallo"}),
        }
    ),
)

# --------------------------------------------------------------------- sistema

SISTEMA_DESPLIEGUE_COMPLETAR = Evento(
    codigo=Accion.SISTEMA_DESPLIEGUE_COMPLETAR,
    clase="sistema",
    criticidad=Criticidad.ALTA,
    regimen=Regimen.DEGRADADO,
    retencion=Retencion.ACTO,
    finalidad="gestion de cambios: que version corre desde cuando",
    base_legal="cumplimiento_funciones_publicas",
    campos_detalle=frozenset({"app", "commit", "version", "construido_en"}),
)

SISTEMA_MIGRACION_EJECUTAR = Evento(
    codigo=Accion.SISTEMA_MIGRACION_EJECUTAR,
    clase="sistema",
    criticidad=Criticidad.ALTA,
    regimen=Regimen.DEGRADADO,
    retencion=Retencion.ACTO,
    finalidad="trazar que migracion se aplico, con que hash y cuando",
    base_legal="cumplimiento_funciones_publicas",
    campos_detalle=frozenset({"archivo", "sha256", "duracion_ms"}),
)

SISTEMA_CATALOGO_EVENTO_CARGAR = Evento(
    codigo=Accion.SISTEMA_CATALOGO_EVENTO_CARGAR,
    clase="sistema",
    criticidad=Criticidad.MEDIA,
    regimen=Regimen.DEGRADADO,
    retencion=Retencion.ACTO,
    finalidad="dejar constancia de la version del catalogo de eventos que quedo vigente",
    base_legal="cumplimiento_funciones_publicas",
    campos_detalle=frozenset({"version_catalogo", "altas", "actualizaciones", "retirados"}),
)

SISTEMA_AUDITORIA_DEGRADAR = Evento(
    codigo=Accion.SISTEMA_AUDITORIA_DEGRADAR,
    clase="sistema",
    criticidad=Criticidad.ALTA,
    regimen=Regimen.DEGRADADO,
    retencion=Retencion.TECNICA,
    finalidad="contabilizar cuando la auditoria no pudo escribir donde debia",
    base_legal="cumplimiento_funciones_publicas",
    campos_detalle=frozenset({"evento_afectado", "motivo", "destino"}),
    valores_cerrados=MappingProxyType(
        {
            "motivo": frozenset({"clave_no_declarada", "escritura_fallida", "respaldo_usado", "detalle_truncado"}),
            "destino": frozenset({"respaldo_jsonl", "descartado"}),
        }
    ),
)

SISTEMA_AUDITORIA_FALLAR = Evento(
    codigo=Accion.SISTEMA_AUDITORIA_FALLAR,
    clase="sistema",
    criticidad=Criticidad.CRITICA,
    regimen=Regimen.DEGRADADO,
    retencion=Retencion.TECNICA,
    finalidad="señalar que ni el destino principal ni el respaldo pudieron escribir",
    base_legal="cumplimiento_funciones_publicas",
    campos_detalle=frozenset({"evento_afectado", "tipo_error"}),
)


_TODOS: tuple[Evento, ...] = (

    AUTENTICACION_SESION_INICIAR,

    AUTENTICACION_SESION_COMPLETAR,

    AUTENTICACION_SESION_RECHAZAR,

    AUTENTICACION_SESION_CERRAR,

    AUTORIZACION_ENDPOINT_DENEGAR,

    AUTORIZACION_RECURSO_DENEGAR,

    LECTURA_TITULAR_VER_DETALLE,

    LECTURA_TITULAR_LISTAR,

    LECTURA_AUDITORIA_CONSULTAR,

    LECTURA_MIS_DATOS_CONSULTAR,

    EXPORTACION_EVIDENCIA_EXPORTAR,

    EXPORTACION_DATOS_DESCARGAR,

    EXPORTACION_MIS_DATOS_EXPORTAR,

    ESCRITURA_MIS_DATOS_ACTUALIZAR,

    ESCRITURA_SOLICITUD_SUPRESION_CREAR,

    CONFIGURACION_PARAMETRO_ACTUALIZAR,

    CONFIGURACION_CATALOGO_ACTIVAR,

    CONFIGURACION_CATALOGO_DESACTIVAR,

    ADMINISTRACION_SESION_CERRAR,

    ADMINISTRACION_ACCESO_ACTIVAR,

    ADMINISTRACION_ACCESO_DESACTIVAR,

    EMERGENCIA_BREAK_GLASS_ABRIR_EMERGENCIA,

    EMERGENCIA_BREAK_GLASS_CERRAR_EMERGENCIA,

    RETENCION_LOG_TECNICO_PURGAR,

    RETENCION_LOG_AUDITORIA_PURGAR,

    RETENCION_TITULAR_DESIDENTIFICAR,

    RETENCION_OBJETO_ELIMINAR,

    RETENCION_PLAN_FALLAR,

    PROCESO_RESPALDO_EJECUTAR,

    PROCESO_RESPALDO_FALLAR,

    PROCESO_SELLO_DIARIO_SELLAR,

    PROCESO_RECONCILIACION_EJECUTAR,

    PROCESO_RESTAURACION_EJECUTAR,

    SISTEMA_DESPLIEGUE_COMPLETAR,

    SISTEMA_MIGRACION_EJECUTAR,

    SISTEMA_CATALOGO_EVENTO_CARGAR,

    SISTEMA_AUDITORIA_DEGRADAR,

    SISTEMA_AUDITORIA_FALLAR,

)


CATALOGO: Mapping[Accion, Evento] = MappingProxyType(
    {evento.codigo: evento for evento in _TODOS}
)


def por_codigo(codigo: str) -> Evento:
    """Busca por el texto del código. Solo para el arranque y las herramientas.

    El código de la aplicación NO usa esto: usa la constante del módulo, que es lo que hace
    imposible teclear un evento que no existe. Aquí está para la siembra de
    `catalogo_evento` y para los jueces, que sí reciben el código como dato.
    """
    try:
        return CATALOGO[Accion(codigo)]
    except ValueError as exc:
        raise KeyError(
            f"'{codigo}' no está en el catálogo de eventos. Un evento nuevo se declara en "
            f"catalogos/eventos.yaml del master y se regenera este archivo; no se inventa "
            f"en el punto de llamada"
        ) from exc
