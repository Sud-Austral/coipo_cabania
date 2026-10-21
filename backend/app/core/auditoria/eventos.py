"""Catalogo cerrado de eventos de auditoria. ARCHIVO GENERADO — NO SE EDITA A MANO.

    Fuente:    catalogos/eventos.yaml (version 1)
    sha256:    9fe482fa0f192052d316f762194482be58b6257aced144403b23ff716973c0c1
    Generador: scripts/generar_eventos.py
    Se regenera con `python scripts/generar_eventos.py`; el CI corre `--verificar` y falla
    si este archivo y el catalogo divergen. Misma mecanica que `gofmt -l`: el codigo no
    puede desactualizarse respecto de la doctrina porque el build no lo permite.

EL PRIMER CERROJO DE LOS TRES
----------------------------
`registrar()` NO acepta un string. Recibe un `Evento` congelado que solo existe si esta en
este catalogo. Los otros dos cerrojos son independientes a proposito: la tabla
`catalogo_evento` con `log_auditoria.accion` como FK real (la base rechaza el INSERT de un
evento inventado) y el juez j04, que recorre el AST y falla si el primer argumento de
`registrar*` es un `ast.Constant`.

Tres cerrojos y no uno porque cada uno tapa el hueco del anterior: el tipo no protege al
scheduler que hace un INSERT a mano, la FK no protege contra un evento del catalogo usado en
el sitio equivocado, y el AST no ve un `getattr(Accion, nombre)` armado en tiempo de
ejecucion.

EL FALLO QUE MOTIVA TODO ESTO, MEDIDO
-------------------------------------
Hoy hay TRES vocabularios en produccion: `auth.iam_callback` (COIPO_ENTREGA_PLANTA, 47
valores distintos de `accion`), `LOGIN_OK` (coipo_prensa2) y `LOGIN_SUCCESS` (COIPO_USUARIOS,
en ingles). Los tres son el mismo evento: `autenticacion.sesion.completar`. Y viven en TRES
esquemas de tabla distintos, con tres nombres para la columna de tiempo y tres para el actor.
El dia que Contraloria pida el rastro de la flota, lo que hace falta es que
`SELECT ... WHERE accion = 'autorizacion.endpoint.denegar'` funcione igual en las ocho apps.
Eso no se consigue con una convencion en un README: se consigue con un tipo que no deja
escribir otra cosa y una FK que hace fallar el INSERT.

DONDE VIVE EL "POR QUE" DE CADA EVENTO
--------------------------------------
En `catalogos/eventos.yaml`, al lado de cada entrada. Este archivo es mecanico a proposito:
copiar aqui esos comentarios crearia dos sitios que dicen lo mismo, y esa es exactamente la
forma en que nacieron las tres listas de clasificacion que ya divergieron en
COIPO_ENTREGA_PLANTA (middleware_acceso.py:55-80, routers/auditoria.py:33-36,
scheduler/src/anonimizacion.py:40-52).

QUE SIGNIFICA CADA CAMPO
------------------------
codigo        `<clase>.<entidad>.<verbo>`, tres segmentos, snake_case, ASCII, <= 64 chars.
criticidad    ORDENA informes y alertas. NO decide comportamiento: eso lo decide `regimen`,
              y punto. Dos campos que deciden lo mismo derivan el dia que alguien cambia uno.
regimen       Que pasa si la escritura del log falla. Lo decide EL EVENTO, no el programador
              en el punto de llamada (ver registro.py).
retencion     Estrato: tecnica (90 dias) | pii (5 años) | acto (6 años [VERIFICAR con
              Fiscalia, ver catalogos/retencion.yaml]).
finalidad     Tiene que aparecer en el RAT. Un evento sin finalidad escrita es un tratamiento
              sin finalidad declarada.
base_legal    La base que sostiene CONSERVAR ESTE REGISTRO, no la del tratamiento de negocio
              que el evento describe. Confundirlas es como se llega a un RAT que declara
              consentimiento sobre un log que el titular no puede borrar.
campos_detalle  Allowlist de claves de `detalle`. Una clave no declarada NO se escribe (D-19).
valores_cerrados  Para los campos que se cuentan en un informe. Contar texto libre no se puede.
exige_valores_previos  Si es True, `registrar()` exige `valores_previos`: es la traza del acto
              administrativo que pide Contraloria ("que decia antes y quien lo cambio").
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from enum import StrEnum
from types import MappingProxyType
from typing import Mapping

from app.core.auditoria.clasificacion import claves_prohibidas

CATALOGO_VERSION = 1
"""Version de catalogos/eventos.yaml. Viaja al evento `sistema.catalogo_evento.cargar` y a la
tabla `retencion_ejecucion`, para que una bitacora de retencion diga contra que catalogo se
ejecuto. Sin eso, "se purgaron 12.000 filas" no dice bajo que reglas."""

SHA256_CATALOGO = "9fe482fa0f192052d316f762194482be58b6257aced144403b23ff716973c0c1"
"""sha256 de catalogos/eventos.yaml al generar. Lo comprueba el generador con --verificar."""

LARGO_MAXIMO = 64

PATRON_EVENTO = re.compile(
    r"^[a-z][a-z0-9_]{1,20}\.[a-z][a-z0-9_]{1,24}\.[a-z][a-z0-9_]{1,16}$"
)
"""Tres segmentos exactos. Un cuarto segmento o un guion son un evento que ninguna consulta
de la flota va a encontrar."""

CLASES = frozenset(
    {
        "autenticacion",
        "autorizacion",
        "lectura",
        "escritura",
        "exportacion",
        "configuracion",
        "proceso",
        "administracion",
        "emergencia",
        "retencion",
        "sistema",
    }
)

VERBOS = frozenset(
    {
        "iniciar",
        "completar",
        "rechazar",
        "cerrar",
        "denegar",
        "consultar",
        "listar",
        "ver_detalle",
        "crear",
        "actualizar",
        "eliminar",
        "activar",
        "desactivar",
        "exportar",
        "descargar",
        "cargar",
        "ejecutar",
        "purgar",
        "desidentificar",
        "sellar",
        "abrir_emergencia",
        "cerrar_emergencia",
        "fallar",
        "degradar",
    }
)
"""Lista CERRADA. Un verbo abierto es exactamente lo que produjo los tres vocabularios: cada
programador nombro lo que hacia con la palabra que tenia a mano. Añadir un verbo es una
modificacion del patron y de la flota entera, no una decision de una app."""


class Criticidad(StrEnum):
    """Ordena informes y alertas. NO decide comportamiento."""

    BAJA = "baja"
    MEDIA = "media"
    ALTA = "alta"
    CRITICA = "critica"


class Regimen(StrEnum):
    """Que pasa si la escritura del log falla. Lo implementa registro.py."""

    ATOMICO = "ATOMICO"
    """Misma transaccion que el cambio de negocio. Si Postgres no responde no hay cambio que
    perder, asi que el coste de disponibilidad es CERO: la tension "auditoria obligatoria vs
    disponibilidad" es falsa para la clase mas importante."""

    CRITICO = "CRITICO"
    """La operacion NO se ejecuta: 503 con Retry-After. Una exportacion o una lectura masiva
    sin rastro es indistinguible de una fuga."""

    DEGRADADO = "DEGRADADO"
    """La operacion sigue; el evento va al respaldo duradero y se contabiliza. Convertir un
    403 en un 500 le regala al atacante un canal de denegacion de servicio y un oraculo."""

    BEST_EFFORT = "BEST_EFFORT"
    """Igual que DEGRADADO, y ademas NO se intenta la escritura si el fallo es un
    OperationalError: abrir otra sesion del mismo pool durante una caida consume
    connect_timeout reteniendo un hilo, y la auditoria amplificaria la caida que pretende
    reportar."""


