# Alcance — Mockup del Sistema de Reservas Bienestar CONAF

**Repo:** `Sud-Austral/coipo_cabania` · **Fecha de levantamiento:** 28 de julio de 2026
**Fuente de requisitos:** `INSUMO/Solicitud Sistema Reservas Bienestar.pdf` (Servicio de Bienestar, julio 2026) + entrevista de alcance con Luis Monsalve (Unidad de Información y Análisis Institucional).

---

## 1. Resumen ejecutivo

Mockup navegable, **solo frontend (React)**, del futuro Sistema de Reservas en Línea de la Red de
Casas de Huéspedes y Veraneo del Servicio de Bienestar CONAF (34 inmuebles entre Antofagasta y
Magallanes). Se presentará en la reunión con Bienestar (en ~1 semana) para **validar los casos de
uso antes de construir el backend** (FastAPI) y la base de datos (PostgreSQL 17 compartido).
La solicitud formal está aprobada con prioridad mínima; el mock es la base real del producto:
lo que se apruebe en él define el desarrollo posterior.

## 2. Usuarios y sus capacidades

El acceso a perfiles es mediante un **selector de rol simple siempre visible** (sin pantalla de login).

| Perfil | Qué puede hacer en el mock | Profundidad |
|---|---|---|
| **Afiliado/a** | Explorar catálogo con filtros, ver ficha (fotos, mapa, zonas de interés), consultar calendario, simular tarifa, reservar con grupo familiar y acompañantes, ver comprobante e historial | **Flujo completo de punta a punta, sin errores** |
| **Usuario no afiliado** | Mismo portal del afiliado, mostrando tarifa de usuario externo y aviso de prioridad de afiliados | Demostrativa |
| **Encargada regional** | Panel de reservas de su región (solicitada / confirmada / en curso / anulada), calendario por inmueble, confirmar/rechazar solicitudes, bloquear fechas por mantención | Demostrativa, poblada |
| **Oficina Central** | Todas las reservas del país, nómina de descuentos por período con estados (pendiente / informado / descontado) y exportación simulada, dashboard de reportes | Demostrativa, poblada |
| **Administrador** | Mantención de inmuebles (lista + formulario), gestión de temporadas, bloqueos/sanciones de usuarios, carga de nómina de afiliados, sección de auditoría con registros de ejemplo | Demostrativa, poblada |

## 3. Funcionalidades en alcance (priorizadas)

### Crítico — sin esto no hay demo
1. Selector de rol para los 5 perfiles.
2. Catálogo de los 34 inmuebles con filtros (región, localidad, tipo, capacidad, fechas).
3. Ficha de inmueble: fotografías, descripción, capacidad, equipamiento, mapa interactivo
   (Leaflet + OpenStreetMap), zonas de interés con distancias. Ficha **completa para 4-5
   inmuebles "vitrina"**; ficha básica para el resto.
4. Calendario de disponibilidad por inmueble.
5. Flujo de reserva: fechas, motivo (médica / laboral / personal), registro de ocupantes
   (titular, grupo familiar, otros acompañantes) con validación de capacidad máxima.
6. Simulación de tarifa (tipo de inmueble × noches × categoría de cada ocupante × motivo).
7. Comprobante de solicitud y estados de reserva visibles.
8. Historial de reservas del afiliado.

### Importante — vistas pobladas y coherentes
9. Vista de usuario no afiliado (tarifa externa + prioridad de afiliados).
10. Panel de encargada regional: gestión de solicitudes, calendario operativo, bloqueo de
    fechas, registro visual de check-in/check-out.
11. Oficina Central: nómina de descuentos con estados y botón de exportación simulado.
12. Dashboard de reportes: ocupación por región, reservas por motivo, ranking de inmuebles.
13. Administrador: mantención de inmuebles, temporadas (verano/invierno), bloqueos y
    sanciones de usuarios.
14. Pantalla de carga de nómina de afiliados (representación visual de la integración).
15. Sección de auditoría con registros de ejemplo (alude a Ley 19.628 / 21.719).

### Deseable — si alcanza el tiempo
16. Desistimiento en línea con la política de cobro representada visualmente.
17. Responsivo móvil pulido (el criterio de aceptación es notebook/proyector).
18. Lista de espera y reglas de prelación representadas en el panel regional.

## 4. Funcionalidades fuera de alcance (de esta versión)

| Qué | Por qué queda fuera |
|---|---|
| Backend FastAPI y base de datos PostgreSQL | Fase siguiente, después de validar los casos de uso en la reunión |
| Login real y autenticación (institucional o Clave Única) | Irrelevante para un mock; se define en la fase de backend |
| Correos de notificación reales | Los estados se muestran solo en pantalla |
| Exportaciones reales (CSV/Excel/PDF) | Botones con descarga simulada |
| Validación real contra nómina de afiliados | Todos los datos son ficticios |
| Pagos en línea | El propio PDF lo deja como evolución futura |
| ~~Deploy en servidor CONAF (pipeline `infra-docker-base`)~~ | Se adelantó a esta fase (12-08-2026): la maqueta se despliega en `reserva-bienestar.conaf.cl`, puerto 8114, con un único contenedor. Ver §10 |

