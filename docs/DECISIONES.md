# Decisiones del producto

Registro de lo decidido y de lo que falta confirmar con Bienestar.

**Norma que rige:** Reglamento General de Uso de Casas de Veraneo o Descanso, propuesta de
actualización de octubre de 2026 (en adelante, "el reglamento"). Reemplaza a la versión de
agosto y prevalece sobre la solicitud de julio y sobre la especificación del 08-10-2026
cuando se contradicen.

## Alcance

- Solo casas de veraneo. Se eliminan las casas solo de huéspedes (Copiapó, Concepción,
  Santiago 1 y 2). Las de uso mixto (veraneo/huéspedes) se tratan como casas de veraneo.
- Quedan 30 casas. Los nombres repetidos se numeraron (Puerto Montt 1 y 2, P.N. Río
  Clarillo 1 y 2, Pichilemu 3, P.N. Puyehue 3).
- Se construye un producto nuevo; `coipo_cabania` no se repara.

## Confirmación automática (decisión 20-10-2026)

- **No hay confirmación manual.** Si las fechas están disponibles y se cumplen las reglas
  (anticipación, una reserva por mes, capacidad, aseo, temporada alta), la reserva queda
  **confirmada al instante** y se envían el comprobante y el acta de entrega.
- Ni la encargada regional ni la Oficina Central confirman o "no asignan"; se eliminó esa
  cola de sus paneles.
- **Otros servicios públicos (Art. 9):** como nadie revisa ya si el cupo lo demanda
  personal de CONAF, solo pueden reservar con **hasta 15 días de anticipación**
  (parámetro `anticipacion_maxima_otro_servicio_dias`). Así toman cupos que siguen libres
  cerca de la fecha.
- **Pago anticipado (Art. 21 a):** la reserva queda confirmada igual; si el pago no se
  registra, **solo se alerta a Bienestar** (Oficina Central, "Requiere atención" y
  "Pagos por registrar"). No se anula automáticamente.
- El backend debe validar la disponibilidad dentro de una transacción al confirmar, para
  que dos personas no tomen las mismas fechas a la vez. La maqueta ya avisa al usuario si
  otra persona tomó las fechas mientras completaba el formulario.
- **Diferencia con el reglamento:** el Art. 5 dice que la reserva "queda pendiente hasta
  la confirmación final". Bienestar debe ajustar ese texto o aceptar la diferencia.

## Ingreso (ajuste 1, 20-10-2026)

1. Pregunta inicial: "¿Es usted funcionario/a de CONAF?"
   - **Sí** (incluye afiliados jubilados): RUT y nombre. El sistema busca el RUT en las
     nóminas de CONAF y Bienestar y deduce calidad, tipo de contrato, región, rol y perfil.
     La persona nunca elige su categoría.
   - **No, trabajo en otro servicio público** (Art. 9): RUT, nombre, servicio, región,
     correo institucional y teléfono opcional.
2. Verificación con un **código de 6 dígitos enviado al correo** (de la nómina, o el
   declarado por el externo). Vence en 10 minutos y se puede reenviar.
3. Si el RUT no existe o el nombre no coincide, el mensaje es el mismo en ambos casos,
   para no revelar quién está en la nómina.
4. Un RUT de la nómina no puede ingresar como externo.
5. El perfil (solicitante, encargada, Oficina Central, UIA) sale del RUT. Las personas
   internas entran por la misma pantalla.
6. Maqueta: el recuadro "Probar como" carga personas ficticias y el código se muestra en
   pantalla. Se eliminó el selector "Ver como".
7. Solo maqueta (20-10-2026): un RUT válido que no está en la nómina de prueba entra como
   afiliado/a activo/a de demostración de la Región Metropolitana, con un aviso visible.
   En la versión real ese caso muestra el mensaje de "no encontramos".

## Panel de la encargada regional (paso 2, 20-10-2026)

