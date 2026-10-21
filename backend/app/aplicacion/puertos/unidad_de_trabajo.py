"""La transacción como puerto: el caso de uso decide CUÁNDO se confirma, el adaptador CÓMO."""

from types import TracebackType
from typing import Protocol


class UnidadDeTrabajo(Protocol):
    """Contexto transaccional. Al salir sin confirmar, revierte.

    POR QUÉ LA TRANSACCIÓN ES DEL CASO DE USO Y NO DEL REPOSITORIO
    -------------------------------------------------------------
    Porque el régimen ATÓMICO de auditoría lo exige: en una escritura de negocio, el evento
    va en la MISMA transacción que el cambio. Si el registro se escribiera en una transacción
    propia del repositorio de auditoría, existiría el estado «cambio aplicado, log perdido»,
    que es justo el que no puede existir. Y al revés: si Postgres no responde, no hay cambio
    que perder, así que el coste de disponibilidad de esta garantía es CERO.

    `confirmar()` explícito, sin autocommit al salir. Un commit implícito convierte cualquier
    `return` temprano en una escritura parcial confirmada.
    """

    def __enter__(self) -> "UnidadDeTrabajo": ...

    def __exit__(
        self,
        tipo: type[BaseException] | None,
        valor: BaseException | None,
        traza: TracebackType | None,
    ) -> None: ...

    def confirmar(self) -> None: ...

    def revertir(self) -> None: ...
