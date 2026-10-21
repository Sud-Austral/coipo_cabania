"""Objetos de valor del dominio: normalizaciones que se prueban en microsegundos.

Todo lo de este archivo es función pura sobre `str`/`int` y se prueba sin base de datos, sin
FastAPI y sin dobles. Es el nivel L1 de la pirámide (55 % de los tests, < 5 s la capa
entera): si algo de aquí necesita un fixture, está en el archivo equivocado.
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass

from app.dominio.errores import DatoInvalido

# --------------------------------------------------------------------------------- roles
# El IAM devuelve el rol tal como lo tecleó un administrador en su panel. Está MEDIDO que
# no llega normalizado: el doble `IamFalso` de los tests devuelve "Encargado" con mayúscula
# a propósito, porque el IAM real lo hace. Comparar `rol == "encargado"` contra ese valor es
# un 403 para un usuario legítimo, sin una sola línea de error en ningún log.
#
# Se normaliza en UN solo sitio —aquí— y no en cada comparación, porque la comparación que
# se olvide de normalizar es justo la que nadie va a probar.


def normalizar_rol(bruto: str | None) -> str:
    """minúsculas, sin tildes, sin espacios de sobra, espacios internos -> guion bajo.

    'Encargado Gerencia ' -> 'encargado_gerencia'. Un rol vacío devuelve '' y NO levanta:
    quien decide qué hacer con un usuario sin rol es la política de autorización, según
    `iam.rol_sin_asignacion` de la ficha, que no tiene default implícito.
    """
    if not bruto:
        return ""
    sin_tildes = unicodedata.normalize("NFKD", bruto.strip().lower())
    sin_tildes = "".join(c for c in sin_tildes if not unicodedata.combining(c))
    return re.sub(r"[\s\-]+", "_", sin_tildes)


# ------------------------------------------------------------------------------- correos
_CORREO = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


@dataclass(frozen=True, slots=True)
class CorreoInstitucional:
    """Correo de un funcionario. Clasificación `ci` (contacto institucional), no `dd`.

    Se normaliza a minúsculas porque es la llave con la que se cruza contra el IAM y contra
    el log; dos filas con el mismo correo en distinta caja son dos actores distintos para
    cualquier consulta de auditoría, y esa divergencia no se nota hasta que hay que contar.

    NO valida el dominio contra una lista (`@conaf.cl`): hay unidades que operan con correos
    de convenio, y una lista de dominios en el código es una lista que alguien mantiene mal.
    """

    valor: str

    def __post_init__(self) -> None:
        if not _CORREO.match(self.valor):
            # El valor NO viaja en el mensaje: es un dato personal y este mensaje termina en
            # la respuesta HTTP y, si alguien se descuida, en el log del contenedor.
            raise DatoInvalido("El correo no tiene un formato válido")
        if self.valor != self.valor.strip().lower():
            raise DatoInvalido("El correo debe venir normalizado a minúsculas y sin espacios")

    @staticmethod
    def normalizar(bruto: str) -> "CorreoInstitucional":
        return CorreoInstitucional(bruto.strip().lower())

    def __str__(self) -> str:
        return self.valor


# ---------------------------------------------------------------------------- paginación
@dataclass(frozen=True, slots=True)
class Paginacion:
    """Página y tamaño ya validados. D-32 fija la forma de la RESPUESTA; esto es la petición.

    El tope de 200 no es estético: sin él, `?por_pagina=100000` sobre una tabla con datos
    personales es una exportación masiva disfrazada de listado, que además no pasa por el
    régimen CRÍTICO de auditoría que sí exige la ruta de exportación.
    """

    pagina: int = 1
    por_pagina: int = 25

    TOPE_POR_PAGINA = 200

    def __post_init__(self) -> None:
        if self.pagina < 1:
            raise DatoInvalido("La página empieza en 1")
        if not 1 <= self.por_pagina <= self.TOPE_POR_PAGINA:
            raise DatoInvalido(f"por_pagina debe estar entre 1 y {self.TOPE_POR_PAGINA}")

    @property
    def desplazamiento(self) -> int:
        return (self.pagina - 1) * self.por_pagina


# ------------------------------------------------------------------ destino de redirección
def destino_seguro(destino: str | None, por_defecto: str = "/") -> str:
    """Devuelve una ruta INTERNA segura, o `por_defecto`.

    Es la defensa contra open redirect del flujo de login, y vive en el dominio (no en el
    router) por dos razones: es una regla pura que se prueba en L1 sin levantar la app, y es
    una de las ocho mutaciones obligatorias del gate (`open_redirect` en `mutaciones.yml`).

    Se rechaza todo lo que no empiece por una sola barra:
      * `//evil.cl` — el navegador lo trata como URL absoluta protocol-relative;
      * `/\\evil.cl` — la barra invertida la normalizan algunos navegadores a barra;
      * `http://…`, `https://…`, `javascript:…` — absolutas;
      * cualquier cosa con salto de línea, que permitiría inyectar cabeceras.
    """
    if not destino:
        return por_defecto
    if "\n" in destino or "\r" in destino or "\x00" in destino:
        return por_defecto
    if not destino.startswith("/"):
        return por_defecto
    if destino.startswith("//") or destino.startswith("/\\"):
        return por_defecto
    return destino
