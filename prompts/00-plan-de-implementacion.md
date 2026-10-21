# Prompt: plan de implementación de la lógica de negocio

Se pega al inicio de una sesión, parado sobre este repositorio, **cuando la
plomería ya está sembrada y hay que escribir el sistema**.

Produce un plan. **No escribe código**, y eso es deliberado: en esta flota ya se
pagó el precio de empezar a programar antes de saber qué se estaba
construyendo, y el resultado fue tener el mismo módulo escrito dos veces con
contenido distinto en el mismo repositorio.

---

## El prompt (copiar desde acá)

```
Vas a proponer el plan de implementación de la lógica de negocio de esta
aplicación. NO escribas código todavía. Al final me entregas un plan y yo te
digo si empezamos.

## Paso 1 — Lee, en este orden, y no leas nada más hasta terminar

  1. CLAUDE.md               el stack, lo que está congelado, los invariantes
  2. insumos/00-PROBLEMA.md  qué está roto hoy y para quién
  3. insumos/01-SOLUCION.md  qué se acordó hacer, y EN QUÉ ITERACIONES
  4. proyecto.coipo.yaml     identidad, despliegue, y qué datos se tratan
  5. el árbol de backend/app/ y frontend/src/, para saber qué YA existe

Los insumos son la fuente de verdad. Si el código y el documento se
contradicen, manda el documento y me lo dices: esa distancia es un hallazgo.

## Paso 2 — Antes de planificar nada, dime esto

  a) EN QUÉ ITERACIÓN ESTAMOS. `01-SOLUCION.md` las declara. Todo lo que
     pertenezca a una iteración posterior queda FUERA del plan, aunque sea fácil
     y aunque «ya que estamos». Una iteración que se desborda deja de servir
     para validar con el área usuaria, que es para lo que existe.

  b) QUÉ HAY EN «FUERA DE LA V1» y que por tanto NO vas a proponer.

  c) LOS [PENDIENTE] Y [VERIFICAR] ABIERTOS que afectan a esta iteración, y
     cuáles la bloquean de verdad y cuáles no. Un `[VERIFICAR]` jurídico no
     bloquea una pantalla con datos falsos; sí bloquea el primer dato real.

  d) QUÉ ES LO MÍNIMO QUE HAY QUE ENSEÑARLE AL ÁREA USUARIA para que su
     respuesta cambie lo que se hace después. Todo lo demás es adorno caro.

## Paso 3 — El plan

Una lista ordenada de pasos. Cada paso lleva EXACTAMENTE esto:

  - QUÉ ARCHIVO se crea o se toca, con su ruta. Si no puedes nombrar el
    archivo, el paso está mal partido.
  - EN QUÉ CAPA vive, y por qué esa y no otra.
  - QUÉ HACE, en una frase que una persona del negocio entendería.
  - CÓMO SE COMPRUEBA QUE FUNCIONA. Un test con sus tres marcas, o una
    comprobación manual concreta. Un paso sin forma de comprobarlo no entra.
  - DE QUÉ DEPENDE. Si nada, dilo: los que no dependen de nada van primero.

Y el plan entero termina con: qué tiene que ser cierto para decir que esta
iteración está terminada. Escrito de forma que se pueda responder sí o no.

## Paso 4 — Las capas, que aquí no son decoración

Este proyecto es hexagonal y `backend/tests/arquitectura/test_capas.py` lo
verifica con `ast`. Al colocar cada archivo:

  dominio/     reglas puras. CERO imports de fastapi, sqlalchemy, httpx u os.
               Es donde va la regla de negocio, y se prueba en milisegundos.
  aplicacion/  casos de uso. Hablan con `puertos/`, nunca con adaptadores.
  adaptadores/ entrada (HTTP, tareas) y salida (Postgres, IAM, archivos).
  composicion/ el ÚNICO sitio que puede conocerlo todo, y donde se cablea.

Si un paso te obliga a saltarte esto, NO lo hagas y dímelo: o el plan está mal
o la regla necesita una excepción, y las excepciones se discuten, no se toman.

## Paso 5 — Lo que tienes que declarar, y no puedes callarte

  - LOS DATOS PERSONALES QUE TOCA CADA PASO. `proyecto.coipo.yaml` y la sección
    de datos de `01-SOLUCION.md` dicen qué se guarda, con qué finalidad, cuánto
    tiempo y qué pasa al vencer. Si un paso toca un campo marcado como dato
    sensible o como excepción declarada al patrón, dilo EN ESE PASO.
  - QUÉ EVENTOS DE AUDITORÍA genera cada operación de escritura. En este stack
    el log va en la misma transacción que el cambio: no es un añadido posterior.
  - QUÉ ROL PUEDE HACER QUÉ, endpoint por endpoint. Un endpoint sin guardia
    declarado es un endpoint abierto.
  - QUÉ NO SABES. Si el plan tiene un hueco porque falta una decisión mía,
    ponlo como paso con `[PENDIENTE: me lo tiene que responder <quién>]` en vez
    de rellenarlo con lo que suene razonable.

## Paso 6 — Lo que NO va en el plan

  - Nada que ya esté sembrado Y CABLEADO: `/health`, el banner, el despliegue,
    el runner de migraciones. Eso funciona desde el primer arranque.

  - **Lo que está sembrado pero NO cableado sí va en el plan**, y con nombre: la
    sesión (`adaptadores/entrada/http/sesion.py`), el cliente del IAM y la
    auditoría existen como librería congelada, pero `composicion/contenedor.py`
    no construye ninguno, no hay ruta `/auth/callback` y las variables que
    necesitan (`SESSION_SECRET`, `IAM_*`) no están en `ajustes.py` ni en
    `.env.example`. Hasta el 2026-09-15 este mismo prompt decía «ya está y está
    congelado», y el efecto era el peor posible: el plan daba por resuelta la
    autenticación de una aplicación que no tenía ninguna. Cablearlo es trabajo de
    esta aplicación, y hay que planificarlo.
  - Nada de una iteración posterior.
  - Refactores de lo congelado.
  - «Preparar la base para el futuro». Lo que no se usa en esta iteración no se
    escribe en esta iteración.

## Cómo termina

  1. En qué iteración estamos y qué queda fuera.
  2. El plan, ordenado, con los pasos que no dependen de nada primero.
  3. Los [PENDIENTE] y [VERIFICAR] que lo bloquean, y a quién hay que
     preguntarle cada uno.
  4. Qué tiene que ser cierto para decir que la iteración terminó.
  5. Lo que no pudiste responder leyendo el repositorio.

Y no empieces a escribir código hasta que yo te lo diga.
```

---

## Después del plan

Cuando el plan esté aprobado y se empiece a escribir, sigue valiendo el gate:

```bash
git add -A
python <ruta>/coipo_jueces/jueces/correr.py --repo . --modo advisory --perfil aplicacion
```

Si un juez marca algo que parece legítimo, el sospechoso por defecto es el juez.
Está pasando: ya se han corregido varios por falsos positivos, y cada corrección
dejó una prueba de regresión.
