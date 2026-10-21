"""Configuración del proceso. Único punto del árbol que lee el entorno.

QUE ESTÉ AQUÍ Y EN NINGÚN OTRO SITIO NO ES ESTILO
=================================================
`tests/contrato/test_health.py` falla si el router de salud lee `os.environ`, y
`tests/arquitectura/test_capas.py` falla si el dominio o la aplicación importan
infraestructura. La consecuencia práctica: para saber qué exige este proceso
para arrancar basta con leer ESTE archivo. En la Guía 8, punto 3, esa lectura es
un paso obligatorio antes de desplegar, y hoy es imposible en varias apps de la
flota porque la configuración está repartida.

LAS CINCO VARIABLES, NUNCA UNA `DATABASE_URL`
=============================================
El Postgres de esta flota es COMPARTIDO, vive fuera de Docker en otra máquina y
lo administra otro equipo. Se conecta con `DATABASE_HOST`, `_PORT`, `_USER`,
`_PASSWORD` y `_NAME` por separado, y la URL se compone AQUÍ. Una `DATABASE_URL`
única mete la contraseña en una sola cadena que acaba entera en un log, en un
mensaje de error de SQLAlchemy o en una captura de pantalla.

`sslmode=disable` y `gssencmode=disable` son obligatorios: sin ellos psycopg
intenta negociar GSSAPI primero contra este servidor y falla con un error que no
dice nada útil.

POR QUÉ SE ABORTA SI FALTA ALGO, Y POR QUÉ NO SIEMPRE
=====================================================
El reusable de despliegue hace `rsync --delete` y después `up -d`, **sin
rollback**: el árbol anterior ya no existe. Un aborto general no es "un
despliegue detenido", es la aplicación caída sin nada a lo que volver. Por eso
sólo se aborta por lo que hace imposible arrancar —las credenciales de la base—
y el resto se reporta en `/health/detalle`, que pone rojo el despliegue y deja
el sitio arriba.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

# El `.env` del SERVIDOR no se lee con esto: lo inyecta docker compose con
# `env_file:`, y dentro de la imagen el archivo ni siquiera existe (lo excluye
# `.dockerignore`). Esto es para DESARROLLO LOCAL, que hasta el 2026-09-15 no
# tenia camino: `python-dotenv` estaba en requirements desde el principio y no lo
# usaba nadie, asi que quien clonaba el repositorio en su maquina tenia que
# exportar cinco variables a mano en cada terminal.
#
# `override=False` es lo que lo hace seguro: lo que ya esta en el entorno MANDA.
# Asi el contenedor, el CI y el guard de `tests/conftest.py` —que puebla
# `os.environ` antes de importar nada— siguen decidiendo, y el `.env` solo
# rellena los huecos.
_RAIZ_BACKEND = Path(__file__).resolve().parents[2]


def _cargar_dotenv() -> None:
    try:
        from dotenv import load_dotenv  # noqa: PLC0415 — opcional a proposito
    except ImportError:
        # La imagen de produccion no necesita dotenv para arrancar. Que falte no
        # puede impedir el arranque: seria caerse por una comodidad de desarrollo.
        return
    for candidato in (_RAIZ_BACKEND.parent / ".env", _RAIZ_BACKEND / ".env"):
        if candidato.is_file():
            load_dotenv(candidato, override=False)

# Las seis de infraestructura que la Guía 8 (punto 3) da por supuestas en toda
# aplicación de la flota. APP_PORT lo consume el compose, no el proceso.
OBLIGATORIAS = (
    "DATABASE_HOST",
    "DATABASE_PORT",
    "DATABASE_USER",
    "DATABASE_PASSWORD",
    "DATABASE_NAME",
)

# Alias que la gente teclea mal en el `.env` del SERVIDOR, donde no hay revisión
# de código que lo detecte. `SESION_` con una sola S es el caso real: la
# aplicación arranca igual, la cookie viaja sin `Secure`, y no hay una sola línea
# en los logs.
#
# SE TOLERAN, NO SE ABORTA. Hasta el 2026-09-08 este módulo abortaba el arranque
# por un alias, contradiciendo su propia cabecera («sólo se aborta por lo que
# hace imposible arrancar») y la doctrina de docs/APRENDIZAJES-DE-ALINEACION.md,
# que salió de aplicar ese aborto a coipo_prensa2: con `rsync --delete` y sin
# rollback, abortar por una grafía es la aplicación caída sin nada a lo que
# volver. Ahora el alias SE LEE, se anota en `advertencias` y el arranque sigue.
ALIAS_TOLERADOS = {
    "SESION_SECRET": "SESSION_SECRET",
    "SESION_HTTPS_ONLY": "SESSION_HTTPS_ONLY",
    "SESION_MAX_AGE": "SESSION_MAX_AGE",
}
# Éste sí aborta: no hay forma de derivar las cinco variables de una URL sin
# adivinar, y adivinar credenciales es peor que no arrancar.
ALIAS_ERRONEOS = {
    "DATABASE_URL": "las cinco variables DATABASE_* por separado",
}


class ConfiguracionInvalida(RuntimeError):
    """Se aborta el arranque. El mensaje dice QUÉ falta, nunca su valor."""


@dataclass
class Ajustes:
    # ── Base de datos ────────────────────────────────────────────────────────
    database_host: str = ""
    database_port: str = "5432"
    database_user: str = ""
    database_password: str = field(default="", repr=False)  # nunca en un repr
    database_name: str = ""

    # ── Identidad del build. Las inyecta el Dockerfile con ARG/ENV ───────────
    # Sin `commit` no se puede saber si el contenedor se reconstruyó o quedó
    # vivo el anterior, que es indistinguible desde fuera.
    version: str = "0.0.0"
    commit: str = "desconocido"
    construido_en: str = "desconocido"

    # ── Ambiente ─────────────────────────────────────────────────────────────
    app_env: str = "development"
    # El servidor sirve HTTP plano: la TLS la termina un balanceador delante. Una
    # cookie `Secure` no viaja por HTTP y el login deja de funcionar sin un solo
    # error. Se queda en False hasta que el certificado esté instalado.
    session_https_only: bool = False

    # Lo fija el lifespan de `app.main` tras aplicar las migraciones. Es lo único
    # que puede poner `/health` en 503.
    esquema_aplicado: bool = False

    # Lo que se leyó con un nombre equivocado y se toleró. Vacío = todo bien.
    # Pendiente: que `/health/detalle` lo publique (salud.py está CONGELADO y se
    # cambia allí, resellando).
    advertencias: list[str] = field(default_factory=list)

    # Por qué estos ajustes están inertes, si lo están. Vacío = se leyó el entorno
    # completo. Lo registra `app.main` al arrancar: unos ajustes vacíos en silencio
    # eran un arranque mudo con la base sin configurar.
    configuracion_invalida: str = ""

    @property
    def dsn(self) -> str:
        """`postgresql+psycopg://…` — psycopg v3, que es el que recomienda SQLAlchemy 2.x.

        Se compone aquí, a partir de las cinco variables. Nunca se registra en un
        log: contiene la contraseña.
        """
        return (
            f"postgresql+psycopg://{self.database_user}:{self.database_password}"
            f"@{self.database_host}:{self.database_port}/{self.database_name}"
            f"?sslmode=disable&gssencmode=disable"
        )

    @property
    def es_produccion(self) -> bool:
        return self.app_env.strip().lower() == "production"


def _leer_entorno() -> Ajustes:
    advertencias = []
    for malo, bueno in ALIAS_TOLERADOS.items():
        if os.environ.get(malo) and not os.environ.get(bueno):
            os.environ[bueno] = os.environ[malo]
            advertencias.append(f"{malo} se leyó como {bueno}: corrige el .env del servidor")

    erroneos = [
        f"{malo} (se llama {bueno})"
        for malo, bueno in ALIAS_ERRONEOS.items()
        if os.environ.get(malo)
    ]
    if erroneos:
        raise ConfiguracionInvalida(
            "el .env define variables con el nombre equivocado, y con ese nombre "
            "el proceso las ignora en silencio:\n  " + "\n  ".join(erroneos)
        )

    faltan = [v for v in OBLIGATORIAS if not os.environ.get(v)]
    if faltan:
        raise ConfiguracionInvalida(
            "faltan variables obligatorias en el .env del servidor: "
            + ", ".join(faltan)
            + ". El .env lo crea el bootstrap y nunca pasa por el repositorio."
        )

    return Ajustes(
        database_host=os.environ["DATABASE_HOST"],
        database_port=os.environ.get("DATABASE_PORT", "5432"),
        database_user=os.environ["DATABASE_USER"],
        database_password=os.environ["DATABASE_PASSWORD"],
        database_name=os.environ["DATABASE_NAME"],
        version=os.environ.get("APP_VERSION", "0.0.0"),
        commit=os.environ.get("APP_COMMIT", "desconocido"),
        construido_en=os.environ.get("APP_CONSTRUIDO_EN", "desconocido"),
        app_env=os.environ.get("APP_ENV", "development"),
        session_https_only=os.environ.get("SESSION_HTTPS_ONLY", "false").lower() == "true",
        advertencias=advertencias,
    )


def cargar() -> Ajustes:
    """Lee el entorno, o devuelve unos ajustes inertes si no está completo.

    NO revienta al importar el módulo. Si lo hiciera, `tests/contrato` —que sólo
    lee este archivo con `ast` y no necesita ninguna base— no podría ni
    importarse, y la mitad estática del contrato dejaría de correr justo cuando
    más falta hace: antes de que el proyecto arranque.

    LO QUE FALLÓ SE GUARDA, NO SE PIERDE. Hasta el 2026-09-15 este `except`
    devolvía unos ajustes vacíos sin dejar rastro, mientras el docstring decía
    que «el aborto de verdad ocurre en el lifespan de `app.main`» — y el lifespan
    no volvía a comprobar nada. O sea que un `.env` incompleto daba una
    aplicación que arrancaba muda, con `database_host` vacío, y el primer error
    llegaba desde el driver sin decir que faltaba una variable. Ahora el motivo
    viaja en `configuracion_invalida` y `app.main` lo registra al arrancar.
    """
    _cargar_dotenv()
    try:
        return _leer_entorno()
    except ConfiguracionInvalida as e:
        return Ajustes(configuracion_invalida=str(e))


ajustes = cargar()
