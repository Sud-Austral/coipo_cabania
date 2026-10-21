"""La identidad que el COIPO IAM afirma sobre una persona, ya normalizada.

CAPA: dominio. Cero imports de fastapi, starlette, sqlalchemy, httpx, pydantic u `os`
(`j02` lo verifica con `ast`, no con grep). Todo lo de aca es puro y se prueba en el
nivel L1, en milisegundos y sin servidor.

POR QUE EL CENTINELA `AUSENTE` Y NO `None`
------------------------------------------
Cada aplicacion declara en el panel del IAM que datos extra necesita de sus usuarios
(Aplicaciones -> Datos). El IAM garantiza que **toda clave DECLARADA aparece SIEMPRE** en
la respuesta de `/oauth/userinfo`, con valor `null` si el administrador no la completo.
Por eso "no vino la clave" y "vino con null" NO son el mismo hecho:

    ausente -> esta app todavia NO declaro la clave en el panel del IAM (o el IAM
               desplegado es anterior a la funcionalidad). Es una falla de DESPLIEGUE:
               la corrige un administrador en el panel, no el usuario. Es el puente de
               transicion: mientras dure, el callback puede caer a la fila local y
               auditarlo.
    null    -> la clave esta declarada y el administrador no la completo para ESE
               usuario. Es una falla de DATOS: se rechaza el login de ese usuario, con
               un mensaje que le dice a quien da soporte a quien hay que ir a buscar.

`info.get(clave) is None` colapsa los dos casos y borra el puente. El dia que el IAM
cambie de version, "nadie puede entrar" y "a Juan le falta la gerencia" se veran iguales
en el log, y son incidentes distintos con responsables distintos.

`__bool__` devuelve False A PROPOSITO: `if identidad.dato(x):` no puede parecer verdad.
Un centinela que evalua a verdadero es peor que `None`, porque el error se cuela por el
camino feliz y no hay traza de nada.

EL CONTRATO DEL PAYLOAD (verificado contra COIPO_USUARIOS)
---------------------------------------------------------
    {"sub": "42", "username": "jperez", "email": "juan.perez@conaf.cl",
     "role": "encargado", "app_id": 7,
     "gerencia_id": 12, "region_id": null}     <-- datos DECLARADOS por esta app
"""

from __future__ import annotations

import re
from collections.abc import Iterable, Mapping
from dataclasses import dataclass, field
from enum import StrEnum
from types import MappingProxyType
from typing import Any, Final


class _Ausente:
    """La clave NO viene en el payload. Distinto de venir con `null`.

    Singleton: la comparacion correcta es `valor is AUSENTE`, y por eso las tres
    defensas de abajo no son adorno. Un `copy.deepcopy(identidad)` en un test —o un
    `pickle` entre procesos— que produjera una SEGUNDA instancia dejaria un objeto que
    no es `AUSENTE` ni es `None`: el `is AUSENTE` daria False, el `is None` tambien, y
    el valor se trataria como un dato real. Justo la confusion que este archivo existe
    para impedir.
    """

    __slots__ = ()

    def __bool__(self) -> bool:
        # `if identidad.dato("gerencia_id"):` NO puede parecer verdad.
        return False

    def __repr__(self) -> str:
        # Lo que se ve en un traceback y en un log tiene que nombrar el caso, no
        # `<_Ausente object at 0x...>`, que no le dice nada a quien atiende el incidente.
        return "AUSENTE"

    def __copy__(self) -> _Ausente:
        return self

    def __deepcopy__(self, memo: dict) -> _Ausente:
        return self

    def __reduce__(self) -> tuple:
        return (_recuperar_ausente, ())


def _recuperar_ausente() -> _Ausente:
    """Reconstructor de `pickle`. Devuelve el MISMO objeto, nunca uno nuevo."""
    return AUSENTE


AUSENTE: Final[_Ausente] = _Ausente()


