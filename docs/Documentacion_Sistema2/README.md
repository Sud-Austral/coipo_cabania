# Documentacion_Sistema2 — Red de Casas Bienestar (maqueta)

Paquete documental por rol generado desde el código el 2026-11-13. **Es la primera versión del
paquete en este repositorio**: no existe `docs/Documentacion_Sistema` (v1). La carpeta se llama
`Documentacion_Sistema2` por la convención de la flota, no porque exista otra.

## Antes de leer: qué versión del código se documenta

El HEAD de `main` (commit 3b9bc29, «feat final») **no compila**: dejó marcadores de conflicto en
cuatro archivos (hallazgo H-01, verificado con `npx vite build`, rc=1). Este paquete documenta el
commit **0d44fb3** (2026-08-12), el último que compila. Lo que describen
`VERSION_2026.08.25.1.md` y `.2.md` (pago por transferencia, transferencias por confirmar) está a
medias en el HEAD y no se documenta como funcionalidad.

La app es una maqueta solo-frontend: sin servidor, sin autenticación (selector de perfil) y con
datos ficticios en el navegador. La separación entre perfiles es solo de interfaz (RN-02).

## Qué hay

| Carpeta | Contenido |
|---|---|
| `00_Analisis/` | Análisis: matriz de roles y de permisos, estados, reglas, hallazgos (7, 7 bis), sondas (7 ter) y cobertura calculada |
| `01_Manuales/` | Un manual por rol |
| `02_Casos_de_Uso/` | Un documento de casos de uso por rol |
| `03_QA/` | Checklist con una ficha por caso (todas en NOT TESTED) |
| `04_Trazabilidad/` | Planilla: trazabilidad, checklist, funcionalidades, endpoints, reglas, hallazgos, sondas, roles |
| `_imagenes/` | Capturas de la maqueta servida en local con datos ficticios |
| `_pdf/` | Copia en PDF con el índice calculado |

Qué leer primero: el análisis (sección 7, hallazgos) y luego el manual del rol.

## Cifras (calculadas por `scripts/exportar_pdf.py`)

<!-- cifras -->
| Indicador | Valor |
|---|---|
| Versión | 1.0 (2026-11-13), primera del paquete en este repositorio |
| Roles documentados | 5 |
| Funcionalidades | 52 |
| Casos de uso (y fichas QA) | 101 |
| Funcionalidades con caso | 52 de 52 |
| Capturas | 35 |
| Páginas en PDF | 325 |
| &nbsp;&nbsp;Analisis_y_Matriz_de_Roles.pdf | 20 páginas |
| &nbsp;&nbsp;Casos_Uso_Administrador.pdf | 20 páginas |
| &nbsp;&nbsp;Casos_Uso_Afiliado.pdf | 24 páginas |
| &nbsp;&nbsp;Casos_Uso_Encargada_Regional.pdf | 25 páginas |
| &nbsp;&nbsp;Casos_Uso_No_Afiliado.pdf | 24 páginas |
| &nbsp;&nbsp;Casos_Uso_Oficina_Central.pdf | 24 páginas |
| &nbsp;&nbsp;Checklist_QA_Casos_de_Uso.pdf | 66 páginas |
| &nbsp;&nbsp;Manual_Administrador.pdf | 19 páginas |
| &nbsp;&nbsp;Manual_Afiliado.pdf | 30 páginas |
| &nbsp;&nbsp;Manual_Encargada_Regional.pdf | 26 páginas |
| &nbsp;&nbsp;Manual_No_Afiliado.pdf | 24 páginas |
| &nbsp;&nbsp;Manual_Oficina_Central.pdf | 23 páginas |
<!-- /cifras -->

## Cómo se regenera (desde la raíz del repositorio)

```
python scripts/generar_documentacion.py   # valida y escribe DOCX + XLSX
python scripts/exportar_pdf.py            # índice, PDF (Word por COM, instancia propia) y cifras de este README
```

Capturas: compilar el frontend de 0d44fb3 con RUT y correos de las semillas reemplazados por
valores ficticios (99.999.xxx, @ejemplo.cl), servirlo con `vite preview` en 127.0.0.1 y correr
`python scripts/capturar_pantallas.py --url http://127.0.0.1:<puerto>`.

Generador: `scripts/docgen/` (decisiones.py fija roles, funcionalidades y nombres de capturas;
area_*.py tienen el contenido por rol).
