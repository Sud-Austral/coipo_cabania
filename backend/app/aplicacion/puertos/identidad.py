"""El puerto de identidad: lo unico que la aplicacion sabe del COIPO IAM.

CAPA: aplicacion. Cero imports de fastapi, starlette, sqlalchemy, httpx o
`app.adaptadores` (`j02`). Este archivo describe un CONTRATO; no lo implementa nadie
aca.

EL INVARIANTE BFF, CONVERTIDO EN FIRMA DE TIPO
----------------------------------------------
El `Protocol` NO expone `obtener_token()` A PROPOSITO. El patron BFF exige que el token
del IAM muera dentro del adaptador: se canjea, se usa UNA vez contra `/oauth/userinfo` y
se descarta. Si este `Protocol` tuviera `obtener_token()`, la tentacion de guardarlo en
la sesion existiria y algun dia alguien la tomaria — y ese dia el token del IdP de toda
la flota viajaria en una cookie.

Corolario que el tipo hace cumplir: `IAM_JWT_SECRET` no puede existir en una aplicacion
cliente. El JWT del IAM es HS256 con secreto GLOBAL de la flota y sin claim `aud`
(COIPO_USUARIOS/DEUDA.md R1): tener ese secreto en una app permitiria firmar tokens
validos para CUALQUIER aplicacion de CONAF. `j03` lo verifica sobre el repositorio.

LOS DOS METODOS QUE NO ESTAN, Y POR QUE SU AUSENCIA ES LA DECISION
-----------------------------------------------------------------
- No hay `cerrar_sesion()`: el IAM **no tiene endpoint de logout** (IAM-012). Lo unico
  que esta aplicacion puede cerrar es su propia sesion, y eso lo hace
  `adaptadores/entrada/http/sesion.py`, no un proveedor de identidad.
- No hay `refrescar()`: no hay refresh tokens.

Un metodo que el adaptador real no puede implementar es peor que su ausencia: aparece en
el autocompletado, alguien lo llama, y el `raise NotImplementedError` cae en produccion
dentro del callback de login. La ausencia, en cambio, obliga a resolver el problema
donde se puede resolver.

RIESGO DECLARADO Y NO CERRADO POR ESTE PUERTO (D-12)
----------------------------------------------------
El IAM no tiene logout, ni revocacion, ni refresh, y el patron BFF no lo vuelve a
consultar despues del callback. Con sesion absoluta de 30 dias, **un funcionario
desvinculado conserva acceso hasta 30 dias y ningun componente puede cortarlo**. La
mitigacion (revalidacion periodica contra el IAM, o una lista de revocacion local
consultada por peticion) esta pendiente y vive en `DEUDA.md` de cada aplicacion. La
palanca que si existe hoy es la fila local del usuario: `COIPO_ENTREGA_PLANTA` la
comprueba en CADA peticion por esta misma razon.
"""

from __future__ import annotations

from enum import StrEnum
from typing import Protocol

from app.dominio.modelo.identidad import Identidad


class MotivoDeRechazo(StrEnum):
    """Por que se rechazo un intento de autenticacion.

    Los valores son EXACTAMENTE los de `valores_cerrados.motivo` del evento
    `autenticacion.sesion.rechazar` en `catalogos/eventos.yaml`. Cerrados y no texto
    libre porque este es el campo que se CUENTA en un informe, y contar texto libre no
    se puede.

    [PENDIENTE] Hoy esta lista se mantiene a mano y `j04` deberia reconciliarla contra
    el catalogo. Mientras eso no exista, una divergencia entre este enum y el YAML solo
    se ve cuando la FK de `log_auditoria.accion` rechaza un INSERT en produccion.
    """

    ESTADO_INVALIDO = "estado_invalido"
    ESTADO_EXPIRADO = "estado_expirado"
    ESTADO_REUSADO = "estado_reusado"
    CODIGO_INVALIDO = "codigo_invalido"
    USERINFO_FALLO = "userinfo_fallo"
    ROL_SIN_ASIGNACION = "rol_sin_asignacion"
    ATRIBUTO_OBLIGATORIO_AUSENTE = "atributo_obligatorio_ausente"


class CausaTecnica(StrEnum):
    """Por que fallo la conversacion con el IAM, en vocabulario de operaciones.

    Cerrado y separado de `MotivoDeRechazo` porque responde otra pregunta y va a otro
    sitio: el motivo es evidencia (log de auditoria, informe a Contraloria), la causa es
    diagnostico (log del contenedor, soporte). Confundirlos es como se llega a un
    informe de cumplimiento que cuenta incidencias de red como intentos de acceso
    invalidos.

    Es un enum y no texto libre por la misma razon de siempre: `str(exc)` en un log
    termina arrastrando el cuerpo de la respuesta del IAM, y sus bloques `except`
    devuelven HTML con traceback de Python.
    """

    IAM_INALCANZABLE = "iam_inalcanzable"
    HTTP_INESPERADO = "http_inesperado"
    RESPUESTA_NO_JSON = "respuesta_no_json"
    RESPUESTA_INCOMPLETA = "respuesta_incompleta"
    CONFIGURACION_INCOMPLETA = "configuracion_incompleta"