## 5. Integraciones requeridas

- **Reales en el mock: ninguna.**
- **Representadas visualmente** (a pedido del usuario, para abrir el tema en la reunión):
  1. Carga de nómina de afiliados de Bienestar (vista administrador).
  2. Nómina de descuentos que consume Remuneraciones, con estados pendiente / informado /
     descontado (vista Oficina Central).
- **Futuras (fase backend):** nómina de afiliados, remuneraciones, correo institucional,
  autenticación institucional.

## 6. Restricciones técnicas confirmadas

- Frontend: **React 19 + Vite 8** (scaffold existente en `frontend/`), lint con oxlint.
- Todo **open source** (requisito del PDF). Mapa: Leaflet + OpenStreetMap.
- **Capa de datos simulados (fixtures) separada**, con la forma de las respuestas que tendrá
  la API FastAPI, para reemplazo directo en la fase 2.
- Datos: 34 inmuebles con **nombre y ubicación reales** (anexo del PDF), fotos de stock y
  datos inventados. **Personas y RUTs 100 % ficticios.**
- Idioma: español.
- Publicación: **servidor CONAF** (`https://reserva-bienestar.conaf.cl`), con el pipeline
  institucional. Hasta el 12-08-2026 fue GitHub Pages; ver §10.
- Reglas de negocio del PDF representadas en la UI: prelación médica > laboral > personal,
  tarifas diferenciadas afiliado/externo, temporadas y bloqueos.

## 7. Criterios de aceptación de esta versión

1. El **flujo del afiliado corre completo sin errores**: catálogo → ficha → calendario →
   simulación de tarifa → reserva → comprobante.
2. Las **5 vistas de perfil se ven pobladas y coherentes** en pantalla de notebook/proyector.
3. Publicado y accesible en GitHub Pages con al menos 1 día de margen antes de la reunión.
4. Ningún dato personal real en el mock.
5. (Deseable, no exigible: usable en móvil.)

## 8. Estado de construcción (29 de julio de 2026)

**La maqueta está construida y verificada.** Todo lo listado como *crítico* e
*importante* está implementado, más los tres *deseables*.

| Verificación | Resultado |
|---|---|
| Flujo del afiliado de punta a punta | 28 comprobaciones automatizadas en el navegador, sin errores |
| Las 15 vistas de los 5 perfiles | Todas cargan pobladas, sin errores de consola |
| Build de producción con base `/coipo_cabania/` | Mismas verificaciones, mismo resultado |
| Móvil (375 px) | 10 vistas sin desplazamiento horizontal |

Scripts de verificación reutilizables en `frontend/qa/` (requieren el servidor
corriendo): `flujo-afiliado.mjs`, `todos-los-perfiles.mjs`, `revision-movil.mjs`.

Añadido sobre el alcance original: 12 inmuebles con ficha completa (en vez de 5),
lista de espera ordenada por prelación, aviso de cierre por postulación estival, y
guarda de perfil al entrar por enlace directo a una sección ajena.

**Pendiente para publicar:** GitHub Pages debe habilitarse una vez a mano en
*Settings → Pages → Source = «GitHub Actions»*. El workflow ya construye y pasa el
lint correctamente; solo falla ese paso. Tras habilitarlo, basta re-ejecutar el
workflow para que el sitio quede en https://sud-austral.github.io/coipo_cabania/

El recorrido sugerido para la reunión está en `docs/GUION_DEMO.md`.

## 9. Preguntas sin respuesta

1. **Fecha exacta de la reunión** → se asumió "en ~1 semana desde el 28-07-2026" y entrega
   con 1 día de margen. Confirmar día.
2. **¿El repo puede ser público?** GitHub Pages gratuito requiere repo público (o plan pago
   de la organización). Si debe permanecer privado, definir alternativa.
3. **Tarifas**: se inventarán cifras verosímiles. Si existe la tabla de tarifas vigente y
   conviene mostrarla real, cargarla tal cual.
4. **Fotos**: se usará stock genérico. ¿Existe material fotográfico real de algún inmueble
   que convenga usar en los 4-5 vitrina?
5. **Inmuebles "vitrina"**: propuesta inicial — Bahía Inglesa, Viña del Mar, Radal 7 Tazas,
   P.N. Puyehue y Punta Arenas (una por macrozona). Confirmar o cambiar.
6. **Nombre visible del sistema** en el header del mock (el PDF no fija un nombre corto;
   propuesta: "Red de Casas Bienestar CONAF").
