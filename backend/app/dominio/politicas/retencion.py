"""Los tres estratos de retención, como funciones puras (D-22).

QUÉ ARREGLA ESTE ARCHIVO, MEDIDO
--------------------------------
1. `COIPO_ENTREGA_PLANTA/backend/app/config.py:211-213` tiene hoy `log_retencion_anios = 2`
   y `anonimizacion_anios = 5`: el log que prueba QUIÉN aceptó la solicitud 1234 se borra
   TRES AÑOS ANTES de que la solicitud 1234 se desidentifique. Si Contraloría audita en el
   año 4, el acto existe y la evidencia de quién lo decidió no. Los dos jobs corren verdes.
   De ahí `validar_plazos()`, que se ejecuta al arrancar y en CI.

2. `corte = ahora.replace(year=ahora.year - anios)` revienta con `ValueError` un 29 de
   febrero. Hoy no ocurre por accidente del cron (corre el día 1). El día que alguien
   cambie el cron o lance la purga a mano un 29-F, la purga legal falla — y falla en el
   scheduler, donde nadie mira. De ahí `fecha_de_corte()`, con test parametrizado sobre
   2028-02-29.

Nada de este archivo toca la base ni el reloj: el instante llega por parámetro, desde el
`ContextoDeEjecucion`. Un `datetime.now()` aquí sería una regla que no se puede probar.
"""

from __future__ import annotations

import calendar
from datetime import datetime, timedelta
from enum import StrEnum

from app.dominio.errores import DatoInvalido


class Estrato(StrEnum):
    """Las mismas tres palabras que el CHECK de `catalogo_evento.retencion` y que
    `catalogos/retencion.yaml`. No «tecnico» aquí y «tecnica» allá: la deriva de
    vocabulario que este patrón existe para deshacer empieza siempre así."""

    TECNICA = "tecnica"  # IP cruda y user-agent completo. 90 días
    PII = "pii"          # datos personales de negocio. 5 años
    ACTO = "acto"        # acto administrativo. 6 años [plazo a VERIFICAR con jurídica]


def fecha_de_corte(ahora: datetime, *, anios: int = 0, dias: int = 0) -> datetime:
    """El instante antes del cual una fila ya venció. Nunca levanta por el calendario.

    Restar años con `replace(year=...)` falla el 29 de febrero de un año bisiesto cuando el
    año destino no lo es (2028-02-29 menos 5 años = 2023-02-29, que no existe). Aquí se
    ajusta al último día del mes destino: 2023-02-28. Perder un día en el corte de una purga
    a cinco años es intrascendente; que la purga legal levante `ValueError` en el scheduler,
    no.
    """
    if anios < 0 or dias < 0:
        raise DatoInvalido("Los plazos de retención no pueden ser negativos")
    if anios == 0 and dias == 0:
        raise DatoInvalido("Un plazo de retención de cero borraría todo en el acto")
    corte = ahora
    if anios:
        destino = corte.year - anios
        ultimo_dia = calendar.monthrange(destino, corte.month)[1]
        corte = corte.replace(year=destino, day=min(corte.day, ultimo_dia))
    if dias:
        corte = corte - timedelta(days=dias)
    return corte


def validar_plazos(*, tecnica_dias: int, pii_anios: int, acto_anios: int) -> None:
    """Invariante duro: RETENCIÓN DEL ACTO >= RETENCIÓN DE LOS DATOS DEL TITULAR.

    Se comprueba al arrancar y en CI, no solo al escribir la ficha, porque los plazos se
    pueden cambiar en el `.env` del servidor sin pasar por el repositorio. Si el log del
    acto muere antes que el expediente, el organismo se queda con actos administrativos sin
    autor acreditable, y eso no se puede reconstruir después.
    """
    if tecnica_dias < 1:
        raise DatoInvalido("El estrato técnico necesita al menos un día de retención")
    if pii_anios < 1 or acto_anios < 1:
        raise DatoInvalido("Los estratos PII y acto se miden en años completos")
    if acto_anios < pii_anios:
        raise DatoInvalido(
            f"RETENCION_ACTO_ANIOS ({acto_anios}) es menor que RETENCION_PII_ANIOS "
            f"({pii_anios}): el registro que prueba quién decidió moriría antes que el "
            f"expediente que documenta lo decidido"
        )
    if tecnica_dias > pii_anios * 365:
        raise DatoInvalido(
            f"RETENCION_TECNICA_DIAS ({tecnica_dias}) supera el estrato PII: la IP cruda "
            f"sobreviviría a los datos del titular, que es lo contrario de lo que el "
            f"estrato técnico existe para conseguir"
        )


def vencidos_al(estrato: Estrato, ahora: datetime, *, tecnica_dias: int, pii_anios: int,
                acto_anios: int) -> datetime:
    """La fecha de corte que le toca a un estrato. Un solo sitio decide qué plazo aplica.

    Cada job de retención pregunta aquí en vez de calcular su propio corte: cuando cada job
    hace su propia cuenta, el día que cambia un plazo alguien actualiza dos de los tres.
    """
    validar_plazos(tecnica_dias=tecnica_dias, pii_anios=pii_anios, acto_anios=acto_anios)
    if estrato is Estrato.TECNICA:
        return fecha_de_corte(ahora, dias=tecnica_dias)
    if estrato is Estrato.PII:
        return fecha_de_corte(ahora, anios=pii_anios)
    return fecha_de_corte(ahora, anios=acto_anios)
