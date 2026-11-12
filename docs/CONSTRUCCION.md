# Construcción — consultas a la fábrica

Registro de lo que se consultó antes de escribir código en este repositorio.

## 2026-11-10 — Marcadores de conflicto en `main` (el build fallaba)

**Tarea:** quitar los marcadores `<<<<<<< Updated upstream` / `>>>>>>> Stashed changes`
que están en el commit actual de `main` y dejar la maqueta funcionando.

### IGNUS

- Herramienta: `ver_metodologia`, instancia `conaf`,
  sombrero `smb-metodologia-construir-una-aplicacion-coipo-con-la-fabrica`.
- `correlation_id`: `corr-1794340738227-00520001` (`success: true`, `ORQ26_ver_metodologia`).
- Devolvió «Construir una aplicación COIPO con la fábrica», versión 1.0, vigente:
  11 objetivos (9 de flujo, 2 de capacidad). Se consultó con profundidad `estructura`
  (ids y nombres, sin el contenido de cada nodo).
- Objetivo que corresponde a esta tarea: «Juzgarse antes de decir que está»
  (`obj-juzgarse-antes-de-decir-que-esta-08kn`) y «Revisar la interfaz como la ve la
  persona» (`obj-revisar-la-interfaz-como-la-ve-la-persona-ipmc`). Los de sembrar, plan
  y capacidades (Clave Única, correo) no intervienen: es una reparación sobre una maqueta
  solo-frontend ya existente.

### Grafo

- Comando: `consultar_grafo.py "marcadores conflicto stash build"`.
- Salida literal: `grafo conaf · 2026-11-10 · terminos ['marcadores', 'conflicto', 'stash', 'build'] · repo todos · 0 seccion(es)` /
  `nada en el grafo con esos terminos` (código de salida 1).
- **El grafo no tiene nada sobre esto.**

### n8n

No se consultó: la tarea no toca un flujo ni un dato de fuente externa.

### Qué se encontró (medido con git, 2026-11-10)

- Los marcadores entraron en el commit `3b9bc29` («feat final», 2026-08-27): 7 bloques en
  4 archivos (`api/reservas.js`, `api/store.js`, `pages/publico/FichaInmueble.jsx`,
  `pages/publico/Reservar.jsx`). Es un `git stash pop` con conflictos, commiteado sin resolver.
- El lado «Stashed changes» está incompleto: usa identificadores que no existen en ninguna
  ref del repositorio (`usuariosSeed`, `tarifasSeed`, `detalles`, `rutsInvalidos`,
  `rutsDuplicados`) y un `useSearchParams` sin importar. El resto de ese trabajo no llegó
  al repositorio.

### Qué se hizo y cómo se comprobó (2026-11-10)

- Por cada bloque se conservó el lado «Stashed» sólo donde lo que usa existe:
  - `store.js`: queda `datos_transferencia`; fuera `usuarios`, `tarifas_config`, `cobros`
    y `cargas_nomina` (semillas inexistentes y sin ningún consumidor en `src/`).
  - `reservas.js`: quedan fuerza mayor y pago por transferencia; fuera el registro de
    estadía con `detalles` (el parámetro no existe en la firma ni lo envía `PanelRegional`).
  - `FichaInmueble.jsx`: lado «Stashed» completo, más el import de `useSearchParams`.
  - `Reservar.jsx`: paso 1 con validación de disponibilidad; paso 2 sin `rutsInvalidos` /
    `rutsDuplicados` (no están definidos: la validación de RUT de acompañantes no llegó).
- Ejecutado: `npm run lint` (0), `npm run build` (0), `oxlint -D no-undef` sin
  identificadores propios sin definir, y contra `vite preview`: `todos-los-perfiles`
  15 de 15 sin errores de consola, `revision-movil` 10 de 10, `banner-institucional` 6 de 6,
  `flujo-afiliado` 27 de 28.
- La falla de `flujo-afiliado` es del guion, no de la app: busca el literal «Fechas
  seleccionadas», que `3b9bc29` reemplazó por «Ingreso el … y salida el …». No se tocó.
- **Lección:** quitar los marcadores y ver el build en verde no bastó. Con el lado
  «Stashed» entero el build pasaba y las 15 vistas quedaban en blanco
  (`usuariosSeed is not defined`); lo destapó el QA en navegador, no el compilador.
