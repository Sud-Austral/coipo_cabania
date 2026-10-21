"""Sesion propia: cookie httpOnly FIRMADA con itsdangerous. Adaptador de entrada.

D-11. Se descarta `SessionMiddleware` de Starlette porque no ofrece dos cosas que aca
hacen falta, y ninguna de las dos es opcional:

  TOPE ABSOLUTO. Sin el, una sesion que se toca todos los dias no vence NUNCA. "7 dias
  de inactividad" se convierte en "para siempre" justo para el usuario mas activo, que
  suele ser el que mas permisos tiene.

  JITTER. Sin el, todas las sesiones creadas el dia del despliegue vencen el MISMO dia
  y a la misma hora. En una aplicacion interna eso significa que un lunes a las 8:00 no
  entra nadie, y la causa —un despliegue de hace 30 dias— es invisible para quien
  atiende el incidente. Si ademas ese dia el IAM esta caido, no hay forma de entrar.

FIRMADA Y NO CIFRADA, A PROPOSITO
---------------------------------
El contenido (usuario, correo, rol, ambito) es informacion que ese mismo usuario ya ve
en pantalla. Lo que hay que impedir es que la MODIFIQUE —subirse el rol a
administrador, cambiarse la gerencia— y para eso basta el HMAC. Cifrar añadiria gestion
de claves sin cerrar ningun ataque nuevo.

SIN ESTADO EN MEMORIA
---------------------
El backend arranca con `uvicorn --workers 2`. Un `set()` de estados OAuth o un dict de
sesiones en RAM acertaria la mitad de las veces, con un sintoma —"a veces el login
falla"— que nadie diagnostica. Cookie firmada = sin estado = correcto con N workers.

QUE NO HAY AQUI
---------------
No hay cierre de sesion contra el IAM: el IAM no tiene endpoint de logout (IAM-012).
`cabecera_borrar_sesion()` cierra la sesion LOCAL, que es lo unico que esta aplicacion
controla. Ver el riesgo declarado en `aplicacion/puertos/identidad.py`.
"""

from __future__ import annotations

import hashlib
import re
import secrets
import time
from collections.abc import Mapping
from dataclasses import dataclass
from types import MappingProxyType
from typing import Any, Final

from fastapi import HTTPException, Request, Response, status
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

# Subir este numero invalida TODAS las sesiones abiertas, a proposito. Es la palanca que
# se usa cuando cambia la forma del payload (un campo nuevo que los guards leen): sin
# ella, una sesion vieja sin el campo llegaria a `sesion.ambitos[campo]` y produciria un
# 500 por cada peticion de quien no se hubiera vuelto a autenticar.
VERSION_SESION: Final = 1

# El authorization code del IAM dura 5 minutos (`oauth_service._CODE_TTL_MINUTES`). 10
# minutos da margen para que una persona teclee usuario y clave en el HTML del IAM sin
# que el estado se le caduque a medio camino.
TTL_ESTADO_SEGUNDOS: Final = 600

# Path "/" y no "/api/v1/auth": el callback se atiende en `/auth/callback`, que es una de
# las DOS excepciones cerradas al prefijo `/api/v1` (D-03), porque el IAM compara la
# `redirect_uri` por igualdad exacta. Una cookie acotada a `/api/v1/auth` no viajaria a
# esa ruta y el login fallaria SIEMPRE con "estado_invalido", sin ninguna pista de por
# que. El costo de mandarla en otras peticiones es despreciable: vive 10 minutos y se
# borra en cuanto se consume.
RUTA_COOKIE_ESTADO: Final = "/"

# Donde `composicion/contenedor.py` deja el gestor para que las dependencias lo
# encuentren. Se declara aca, junto a quien lo lee, y no en `main.py`: una constante y no
# un string suelto en dos archivos que se pueden desincronizar sin que nada falle hasta
# que alguien inicia sesion.
ATRIBUTO_APP: Final = "gestor_sesion"

_NOMBRE_APP_VALIDO = re.compile(r"^[a-z][a-z0-9_]{1,40}$")

# HMAC-SHA256 explicito. itsdangerous usa SHA-1 por defecto por compatibilidad
# historica; no esta roto para HMAC, pero un auditor que vea "SHA-1" en un informe pide
# explicaciones, y darlas cuesta mas que esta linea.
_FIRMA: Final = {"digest_method": hashlib.sha256}


