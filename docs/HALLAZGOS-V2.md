# Hallazgos en la lógica heredada de per_red_casas

La lógica de `frontend/src/logica/` es copia de `per_red_casas` y **no se cambió** (salvo lo
indicado en el punto 1). Lo que sigue se anota para decidirlo con Bienestar o en la fase 2;
ninguno se corrigió en silencio.

| # | Dónde | Qué pasa | Efecto | Estado |
|---|---|---|---|---|
| 1 | `logica/api/store.js` (`CLAVE`) | v1 guardaba en `localStorage['coipo_demo_v3']`. Si v1 y v2 se sirven en el mismo origen (Forge LAB, `/lab/...`), una maqueta pisaría los datos de la otra. | Datos cruzados entre maquetas. | **Cambiado** a `cabanas_v2_demo_v1`. No toca ninguna regla. |
| 2 | `logica/api/reservas.js` → `crearReserva` y v1 `pages/admin/ReglasReserva.jsx` | La API aplica `anticipacion_minima = 0` mientras nadie guarde las reglas; la pantalla de v1 mostraba **2** como valor predeterminado. | El administrador veía una regla que no se aplicaba. | v2 muestra el valor que de verdad aplica la API (`nucleo/parametros.js`). Falta decidir el valor oficial. |
| 3 | `logica/api/reservas.js` → `anularReserva` | La política de cancelación (cobro total con menos de 7 días de aviso) se aplica también a solicitudes **por confirmar** y **en lista de espera**, que nunca se confirmaron. | Quien retira una solicitud no confirmada a menos de 7 días paga la estadía completa. | Preguntar a Bienestar si es la regla buscada. |
| 4 | `logica/api/reservas.js` → `simularTarifa` | No recibe `aplicaTarifaSindicato`; `crearReserva` sí. | El valor que ve la encargada en la reserva manual podría diferir del guardado para un socio del sindicato. Hoy no se nota: la tarifa sindicato es igual a la de afiliado. | Pendiente fase 2. |
| 5 | `logica/lib/tarifas.js` → `calcularTarifa` | Recorre las noches con `parseISO(...)` (medianoche local) y `toISOString().slice(0, 10)` (UTC). | En husos horarios **positivos** (UTC+) cada noche se corre un día y la temporada puede salir mal. En Chile (UTC−3/−4) no ocurre. | Pendiente fase 2 (el backend debe trabajar con fechas sin hora). |
| 6 | `logica/api/reservas.js` → `anularReserva` | Al liberarse cupo se avisa a la solicitud en espera **más antigua**, no a la de mayor prioridad (salud > trabajo > descanso). Ya estaba anotado en v1 como hallazgo #5. | La encargada decide igual; v2 ordena la lista de espera por prioridad en pantalla. | Abierto. |
| 7 | v1 `pages/publico/MisReservas.jsx` (pantalla, no lógica) | El cobro estimado al cancelar usaba 7 días fijos e ignoraba la regla del administrador. | Estimación distinta del cobro real tras cambiar la regla. | v2 usa la regla vigente. |
| 8 | `logica/fixtures/reservas.seed.js` | Las semillas están fechadas para octubre de 2026: hay estadías «en curso» cuya salida ya pasó (p. ej. R-2026-0005, salida 9 oct). | Solo de presentación. | Sin cambio. |
