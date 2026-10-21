"""Reglas que no pertenecen a una sola entidad: autorización y retención.

Son funciones puras sobre argumentos visibles. Que no lean estado ambiental es lo que hace
que una mutación de la regla de ámbito muera contra un test de 3 milisegundos en vez de
sobrevivir hasta producción.
"""
