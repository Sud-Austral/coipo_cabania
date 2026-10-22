import banner from '../assets/banner-conaf-uia.jpg'

/**
 * Franja institucional, como en las demás aplicaciones CONAF (p. ej.
 * programa-arborizacion.conaf.cl): la imagen ocupa todo el ancho y el nombre
 * del sistema va sobre ella, a la derecha de los logos. En pantallas angostas
 * la imagen se recorta por la derecha para que los logos no queden diminutos.
 */
export function Banner() {
  return (
    <div className="relative overflow-hidden bg-banner">
      <img
        src={banner}
        alt="CONAF · Unidad de Información y Análisis"
        width={3032}
        height={177}
        className="block h-14 w-auto max-w-none object-cover object-left lg:h-auto lg:w-full lg:max-w-full"
      />
      <div className="absolute inset-y-0 left-[29%] hidden flex-col justify-center pl-6 text-white lg:flex">
        <span className="text-[clamp(17px,1.25vw,24px)] font-bold leading-tight">Casas de Veraneo</span>
        <span className="text-[clamp(12px,0.75vw,14px)]">Servicio de Bienestar · CONAF</span>
      </div>
    </div>
  )
}