class ErrorDeIdentidad(Exception):
    """El intento de autenticacion se RECHAZA. Vive en el puerto, no en el adaptador.

    Que el tipo de excepcion viva aca y no junto al cliente HTTP es lo que permite que
    un caso de uso lo capture sin importar `app.adaptadores` — que es exactamente lo que
    `j02` prohibe. El adaptador concreto hereda de esta clase.

    `motivo` es un valor del catalogo cerrado: se escribe tal cual en
    `detalle.motivo` del evento `autenticacion.sesion.rechazar`.

    `causa` es un codigo TECNICO corto (tambien cerrado, ver `CausaTecnica`) que va al
    log del contenedor y NO al log de auditoria: sirve para distinguir en soporte un
    "el IAM devolvio 500" de un "el IAM devolvio HTML". Nunca lleva el cuerpo de la
    respuesta del IAM ni `str(exc)` (D-19).
    """

    def __init__(self, motivo: MotivoDeRechazo, *, causa: str = "") -> None:
        self.motivo = motivo
        self.causa = causa
        super().__init__(f"{motivo.value}({causa})" if causa else motivo.value)


class IamNoDisponible(ErrorDeIdentidad):
    """El IAM no respondio. NO es un rechazo de autenticacion, es una indisponibilidad.

    Existe como clase aparte porque las dos cosas se responden distinto y se cuentan
    distinto:

    - Un rechazo (`ErrorDeIdentidad`) se audita como `autenticacion.sesion.rechazar` y
      devuelve al usuario a la pantalla de login con un motivo.
    - Una indisponibilidad es la vía (b) de D-09: **503 en la ruta afectada**, el resto
      del sitio en pie. Auditarla como "rechazo" con motivo `codigo_invalido` seria
      mentir en el unico registro que la Contraloria puede pedir: el catalogo cerrado
      NO tiene hoy un motivo para "el IAM no contesta", y **inventarlo aqui haria que la
      FK de `catalogo_evento` rechazara el INSERT en produccion, dentro de un manejador
      de errores** — un fallo silencioso encima de otro.

    [PENDIENTE] Proponer a `catalogos/eventos.yaml` el valor `iam_inalcanzable` en
    `autenticacion.sesion.rechazar.valores_cerrados.motivo`. Mientras no exista, esta
    condicion NO se escribe en `log_auditoria`; queda en el log del contenedor y en
    `log_acceso` con el 503, que son dos registros independientes.

    `motivo` se hereda como `USERINFO_FALLO` solo para que el tipo cierre; quien maneja
    la excepcion debe mirar la CLASE, no el motivo.
    """

    def __init__(self, *, causa: str = CausaTecnica.IAM_INALCANZABLE) -> None:
        super().__init__(MotivoDeRechazo.USERINFO_FALLO, causa=causa)


class ProveedorDeIdentidad(Protocol):
    """Lo unico que la aplicacion sabe del COIPO IAM. Tres metodos, ni uno mas.

    Ver el docstring del modulo: la ausencia de `obtener_token()`, `cerrar_sesion()` y
    `refrescar()` es la parte importante de este contrato.
    """

    def url_de_autorizacion(self, *, estado: str, redirect_uri: str) -> str:
        """La URL a la que se manda el navegador para que el IAM autentique.

        `estado` es el anti-CSRF de OAuth. Viaja tambien FIRMADO en una cookie propia y
        se consume con `.pop`, no con `.get`: es de un SOLO uso, pase lo que pase en el
        intento (ataque A-02).
        """
        ...

    def canjear_codigo(self, *, codigo: str, redirect_uri: str) -> str:
        """POST server-to-server contra el IAM. Devuelve el token, que MUERE en el adaptador.

        `redirect_uri` tiene que ser IDENTICA a la enviada a `/authorize`: el IAM la
        compara por igualdad exacta de string. Por eso viaja CONGELADA dentro del estado
        firmado y no se vuelve a deducir del request — deducirla dos veces produce dos
        cadenas distintas en cuanto cambia una cabecera del proxy, y el sintoma es un
        login que falla solo en produccion.

        El valor devuelto es una credencial opaca para quien llama: se pasa a
        `identidad()` y no se guarda en ninguna parte. Lo devuelve en vez de encadenar
        las dos llamadas porque el callback necesita medir el canje por separado
        (`detalle.duracion_canje_ms` de `autenticacion.sesion.completar`) y porque los
        dos pasos fallan por motivos distintos.

        Lanza `ErrorDeIdentidad` (rechazo) o `IamNoDisponible` (503).
        """
        ...

    def identidad(self, credencial: str) -> Identidad:
        """La identidad que el IAM afirma, ya normalizada. UNA sola llamada, en el callback.

        Es la validacion del token SIN tener el secreto global de la flota: se le
        pregunta al emisor. Se paga una vez; despues la sesion es propia y el IAM no se
        vuelve a consultar — que es lo que hace que una caida del IAM no expulse a nadie
        que ya tenga sesion (el requisito de las 8:00).

        Lanza `ErrorDeIdentidad` (rechazo) o `IamNoDisponible` (503).
        """
        ...
