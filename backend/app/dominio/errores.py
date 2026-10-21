"""Errores de negocio. CERO imports de fastapi, starlette, sqlalchemy, httpx, pydantic u os.

PUNTO DE PARTIDA MEDIDO
-----------------------
Esto generaliza `COIPO_ENTREGA_PLANTA/backend/app/services/errors.py`, que ya tiene 13
subclases y que NO importa FastAPI A PROPÓSITO: `grep -l fastapi backend/app/services/*.py`
devuelve 0 de 20 archivos en ese repositorio. Es la única capa de la flota que hoy ya
cumple la regla de dependencias, y por eso se toma tal cual y solo se le añaden dos cosas
que allí faltaban: la `Familia` y el `codigo`.

POR QUÉ `familia` Y NO UN CÓDIGO HTTP
-------------------------------------
Un `status_code = 409` en esta clase sería un import de HTTP disfrazado: obligaría al
dominio a saber que existe un protocolo de transporte, y el día que el mismo error viaje
por una tarea del scheduler (donde no hay petición ni respuesta) el número no significa
nada. La traducción familia -> código HTTP vive en un solo sitio,
`adaptadores/entrada/http/errores_http.py` (semilla CONGELADO), que es también el único
lugar donde se decide que AMBITO_AJENO se responde como 404 y no como 403.

POR QUÉ `codigo`
----------------
Es el contrato con el cliente. El frontend hace `switch` sobre `codigo`, jamás sobre el
mensaje: cambiar la redacción de un mensaje para que se entienda mejor no puede romper una
pantalla. Es snake_case, ASCII y estable; si hay que cambiarlo, es un cambio de API.

REGLA DURA SOBRE EL MENSAJE: NADA DE DATOS PERSONALES
-----------------------------------------------------
El mensaje termina en tres sitios que no controla quien lo escribe: la respuesta HTTP, el
log del contenedor y —cuando alguien lo mete en `detalle`— la tabla `log_auditoria`, que
es la única que la desidentificación a 5 años no puede tocar. Es exactamente la fuga que
D-19 documenta con archivo y línea (`services/correo_service.py:548` escribe el correo del
ciudadano; `routers/auth.py:544` escribe un RUT). Por eso: nombres de catálogo sí (una
especie, un vivero, un estado), identificadores de persona NO.
"""

from enum import StrEnum


class Familia(StrEnum):
    """Cómo se comporta el error, no qué código HTTP le toca.

    La lista es CERRADA y corta a propósito: en cuanto tenga veinte valores, elegir entre
    dos parecidos se vuelve arbitrario y el mapeo del borde deja de ser una decisión para
    convertirse en una tabla que nadie mira.
    """

    VALIDACION = "validacion"        # la petición está mal formada o el valor no es del catálogo
    ESTADO = "estado"                # la entidad no admite esa transición ahora mismo
    AUTORIZACION = "autorizacion"    # el actor no puede; el borde decide si 403 o 404
    NO_ENCONTRADO = "no_encontrado"  # no existe (o el borde lo hace parecer inexistente)
    CONFLICTO = "conflicto"          # dos escrituras compitiendo, o un duplicado
    LIMITE = "limite"                # un tope de negocio declarado en la ficha
    DEPENDENCIA = "dependencia"      # algo de fuera no responde; se reintenta más tarde


class DominioError(Exception):
    """Base de todo error de negocio.

    `codigo` y `familia` son atributos de CLASE: se leen sin instanciar, lo que permite que
    un test recorra las subclases y verifique que no hay dos códigos repetidos, y que el
    juez j02 pueda comprobar el catálogo de errores sin importar el módulo.
    """

    codigo: str = "error_de_dominio"
    familia: Familia = Familia.VALIDACION

    def __init__(self, mensaje: str = "", **contexto: object) -> None:
        # `contexto` es lo que el borde puede usar para armar la respuesta (por ejemplo, el
        # estado actual y las acciones válidas). NO es el `detalle` de auditoría: quien
        # registra el evento decide, contra `evento.campos_detalle`, qué claves puede
        # escribir. Que sean dos cosas distintas es lo que impide que un error acabe metiendo
        # en el log inmutable una clave que nadie declaró.
        self.contexto = contexto
        super().__init__(mensaje or self.__class__.__doc__ or self.codigo)


