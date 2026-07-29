# Guión de la demostración — reunión con Bienestar

Recorrido sugerido de la maqueta, con lo que conviene decir en cada pantalla y las
preguntas que cada una debería gatillar. Duración estimada: **20 a 25 minutos** de
demostración, dejando el resto de la reunión para las decisiones de negocio
(`CLAUDE.md` → «Preguntas para Bienestar»).

**Antes de empezar:** abrir la maqueta, dejar el perfil en *Afiliado/a* y, si se hicieron
pruebas antes, pulsar **Reiniciar demostración** (pie de página) para volver al estado
inicial.

**Advertencia que conviene decir una sola vez, al inicio:** todo lo que se ve son datos
de ejemplo —fotos de referencia, tarifas tentativas, personas y RUT inventados—. Lo que
se valida hoy es **cómo funciona el sistema**, no los datos.

---

## 1. Apertura (2 min)

**Qué mostrar:** el catálogo con los 34 inmuebles.

> «Esto es una maqueta navegable del sistema. Todavía no tiene base de datos ni
> correos: sirve para que ustedes vean los casos de uso funcionando y nos digan si
> el proceso quedó bien representado antes de construirlo de verdad.»

Señalar el **selector de perfil** arriba a la derecha: con él se recorre la experiencia
de los cinco perfiles del documento (afiliado, no afiliado, encargada regional, Oficina
Central y administrador).

---

## 2. El afiliado busca y explora (4 min)

**Ruta:** Catálogo → filtrar por región Atacama → *Casa de Veraneo Bahía Inglesa 1*.

Mostrar en orden:

1. **Filtros**: región, tipo de inmueble, capacidad y búsqueda por nombre.
2. **Ficha**: galería, descripción, capacidad, equipamiento y condiciones de uso.
3. **Mapa**: ubicación real sobre OpenStreetMap (componentes abiertos, sin licencias).
4. **Zonas de interés**: playas, salud, servicios y transporte con distancias.
5. **Calendario de disponibilidad**: días ocupados, en mantención y bloqueados.

> «Hoy el afiliado tiene que escribir un correo para saber si hay cupo. Acá lo ve en
> línea, con la información del inmueble y su entorno.»

**Preguntas que gatilla:** ¿quién mantendrá las fotos y descripciones actualizadas
(pregunta 22)? ¿Hay horarios estándar de check-in y check-out (13)?

---

## 3. Reserva de punta a punta (6 min) — *el momento central*

**Ruta:** botón «Solicitar reserva» en la misma ficha.

- **Paso 1 — Fechas y motivo.** Elegir un rango; los días no disponibles están
  deshabilitados. Al elegir motivo, mencionar el orden de prelación.
- **Paso 2 — Ocupantes.** Marcar al cónyuge desde el grupo familiar y agregar un
  acompañante externo. **Demostrar la validación**: agregar acompañantes hasta pasar
  la capacidad máxima; el sistema bloquea y no deja continuar. Luego quitarlos.
- **Paso 3 — Tarifa.** Mostrar el desglose: cada línea indica concepto, cantidad y
  valor. Aquí se ve que la categoría de cada ocupante cambia el cobro.
- **Paso 4 — Confirmación y envío.** Se emite el comprobante con folio, desglose y
  trazabilidad de estados.

> «El sistema calcula el cobro antes de reservar: el afiliado sabe cuánto se le va a
> descontar, y no hay sorpresas al final.»

**Preguntas que gatilla:** en casas de veraneo, ¿el acompañante no beneficiario paga un
adicional (pregunta 1)? En cometido laboral, ¿quién paga (2)? ¿Hay tope de noches (9)?

---

## 4. La encargada regional gestiona (4 min)

**Cambiar el perfil a «Encargada regional».**

- **Solicitudes por revisar**, ordenadas por prelación: la médica aparece primero.
- **Confirmar** la solicitud recién creada: exige fundamento, que queda en la
  trazabilidad. Volver al perfil de afiliado para mostrar que el estado cambió.
- **Lista de espera**: solicitudes sin cupo, con el orden propuesto.
- **Calendario operativo**: bloquear fechas por mantención y mostrar que el bloqueo
  aparece de inmediato en el calendario público del inmueble.
- **Check-in / check-out** con observaciones del estado del inmueble.

> «La encargada mantiene su rol de siempre, pero sin planillas paralelas ni correos
> dispersos: ve solo los inmuebles de su región y todo queda registrado.»

**Preguntas que gatilla:** ¿la confirmación siempre pasa por la encargada (5)? ¿Cómo
opera la prelación si ya hay una reserva confirmada (6)? ¿La lista de espera avanza
sola (7)?

---

## 5. Oficina Central: cobros y reportes (4 min)

**Cambiar el perfil a «Oficina Central».**

- **Reservas del país**: acceso nacional con filtros por región, motivo y estado.
- **Nómina de descuentos**: por período, con los estados *pendiente → informado →
  descontado*, y **exportación a CSV que descarga de verdad**.
- **Reportes**: ocupación por región, reservas por motivo y ranking de inmuebles. El
  botón «Ver como tabla» muestra las mismas cifras en formato de tabla.
- **Bloqueos y sanciones**: registro con respaldo, historial y levantamiento fundado.

> «Oficina Central deja de consolidar planillas a mano: el sistema calcula el cobro de
> cada estadía y entrega la nómina lista para Remuneraciones.»

**Preguntas que gatilla:** ¿qué formato exige Remuneraciones (insumo 6 del correo)?
¿Informan de vuelta lo efectivamente descontado (21)? ¿Cuántos no-show gatillan
sanción (16)?

---

## 6. Administrador: parámetros y trazabilidad (3 min)

**Cambiar el perfil a «Administrador».**

- **Inmuebles**: editar uno y mostrar que el cambio se refleja en el catálogo público.
- **Temporadas**: temporadas y bloqueos; mencionar el cierre por postulación estival.
- **Nómina de afiliados**: pantalla de la integración futura con el registro de
  Bienestar.
- **Auditoría**: quién hizo qué y cuándo, como exige la ley de datos personales.

> «Las tarifas, las temporadas y los inmuebles los mantiene el propio Servicio de
> Bienestar, sin depender de nosotros para cada cambio.»

**Preguntas que gatilla:** ¿quién será el administrador funcional (24)? ¿Con qué
frecuencia llega la nómina de afiliados y quién la envía (18)?

---

## 7. Cierre (2 min)

Volver al perfil de afiliado y al catálogo.

> «Lo que sigue depende de ustedes: con las respuestas a las preguntas de negocio y
> los archivos que les pedimos por correo, construimos el sistema real con base de
> datos, notificaciones por correo y usuarios verdaderos.»

Recordar los dos pendientes:

1. Las **preguntas de negocio** (`CLAUDE.md`), que definen las reglas del sistema.
2. Los **archivos e insumos** (`docs/INSUMOS_BIENESTAR.md`): tarifas, listado de
   inmuebles, fotos, formatos de nómina.

---

## Si algo falla durante la demostración

| Situación | Qué hacer |
|---|---|
| El mapa aparece gris | Es la única parte que necesita internet (mapas de OpenStreetMap). El resto funciona igual; seguir adelante. |
| Los datos quedaron alterados de una prueba anterior | «Reiniciar demostración» en el pie de página deja todo como al inicio. |
| Se llegó a una sección de otro perfil | La pantalla ofrece el botón para cambiar de perfil; también se puede usar el selector del encabezado. |
| No hay internet en la sala | Tener la maqueta corriendo en el propio equipo (`npm run dev` en `frontend/`) como respaldo. |
