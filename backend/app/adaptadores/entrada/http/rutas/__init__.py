"""Un módulo por recurso. `salud.py` es plataforma; el resto lo escribe el proyecto.

Los guards van en el `APIRouter` o en el `include_router` de `ensamblado.py`, nunca
repetidos endpoint por endpoint: así no hay forma de añadir un endpoint nuevo y olvidarse
del control de acceso. Es lo que ya hace `coipo_prensa2/backend/app/main.py`, y es la razón
por la que su test de guards puede ser exhaustivo.
"""