class Estrato(StrEnum):
    """Los tres estratos de retencion. Ver catalogos/retencion.yaml."""

    TECNICA = "tecnica"
    """90 dias. IP cruda y user-agent completo, en `log_acceso_tecnico`."""

    PII = "pii"
    """5 años. Datos personales de negocio y eventos que identifican a una persona sin ser un
    acto administrativo."""

    ACTO = "acto"
    """6 años [VERIFICAR con Fiscalia]. La traza del acto administrativo. El invariante RET-1
    (acto >= pii) existe porque hoy COIPO_ENTREGA_PLANTA tiene 2 y 5: el log que prueba quien
    acepto la solicitud 1234 se borra tres años antes de que la solicitud 1234 se
    desidentifique."""


class Accion(StrEnum):
    """El unico vocabulario. Un evento retirado NO se borra de aqui ni de `catalogo_evento`:
    se marca `retirado_en`, porque borrarlo rompe la FK de las filas historicas — que es justo
    lo que la FK existe para impedir."""

    # ------------------------------------------------------------- autenticacion
    AUTENTICACION_SESION_INICIAR = "autenticacion.sesion.iniciar"
    AUTENTICACION_SESION_COMPLETAR = "autenticacion.sesion.completar"
    AUTENTICACION_SESION_RECHAZAR = "autenticacion.sesion.rechazar"
    AUTENTICACION_SESION_CERRAR = "autenticacion.sesion.cerrar"

    # -------------------------------------------------------------- autorizacion
    AUTORIZACION_ENDPOINT_DENEGAR = "autorizacion.endpoint.denegar"
    AUTORIZACION_RECURSO_DENEGAR = "autorizacion.recurso.denegar"

    # ------------------------------------------------------------------- lectura
    LECTURA_TITULAR_VER_DETALLE = "lectura.titular.ver_detalle"
    LECTURA_TITULAR_LISTAR = "lectura.titular.listar"
    LECTURA_AUDITORIA_CONSULTAR = "lectura.auditoria.consultar"
    LECTURA_MIS_DATOS_CONSULTAR = "lectura.mis_datos.consultar"

    # --------------------------------------------------------------- exportacion
    EXPORTACION_EVIDENCIA_EXPORTAR = "exportacion.evidencia.exportar"
    EXPORTACION_DATOS_DESCARGAR = "exportacion.datos.descargar"
    EXPORTACION_MIS_DATOS_EXPORTAR = "exportacion.mis_datos.exportar"

    # ----------------------------------------------------------------- escritura
    ESCRITURA_MIS_DATOS_ACTUALIZAR = "escritura.mis_datos.actualizar"
    ESCRITURA_SOLICITUD_SUPRESION_CREAR = "escritura.solicitud_supresion.crear"

    # ------------------------------------------------------------- configuracion
    CONFIGURACION_PARAMETRO_ACTUALIZAR = "configuracion.parametro.actualizar"
    CONFIGURACION_CATALOGO_ACTIVAR = "configuracion.catalogo.activar"
    CONFIGURACION_CATALOGO_DESACTIVAR = "configuracion.catalogo.desactivar"

    # ------------------------------------------------------------ administracion
    ADMINISTRACION_SESION_CERRAR = "administracion.sesion.cerrar"
    ADMINISTRACION_ACCESO_ACTIVAR = "administracion.acceso.activar"
    ADMINISTRACION_ACCESO_DESACTIVAR = "administracion.acceso.desactivar"

    # ---------------------------------------------------------------- emergencia
    EMERGENCIA_BREAK_GLASS_ABRIR_EMERGENCIA = "emergencia.break_glass.abrir_emergencia"
    EMERGENCIA_BREAK_GLASS_CERRAR_EMERGENCIA = "emergencia.break_glass.cerrar_emergencia"

    # ----------------------------------------------------------------- retencion
    RETENCION_LOG_TECNICO_PURGAR = "retencion.log_tecnico.purgar"
    RETENCION_LOG_AUDITORIA_PURGAR = "retencion.log_auditoria.purgar"
    RETENCION_TITULAR_DESIDENTIFICAR = "retencion.titular.desidentificar"
    RETENCION_OBJETO_ELIMINAR = "retencion.objeto.eliminar"
    RETENCION_PLAN_FALLAR = "retencion.plan.fallar"

    # ------------------------------------------------------------------- proceso
    PROCESO_RESPALDO_EJECUTAR = "proceso.respaldo.ejecutar"
    PROCESO_RESPALDO_FALLAR = "proceso.respaldo.fallar"
    PROCESO_SELLO_DIARIO_SELLAR = "proceso.sello_diario.sellar"
    PROCESO_RECONCILIACION_EJECUTAR = "proceso.reconciliacion.ejecutar"
    PROCESO_RESTAURACION_EJECUTAR = "proceso.restauracion.ejecutar"

    # ------------------------------------------------------------------- sistema
    SISTEMA_DESPLIEGUE_COMPLETAR = "sistema.despliegue.completar"
    SISTEMA_MIGRACION_EJECUTAR = "sistema.migracion.ejecutar"
    SISTEMA_CATALOGO_EVENTO_CARGAR = "sistema.catalogo_evento.cargar"
    SISTEMA_AUDITORIA_DEGRADAR = "sistema.auditoria.degradar"
    SISTEMA_AUDITORIA_FALLAR = "sistema.auditoria.fallar"


