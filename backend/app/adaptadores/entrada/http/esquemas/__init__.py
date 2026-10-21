"""Pydantic v2, SOLO en el borde.

Un esquema de pydantic no baja nunca a `aplicacion/` ni a `dominio/`: es el formato del
mensaje, no el modelo. snake_case en todos los campos (D-02): camelCase exigiría un
`alias_generator` que alguien olvidará, y el fallo sería un `undefined` en el navegador sin
un solo error en ningún log.
"""
