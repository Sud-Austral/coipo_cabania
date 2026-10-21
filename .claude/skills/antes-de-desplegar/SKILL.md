---
name: antes-de-desplegar
description: 'Auditar esta aplicación antes de su primer push a main o antes de un despliegue. Úsala cuando se pida "revisar antes de desplegar", "está listo para producción", "pasar el gate" o "auditoría pre-deploy".'
---

# Antes de desplegar esta aplicación

El procedimiento vive en la **fábrica**, no aquí: es el mismo para las 24
aplicaciones de la flota y se mantiene en un solo sitio.

```
..\coipo_master_produccion\prompts\20-antes-de-desplegar.md
```

**Ábrelo y ejecútalo entero.** Si esa ruta no existe, la fábrica no está clonada
al lado de este repositorio: dilo y pide que se clone —
`gh repo clone Sud-Austral/coipo_master_produccion`, en la carpeta que contiene a
este repositorio— en vez de improvisar el procedimiento.

> **Esta skill CITA el prompt, no lo copia.** Es la regla que gobierna toda la
> flota: lo que se copia se pudre. `DOCKER.md` vive hoy en 10 repositorios con 3
> contenidos distintos.

## Lo que no se negocia, y se puede hacer aquí mismo

```
git add -A
python ..\coipo_jueces\jueces\correr.py --repo . --modo advisory --perfil aplicacion
```

`git add -A` primero, en su propia línea: los jueces leen `git ls-files`. Dos
comandos, dos líneas — en PowerShell 5.1 `&&` no existe.

Los veredictos son **cuatro**: `OK`, `HALLAZGOS`, `NO_APLICA` y `SIN_EVALUAR`.
**`SIN_EVALUAR` no es un aprobado.**

## Lo que ninguna máquina puede comprobar, y hay que preguntar

1. **El `APP_PORT` está libre en la VM.** Desde un repositorio es imposible
   saberlo, y si colisiona, el smoke test da VERDE contra el `/health` de otra
   aplicación.
2. **El `.env` existe en `/opt/apps/<app>/.env`**, con todo lo que
   `backend/app/composicion/ajustes.py` exige sin valor por defecto.
3. **`vars.SERVIDOR_LISTO` está en `true`** si ya existe ese `.env`; mientras no
   lo esté, el despliegue queda omitido a propósito.
4. **Alguien miró `/health` a mano** después del despliegue, y el campo `app`
   dice el nombre de ESTA aplicación.
