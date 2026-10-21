"""Los puertos: `typing.Protocol`, uno por intención de salida.

POR QUÉ `Protocol` Y NO CLASES BASE ABSTRACTAS
----------------------------------------------
Con `Protocol` el adaptador no importa el puerto: la dirección de la dependencia queda
comprobada por el verificador de tipos y no por una herencia que además obligaría a
`adaptadores/` a importar `aplicacion/`. El doble de test implementa el protocolo y
revienta si le falta un método; un `MagicMock` acepta cualquier método con cualquier
firma, así que un caso de uso que llama a un método inexistente pasaría en verde — por eso
`MagicMock` está PROHIBIDO en los niveles L1 y L2.

CÓMO SE NOMBRA UN MÉTODO DE PUERTO
----------------------------------
Por la intención del negocio, no por la operación de base de datos. `obtener`, `crear`,
`actualizar`, `borrar` sobre cinco repositorios es un CRUD con una carpeta llamada
`dominio/`. El nombre correcto dice qué garantía trae: `tomar_para_resolver()` (que en
Postgres es un `SELECT ... FOR UPDATE`) frente a `obtener_para_mostrar()` (que no bloquea
nada). Quien lee el caso de uso tiene que poder ver la concurrencia sin abrir el adaptador.
"""