# --------------------------------------------------------------------------- validación
class DatoInvalido(DominioError):
    """Un valor no cumple una regla del negocio (no una regla de forma: eso lo corta pydantic)."""

    codigo = "dato_invalido"
    familia = Familia.VALIDACION


class CampoObligatorioAusente(DominioError):
    """Falta un dato que el negocio exige en este camino concreto.

    Distinto de la validación de esquema: aquí el campo es opcional para la API y
    obligatorio para ESTE caso (por ejemplo, los datos de la entidad jurídica solo cuando no
    hay convenio). Ponerlo como obligatorio en el esquema rompería los otros caminos.
    """

    codigo = "campo_obligatorio_ausente"
    familia = Familia.VALIDACION

    def __init__(self, campo: str, motivo: str = "") -> None:
        self.campo = campo
        super().__init__(f"Falta el campo obligatorio '{campo}'" + (f": {motivo}" if motivo else ""))


class ValorFueraDeCatalogo(DominioError):
    """El valor no está en un catálogo cerrado (una comuna, una especie, un estado).

    El nombre del catálogo viaja en el mensaje; el valor recibido NO, porque puede venir de
    un formulario público y acabar copiado en un log.
    """

    codigo = "valor_fuera_de_catalogo"
    familia = Familia.VALIDACION

    def __init__(self, catalogo: str) -> None:
        self.catalogo = catalogo
        super().__init__(f"El valor no pertenece al catálogo '{catalogo}'")


# ------------------------------------------------------------------------------- estado
class TransicionInvalida(DominioError):
    """No se puede hacer esa acción desde el estado actual.

    Se conserva la firma de `COIPO_ENTREGA_PLANTA/backend/app/services/errors.py`: el
    mensaje enumera las acciones válidas porque sin esa lista el funcionario ve «no se
    puede» y llama por teléfono. La lista sale de la máquina de estados, no se teclea.
    """

    codigo = "transicion_invalida"
    familia = Familia.ESTADO

    def __init__(self, estado_actual: str, acciones_validas: list[str]) -> None:
        self.estado_actual = estado_actual
        self.acciones_validas = acciones_validas
        super().__init__(
            f"No se puede realizar esa acción desde el estado '{estado_actual}' "
            f"(acciones válidas: {', '.join(acciones_validas) or 'ninguna'})"
        )


class OperacionYaAplicada(DominioError):
    """La operación ya se aplicó antes con la misma llave de idempotencia.

    NO es un error del usuario: es la respuesta correcta a un doble clic o a un reintento
    del cliente. El borde la traduce a la MISMA respuesta que la primera vez; existe como
    excepción para que el caso de uso no siga y escriba un segundo evento de auditoría del
    mismo acto administrativo.
    """

    codigo = "operacion_ya_aplicada"
    familia = Familia.ESTADO


# ------------------------------------------------------------------------ no encontrado
class RecursoInexistente(DominioError):
    """La entidad no existe. `entidad` es el NOMBRE del tipo, nunca el identificador."""

    codigo = "recurso_inexistente"
    familia = Familia.NO_ENCONTRADO

    def __init__(self, entidad: str) -> None:
        self.entidad = entidad
        super().__init__(f"No existe {entidad}")


# -------------------------------------------------------------------------- autorización
class AmbitoAjeno(DominioError):
    """El recurso existe pero pertenece a otro ámbito (otra gerencia, otra región).

    El BORDE responde 404 y no 403 (`denegar_como_inexistente`): un 403 le confirma al
    atacante que el recurso existe. Pero el LOG sí distingue las dos cosas —
    `autorizacion.recurso.denegar` con `motivo=ambito_ajeno` frente a `motivo=inexistente`—
    porque el 404 existe para no informar al atacante, no para que el organismo no sepa qué
    pasó. Esa asimetría es la razón de que esta clase exista separada de `RecursoInexistente`.
    """

    codigo = "ambito_ajeno"
    familia = Familia.AUTORIZACION


