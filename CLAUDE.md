# coipo_cabania — Sistema de Reservas Bienestar CONAF

Mockup solo-frontend (React 19 + Vite, `frontend/`) del sistema de reservas de la Red de
Casas de Huéspedes y Veraneo del Servicio de Bienestar CONAF. El alcance completo y las
decisiones de esta fase están en `docs/ALCANCE.md`. Los requisitos originales y guías
técnicas están en `INSUMO/` (el PDF de la solicitud es la fuente de requisitos). El backend
FastAPI + PostgreSQL se construye en una fase posterior; los fixtures del mock deben imitar
la forma de las futuras respuestas de la API.

## Guía para agentes (VERIFICADO con el código; no ejecuté los comandos)

**Estado:** solo frontend, sin backend ni base de datos; el estado de la demo vive en `localStorage` (`frontend/src/api/store.js`)
y los datos son ficticios. Publicada con un único contenedor nginx en `reserva-bienestar.conaf.cl` (puerto 8114) en cada push a `main`
(`.github/workflows/deploy-prod.yml`, workflow reusable de `infra-docker-base`: **no se edita por app**).

**Estructura:** `frontend/src/{pages,components,api,fixtures,context,lib}`; `frontend/qa/` (Puppeteer manual); `docs/ALCANCE.md`
(alcance), `docs/GUIA_INDUCCION.md` (inducción, incluye la funcionalidad de valoraciones con estrellas); `INSUMO/` (requisitos y guías).

**Comandos** (siempre dentro de `frontend/`; el `package.json` de la raíz no es del proyecto): `npm ci`, `npm run dev`, `npm run lint`
(oxlint), `npm run build`, `npm run preview -- --port 5199 --strictPort` y luego `node qa/todos-los-perfiles.mjs` (también
`flujo-afiliado`, `revision-movil`, `banner-institucional`). No hay pruebas unitarias ni CI de QA.

**Convenciones:** los fixtures deben imitar la forma de las futuras respuestas de la API (fase 2). Textos de interfaz y documentos en español.

**Trampas conocidas:**
- El `healthcheck` del compose usa `127.0.0.1` y no `localhost` a propósito (el wget de BusyBox no reintenta por IPv4; ver el comentario en `docker-compose.yml`).
- `/health` lo responde el propio nginx; el pipeline lo consulta una sola vez, 5 s después de levantar.
- El `.env` real vive solo en `/opt/apps/coipo_cabania/`; con finales de línea Unix. Si falta, el deploy falla en su primer paso.
- La franja de «maqueta sin valor operativo» (`AvisoDemostracion.jsx`) y el banner institucional no se quitan sin decisión de Bienestar/UIA.
- Pages gratuito ya no se usa: el repo debe seguir **privado**.

**No tocar sin confirmar:** `deploy-prod.yml`, `deploy/*.conf`, `INSUMO/` e `INSUMO_PRODUCCION/` (copias de guías de la flota).

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
