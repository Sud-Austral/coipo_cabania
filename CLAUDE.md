# coipo_cabania — contrato para asistentes de IA

Lo primero que hay que leer antes de tocar nada de este repositorio. Si eres una
persona, también sirve como el mapa más corto.

Este archivo lo generó `semilla/sembrar.py` al sembrar el proyecto. Lo que dice
del stack y de las reglas es igual en toda la flota COIPO; lo que dice de **esta**
aplicación está en `insumos/` y en `proyecto.coipo.yaml`.

---

## 1. Qué es esta aplicación

| | |
|---|---|
| Repositorio | `coipo_cabania` — y ese nombre **es** la carpeta `/opt/apps/coipo_cabania/` del servidor |
| Gerencia | `5_DESARROLLO_PERSONAS` |
| Sembrada desde | la semilla `2026-10-14` de `coipo_master_produccion` |

**El problema que resuelve y la solución acordada están en
[`insumos/`](insumos/), y son la fuente de verdad.** No deduzcas el propósito
del código: el código puede ir por detrás de lo acordado, y cuando van
desalineados manda el documento.

En `insumos/` vas a encontrar dos marcas, y significan cosas distintas:

- `[PENDIENTE]` — falta preguntarle al área usuaria. **No lo resuelvas tú.**
- `[VERIFICAR]` — hay una afirmación jurídica sin confirmar. La cierra Fiscalía
  o Auditoría Interna, nunca un asistente y nunca quien programa.

---

## 2. El stack, y por qué cada pieza

| Capa | Qué | Detalle que importa |
|---|---|---|
| Backend | **Python 3.14** + FastAPI + SQLAlchemy 2.x | `psycopg` **v3**, no psycopg2. La URL es `postgresql+psycopg://` |
| Base | **PostgreSQL 17.10 COMPARTIDO**, fuera de Docker, en otra máquina | se conecta con **cinco** variables `DATABASE_*`, jamás con una `DATABASE_URL` única |
| Frontend | **React 19** + Vite | lo compila el contenedor `app`, que es el único que publica puerto |
| Servidor web | nginx dentro del contenedor `app` | sirve la SPA y proxea `/api` al backend por la red interna |
| Despliegue | runner self-hosted sobre vm2 (prod) y vm3 (uat) | `rsync --delete` y **sin rollback** |
| Identidad | COIPO IAM, patrón BFF | ver la sección 4 |

Las versiones de Python y Node están en **dos sitios y tienen que coincidir**:
los `Dockerfile` y el `env:` de `.github/workflows/ci.yml`. La regla `CI-1` del
gate lo comprueba. Si el CI prueba con una versión que la imagen no construye,
todo lo que declara verde está probado sobre un intérprete que no llega a
producción.

---

## 3. Qué puedes tocar y qué no

Este repositorio se sembró desde una semilla, y hay archivos **congelados**: son
idénticos en toda la flota a propósito, porque cada uno cierra un fallo que ya
ocurrió y la corrección tiene que llegar a todas las aplicaciones a la vez.

Lo declara `.semilla` en la raíz y lo verifica el juez `j12` contra
`semilla.lock`. **No borres `.semilla`**: sin él, nadie se entera si alguien
edita una de esas piezas.

**Congelado** (no lo edites). Esta lista NO se escribe a mano: la genera
`sembrar.py` leyendo el mismo `semilla.lock` que compara `j12`, asi que no puede
quedarse atras. Hasta el 2026-09-09 se mantenia a mano y mentia en ocho archivos:
daba por congelado `docker-compose.yml` --que esta aplicacion SI edita, es donde
anade sus servicios-- y callaba siete que si lo estaban, entre ellos el
`requirements.txt` de entonces. Una IA obediente editaba lo sellado y no tocaba lo
que debia adaptar.

