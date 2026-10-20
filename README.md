# coipo_cabania — Reservas de Casas de Veraneo · Bienestar CONAF

Maqueta funcional del sistema de reservas de las casas de veraneo del Servicio de
Bienestar de CONAF, desarrollada por la Unidad de Información y Análisis (UIA).

> **Rama `veraneo` (20-10-2026).** Reemplaza la maqueta anterior de casas de huéspedes y
> veraneo, que queda en `main` y en el historial. Esta rama **no se despliega**: el
> despliegue a producción solo corre con push a `main`. La infraestructura (Dockerfile,
> nginx, docker-compose y workflows) se mantiene igual, para que al pasarla a `main` se
> publique en reserva-bienestar.conaf.cl sin cambios.

Rige el **Reglamento General de Uso de Casas de Veraneo o Descanso** (propuesta de
actualización, octubre 2026). Las decisiones de diseño y los puntos por confirmar con
Bienestar están en [`docs/DECISIONES.md`](docs/DECISIONES.md).

**Ver la maqueta:** https://alvarozvjac.github.io/coipo_sistema-de-reservas/ (versión de un
solo archivo, con datos ficticios).

## Qué incluye

| Perfil | Funciones |
|---|---|
| Ingreso | «¿Es usted funcionario/a de CONAF?», RUT y código al correo; otros servicios públicos con sus datos |
| Solicitante | Buscar por región, calendario de disponibilidad, reserva con confirmación automática, pago por planilla o transferencia (cuadro con la cuenta y glosa), perro de asistencia con adjuntos, acta de entrega en PDF, mis reservas, desistimiento y postulación al sorteo de verano |
| Encargada regional | Llegadas y salidas, ocupación, reservas de la región, inventario por casa y reserva a nombre de otra persona |
| Oficina Central | Alertas, nómina de descuentos, pagos por registrar, devoluciones, casas y tarifas, bloqueos, sorteo de temporada alta (semilla auditable, lista de espera con 48 horas para aceptar, vacantes), reserva a nombre de otra persona y dashboard |
| Mantenimiento UIA | Pendiente |

## Cómo ejecutarla

Requiere Node.js 22 (Vite 8).

```powershell
cd frontend
npm install
npm run dev
```

Abrir http://localhost:5173. En la pantalla de ingreso, el recuadro **«Maqueta · probar
como»** carga una persona ficticia de cada perfil; el código se muestra en pantalla porque
la maqueta no envía correos. **«Reiniciar datos de prueba»**, en el pie, vuelve los datos al
estado inicial.

- `npm run build`: versión para el contenedor (la usa `frontend/Dockerfile`).
- `npm run build:pagina`: versión de un solo archivo (`frontend/dist-pagina/github-pages/index.html`)
  para publicarla como página estática.
- `npm run lint`: revisión con oxlint.

## Estructura

```
frontend/src/
  datos/        casas.js, usuarios.js (nómina ficticia), inventarios.js y servicio.js
                (imita los endpoints de la futura API FastAPI; hoy guarda en localStorage)
  lib/          reglas.js (reglamento y parámetros), sorteo.js, indicadores.js, acta.js (PDF),
                csv.js, fechas.js, formato.js, guardar.js
  componentes/  plantilla, calendario, transferencia, postulación y elementos comunes
  paginas/      Ingreso.jsx, solicitante/, encargada/, central/, gestion/ (reserva asistida), otros/
docs/DECISIONES.md  alcance, decisiones tomadas y puntos por confirmar con Bienestar
INSUMO/             solicitud original y guías técnicas del ecosistema (sin cambios)
```

Todos los datos son de demostración: personas y RUT ficticios, fotos de referencia y
tarifas referenciales. Nada sale del navegador.