@dataclass(frozen=True, slots=True)
class PlazosDeSesion:
    """Los plazos viven en la FICHA del proyecto, no en el codigo (D-12).

    Un plazo de sesion es una decision del area usuaria, no del programador, y cambia
    por aplicacion: no es lo mismo un panel interno que un tramite ciudadano. Estos
    valores son solo los DEFAULTS, y son los que ya corren en produccion en
    `coipo_prensa2` (inactividad 604800) mas el tope y el jitter de D-12.

    Fijar 8 horas de inactividad "por seguridad" mataria el requisito de las 8:00 que el
    jitter existe para proteger, y lo haria en el codigo, donde el area usuaria no puede
    verlo ni discutirlo.
    """

    inactividad_segundos: int = 604_800   # 7 dias
    absoluta_segundos: int = 2_592_000    # 30 dias
    jitter_segundos: int = 259_200        # 3 dias
    renovar_cada_segundos: int = 3_600    # 1 hora

    def __post_init__(self) -> None:
        # Se valida y se LANZA, y esto no contradice D-09: una ventana de sesion <= 0 no
        # es "una configuracion incompleta", es una aplicacion en la que nadie puede
        # entrar. El sitio queda caido en los dos casos; fallar ruidosamente al construir
        # el contenedor deja el motivo en el log del arranque en vez de un "el login no
        # funciona" sin explicacion.
        for nombre in ("inactividad_segundos", "absoluta_segundos", "renovar_cada_segundos"):
            if getattr(self, nombre) <= 0:
                raise ValueError(f"{nombre} tiene que ser mayor que cero")
        if self.jitter_segundos < 0:
            raise ValueError("jitter_segundos no puede ser negativo")


@dataclass(frozen=True, slots=True)
class Sesion:
    """El contenido de la cookie, ya verificado. Es lo que reciben los guards.

    `ambitos` es un mapa `campo -> valor` (por ejemplo `{"gerencia_id": 2}`) construido
    en el callback desde los atributos DECLARADOS del IAM. Que este en la sesion FIRMADA
    y no en un query param es lo que hace que `ambito_forzado()` no se pueda burlar
    (ataque A-04).
    """

    version: int
    sub: str
    usuario: str
    correo: str
    rol: str
    app_id: int | None
    ambitos: Mapping[str, int]
    iniciada_en: int
    expira_en: int
    renovada_en: int

    def __post_init__(self) -> None:
        object.__setattr__(self, "ambitos", MappingProxyType(dict(self.ambitos)))

    def a_payload(self) -> dict[str, Any]:
        """Claves cortas: la cookie viaja en CADA peticion.

        Nombres de una o dos letras y no los del dataclass porque una cookie de sesion
        con nombres largos suma cientos de bytes por peticion en un sitio que sirve
        listados; y porque el limite duro de 4 KB por cookie es un fallo que solo
        aparece cuando un usuario tiene muchos ambitos, o sea en produccion.
        """
        return {
            "v": self.version,
            "sub": self.sub,
            "u": self.usuario,
            "c": self.correo,
            "r": self.rol,
            "a": self.app_id,
            "am": dict(self.ambitos),
            "ini": self.iniciada_en,
            "exp": self.expira_en,
            "ren": self.renovada_en,
        }

    @classmethod
    def desde_payload(cls, datos: Mapping[str, Any]) -> Sesion | None:
        """Reconstruye la sesion, o `None` si el payload no tiene la forma esperada.

        Devuelve `None` en vez de lanzar porque quien llama ya trata "cookie invalida"
        como "no hay sesion": una excepcion aqui obligaria a envolver cada lectura y el
        primer olvido seria un 500 en una ruta publica.

        Los ambitos se fuerzan a `int`. Una cookie manipulada no puede colar un
        `{"gerencia_id": "2 OR 1=1"}` — el HMAC ya lo impide, pero el filtro que acaba en
        un `WHERE` no depende de una sola defensa.
        """
        try:
            if int(datos.get("v", 0)) != VERSION_SESION:
                return None
            ambitos_crudos = datos.get("am") or {}
            if not isinstance(ambitos_crudos, Mapping):
                return None
            ambitos = {str(k): int(v) for k, v in ambitos_crudos.items()}
            return cls(
                version=VERSION_SESION,
                sub=str(datos.get("sub") or ""),
                usuario=str(datos.get("u") or ""),
                correo=str(datos.get("c") or ""),
                rol=str(datos.get("r") or ""),
                app_id=int(datos["a"]) if datos.get("a") is not None else None,
                ambitos=ambitos,
                iniciada_en=int(datos.get("ini", 0)),
                expira_en=int(datos.get("exp", 0)),
                renovada_en=int(datos.get("ren", 0)),
            )
        except (TypeError, ValueError):
            return None


