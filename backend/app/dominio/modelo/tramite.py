"""=========================== EJEMPLO A SUSTITUIR ===========================

Este módulo NO es plataforma: es el ejemplo mínimo que hace legible el esqueleto. Se
borra entero en la fase 2 de un proyecto real y se reemplaza por sus entidades.

Lo que sí hay que conservar al reemplazarlo (esto es lo que el ejemplo enseña):

  1. La entidad es un `dataclass(frozen=True, slots=True)`: una transición DEVUELVE otra
     instancia en vez de mutar la que había. Así el caso de uso tiene a mano el valor
     ANTERIOR sin haberlo copiado a mano, que es justo lo que `valores_previos` necesita
     para un acto administrativo (CRUD-2), y así ningún adaptador puede cambiar el estado
     de una entidad por debajo.
  2. La máquina de estados es una TABLA, no una cadena de `if`. Una tabla se recorre en un
     test parametrizado y produce la lista de acciones válidas del mensaje de error; una
     cadena de `if` hay que leerla entera para saber qué falta.
  3. El ámbito (`gerencia_id`) es un campo de la entidad, no un parámetro de consulta. Lo
     que decide si un actor puede tocarla se compara contra este campo, del lado del
     servidor, y el query param del cliente no participa.
  4. Cero imports de infraestructura: ni fastapi, ni sqlalchemy, ni os, ni datetime.now().
     El instante llega SIEMPRE por el `ContextoDeEjecucion`, porque un `datetime.now()` en
     el dominio es una regla que no se puede probar sin esperar.

============================================================================"""

from __future__ import annotations

from dataclasses import dataclass, replace
from datetime import datetime
from enum import StrEnum

from app.dominio.errores import AmbitoAjeno, CampoObligatorioAusente, TransicionInvalida


class EstadoTramite(StrEnum):
    BORRADOR = "borrador"
    EN_REVISION = "en_revision"
    APROBADO = "aprobado"
    RECHAZADO = "rechazado"
    ARCHIVADO = "archivado"


class AccionTramite(StrEnum):
    ENVIAR = "enviar"
    DEVOLVER = "devolver"
    APROBAR = "aprobar"
    RECHAZAR = "rechazar"
    ARCHIVAR = "archivar"


# La máquina de estados, completa y en un solo sitio.
#
# APROBADO y RECHAZADO son TERMINALES salvo por `archivar`: un trámite resuelto no vuelve a
# revisión. Si el negocio necesitara reabrirlo, eso es una acción NUEVA (con su evento de
# auditoría y su motivo), no una transición inversa silenciosa — porque una reapertura sin
# rastro es indistinguible de que la primera resolución nunca hubiera ocurrido.
TRANSICIONES: dict[EstadoTramite, dict[AccionTramite, EstadoTramite]] = {
    EstadoTramite.BORRADOR: {
        AccionTramite.ENVIAR: EstadoTramite.EN_REVISION,
    },
    EstadoTramite.EN_REVISION: {
        AccionTramite.DEVOLVER: EstadoTramite.BORRADOR,
        AccionTramite.APROBAR: EstadoTramite.APROBADO,
        AccionTramite.RECHAZAR: EstadoTramite.RECHAZADO,
    },
    EstadoTramite.APROBADO: {
        AccionTramite.ARCHIVAR: EstadoTramite.ARCHIVADO,
    },
    EstadoTramite.RECHAZADO: {
        AccionTramite.ARCHIVAR: EstadoTramite.ARCHIVADO,
    },
    EstadoTramite.ARCHIVADO: {},
}

# Largo mínimo del motivo de un rechazo. No es un capricho de formulario: el motivo es la
# fundamentación del acto administrativo, y «no» no es una fundamentación. El número sale de
# la misma regla que la exportación de evidencia usa para `motivo` (>= 20 caracteres).
LARGO_MINIMO_MOTIVO = 20


def acciones_validas(estado: EstadoTramite) -> list[str]:
    """Las acciones posibles desde `estado`. Alimenta el mensaje de `TransicionInvalida`."""
    return sorted(a.value for a in TRANSICIONES[estado])


@dataclass(frozen=True, slots=True)
class Tramite:
    """Un trámite con su ámbito y su estado. Inmutable.

    `motivo_rechazo` es TEXTO LIBRE ESCRITO POR UN FUNCIONARIO SOBRE UNA PERSONA. Eso tiene
    dos consecuencias que hay que copiar al sustituir este ejemplo:

      * en el catálogo de clasificación se declara con `trato: supresion` y al vencer la
        retención se pone a NULL ENTERO. Redactar con expresiones regulares deja lo que la
        expresión no vio, y llamar a eso anonimización es falso;
      * NUNCA entra en el `detalle` de un evento de auditoría. En el log inmutable no lo
        alcanza la desidentificación, que solo puede tocar la tabla del titular.
    """

    id: int | None
    folio: str
    gerencia_id: int
    estado: EstadoTramite
    creado_en: datetime
    actualizado_en: datetime
    motivo_rechazo: str | None = None

    # ------------------------------------------------------------------ reglas de ámbito
    def exigir_ambito(self, gerencia_id_del_actor: int | None) -> None:
        """Levanta `AmbitoAjeno` si el actor no alcanza este trámite.

        `None` significa «sin restricción de ámbito» (el rol administrador o el auditor),
        y es explícito a propósito: un `if not gerencia_id` trataría igual al administrador
        y a la gerencia 0, que existe en cuanto alguien siembra un catálogo con id 0.
        """
        if gerencia_id_del_actor is None:
            return
        if gerencia_id_del_actor != self.gerencia_id:
            raise AmbitoAjeno()

    # ------------------------------------------------------------------- transiciones
    def _aplicar(self, accion: AccionTramite, ahora: datetime) -> "Tramite":
        destino = TRANSICIONES[self.estado].get(accion)
        if destino is None:
            raise TransicionInvalida(self.estado.value, acciones_validas(self.estado))
        return replace(self, estado=destino, actualizado_en=ahora)

    def enviar(self, ahora: datetime) -> "Tramite":
        return self._aplicar(AccionTramite.ENVIAR, ahora)

    def devolver(self, ahora: datetime) -> "Tramite":
        return self._aplicar(AccionTramite.DEVOLVER, ahora)

    def aprobar(self, ahora: datetime) -> "Tramite":
        return self._aplicar(AccionTramite.APROBAR, ahora)

    def rechazar(self, ahora: datetime, motivo: str) -> "Tramite":
        """El rechazo EXIGE motivo, y el motivo se valida ANTES de mover el estado.

        Si se validara después, un motivo corto dejaría el trámite rechazado sin
        fundamentación en la mitad de los caminos de error. El orden importa y por eso está
        escrito, no confiado a que el llamador lo haga bien.
        """
        motivo = (motivo or "").strip()
        if len(motivo) < LARGO_MINIMO_MOTIVO:
            raise CampoObligatorioAusente(
                "motivo", f"un rechazo se funda por escrito (mínimo {LARGO_MINIMO_MOTIVO} caracteres)"
            )
        movido = self._aplicar(AccionTramite.RECHAZAR, ahora)
        return replace(movido, motivo_rechazo=motivo)

    def archivar(self, ahora: datetime) -> "Tramite":
        return self._aplicar(AccionTramite.ARCHIVAR, ahora)
