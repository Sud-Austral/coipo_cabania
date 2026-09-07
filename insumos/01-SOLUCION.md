# 01-SOLUCION

El codigo es la solucion, pero conviene decir de entrada que de que se trata:
el analizador no detecto ninguna ruta de servidor ni ninguna tabla en este
repositorio, y todo lo que se ve funciona en el navegador contra datos que
viven en el propio codigo [frontend/src/fixtures/reservas.seed.js]
[frontend/src/fixtures/gestion.seed.js] [frontend/src/api/client.js]
[frontend/src/api/store.js]. Es decir: lo construido es la interfaz completa
de un sistema, no el sistema en operacion [INFERIDO].

## Que hace

Permite mirar un catalogo de inmuebles y filtrarlo, abrir la ficha de uno con
sus fotos, su ubicacion en un mapa y su calendario de disponibilidad, y desde
ahi pedirlo para un rango de fechas siguiendo una secuencia de pasos que
recoge quienes van a ocuparlo y muestra la tarifa que resulta. Permite tambien
revisar las solicitudes propias, anular las que todavia lo admiten y obtener
un comprobante.

Del lado de quien administra, permite revisar y resolver solicitudes, bloquear
fechas de un inmueble por un motivo, mantener una lista de espera, ver el
conjunto de solicitudes del pais con graficos de resumen, registrar sanciones,
armar una nomina de descuentos, cargar una nomina desde un archivo con vista
previa, mantener el catalogo de inmuebles y las temporadas, y revisar un
registro de lo que se hizo.

## Capacidades, con cita

Consulta de inmuebles:

- Catalogo con filtros [frontend/src/pages/publico/Catalogo.jsx].
- Ficha del inmueble [frontend/src/pages/publico/FichaInmueble.jsx], con
  tarjeta resumen [frontend/src/components/inmuebles/InmuebleCard.jsx].
- Galeria de fotos [frontend/src/components/inmuebles/GaleriaFotos.jsx]
  [frontend/src/components/inmuebles/fotos.js].
- Ubicacion en mapa [frontend/src/components/inmuebles/MapaInmueble.jsx]
  [frontend/package.json:14].
- Zonas de interes por categoria
  [frontend/src/components/inmuebles/ZonasInteres.jsx].
- Calendario de disponibilidad
  [frontend/src/components/inmuebles/CalendarioDisponibilidad.jsx]
  [frontend/package.json:17].

Solicitud de uso:

- Solicitud por pasos [frontend/src/pages/publico/Reservar.jsx].
- Registro de ocupantes [frontend/src/components/reservas/OcupantesForm.jsx],
  con categorias y parentescos declarados
  [frontend/src/fixtures/tarifas.js].
- Calculo y resumen de tarifa [frontend/src/lib/tarifas.js]
  [frontend/src/components/reservas/ResumenTarifa.jsx].
- Solicitudes propias, con anulacion acotada a ciertos estados
  [frontend/src/pages/publico/MisReservas.jsx].
- Comprobante [frontend/src/pages/publico/Comprobante.jsx], con una captura de
  como sale impreso
  [INSUMO_GRAFICO/verificacion/coipo_cabania/comprobante-impresion.png].

Estados y reglas:

- Conjunto cerrado de estados, con su orden, cuales ocupan el inmueble y
  cuales generan cobro [frontend/src/lib/estados.js].
- Motivos y categorias que entran en la tarifa, y una politica de
  desistimiento [frontend/src/fixtures/tarifas.js].
- Temporadas [frontend/src/fixtures/temporadas.js]
  [frontend/src/pages/admin/Temporadas.jsx].

Gestion:

- Tabla de solicitudes con filtro por estado
  [frontend/src/components/reservas/TablaReservas.jsx].
- Lista de espera [frontend/src/components/reservas/ListaEspera.jsx].
- Calendario operativo con motivos de bloqueo
  [frontend/src/pages/regional/CalendarioOperativo.jsx].
- Panel regional [frontend/src/pages/regional/PanelRegional.jsx].
- Solicitudes de todo el pais [frontend/src/pages/central/ReservasPais.jsx].
- Reportes con graficos [frontend/src/pages/central/Reportes.jsx]
  [frontend/src/components/charts/graficos.jsx] [frontend/package.json:21].
- Sanciones por tipo [frontend/src/pages/central/Sanciones.jsx].
- Nomina de descuentos [frontend/src/pages/central/NominaDescuentos.jsx].
- Carga de nomina con vista previa
  [frontend/src/pages/admin/CargaNomina.jsx].
- Mantenimiento del catalogo de inmuebles
  [frontend/src/pages/admin/InmueblesAdmin.jsx].
- Registro de lo actuado, presentado por perfil
  [frontend/src/pages/admin/Auditoria.jsx].

Presentacion:

- Banner institucional [frontend/src/components/layout/BannerInstitucional.jsx]
  [frontend/src/assets/banner-conaf-uia.jpg]
  [INSUMO_GRAFICO/implementacion_banner.md].
- Componentes propios de tabla, modal, insignias y elementos de formulario
  [frontend/src/components/ui/Tabla.jsx] [frontend/src/components/ui/Modal.jsx]
  [frontend/src/components/ui/Badge.jsx]
  [frontend/src/components/ui/Elementos.jsx].