Ve solo las casas de su región. Tres pestañas: **Inicio**, **Reservas** e **Inventario**.

**Inicio**, en este orden:
1. **Llegadas y salidas** de hoy y mañana, con teléfono de contacto.
2. **Ocupación de las próximas 4 semanas**: una franja por casa (ocupada, bloqueada por
   mantención, libre).
3. **Reservas nuevas de los últimos 7 días**, solo informativas, marcando si son de otro
   servicio público, si tienen pago anticipado pendiente o si llevan perro de asistencia.

**Reservas**: todas las de la región, con filtro por estado y casa, búsqueda por nombre,
RUT o código, y detalle con personas, pago e historial de envíos al usuario.

**Inventario** (Art. 2 e, Art. 13, Anexo B):
- Por casa: mobiliario, equipamiento, menaje y ropa de cama, con cantidad, estado
  (bueno, regular, malo) y observación; además llaves, controles, gas, vencimiento del
  extintor (avisa si está vencido) e indicaciones.
- Una casa sin inventario parte de una lista sugerida según su capacidad, o en blanco.
- Al guardar se crea una nueva versión y **se envía automáticamente** a cada reserva
  confirmada de esa casa que aún no comienza. Al crearse una reserva también se envía.
- El usuario lo ve en el detalle de su reserva, con el aviso de las 12 horas para
  informar diferencias (Art. 13).

**Acta de entrega-recepción** (Art. 2 f, Art. 13 y Anexo B; decisión 20-10-2026):
- Es un archivo PDF que se genera **al confirmarse la reserva** y se envía al correo del
  usuario. Si la encargada actualiza el inventario antes de la llegada, se genera y envía
  una versión nueva (ACTA-AAAA-NNNN-1, -2, ...).
- Contenido completo del Anexo B: casa, fechas y personas; inventario con estado y
  observaciones; llaves, gas y extintor; sección de ingreso (observaciones dentro de 12
  horas); sección de salida (aseo, daños, valorización, conformidad); firmas.
- Cada acta guarda una copia del inventario tal como se envió, para que el archivo
  descargado después sea idéntico al recibido por el usuario.
- La encargada la descarga desde el historial de la reserva (pestaña Reservas). El
  usuario también puede descargar una copia desde el detalle de su reserva.
- **Devolución por correo** (decisión 20-10-2026): el usuario envía a la encargada
  regional, por correo, el acta con la sección de ingreso completa dentro de las 12 horas
  y, al salir, el acta firmada. El acta y el detalle de la reserva indican el correo de la
  encargada de la región de la casa. El sistema no recibe esos archivos.

## Panel de la Oficina Central (paso 3, 20-10-2026)

Cinco pestañas: **Inicio**, **Cobros**, **Casas y tarifas**, **Sorteo** y **Dashboard**.
El sorteo se describe en la sección siguiente.

**Inicio nacional**
- *Requiere atención*: pagos anticipados sin registrar con llegada en 7 días, extintores
  vencidos o por vencer en 30 días, casas sin inventario y devoluciones pendientes.
- *Regiones · próximos 30 días*: casas, ocupación y reservas nuevas de los últimos 7 días.

**Cobros** (Art. 10, 11 y 21; Anexo A)
- *Nómina de descuentos* por mes: cada estadía finalizada con planilla se descuenta en sus
  cuotas a partir del mes siguiente a la salida; los cargos por desistimiento, en el mes
  siguiente al aviso. Agrupada por persona con detalle desplegable. Estados: programada,
  por informar, informada a Remuneraciones, descontada. Descarga CSV (separador `;`,
  abre en Excel).
- *Pagos por registrar*: transferencias de reservas confirmadas, con plazo antes de llegar.
  La glosa trae el código de la reserva. Se registra el N° de operación.
- *Devoluciones*: reservas pagadas que Bienestar anuló (Art. 11).

**Casas y tarifas** (Art. 11 y 19)
- Tarifa de afiliado por casa (editable) y tarifa diferenciada global para no afiliados y
  otros servicios. Los cambios rigen para solicitudes nuevas.
