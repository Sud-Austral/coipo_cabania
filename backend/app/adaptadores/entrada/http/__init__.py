"""El ÚNICO paquete del árbol que puede importar fastapi y starlette.

Lo que vive aquí traduce: cookie -> `Actor`, cuerpo JSON -> argumentos, `DominioError` ->
código HTTP, entidad -> respuesta. Ninguna decisión de negocio, ninguna consulta a la base
salvo el atajo declarado de la REGLA CRUD-1, que se escribe en la PRIMERA línea del módulo
que lo usa.
"""
