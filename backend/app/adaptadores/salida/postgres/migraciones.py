"""El motor de migraciones: aplica `db/*.sql` una vez cada uno, y deja constancia.

POR QUÉ EXISTE, Y POR QUÉ NO EXISTÍA
====================================
Hasta el 2026-09-15 `app/main.py` traía un `_aplicar_migraciones()` que devolvía
`False` sin hacer nada, «deliberadamente, hasta que una aplicación conecte su
runner». La consecuencia medida: **`/health` de toda aplicación recién sembrada
respondía 503 para siempre**, y con él se caía el healthcheck del contenedor y el
smoke test del despliegue, que hace `curl -sf /health`. O sea que la semilla no
podía desplegarse sin que cada aplicación escribiera primero esto — y ninguna
tenía de dónde copiarlo.

`db/0000_plataforma.sql` ya decía dónde tenía que vivir este archivo y que el
ledger es suyo:

    "No crea el ledger de migraciones. Es del motor de migraciones
     (adaptadores/salida/postgres/migraciones.py), y este archivo es su fila 0000."

LAS CUATRO DECISIONES, Y QUÉ PASA SI SE CAMBIAN
===============================================
 1. **Un advisory lock de transacción.** El despliegue levanta el contenedor y
    `docker compose up -d` puede tener dos réplicas arrancando a la vez; sin el
    lock, las dos aplican el mismo `.sql` y la segunda revienta a mitad. El lock
    es `pg_advisory_xact_lock`: se suelta solo al terminar la transacción, aunque
    el proceso muera. Un lock de sesión que no se suelta deja el arranque
    siguiente colgado sin decir por qué.
 2. **Todo en UNA transacción.** Postgres tiene DDL transaccional: si el tercer
    archivo falla, no queda medio esquema aplicado con el ledger diciendo que sí.
 3. **El ledger guarda el `sha256` del archivo.** Editar un `.sql` ya aplicado es
    la divergencia silenciosa clásica —la base de un servidor tiene una forma y
    la del otro tiene otra, y las dos dicen «0000 aplicado»—. Aquí es un error
    ruidoso en el arranque: se aborta la transacción y `/health` responde 503
    diciendo cuál cambió.
 4. **El hash se calcula con el fin de línea normalizado a `\\n`**, por el mismo
    motivo que `semilla/sellar.py`: en Windows el árbol de trabajo tiene CRLF y
    el mismo archivo daría dos huellas distintas según quién lo clonó.

LO QUE ESTE MOTOR NO HACE, Y NO ES UN OLVIDO
============================================
No siembra `catalogo_evento`. Eso lo hace cada aplicación desde
`app/dominio/eventos.py` en el mismo lifespan; aquí no se toca porque el catálogo
de eventos es del dominio, no del esquema.

No hay `downgrade`. Una migración que hay que deshacer se deshace con otra
migración hacia adelante: un `downgrade` que nadie ejecuta nunca es código que se
pudre y que da una falsa sensación de reversibilidad — y el despliegue de esta
flota no tiene rollback de todas formas.
"""

from __future__ import annotations

import hashlib
import logging
from pathlib import Path

registro = logging.getLogger(__name__)

# `db/` está en la RAÍZ del repositorio, no dentro de `backend/`. En la imagen es
# `/app/db/` porque `backend/Dockerfile` hace `COPY db/ ./db/` con el contexto en
# la raíz, y el WORKDIR es `/app/backend`: la ruta relativa sale igual dentro y
# fuera del contenedor, que es justo lo que se quiere.
#   parents[4] = backend/   ·   parents[5] = la raíz del repositorio
DIRECTORIO_SQL = Path(__file__).resolve().parents[5] / "db"

# Cualquier entero constante sirve: los advisory locks son por BASE DE DATOS, y
# cada aplicación tiene la suya. Se fija aquí para que dos procesos de la MISMA
# aplicación pidan el mismo.
CLAVE_LOCK = 20260915

LIBRO = """
CREATE TABLE IF NOT EXISTS esquema_migracion (
    aplicacion  text        NOT NULL,
    archivo     text        NOT NULL,
    sha256      text        NOT NULL,
    aplicado_en timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (aplicacion, archivo)
);

COMMENT ON TABLE esquema_migracion IS
    'Ledger de migraciones (D-15): que archivo de db/ se aplico, con que contenido y cuando. Lo escribe app/adaptadores/salida/postgres/migraciones.py.';
"""


class EsquemaDivergente(RuntimeError):
    """Un `.sql` ya aplicado cambió de contenido. Se aborta y NO se re-aplica.

    Re-aplicarlo sería peor: `CREATE TABLE IF NOT EXISTS` sobre una tabla que ya
    existe con otras columnas no falla y no hace nada, así que la base se queda
    con la forma vieja mientras el ledger jura que tiene la nueva.
    """


