---
name: arreglar-un-hallazgo
description: 'Resolver un hallazgo BLOQUEA o AVISA del gate de coipo_jueces sobre esta aplicación. Úsala cuando se pegue la salida de correr.py, cuando se pregunte "cómo cierro este hallazgo", "el gate me bloquea el deploy" o cuando alguien proponga suprimir una regla.'
---

# Resolver un hallazgo del gate

El procedimiento vive en la fábrica:

```
..\coipo_master_produccion\prompts\30-arreglar-un-hallazgo.md
```

Ábrelo con el hallazgo completo delante, tal como lo imprimió `correr.py`. Si esa
ruta no existe, la fábrica no está clonada al lado: pídela en vez de improvisar.

> **El modo de muerte de todo este trabajo no es que los jueces fallen: es que
> alguien con prisa aprenda que suprimir cuesta menos que arreglar.**

## Lo que no se negocia

1. **Decide primero quién está mal**, y escríbelo: ¿el código, o el juez? Medido:
   la primera vez que el gate corrió sobre una aplicación real, **5 de 6
   bloqueantes eran defectos del juez**.
2. **Justifica el arreglo por su manifestación en producción**, nunca por el
   color del gate.
3. **Suprimir es la última salida y se paga**: motivo de más de 12 caracteres en
   la primera línea del archivo, y una fila en el `DEUDA.md` de esta aplicación.
   Cada supresión sale contada en el resumen del CI, a propósito.

## El caso `SEM-1`, que es el más frecuente aquí

`SEM-1` dice que una pieza **congelada** de la semilla está editada en este
repositorio. Antes de tocar nada, pregunta cuál de los tres es:

- **La corrección es buena para toda la flota** → va en `semilla/CONGELADO/` de
  la fábrica, se vuelve a sellar y llega a todas. Nunca sólo aquí.
- **Sirve sólo aquí** → sácalo a un archivo propio que no esté en el lock.
- **Este repositorio se quedó atrás** (el lock cambió y esta aplicación no) →
  no se edita nada a mano:

```
python ..\coipo_master_produccion\semilla\sembrar.py --destino . --actualizar
```

Eso reescribe **sólo** las piezas selladas y deja intacto lo que esta aplicación
adaptó. Exige el árbol de trabajo limpio, para que el diff se pueda revisar.
