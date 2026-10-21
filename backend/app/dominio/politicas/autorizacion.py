"""Quién puede qué, y sobre qué ámbito. Función pura: se prueba sin app y sin base.

REGLA QUE ESTE ARCHIVO EXISTE PARA SOSTENER
-------------------------------------------
El filtro de ámbito lo decide el SERVIDOR, ignorando los parámetros de consulta. Un
`?gerencia_id=3` en la URL no puede ampliar lo que un actor ve; a lo sumo puede estrechar
lo que ya podía ver, y eso se resuelve intersectando, nunca sustituyendo.

`ambito_forzado()` devuelve un DICCIONARIO y no arma el `WHERE`. Esa decisión es lo que
permite que el caso de uso reciba el filtro como argumento y se pruebe en L2 sin Postgres:
un filtro que se construye dentro del repositorio solo se puede verificar levantando una
base, y entonces la regla más importante del control de acceso pasa a probarse en el nivel
más lento y más frágil de la pirámide.

LAS DOS TABLAS DE ABAJO SE GENERAN DESDE LA FICHA
-------------------------------------------------
`iam.roles[]` de `proyecto.coipo.yaml` es la fuente única: los mismos nombres de rol que se
teclean en el panel del IAM, los mismos atributos declarados. Editarlas a mano aquí las
desacopla del panel, y el síntoma es un 403 para un usuario que el administrador ve
correctamente configurado. Los valores que vienen abajo son los del EJEMPLO.
"""

from __future__ import annotations

from enum import StrEnum
from typing import Mapping

from app.dominio.errores import RolInsuficiente, SinAsignacionEnElIam
from app.dominio.modelo.identidad import AUSENTE, Actor, Identidad


class Permiso(StrEnum):
    """Cerrado. Un permiso nuevo es un cambio de la ficha y del panel del IAM, no un `if`."""

    LEER_TODO = "leer_todo"
    ESCRIBIR_TODO = "escribir_todo"
    LEER_AMBITO = "leer_ambito"
    ESCRIBIR_AMBITO = "escribir_ambito"
    VER_AUDITORIA = "ver_auditoria"
    EXPORTAR_EVIDENCIA = "exportar_evidencia"


# GENERADO desde iam.roles[].puede — EJEMPLO
PERMISOS_POR_ROL: Mapping[str, frozenset[Permiso]] = {
    "administrador": frozenset({Permiso.LEER_TODO, Permiso.ESCRIBIR_TODO}),
    "encargado_gerencia": frozenset({Permiso.LEER_AMBITO, Permiso.ESCRIBIR_AMBITO}),
    "auditor": frozenset({Permiso.VER_AUDITORIA, Permiso.EXPORTAR_EVIDENCIA}),
}

# GENERADO desde iam.roles[].ambito — EJEMPLO. `None` = sin restricción de ámbito.
#
# El administrador NO aparece con ámbito, y el auditor tampoco: son los dos roles que ven
# todo. Y no pueden ser la misma persona — `COIPO_USUARIOS/backend/models/user_app_role.py:12`
# tiene `UniqueConstraint("user_id", "application_id")`, o sea un usuario tiene EXACTAMENTE
# un rol por aplicación. Esa restricción del IdP es la segregación de funciones que exige la
# exportación de evidencia (el administrador recibe 403 en /cumplimiento/exportacion), y hoy
# no la está usando nadie.
CAMPO_DE_AMBITO_POR_ROL: Mapping[str, str | None] = {
    "administrador": None,
    "encargado_gerencia": "gerencia_id",
    "auditor": None,
}


def exige_ambito(rol: str) -> str | None:
    """El nombre del atributo que acota a este rol, o None si ve todo.

    Un rol desconocido acota a un campo IMPOSIBLE en vez de devolver None. Si devolviera
    None, un rol mal escrito en el panel del IAM —o uno nuevo que nadie añadió aquí— vería
    la base entera. El fallo tiene que caer del lado de no ver nada.
    """
    if rol not in CAMPO_DE_AMBITO_POR_ROL:
        raise RolInsuficiente(f"El rol '{rol}' no está declarado en esta aplicación")
    return CAMPO_DE_AMBITO_POR_ROL[rol]


def ambito_forzado(actor: Actor) -> dict[str, int]:
    """El filtro que el servidor impone. `{}` significa «sin restricción», no «todo vale».

    Se levanta `RolInsuficiente` si el rol exige un ámbito y el actor no lo trae: es la
    diferencia entre «este usuario ve su gerencia» y «este usuario, al que le falta el
    atributo, ve todas». Sin esta rama, un atributo mal configurado en el panel del IAM se
    convierte en un escalamiento de privilegios silencioso.
    """
    campo = exige_ambito(actor.rol)
    if campo is None:
        return {}
    valor = actor.ambitos.get(campo)
    if valor is None:
        raise RolInsuficiente(
            f"El rol '{actor.rol}' exige el atributo '{campo}' y la sesión no lo trae"
        )
    return {campo: valor}


def puede(rol: str, permiso: Permiso) -> bool:
    return permiso in PERMISOS_POR_ROL.get(rol, frozenset())


def exigir(actor: Actor, permiso: Permiso) -> None:
    """Levanta `RolInsuficiente` si el actor no tiene el permiso. No devuelve nada.

    Que no devuelva un booleano es deliberado: `if puede(...)` sin `else` es un control de
    acceso que se olvida, y un guard que devuelve False y se ignora no protege nada.
    """
    if not puede(actor.rol, permiso):
        raise RolInsuficiente(f"El rol '{actor.rol}' no tiene el permiso '{permiso.value}'")


def resolver_rol(identidad: Identidad, *, politica_sin_asignacion: str, rol_de_lectura: str) -> str:
    """Traduce lo que dice el IAM al rol de esta aplicación.

    `politica_sin_asignacion` viene de `iam.rol_sin_asignacion` de la ficha y vale
    `rechazar` o `solo_lectura`. NO tiene default aquí a propósito: elegir por el proyecto
    es decidir su política de acceso desde la plantilla. Una app que trata datos de
    ciudadanos rechaza; un tablero interno puede no hacerlo, y eso lo firma quien manda la app.
    """
    rol = identidad.rol
    if rol and rol in PERMISOS_POR_ROL:
        return rol
    if politica_sin_asignacion == "solo_lectura":
        return rol_de_lectura
    raise SinAsignacionEnElIam()


def ambitos_declarados(identidad: Identidad, declarados: tuple[str, ...]) -> dict[str, int]:
    """Los atributos de ámbito que el IAM SÍ envió y con valor.

    Distingue los tres casos del centinela: AUSENTE (la app no declaró la clave en el panel:
    falla de despliegue), `None` (declarada y sin completar: falla de datos del administrador)
    y valor. Los dos primeros no entran en el diccionario, así que `ambito_forzado()` los ve
    como «falta el atributo» y deniega — que es el lado seguro. Cuál de los dos era se
    registra en `claims_ausentes` del evento de inicio de sesión, que es donde se puede
    investigar sin bloquear a nadie por sorpresa.
    """
    resultado: dict[str, int] = {}
    for clave in declarados:
        valor = identidad.dato(clave)
        if valor is AUSENTE or valor is None:
            continue
        resultado[clave] = int(valor)  # type: ignore[arg-type]
    return resultado
