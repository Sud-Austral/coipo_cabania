"""Correo y avisos. El dominio no redacta textos ni conoce destinatarios."""

from typing import Mapping, Protocol


class Notificador(Protocol):
    """Envía una PLANTILLA identificada con unos datos. Nunca un cuerpo de texto libre.

    POR QUÉ PLANTILLA Y NO CUERPO
    -----------------------------
    1. Un cuerpo armado en el caso de uso es un sitio más donde se concatenan datos
       personales, y ese texto acaba en el log del transporte, fuera de la retención.
    2. Con la plantilla identificada, el evento de auditoría registra QUÉ se notificó sin
       registrar el contenido: `plantilla: "tramite_rechazado"` es contable y no es PII.
    3. El texto lo revisa quien corresponde, en un archivo, y no está repartido en f-strings.

    `destinatario` es la dirección, y por eso este puerto NO se llama desde el dominio: es el
    caso de uso quien la resuelve, y quien decide si va dentro o fuera de la transacción.

    QUE ESTÉ FUERA DE LA TRANSACCIÓN NO ES UN DETALLE
    -------------------------------------------------
    En `COIPO_ENTREGA_PLANTA` el envío ocurre HOY dentro de la transacción, y su peor caso
    son ~66 s (3 intentos con timeout de 20 s más esperas de 2 y 4 s). Ese es el motivo real
    de que `idle_in_transaction_session_timeout` esté en 120 s y no en 60: un techo más bajo
    mataría la conexión justo antes del commit y convertiría un 502 explicable en un 503
    genérico. Cuando el envío salga de la transacción, ese presupuesto puede bajar.
    """

    def notificar(
        self, destinatario: str, plantilla: str, datos: Mapping[str, str]
    ) -> None: ...
