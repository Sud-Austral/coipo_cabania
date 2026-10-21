"""El `ContextoDeEjecucion`: primer argumento de TODO caso de uso. Sin fastapi, sin ContextVar.

REGLA CONTEXTO-1
----------------
El dato que puede DECIDIR viaja por PARÁMETRO; el que solo se ESTAMPA, por ContextVar.

  * Aquí viven el actor y el instante. Con ellos se decide: quién puede, sobre qué ámbito,
    si algo venció. Que sean parámetros —y no estado ambiental— es lo que hace que la
    mutación de una regla de ámbito muera contra un test: la regla vive en una expresión
    sobre un argumento visible.
  * `ip`, `user_agent` y `request_id` NO están aquí. Viven en un ContextVar que escribe
    `adaptadores/entrada/http/middlewares/contexto_forense.py` y lee
    `adaptadores/salida/auditoria/auditor_postgres.py`. Nadie más. En hexagonal eso es MÁS
    estricto, no menos: esos tres campos no son entrada del caso de uso, y en cuanto fueran
    argumentos alguien acabaría escribiendo `if ctx.ip.startswith("172.31.")`. Un dato al
    que se le prohíbe influir en una decisión está mejor guardado donde el que decide no
    puede alcanzarlo.

Y el test que lo sostiene no es de imports, es de comportamiento: el mismo caso de uso dos
veces, una con el forense inyectando un `actor_rol` DISTINTO del que va por parámetro y otra
sin él; el resultado tiene que ser idéntico.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone

from app.dominio.modelo.identidad import Actor


@dataclass(frozen=True, slots=True)
class ContextoDeEjecucion:
    """Un actor y un instante. Nada más entra aquí.

    Cada cosa que se añade a este dataclass se convierte en un dato disponible para TODA
    regla de negocio del sistema. Añadir `es_admin` o `gerencia_id` sueltos parece cómodo y
    lo que hace es multiplicar los sitios donde se puede decidir con un dato que no pasó por
    la política de autorización.
    """

    actor: Actor
    ahora: datetime

    def __post_init__(self) -> None:
        # Un datetime sin zona es una bomba de relojería en un sistema con retención: al
        # compararlo con una columna `timestamptz` de Postgres, Python lo interpreta como
        # hora local del proceso (UTC dentro del contenedor, hora de Chile en el portátil de
        # quien desarrolla). El desfase son 3 o 4 horas según el horario de verano, y aparece
        # como filas que se purgan un día antes o un día después sin que nadie lo note.
        if self.ahora.tzinfo is None:
            raise ValueError(
                "ContextoDeEjecucion.ahora tiene que traer zona horaria. El instante lo da el "
                "puerto Reloj, que devuelve siempre UTC con tzinfo"
            )

    def con_actor(self, actor: Actor) -> "ContextoDeEjecucion":
        """Deriva un contexto con otro actor, conservando el instante.

        Lo usan los casos que ejecutan algo en nombre del sistema dentro de una petición de
        una persona (por ejemplo, una purga disparada a mano). El instante NO cambia: dos
        eventos del mismo acto administrativo con dos marcas de tiempo distintas obligan a
        quien audita a decidir cuál es la buena.
        """
        return ContextoDeEjecucion(actor=actor, ahora=self.ahora)


def contexto_de_sistema(actor: Actor, ahora: datetime | None = None) -> ContextoDeEjecucion:
    """Atajo para las tareas del scheduler y el arranque.

    `ahora=None` toma UTC del reloj del proceso, y es la ÚNICA puerta del árbol por la que
    entra un instante sin pasar por el puerto `Reloj`. Está aquí y no en el dominio, es
    explícita y se ve en el `grep`. Un caso de uso que llame a esto en vez de recibir el
    contexto es un defecto y `j02` no lo detecta: lo detecta quien revisa.
    """
    return ContextoDeEjecucion(actor=actor, ahora=ahora or datetime.now(timezone.utc))
