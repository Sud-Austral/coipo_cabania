"""Guards de autorizacion. Ningun acceso denegado queda sin rastro.

Adaptador de entrada. Es la unica capa que traduce una decision de autorizacion a un
codigo HTTP, y la unica que sabe que existe `request`.

LAS TRES PIEZAS Y EL FALLO QUE MOTIVA CADA UNA
----------------------------------------------
1. `denegar()` AUDITA todo 403. Sin registro no hay forma de detectar el "acceso
   indebido o escalamiento de privilegios entre roles" que los requisitos declaran
   inaceptable en produccion — y lo que no se detecta, no ocurrio nunca segun el
   expediente. Va por transaccion autonoma porque en un 403 no hay transaccion de
   negocio que sostenga el registro: la peticion se corta antes.

2. `denegar_como_inexistente()` responde 404 con EL MISMO cuerpo que un recurso que no
   existe. `_cargar_o_404` corre ANTES del control de acceso, asi que un 403 en el
   objeto ajeno y un 404 en el inexistente convertian el par en un ORACULO DE
   EXISTENCIA: recorriendo identificadores se deducia cuales existen, o sea que la
   persona con `solicitud_id=1234` esta en el sistema (ataque A-05). El log SI distingue
   los dos casos aunque el cliente no: el 404 existe para no confirmarle nada al
   atacante, no para que el organismo no sepa lo que paso.

3. `ambito_forzado()` devuelve un DICT y no arma el `WHERE`. Es lo que permite que el
   caso de uso lo reciba como argumento y se pruebe sin base de datos (nivel L2), y es
   lo que hace que la mutacion `sesion.ambitos[campo]` -> `request.query_params[campo]`
   muera contra un test en milisegundos en vez de sobrevivir en verde (ataque A-04).

D-19: `detalle` NO ES UN DICT LIBRE
-----------------------------------
Los dos eventos que emite este modulo tienen sus claves DECLARADAS en
`catalogos/eventos.yaml`, y aqui no se pasa ninguna otra:

    autorizacion.endpoint.denegar -> ruta_patron, metodo, rol_efectivo, motivo
    autorizacion.recurso.denegar  -> entidad, entidad_id_num, motivo

Por eso `denegar()` NO acepta `**detalle` arbitrario, a diferencia del `denegar()` que
hoy corre en `COIPO_ENTREGA_PLANTA/backend/app/core/deps.py`. Ese `**detalle` es la
puerta por la que hoy viven en claro un correo de ciudadano, un RUT y el nombre de un
archivo subido en la unica tabla que la desidentificacion a 5 años no puede tocar. Un
parametro que acepta cualquier clave es un parametro que algun dia recibe un RUT.

Se cae tambien `roles_requeridos`, que EP si registraba: no esta declarado en el
catalogo, y ademas es derivable del patron de ruta y del codigo. Lo que hace falta en el
informe es CONTAR denegaciones por motivo, y para eso el motivo cerrado basta.

REGIMEN DEGRADADO (§5.4)
------------------------
Si la escritura del log falla, la operacion SIGUE: el 403 se devuelve igual. Convertir un
403 en 500 le regala al atacante un canal de denegacion de servicio Y un oraculo.
Ademas el 403 ya quedo en `log_acceso` —el middleware de acceso corre por FUERA de
`ExceptionMiddleware`— asi que hay dos registros independientes.
"""

from __future__ import annotations

import logging
from collections.abc import Callable
from enum import StrEnum
from typing import Final, NoReturn

from fastapi import Depends, HTTPException, Request, status

from app.dominio import eventos
from app.dominio.politicas.autorizacion import exige_ambito

from .sesion import Sesion, sesion_actual

logger = logging.getLogger(__name__)

# Donde `composicion/contenedor.py` deja el auditor autonomo. Ver `sesion.ATRIBUTO_APP`
# para el mismo razonamiento.
ATRIBUTO_AUDITOR: Final = "auditor_autonomo"

# El mensaje del 403 es GENERICO: decirle a quien lo recibe que le falta el rol
# `supervisor_regional` le confirma que ese rol existe y que hay algo que ver detras.
DETALLE_NO_AUTORIZADO: Final = "No autorizado"

