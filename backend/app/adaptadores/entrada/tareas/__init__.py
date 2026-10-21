"""Entradas del scheduler (supercronic). Un módulo ejecutable por tarea.

Son adaptadores de ENTRADA igual que HTTP: alguien de fuera —el cron— empuja. Construyen su
propio contenedor, llaman a un caso de uso y terminan con un código de salida.

TRES REGLAS QUE VIENEN DE FALLOS MEDIDOS
----------------------------------------
1. NO usan `get_db()`: los presupuestos de petición (statement_timeout 30 s) harían fallar
   la purga legal todos los meses en silencio en cuanto el volumen creciera (D-17).
2. Registran TAMBIÉN el fallo, y FUERA de la transacción. Hoy `anonimizacion.py` y
   `purga_logs.py` de `COIPO_ENTREGA_PLANTA` registran solo el camino feliz, dentro de la
   misma transacción con `except: rollback; raise`: si el job falla no queda ni una fila, y
   la bitácora de retención no puede distinguir «no había nada que hacer» de «lleva un año
   reventando».
3. La prueba de que la retención corrió va a `retencion_ejecucion`, que no se purga a sí
   misma. Hoy ese evento vive en `log_auditoria`, que se purga a los 2 años: a los 2 años
   desaparece la evidencia de que la purga ocurrió. Nada falla y nada avisa.
"""
