"""Capa 1 — DOMINIO. CERO imports de infraestructura.

Prohibido aquí dentro, y lo verifica `j02` recorriendo el AST (no con `grep`, y sin
importar el módulo: un `ImportError` dentro del dominio se confundiría con «no importa nada
prohibido» y el test pasaría por el motivo equivocado):

    fastapi  starlette  sqlalchemy  psycopg2  httpx  boto3  pydantic  pydantic_settings
    itsdangerous  jose  os  app.adaptadores  app.composicion  app.main

Los imports RELATIVOS (`from ..adaptadores import x`) también están prohibidos en esta capa:
sin esa regla, un import relativo esquiva el chequeo y el juez miente.

`os` está en la lista por una razón concreta: `os.getenv` en el dominio es una regla de
negocio que cambia según la máquina donde corre, y eso no se puede probar ni auditar. Los
valores llegan por parámetro, desde `composicion/`.

`datetime.now()` no aparece en ningún archivo de esta capa. El instante entra siempre por el
`ContextoDeEjecucion`; si no, la regla de retención de seis años necesita seis años para
probarse.
"""