_CERRADOS_VACIOS: Mapping[str, frozenset[str]] = MappingProxyType({})


def _cerrados(mapa: dict[str, frozenset[str]]) -> Mapping[str, frozenset[str]]:
    return MappingProxyType(dict(mapa))


@dataclass(frozen=True, slots=True, eq=False)
class Evento:
    """El objeto que `registrar()` exige. Congelado y validado en construccion.

    `eq=False` a proposito: `valores_cerrados` es un MappingProxyType y no es hasheable, asi
    que un `__eq__`/`__hash__` generados reventarian al meter un Evento en un set. La
    identidad de un evento es su codigo y el catalogo es un singleton, asi que la igualdad por
    identidad es la correcta.
    """

    codigo: Accion
    criticidad: Criticidad
    regimen: Regimen
    retencion: Estrato
    finalidad: str
    base_legal: str
    campos_detalle: frozenset[str]
    valores_cerrados: Mapping[str, frozenset[str]]
    exige_valores_previos: bool

    def __post_init__(self) -> None:
        """Valida, nunca corrige. Un catalogo mal generado tiene que reventar al importar el
        modulo —o sea, al arrancar la app y en el primer test— y no al escribir la primera
        fila en produccion."""
        codigo = str(self.codigo)
        if not PATRON_EVENTO.fullmatch(codigo) or len(codigo) > LARGO_MAXIMO:
            raise ValueError(f"codigo de evento fuera del patron: {codigo!r}")
        clase, _entidad, verbo = codigo.split(".")
        if clase not in CLASES:
            raise ValueError(f"clase no declarada: {clase!r} (evento {codigo})")
        if verbo not in VERBOS:
            raise ValueError(f"verbo no declarado: {verbo!r} (evento {codigo})")
        if not isinstance(self.campos_detalle, frozenset):
            raise TypeError(f"campos_detalle tiene que ser frozenset (evento {codigo})")
        # D-19 por el lado del catalogo: declarar `rut` o `correo` como campo de detalle
        # bastaria para meter el dato en la unica tabla que la desidentificacion no puede
        # tocar. Que reviente aqui, y no tres años despues en una exportacion a Contraloria.
        prohibidas = claves_prohibidas(self.campos_detalle)
        if prohibidas:
            raise ValueError(
                f"evento {codigo} declara claves prohibidas en detalle: {sorted(prohibidas)}"
            )
        sobran = set(self.valores_cerrados) - self.campos_detalle
        if sobran:
            raise ValueError(
                f"evento {codigo} declara valores_cerrados de claves no declaradas: "
                f"{sorted(sobran)}"
            )

    @property
    def clase(self) -> str:
        """Derivada del codigo, no un campo: dos sitios que declaran la clase derivan el dia
        que alguien edita uno solo."""
        return str(self.codigo).split(".", 1)[0]

    @property
    def entidad_del_codigo(self) -> str:
        return str(self.codigo).split(".")[1]

    @property
    def verbo(self) -> str:
        return str(self.codigo).split(".")[2]

    @property
    def es_acto_administrativo(self) -> bool:
        return self.retencion is Estrato.ACTO


