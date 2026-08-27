# COIPO Cabaña — Versión 2026.08.25.2

Base: versión 2026.08.25.1, derivada de la versión estable presentada a Negocio el 25-08-2026.

## Mejoras incorporadas

### 1. Disponibilidad visible desde la ficha del inmueble

- El calendario de la ficha inicial ahora muestra los mismos estados visuales que el calendario del Paso 1 de la solicitud.
- Rojo: ocupado por otra reserva.
- Amarillo: mantención o reparación.
- Gris: bloqueo de temporada.
- La validación por rango incorporada en 2026.08.25.1 se mantiene: no se habilita la solicitud si las fechas seleccionadas no están disponibles.

### 2. Pago por transferencia después del check-out

- Disponible para afiliados y usuarios no afiliados cuando la reserva queda `finalizada`.
- En `Mis reservas` aparece el botón `Pagar por transferencia`.
- Se agregó una pantalla de pago con:
  - monto total;
  - código de reserva como referencia;
  - datos bancarios demostrativos configurables en el store;
  - comprobante opcional;
  - botón `Enviar pago`.
- Al enviar el pago, la reserva queda con transferencia `informada`, pendiente de revisión de Oficina Central.
- Una vez confirmada, el usuario ve el estado `Pagada por transferencia`.

### 3. Confirmación por Oficina Central

- En `Nómina de descuentos por planilla` se agregó la sección `Transferencias por confirmar`.
- Oficina Central puede confirmar la transferencia mediante un botón por reserva.
- La confirmación registra usuario, fecha, monto y trazabilidad en auditoría.
- Una reserva pagada totalmente por transferencia queda excluida automáticamente de la nómina operativa y del CSV que se envía a Personal/Remuneraciones.

### 4. Integración con check-out

- Al realizar check-out de una reserva de afiliado con monto pendiente, el cobro se incorpora automáticamente a la nómina del mes si todavía no existe.
- Se corrigió la validación de anticipación que se estaba ejecutando erróneamente durante check-in/check-out; esa regla corresponde al momento de crear la reserva.

## Nota de maqueta

Los datos bancarios incluidos son demostrativos y deben reemplazarse por los datos oficiales antes de un uso operativo.