- `backend/Dockerfile`
- `backend/app/adaptadores/entrada/http/guards.py`
- `backend/app/adaptadores/entrada/http/sesion.py`
- `backend/app/adaptadores/salida/iam/cliente_iam.py`
- `backend/app/adaptadores/salida/iam/mapeo_claims.py`
- `backend/app/aplicacion/puertos/identidad.py`
- `backend/app/core/auditoria/__init__.py`
- `backend/app/core/auditoria/clasificacion.py`
- `backend/app/core/auditoria/eventos.py`
- `backend/app/dominio/modelo/identidad.py`
- `backend/pytest.ini`
- `backend/requirements-base.txt`
- `backend/requirements-dev-base.txt`
- `backend/tests/arquitectura/test_capas.py`
- `backend/tests/conftest.py`
- `backend/tests/contrato/test_health.py`
- `backend/tests/contrato/test_la_semilla_importa.py`
- `backend/tests/contrato/test_todo_importa.py`
- `db/0000_plataforma.sql`
- `docker-compose.fragmento.yml`
- `frontend/Dockerfile`
- `frontend/nginx.conf`
- `frontend/scripts/verify-banner.mjs`

La lista autoritativa es `semilla.lock` de `coipo_jueces`; si esto y el lock no
coinciden, manda el lock y esta aplicacion se sembro con una semilla anterior.

**La única excepción**: `backend/app/adaptadores/entrada/http/rutas/salud.py`,
donde `APP_NOMBRE` sí es de esta aplicación —y por eso está fuera del lock—.

Si necesitas cambiar algo congelado:

1. ¿Sirve sólo aquí? Sácalo a un archivo propio que no esté en el lock.
2. ¿Sirve a toda la flota? Cámbialo en `semilla/CONGELADO/` de
   `coipo_master_produccion`, vuelve a sellar, y llega a todas.
3. ¿Hace falta la excepción aquí y ahora? Suprímela con
   `coipo-jueces:ignorar(SEM-1) <motivo de 12 caracteres o más>` en la primera
   línea. **Se cuenta y se publica en cada despliegue.**

### Lo que está sembrado pero NO cableado

Esto es lo que más caro sale confundir, porque el código existe y parece hecho:

| Pieza | Estado real |
|---|---|
| `/health`, el banner, el sobre de despliegue | **funcionan** desde el primer arranque |
| El runner de migraciones (`adaptadores/salida/postgres/migraciones.py`) | **funciona**: aplica `db/*.sql` y escribe `esquema_migracion` |
| La sesión (`adaptadores/entrada/http/sesion.py`), el cliente del IAM, la auditoría | **librería congelada, sin cablear**: `composicion/contenedor.py` los deja en `None`, no hay ruta `/auth/callback`, y `SESSION_SECRET` / `IAM_*` no están ni en `ajustes.py` ni en `.env.example`. Si esta aplicación usa el IAM —y desde cuándo— lo declara `iam.uso` en `proyecto.coipo.yaml`: `ninguno`, `diferido` (con fecha) o `activo`. Ausente no es «ninguno»: es que nadie lo decidió |
| Los repositorios, la unidad de trabajo, la notificación, los archivos | puertos declarados, **sin implementación** |

Cablear lo de la segunda mitad es trabajo de ESTA aplicación y va en el plan.
Hasta el 2026-09-15 este contrato y `prompts/00-plan-de-implementacion.md` decían
que ya estaba, y con eso un plan daba por resuelta la autenticación de una
aplicación que no tenía ninguna.

---

## 4. Los invariantes que cuestan caro

Cada uno viene de un incidente real de esta flota. No son estilo.

**`/health` no lleva autenticación, no redirige, y sólo devuelve 503 si el
esquema no se aplicó.** El despliegue lo comprueba con `curl -sf`, que falla con
cualquier código ≥ 400 y **no sigue 3xx**. Un 401 o un 307 ahí dejan el
contenedor `unhealthy` para siempre. Y un 503 por *datos* —un catálogo vacío—
tumba el sitio entero por un problema que no impide servir: eso vive en
`/health/detalle`, que ninguna sonda consulta. **Build rojo, sitio arriba.**

**El token del IAM muere dentro del adaptador.** El backend canjea el `code`,
llama UNA vez a `/oauth/userinfo`, **descarta el token** y emite su propia cookie
`httpOnly`. El puerto `ProveedorDeIdentidad` no expone `obtener_token()` a
propósito: si lo expusiera, algún día alguien lo guardaría en la sesión.

**`IAM_JWT_SECRET` no existe en ningún cliente, nunca.** Es HS256 y global de la
flota: quien lo tenga firma tokens de cualquier aplicación CONAF.

