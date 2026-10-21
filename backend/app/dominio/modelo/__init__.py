"""Las entidades y los objetos de valor. Frozen dataclasses, sin ORM.

`Mapped[]`/`mapped_column` viven en `adaptadores/salida/postgres/tablas.py` (D-14). Esa
separación es exactamente lo que permite que el dominio no importe SQLAlchemy — y el punto
de partida medido dice que hoy no es así en ningún repo de la flota: en
`COIPO_ENTREGA_PLANTA`, `grep -l sqlalchemy backend/app/services/*.py` devuelve 11 de 20.
`services/` no es un núcleo puro: es una capa de servicios sobre el ORM.
"""