CATALOGO: Mapping[Accion, Evento] = MappingProxyType(
    {
        # --------------------------------------------------------- autenticacion
        Accion.AUTENTICACION_SESION_INICIAR: Evento(
            codigo=Accion.AUTENTICACION_SESION_INICIAR,
            criticidad=Criticidad.BAJA,
            regimen=Regimen.BEST_EFFORT,
            retencion=Estrato.TECNICA,
            finalidad="trazar el inicio del flujo OAuth para poder investigar un canje fallido",
            base_legal="cumplimiento_funciones_publicas",
            campos_detalle=frozenset({"estado_id", "ruta_destino"}),
            valores_cerrados=_CERRADOS_VACIOS,
            exige_valores_previos=False,
        ),
        Accion.AUTENTICACION_SESION_COMPLETAR: Evento(
            codigo=Accion.AUTENTICACION_SESION_COMPLETAR,
            criticidad=Criticidad.ALTA,
            regimen=Regimen.BEST_EFFORT,
            retencion=Estrato.PII,
            finalidad="acreditar que el actor de un acto administrativo se autentico",
            base_legal="cumplimiento_funciones_publicas",
            campos_detalle=frozenset(
                {"rol", "ambitos_declarados", "claims_ausentes", "duracion_canje_ms"}
            ),
            valores_cerrados=_CERRADOS_VACIOS,
            exige_valores_previos=False,
        ),
        Accion.AUTENTICACION_SESION_RECHAZAR: Evento(
            codigo=Accion.AUTENTICACION_SESION_RECHAZAR,
            criticidad=Criticidad.ALTA,
            regimen=Regimen.BEST_EFFORT,
            retencion=Estrato.TECNICA,
            finalidad="detectar intentos de acceso invalidos y fallos de configuracion del IAM",
            base_legal="cumplimiento_funciones_publicas",
            campos_detalle=frozenset({"motivo"}),
            valores_cerrados=_cerrados(
                {
                    "motivo": frozenset(
                        {"estado_invalido", "estado_expirado", "estado_reusado",
                        "codigo_invalido", "userinfo_fallo", "rol_sin_asignacion",
                        "atributo_obligatorio_ausente"}
                    ),
                }
            ),
            exige_valores_previos=False,
        ),
        Accion.AUTENTICACION_SESION_CERRAR: Evento(
            codigo=Accion.AUTENTICACION_SESION_CERRAR,
            criticidad=Criticidad.BAJA,
            regimen=Regimen.BEST_EFFORT,
            retencion=Estrato.PII,
            finalidad="acotar la ventana en que una sesion estuvo viva",
            base_legal="cumplimiento_funciones_publicas",
            campos_detalle=frozenset({"motivo", "duracion_min"}),
            valores_cerrados=_cerrados(
                {
                    "motivo": frozenset(
                        {"voluntario", "inactividad", "tope_absoluto", "forzado"}
                    ),
                }
            ),
            exige_valores_previos=False,
        ),

        # ---------------------------------------------------------- autorizacion
        Accion.AUTORIZACION_ENDPOINT_DENEGAR: Evento(
            codigo=Accion.AUTORIZACION_ENDPOINT_DENEGAR,
            criticidad=Criticidad.ALTA,
            regimen=Regimen.DEGRADADO,
            retencion=Estrato.PII,
            finalidad="evidenciar el control de acceso: quien intento que y con que rol",
            base_legal="cumplimiento_funciones_publicas",
            campos_detalle=frozenset({"ruta_patron", "metodo", "rol_efectivo", "motivo"}),
            valores_cerrados=_cerrados(
                {
                    "motivo": frozenset(
                        {"rol_insuficiente", "ambito_ajeno", "rol_sin_asignacion",
                        "sesion_expirada"}
                    ),
                }
            ),
            exige_valores_previos=False,
        ),
        Accion.AUTORIZACION_RECURSO_DENEGAR: Evento(
            codigo=Accion.AUTORIZACION_RECURSO_DENEGAR,
            criticidad=Criticidad.ALTA,
            regimen=Regimen.DEGRADADO,
            retencion=Estrato.PII,
            finalidad="registrar el acceso denegado a un recurso fuera del ambito del actor",
            base_legal="cumplimiento_funciones_publicas",
            campos_detalle=frozenset({"entidad", "entidad_id_num", "motivo"}),
            valores_cerrados=_cerrados(
                {
                    "motivo": frozenset({"ambito_ajeno", "inexistente"}),
                }
            ),
            exige_valores_previos=False,
        ),

        # --------------------------------------------------------------- lectura
        Accion.LECTURA_TITULAR_VER_DETALLE: Evento(
            codigo=Accion.LECTURA_TITULAR_VER_DETALLE,
            criticidad=Criticidad.MEDIA,
            regimen=Regimen.DEGRADADO,
            retencion=Estrato.PII,
            finalidad="acreditar quien accedio a los datos personales de una persona",
            base_legal="cumplimiento_funciones_publicas",
            campos_detalle=frozenset({"entidad", "entidad_id_num", "campos_devueltos"}),
            valores_cerrados=_CERRADOS_VACIOS,
            exige_valores_previos=False,
        ),
        Accion.LECTURA_TITULAR_LISTAR: Evento(
            codigo=Accion.LECTURA_TITULAR_LISTAR,
            criticidad=Criticidad.ALTA,
            regimen=Regimen.CRITICO,
            retencion=Estrato.PII,
            finalidad="acreditar los accesos masivos a datos personales",
            base_legal="cumplimiento_funciones_publicas",
            campos_detalle=frozenset(
                {"entidad", "filtro_aplicado", "ambito_forzado", "total_filas"}
            ),
            valores_cerrados=_CERRADOS_VACIOS,
            exige_valores_previos=False,
        ),
        Accion.LECTURA_AUDITORIA_CONSULTAR: Evento(
            codigo=Accion.LECTURA_AUDITORIA_CONSULTAR,
            criticidad=Criticidad.ALTA,
            regimen=Regimen.CRITICO,
            retencion=Estrato.PII,
            finalidad="auditar al auditor: quien miro el log y con que alcance",
            base_legal="cumplimiento_funciones_publicas",
            campos_detalle=frozenset({"rango_desde", "rango_hasta", "total_filas", "ancla"}),
            valores_cerrados=_CERRADOS_VACIOS,
            exige_valores_previos=False,
        ),
        Accion.LECTURA_MIS_DATOS_CONSULTAR: Evento(
            codigo=Accion.LECTURA_MIS_DATOS_CONSULTAR,
            criticidad=Criticidad.MEDIA,
            regimen=Regimen.DEGRADADO,
            retencion=Estrato.PII,
            finalidad="acreditar el ejercicio del derecho de acceso del propio titular",
            base_legal="obligacion_legal",
            campos_detalle=frozenset({"campos_devueltos"}),
            valores_cerrados=_CERRADOS_VACIOS,
            exige_valores_previos=False,
        ),

        # ----------------------------------------------------------- exportacion
        Accion.EXPORTACION_EVIDENCIA_EXPORTAR: Evento(
            codigo=Accion.EXPORTACION_EVIDENCIA_EXPORTAR,
            criticidad=Criticidad.CRITICA,
            regimen=Regimen.CRITICO,
            retencion=Estrato.ACTO,
            finalidad="dejar constancia de cada entrega de evidencia a un tercero",
            base_legal="cumplimiento_funciones_publicas",
            campos_detalle=frozenset(
                {"motivo", "solicitante_externo_organismo", "referencia_oficio", "archivos",
                "total_filas", "sha256_manifiesto"}
            ),
            valores_cerrados=_CERRADOS_VACIOS,
            exige_valores_previos=False,
        ),
        Accion.EXPORTACION_DATOS_DESCARGAR: Evento(
            codigo=Accion.EXPORTACION_DATOS_DESCARGAR,
            criticidad=Criticidad.ALTA,
            regimen=Regimen.CRITICO,
            retencion=Estrato.ACTO,
            finalidad="trazar la salida de datos personales del sistema en un archivo",
            base_legal="cumplimiento_funciones_publicas",
            campos_detalle=frozenset({"entidad", "entidad_id_num", "formato", "total_filas"}),
            valores_cerrados=_cerrados(
                {
                    "formato": frozenset({"csv", "xlsx", "pdf", "zip", "json"}),
                }
            ),
            exige_valores_previos=False,
        ),
        Accion.EXPORTACION_MIS_DATOS_EXPORTAR: Evento(
            codigo=Accion.EXPORTACION_MIS_DATOS_EXPORTAR,
            criticidad=Criticidad.ALTA,
            regimen=Regimen.CRITICO,
            retencion=Estrato.ACTO,
            finalidad="acreditar el ejercicio del derecho de portabilidad",
            base_legal="obligacion_legal",
            campos_detalle=frozenset({"formato", "total_campos"}),
            valores_cerrados=_cerrados(
                {
                    "formato": frozenset({"csv", "json"}),
                }
            ),
            exige_valores_previos=False,
        ),

        # ------------------------------------------------------------- escritura
        Accion.ESCRITURA_MIS_DATOS_ACTUALIZAR: Evento(
            codigo=Accion.ESCRITURA_MIS_DATOS_ACTUALIZAR,
            criticidad=Criticidad.ALTA,
            regimen=Regimen.ATOMICO,
            retencion=Estrato.ACTO,
            finalidad="acreditar la rectificacion pedida por el titular",
            base_legal="obligacion_legal",
            campos_detalle=frozenset({"campos_modificados"}),
            valores_cerrados=_CERRADOS_VACIOS,
            exige_valores_previos=True,
        ),
        Accion.ESCRITURA_SOLICITUD_SUPRESION_CREAR: Evento(
            codigo=Accion.ESCRITURA_SOLICITUD_SUPRESION_CREAR,
            criticidad=Criticidad.ALTA,
            regimen=Regimen.ATOMICO,
            retencion=Estrato.ACTO,
            finalidad="acreditar la solicitud de supresion y su plazo de respuesta",
            base_legal="obligacion_legal",
            campos_detalle=frozenset({"alcance", "plazo_respuesta"}),
            valores_cerrados=_cerrados(
                {
                    "alcance": frozenset({"total", "parcial"}),
                }
            ),
            exige_valores_previos=False,
        ),

        # --------------------------------------------------------- configuracion
        Accion.CONFIGURACION_PARAMETRO_ACTUALIZAR: Evento(
            codigo=Accion.CONFIGURACION_PARAMETRO_ACTUALIZAR,
            criticidad=Criticidad.ALTA,
            regimen=Regimen.ATOMICO,
            retencion=Estrato.ACTO,
            finalidad="trazar el cambio de un parametro que altera el comportamiento del "
                      "sistema",
            base_legal="cumplimiento_funciones_publicas",
            campos_detalle=frozenset({"parametro", "ambito"}),
            valores_cerrados=_CERRADOS_VACIOS,
            exige_valores_previos=True,
        ),
        Accion.CONFIGURACION_CATALOGO_ACTIVAR: Evento(
            codigo=Accion.CONFIGURACION_CATALOGO_ACTIVAR,
            criticidad=Criticidad.MEDIA,
            regimen=Regimen.ATOMICO,
            retencion=Estrato.ACTO,
            finalidad="trazar el alta o reactivacion de un elemento de catalogo administrativo",
            base_legal="cumplimiento_funciones_publicas",
            campos_detalle=frozenset({"catalogo", "entidad_id_num"}),
            valores_cerrados=_CERRADOS_VACIOS,
            exige_valores_previos=True,
        ),
        Accion.CONFIGURACION_CATALOGO_DESACTIVAR: Evento(
            codigo=Accion.CONFIGURACION_CATALOGO_DESACTIVAR,
            criticidad=Criticidad.MEDIA,
            regimen=Regimen.ATOMICO,
            retencion=Estrato.ACTO,
            finalidad="trazar la baja de un elemento de catalogo administrativo",
            base_legal="cumplimiento_funciones_publicas",
            campos_detalle=frozenset({"catalogo", "entidad_id_num"}),
            valores_cerrados=_CERRADOS_VACIOS,
            exige_valores_previos=True,
        ),

        # -------------------------------------------------------- administracion
        Accion.ADMINISTRACION_SESION_CERRAR: Evento(
            codigo=Accion.ADMINISTRACION_SESION_CERRAR,
            criticidad=Criticidad.ALTA,
            regimen=Regimen.CRITICO,
            retencion=Estrato.ACTO,
            finalidad="trazar el cierre forzado de la sesion de otro actor",
            base_legal="cumplimiento_funciones_publicas",
            campos_detalle=frozenset({"actor_afectado_seudonimo", "motivo"}),
            valores_cerrados=_CERRADOS_VACIOS,
            exige_valores_previos=False,
        ),
        Accion.ADMINISTRACION_ACCESO_ACTIVAR: Evento(
            codigo=Accion.ADMINISTRACION_ACCESO_ACTIVAR,
            criticidad=Criticidad.ALTA,
            regimen=Regimen.CRITICO,
            retencion=Estrato.ACTO,
            finalidad="trazar el alta de un acceso local que esta app administra",
            base_legal="cumplimiento_funciones_publicas",
            campos_detalle=frozenset({"actor_afectado_seudonimo", "rol", "ambito"}),
            valores_cerrados=_CERRADOS_VACIOS,
            exige_valores_previos=False,
        ),
        Accion.ADMINISTRACION_ACCESO_DESACTIVAR: Evento(
            codigo=Accion.ADMINISTRACION_ACCESO_DESACTIVAR,
            criticidad=Criticidad.ALTA,
            regimen=Regimen.CRITICO,
            retencion=Estrato.ACTO,
            finalidad="trazar la baja de un acceso local que esta app administra",
            base_legal="cumplimiento_funciones_publicas",
            campos_detalle=frozenset({"actor_afectado_seudonimo", "rol", "ambito", "motivo"}),
            valores_cerrados=_CERRADOS_VACIOS,
            exige_valores_previos=False,
        ),

        # ------------------------------------------------------------ emergencia
        Accion.EMERGENCIA_BREAK_GLASS_ABRIR_EMERGENCIA: Evento(
            codigo=Accion.EMERGENCIA_BREAK_GLASS_ABRIR_EMERGENCIA,
            criticidad=Criticidad.CRITICA,
            regimen=Regimen.CRITICO,
            retencion=Estrato.ACTO,
            finalidad="dejar constancia del uso de una via excepcional de acceso",
            base_legal="cumplimiento_funciones_publicas",
            campos_detalle=frozenset(
                {"motivo", "referencia_incidente", "responsable", "vence_en"}
            ),
            valores_cerrados=_CERRADOS_VACIOS,
            exige_valores_previos=False,
        ),
        Accion.EMERGENCIA_BREAK_GLASS_CERRAR_EMERGENCIA: Evento(
            codigo=Accion.EMERGENCIA_BREAK_GLASS_CERRAR_EMERGENCIA,
            criticidad=Criticidad.CRITICA,
            regimen=Regimen.CRITICO,
            retencion=Estrato.ACTO,
            finalidad="cerrar la ventana excepcional y dejar que se hizo dentro de ella",
            base_legal="cumplimiento_funciones_publicas",
            campos_detalle=frozenset({"acciones_realizadas", "duracion_min"}),
            valores_cerrados=_CERRADOS_VACIOS,
            exige_valores_previos=False,
        ),

        # ------------------------------------------------------------- retencion
        Accion.RETENCION_LOG_TECNICO_PURGAR: Evento(
            codigo=Accion.RETENCION_LOG_TECNICO_PURGAR,
            criticidad=Criticidad.MEDIA,
            regimen=Regimen.ATOMICO,
            retencion=Estrato.ACTO,
            finalidad="probar que la purga del estrato tecnico se ejecuto",
            base_legal="obligacion_legal",
            campos_detalle=frozenset({"corte", "filas_borradas", "duracion_ms"}),
            valores_cerrados=_CERRADOS_VACIOS,
            exige_valores_previos=False,
        ),
        Accion.RETENCION_LOG_AUDITORIA_PURGAR: Evento(
            codigo=Accion.RETENCION_LOG_AUDITORIA_PURGAR,
            criticidad=Criticidad.ALTA,
            regimen=Regimen.ATOMICO,
            retencion=Estrato.ACTO,
            finalidad="probar que la purga del log de actos se ejecuto y donde quedo el corte",
            base_legal="obligacion_legal",
            campos_detalle=frozenset(
                {"corte", "filas_borradas", "hash_ultimo_borrado", "hash_primero_conservado"}
            ),
            valores_cerrados=_CERRADOS_VACIOS,
            exige_valores_previos=False,
        ),
        Accion.RETENCION_TITULAR_DESIDENTIFICAR: Evento(
            codigo=Accion.RETENCION_TITULAR_DESIDENTIFICAR,
            criticidad=Criticidad.ALTA,
            regimen=Regimen.ATOMICO,
            retencion=Estrato.ACTO,
            finalidad="probar que la desidentificacion se ejecuto sobre que y cuando",
            base_legal="obligacion_legal",
            campos_detalle=frozenset(
                {"corte", "filas_afectadas", "campos_afectados", "catalogo_version"}
            ),
            valores_cerrados=_CERRADOS_VACIOS,
            exige_valores_previos=False,
        ),
        Accion.RETENCION_OBJETO_ELIMINAR: Evento(
            codigo=Accion.RETENCION_OBJETO_ELIMINAR,
            criticidad=Criticidad.ALTA,
            regimen=Regimen.ATOMICO,
            retencion=Estrato.ACTO,
            finalidad="probar la eliminacion de los objetos con datos personales del almacen",
            base_legal="obligacion_legal",
            campos_detalle=frozenset({"almacen", "objetos_eliminados", "corte"}),
            valores_cerrados=_CERRADOS_VACIOS,
            exige_valores_previos=False,
        ),
        # EXCEPCION DE REGIMEN: Su clase es ATOMICA pero este evento es DEGRADADO A PROPOSITO: se
        # emite FUERA de la transaccion del job, que acaba de hacer rollback. Con regimen atomico,
        # el registro del fallo se iria con el rollback del fallo y no quedaria ni una fila — que
        # es exactamente lo que pasa hoy en anonimizacion.py y purga_logs.py.
        Accion.RETENCION_PLAN_FALLAR: Evento(
            codigo=Accion.RETENCION_PLAN_FALLAR,
            criticidad=Criticidad.CRITICA,
            regimen=Regimen.DEGRADADO,
            retencion=Estrato.ACTO,
            finalidad="distinguir 'no habia nada que purgar' de 'lleva un año reventando'",
            base_legal="obligacion_legal",
            campos_detalle=frozenset({"job", "etapa", "tipo_error", "codigo"}),
            valores_cerrados=_CERRADOS_VACIOS,
            exige_valores_previos=False,
        ),

        # --------------------------------------------------------------- proceso
        Accion.PROCESO_RESPALDO_EJECUTAR: Evento(
            codigo=Accion.PROCESO_RESPALDO_EJECUTAR,
            criticidad=Criticidad.ALTA,
            regimen=Regimen.ATOMICO,
            retencion=Estrato.ACTO,
            finalidad="probar que el respaldo cifrado se genero y con que clave de periodo",
            base_legal="cumplimiento_funciones_publicas",
            campos_detalle=frozenset({"destino", "bytes", "duracion_ms", "clave_periodo"}),
            valores_cerrados=_CERRADOS_VACIOS,
            exige_valores_previos=False,
        ),
        # EXCEPCION DE REGIMEN: mismo motivo que retencion.plan.fallar: se emite tras el rollback
        Accion.PROCESO_RESPALDO_FALLAR: Evento(
            codigo=Accion.PROCESO_RESPALDO_FALLAR,
            criticidad=Criticidad.CRITICA,
            regimen=Regimen.DEGRADADO,
            retencion=Estrato.ACTO,
            finalidad="que un respaldo que no ocurrio sea visible sin mirar logs de contenedor",
            base_legal="cumplimiento_funciones_publicas",
            campos_detalle=frozenset({"etapa", "tipo_error", "codigo"}),
            valores_cerrados=_CERRADOS_VACIOS,
            exige_valores_previos=False,
        ),
        Accion.PROCESO_SELLO_DIARIO_SELLAR: Evento(
            codigo=Accion.PROCESO_SELLO_DIARIO_SELLAR,
            criticidad=Criticidad.ALTA,
            regimen=Regimen.ATOMICO,
            retencion=Estrato.ACTO,
            finalidad="anclar el estado del log del dia anterior fuera del alcance del DBA",
            base_legal="cumplimiento_funciones_publicas",
            campos_detalle=frozenset({"fecha_sellada", "filas", "hash_sello"}),
            valores_cerrados=_CERRADOS_VACIOS,
            exige_valores_previos=False,
        ),
        Accion.PROCESO_RECONCILIACION_EJECUTAR: Evento(
            codigo=Accion.PROCESO_RECONCILIACION_EJECUTAR,
            criticidad=Criticidad.MEDIA,
            regimen=Regimen.ATOMICO,
            retencion=Estrato.ACTO,
            finalidad="probar que el respaldo JSONL se drena y cuanto queda pendiente",
            base_legal="cumplimiento_funciones_publicas",
            campos_detalle=frozenset(
                {"lineas_drenadas", "lineas_pendientes", "mas_antigua_horas"}
            ),
            valores_cerrados=_CERRADOS_VACIOS,
            exige_valores_previos=False,
        ),
        Accion.PROCESO_RESTAURACION_EJECUTAR: Evento(
            codigo=Accion.PROCESO_RESTAURACION_EJECUTAR,
            criticidad=Criticidad.ALTA,
            regimen=Regimen.ATOMICO,
            retencion=Estrato.ACTO,
            finalidad="probar que la reversibilidad del respaldo se verifico antes de un pase",
            base_legal="cumplimiento_funciones_publicas",
            campos_detalle=frozenset(
                {"host", "base_de_prueba", "filas_verificadas", "resultado"}
            ),
            valores_cerrados=_cerrados(
                {
                    "resultado": frozenset({"ok", "fallo"}),
                }
            ),
            exige_valores_previos=False,
        ),

        # --------------------------------------------------------------- sistema
        Accion.SISTEMA_DESPLIEGUE_COMPLETAR: Evento(
            codigo=Accion.SISTEMA_DESPLIEGUE_COMPLETAR,
            criticidad=Criticidad.ALTA,
            regimen=Regimen.DEGRADADO,
            retencion=Estrato.ACTO,
            finalidad="gestion de cambios: que version corre desde cuando",
            base_legal="cumplimiento_funciones_publicas",
            campos_detalle=frozenset({"app", "commit", "version", "construido_en"}),
            valores_cerrados=_CERRADOS_VACIOS,
            exige_valores_previos=False,
        ),
        Accion.SISTEMA_MIGRACION_EJECUTAR: Evento(
            codigo=Accion.SISTEMA_MIGRACION_EJECUTAR,
            criticidad=Criticidad.ALTA,
            regimen=Regimen.DEGRADADO,
            retencion=Estrato.ACTO,
            finalidad="trazar que migracion se aplico, con que hash y cuando",
            base_legal="cumplimiento_funciones_publicas",
            campos_detalle=frozenset({"archivo", "sha256", "duracion_ms"}),
            valores_cerrados=_CERRADOS_VACIOS,
            exige_valores_previos=False,
        ),
        Accion.SISTEMA_CATALOGO_EVENTO_CARGAR: Evento(
            codigo=Accion.SISTEMA_CATALOGO_EVENTO_CARGAR,
            criticidad=Criticidad.MEDIA,
            regimen=Regimen.DEGRADADO,
            retencion=Estrato.ACTO,
            finalidad="dejar constancia de la version del catalogo de eventos que quedo vigente",
            base_legal="cumplimiento_funciones_publicas",
            campos_detalle=frozenset(
                {"version_catalogo", "altas", "actualizaciones", "retirados"}
            ),
            valores_cerrados=_CERRADOS_VACIOS,
            exige_valores_previos=False,
        ),
        Accion.SISTEMA_AUDITORIA_DEGRADAR: Evento(
            codigo=Accion.SISTEMA_AUDITORIA_DEGRADAR,
            criticidad=Criticidad.ALTA,
            regimen=Regimen.DEGRADADO,
            retencion=Estrato.TECNICA,
            finalidad="contabilizar cuando la auditoria no pudo escribir donde debia",
            base_legal="cumplimiento_funciones_publicas",
            campos_detalle=frozenset({"evento_afectado", "motivo", "destino"}),
            valores_cerrados=_cerrados(
                {
                    "motivo": frozenset(
                        {"clave_no_declarada", "escritura_fallida", "respaldo_usado",
                        "detalle_truncado"}
                    ),
                    "destino": frozenset({"respaldo_jsonl", "descartado"}),
                }
            ),
            exige_valores_previos=False,
        ),
        Accion.SISTEMA_AUDITORIA_FALLAR: Evento(
            codigo=Accion.SISTEMA_AUDITORIA_FALLAR,
            criticidad=Criticidad.CRITICA,
            regimen=Regimen.DEGRADADO,
            retencion=Estrato.TECNICA,
            finalidad="señalar que ni el destino principal ni el respaldo pudieron escribir",
            base_legal="cumplimiento_funciones_publicas",
            campos_detalle=frozenset({"evento_afectado", "tipo_error"}),
            valores_cerrados=_CERRADOS_VACIOS,
            exige_valores_previos=False,
        ),
    }
)
"""Los 38 eventos de plataforma. Los de negocio los añade cada app en
`catalogos/eventos-<app>.yaml`, con la MISMA forma y sembrados en la misma tabla; lo que esta
cerrado es la gramatica, no la lista."""


def evento(accion: Accion) -> Evento:
    """Unica via de acceso. Un `Accion` que no este en el catalogo es un error de generacion,
    no un caso a tolerar en tiempo de ejecucion."""
    try:
        return CATALOGO[accion]
    except KeyError:  # pragma: no cover - solo con un catalogo mal generado
        raise KeyError(f"evento fuera del catalogo: {accion!r}") from None


def eventos_de_clase(clase: str) -> tuple[Evento, ...]:
    return tuple(e for e in CATALOGO.values() if e.clase == clase)


def eventos_de_estrato(estrato: Estrato) -> tuple[Evento, ...]:
    """Lo usa `fn_purgar_*` para saber que filas le tocan a cada estrato, y el juez j10 para
    reconciliar el catalogo con las funciones de purga de db/0000_plataforma.sql."""
    return tuple(e for e in CATALOGO.values() if e.retencion is estrato)
