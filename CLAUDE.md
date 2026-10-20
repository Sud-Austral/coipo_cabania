# coipo_cabania — Reservas de Casas de Veraneo · Bienestar CONAF

Maqueta solo-frontend (React 19 + Vite 8 + Tailwind 4, `frontend/`) del sistema de reservas
de las **casas de veraneo** del Servicio de Bienestar CONAF. Desde el 20-10-2026 el alcance
es solo casas de veraneo (las mixtas pasaron a veraneo) y rige el Reglamento General de Uso
de Casas de Veraneo o Descanso (propuesta de octubre 2026).

- Decisiones, reglas aplicadas y pendientes con Bienestar: `docs/DECISIONES.md`. Leerlo
  antes de cambiar reglas de negocio.
- Las reglas del reglamento están centralizadas en `frontend/src/lib/reglas.js`
  (PARAMETROS) y el sorteo en `frontend/src/lib/sorteo.js`.
- `frontend/src/datos/servicio.js` imita los endpoints de la futura API (FastAPI +
  PostgreSQL, fase 2) y guarda en localStorage; cada función devuelve los mismos campos que
  devolverá la API. Al cambiar la forma de los datos, subir la versión de la clave de
  almacenamiento (`CLAVE`).
- Todos los datos son ficticios. No incorporar datos personales reales.

## Despliegue

Un push a `main` despliega en producción (servidor CONAF, puerto 8114,
reserva-bienestar.conaf.cl) con `.github/workflows/deploy-prod.yml`. Ese workflow, el
`docker-compose.yml`, `frontend/Dockerfile` y `frontend/nginx.conf` siguen el estándar del
ecosistema (`INSUMO/`) y no se editan por app. Trabajar en ramas y pasar a `main` solo con
acuerdo del equipo UIA.
