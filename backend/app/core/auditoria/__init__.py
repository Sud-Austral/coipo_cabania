"""Nucleo de auditoria. CONGELADO: su sha256 esta en semilla.lock y la app no lo edita.

Sin el candado, una IA que no consigue poner verde un test de contrato lo "arregla"
borrandolo, y el mismo dia desaparece la evidencia que este paquete existe para producir.

QUE HAY AQUI Y EN QUE ORDEN SE LEE
----------------------------------
  eventos.py           el catalogo cerrado. GENERADO desde catalogos/eventos.yaml. Es el
                       primer cerrojo: `registrar()` no acepta un string, solo un `Evento`.
  clasificacion.py     el catalogo de columnas y las cuatro preguntas: `es_pii()`,
                       `claves_permitidas_en_log()`, `claves_sensibles_en_salida()`,
                       `campos_a_desidentificar()`. Reemplaza las tres listas duplicadas.
  contexto_forense.py  el ContextVar con ip / user_agent / request_id, y la REGLA CONTEXTO-1.
  registro.py          `registrar()` con los cuatro regimenes.
  respaldo.py          el JSONL append-only que hace defendible el best-effort.
  middleware_acceso.py ASGI puro, una fila en `log_acceso` por peticion.

DEPENDENCIAS
------------
Biblioteca estandar y SQLAlchemy. Ningun modulo importa FastAPI; `middleware_acceso` importa
`anyio`, que no es una dependencia nueva (llega con starlette) y que se usa por el limitador
de hilos que trae, no por comodidad.

NO SE IMPORTA NADA AQUI A PROPOSITO
-----------------------------------
Este `__init__` esta vacio de codigo: importar `registro` desde aqui arrastraria SQLAlchemy a
cualquiera que solo quisiera `clasificacion`, y un test de dominio que importe el paquete
dejaria de ser una prueba de milisegundos sin base de datos. Cada modulo se importa por su
nombre completo.
"""
