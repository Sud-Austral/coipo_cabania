---
name: leer-el-repositorio
description: 'Entender esta aplicación sin inventar nada, dejando por escrito qué está VERIFICADO y qué es INFERIDO. Úsala SIEMPRE lo primero, antes de opinar, planificar o tocar código, y cuando se pida "analiza este repo", "entiende qué hace" o "audita".'
---

# Leer este repositorio de verdad

Lo primero, siempre. El procedimiento completo vive en la fábrica:

```
..\coipo_master_produccion\prompts\00-leer-el-repositorio.md
```

Si esa ruta no existe, la fábrica no está clonada al lado de este repositorio:
dilo y pídela, en vez de reconstruir el procedimiento de memoria.

Y antes que nada, aquí mismo: **`CLAUDE.md` de la raíz es el contrato de esta
aplicación** y gobierna sobre cualquier otra cosa del repositorio.

## Lo que no se negocia

1. **Cada afirmación lleva estado.** `VERIFICADO` (lo viste y dices dónde),
   `INFERIDO`, `DESCONOCIDO`, `CONTRADICHO`. La cuarta es la que más trabajo
   ahorra después.
2. **Citar ruta y línea, o no afirmarlo.**
3. **No inventes archivos, endpoints, tablas ni variables de entorno.** Si no lo
   has abierto, no existe.
4. **No reproduzcas secretos**, aunque los encuentres versionados: nómbralos por
   archivo y línea, nunca por valor.
5. **`DESCONOCIDO` es una respuesta válida.** Lo que exige la VM, un login real o
   la red no se deduce leyendo.

## Lo que en esta aplicación conviene mirar antes de opinar

- `CLAUDE.md`, sección «Lo que está sembrado pero NO cableado»: hay piezas que
  existen como librería y **no** están conectadas. Darlas por hechas es el error
  más caro que se puede cometer aquí.
- `backend/app/composicion/ajustes.py`: la lista real de lo que el proceso exige
  sin valor por defecto, que no es la misma que la de `.env.example`.
- `.semilla`: con qué versión de la semilla nació esto y qué estándares declara.