class GestorDeSesion:
    """Firma, verifica y emite las dos cookies: la de sesion y la del estado OAuth.

    La configuracion entra por el constructor y NO se lee de un modulo global: sin eso
    no se puede construir un gestor con `https_only=True` y otro con `False` en el mismo
    test, que es exactamente lo que comprueba `test_cookies.py` sobre la cabecera
    `Set-Cookie` CRUDA.
    """

    def __init__(
        self,
        *,
        nombre_app: str,
        secreto: str,
        https_only: bool,
        plazos: PlazosDeSesion | None = None,
    ) -> None:
        if not _NOMBRE_APP_VALIDO.match(nombre_app):
            # El nombre entra en el nombre de la cookie, y ahi el juego de caracteres
            # legal es estrecho (RFC 6265 token). Un nombre con punto o mayuscula produce
            # una cabecera que unos navegadores aceptan y otros descartan en silencio.
            raise ValueError(f"nombre_app invalido para una cookie: {nombre_app!r}")

        self.nombre_app = nombre_app
        self.plazos = plazos or PlazosDeSesion()
        self.https_only = https_only

        # El nombre de la cookie lleva el nombre de la app, y no es cosmetico: las
        # cookies IGNORAN el puerto. En desarrollo, dos aplicaciones de esta flota en
        # localhost:8103 y localhost:8104 comparten el espacio de cookies de `localhost`,
        # asi que con un nombre generico la segunda pisa la sesion de la primera y el
        # sintoma es "me desloguea solo". En produccion cada app tiene su hostname y no
        # habria colision, que es justo por lo que el fallo solo aparece en el escritorio
        # de quien desarrolla y nunca en el servidor.
        self.cookie_sesion = f"{nombre_app}_sesion"
        self.cookie_estado = f"{nombre_app}_estado"

        # Placeholder DETERMINISTA, no aleatorio: con `--workers 2` un secreto aleatorio
        # por proceso daria fallos intermitentes imposibles de diagnosticar (la mitad de
        # las peticiones con sesion valida, la otra mitad sin). Nunca llega a ser usable
        # porque `configurado` es False y tanto `crear()` como `verificar()` fallan
        # cerrado.
        self.configurado = bool(secreto)
        material = secreto or f"{nombre_app}_SIN_SECRETO_CONFIGURADO"

        # Sal distinta por aplicacion Y por proposito. Por proposito, para que una cookie
        # de estado no valga como cookie de sesion. Por aplicacion, porque el
        # `SESSION_SECRET` lo teclea un humano en cada servidor y la probabilidad de que
        # dos apps de la flota acaben con el mismo valor no es cero: con sales distintas,
        # una cookie de la app A no verifica en la app B aunque el secreto coincida.
        self._sesion = URLSafeTimedSerializer(
            material, salt=f"{nombre_app}-sesion", signer_kwargs=_FIRMA
        )
        self._estado = URLSafeTimedSerializer(
            material, salt=f"{nombre_app}-oauth-estado", signer_kwargs=_FIRMA
        )

    # ------------------------------------------------------------- estado OAuth

    def nuevo_estado(self) -> str:
        """El anti-CSRF de OAuth. 32 bytes de `secrets`, no de `random`."""
        return secrets.token_urlsafe(32)

    def firmar_estado(self, *, estado: str, destino: str, redirect_uri: str) -> str:
        """El destino post-login y la `redirect_uri` viajan FIRMADOS junto al estado.

        El DESTINO va aca y no por la URL porque el IAM no reenvia parametros propios, y
        aceptarlo del query string en el callback abriria una redireccion abierta: el
        login institucional convertido en trampolin de phishing con la marca de CONAF
        (ataque A-03). Quien llama tiene que haberlo pasado antes por `destino_seguro()`
        de `dominio/politicas/`; firmarlo no lo valida, solo impide que lo cambien
        despues.

        La `redirect_uri` va aca porque el IAM exige que la del canje sea IDENTICA a la
        del `/authorize`. Al congelarla en la cookie firmada cuando se inicia el login,
        el canje usa exactamente la misma cadena aunque se hubiera deducido del request
        — y nadie puede alterarla, porque el HMAC la protege.
        """
        return self._estado.dumps({"s": estado, "d": destino, "r": redirect_uri})

    def verificar_estado(self, cookie: str | None, estado_recibido: str | None) -> tuple[str, str] | None:
        """Devuelve `(destino, redirect_uri)` si el estado calza; `None` si no.

        DOBLE expiracion: la del navegador (`max_age` de la cookie) y la del servidor
        (`max_age` de `loads()`). Nunca confiar solo en la primera — el navegador lo
        controla el atacante.

        La comparacion es `secrets.compare_digest` y no `==`: la diferencia practica
        contra un HMAC de 32 bytes es discutible, pero el habito de comparar secretos
        con `==` es el que acaba aplicandose donde si importa.

        El uso UNICO no lo garantiza esta funcion, sino quien la llama: la cookie de
        estado se borra SIEMPRE, pase lo que pase en el intento (ataque A-02). En el
        codigo eso es un `.pop`, nunca un `.get`.
        """
        if not cookie or not estado_recibido:
            return None
        try:
            datos = self._estado.loads(cookie, max_age=TTL_ESTADO_SEGUNDOS)
        except (BadSignature, SignatureExpired):
            return None
        if not isinstance(datos, dict):
            return None
        if not secrets.compare_digest(str(datos.get("s", "")), estado_recibido):
            return None
        return str(datos.get("d") or "/"), str(datos.get("r") or "")

    # ------------------------------------------------------------- sesion propia

    def crear(
        self,
        *,
        sub: str,
        usuario: str,
        correo: str,
        rol: str,
        app_id: int | None,
        ambitos: Mapping[str, int] | None = None,
        ahora: int | None = None,
    ) -> Sesion:
        """Nace la sesion, con el tope absoluto ya calculado y con JITTER."""
        if not self.configurado:
            # Sin secreto no se emite una cookie que se pueda falsificar. Falla cerrado.
            raise RuntimeError(
                "SESSION_SECRET no configurado: no se puede emitir una sesion firmada"
            )
        instante = int(time.time()) if ahora is None else int(ahora)
        tope = instante + self.plazos.absoluta_segundos
        if self.plazos.jitter_segundos > 0:
            # `secrets.randbelow` y no `random`: no porque un atacante gane algo
            # adivinando el vencimiento, sino porque `random` en un proceso forkeado por
            # uvicorn arranca con el MISMO estado en los dos workers, y entonces el
            # jitter deja de repartir. Un jitter que no reparte es codigo muerto que
            # parece un control.
            tope += secrets.randbelow(self.plazos.jitter_segundos + 1)
        return Sesion(
            version=VERSION_SESION,
            sub=str(sub),
            usuario=usuario or "",
            correo=correo or "",
            rol=rol or "",
            app_id=app_id,
            ambitos=dict(ambitos or {}),
            iniciada_en=instante,
            expira_en=tope,
            renovada_en=instante,
        )

    def verificar(self, cookie: str | None, *, ahora: int | None = None) -> Sesion | None:
        """Solo HMAC + reloj. NO consulta al IAM ni a Postgres.

        Es lo que hace que una caida del IAM (o un parpadeo de la base) no expulse a
        nadie que YA tenga sesion: el requisito de las 8:00.

        Fallo CERRADO si la autenticacion no esta configurada. Sin esto, el placeholder
        determinista del constructor —que esta escrito en un archivo de un repositorio—
        permitiria a cualquiera firmarse una cookie con rol administrador.
        """
        if not self.configurado or not cookie:
            return None
        try:
            # `max_age` es la ventana DESLIZANTE: mide contra el timestamp de la ultima
            # re-emision de la cookie, no contra el login original. Es la inactividad.
            datos = self._sesion.loads(cookie, max_age=self.plazos.inactividad_segundos)
        except (BadSignature, SignatureExpired):
            return None
        if not isinstance(datos, dict):
            return None
        sesion = Sesion.desde_payload(datos)
        if sesion is None:
            return None
        instante = int(time.time()) if ahora is None else int(ahora)
        if sesion.expira_en <= instante:
            # TOPE ABSOLUTO. Es la comprobacion que Starlette no tiene y por la que no se
            # usa su SessionMiddleware.
            return None
        return sesion

    def debe_renovarse(self, sesion: Sesion, *, ahora: int | None = None) -> bool:
        """Si la cookie se re-emite en esta respuesta.

        No se re-emite en CADA peticion a proposito: con un listado que dispara diez
        llamadas, diez `Set-Cookie` por pantalla inflan la respuesta y hacen ilegible
        cualquier captura de red cuando hay que diagnosticar algo.
        """
        instante = int(time.time()) if ahora is None else int(ahora)
        return instante - sesion.renovada_en >= self.plazos.renovar_cada_segundos

    def valor_cookie(self, sesion: Sesion, *, ahora: int | None = None) -> str:
        """El texto firmado que va en la cabecera, con `renovada_en` actualizado.

        `expira_en` NO se recalcula: si se recalculara en cada renovacion, el tope
        absoluto se movria con el uso y dejaria de ser absoluto — que es el defecto
        exacto que este mecanismo existe para no tener.
        """
        instante = int(time.time()) if ahora is None else int(ahora)
        payload = sesion.a_payload()
        payload["ren"] = instante
        return self._sesion.dumps(payload)

    # ------------------------------------------------------------- cookies

    def poner_cookie_sesion(self, respuesta: Response, sesion: Sesion) -> None:
        respuesta.set_cookie(
            self.cookie_sesion,
            self.valor_cookie(sesion),
            max_age=self.plazos.inactividad_segundos,
            httponly=True,
            secure=self.https_only,
            # 'lax' y no 'strict': en desarrollo el origen es localhost:5173 y el IAM es
            # iam.conaf.cl — ahi SI son cross-site, y con 'strict' la cookie no viajaria
            # en el 303 de vuelta del callback. (En produccion ambos cuelgan de conaf.cl
            # y son same-site, asi que 'strict' "funcionaria": no dejarse engañar por
            # eso y descubrirlo el dia que alguien monta un entorno nuevo.)
            samesite="lax",
            # Sin `domain`: cookie host-only. JAMAS `.conaf.cl`, que la compartiria con
            # todas las demas aplicaciones del dominio y convertiria una sesion de esta
            # app en una credencial que viaja a servidores de otros equipos.
            path="/",
        )

    def poner_cookie_estado(self, respuesta: Response, firmado: str) -> None:
        respuesta.set_cookie(
            self.cookie_estado,
            firmado,
            max_age=TTL_ESTADO_SEGUNDOS,
            httponly=True,
            secure=self.https_only,
            samesite="lax",
            path=RUTA_COOKIE_ESTADO,
        )

    def borrar_cookie_sesion(self, respuesta: Response) -> None:
        respuesta.delete_cookie(
            self.cookie_sesion,
            path="/",
            httponly=True,
            secure=self.https_only,
            samesite="lax",
        )

    def borrar_cookie_estado(self, respuesta: Response) -> None:
        respuesta.delete_cookie(
            self.cookie_estado,
            path=RUTA_COOKIE_ESTADO,
            httponly=True,
            secure=self.https_only,
            samesite="lax",
        )

    def cabecera_borrar_sesion(self) -> str:
        """`Set-Cookie` de borrado como STRING, para `headers=` de una `HTTPException`.

        ES LA RAZON DE QUE ESTA FUNCION EXISTA: cuando una DEPENDENCIA lanza
        `HTTPException`, FastAPI arma una `JSONResponse` NUEVA y DESCARTA el `Response`
        inyectado en la dependencia. Un `delete_cookie()` sobre ese objeto no llega
        nunca al navegador — y el camino de error es justo cuando hay que cerrar la
        sesion. Los `headers` de la `HTTPException` si se propagan.

        El resultado tiene que traer `Max-Age=0` y los mismos atributos con los que se
        emitio, o el navegador no borra nada: una cookie se identifica por
        (nombre, dominio, path). `test_cookies.py` lo comprueba sobre la cabecera CRUDA.
        """
        partes = [f"{self.cookie_sesion}=", "Path=/", "Max-Age=0", "HttpOnly", "SameSite=Lax"]
        if self.https_only:
            partes.append("Secure")
        return "; ".join(partes)

    def cabecera_borrar_estado(self) -> str:
        """Igual que la anterior, para la cookie de estado OAuth.

        El callback la borra SIEMPRE, incluso —sobre todo— cuando el intento falla: el
        estado es de un solo uso (ataque A-02) y el camino de fallo es un camino de
        `HTTPException`, donde el `Response` inyectado no sobrevive.
        """
        partes = [
            f"{self.cookie_estado}=",
            f"Path={RUTA_COOKIE_ESTADO}",
            "Max-Age=0",
            "HttpOnly",
            "SameSite=Lax",
        ]
        if self.https_only:
            partes.append("Secure")
        return "; ".join(partes)