class AtributoInvalido(Exception):
    """Un dato DECLARADO llego con un valor que no es del tipo declarado.

    Deliberadamente NO hereda de `DominioError`: no es una regla de negocio violada por
    quien usa el sistema, es una configuracion rota en el panel del IAM. Mezclarlas
    haria que el mapa `error de dominio -> codigo HTTP` de las rutas tradujera un fallo
    de configuracion a un 4xx dirigido al usuario, que no puede hacer nada al respecto.

    NO guarda el VALOR recibido, solo su tipo. Un atributo mal declarado en el panel
    puede traer cualquier cosa que el administrador haya tecleado —incluido un RUT o un
    correo— y el destino natural de este objeto es una linea de log. D-19: en el log no
    entra PII.
    """

    def __init__(self, clave: str, valor: Any) -> None:
        self.clave = clave
        self.tipo_recibido = type(valor).__name__
        super().__init__(f"el atributo declarado '{clave}' llego como {self.tipo_recibido}")


class AtributoAusente(Exception):
    """Se pidio convertir un atributo que el IAM no envio.

    Separado de `AtributoInvalido` porque la accion correctiva es otra: aca hay que ir
    al panel del IAM y DECLARAR la clave para esta aplicacion; alla hay que corregir el
    tipo o el valor de un usuario concreto.
    """

    def __init__(self, clave: str) -> None:
        self.clave = clave
        super().__init__(
            f"el atributo '{clave}' no viene en el payload del IAM: "
            "esta aplicacion aun no lo declaro en el panel"
        )


def normalizar_rol(valor: Any) -> str:
    """`strip().lower()` sobre el rol que afirma el IAM.

    El IAM no valida ni normaliza nada: `roles.name` es texto libre y sensible a
    mayusculas, asi que un rol creado en el panel como 'Encargado' llega tal cual y no
    hace match contra la tupla de roles de la aplicacion. El sintoma es un login
    EXITOSO que aterriza en una pantalla vacia — indistinguible de un login fallido para
    quien da soporte.

    Por eso el doble de pruebas del IAM devuelve 'Encargado' con mayuscula en al menos
    un payload de fabrica: si el doble es mas amable que el IAM, los tests mienten.
    """
    return str(valor or "").strip().lower()


def normalizar_correo(valor: Any) -> str:
    """`strip().lower()` sobre el correo.

    La parte local de una direccion es sensible a mayusculas segun el RFC 5321, pero
    ningun servidor de CONAF lo es, y el correo se usa como clave para cruzar con la
    fila local del funcionario: sin normalizar, 'Juan.Perez@conaf.cl' y
    'juan.perez@conaf.cl' son dos personas distintas para esta aplicacion.
    """
    return str(valor or "").strip().lower()


def a_entero_declarado(clave: str, valor: Any) -> int | None:
    """Coercion estricta de un dato declarado de tipo `integer`.

    Acepta cadenas numericas A PROPOSITO: el IAM castea **solo al guardar**
    (`application_attribute_service._coerce`) y su `data_type` es editable por PATCH sin
    re-castear lo ya almacenado, asi que un `"12"` donde el tipo declarado dice
    `integer` es un caso NORMAL del contrato, no un error.

    `None` pasa (declarado y sin completar: que hacer con eso lo decide quien llama, no
    esta funcion). Un booleano NO: en Python `True` es `int`, y aceptarlo convertiria un
    campo mal declarado como boolean en "la gerencia 1".

    La conversion se INTENTA en vez de comprobarse con `isdigit()`. Ese guard dejaba
    pasar tres familias de cadenas que `int()` rechaza —doble signo ("--5"), digitos
    Unicode no ASCII (el superindice dos, porque `isdigit()` los acepta) y mas de 4300
    digitos (limite de conversion de Python >= 3.11)— y el `ValueError` resultante era
    un 500 DENTRO del callback de login. Como el `state` ya se consumio a esa altura, el
    reintento del usuario tambien fallaba.
    """
    if valor is AUSENTE:
        raise AtributoAusente(clave)
    if valor is None:
        return None
    if isinstance(valor, bool):
        raise AtributoInvalido(clave, valor)
    if isinstance(valor, int):
        return valor
    if isinstance(valor, str):
        try:
            return int(valor.strip(), 10)
        except ValueError:
            pass
    raise AtributoInvalido(clave, valor)


