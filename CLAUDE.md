# coipo_cabania — Sistema de Reservas Bienestar CONAF

Mockup solo-frontend (React 19 + Vite, `frontend/`) del sistema de reservas de la Red de
Casas de Huéspedes y Veraneo del Servicio de Bienestar CONAF. El alcance completo y las
decisiones de esta fase están en `docs/ALCANCE.md`. Los requisitos originales y guías
técnicas están en `INSUMO/` (el PDF de la solicitud es la fuente de requisitos). El backend
FastAPI + PostgreSQL se construye en una fase posterior; los fixtures del mock deben imitar
la forma de las futuras respuestas de la API.

Los **archivos e insumos** que Bienestar debe enviar antes de la reunión (tarifas,
listado de inmuebles, fotos, nóminas, formatos de Remuneraciones, etc.) se piden por
correo con `docs/INSUMOS_BIENESTAR.md` — no repetirlos como preguntas de reunión.

## Preguntas para Bienestar (reunión de validación del mock)

Ambigüedades del PDF de solicitud que necesitan definición de negocio (decisiones, no
archivos). Llevarlas a la reunión; las respuestas alimentan directamente el diseño de la
fase 2 (backend y BD).

### Tarifas y cobros

1. En casas de huéspedes la tarifa es por persona/noche y en casas de veraneo es fija anual:
   si en una casa de veraneo van acompañantes no beneficiarios, ¿se suma algo al valor fijo
   o el valor cubre a todo el grupo?
2. Las tarifas diferenciadas se definen para motivos médicos y personales. En cometidos
   laborales, ¿quién paga y qué tarifa aplica? ¿Se descuenta al funcionario o lo cubre otra
   instancia?
3. ¿El descuento por planilla se aplica en una cuota o puede fraccionarse? ¿Hay tope de
   descuento mensual?
4. Para personas externas que pagan directo (no por planilla): ¿qué medio de pago se
   acepta, quién registra el pago y qué comprobante se emite?

### Reserva y asignación

5. ¿La reserva se confirma automáticamente cuando hay disponibilidad, o siempre pasa por
   la encargada regional? El PDF dice que la encargada confirma "cuando la regla de
   asignación lo requiera": ¿en qué casos exactamente se requiere?
6. ¿Cómo opera la prelación (médica > laboral > personal) en la práctica? Si llega una
   solicitud médica sobre fechas ya confirmadas para motivo personal, ¿se desplaza la
   reserva confirmada o la prelación solo aplica entre solicitudes pendientes?
7. ¿Cómo funciona la "lista de espera" que menciona el PDF? ¿Es automática (se libera un
   cupo y avanza el primero) o la gestiona la encargada?
8. ¿Con cuánta anticipación máxima se puede reservar (p. ej. hasta 3 o 6 meses)? ¿Y hay
   anticipación mínima?
9. ¿Existe límite de noches por reserva o por año por afiliado? En temporada alta el PDF
   menciona "restricción de días máximos": ¿cuántos días?
10. ¿Cuál es la prioridad de afiliados sobre no afiliados en concreto: los externos solo
    pueden reservar dentro de una ventana más corta, o se resuelve caso a caso al haber
    concurrencia?
11. El sorteo o postulación estival que menciona el PDF: ¿queda fuera del sistema (solo se
    bloquean las fechas mientras ocurre) o el sistema debe soportarlo a futuro?
12. ¿Quién decide cada año qué casas de huéspedes se convierten a uso de veraneo en
    temporada estival y fines de semana largos?
13. ¿Hay horarios estándar de check-in y check-out?

### Desistimiento, no-show y sanciones

14. Si el afiliado anula con más de una semana de aviso, ¿el cobro es cero?
15. ¿Quién califica la "fuerza mayor justificada y comprobada" y con qué respaldo
    documental? ¿Solo Oficina Central?
16. ¿Cuántos no-show o incumplimientos gatillan sanción, y cuál es la duración típica de un
    bloqueo (temporal vs indefinido)?
17. Si un usuario queda bloqueado teniendo reservas futuras ya confirmadas, ¿se anulan
    automáticamente o se revisan caso a caso? ¿Quién decide?

### Usuarios y datos

18. ¿Con qué frecuencia se actualiza la nómina de afiliados y cargas, y quién la enviará
    al sistema (persona/unidad responsable)?
19. ¿Cómo se registra y valida una persona externa (ajena a CONAF)? ¿Alguien aprueba la
    creación de su cuenta?
20. Para los acompañantes se registra nombre, RUT y parentesco: ¿Bienestar cuenta con base
    legal/consentimiento para tratar datos de terceros no afiliados, o el titular declara
    por ellos?

### Integración con Remuneraciones

21. ¿Remuneraciones informa de vuelta qué descuentos se aplicaron efectivamente (para
    marcar "descontado" y detectar no pago), o esa conciliación es manual?

### Contenido y operación

22. ¿Quién mantendrá actualizado el contenido de los inmuebles (fotos, descripciones,
    equipamiento) una vez en producción?
23. ¿Qué nombre visible debe llevar el sistema?
24. ¿Quién será el administrador funcional del sistema (mantención de inmuebles, tarifas,
    temporadas) una vez en producción: Bienestar o la Unidad de Información y Análisis?
25. Para la fase con backend: ¿prefieren autenticación con credencial institucional CONAF o
    Clave Única?