Verificacion:

- Guiones de revision automatizada del navegador para el banner, el flujo de
  una persona afiliada, la vista movil y todos los perfiles
  [frontend/qa/banner-institucional.mjs] [frontend/qa/flujo-afiliado.mjs]
  [frontend/qa/revision-movil.mjs] [frontend/qa/todos-los-perfiles.mjs]
  [frontend/package.json:29].
- Capturas de verificacion a varios anchos
  [INSUMO_GRAFICO/verificacion/coipo_cabania/banner-390.png]
  [INSUMO_GRAFICO/verificacion/coipo_cabania/banner-1920.png]
  [INSUMO_GRAFICO/verificacion/coipo_cabania/medidas.json].

## Roles: quien ve que

- El rol vigente se guarda en un contexto propio y se conserva bajo una clave
  [frontend/src/context/RolContext.jsx].
- El corte de acceso a una pantalla lo hace un componente envolvente
  [frontend/src/components/layout/RequiereRol.jsx].
- La navegacion y la pantalla de inicio cambian segun el rol
  [frontend/src/components/layout/AppLayout.jsx].
- Los roles estan enumerados junto a los datos de ejemplo
  [frontend/src/fixtures/usuarios.js].

Hay que ser explicito en una cosa: este control vive entero en el navegador y
el rol se elige del lado del cliente [frontend/src/context/RolContext.jsx]
[frontend/src/App.jsx]. Como separacion de vistas funciona; como control de
acceso, no se puede afirmar nada porque no hay servidor que lo imponga en la
evidencia [INFERIDO]. Que roles existan de verdad y con que alcance es
[PENDIENTE].

## De donde salen los datos

- Datos de ejemplo incluidos en el repositorio
  [frontend/src/fixtures/reservas.seed.js]
  [frontend/src/fixtures/gestion.seed.js]
  [frontend/src/fixtures/inmuebles.js] [frontend/src/fixtures/usuarios.js].
  Que sean sinteticos es [INFERIDO] por su ubicacion, no esta comprobado.
- Un almacen local en el navegador, bajo una clave propia
  [frontend/src/api/store.js], y un cliente que simula latencia
  [frontend/src/api/client.js]. La FUENTE de los datos es el propio navegador
  [INFERIDO]; el DUENO de los datos reales es [PENDIENTE].
- Modulos de acceso a datos ya separados por materia, listos para apuntar a
  otra fuente [frontend/src/api/inmuebles.js] [frontend/src/api/reservas.js]
  [frontend/src/api/gestion.js] [INFERIDO].
- Fotografias incluidas en el repositorio, con un archivo de creditos
  [frontend/src/assets/fotos/CREDITS.md]
  [frontend/src/assets/fotos/ext-cabana.webp]. Su licencia de uso es
  [VERIFICAR].
- Documentos de encargo dentro del repositorio [docs/ALCANCE.md]
  [docs/INSUMOS_BIENESTAR.md] [INSUMO/Solicitud Sistema Reservas Bienestar.pdf]
  [INSUMO/ui_ux.md]. Quien los entrego: [PENDIENTE].

## Que NO hace

Solo ausencias que el analizador busco de forma exhaustiva:

- El analizador no detecto ninguna ruta de servidor en el repositorio: no hay
  backend aca [frontend/src/api/client.js] [INFERIDO].
- No detecto ninguna definicion de tabla ni ningun manifiesto distinto del de
  la interfaz [frontend/package.json].
- No detecto ninguna variable de entorno declarada, ni siquiera para apuntar a
  un servidor [frontend/vite.config.js].
- No hay autenticacion contra un proveedor externo entre las dependencias
  declaradas [frontend/package.json:16]; el rol se elige en el cliente
  [frontend/src/context/RolContext.jsx] [INFERIDO].
- Que falte alguna funcion del negocio: [PENDIENTE]. La ausencia de evidencia
  no alcanza.

## Iteraciones

- Hay un flujo automatico de publicacion de paginas estaticas
  [.github/workflows/pages.yml], lo que sugiere que lo que existe se publica
  como sitio y no como aplicacion con servidor [INFERIDO].
- Hay un guion de demostracion [docs/GUION_DEMO.md] y una revision escrita
  [INSUMO/revision.md], lo que indica al menos una vuelta de comentarios
  [INFERIDO].
- Las capturas de verificacion estan duplicadas en dos ubicaciones, una
  generica y otra con el nombre de este proyecto
  [INSUMO_GRAFICO/verificacion/captura-banner-1366.png]
  [INSUMO_GRAFICO/verificacion/coipo_cabania/banner-1366.png], lo que sugiere
  que la verificacion visual se corrio mas de una vez [INFERIDO].
- No hay CHANGELOG ni etiquetas en la evidencia: la secuencia de versiones no
  se reconstruye desde aca [PENDIENTE].

## Nota sobre la evidencia

El README de este repositorio no habla de este sistema [README.md]. Todo lo
anterior sale del codigo y de los documentos de la carpeta de insumos, no del
README, precisamente por eso.
