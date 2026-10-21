"""Motor, ledger de migraciones, tablas del ORM y repositorios.

Cinco variables de conexión, nunca `DATABASE_URL` del entorno. Los presupuestos de tiempo
se aplican en `get_db()` y jamás en `connect_args` (D-17). `Base.metadata.create_all()` no
existe en este árbol y `j07` lo comprueba con AST.
"""