# El cuerpo del 404, en una constante, porque tiene que ser IDENTICO en los dos caminos:
# el recurso que no existe y el recurso ajeno. Si cada ruta escribe su propio texto, el
# oraculo vuelve por la puerta de atras — dos mensajes distintos son tan distinguibles
# como dos codigos distintos. Las rutas de la aplicacion usan `inexistente()`, no un
# `HTTPException(404, ...)` a mano; `j02` puede comprobarlo con `ast`.
DETALLE_NO_ENCONTRADO: Final = "No encontrado"


class MotivoEndpoint(StrEnum):
    """Valores de `detalle.motivo` para `autorizacion.endpoint.denegar`.

    Copia exacta de `valores_cerrados.motivo` en `catalogos/eventos.yaml`. Cerrados y no
    texto libre porque este campo alimenta `06-denegaciones.csv` de la exportacion a
    Contraloria: sin valores cerrados no hay conteo, y sin conteo no hay informe.

    [PENDIENTE] La reconciliacion enum <-> catalogo la tiene que hacer `j04`. Hoy no
    existe y una divergencia solo se ve cuando la FK de `log_auditoria.accion` rechaza
    el INSERT.
    """

    ROL_INSUFICIENTE = "rol_insuficiente"
    AMBITO_AJENO = "ambito_ajeno"
    ROL_SIN_ASIGNACION = "rol_sin_asignacion"
    SESION_EXPIRADA = "sesion_expirada"


class MotivoRecurso(StrEnum):
    """Valores de `detalle.motivo` para `autorizacion.recurso.denegar`."""

    AMBITO_AJENO = "ambito_ajeno"
    INEXISTENTE = "inexistente"


class AmbitoNoAsignado(Exception):
    """El rol exige un ambito y la sesion no lo trae.

    No deberia ocurrir nunca: el callback de login rechaza con
    `atributo_obligatorio_ausente` antes de emitir la cookie. Existe porque `KeyError`
    dentro de `sesion.ambitos[campo]` seria un 500 mudo, y un 500 mudo en el camino de
    autorizacion es indistinguible de un fallo de la base.

    Se lanza desde `ambito_forzado()`, que es PURA a proposito: sin `Request`, sin
    `HTTPException` y sin auditor, para que la mutacion de la regla de ambito muera
    contra un test de nivel L2 que corre en milisegundos. La traduccion a 403 auditado
    la hace `ambito_forzado_o_denegar()`.
    """

    def __init__(self, campo: str, rol: str) -> None:
        self.campo = campo
        self.rol = rol
        super().__init__(f"el rol '{rol}' exige el ambito '{campo}' y la sesion no lo trae")


# --------------------------------------------------------------------------------
# Auditoria de la denegacion
# --------------------------------------------------------------------------------


def auditor_de(request: Request):
    """El auditor autonomo que dejo `composicion/contenedor.py`, o `None`.

    Devuelve `None` en vez de reventar, al reves que `gestor_de()` en `sesion.py`, y la
    asimetria es deliberada: sin gestor de sesion no hay aplicacion posible y hay que
    verlo en el primer smoke test; sin auditor lo correcto es denegar igual y dejar
    constancia del hueco en el log del contenedor. Un guard que se cae porque la
    auditoria no esta cableada deja el 403 sin responder, que es peor que el 403 sin
    registrar.
    """
    return getattr(request.app.state, ATRIBUTO_AUDITOR, None)


def ruta_patron(request: Request) -> str:
    """El PATRON de la ruta (`/api/v1/solicitudes/{id}`), nunca la URL con el id.

    D-19 lo exige: `entidad_id` esta hoy en la allowlist de query params del middleware
    de acceso, y `GET /api/auditoria?entidad_id=12345678-9` escribe ese RUT literal en
    `log_acceso.query`. La URL concreta de una ruta con path param arrastra el
    identificador al log; el patron no.

    El fallback es un literal y NO `request.url.path`: si la ruta no se resolvio, poner
    la URL cruda es exactamente el fallo que esta funcion evita. Mejor un log que dice
    "no supe la ruta" que un log con un RUT dentro.
    """
    ruta = request.scope.get("route")
    patron = getattr(ruta, "path", None)
    return patron if isinstance(patron, str) and patron else "<ruta no resuelta>"


