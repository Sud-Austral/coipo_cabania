# Versión 6 — cierre funcional de la maqueta

Esta versión reemplaza acciones demostrativas por operaciones persistentes en `localStorage`.

## Administración

- Crear, editar, activar y desactivar inmuebles.
- Editar capacidad, dormitorios, equipamiento, fotos y zonas de interés.
- Impedir la desactivación de inmuebles con reservas confirmadas vigentes o futuras.
- Editar todas las tarifas y su vigencia; las nuevas simulaciones y reservas consumen esa configuración.
- Crear, editar, activar y desactivar usuarios, con control de RUT duplicado y protección contra la autodesactivación.
- Importar nómina CSV, validar campos obligatorios y duplicados, y mostrar errores por fila.
- Guardar parámetros de anticipación, desistimiento y fuerza mayor; estas reglas se aplican al reservar/anular.
- Mantener temporadas, bloqueos y auditoría existentes.

## Oficina Central

- Preparar cobros sin duplicarlos, aprobarlos u observarlos.
- Resolver incidencias con fundamento obligatorio.
- Cerrar un caso sin sanción o crear una sanción vinculada al titular.
- Mantener el circuito de revisión de fuerza mayor, nóminas y reportes.

## Alcance

Es una maqueta funcional sin backend: los datos permanecen en el navegador hasta usar “Reiniciar demostración”. La autenticación real, almacenamiento binario de archivos, correo y conexión con Remuneraciones corresponden a la etapa backend/integraciones.
