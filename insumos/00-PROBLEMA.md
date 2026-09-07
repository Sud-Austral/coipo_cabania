# 00-PROBLEMA

Reconstruido desde el codigo hacia atras. La cadena es debil y va escrita como
tal: se sabe que hace el codigo, no que quiso resolver nadie.

## El problema, deducido de lo que se construyo

El sistema muestra un catalogo de inmuebles, permite pedir uno para un rango
de fechas y deja constancia de esa peticion con un comprobante
[frontend/src/pages/publico/Catalogo.jsx]
[frontend/src/pages/publico/Reservar.jsx]
[frontend/src/pages/publico/Comprobante.jsx]. Luego, probablemente, habia un
problema para pedir y adjudicar el uso de esos inmuebles [INFERIDO].

Hay una segunda cadena, mas concreta. Existe una lista de espera, un
calendario con motivos de bloqueo y un conjunto cerrado de estados por los que
pasa una solicitud, incluidos estados que ocupan el inmueble y estados que
generan cobro [frontend/src/components/reservas/ListaEspera.jsx]
[frontend/src/pages/regional/CalendarioOperativo.jsx]
[frontend/src/lib/estados.js]. Luego, probablemente, la demanda superaba a la
oferta y habia que ordenar quien va primero y que pasa si alguien se desiste
[INFERIDO]. Consistente con eso, hay una politica de desistimiento declarada
entre los datos de tarifas [frontend/src/fixtures/tarifas.js] [INFERIDO].

Una tercera: el sistema calcula una tarifa a partir de motivos y categorias de
ocupante, y luego arma una nomina de descuentos
[frontend/src/lib/tarifas.js] [frontend/src/components/reservas/ResumenTarifa.jsx]
[frontend/src/pages/central/NominaDescuentos.jsx]. Luego, probablemente, el
cobro terminaba en un descuento y ese paso se hacia aparte [INFERIDO].

Una cuarta: hay una pantalla de sanciones y otra de auditoria
[frontend/src/pages/central/Sanciones.jsx]
[frontend/src/pages/admin/Auditoria.jsx]. Luego, probablemente, habia
incumplimientos que castigar y decisiones que dejar registradas [INFERIDO].

## Quien sufre el problema

Los roles estan en el codigo. Hay un contexto que guarda el rol vigente
[frontend/src/context/RolContext.jsx], un componente que corta el acceso a una
pantalla segun el rol [frontend/src/components/layout/RequiereRol.jsx], una
navegacion que cambia por rol y una pantalla de inicio distinta por rol
[frontend/src/components/layout/AppLayout.jsx], y una lista de roles declarada
entre los datos de ejemplo [frontend/src/fixtures/usuarios.js].

Las pantallas estan agrupadas en cuatro ambitos, y esa agrupacion es la mejor
pista de a quien sirve cada cosa [INFERIDO]:

- Publico: catalogo, ficha del inmueble, solicitud y comprobante
  [frontend/src/pages/publico/Catalogo.jsx]
  [frontend/src/pages/publico/MisReservas.jsx].
- Regional: panel y calendario operativo
  [frontend/src/pages/regional/PanelRegional.jsx]
  [frontend/src/pages/regional/CalendarioOperativo.jsx].
- Central: reservas del pais, reportes, sanciones y nomina de descuentos
  [frontend/src/pages/central/ReservasPais.jsx]
  [frontend/src/pages/central/Reportes.jsx].
- Administracion: inmuebles, temporadas, carga de nomina y auditoria
  [frontend/src/pages/admin/InmueblesAdmin.jsx]
  [frontend/src/pages/admin/Temporadas.jsx].

Que estos cuatro ambitos correspondan a personas reales y con esos alcances es
[INFERIDO]. La lista de roles vive junto a los datos de ejemplo
[frontend/src/fixtures/usuarios.js], asi que puede ser una lista de trabajo y
no la definitiva [INFERIDO].

CUANTAS PERSONAS hay en cada rol: [PENDIENTE].
QUE UNIDAD administra el proceso: [PENDIENTE].

## Como lo resolvian antes

Hay una pantalla de carga de nomina con vista previa
[frontend/src/pages/admin/CargaNomina.jsx], lo que sugiere que existe un
archivo que se entrega desde fuera y se sube [INFERIDO]. El formato de ese
archivo no aparece en la evidencia [PENDIENTE].

Hay ademas dos documentos de insumo dentro del repositorio: uno de alcance y
otro de insumos, mas una solicitud en PDF [docs/ALCANCE.md]
[docs/INSUMOS_BIENESTAR.md] [INSUMO/Solicitud Sistema Reservas Bienestar.pdf].
Su contenido no se leyo, pero su existencia indica que hubo un encargo escrito
antes de construir [INFERIDO]. Quien lo escribio y cuando: [PENDIENTE].

Como se pedia y adjudicaba un inmueble antes de esto: [PENDIENTE].
Cuanto tardaba: [PENDIENTE].

## Que pasa si no se hace nada

[PENDIENTE]. El codigo no lo responde.

## Volumen

Indicios debiles. La estructura de datos de ejemplo separa regiones y tipos de
inmueble [frontend/src/fixtures/inmuebles.js] y hay temporadas
[frontend/src/fixtures/temporadas.js], lo que sugiere un dato con cobertura
nacional y estacional [INFERIDO]. No hay base de datos, indices ni paginacion
en la evidencia, asi que no hay ni siquiera un orden de magnitud tecnico que
leer.

Cuantos inmuebles, cuantas solicitudes por temporada y cuantos usuarios:
[PENDIENTE].

## Quien decide que esta terminado

[PENDIENTE], sin excepcion. Hay un guion de demostracion
[docs/GUION_DEMO.md] y una revision escrita [INSUMO/revision.md], lo que
sugiere que hubo al menos una instancia de muestra [INFERIDO], pero quien
aprueba no aparece.

## Advertencias que salen de la propia evidencia

- El README de este repositorio no describe este sistema: su texto trata de
  otro sistema, de una base de produccion y de una aplicacion movil
  [README.md]. Quien deba leerlo primero se va a equivocar de proyecto
  [INFERIDO]. Corregirlo es una decision del dueno del repositorio
  [PENDIENTE].
- El repositorio esta declarado como publico en la evidencia de origen, y a la
  vez contiene documentos de insumo y un README con una peticion de traspaso
  [README.md] [docs/INSUMOS_BIENESTAR.pdf]. Si eso es intencional o no es
  [VERIFICAR].
- El sistema manipula datos que serian personales si dejaran de ser de ejemplo:
  ocupantes, nomina y usuarios
  [frontend/src/components/reservas/OcupantesForm.jsx]
  [frontend/src/pages/central/NominaDescuentos.jsx]
  [frontend/src/fixtures/usuarios.js]. El tratamiento de esos datos es
  [VERIFICAR].