def _registrar(evento, detalle: dict, *, sesion: Sesion | None, request: Request) -> None:
    """El UNICO punto de este modulo que habla con el puerto de auditoria.

    Aislado en una funcion para que el contrato con `aplicacion/puertos/auditoria.py`
    se ajuste en un solo sitio si cambia, en vez de en cinco llamadas.

    CONTRATO ASUMIDO (reconciliar con el puerto):
        auditor.registrar(evento, resultado=..., actor_funcionario=..., actor_rol=...,
                          detalle=...)
    El primer argumento es un OBJETO `Evento` del catalogo, jamas un literal: `j04`
    recorre el AST y falla si es un `ast.Constant` (cerrojo 1 contra inventar eventos).

    `actor_funcionario` es texto y SE CONSERVA (D-21): el acto de un funcionario en
    ejercicio de su cargo es un acto administrativo. Lo que se desidentifica es
    `actor_ciudadano_id`, que es una FK sustituta y no pasa por aca.

    El `try/except` amplio es DEGRADADO por partida doble: el auditor ya deberia
    absorber su propio fallo y mandarlo al respaldo duradero, y este bloque es el segundo
    cerrojo. Un 403 que se convierte en 500 porque Postgres parpadeo es un canal de
    denegacion de servicio regalado.
    """
    auditor = auditor_de(request)
    if auditor is None:
        logger.error(
            "Acceso denegado SIN auditar (auditor no cableado en app.state.%s): %s %s",
            ATRIBUTO_AUDITOR,
            request.method,
            ruta_patron(request),
        )
        return
    try:
        auditor.registrar(
            evento,
            resultado="rechazado",
            actor_funcionario=sesion.correo if sesion else None,
            actor_rol=sesion.rol if sesion else None,
            detalle=detalle,
        )
    except Exception:  # noqa: BLE001 - ver el docstring: el 403 manda sobre el log
        logger.exception("Fallo el registro de una denegacion; la denegacion se mantiene")


# --------------------------------------------------------------------------------
# Las denegaciones
# --------------------------------------------------------------------------------


def denegar(
    motivo: MotivoEndpoint,
    *,
    request: Request,
    sesion: Sesion | None = None,
) -> NoReturn:
    """403 + registro del intento, centralizado. Nunca vuelve.

    El `motivo` es un valor cerrado (filtrable, contable), no texto libre. El mensaje al
    cliente se mantiene generico para no filtrar la existencia de recursos ni la
    estructura de roles.

    Es la denegacion correcta cuando lo denegado es una CAPACIDAD ("este rol no
    tramita"): ahi el 403 no revela nada y le dice a la persona algo accionable. Cuando
    lo denegado es un OBJETO ajeno de un ciudadano, la respuesta correcta es
    `denegar_como_inexistente()`.
    """
    _registrar(
        eventos.AUTORIZACION_ENDPOINT_DENEGAR,
        {
            "ruta_patron": ruta_patron(request),
            "metodo": request.method,
            "rol_efectivo": sesion.rol if sesion else "",
            "motivo": motivo.value,
        },
        sesion=sesion,
        request=request,
    )
    raise HTTPException(status.HTTP_403_FORBIDDEN, DETALLE_NO_AUTORIZADO)


def inexistente() -> NoReturn:
    """El 404 canonico. TODA ruta que no encuentra un recurso usa esta funcion.

    Existe para que `denegar_como_inexistente()` pueda prometer "el mismo cuerpo que un
    recurso inexistente" y que la promesa sea verificable: si cada ruta escribe su propio
    texto, el oraculo de existencia vuelve por diferencia de mensaje.

    No audita: un 404 de verdad es ruido de alto volumen y ya queda en `log_acceso`.
    """
    raise HTTPException(status.HTTP_404_NOT_FOUND, DETALLE_NO_ENCONTRADO)


def denegar_como_inexistente(
    motivo: MotivoRecurso,
    *,
    request: Request,
    entidad: str,
    entidad_id_num: int | None = None,
    sesion: Sesion | None = None,
) -> NoReturn:
    """404 con el mismo cuerpo que un recurso inexistente. El intento SI se registra.

    SOLO para el acceso de un ciudadano a un OBJETO ajeno. El encargado y el supervisor
    siguen recibiendo 403 con motivo: estan dentro del perimetro, sus accesos se auditan
    igual, y un "no encontrada" sobre una ficha que su compañero de al lado si ve solo
    generaria llamadas a soporte.

    `entidad_id_num` es un ENTERO (D-19). Prohibido pasarle un RUT o un correo: hoy
    `admin_lista_negra.py` escribe un RUT como `entidad_id` y ese RUT vive en la unica
    tabla que la desidentificacion no puede tocar.

    NO se registra `respondido_como: 404` —que EP si escribia— porque no esta declarado
    en `campos_detalle`. El dato no se pierde: el evento es
    `autorizacion.recurso.denegar` con motivo `ambito_ajeno`, y el 404 que vio el cliente
    esta en `log_acceso`. Cruzar dos tablas por `request_id` es exactamente para lo que
    existe ese campo.
    """
    _registrar(
        eventos.AUTORIZACION_RECURSO_DENEGAR,
        {
            "entidad": entidad,
            "entidad_id_num": entidad_id_num,
            "motivo": motivo.value,
        },
        sesion=sesion,
        request=request,
    )
    inexistente()


