"""Capa 5 — COMPOSICIÓN. Conoce a todos; nadie la conoce.

Es el único paquete que puede importar a la vez `dominio/`, `aplicacion/` y `adaptadores/`.
Nada del árbol importa `composicion/` salvo `main.py` y las tareas del scheduler: si un
caso de uso importara el contenedor, la inyección de dependencias sería decorativa y el
doble de test no tendría por dónde entrar.
"""