class RolInsuficiente(DominioError):
    """El rol del actor no incluye este permiso."""

    codigo = "rol_insuficiente"
    familia = Familia.AUTORIZACION


class SinAsignacionEnElIam(DominioError):
    """El actor se autenticó pero el IAM no le declara rol para esta aplicación.

    Qué hacer con esto NO se decide aquí: lo dice `iam.rol_sin_asignacion` de la ficha
    (`rechazar` o `solo_lectura`) y NO tiene default implícito. Una app que trata datos de
    ciudadanos rechaza; un tablero interno de solo lectura puede no hacerlo. Elegir por
    ellas desde el dominio sería decidir una política de acceso en el sitio equivocado.
    """

    codigo = "sin_asignacion"
    familia = Familia.AUTORIZACION


# ---------------------------------------------------------------------------- conflicto
class ConflictoDeConcurrencia(DominioError):
    """Otra transacción cambió la fila entre que se leyó y que se iba a escribir.

    El adaptador de Postgres traduce aquí el pgcode 40001 (serialization_failure) y el
    40P01 (deadlock_detected). Se separa de `DuplicadoNoPermitido` porque este SÍ se puede
    reintentar tal cual y aquel no.
    """

    codigo = "conflicto_de_concurrencia"
    familia = Familia.CONFLICTO


class DuplicadoNoPermitido(DominioError):
    """Ya existe una fila con esa llave única (pgcode 23505).

    `restriccion` es el NOMBRE de la restricción de la base, no el valor duplicado: si el
    valor fuera un RUT o un correo, el mensaje lo llevaría al log del contenedor, fuera de
    la retención y de la desidentificación (D-18, la misma razón de `hide_parameters=True`).
    """

    codigo = "duplicado_no_permitido"
    familia = Familia.CONFLICTO

    def __init__(self, restriccion: str) -> None:
        self.restriccion = restriccion
        super().__init__(f"Ya existe un registro con ese valor ({restriccion})")


# ------------------------------------------------------------------------------- límite
class LimiteExcedido(DominioError):
    """Un tope declarado en la ficha del proyecto (unidades, solicitudes al año, UTM).

    El tope y lo solicitado viajan en el mensaje porque son datos del propio solicitante y
    sin ellos el mensaje es inútil («excede el límite» no dice cuánto queda).
    """

    codigo = "limite_excedido"
    familia = Familia.LIMITE

    def __init__(self, limite: str, tope: float | int, solicitado: float | int) -> None:
        self.limite = limite
        self.tope = tope
        self.solicitado = solicitado
        super().__init__(f"Se excede el límite de {limite}: tope {tope}, solicitado {solicitado}")


# --------------------------------------------------------------------------- dependencia
class DependenciaNoDisponible(DominioError):
    """Un sistema de fuera no responde (IAM, correo, almacenamiento de archivos).

    El borde responde 503 con `Retry-After`. `dependencia` es un identificador CERRADO
    (`iam`, `correo`, `archivos`), no el mensaje de la excepción original: `str(exc)` está
    prohibido en el detalle de auditoría (D-19) porque el de SMTP incluye el destinatario.
    """

    codigo = "dependencia_no_disponible"
    familia = Familia.DEPENDENCIA

    def __init__(self, dependencia: str) -> None:
        self.dependencia = dependencia
        super().__init__(f"El servicio '{dependencia}' no está disponible en este momento")


class AuditoriaNoDisponible(DominioError):
    """No se pudo registrar un evento de régimen CRÍTICO, así que la operación NO se ejecuta.

    Es el único error de esta lista que no lo levanta una regla de negocio sino la
    imposibilidad de dejar rastro. Existe porque el régimen CRÍTICO (exportación,
    emergencia, administración, y lectura de datos personales de más de un titular) exige
    que no haya operación sin registro: si no se puede escribir el log, la respuesta
    correcta es 503, no seguir adelante y perder la evidencia.
    """

    codigo = "auditoria_no_disponible"
    familia = Familia.DEPENDENCIA
