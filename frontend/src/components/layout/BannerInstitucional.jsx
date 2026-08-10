import banner from '../../assets/banner-conaf-uia.jpg'

/**
 * Banner institucional CONAF · Unidad de Información y Análisis.
 *
 * Va como primer hijo del <header> de AppLayout, a ancho completo de viewport.
 * La geometría vive en `.banner-institucional` (src/index.css), donde también
 * está escrito por qué no puede entrar en el contenedor `max-w-7xl`.
 *
 * No es un enlace: el nombre de la aplicación, justo debajo, ya lleva al
 * inicio, y dos enlaces contiguos al mismo destino estorban con lector de
 * pantalla. Además el anillo de foco global (verde-600) da 1,62:1 sobre el
 * verde del banner, o sea invisible: haría falta uno propio.
 *
 * `width` y `height` son las dimensiones ORIGINALES del asset: con
 * `height: auto` el navegador deriva el aspect-ratio y reserva la caja antes
 * de decodificar, así que no hay salto de contenido (CLS) y si la imagen
 * falla se ve la banda verde entera, nunca una franja blanca.
 */
export function BannerInstitucional() {
  return (
    <div className="banner-institucional">
      <img
        src={banner}
        alt="CONAF · Unidad de Información y Análisis"
        width={3032}
        height={177}
        fetchPriority="high"
        decoding="async"
      />
    </div>
  )
}