@dataclass(frozen=True, slots=True)
class Identidad:
    """Lo que el IAM afirma sobre un usuario, normalizado y SIN el token.

    El token del IAM no esta aca y no puede estar: muere dentro del adaptador
    (`adaptadores/salida/iam/cliente_iam.py`). Ver el docstring del puerto
    `ProveedorDeIdentidad`.

    `atributos` contiene EXACTAMENTE las claves que esta aplicacion declaro en el panel
    del IAM, cada una con el valor CRUDO: el valor del payload, `None` si vino en null,
    o `AUSENTE` si la clave no vino. Que esten todas las declaradas y solo las
    declaradas es lo que permite que `claves_ausentes()` sea una respuesta y no una
    conjetura.

    Los valores se guardan CRUDOS y se convierten en `entero()`, no al construir la
    identidad. Es deliberado: `is_required` en el IAM es **por aplicacion, no por rol**,
    asi que el formulario de asignacion muestra las casillas de TODOS los atributos a
    TODOS los usuarios. Convirtiendolos todos por adelantado, un administrador que
    escriba "N/A" en el campo que a ese rol no le aplica dejaria a esa persona sin poder
    entrar, con un error que no le dice nada. Se valida lo que se usa.
    """

    sub: str
    usuario: str
    correo: str
    rol: str
    app_id: int | None
    atributos: Mapping[str, Any]

    def __post_init__(self) -> None:
        # MappingProxyType y no dict: quien construyo la identidad conserva una
        # referencia al dict original, y un `identidad.atributos[k] = v` aguas abajo
        # convertiria un objeto declarado `frozen` en mutable por la puerta de atras.
        object.__setattr__(self, "atributos", MappingProxyType(dict(self.atributos)))

    def dato(self, clave: str) -> Any:
        """Valor crudo del atributo declarado: el valor, `None` o `AUSENTE`.

        `KeyError` si la clave no esta declarada por esta aplicacion, y esta bien que
        reviente: preguntar por un atributo que esta app nunca declaro es un error del
        programador, no una condicion de los datos. Devolver `AUSENTE` ahi haria
        indistinguible "el IAM no lo mando" de "yo nunca lo pedi".
        """
        return self.atributos[clave]

    def entero(self, clave: str) -> int | None:
        """El atributo declarado, como entero. Lanza `AtributoAusente`/`AtributoInvalido`."""
        return a_entero_declarado(clave, self.atributos[clave])

    def claves_ausentes(self) -> tuple[str, ...]:
        """Claves DECLARADAS que el IAM no envio. Falla de DESPLIEGUE.

        Es lo que viaja en `detalle.claims_ausentes` del evento
        `autenticacion.sesion.completar`: son nombres de campo, nunca valores, asi que
        no meten datos personales en la unica tabla que la desidentificacion no puede
        tocar (D-19).
        """
        return tuple(sorted(c for c, v in self.atributos.items() if v is AUSENTE))

    def claves_sin_completar(self) -> tuple[str, ...]:
        """Claves declaradas que vinieron con `null`. Falla de DATOS del administrador."""
        return tuple(sorted(c for c, v in self.atributos.items() if v is None))

    def ambitos(self, claves: Iterable[str]) -> dict[str, int]:
        """Los ambitos que se guardan en la sesion, ya convertidos a entero.

        Se pasan las claves que el ROL en cuestion necesita, no todas: ver el docstring
        de la clase. Lanza `AtributoAusente` o `AtributoInvalido`; un `None` (declarado
        y sin completar) sale como clave AUSENTE del dict resultante, para que quien
        llama decida si eso rechaza el login — la politica
        `rol_sin_asignacion: rechazar | solo_lectura` vive en la ficha del proyecto, no
        aca.
        """
        resultado: dict[str, int] = {}
        for clave in claves:
            valor = self.entero(clave)
            if valor is not None:
                resultado[clave] = valor
        return resultado


