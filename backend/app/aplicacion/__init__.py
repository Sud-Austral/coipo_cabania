"""Capa 2 — APLICACIÓN. Solo `dominio/` y sus propios puertos.

Prohibido (lo verifica `j02`): fastapi, starlette, sqlalchemy, psycopg2, httpx y
`app.adaptadores`. Un caso de uso que importa un adaptador ya no se puede probar sin
levantar ese adaptador, que es la forma habitual de que las reglas de negocio acaben
probándose únicamente en el nivel más lento de la pirámide.

Aquí no hay transacciones de SQLAlchemy ni sesiones HTTP: hay una `UnidadDeTrabajo` y unos
`Protocol`. El adaptador decide CÓMO; el caso de uso decide CUÁNDO.
"""