- Activar o desactivar una casa: una casa inactiva no aparece al buscar.
- Bloqueos por mantención o fuerza mayor: antes de bloquear muestra las reservas
  afectadas; al confirmar, se anulan, se avisa a cada persona con el motivo y se marca la
  devolución si había pagado.

**Dashboard para la toma de decisiones**
- Filtros: período (año a la fecha, últimos 90 días, este mes, próximos 90 días) y región.
- Indicadores: usuarios distintos, reservas, noches ocupadas, ocupación, ingresos e
  ingreso por noche, anticipación promedio, desistimientos con sus cargos y reservas
  anuladas por Bienestar.
- *Hallazgos del período* en texto: casa más usada, casa con más ingresos, concentración
  de ingresos en las 5 primeras, casa con menor ocupación, región con mayor ocupación y
  tasa de desistimiento.
- Gráficos: ingresos por mes, noches por mes, top 10 casas por uso y por ingresos,
  ocupación por región, reservas por calidad de usuario y por forma de pago.
- Tabla de todas las casas, ordenable por cualquier columna, con descarga CSV.
- Reglas de cálculo documentadas en `frontend/src/lib/indicadores.js`, para replicarlas en
  el backend.

## Reserva asistida (20-10-2026)

Hay personas que no manejan el computador y piden la reserva a la encargada regional o a
Oficina Central. Ambas tienen en su inicio el aviso **«¿Alguien le pidió una reserva?»**
con el botón *Reservar para otra persona*.

1. **Persona**: si es de CONAF (activo/a o jubilado/a) se busca por RUT en la nómina; si es
   de otro servicio público se ingresan nombre, RUT, servicio, región, correo y teléfono.
2. **Casa**: cualquier casa del país (la encargada parte con las de su región).
3. **Reserva**: el mismo flujo del solicitante (calendario, quiénes van, pago), con las
   mismas reglas calculadas para la persona: anticipación según su calidad, una reserva por
   mes, temporada alta por sorteo y formas de pago.
4. **Respaldo**: quien registra declara que la persona le pidió la reserva. La reserva queda
   a nombre de la persona, con *registrada por* (nombre y perfil). La persona recibe por
   correo el comprobante, el acta y un enlace para aceptar el reglamento y, si paga por
   planilla, autorizar el descuento. Mientras no acepte, la reserva figura como pendiente
   de aceptación para la persona, la encargada y Oficina Central.

## Sorteo de temporada alta (paso 4, 20-10-2026)

Aplica el Art. 6. Decisiones del 20-10-2026:

1. **Turnos fijos por casa**: 7 noches, de sábado a sábado (Art. 6 b). Verano 2027: 8
   turnos, del 2 de enero al 27 de febrero. El cambio de turno se hace el mismo sábado
   (salida 12:00, ingreso 15:00).
2. **Una sola opción** por postulante: una casa y un turno. Se ve cuántas personas ya
   postularon a cada turno. Se puede retirar la postulación mientras siga abierta.
3. **Quién postula**: funcionarios/as de CONAF activos/as (afiliados, no afiliados y plazo
   fijo) y jubilados/as. Los funcionarios de otros servicios públicos no postulan: toman
   vacantes después del sorteo (Art. 9).
4. **Prioridad** (Art. 6 a): quien no tuvo casa en la temporada alta anterior queda antes
   que quien sí tuvo. Quien desistió tarde o no se presentó en la temporada alta anterior
   no puede postular (Art. 10 d).
5. **Sorteo**: por cada casa y turno se ordena al azar a los postulantes, primero los con
   prioridad. El primero se adjudica el turno y su reserva queda confirmada con la forma de
   pago que indicó al postular; el resto queda en lista de espera en ese orden. Se registra
   la semilla del sorteo para reproducir y auditar el resultado. Se avisa a todos por
   correo (Art. 6 c). Lo realiza Oficina Central al cierre de la postulación.
