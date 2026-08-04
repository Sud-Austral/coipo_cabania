# coipo_cabania
go2


Estimado/a [Nombre / Empresa]:

Junto con saludar, y en el marco de la continuidad del Sistema de Trazabilidad de Transporte Forestal actualmente en plan piloto en el sur de Chile, CONAF asumirá directamente la operación y mantención del sistema, desplegándolo en su propia infraestructura. Para realizar esta migración sin interrumpir el piloto en curso, necesito coordinar con ustedes el traspaso de los datos y componentes que hoy residen en el ambiente de producción.

En concreto, agradeceré nos faciliten lo siguiente:

1. Datos del piloto (base de datos de producción)
Un respaldo completo de la base de datos PostgreSQL de producción (chile_prod), preferentemente un pg_dump en formato custom o SQL. Alternativamente, credenciales de solo lectura temporales para que nuestro equipo genere el respaldo directamente. Estos registros corresponden a la operación del piloto de CONAF (permisos, ítems, controles, tracks y usuarios).

2. Archivos almacenados fuera de la base de datos
Dado que la aplicación guarda ciertos archivos en el sistema de archivos del servidor y no en la base de datos, solicito también:

Las fotografías de los permisos/ítems cargadas por los fiscalizadores.
Los tracks GPS/GPX de los transportes, si se almacenan como archivos.
Los archivos APK publicados de la aplicación móvil. (Todo lo que resida bajo el directorio de almacenamiento de la aplicación, referenciado en el código como PHOTO_DIR.)
3. Estado del esquema de base de datos
Confirmación de la versión del esquema actualmente en producción: qué migraciones (Flyway) están aplicadas y si existe alguna modificación en producción que no esté reflejada en el repositorio, para poder replicar el esquema de forma idéntica.

4. Continuidad de la aplicación móvil (deseable)
El keystore de firma de release de Android (.keystore/.jks) junto con sus contraseñas (store, alias y key). Esto nos permitiría publicar futuras versiones del APK manteniendo la misma firma, de modo que los dispositivos ya desplegados en terreno reciban las actualizaciones sin necesidad de reinstalar la aplicación.

Consideraciones de entrega: dado que el respaldo contiene datos personales (nombres de conductores, patentes, usuarios del sistema), solicito que la entrega se realice por un canal seguro (enlace cifrado, medio físico o transferencia protegida) y no por correo en texto plano.

Quedo a disposición para coordinar una reunión de traspaso técnico que facilite el proceso. Agradezco de antemano su colaboración.

Saludos cordiales,