**En el registro de auditoría no entra PII.** Ni RUT, ni correo de ciudadano, ni
`str(exc)`. El log es inmutable —un trigger prohíbe el `UPDATE`— así que un dato
personal que entre ahí **no lo puede sacar nadie**, ni la desidentificación.

**`APP_NOMBRE` es un literal versionado y sale en `/health`.** Es lo único que
delata una colisión de `APP_PORT`: si otra aplicación ocupa tu puerto, el `curl`
del despliegue recibe **su** `/health`, responde 200, y tu despliegue se declara
exitoso sobre el contenedor equivocado.

**`SESSION_` con dos eses.** Con una sola, `ajustes.py` lee el alias igual, lo
anota en `advertencias` y **sigue arrancando** — no aborta, porque con `rsync
--delete` y sin rollback un aborto por una grafía deja la aplicación caída sin
nada a lo que volver. La advertencia sólo se ve en el log del arranque, así que
corrige el `.env` del servidor de todas formas.

**El dominio no importa infraestructura.** Ni fastapi, ni sqlalchemy, ni httpx,
ni `os`. Lo verifica `backend/tests/arquitectura/test_capas.py` con `ast`, no con
grep. El único sitio que puede conocerlo todo es
`backend/app/composicion/contenedor.py`.

**Un mapa se rompe en producción y no en desarrollo.** Nada de esta semilla
prohíbe MapLibre ni Leaflet, pero `npm run dev` y el CI no cargan un mapa, y lo
que sigue sólo se ve con la aplicación desplegada. El patrón `patrones/mapa/` de
la fábrica (`coipo_master_produccion`) lo resuelve y se prueba en un navegador en
su CI; si no lo usas, esto es lo que tienes que saber:

- **Teselas de OpenStreetMap que dicen «403 Access blocked», con HTTP 200.**
  `frontend/nginx.conf` —sellado— manda `Referrer-Policy: same-origin`: el
  navegador no manda Referer a otro origen y OpenStreetMap lo exige. **No edites
  el nginx** (`j12` sale en `SEM-1`): pide `referrerPolicy: 'origin'` sólo a las
  peticiones a quien lo exige, en Leaflet con `L.tileLayer(url, { referrerPolicy:
  'origin' })` y en MapLibre con `transformRequest`. MapLibre 5.20 o anterior lo
  ignora **sin avisar**. Un `<meta name="referrer" content="origin">` sí hace
  llegar el Referer a las teselas ráster que MapLibre pide desde el hilo
  principal (medido), pero cambia la política de **toda** la aplicación y no
  llega al worker de MapLibre (el GeoJSON de otro origen que pide el worker no
  lo lleva): es el plan B, no lo de arriba.
- **GeoJSON o PMTiles que dan 404 en producción.** El nginx responde 404 a todo
  `/data/` (`location /data/ { return 404; }`) y `npm run dev` los sirve igual.
  Van en `frontend/public/capas/`. Un nombre mal escrito **no** da 404: cae al
  `index.html` con un 200.
- **MapLibre 6 en blanco, «Worker failed to load».** Con Vite hay que decirle
  dónde está el worker: `setWorkerUrl(…?worker&url)`.
- **`npm ci` falla en el CI y en la imagen** si añades la librería sin versionar
  `package-lock.json`: `npm install <paquete>` dentro de `frontend/` y a los dos
  archivos al commit.
- **`api/http.js` daba `null` para un `application/geo+json`.** Ya acepta
  `+json`; una aplicación sembrada antes lo tiene con
  `.includes('application/json')` y el patrón `patrones/mapa/` de la fábrica lo
  corrige.
- **Los fondos caducan.** El raster anónimo de CARTO murió (200 con una marca de
  agua estampada, no un error), Esri retira capas y OpenStreetMap es un
  servicio de mejor esfuerzo, sin SLA, que prohíbe el uso intensivo (política de
  teselas: operations.osmfoundation.org/policies/tiles): con tráfico real hace
  falta un proveedor con contrato o PMTiles propio, y eso lo decide una persona.
  **Una llave de proveedor en el frontend es un secreto expuesto.** `j09` sólo la
  marca si va en una variable con nombre de clave (`const MAPTILER_API_KEY =
  "…"`, `apiKey='…'`), no si va dentro de la URL (`?key=…`), que es el caso
  típico de una URL de teselas; y el `ci.yml` sembrado corre el gate en
  `modo: advisory`, o sea que avisa y no bloquea. No cuentes con el juez.