6. **Lista de espera** (Art. 6 d): si alguien desiste (por el sistema o por aviso escrito que
   registra Oficina Central), el sistema ofrece el turno por correo a la siguiente persona,
   que tiene **48 horas** para aceptar; si no responde o rechaza, pasa a la siguiente.
7. **Vacantes**: los turnos sin postulantes, o cuya lista de espera se agotó, quedan abiertos
   a reserva directa con las reglas habituales (anticipación, una reserva por mes, Art. 9).

En la maqueta, la postulación de verano 2027 está abierta con postulaciones ficticias, y
Oficina Central puede adelantar el sorteo y simular el vencimiento de una oferta.

## Perfiles (4)

1. **Solicitante**: afiliado activo, afiliado jubilado, trabajador CONAF no afiliado o
   funcionario de otro servicio público.
2. **Encargada regional**: las casas de su región.
3. **Administración Oficina Central**: vista nacional, cobros, tarifas, temporadas, sorteo.
4. **Mantenimiento UIA**: usuarios, nóminas, parámetros técnicos y auditoría.

## Reglas aplicadas al solicitante

| Regla | Aplicación | Fuente |
|---|---|---|
| Confirmación | Automática si hay disponibilidad y se cumplen las reglas (difiere del texto del Art. 5) | Decisión 20-10-2026 |
| Temporada alta (enero-febrero e invierno) | Solo por sorteo, a turnos de sábado a sábado; los turnos vacantes después del sorteo se reservan directo | Art. 6, decisión 20-10-2026 |
| Reservas por mes | Una por mes calendario | Art. 7 |
| Otros servicios públicos | Reservan con hasta 15 días de anticipación (cupos no tomados por personal de CONAF); tarifa diferenciada y pago anticipado | Art. 9, decisión 20-10-2026 |
| Desistimiento | Sin costo con 7 o más días corridos; si no, o si no se presenta, una noche; fuerza mayor acreditada sin costo | Art. 10 |
| Retiro anticipado | Aviso con 2 días; sin aviso se cobra el período completo (en condiciones de uso) | Art. 10 e) |
| Horarios | Ingreso 15:00, salida 12:00 | Art. 12 |
| Capacidad | No se puede superar al solicitar; se cuentan niños y niñas | Art. 14 |
| Perro de asistencia | Se informa en la solicitud y se adjuntan la credencial de usuario de perro de asistencia de la entidad adiestradora (D.S. N° 223/2006, Art. 6) y el certificado sanitario vigente con vacuna antirrábica (Art. 9) | Art. 15, Anexo A; decisión 20-10-2026 |
| Buscador | Solo filtra por región; las fechas se eligen en el calendario de cada casa y las personas en el paso 2 | Decisión 20-10-2026 |
| Quiénes van | Solo aparece quien hace la solicitud, con la opción «Yo también viajo»; el resto se ingresa a mano (no se sugiere el grupo familiar). Si no viaja, sigue siendo el usuario/a responsable y debe indicar a una persona mayor de edad a cargo en la casa | Art. 2 a), 8 y 22; decisión 20-10-2026 |
| Tarifa | Por noche y por casa; diferenciada para no afiliados y otros servicios | Art. 19 |
| Matrimonio o AUC | Aviso en la ficha a afiliados; se solicita a la encargada (flujo completo en un paso posterior) | Art. 20 |
| Formas de pago | Funcionarios/as de CONAF: descuento por planilla (con autorización y hasta 3 cuotas). Plazo fijo: planilla o transferencia. Jubilados y otros servicios públicos: solo transferencia antes de llegar. No hay pago en dependencias de Bienestar. Si una transferencia no se registra, solo se alerta a Bienestar | Art. 21, decisión 20-10-2026 |
| Datos de la transferencia | Corporación Nacional Forestal, RUT 61.313.000-4, Banco de Chile, cuenta corriente N° 500-04. Glosa: "Pago casa {nombre de la casa} {código}", por ejemplo "Pago casa Viña del Mar R-2026-0201". Se muestran en un cuadro al elegir la transferencia (hay que cerrarlo para continuar) y en el comprobante | Decisión 20-10-2026 |
| Datos de la solicitud | Usuario responsable: nombre, RUT, rol, región, calidad. Acompañantes: solo nombre y edad (y relación) | Anexo A |
| Aceptación del reglamento | Obligatoria al confirmar | Art. 27, Anexo A |
| Anticipación máxima | 90 días, como parámetro editable (el reglamento de octubre no la fija) | Decisión 20-10-2026 |
| Aseo | Un día libre entre reservas | Decisión de Bienestar |
| Motivo de la estadía | No se pide (médico, laboral o personal); el reglamento no lo usa para asignar | Decisión 20-10-2026 |

