"""DOS puertos de auditoría. Nunca uno con un flag.

POR QUÉ DOS Y NO UN `registrar(evento, autonomo=False)`
-------------------------------------------------------
Porque un booleano por defecto se olvida, y el que se olvida es siempre el mismo: el
transaccional, que es el que da la garantía. Con dos puertos, el caso de uso tiene que
pedir en el constructor el que necesita, y quien lee la firma ve cuál usa sin abrir el
cuerpo. Con un flag, la garantía depende de un argumento que nadie mira en la revisión.

La segunda razón es física: son dos SESIONES DISTINTAS de base de datos. El transaccional
escribe en la sesión del caso de uso; el autónomo abre otra del mismo pool a propósito,
para que su fallo o su reversión no arrastre a la operación de negocio. Eso no es una
opción de un método: son dos objetos con dos ciclos de vida distintos.

LOS CUATRO REGÍMENES, decididos por el EVENTO y no por el programador (ver `Regimen`):
  ATOMICO     -> AuditorTransaccional. La operación se revierte con el log.
  CRITICO     -> AuditorTransaccional. Si no se puede registrar, la operación NO se ejecuta.
  DEGRADADO   -> AuditorAutonomo. La operación sigue; el evento va al respaldo duradero.
  BEST_EFFORT -> AuditorAutonomo, y ni se intenta ante un `OperationalError`.
"""

from typing import Mapping, Protocol

from app.aplicacion.contexto import ContextoDeEjecucion
from app.dominio.eventos import Evento


class AuditorTransaccional(Protocol):
    """Escribe en la MISMA transacción que el cambio de negocio. Regímenes ATOMICO y CRITICO.

    No confirma nada: la confirmación es de la `UnidadDeTrabajo`. Si esta escritura falla, la
    excepción sube y el cambio de negocio se revierte con ella — que es exactamente la
    garantía: es imposible tener una escritura de negocio sin su registro.
    """

    def registrar(
        self,
        contexto: ContextoDeEjecucion,
        evento: Evento,
        *,
        entidad: str | None = None,
        entidad_id_num: int | None = None,
        detalle: Mapping[str, object] | None = None,
        valores_previos: Mapping[str, object] | None = None,
    ) -> None:
        """`entidad_id_num` es un `bigint`, NO un texto.

        El tipo es el control: hoy `admin_lista_negra.py:33-42` escribe un RUT como
        `entidad_id` en la única tabla que la desidentificación no puede tocar y el trigger
        de inmutabilidad impide corregir. Con un `int` no se puede.

        `detalle` se valida clave por clave contra `evento.campos_detalle`. Una clave no
        declarada es `AssertionError` en tests y `<no declarado>` más un evento
        `sistema.auditoria.degradar` en producción. Está PROHIBIDO meter `str(exc)`: el
        mensaje de una excepción de SMTP incluye el destinatario. Solo
        `type(exc).__name__` más un código cerrado.

        `valores_previos` es obligatorio cuando `evento.exige_valores_previos` — toda
        escritura y toda configuración (REGLA CRUD-2). Sin el valor anterior, el log dice
        que algo cambió pero no desde qué, y eso no reconstruye un acto administrativo.
        """


class AuditorAutonomo(Protocol):
    """Escribe en OTRA sesión. Regímenes DEGRADADO y BEST_EFFORT. NUNCA levanta.

    Que no levante es el contrato entero: un 403 que se convirtiera en 500 por no poder
    escribir su registro le regalaría al atacante un canal de denegación de servicio y un
    oráculo. Y el 403 ya quedó en `log_acceso` de todas formas, porque ese middleware corre
    por FUERA de `ExceptionMiddleware`: hay dos registros independientes.

    Cuando el destino principal falla, el evento va al respaldo duradero (JSONL append-only
    sobre volumen con nombre, `O_APPEND` + `fsync`, línea truncada a 3800 bytes porque
    `write(2)` con `O_APPEND` solo es atómico bajo PIPE_BUF). «Al menos queda en el log del
    contenedor» NO es evidencia: `docker compose logs` rota y desaparece con un `down`.
    """

    def registrar_autonomo(
        self,
        contexto: ContextoDeEjecucion,
        evento: Evento,
        *,
        entidad: str | None = None,
        entidad_id_num: int | None = None,
        detalle: Mapping[str, object] | None = None,
    ) -> None: ...

    def pendientes_en_respaldo(self) -> int:
        """Cuántas líneas esperan reconciliación. Lo publica `/health/detalle`, no `/health`.

        Si pasan de 24 h sin drenarse, el smoke test del despliegue sale ROJO: build en rojo con el
        sitio arriba. Bajar `/health` por esto dejaría el servicio entero fuera por un
        problema de evidencia, que es peor que el problema.
        """