---

## 5. Convenciones

- **Español** y `snake_case` en el código y en la API.
- Todo bajo `/api/v1`, con **dos excepciones cerradas**: `/health` y
  `/auth/callback`. Las dos porque son contratos externos con la ruta cableada:
  el `curl` del despliegue y la `redirect_uri` que el IAM compara por igualdad
  exacta de cadena.
- Los tests llevan **tres marcas obligatorias**: capa (`dominio` / `aplicacion` /
  `adaptador` / `e2e` / `contrato`), tipo (`invariante` / `caracterizacion` /
  `guardia`) y tier (`t0` / `t1`). Sin tier, un test **no corre nunca en la
  compuerta** y su estado permanente pasa a ser «no ejecutado, verde».
- **Un skip es un fallo.** Lo hace cumplir `conftest.py`.
- `MagicMock` prohibido en las capas L1 y L2: acepta cualquier método con
  cualquier firma, así que un caso de uso que llame a un método inexistente pasa
  en verde.

---

## 6. Desarrollo local

Lo que hace falta en la máquina: **Python 3.11 o más**, **Node 22.12 o más**,
**git** y **Docker** (sólo para la base). Estos comandos funcionan igual en
PowerShell y en Git Bash: por eso ninguno lleva `&&`.

```
copiar .env.dev.example a .env
docker compose -f docker-compose.desarrollo.yml up -d

cd backend
pip install -r requirements.txt -r requirements-dev.txt
uvicorn app.main:app --reload
```

El `.env` lo lee `backend/app/composicion/ajustes.py` **sólo para rellenar lo que
no esté ya en el entorno**; en el servidor la configuración entra por `env_file:`
del compose y este archivo ni existe dentro de la imagen.

Al arrancar, el lifespan aplica `db/*.sql` con el motor de
`backend/app/adaptadores/salida/postgres/migraciones.py` y deja constancia en la
tabla `esquema_migracion`. Hasta que eso termine bien, `/health` responde **503**
diciendo que el esquema no se aplicó: es lo correcto, no un error que ocultar.

En otra terminal:

```
cd frontend
npm ci
npm run dev
```

Vite proxea `/api` al backend en `127.0.0.1:8000` (ver `vite.config.js`), así que
no hay CORS en desarrollo, igual que en producción.

**El verificador del banner necesita un navegador**, y no viene con `npm ci`. Sin
esto falla con un error que no menciona que falte nada:

```
npx playwright install chromium
```

## 7. Quién te está mirando

**Ya estás observado, sin instrumentar nada.** El Alloy de la VM descubre todos
los contenedores por el socket de Docker, así que tus **registros** están en Loki
y tus **métricas de contenedor** (CPU, memoria, red, disco) en Prometheus desde el
primer despliegue. No expongas `/metrics`: nadie lo raspa. No añadas ningún
`<script>` de analítica: lo inyecta el nginx del host, y ponerlo además aquí
contaría cada visita **dos veces**.

Lo que sí hay que pedir, y lo pide una persona:

| Qué | Dónde | Sin eso… |
|---|---|---|
| la **sonda** de tu dominio | dos líneas en `coipo_grafana` | nadie se enterará de que tu sitio dejó de responder |
| el **alta en Umami** | el id lo crea una persona en su interfaz, y la línea va en `coipo_umami` | el script se inyecta vacío: no se mide nada y nada falla |

Tu `ops/nginx-host/<dominio>.conf` ya trae el `include` de la analítica en el
bloque correcto —en el de arriba perdería `Host` y `X-Real-IP` sin ningún error—,
pero **instalarlo en la VM es a mano, con sudo**: el despliegue no toca
`/etc/nginx`.

**Y una regla que te toca a ti: no pongas datos personales en la RUTA de las
URL.** Umami no guarda la IP ni usa cookies, pero la ruta la guarda siempre.
`/persona/12345678-9` deja un RUT en la base de analítica; `/persona/4821` no.

El detalle completo, con los pasos exactos: `docs/OBSERVABILIDAD.md` de la
fábrica.

## 8. Cómo se comprueba

```
git add -A
python ..\coipo_jueces\jueces\correr.py --repo . --modo advisory --perfil aplicacion
```