# ══════════════════════════════════════════════════════════════════════════════
# QUIEN ACTUA
# ══════════════════════════════════════════════════════════════════════════════
#
# Esta mitad estaba en un SEGUNDO archivo con la misma ruta dentro de
# ESQUELETO/. La semilla traia `dominio/modelo/identidad.py` DOS VECES, con
# contenido distinto, y ninguno de los dos ordenes de copia dejaba un arbol que
# importara: con uno faltaba `Actor` y con el otro faltaban `normalizar_correo`
# y `normalizar_rol`. Los dos pasaban los siete jueces igual, porque ningun
# juez comprobaba que los imports internos resolvieran.
#
# Se detecto el 2026-09-05 y se fusiono aqui: `Identidad` es lo que el IdP
# AFIRMA sobre una persona, `Actor` es lo que el LOG conserva de ella, y son
# deliberadamente distintos. Ver el docstring de `Actor`.
#
# La fusion del 2026-09-05 quedo A MEDIAS: se trajo tambien la `Identidad` de la
# otra mitad (sub, correo, rol, atributos) y quedo definida DOS veces en este
# archivo. Python se queda con la ultima, y `cliente_iam.py` construye la primera
# (con `usuario` y `app_id`): TypeError en el callback del primer login real. Se
# borro la segunda el 2026-09-15; la de arriba ya tenia `dato()` y
# `claves_ausentes()`. Lo caza `tests/contrato/test_la_semilla_importa.py`, que
# ejecuta el mapeo en vez de leerlo.

class TipoDeActor(StrEnum):
    """Cerrado. Cada valor tiene un régimen de conservación distinto (D-21)."""

    FUNCIONARIO = "funcionario"  # su identificador SE CONSERVA: el acto es público
    CIUDADANO = "ciudadano"      # llave sustituta, desidentificable
    SISTEMA = "sistema"          # scheduler, migraciones, jobs: no hay persona detrás


# Formato del RUT chileno, con o sin puntos, con guion y dígito verificador.
# Existe para PROHIBIRLO como identificador de actor, no para validarlo: ver `Actor`.
_PINTA_DE_RUT = re.compile(r"^\s*\d{1,3}(\.?\d{3})*-[\dkK]\s*$")


@dataclass(frozen=True, slots=True)
class Actor:
    """Quién ejecuta el caso de uso. Es lo que se escribe en el log.

    `identificador`:
      * FUNCIONARIO -> su correo institucional. SE CONSERVA los 6 años del acto.
      * CIUDADANO   -> la llave sustituta (el id de su fila), NUNCA su RUT ni su correo.
      * SISTEMA     -> el nombre del proceso (`scheduler.retencion`, `bootstrap`).

    La comprobación de abajo es el único punto donde el dominio se pone duro con un formato,
    y está fundada: `COIPO_ENTREGA_PLANTA/backend/app/routers/admin_lista_negra.py:33-42`
    escribe hoy un RUT como `entidad_id` del log inmutable. Un RUT ahí no lo borra la
    desidentificación (que solo anula la columna de la tabla del titular) y no lo puede
    borrar nadie más, porque el trigger prohíbe el UPDATE — con razón. La única defensa que
    funciona es que ese valor no llegue nunca.
    """

    tipo: TipoDeActor
    identificador: str
    rol: str
    ambitos: Mapping[str, int] = field(default_factory=lambda: MappingProxyType({}))

    def __post_init__(self) -> None:
        if not self.identificador:
            raise ValueError("un Actor sin identificador no puede quedar registrado en el log")
        if self.tipo is TipoDeActor.CIUDADANO and _PINTA_DE_RUT.match(self.identificador):
            raise ValueError(
                "el identificador de un actor ciudadano no puede ser un RUT: tiene que ser la "
                "llave sustituta de su fila. Con el RUT literal, la desidentificación a 5 años "
                "deja de desidentificar el log y no hay forma de corregirlo después "
                "(el UPDATE sobre log_auditoria lo prohíbe un trigger)"
            )

    @property
    def es_sistema(self) -> bool:
        return self.tipo is TipoDeActor.SISTEMA


def actor_del_sistema(proceso: str) -> Actor:
    """El actor de un job del scheduler o del arranque.

    Existe como función y no como constante porque el `proceso` tiene que aparecer en el
    log: «lo hizo el sistema» sin decir qué proceso es una fila que no sirve para investigar
    nada, y es exactamente lo que hoy se encuentra en las tablas de la flota.
    """
    return Actor(tipo=TipoDeActor.SISTEMA, identificador=proceso, rol="sistema")