Todos los números están en `frontend/src/lib/reglas.js` (`PARAMETROS` y `ADICIONAL_TARIFA`).

### Cambios respecto de decisiones anteriores

- El 08-10 se definió confirmación automática en temporada normal; el reglamento de
  octubre exige confirmación (Art. 5). El 20-10 se volvió a la confirmación automática,
  ahora en todos los casos (ver sección "Confirmación automática").
- El 08-10 se definió que los contratos a plazo fijo podían usar planilla; luego se aplicó
  el pago anticipado del Art. 21 a). El 20-10 se decidió que el plazo fijo elige planilla
  o transferencia, que los afiliados de planta pagan solo por planilla y que se elimina el
  pago en dependencias de Bienestar. Difiere del Art. 21: conviene ajustar su redacción.
- El 08-10 los externos solo solicitaban por correo: ahora reservan en el sistema, con hasta
  15 días de anticipación (Art. 9).
- El 08-10 la tarifa del trabajador no afiliado era igual a la del afiliado: el Art. 19
  la hace diferenciada.

## Supuestos a validar con Bienestar

- Montos de la tarifa diferenciada (hoy: +$5.000 por noche para no afiliados y +$15.000
  para otros servicios, solo referenciales).
- Plazo de 15 días de anticipación para funcionarios de otros servicios públicos.
- Mes en que se inicia el descuento por planilla (hoy: mes siguiente a la salida).
- Tope de 3 cuotas para el descuento por planilla (el reglamento pide indicar las cuotas
  pero no fija un máximo).

## Por confirmar con Bienestar

- Resolución anual de tarifas 2026 por casa y categoría, con capacidad máxima (Art. 14 y 19).
- Planilla oficial de inmuebles y fotos reales.
- Fechas oficiales de temporada alta y ventana de postulación al sorteo.
- Turnos de sábado a sábado sin día de aseo entre turnos (el resto del año se deja un día).
- Qué noches sueltas de temporada alta quedan fuera de turnos (verano 2027: 1 de enero y
  27 de febrero) y cómo se ofrecen.
- Plazo de 48 horas para aceptar un cupo de la lista de espera.
- Si la prioridad del Art. 6 a) considera la temporada de invierno anterior para el verano
  (así está en la maqueta) o solo la temporada equivalente del año anterior.
- Si se mantiene la anticipación máxima de 90 días.
- Ajuste del texto del Art. 5 a la confirmación automática.
- Qué hacer con una reserva de pago anticipado que no paga antes de llegar.
- Qué pasa si la persona no acepta el reglamento de una reserva asistida antes de llegar (hoy solo queda pendiente).
- Si se acepta que el usuario/a responsable no viaje (la maqueta lo permite con persona a cargo).
- Casilla oficial de correo de cada encargada regional (hoy solo Valparaíso tiene una
  persona en la nómina de prueba; el resto usa una casilla genérica ficticia).
- Clasificación de El Belloto y P.N. Puyehue; fila duplicada de Bahía Inglesa.