def huella(ruta: Path) -> str:
    """`sha256` del contenido con el fin de línea normalizado a `\\n`."""
    return hashlib.sha256(ruta.read_bytes().replace(b"\r\n", b"\n")).hexdigest()


def archivos(directorio: Path | None = None) -> list[Path]:
    """Los `.sql` a aplicar, en orden de nombre.

    El orden es el del nombre y por eso se numeran (`0000_`, `0001_`…): un orden
    que dependa del sistema de archivos aplica el dominio antes que la
    plataforma en una máquina y al revés en otra.
    """
    d = directorio or DIRECTORIO_SQL
    return sorted(p for p in d.glob("*.sql") if p.is_file())


def _ejecutar_script(cx, sql: str) -> None:
    """Ejecuta un `.sql` entero, sin que nadie interprete sus `%`.

    `cx.exec_driver_sql(sql)` NO sirve aquí, y el motivo es sutil. SQLAlchemy le
    pasa a psycopg una secuencia de parámetros **vacía**, y con parámetros —aunque
    sean cero— psycopg interpreta el `%` como marcador. `db/0000_plataforma.sql`
    tiene 17, todos legítimos: son los `%` de los `RAISE NOTICE` y `RAISE
    EXCEPTION` de PL/pgSQL. El primero revienta con un mensaje que no menciona el
    archivo ni la línea:

        psycopg.ProgrammingError: only '%s', '%b', '%t' are allowed as placeholders, got '%)'

    Con la conexión cruda y sin parámetros, psycopg no interpreta nada y además
    usa el protocolo simple, que es el único que admite **varias sentencias en un
    mismo envío** — y un `.sql` de esquema tiene decenas, más bloques `DO $$…$$`.

    Sigue siendo la misma conexión y la misma transacción que abrió
    `motor.begin()`: si algo falla después, esto se revierte con todo lo demás.

    Medido el 2026-09-15 en el CI, la primera vez que estas 1.438 líneas selladas
    se aplicaron contra un Postgres de verdad. Antes de eso el runner no existía.
    """
    crudo = cx.connection.driver_connection
    with crudo.cursor() as cur:
        cur.execute(sql)


def aplicar(dsn: str, aplicacion: str, directorio: Path | None = None) -> list[str]:
    """Aplica lo que falte y devuelve los nombres aplicados en esta llamada.

    Una lista vacía significa «no había nada nuevo», que es el caso normal de
    todo arranque después del primero. Que falle significa que no se aplicó nada:
    la transacción se revierte entera.
    """
    pendientes = archivos(directorio)
    if not pendientes:
        raise FileNotFoundError(
            f"no hay ningun .sql en {directorio or DIRECTORIO_SQL}. El esquema de esta "
            f"aplicacion no existe: no se puede dar por aplicado."
        )

    # Se importa aquí y no arriba para que `import app.main` no arrastre el motor
    # de base de datos: los tests de contrato importan la aplicación sin Postgres.
    from sqlalchemy import create_engine, text  # noqa: PLC0415

    motor = create_engine(dsn, pool_pre_ping=True, future=True)
    aplicados: list[str] = []
    try:
        with motor.begin() as cx:
            cx.execute(text("SELECT pg_advisory_xact_lock(:clave)"), {"clave": CLAVE_LOCK})
            cx.exec_driver_sql(LIBRO)
            ya = dict(cx.execute(
                text("SELECT archivo, sha256 FROM esquema_migracion WHERE aplicacion = :app"),
                {"app": aplicacion},
            ).all())

            for ruta in pendientes:
                actual = huella(ruta)
                anterior = ya.get(ruta.name)
                if anterior is not None:
                    if anterior != actual:
                        raise EsquemaDivergente(
                            f"{ruta.name} ya se aplico en esta base con OTRO contenido "
                            f"(ledger {anterior[:12]}…, disco {actual[:12]}…). Un .sql "
                            f"aplicado no se edita: se anade uno nuevo con el cambio."
                        )
                    continue
                _ejecutar_script(cx, ruta.read_text(encoding="utf-8"))
                cx.execute(
                    text("INSERT INTO esquema_migracion (aplicacion, archivo, sha256) "
                         "VALUES (:app, :archivo, :huella)"),
                    {"app": aplicacion, "archivo": ruta.name, "huella": actual},
                )
                aplicados.append(ruta.name)
                registro.info("esquema: aplicado %s", ruta.name)
    finally:
        motor.dispose()

    return aplicados
