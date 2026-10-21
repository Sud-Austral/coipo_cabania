"""Los repositorios, nombrados por INTENCIÓN del negocio y no por operación de base.

LA REGLA DE NOMBRES
-------------------
Un método de repositorio dice qué quiere el negocio y qué garantía trae. `obtener()`,
`guardar()`, `borrar()` repetidos en cinco repositorios es un CRUD con una carpeta llamada
`dominio/`: no dice si bloquea, no dice si filtra por ámbito, no dice si es idempotente, y
cuando algo de eso importa hay que abrir el adaptador para saberlo.

Por eso `tomar_para_resolver()` y no `get_for_update()`: el primero dice para qué se toma,
el segundo cómo lo hace Postgres. Y el caso de uso queda legible para quien audita, que es
la persona que menos ganas tiene de leer SQLAlchemy.

EL AMBITO ENTRA COMO ARGUMENTO, SIEMPRE
---------------------------------------
`ambito` es el diccionario que devuelve `politicas.autorizacion.ambito_forzado(actor)`. Que
sea un parámetro obligatorio —y no algo que el repositorio deduzca de una sesión— es lo que
permite probar en L2, sin Postgres, que un `?gerencia_id=` del cliente no amplía lo que se
ve. Un repositorio que consulta la sesión por su cuenta solo se puede probar levantando la
aplicación entera.
"""

from typing import Mapping, Protocol, Sequence

from app.dominio.modelo.tramite import Tramite
from app.dominio.modelo.valores import Paginacion


class RepositorioDeTramites(Protocol):
    """=== EJEMPLO A SUSTITUIR ===  Un repositorio por AGREGADO, no por tabla.

    Que sea por agregado importa: si hubiera un `RepositorioDeMotivosDeRechazo` aparte,
    existiría la forma de escribir un motivo sin pasar por la transición que lo exige, y la
    regla del dominio dejaría de ser la única puerta.
    """

    def tomar_para_resolver(self, tramite_id: int) -> Tramite | None:
        """Lo bloquea para actualizarlo (`SELECT ... FOR UPDATE` en el adaptador).

        Devuelve `None` si no existe; NO levanta. Quién convierte «no existe» en 404 —y
        cuándo un ámbito ajeno se responde también como 404— es una decisión de
        autorización, no del acceso a datos.
        """

    def obtener_para_mostrar(self, tramite_id: int, *, ambito: Mapping[str, int]) -> Tramite | None:
        """Lectura sin bloqueo, ya filtrada por ámbito.

        Que el filtro venga aquí y no se aplique después sobre el resultado es deliberado:
        filtrar después significa que la fila ajena SÍ salió de la base y pasó por el
        proceso, y basta un `return` mal puesto para que salga también por la respuesta.
        """

    def listar(
        self,
        *,
        ambito: Mapping[str, int],
        paginacion: Paginacion,
        estado: str | None = None,
    ) -> tuple[Sequence[Tramite], int]:
        """Devuelve la página y el TOTAL (D-32: `{items, total, pagina, por_pagina}`).

        El total va aquí y no en una segunda llamada para que sea el mismo `WHERE` con el
        mismo ámbito: dos consultas con dos filtros construidos por separado divergen, y el
        síntoma es un paginador que promete páginas que devuelven vacío.
        """

    def registrar_nuevo(self, tramite: Tramite) -> Tramite:
        """Inserta y devuelve la entidad con su identificador asignado.

        Devuelve una instancia NUEVA porque `Tramite` es inmutable: mutarle el `id` al objeto
        que recibió sería la única forma de que el dominio dependiera de que el adaptador
        haga algo por debajo.
        """

    def actualizar(self, tramite: Tramite) -> None:
        """Persiste una entidad ya tomada con `tomar_para_resolver`.

        No hay `guardar()` que valga para las dos cosas: `INSERT` y `UPDATE` tienen fallos
        distintos (23505 contra 0 filas afectadas) y esconderlos tras un nombre común es
        cómo se llega a un `UPDATE` que no actualizó nada y no lo dijo.
        """
