"""Cliente del COIPO IAM (repo COIPO_USUARIOS) — patron BFF. Adaptador de salida.

UNIFICACION
-----------
Este archivo reemplaza a los DOS que hoy corren en produccion:

    COIPO_ENTREGA_PLANTA/backend/app/services/iam_service.py   (270 lineas)
    coipo_prensa2/backend/app/servicios/iam.py                 (122 lineas)

209 lineas de diff entre ellos y ~60 identicas, para el mismo protocolo contra el mismo
servidor. De cada uno se conservo lo mejor:

  de ENTREGA_PLANTA -> `_describir`, `.rstrip("/")` sobre la URL base (sin el, un
                       `IAM_URL` con barra final produce `//oauth/token` y el IAM
                       responde 404), la construccion de la URL de autorizacion, la
                       coercion estricta de atributos declarados y la distincion
                       ausente/null.
  de prensa2        -> el modulo concentrado y sin estado, la nota de por que el cliente
                       vive solo dentro del callback, y el estilo sincrono.

Lo que NO se copio de ninguno: la lectura directa de un modulo `config`/`settings`. Un
adaptador que importa la configuracion global no se puede construir dos veces en un test
con dos URLs distintas. Aca la configuracion entra por el constructor y la arma
`composicion/contenedor.py`, que es la unica capa que conoce a todos.

UNICO modulo del backend que habla con el IAM, y solo se usa dentro del callback de
login. Esa concentracion es deliberada y es lo que sostiene el requisito de que la
pagina este arriba a las 8:00: fuera del callback, ninguna peticion de esta aplicacion
depende de que el IAM responda.

El navegador NUNCA ve el JWT del IAM: se canjea aca, se usa una sola vez contra
`GET /oauth/userinfo` y se descarta. Lo unico que sale al navegador es la cookie de
sesion firmada de esta aplicacion (`adaptadores/entrada/http/sesion.py`).

Estilo SINCRONO (`def`, no `async def`), como el resto de los adaptadores (D-13):
FastAPI despacha los endpoints `def` al threadpool de anyio, asi que este httpx
bloqueante no frena el event loop. Un `async def` con cliente sincrono dentro si lo
frenaria, y el sintoma —"la app va lenta a ratos"— no lo diagnostica nadie.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any
from urllib.parse import urlencode

import httpx

from app.adaptadores.salida.iam.mapeo_claims import a_identidad
from app.aplicacion.puertos.identidad import (
    CausaTecnica,
    ErrorDeIdentidad,
    IamNoDisponible,
    MotivoDeRechazo,
)
from app.dominio.modelo.identidad import Identidad

logger = logging.getLogger(__name__)


@dataclass(frozen=True, slots=True)
class AjustesIam:
    """Lo que el cliente necesita saber. Lo llena `composicion/contenedor.py`.

    `claves_declaradas` son los nombres de los datos extra que esta aplicacion declaro
    en el panel del IAM (Aplicaciones -> Datos). Los NOMBRES tienen que coincidir
    caracter por caracter con lo declarado alla, y ninguno puede chocar con la lista de
    nombres reservados del IAM (sub, exp, iat, iss, aud, nbf, jti, username, email,
    app_id, role, type, scope). Salen de la ficha del proyecto
    (`iam.atributos_declarados`), no del codigo: `GET /api/v1/admin/iam/contrato` imprime
    que hay que teclear en el panel, caracter por caracter.

    Que la lista este AQUI y no dispersa en constantes por modulo es lo que permite que
    `Identidad.claves_ausentes()` responda "esta app declaro X, Y, Z y el IAM no mando
    Y" — y eso es un diagnostico, no una conjetura.
    """

    url: str
    client_id: str
    client_secret: str
    timeout_segundos: float = 10.0
    claves_declaradas: tuple[str, ...] = field(default=())

    @property
    def base(self) -> str:
        # rstrip("/") y no confiar en el .env: `IAM_URL=https://iam.conaf.cl/` es lo que
        # teclea cualquiera, y produce `//oauth/token`, que el IAM responde con 404 y sin
        # ninguna pista en el mensaje.
        return (self.url or "").rstrip("/")

    @property
    def completo(self) -> bool:
        return bool(self.base and self.client_id and self.client_secret)


def _describir(exc: BaseException) -> str:
    """Descripcion util de una excepcion de httpx.

    Varias (`ConnectError`, `ConnectTimeout`) traen `str()` VACIO: toda la informacion
    esta en el TIPO y en la causa encadenada. Loguear solo `str(exc)` deja una linea que
    no dice nada — ya paso en produccion en COIPO_APPTEST, donde el log del incidente
    era literalmente `IAM inalcanzable: `.

    Se recorre `__cause__`/`__context__` con un tope de 4 saltos: sin tope, una cadena
    de excepciones larga escribe kilobytes por linea en el log del contenedor.
    """
    partes: list[str] = []
    actual: BaseException | None = exc
    vistas = 0
    while actual is not None and vistas < 4:
        mensaje = str(actual).strip()
        partes.append(f"{type(actual).__name__}: {mensaje}" if mensaje else type(actual).__name__)
        actual = actual.__cause__ or actual.__context__
        vistas += 1
    return " <- ".join(partes)


class ClienteIam:
    """Implementa `ProveedorDeIdentidad`. No lo hereda a proposito.

    Heredar del `Protocol` daria una comprobacion en tiempo de importacion, pero tambien
    invitaria a añadir metodos "porque el padre los tiene". La conformidad se comprueba
    donde importa: en `composicion/contenedor.py` la anotacion de tipo es
    `ProveedorDeIdentidad`, y `j03` verifica sobre el AST que este adaptador no exponga
    ningun metodo publico que devuelva el token.
    """

    def __init__(self, ajustes: AjustesIam) -> None:
        self.ajustes = ajustes

    # ------------------------------------------------------------------ transporte

    def _cliente(self) -> httpx.Client:
        """Un cliente nuevo por llamada, con timeouts granulares y CORTOS.

        Timeouts separados y no uno global: un IAM colgado no puede quedarse con un hilo
        del threadpool de anyio indefinidamente, y el que se agota primero dice donde
        esta el problema (conectar != leer). El de lectura es el configurable porque es
        el unico que depende de cuanto tarda el IAM en resolver, y los otros tres son
        red local.

        `follow_redirects=False`: si el IAM esta mal desplegado y `/oauth/token`
        responde un 302 a su pantalla de login, seguirlo devolveria un HTML con codigo
        200 que fallaria al parsear como JSON. El diagnostico seria "respuesta invalida"
        cuando el problema real es "el IAM no esta donde crees". Sin redirecciones, el
        302 se ve como 302.

        Cliente por llamada y no uno compartido: son DOS peticiones por login y ninguna
        mas. Un `httpx.Client` de larga vida guardado en el modulo se comparte entre los
        hilos del threadpool y sobrevive a un `fork` de uvicorn con los sockets abiertos;
        el ahorro de un handshake por login no paga ese riesgo.
        """
        return httpx.Client(
            timeout=httpx.Timeout(
                connect=5.0,
                read=self.ajustes.timeout_segundos,
                write=5.0,
                pool=5.0,
            ),
            follow_redirects=False,
        )

    def _exigir_configuracion(self) -> None:
        """Falla CERRADO si falta el client_id o el secreto.

        Sin esto, la peticion sale con `client_id=""` y el IAM responde 400: el log
        diria "el IAM rechazo el canje del codigo" y el problema real seria un `.env`
        incompleto en el servidor. Es la via (b) de D-09: 503 en la ruta afectada, el
        resto del sitio en pie. No aborta el arranque: el reusable de despliegue hace
        `rsync --delete` y luego `up -d`, sin rollback, asi que un arranque abortado no
        es un despliegue detenido, es la app caida con el arbol anterior ya borrado.
        """
        if not self.ajustes.completo:
            logger.error(
                "Configuracion del IAM incompleta: url=%s client_id=%s client_secret=%s",
                "si" if self.ajustes.base else "FALTA",
                "si" if self.ajustes.client_id else "FALTA",
                "si" if self.ajustes.client_secret else "FALTA",
            )
            raise IamNoDisponible(causa=CausaTecnica.CONFIGURACION_INCOMPLETA)

    # ------------------------------------------------------------------ el puerto

    def url_de_autorizacion(self, *, estado: str, redirect_uri: str) -> str:
        """La URL del navegador hacia `/oauth/authorize`.

        `urlencode` y no una f-string: la `redirect_uri` lleva `://` y `/`, y una
        f-string dejaria pasar cualquier cosa que se colara en el destino. El
        `client_secret` NO viaja aca — esta URL la ve el usuario.
        """
        parametros = urlencode(
            {
                "client_id": self.ajustes.client_id,
                "redirect_uri": redirect_uri,
                "response_type": "code",
                "state": estado,
            }
        )
        return f"{self.ajustes.base}/oauth/authorize?{parametros}"

    def canjear_codigo(self, *, codigo: str, redirect_uri: str) -> str:
        """POST /oauth/token, server-to-server. El `client_secret` nunca sale de aca.

        `redirect_uri` debe ser IDENTICA a la enviada a `/authorize`: el IAM la compara
        por igualdad exacta de string. Viene congelada dentro del estado firmado.
        """
        self._exigir_configuracion()
        destino = f"{self.ajustes.base}/oauth/token"
        try:
            with self._cliente() as cliente:
                respuesta = cliente.post(
                    destino,
                    data={
                        "grant_type": "authorization_code",
                        "code": codigo,
                        "redirect_uri": redirect_uri,
                        "client_id": self.ajustes.client_id,
                        "client_secret": self.ajustes.client_secret,
                    },
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                )
        except httpx.RequestError as exc:
            # Ni el `code` ni el `client_secret` en el log: el `code` es de un solo uso y
            # dura 5 minutos, pero un log del contenedor lo conserva mas que eso.
            logger.error("IAM inalcanzable en %s — %s", destino, _describir(exc))
            raise IamNoDisponible() from exc

        if respuesta.status_code != 200:
            # NUNCA reenviar el body del IAM: sus bloques `except` devuelven HTML con
            # traceback de Python (COIPO_USUARIOS/backend/oauth/router.py). Ese HTML
            # acabaria en la pantalla del usuario o en el log de auditoria.
            logger.warning("El IAM rechazo el canje del codigo (HTTP %s)", respuesta.status_code)
            raise ErrorDeIdentidad(
                MotivoDeRechazo.CODIGO_INVALIDO, causa=CausaTecnica.HTTP_INESPERADO
            )

        datos = self._json(respuesta, MotivoDeRechazo.CODIGO_INVALIDO)
        token = datos.get("access_token")
        if not isinstance(token, str) or not token:
            logger.error("Respuesta del IAM sin access_token")
            raise ErrorDeIdentidad(
                MotivoDeRechazo.CODIGO_INVALIDO, causa=CausaTecnica.RESPUESTA_INCOMPLETA
            )
        return token

    def identidad(self, credencial: str) -> Identidad:
        """GET /oauth/userinfo -> identidad + rol + los datos declarados por esta app.

        Es la validacion del token SIN tener el `JWT_SECRET` global del ecosistema: se
        le pregunta al emisor. Se paga UNA vez, en el callback; despues la sesion es
        propia y el IAM no se vuelve a consultar.
        """
        self._exigir_configuracion()
        destino = f"{self.ajustes.base}/oauth/userinfo"
        try:
            with self._cliente() as cliente:
                respuesta = cliente.get(
                    destino,
                    # La cabecera lleva el token. httpx no la loguea, y ningun `logger`
                    # de este modulo imprime `respuesta.request.headers`.
                    headers={"Authorization": f"Bearer {credencial}"},
                )
        except httpx.RequestError as exc:
            logger.error("IAM inalcanzable en %s — %s", destino, _describir(exc))
            raise IamNoDisponible() from exc

        if respuesta.status_code != 200:
            logger.warning(
                "El IAM rechazo el token en /oauth/userinfo (HTTP %s)", respuesta.status_code
            )
            raise ErrorDeIdentidad(
                MotivoDeRechazo.USERINFO_FALLO, causa=CausaTecnica.HTTP_INESPERADO
            )

        info = self._json(respuesta, MotivoDeRechazo.USERINFO_FALLO)
        if not info.get("sub"):
            logger.error("Respuesta de /oauth/userinfo sin `sub`")
            raise ErrorDeIdentidad(
                MotivoDeRechazo.USERINFO_FALLO, causa=CausaTecnica.RESPUESTA_INCOMPLETA
            )
        return self._a_identidad(info)

    # ------------------------------------------------------------------ mapeo

    def _json(self, respuesta: httpx.Response, motivo: MotivoDeRechazo) -> dict[str, Any]:
        """`respuesta.json()` con el fallo traducido, y comprobando que sea un objeto.

        `isinstance(..., dict)` no sobra: `json.loads("[]")` y `json.loads("3")` son
        JSON valido, y sin la comprobacion el `info.get("sub")` de mas abajo revienta
        con `AttributeError` DENTRO del callback de login. Como el `state` ya se consumio
        a esa altura, el reintento del usuario tambien falla.
        """
        try:
            datos = respuesta.json()
        except ValueError as exc:
            raise ErrorDeIdentidad(motivo, causa=CausaTecnica.RESPUESTA_NO_JSON) from exc
        if not isinstance(datos, dict):
            raise ErrorDeIdentidad(motivo, causa=CausaTecnica.RESPUESTA_NO_JSON)
        return datos

    def _a_identidad(self, info: dict[str, Any]) -> Identidad:
        """Normaliza la respuesta de `/oauth/userinfo`. Funcion pura: se prueba sin HTTP.

        El mapeo vive en `mapeo_claims.py` porque lo comparte con el doble del IAM de
        `tests/conftest.py`: una regla, un sitio. Aqui solo se le pasan las claves que esta
        aplicacion declaro en el panel del IAM.
        """
        return a_identidad(info, self.ajustes.claves_declaradas)