# --------------------------------------------------------------------------------
# Dependencias de FastAPI
# --------------------------------------------------------------------------------


def gestor_de(request: Request) -> GestorDeSesion:
    """El gestor que `composicion/contenedor.py` dejo en `app.state`.

    Se resuelve desde `app.state` y no desde un singleton de modulo porque un singleton
    hace imposible levantar dos aplicaciones con configuraciones distintas en el mismo
    proceso de pytest, que es como se prueban las combinaciones de `APP_ENV` sobre la
    cabecera cruda.

    Si falta, revienta ruidosamente: es un error de cableado, no una condicion de los
    datos, y se ve en el primer smoke test.
    """
    gestor = getattr(request.app.state, ATRIBUTO_APP, None)
    if gestor is None:
        raise RuntimeError(
            f"app.state.{ATRIBUTO_APP} no esta puesto: "
            "composicion/contenedor.py tiene que construir el GestorDeSesion"
        )
    return gestor


def sesion_opcional(request: Request) -> Sesion | None:
    """La sesion si la hay, `None` si no. Para rutas que sirven a ambos casos."""
    gestor = gestor_de(request)
    return gestor.verificar(request.cookies.get(gestor.cookie_sesion))


def sesion_actual(request: Request) -> Sesion:
    """La sesion, o 401. Es la base de todos los guards.

    NO se audita aca, y es deliberado: un 401 sin sesion es ruido de alto volumen
    —cualquier pestaña vieja o cualquier bot lo genera— y el middleware de acceso ya
    deja la fila en `log_acceso` con status 401, IP y ruta, que es la informacion util
    para investigar. Registrar ademas un evento de negocio por cada uno solo inflaria
    `log_auditoria` sin aportar nada. (Mismo razonamiento y misma conclusion que
    `COIPO_ENTREGA_PLANTA/backend/app/core/deps.py`.)

    Si HABIA cookie y no vale (caducada, firma rota, version vieja), la respuesta lleva
    la cabecera de borrado: sin ella el navegador reintenta con la misma cookie muerta
    en cada peticion y el frontend entra en bucle de reintentos contra un 401.
    """
    gestor = gestor_de(request)
    crudo = request.cookies.get(gestor.cookie_sesion)
    sesion = gestor.verificar(crudo)
    if sesion is not None:
        return sesion
    cabeceras = {"Set-Cookie": gestor.cabecera_borrar_sesion()} if crudo else None
    raise HTTPException(
        status.HTTP_401_UNAUTHORIZED,
        "No autenticado",
        headers=cabeceras,
    )


def renovar_si_toca(request: Request, respuesta: Response, sesion: Sesion) -> None:
    """Re-emite la cookie si toco, para que la ventana deslizante deslice.

    Va en una funcion aparte y no dentro de `sesion_actual` porque `sesion_actual` se usa
    como `dependencies=[...]` de un router, donde el `Response` inyectado SI sobrevive
    (no hay excepcion) pero no siempre esta a mano. Quien quiera ventana deslizante la
    llama; quien no, tiene la sesion igual.
    """
    gestor = gestor_de(request)
    if gestor.debe_renovarse(sesion):
        gestor.poner_cookie_sesion(respuesta, sesion)