# --------------------------------------------------------------------------------
# El guard de rol
# --------------------------------------------------------------------------------


def exigir_rol(*roles: str) -> Callable[..., Sesion]:
    """Dependencia parametrizada: solo pasa si el rol de la sesion esta en `roles`.

    Se usa como `dependencies=[Depends(exigir_rol("administrador"))]` en el `APIRouter`,
    no ruta por ruta: un guard por ruta es un guard que se olvida en la ruta nueva, y el
    test de contrato `test_guards.py` comprueba que ninguna ruta quede sin guard salvo
    las de `RUTAS_PUBLICAS`, cada una con su justificacion escrita.

    Los roles se normalizan con `lower()` por la misma razon que en el dominio: el IAM
    no normaliza `roles.name`, asi que un rol creado en el panel como 'Encargado' llega
    con mayuscula.

    Sin argumentos LANZA, en tiempo de importacion. `exigir_rol()` vacio dejaria pasar a
    cualquiera con sesion mientras el codigo aparenta tener un guard puesto: un control
    que parece existir y no existe es peor que la ausencia del control, porque nadie lo
    vuelve a mirar.
    """
    permitidos = frozenset(r.strip().lower() for r in roles if r and r.strip())
    if not permitidos:
        raise ValueError("exigir_rol() necesita al menos un rol: un guard vacio no es un guard")

    def _dep(request: Request, sesion: Sesion = Depends(sesion_actual)) -> Sesion:
        if not sesion.rol:
            # Sesion sin rol: el IAM no le asigno ninguno a esta persona en esta app. Es
            # un motivo distinto de "tiene rol y no le alcanza", y la accion correctiva
            # tambien: aca hay que ir al panel del IAM.
            denegar(MotivoEndpoint.ROL_SIN_ASIGNACION, request=request, sesion=sesion)
        if sesion.rol not in permitidos:
            denegar(MotivoEndpoint.ROL_INSUFICIENTE, request=request, sesion=sesion)
        return sesion

    return _dep


# --------------------------------------------------------------------------------
# El forzado de ambito
# --------------------------------------------------------------------------------


def ambito_forzado(sesion: Sesion) -> dict[str, int]:
    """El filtro lo decide el SERVIDOR, ignorando los query params y el body.

    Devolver un dict y NO armar el `WHERE` aca es lo que permite que el caso de uso lo
    reciba como argumento y se pruebe SIN base de datos. La regla de ambito vive
    entonces en una expresion sobre un argumento visible, no sobre estado ambiental, y
    una mutacion de esa expresion muere contra un test de milisegundos.

    Funcion PURA: no toca `Request`, no lanza `HTTPException`, no audita. Esa pureza es
    el punto — ver `AmbitoNoAsignado`.

    `{}` para un rol sin ambito (administrador, auditor) significa "sin filtro
    adicional", no "sin resultados". Es la unica interpretacion posible y por eso el caso
    de uso hace `**ambito` sobre el filtro, nunca `if ambito:`.
    """
    campo = exige_ambito(sesion.rol)
    if campo is None:
        return {}
    valor = sesion.ambitos.get(campo)
    if valor is None:
        raise AmbitoNoAsignado(campo, sesion.rol)
    return {campo: valor}


def ambito_forzado_o_denegar(sesion: Sesion, request: Request) -> dict[str, int]:
    """`ambito_forzado()` con la traduccion a 403 auditado. Es lo que usan las rutas.

    La separacion en dos funciones no es ceremonia: la de arriba es la que prueban los
    tests de nivel L2 y la que ataca la mutacion `ambito_forzado`; esta solo traduce.
    """
    try:
        return ambito_forzado(sesion)
    except AmbitoNoAsignado:
        denegar(MotivoEndpoint.ROL_SIN_ASIGNACION, request=request, sesion=sesion)
