"""Clasificacion de datos: el catalogo de columnas y las cuatro preguntas que se le hacen.

QUE REEMPLAZA — TRES LISTAS QUE YA DIVERGIERON, MEDIDO
------------------------------------------------------
En COIPO_ENTREGA_PLANTA la misma decision vive hoy en tres sitios, y los tres dan respuestas
distintas:

  1. `CLAVES_PERMITIDAS` (core/middleware_acceso.py:55-80) incluye `entidad_id`, que es por
     donde entra un RUT literal al log de accesos: `GET /api/auditoria?entidad_id=12345678-9`
     escribe ese RUT en `log_acceso.query`.
  2. `CLAVES_SENSIBLES` (routers/auditoria.py:33-36) no enmascara `genero`, `discapacidad`,
     `pueblo_originario` ni `fecha_nacimiento` — las cuatro columnas mas sensibles del
     esquema.
  3. `CAMPOS_SOLICITANTE` / `CAMPOS_SOLICITUD` (scheduler/src/anonimizacion.py:40-52) no
     incluye `guia_despacho_objeto`, `comprobante`, `motivo_rechazo` ni `motivo_cancelacion`.

Tres listas que contestan la misma pregunta y dan tres respuestas es como se ve una fuente
unica que nunca se escribio. Aqui esta escrita, y las tres respuestas salen de ella:
`claves_permitidas_en_log()`, `claves_sensibles_en_salida()` y `campos_a_desidentificar()`.

DOS SITIOS, RECONCILIADOS POR UN TEST — NO UNO
----------------------------------------------
(a) `COMMENT ON COLUMN` en Postgres: es lo normativo. Viaja en `pg_dump` y un auditor saca el
    inventario de datos personales con `psql` sobre `information_schema` + `pg_description`,
    sin leer una linea de Python y sin confiar en nosotros. Lo emite `comentario_sql()`.
(b) este modulo: es lo ejecutable, y es lo que el codigo consulta en tiempo de ejecucion.

El test `test_toda_columna_esta_clasificada` es BIDIRECCIONAL: una columna nueva sin clasificar
rompe el build, y una clasificacion que ya no corresponde a ninguna columna tambien. Sin la
segunda direccion la retencion se queda atras del esquema, que es exactamente lo que ya paso:
las columnas `anonimizado_en` existian desde el principio y nadie las escribia
(anonimizacion.py:9-10). Documentar no basta.

[NO VERIFICADO] `CATALOGO_PLATAFORMA` declara las columnas de las tablas de plataforma segun
la doctrina (D-19, D-21, D-22 y §5.5 de la sintesis). `db/0000_plataforma.sql` todavia no
existe en este repo, asi que la correspondencia esta declarada y no comprobada. Cuando el DDL
exista, MANDA EL DDL: el test bidireccional contra `information_schema` es el arbitro, y lo que
haya que corregir se corrige aqui.

POR QUE ESTE MODULO NO IMPORTA NADA DEL DOMINIO
-----------------------------------------------
Lo consultan el middleware de acceso (entrada), el registro de auditoria (salida), el
scheduler de retencion y los jueces j04/j10. Es infraestructura transversal congelada: si
importara dominio, cada app tendria un modulo distinto y volveriamos a las tres listas.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date
from enum import StrEnum
from types import MappingProxyType
from typing import Iterable, Mapping

# ---------------------------------------------------------------------------------------
# Las seis categorias
# ---------------------------------------------------------------------------------------


class Clasificacion(StrEnum):
    """Las seis categorias de catalogos/clasificacion-datos.yaml."""

    DD = "dd"
    """Identificador directo: RUT, nombre completo, correo personal, telefono, direccion,
    fotografia. `en_log: prohibido`, y eso NO es una preferencia estetica: la
    desidentificacion funciona porque el log referencia al ciudadano por una clave sustituta y
    el unico mapeo id -> RUT vive en la tabla del titular. Si el RUT se escribio literal en
    `detalle`, la desidentificacion no desidentifica nada y borrar el log rompe la
    inmutabilidad."""

    CI = "ci"
    """Contacto institucional. SIGUE SIENDO DATO PERSONAL: que el correo sea @conaf.cl no lo
    saca del regimen, porque identifica a una persona natural determinada. Lo que cambia es la
    base de licitud (funciones publicas del cargo) y el riesgo, no la aplicabilidad de la
    ley."""

    DS = "ds"
    """Dato sensible / categoria especial. Si aparece UNA columna ds,
    `datos_personales.categorias_especiales` tiene que ser true en la ficha."""

    DN = "dn"
    """Dato de negocio no personal. ATENCION: `dn` significa "no identifica por si solo",
    nunca "es inocuo". Ver `cuasi_identificador`."""

    TEC = "tec"
    """Dato tecnico. LA IP ES DATO PERSONAL: se clasifica aparte porque su ciclo de vida es
    otro (90 dias en su propia tabla), no porque no lo sea."""

    DPJ = "dpj"
    """Dato de persona juridica. TRAMPA CONOCIDA: el RUT de una EIRL o de una persona natural
    con giro ES el RUT de una persona, y hoy routers/auth.py:544 escribe `rut_institucion` en
    el detalle del log. Clasificar dpj exige poder afirmar que ese RUT nunca es el de una
    persona natural. Ante la duda, dd."""


PERSONALES: frozenset[Clasificacion] = frozenset(
    {Clasificacion.DD, Clasificacion.CI, Clasificacion.DS, Clasificacion.TEC}
)
"""Las cuatro categorias que son dato personal. `tec` esta dentro a proposito: la IP es dato
personal aunque su plazo sea otro."""


class Trato(StrEnum):
    """Que se le hace al valor. Ninguno de los seis produce un dato anonimo por si solo."""

    SUPRESION = "supresion"
    """NULL o literal fijo. NO ES ANONIMIZACION: la guia que CONAF ya adopto
    (COIPO_USUARIOS/anonimacion/anonimizacion-00-indice-casos.md §2) dice que supresion y
    enmascaramiento no mitigan singularizacion, vinculabilidad ni inferencia."""

    HMAC = "hmac_vN"
    """HMAC(sal_de_la_app, valor), versionado y con sal DISTINTA por aplicacion. Con sal comun
    el mismo RUT produce el mismo token en todas las apps de CONAF: un identificador unico de
    facto entre sistemas, que es justo la vinculabilidad que la seudonimizacion debia
    eliminar. LIMITE DECLARADO: la rotacion NO remedia lo pasado — para recalcular haria falta
    el valor en claro, y precisamente no se guarda (core/rut.py:78-85)."""

    MASCARA = "mascara"
    """Control de SALIDA, no de almacenamiento: el dato completo sigue en la base. Enmascarar
    en la salida y llamarlo anonimizacion es el error mas comun del area."""

    TRUNCADO = "truncado"
    """Recorta (IP a /24 o /48, user-agent a familia)."""

    GENERALIZACION = "generalizacion"
    """Sube el valor a una categoria mas amplia. Es el UNICO trato que puede llevar a Caso 4,
    y solo si se declara la tecnica y se verifica el k."""

    CONSERVAR_JUSTIFICADO = "conservar_justificado"
    """El valor sobrevive al plazo por una razon escrita. Exige justificacion no vacia,
    `decidido_en` y `decidido_por`: un conservar_justificado sin justificacion es una excepcion
    sin firma, exactamente lo que este catalogo existe para impedir."""


TRATOS_PERMITIDOS: Mapping[Clasificacion, frozenset[Trato]] = MappingProxyType(
    {
        Clasificacion.DD: frozenset(
            {
                Trato.SUPRESION,
                Trato.HMAC,
                Trato.MASCARA,
                Trato.TRUNCADO,
                Trato.GENERALIZACION,
                Trato.CONSERVAR_JUSTIFICADO,
            }
        ),
        Clasificacion.CI: frozenset(
            {Trato.CONSERVAR_JUSTIFICADO, Trato.MASCARA, Trato.SUPRESION}
        ),
        Clasificacion.DS: frozenset(
            {Trato.SUPRESION, Trato.GENERALIZACION, Trato.CONSERVAR_JUSTIFICADO}
        ),
        Clasificacion.DN: frozenset({Trato.CONSERVAR_JUSTIFICADO, Trato.GENERALIZACION}),
        Clasificacion.TEC: frozenset({Trato.TRUNCADO, Trato.SUPRESION, Trato.GENERALIZACION}),
        Clasificacion.DPJ: frozenset({Trato.CONSERVAR_JUSTIFICADO}),
    }
)


class AccionAlVencer(StrEnum):
    """D-30: la palabra "anonimizacion" queda PROHIBIDA para toda accion que sea supresion de
    columnas. Las tres primeras tienen consecuencia juridica distinta y no son sinonimos."""

    DESIDENTIFICAR = "desidentificar"
    """Caso 3 de la guia adoptada: SIGUE SIENDO DATO PERSONAL. Se mantiene en el RAT, se sigue
    reportando y se sigue notificando en caso de brecha."""

    ANONIMIZAR = "anonimizar"
    """Caso 4. Exige tecnica de generalizacion, k minimo, cuasi-identificadores generalizados y
    evaluacion de reidentificacion. Un RAT que declare Caso 4 sobre un conjunto que es Caso 3
    saca del regimen legal, por escrito y con firma, datos que siguen dentro: es evidencia
    autoincriminatoria producida por el propio CI."""

    ELIMINAR = "eliminar"

    ELIMINAR_OBJETO = "eliminar_objeto"
    """Existe porque hoy el PDF de la guia de despacho NO SE TOCA NUNCA: la fila queda
    "anonimizada" apuntando a un objeto de MinIO que trae el nombre y el RUT dentro."""

    CONSERVAR_JUSTIFICADO = "conservar_justificado"


ACCIONES_QUE_TOCAN_EL_DATO: frozenset[AccionAlVencer] = frozenset(
    {
        AccionAlVencer.DESIDENTIFICAR,
        AccionAlVencer.ANONIMIZAR,
        AccionAlVencer.ELIMINAR,
        AccionAlVencer.ELIMINAR_OBJETO,
    }
)


# ---------------------------------------------------------------------------------------
# El encabezado parseable del COMMENT ON COLUMN
# ---------------------------------------------------------------------------------------

PATRON_RETENCION = re.compile(r"^(\d+[dam]|permanente)$")
"""`90d`, `5a`, `18m` o `permanente`. Un comentario en prosa no se puede consultar; con
encabezado cerrado, el inventario del anexo 02 de la exportacion a Contraloria sale de un
SELECT sobre pg_description."""

PATRON_COMENTARIO = re.compile(
    r"^CLASIF: (?P<clasificacion>dd|ci|ds|dn|tec|dpj) \| "
    r"finalidad=(?P<finalidad>[a-z0-9_]+) \| "
    r"base=(?P<base>[a-z0-9_]+) \| "
    r"retencion=(?P<retencion>\d+[dam]|permanente) \| "
    r"trato=(?P<trato>[a-z0-9_]+)(?P<resto>\s\|\s.*)?$"
)


# ---------------------------------------------------------------------------------------
# Claves prohibidas en el log — lo que j04 verifica con AST
# ---------------------------------------------------------------------------------------

CLAVES_PROHIBIDAS_EN_DETALLE: frozenset[str] = frozenset(
    {
        "rut",
        "correo",
        "email",
        "nombre",
        "apellido",
        "direccion",
        "telefono",
        "nombre_archivo",
        "destinatario",
        "asunto",
        "cuerpo",
    }
)
"""Lista literal de catalogos/clasificacion-datos.yaml. Ninguna de estas claves puede aparecer
en `detalle`, ni en `campos_detalle` de un evento, ni en la allowlist del log de accesos."""

TOKENS_PROHIBIDOS: frozenset[str] = frozenset(
    {"rut", "correo", "email", "nombre", "apellido", "direccion", "telefono"}
)
"""La comprobacion por igualdad exacta NO habria cazado el defecto medido: la fuga real es
`rut_institucion` (routers/auth.py:544), no `rut`. Por eso estas siete se buscan como TOKEN
dentro del nombre en snake_case, y las otras cuatro (`nombre_archivo`, `destinatario`,
`asunto`, `cuerpo`) por igualdad exacta — buscar `archivo` como token prohibiria `archivo` y
`archivos`, que son campos legitimos de `sistema.migracion.ejecutar` y
`exportacion.evidencia.exportar`. Es fail-closed con el minimo de falsos positivos: un
`nombre_region` tambien queda prohibido, y el arreglo es llamarlo `region_id`."""

CLAVES_RETIRADAS: frozenset[str] = frozenset({"entidad_id"})
"""`entidad_id` sale de la allowlist de query params y del detalle: se parte en
`entidad_id_num bigint`. Hoy admin_lista_negra.py:33-42 escribe un RUT COMO entidad_id, y el
middleware lo copia literal a `log_acceso.query`."""


def claves_prohibidas(claves: Iterable[str]) -> frozenset[str]:
    """Devuelve el subconjunto prohibido. Se usa en tres sitios: la validacion de `Evento` al
    importar el catalogo, `registro.py` antes de escribir `detalle`, y el juez j04."""
    return frozenset(clave for clave in claves if clave_prohibida(clave))


def clave_prohibida(clave: str) -> bool:
    nombre = clave.strip().lower()
    if nombre in CLAVES_PROHIBIDAS_EN_DETALLE or nombre in CLAVES_RETIRADAS:
        return True
    return bool(TOKENS_PROHIBIDOS & set(nombre.split("_")))


# ---------------------------------------------------------------------------------------
# La columna
# ---------------------------------------------------------------------------------------


@dataclass(frozen=True, slots=True)
class Columna:
    """Una columna clasificada. Congelada: la clasificacion de un dato no cambia en tiempo de
    ejecucion, y si cambia es un cambio de esquema con su migracion y su RAT."""

    tabla: str
    columna: str
    clasificacion: Clasificacion
    finalidad: str
    base: str
    retencion: str
    trato: Trato
    accion_al_vencer: AccionAlVencer = AccionAlVencer.CONSERVAR_JUSTIFICADO
    justificacion: str = ""
    decidido_en: date | None = None
    decidido_por: str = ""
    cuasi_identificador: bool = False
    """Un `dn` puede volverse identificador POR COMBINACION: comuna + especie poco pedida +
    fecha, en una comuna chica, es UNA SOLA PERSONA. Singularizacion trivial, sin cruzar nada
    externo. Toda salida que declare `anonimizar` tiene que generalizar los marcados aqui."""
    ley: str = ""
    nota: str = ""

    def __post_init__(self) -> None:
        """Valida en construccion. Un catalogo mal escrito revienta al importar el modulo —al
        arrancar la app y en el primer test— y no al vencer el plazo cinco años despues."""
        if not PATRON_RETENCION.fullmatch(self.retencion):
            raise ValueError(
                f"{self.ref}: retencion {self.retencion!r} fuera del patron (90d|5a|18m|permanente)"
            )
        permitidos = TRATOS_PERMITIDOS[self.clasificacion]
        if self.trato not in permitidos:
            raise ValueError(
                f"{self.ref}: trato {self.trato} no permitido para {self.clasificacion} "
                f"(permitidos: {sorted(t.value for t in permitidos)})"
            )
        exige_firma = (
            self.trato is Trato.CONSERVAR_JUSTIFICADO
            or self.accion_al_vencer is AccionAlVencer.CONSERVAR_JUSTIFICADO
        )
        if exige_firma and self.es_dato_personal:
            # Conservar un dato personal mas alla de su plazo es una excepcion, y una
            # excepcion sin firma no es una decision: es una omision. Se exige solo para dato
            # personal porque un `dn` conservado no tiene a quien afectar.
            if not self.justificacion.strip() or self.decidido_en is None:
                raise ValueError(
                    f"{self.ref}: conservar_justificado exige justificacion no vacia y "
                    f"decidido_en con fecha"
                )
        if self.clasificacion is Clasificacion.DS and not self.justificacion.strip():
            # Propio de ds: un dato sensible recogido "por si acaso" no tiene base posible. Si
            # nadie puede escribir para que se usa, la respuesta es no recogerlo.
            raise ValueError(f"{self.ref}: una columna ds exige justificacion de necesidad")

    @property
    def ref(self) -> str:
        return f"{self.tabla}.{self.columna}"

    @property
    def es_dato_personal(self) -> bool:
        return self.clasificacion in PERSONALES

    @property
    def se_toca_al_vencer(self) -> bool:
        return self.accion_al_vencer in ACCIONES_QUE_TOCAN_EL_DATO

    def comentario_sql(self) -> str:
        """El encabezado que va en `COMMENT ON COLUMN`. Es LO NORMATIVO: viaja en pg_dump y se
        lee sin Python. `j10` compara este texto con el que devuelve pg_description."""
        partes = [
            f"CLASIF: {self.clasificacion.value}",
            f"finalidad={self.finalidad}",
            f"base={self.base}",
            f"retencion={self.retencion}",
            f"trato={self.trato.value}",
        ]
        if self.ley:
            partes.append(f"ley={self.ley}")
        if self.accion_al_vencer is not AccionAlVencer.CONSERVAR_JUSTIFICADO:
            partes.append(f"al_vencer={self.accion_al_vencer.value}")
        if self.cuasi_identificador:
            partes.append("cuasi_identificador=si")
        return " | ".join(partes)

    def sentencia_sql(self) -> str:
        comentario = self.comentario_sql().replace("'", "''")
        return f"COMMENT ON COLUMN {self.tabla}.{self.columna} IS\n  '{comentario}';"


def parsear_comentario(texto: str) -> dict[str, str] | None:
    """Lee de vuelta el encabezado. Devuelve None si no lo cumple —lo que para `j10` es un
    hallazgo, no un error: una columna con comentario en prosa es una columna sin clasificar
    para cualquier consulta sobre pg_description."""
    if not texto:
        return None
    coincidencia = PATRON_COMENTARIO.match(" ".join(texto.split()))
    if coincidencia is None:
        return None
    datos = coincidencia.groupdict()
    datos.pop("resto", None)
    return datos


# ---------------------------------------------------------------------------------------
# El catalogo de plataforma
# ---------------------------------------------------------------------------------------
#
# [NO VERIFICADO — reconciliar con db/0000_plataforma.sql cuando exista]
# Estas son las columnas de las tablas congeladas de plataforma, segun D-19, D-21, D-22 y
# §5.5 de la sintesis. El DDL manda: el test bidireccional contra information_schema es el
# arbitro. Se declaran aqui y no en el modulo de la app porque son las mismas en las ocho
# aplicaciones, y porque `test_toda_columna_esta_clasificada` fallaria en la primera app que
# lo corriera si las tablas de plataforma no estuvieran clasificadas.
#
# El plazo de 6 años del estrato `acto` es un criterio operativo de este patron.
# [VERIFICAR con Fiscalia y con las tablas de retencion documental de CONAF / Archivo
# Nacional.] Lo que si esta establecido es la obligacion: la traza de un acto administrativo
# tiene que sobrevivir al periodo en que ese acto puede ser revisado o fiscalizado.

_FIRMA = date(2026, 9, 5)
_QUIEN = "patron coipo_master_produccion"

_LOG_AUDITORIA: tuple[Columna, ...] = (
    Columna(
        tabla="log_auditoria",
        columna="id",
        clasificacion=Clasificacion.DN,
        finalidad="ordenar_e_identificar_la_fila",
        base="cumplimiento_funciones_publicas",
        retencion="6a",
        trato=Trato.CONSERVAR_JUSTIFICADO,
    ),
    Columna(
        tabla="log_auditoria",
        columna="ocurrido_en",
        clasificacion=Clasificacion.DN,
        finalidad="fechar_el_acto_administrativo",
        base="cumplimiento_funciones_publicas",
        retencion="6a",
        trato=Trato.CONSERVAR_JUSTIFICADO,
    ),
    Columna(
        tabla="log_auditoria",
        columna="accion",
        clasificacion=Clasificacion.DN,
        finalidad="identificar_el_evento_del_catalogo",
        base="cumplimiento_funciones_publicas",
        retencion="6a",
        trato=Trato.CONSERVAR_JUSTIFICADO,
        nota="FK real contra catalogo_evento.codigo: la base rechaza un evento inventado",
    ),
    Columna(
        tabla="log_auditoria",
        columna="entidad",
        clasificacion=Clasificacion.DN,
        finalidad="nombrar_la_entidad_afectada",
        base="cumplimiento_funciones_publicas",
        retencion="6a",
        trato=Trato.CONSERVAR_JUSTIFICADO,
    ),
    Columna(
        tabla="log_auditoria",
        columna="entidad_id_num",
        clasificacion=Clasificacion.DN,
        finalidad="identificar_la_fila_afectada",
        base="cumplimiento_funciones_publicas",
        retencion="6a",
        trato=Trato.CONSERVAR_JUSTIFICADO,
        nota=(
            "bigint y no text A PROPOSITO: el tipo es lo que impide repetir "
            "admin_lista_negra.py:33-42, que escribe un RUT como entidad_id"
        ),
    ),
    Columna(
        tabla="log_auditoria",
        columna="actor_funcionario",
        clasificacion=Clasificacion.CI,
        finalidad="acreditar_el_autor_del_acto_administrativo",
        base="cumplimiento_funciones_publicas",
        retencion="6a",
        trato=Trato.CONSERVAR_JUSTIFICADO,
        justificacion=(
            "El acto de un funcionario en ejercicio de su cargo es un acto administrativo y su "
            "traza es lo que pide Contraloria: se conserva, y por eso hace falta el aviso de "
            "privacidad para funcionarios que explica por que no se suprime a peticion. "
            "[VERIFICAR con Fiscalia la base que sostiene esa conservacion]"
        ),
        decidido_en=_FIRMA,
        decidido_por=_QUIEN,
        ley="19628",
    ),
    Columna(
        tabla="log_auditoria",
        columna="actor_ciudadano_id",
        clasificacion=Clasificacion.DN,
        finalidad="referenciar_al_titular_sin_identificarlo",
        base="cumplimiento_funciones_publicas",
        retencion="6a",
        trato=Trato.CONSERVAR_JUSTIFICADO,
        nota=(
            "Clave SUSTITUTA, no dato personal por si sola: el unico mapeo id -> RUT vive en la "
            "tabla del titular. Al anular ese RUT, las filas del log dejan de apuntar a una "
            "persona identificable SIN MODIFICAR UNA SOLA DE ELLAS. Es lo que hace convivir el "
            "log inmutable con el derecho al olvido, y es la razon de existir de este diseño"
        ),
    ),
    Columna(
        tabla="log_auditoria",
        columna="resultado",
        clasificacion=Clasificacion.DN,
        finalidad="distinguir_exito_de_rechazo",
        base="cumplimiento_funciones_publicas",
        retencion="6a",
        trato=Trato.CONSERVAR_JUSTIFICADO,
    ),
    Columna(
        tabla="log_auditoria",
        columna="detalle",
        clasificacion=Clasificacion.DN,
        finalidad="describir_el_acto_con_claves_declaradas",
        base="cumplimiento_funciones_publicas",
        retencion="6a",
        trato=Trato.CONSERVAR_JUSTIFICADO,
        nota=(
            "jsonb con allowlist: solo las claves de Evento.campos_detalle. Que sea `dn` es una "
            "AFIRMACION que registro.py y j04 sostienen, no una descripcion del tipo. El dia "
            "que entre un dd aqui, la desidentificacion deja de funcionar entera"
        ),
    ),
    Columna(
        tabla="log_auditoria",
        columna="valores_previos",
        clasificacion=Clasificacion.DN,
        finalidad="acreditar_que_cambio_en_el_acto",
        base="cumplimiento_funciones_publicas",
        retencion="6a",
        trato=Trato.CONSERVAR_JUSTIFICADO,
        nota=(
            "Los campos personales viajan como '(tenia valor)': la rectificacion se prueba con "
            "'que cambio y cuando', no con 'que decia antes'"
        ),
    ),
    Columna(
        tabla="log_auditoria",
        columna="request_id",
        clasificacion=Clasificacion.TEC,
        finalidad="unir_el_acto_con_la_peticion_http",
        base="cumplimiento_funciones_publicas",
        retencion="6a",
        trato=Trato.SUPRESION,
        accion_al_vencer=AccionAlVencer.ELIMINAR,
        justificacion=(
            "Un `tec` que vive 6 años y no 90 dias, a proposito y con la razon escrita: es el "
            "UNICO puente entre el acto y su peticion HTTP, y sin el no se puede armar el "
            "expediente por request_id del anexo 07 de la exportacion a Contraloria. Es un "
            "UUID aleatorio generado por el servidor —no lleva ni un bit de la persona—, asi "
            "que conservarlo con la fila no conserva ningun dato personal adicional. El trato "
            "es supresion y no conservar_justificado porque al vencer el plazo desaparece con "
            "la fila entera en fn_purgar_log_auditoria: no sobrevive a nada"
        ),
        decidido_en=_FIRMA,
        decidido_por=_QUIEN,
    ),
    Columna(
        tabla="log_auditoria",
        columna="hash_fila",
        clasificacion=Clasificacion.DN,
        finalidad="encadenar_la_fila_con_la_anterior",
        base="cumplimiento_funciones_publicas",
        retencion="6a",
        trato=Trato.CONSERVAR_JUSTIFICADO,
        nota=(
            "Lo calcula la BASE en un trigger BEFORE INSERT, nunca la aplicacion. Si lo calcula "
            "la aplicacion es forjable por la aplicacion, y el test "
            "test_el_hash_lo_calcula_la_base_no_la_aplicacion queda rojo hasta resolverlo"
        ),
    ),
    Columna(
        tabla="log_auditoria",
        columna="hash_previo",
        clasificacion=Clasificacion.DN,
        finalidad="encadenar_la_fila_con_la_anterior",
        base="cumplimiento_funciones_publicas",
        retencion="6a",
        trato=Trato.CONSERVAR_JUSTIFICADO,
    ),
)

_LOG_ACCESO: tuple[Columna, ...] = (
    Columna(
        tabla="log_acceso",
        columna="id",
        clasificacion=Clasificacion.DN,
        finalidad="ordenar_e_identificar_la_fila",
        base="cumplimiento_funciones_publicas",
        retencion="5a",
        trato=Trato.CONSERVAR_JUSTIFICADO,
    ),
    Columna(
        tabla="log_acceso",
        columna="ocurrido_en",
        clasificacion=Clasificacion.DN,
        finalidad="fechar_el_acceso",
        base="cumplimiento_funciones_publicas",
        retencion="5a",
        trato=Trato.CONSERVAR_JUSTIFICADO,
    ),
    Columna(
        tabla="log_acceso",
        columna="request_id",
        clasificacion=Clasificacion.TEC,
        finalidad="unir_el_acceso_con_el_acto",
        base="cumplimiento_funciones_publicas",
        retencion="5a",
        trato=Trato.SUPRESION,
        accion_al_vencer=AccionAlVencer.ELIMINAR,
        justificacion="mismo fundamento que log_auditoria.request_id: es el puente del expediente",
        decidido_en=_FIRMA,
        decidido_por=_QUIEN,
    ),
    Columna(
        tabla="log_acceso",
        columna="metodo",
        clasificacion=Clasificacion.DN,
        finalidad="describir_la_peticion",
        base="cumplimiento_funciones_publicas",
        retencion="5a",
        trato=Trato.CONSERVAR_JUSTIFICADO,
    ),
    Columna(
        tabla="log_acceso",
        columna="ruta",
        clasificacion=Clasificacion.DN,
        finalidad="describir_la_peticion",
        base="cumplimiento_funciones_publicas",
        retencion="5a",
        trato=Trato.CONSERVAR_JUSTIFICADO,
        nota=(
            "Es el PATRON ('/api/v1/solicitudes/{id}'), nunca la URL concreta: "
            "DELETE /api/admin/lista-negra/12345678-9 lleva un RUT en el path"
        ),
    ),
    Columna(
        tabla="log_acceso",
        columna="ruta_params",
        clasificacion=Clasificacion.DN,
        finalidad="diagnosticar_la_peticion",
        base="cumplimiento_funciones_publicas",
        retencion="5a",
        trato=Trato.CONSERVAR_JUSTIFICADO,
        nota="filtrado por allowlist; lo no permitido conserva la clave con valor '<omitido>'",
    ),
    Columna(
        tabla="log_acceso",
        columna="query",
        clasificacion=Clasificacion.DN,
        finalidad="diagnosticar_la_peticion",
        base="cumplimiento_funciones_publicas",
        retencion="5a",
        trato=Trato.CONSERVAR_JUSTIFICADO,
        nota="misma allowlist. Es la lista que hoy incluye entidad_id y por ahi entra el RUT",
    ),
    Columna(
        tabla="log_acceso",
        columna="status_code",
        clasificacion=Clasificacion.DN,
        finalidad="evidenciar_el_control_de_acceso",
        base="cumplimiento_funciones_publicas",
        retencion="5a",
        trato=Trato.CONSERVAR_JUSTIFICADO,
        nota=(
            "El middleware queda por FUERA de ExceptionMiddleware, asi que un 401/403 se ve "
            "como respuesta normal: hay dos registros independientes de cada denegacion"
        ),
    ),
    Columna(
        tabla="log_acceso",
        columna="duracion_ms",
        clasificacion=Clasificacion.DN,
        finalidad="diagnosticar_rendimiento",
        base="cumplimiento_funciones_publicas",
        retencion="5a",
        trato=Trato.CONSERVAR_JUSTIFICADO,
    ),
    Columna(
        tabla="log_acceso",
        columna="ip_red",
        clasificacion=Clasificacion.TEC,
        finalidad="acotar_el_origen_del_acceso",
        base="cumplimiento_funciones_publicas",
        retencion="5a",
        trato=Trato.TRUNCADO,
        # Se declara EXPLICITAMENTE en vez de heredar el defecto, y por eso este
        # archivo importa. Hasta el 2026-09-15 estas dos columnas se quedaban con
        # `accion_al_vencer=CONSERVAR_JUSTIFICADO` por omision; como son dato personal,
        # __post_init__ exigia justificacion firmada, no la habia, y el modulo reventaba
        # con ValueError AL IMPORTARSE — o sea que toda aplicacion sembrada nacia con
        # `app.core.auditoria.clasificacion` y `app.core.auditoria.eventos` sin poder
        # importarse. No lo vio nadie porque el CI solo importaba `app.main`.
        # Se elige ELIMINAR y no una conservacion firmada: al vencer el plazo no se
        # conserva dato personal, y asi no hace falta inventar una justificacion que
        # nadie ha decidido (AGENTS.md, regla 5).
        accion_al_vencer=AccionAlVencer.ELIMINAR,
        nota=(
            "/24 en IPv4 y /48 en IPv6 DESDE EL PRIMER INSERT. La cruda vive en "
            "log_acceso_tecnico con 90 dias, asi que la degradacion es un DELETE en otra tabla "
            "y no un UPDATE sobre el log inmutable — que el trigger prohibe, y con razon"
        ),
    ),
    Columna(
        tabla="log_acceso",
        columna="ua_familia",
        clasificacion=Clasificacion.TEC,
        finalidad="acotar_el_cliente_del_acceso",
        base="cumplimiento_funciones_publicas",
        retencion="5a",
        trato=Trato.TRUNCADO,
        # Mismo caso que `ip_red`, misma decision del 2026-09-15.
        accion_al_vencer=AccionAlVencer.ELIMINAR,
        nota="'Chrome/Windows'. El user-agent completo vive 90 dias en log_acceso_tecnico",
    ),
    Columna(
        tabla="log_acceso",
        columna="actor_funcionario",
        clasificacion=Clasificacion.CI,
        finalidad="acreditar_quien_accedio",
        base="cumplimiento_funciones_publicas",
        retencion="5a",
        trato=Trato.CONSERVAR_JUSTIFICADO,
        justificacion="mismo fundamento que log_auditoria.actor_funcionario: acto en ejercicio del cargo",
        decidido_en=_FIRMA,
        decidido_por=_QUIEN,
    ),
    Columna(
        tabla="log_acceso",
        columna="actor_rol",
        clasificacion=Clasificacion.DN,
        finalidad="evidenciar_el_control_de_acceso",
        base="cumplimiento_funciones_publicas",
        retencion="5a",
        trato=Trato.CONSERVAR_JUSTIFICADO,
    ),
    Columna(
        tabla="log_acceso",
        columna="actor_seudonimo",
        clasificacion=Clasificacion.DD,
        finalidad="agrupar_los_accesos_de_un_titular_sin_identificarlo",
        base="cumplimiento_funciones_publicas",
        retencion="5a",
        trato=Trato.HMAC,
        accion_al_vencer=AccionAlVencer.ELIMINAR,
        nota=(
            "HMAC(sal_log, 'ciudadano:'||id) y NO una FK: 'todos los accesos de esta persona' se "
            "resuelve recomputando el HMAC. Lo que se pierde es el JOIN gratuito, que es "
            "exactamente el objetivo. Sigue siendo dato personal seudonimizado (Caso 3)"
        ),
    ),
)

_LOG_ACCESO_TECNICO: tuple[Columna, ...] = (
    Columna(
        tabla="log_acceso_tecnico",
        columna="id",
        clasificacion=Clasificacion.DN,
        finalidad="ordenar_e_identificar_la_fila",
        base="cumplimiento_funciones_publicas",
        retencion="90d",
        trato=Trato.CONSERVAR_JUSTIFICADO,
        accion_al_vencer=AccionAlVencer.ELIMINAR,
    ),
    Columna(
        tabla="log_acceso_tecnico",
        columna="request_id",
        clasificacion=Clasificacion.TEC,
        finalidad="unir_el_dato_tecnico_con_el_acceso",
        base="cumplimiento_funciones_publicas",
        retencion="90d",
        trato=Trato.SUPRESION,
        accion_al_vencer=AccionAlVencer.ELIMINAR,
    ),
    Columna(
        tabla="log_acceso_tecnico",
        columna="ocurrido_en",
        clasificacion=Clasificacion.DN,
        finalidad="fechar_el_acceso",
        base="cumplimiento_funciones_publicas",
        retencion="90d",
        trato=Trato.CONSERVAR_JUSTIFICADO,
        accion_al_vencer=AccionAlVencer.ELIMINAR,
        nota="indexada: la purga por rango de fecha es un range scan, no un seq scan",
    ),
    Columna(
        tabla="log_acceso_tecnico",
        columna="ip",
        clasificacion=Clasificacion.TEC,
        finalidad="investigar_un_incidente_de_seguridad",
        base="cumplimiento_funciones_publicas",
        retencion="90d",
        trato=Trato.SUPRESION,
        accion_al_vencer=AccionAlVencer.ELIMINAR,
        nota=(
            "IP CRUDA, dato personal. Alto volumen y valor probatorio bajo una vez registrado el "
            "evento: conservarla cinco años es acumular riesgo sin ganar evidencia. Tipo inet: "
            "meterle 'unknown' haria fallar el INSERT y se perderia la fila entera"
        ),
    ),
    Columna(
        tabla="log_acceso_tecnico",
        columna="user_agent",
        clasificacion=Clasificacion.TEC,
        finalidad="investigar_un_incidente_de_seguridad",
        base="cumplimiento_funciones_publicas",
        retencion="90d",
        trato=Trato.SUPRESION,
        accion_al_vencer=AccionAlVencer.ELIMINAR,
        nota="texto libre controlado por el cliente: se trunca para que nadie infle la tabla",
    ),
)

_RETENCION_EJECUCION: tuple[Columna, ...] = tuple(
    Columna(
        tabla="retencion_ejecucion",
        columna=nombre,
        clasificacion=Clasificacion.DN,
        finalidad="probar_que_la_retencion_se_ejecuto",
        base="obligacion_legal",
        retencion="permanente",
        trato=Trato.CONSERVAR_JUSTIFICADO,
    )
    for nombre in (
        "id",
        "job",
        "inicio",
        "fin",
        "filas_afectadas",
        "corte_aplicado",
        "version_del_catalogo",
        "sha256_del_script",
        "resultado",
        "codigo_de_error",
    )
)
"""RET-3: esta tabla NO se purga y no tiene trigger de borrado, y no contiene ni un dato
personal. Hoy el evento de purga se escribe en log_auditoria, que se purga a los 2 años: A LOS
2 AÑOS DESAPARECE LA EVIDENCIA DE QUE LA PURGA OCURRIO, sin que nada falle ni avise. La prueba
de que la retencion corrio no puede vivir en una tabla que se purga a si misma."""

_CATALOGO_EVENTO: tuple[Columna, ...] = tuple(
    Columna(
        tabla="catalogo_evento",
        columna=nombre,
        clasificacion=Clasificacion.DN,
        finalidad="cerrar_el_vocabulario_de_eventos",
        base="cumplimiento_funciones_publicas",
        retencion="permanente",
        trato=Trato.CONSERVAR_JUSTIFICADO,
    )
    for nombre in (
        "codigo",
        "clase",
        "criticidad",
        "retencion",
        "finalidad",
        "base_legal",
        "retirado_en",
    )
)
"""`retirado_en` y no un DELETE: borrar un evento del catalogo rompe la FK de las filas
historicas que lo referencian, que es justo lo que la FK existe para impedir."""

CATALOGO_PLATAFORMA: tuple[Columna, ...] = (
    _CATALOGO_EVENTO + _LOG_AUDITORIA + _LOG_ACCESO + _LOG_ACCESO_TECNICO + _RETENCION_EJECUCION
)

TABLAS_DE_PLATAFORMA: frozenset[str] = frozenset(c.tabla for c in CATALOGO_PLATAFORMA)


# ---------------------------------------------------------------------------------------
# El registro de columnas de la app
# ---------------------------------------------------------------------------------------

_columnas: dict[tuple[str, str], Columna] = {(c.tabla, c.columna): c for c in CATALOGO_PLATAFORMA}


def registrar_columnas(columnas: Iterable[Columna]) -> None:
    """Alta de las columnas de dominio de la app.

    Este modulo esta CONGELADO y las columnas de negocio cambian por app, asi que la app las
    aporta desde `app/composicion/clasificacion_dominio.py`, que se GENERA desde
    `proyecto.coipo.yaml`. La alternativa —que cada app edite este archivo— es como se llega a
    ocho versiones del mismo catalogo, que es el defecto que este patron existe para deshacer.

    Se llama una vez, en el arranque. Re-registrar la MISMA clasificacion es idempotente
    (importar dos veces no puede romper el arranque); registrar una DISTINTA revienta, porque
    dos clasificaciones para la misma columna es exactamente la divergencia que se persigue.
    """
    for columna in columnas:
        clave = (columna.tabla, columna.columna)
        previa = _columnas.get(clave)
        if previa is not None and previa != columna:
            raise ValueError(
                f"{columna.ref} ya estaba clasificada de otra forma: "
                f"{previa.clasificacion}/{previa.trato} vs {columna.clasificacion}/{columna.trato}"
            )
        if columna.tabla in TABLAS_DE_PLATAFORMA and previa is None:
            raise ValueError(
                f"{columna.ref}: las tablas de plataforma estan congeladas. Una columna nueva "
                f"en {columna.tabla} es un cambio de la semilla, no de la app"
            )
        _columnas[clave] = columna


def catalogo() -> Mapping[tuple[str, str], Columna]:
    """Vista de solo lectura: plataforma + dominio. Es lo que compara el test bidireccional
    contra `information_schema`."""
    return MappingProxyType(dict(_columnas))


def columna(tabla: str, nombre: str) -> Columna | None:
    return _columnas.get((tabla, nombre))


# ---------------------------------------------------------------------------------------
# Las cuatro preguntas
# ---------------------------------------------------------------------------------------


def es_pii(nombre: str, *, tabla: str | None = None, desconocido_es_pii: bool = True) -> bool:
    """¿Este campo es dato personal?

    Con `tabla`, responde por la columna exacta. Sin `tabla`, basta que UNA tabla clasifique
    ese nombre como personal para que la respuesta sea si: es la unica forma segura de
    contestar cuando lo que se tiene es la clave de un dict —`valores_previos`, el `detalle` de
    un evento, un query param— y no una columna.

    `desconocido_es_pii=True` por defecto: ANTE LA DUDA, PII. Un nombre que nadie clasifico es
    un campo que nadie miro, y el coste de equivocarse es asimetrico — un `dn` tratado como
    personal se ve feo en un log, un `dd` tratado como `dn` es una fuga permanente en la unica
    tabla que la desidentificacion no puede tocar. Quien pueda afirmar lo contrario lo dice
    explicitamente pasando `desconocido_es_pii=False`.
    """
    if clave_prohibida(nombre):
        return True
    if tabla is not None:
        encontrada = _columnas.get((tabla, nombre))
        if encontrada is None:
            return desconocido_es_pii
        return encontrada.es_dato_personal
    coincidencias = [c for c in _columnas.values() if c.columna == nombre]
    if not coincidencias:
        return desconocido_es_pii
    return any(c.es_dato_personal for c in coincidencias)


def campos_a_desidentificar(tabla: str | None = None) -> Mapping[str, tuple[str, ...]]:
    """Que columnas toca el job de retencion, por tabla.

    Sale del catalogo y no de una lista tecleada: es la tercera de las tres listas divergidas
    —`CAMPOS_SOLICITANTE`/`CAMPOS_SOLICITUD` (anonimizacion.py:40-52)— a la que hoy le faltan
    `guia_despacho_objeto`, `comprobante`, `motivo_rechazo` y `motivo_cancelacion`. Una columna
    nueva entra sola en cuanto se clasifica; ese es el punto entero.

    OJO CON LA PALABRA: esto DESIDENTIFICA (Caso 3). El resultado SIGUE SIENDO DATO PERSONAL,
    se mantiene en el RAT y se sigue notificando en caso de brecha. Solo `anonimizar` con
    generalizacion declarada y `k` verificado produce un dato anonimo.
    """
    por_tabla: dict[str, list[str]] = {}
    for col in _columnas.values():
        if tabla is not None and col.tabla != tabla:
            continue
        if col.es_dato_personal and col.se_toca_al_vencer:
            por_tabla.setdefault(col.tabla, []).append(col.columna)
    return MappingProxyType({t: tuple(sorted(c)) for t, c in por_tabla.items()})


PARAMETROS_TECNICOS: frozenset[str] = frozenset(
    {
        "pagina",
        "por_pagina",
        "limite",
        "offset",
        "ancla",
        "orden",
        "sentido",
        "desde",
        "hasta",
        "anio",
        "mes",
        "estado",
        "resultado",
        "metodo",
        "formato",
        "solo_errores",
    }
)
"""Parametros de paginacion, orden y rango que no nombran a nadie. `sentido` y no `direccion`
a proposito: `direccion` es un token prohibido y el nombre habria quedado bloqueado por su
propio parecido con un domicilio."""


def claves_permitidas_en_log() -> frozenset[str]:
    """Que claves de query string y de path pueden guardar su VALOR en `log_acceso`.

    ALLOWLIST y no denylist: una denylist falla en silencio el dia que alguien agrega un
    parametro nuevo con datos personales, y ese dia ya llego —`entidad_id` esta hoy en la lista
    permitida de middleware_acceso.py:55-80 y por ahi entra el RUT.

    Se DERIVA del catalogo (parametros tecnicos + columnas no personales) en vez de teclearse,
    para que una columna reclasificada como dd salga sola de la allowlist. Lo que no este aqui
    conserva la clave —sirve para diagnostico— con el valor reemplazado por '<omitido>'.
    """
    permitidas = set(PARAMETROS_TECNICOS)
    for col in _columnas.values():
        if not col.es_dato_personal:
            permitidas.add(col.columna)
    return frozenset(c for c in permitidas if not clave_prohibida(c))


def claves_sensibles_en_salida() -> frozenset[str]:
    """Que campos se enmascaran en una respuesta de la API salvo que el rol lo permita.

    Es la segunda lista divergida —`CLAVES_SENSIBLES` (routers/auditoria.py:33-36)— que hoy no
    enmascara `genero`, `discapacidad`, `pueblo_originario` ni `fecha_nacimiento`. Derivada:
    todo `dd`, todo `ds` y todo `tec`. Un `ds` se enmascara SIEMPRE; un `dd` salvo rol
    declarado; un `tec` salvo rol auditor. La politica por categoria la da
    `politica_de_salida()`; esta funcion contesta la pregunta binaria de "¿lo toco?".
    """
    return frozenset(
        col.columna
        for col in _columnas.values()
        if col.clasificacion in (Clasificacion.DD, Clasificacion.DS, Clasificacion.TEC)
    )


POLITICA_DE_SALIDA: Mapping[Clasificacion, str] = MappingProxyType(
    {
        Clasificacion.DD: "enmascarar_salvo_rol_declarado",
        Clasificacion.CI: "visible_para_roles_con_permiso",
        Clasificacion.DS: "enmascarar_siempre",
        Clasificacion.DN: "visible",
        Clasificacion.TEC: "enmascarar_salvo_rol_auditor",
        Clasificacion.DPJ: "visible",
    }
)


def politica_de_salida(clasificacion: Clasificacion) -> str:
    return POLITICA_DE_SALIDA[clasificacion]


def cuasi_identificadores(tabla: str | None = None) -> tuple[str, ...]:
    """Los campos que no identifican solos y si en combinacion. Toda salida que declare
    `anonimizar` tiene que generalizarlos o justificar por escrito por que no hace falta: en
    una comuna chica, una entrega de una especie poco pedida en una fecha dada es una sola
    persona."""
    return tuple(
        sorted(
            c.columna
            for c in _columnas.values()
            if c.cuasi_identificador and (tabla is None or c.tabla == tabla)
        )
    )


K_MINIMO_SALIDA_INSTITUCIONAL = 5
K_MINIMO_TABLERO_INTERNO = 3
"""CRITERIO OPERATIVO PROPIO, NO NORMA. La guia que CONAF adopto dice explicitamente que no
fija `k` (§4.2). Estos dos numeros son de este patron y hay que fijarlos por resolucion;
declararlos como si fueran norma seria inventar norma."""
