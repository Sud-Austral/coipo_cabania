"""El contenedor: dónde se eligen las implementaciones de los puertos.

ESTE ES EL ÚNICO SITIO DEL ÁRBOL QUE PUEDE CONOCERLO TODO
=========================================================
`tests/arquitectura/test_capas.py` prohíbe que el dominio y la aplicación
importen infraestructura. Ese aislamiento sólo sirve si existe UN lugar que hace
el cableado, y es este. Si aparece un segundo, la regla se vuelve decorativa:
alguien instancia el adaptador de Postgres dentro de un caso de uso y el test de
capas no lo ve porque el import está en la capa correcta.

POR QUÉ `construir()` ACEPTA SUSTITUCIONES
==========================================
Sin ellas ningún test puede poner un doble del IAM, y toda la suite acabaría
hablando con el proveedor de identidad real: en el mejor caso lenta y frágil, en
el peor creando sesiones contra un IdP de producción desde el CI.

La firma la exige la semilla y la comprueba `tests/conftest.py`:

    construir(ajustes, **sustituciones) -> Contenedor

MAGICMOCK ESTÁ PROHIBIDO EN LAS CAPAS L1 Y L2, y este contenedor es la razón de
que se pueda cumplir: un `MagicMock` acepta cualquier método con cualquier
firma, así que un caso de uso que llame a un método inexistente pasa en verde.
Los dobles del arnés (`IamFalso`, `RelojFalso`…) se verifican contra el
`Protocol` del puerto con `verificar_doble()`.
"""

from __future__ import annotations

from dataclasses import dataclass, replace
from typing import Any

from app.composicion.ajustes import Ajustes


@dataclass(frozen=True, slots=True)
class Contenedor:
    """Las implementaciones elegidas para esta ejecución.

    Es `frozen` a propósito: un contenedor mutable invita a que alguien
    reemplace un adaptador a mitad de una petición, y entonces dos peticiones
    concurrentes usan implementaciones distintas sin que nada lo diga. Para
    sustituir en un test está `construir(..., identidad=doble)`, que devuelve un
    contenedor nuevo.

    Los puertos que esta semilla deja en `None` los rellena cada aplicación en
    su propio `construir()`. `None` no es "no hace falta": es "todavía no se
    eligió", y quien lo use se encuentra un `AttributeError` en el sitio exacto,
    que es mejor que un doble silencioso que devuelve lo que sea.
    """

    ajustes: Ajustes
    identidad: Any = None          # ProveedorDeIdentidad — el IAM
    reloj: Any = None              # Reloj — UTC con tzinfo, siempre
    auditoria: Any = None          # Auditor — el registro inmutable
    repositorios: Any = None
    unidad_de_trabajo: Any = None
    notificacion: Any = None
    archivos: Any = None


def construir(ajustes: Ajustes, **sustituciones: Any) -> Contenedor:
    """Arma el contenedor de esta ejecución.

    Las `sustituciones` ganan siempre sobre lo que se elegiría por defecto. Es
    deliberado y es el orden correcto: un test que pide un doble tiene que
    obtenerlo aunque la implementación real esté disponible, o el aislamiento
    depende de que la infraestructura esté caída.
    """
    desconocidas = set(sustituciones) - set(Contenedor.__slots__)
    if desconocidas:
        # Ruidoso a propósito, y por la misma razón que `additionalProperties:
        # false` en la ficha: una sustitución con el nombre mal escrito se
        # aceptaría en silencio, el doble no se usaría, y el test seguiría verde
        # hablando con la implementación real.
        raise TypeError(
            f"sustituciones que el contenedor no conoce: {sorted(desconocidas)}. "
            f"Conocidas: {sorted(set(Contenedor.__slots__) - {'ajustes'})}"
        )

    base = Contenedor(ajustes=ajustes, **_por_defecto(ajustes))
    return replace(base, **sustituciones) if sustituciones else base


def _por_defecto(ajustes: Ajustes) -> dict[str, Any]:
    """Las implementaciones reales.

    La semilla no elige ninguna: no sabe qué repositorios ni qué notificador
    necesita la aplicación que se construya sobre ella. Cada proyecto rellena
    esto importando sus adaptadores —y este es el único archivo del árbol donde
    ese import es legal.
    """
    del ajustes  # lo usará cada aplicación para elegir sus adaptadores
    return {}
