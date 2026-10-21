"""El reloj como puerto. Tres líneas de código y la mitad de los tests deterministas."""

from datetime import datetime
from typing import Protocol


class Reloj(Protocol):
    """Devuelve SIEMPRE un `datetime` con zona horaria, en UTC.

    Existe para que las reglas con fecha —vencimientos, retención, topes por año— se prueben
    sin esperar y sin `freezegun`. `grep -rn "datetime.now(" app/dominio app/aplicacion` tiene
    que devolver CERO líneas: esa es toda la documentación que hace falta sobre este puerto.

    UTC y no America/Santiago: el cambio de horario chileno mueve el corte de un job de
    retención una hora dos veces al año, y en un job que corre a las 03:50 eso cae dentro de
    la hora que se repite en otoño. La conversión a hora local es cosa de la presentación.
    """

    def ahora(self) -> datetime: ...