`git add -A` primero: los jueces leen `git ls-files`, y sin eso miran de menos.
La ruta supone que `coipo_jueces` está clonado **al lado** de este repositorio,
que es la convención del Paso 0 de `docs/COMO-USAR-LA-FABRICA.md` de la fábrica.

```
cd backend
pytest -m t0
```

```
cd frontend
npm run verificar:banner
npm run verificar:titulo
```

Los dos **MIDEN lo pintado**, no leen la configuración. `verificar:banner` mide el
alto del banner, el filete y el fondo sin imagen. `verificar:titulo` ejecuta la hoja
con un título largo y comprueba que el texto superpuesto no tapa la marca, no pisa el
remate, no lleva caja y **se lee**: mide la tinta y el contraste sobre los píxeles
pintados, no sobre los colores declarados. Una aplicación sembrada **no pone texto
sobre el banner por defecto** —el JPEG ya imprime el nombre de la unidad, y la versión
**no existe de verdad**: `/health` da el commit y la fecha de construcción, y la
versión vale `0.0.0` (decisión D11, abierta)—; si la tuya lo pone (`titulo` o
`subtitulo` en `App.jsx`), ese es el verificador que la protege. Hasta que se selle,
`verificar:titulo` es un archivo tuyo y su paso del CI sale con `continue-on-error`:
mira su anotación. La regla es el `UI-1` del estándar de interfaz, enmendado y firmado
el 2026-10-12 (texto sin caja, en una zona medida; ya no se usa `--fin-marca`): está en
`identidad/ESTANDAR_UI.md` de la fábrica.

Los jueces devuelven **cuatro veredictos**, no dos: `OK`, `HALLAZGOS`,
`NO_APLICA` y `SIN_EVALUAR`. **`SIN_EVALUAR` no es un aprobado**: significa que
ese juez no encontró nada que comprobar, y eso o es correcto o es que este
repositorio no tiene la forma que dice tener.

Si un juez te marca algo que crees legítimo, **puede que el juez esté
equivocado**. Ha pasado varias veces. Escribe el caso en vez de suprimirlo: se
corrige el juez.

---

## 9. Reglas que no puedes romper

1. **No inventes.** Ni archivos, ni endpoints, ni tablas, ni variables de
   entorno. Si no lo has abierto, no existe.
2. **Di de dónde sabes cada cosa**: `VERIFICADO` (con archivo y línea),
   `INFERIDO` (de qué), `DESCONOCIDO` (decirlo es la respuesta correcta) o
   `CONTRADICHO` (nombra las dos fuentes).
3. **No reproduzcas secretos** aunque los encuentres versionados. Nómbralos por
   archivo y línea, nunca por valor.
4. **Nada irreversible sin permiso**: migraciones sobre bases reales, borrados,
   despliegues, `push --force`, rotación de credenciales, `gh repo rename`.
5. **No cierres un `[PENDIENTE]` ni un `[VERIFICAR]` por tu cuenta.**
6. **No hay rollback en el despliegue.** El `rsync --delete` borra el árbol
   anterior antes de construir. Todo lo que se pueda verificar, se verifica
   ANTES del push.

---

## 10. Por dónde empezar

Si vas a implementar la lógica de negocio, no empieces por el código: usa
**[`prompts/00-plan-de-implementacion.md`](prompts/00-plan-de-implementacion.md)**,
que lee los insumos y produce un plan antes de escribir nada.


---

## Esta aplicación: Red de Casas Bienestar (rama feat_v2)

- Front v2 portado desde `alfredo-org/per_cabanas_v2` sobre la semilla: pantallas Bento por perfil
  (`frontend/src/vistas/`) y lógica de negocio en `frontend/src/logica/` (tarifas, temporadas,
  cobros por cuotas en nómina, transferencias, emergencias, sanciones, reglas del administrador).
- **Datos: MOCK.** Todo vive en `frontend/src/logica/fixtures/` y en el localStorage del navegador
  (`logica/api/store.js`); el backend sembrado sólo responde `/health`. Las llamadas de `logica/api/`
  imitan la forma de la futura API FastAPI, que es la fase 2.
- Las reglas de cobro no se cambian sin test: `npm test` (48 casos, `logica/*.test.js`).
- Hallazgos de lógica abiertos: `docs/HALLAZGOS-V2.md`.

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
