/* Banner institucional CONAF — la cabecera de la aplicación.
 *
 * La geometría NO se decide aquí: sale de `src/marca.json`, que la midió sobre
 * el JPEG, y de `src/estilos/tokens.css`. Este componente elige QUÉ asset pinta,
 * con qué texto alternativo y si hay un texto superpuesto; DÓNDE va ese texto lo
 * dice la hoja, con los tokens.
 *
 * TRES PROHIBICIONES, Y LAS TRES VIENEN DEL INSUMO GRÁFICO
 * ========================================================
 *  1. Nada de `object-fit: cover`. Sobre un asset de 17,13:1 amputa el filete
 *     bicolor superior, que es la parte que identifica a CONAF. El piso de
 *     altura se consigue con `overflow: hidden` + `width: max(...)`, que sólo
 *     recorta por la DERECHA.
 *  2. Nada de texto sobre el remate derecho: blanco sobre #5e8f19 da 3,88:1 y
 *     AA para texto normal exige 4,5:1. Ni sobre la marca.
 *  3. El banner NO es `sticky`. Si la barra de navegación ya es fija, dos
 *     elementos fijos se comen ~160 px permanentes de una herramienta que se
 *     escanea de un vistazo.
 *
 * EL TEXTO SUPERPUESTO (`titulo`, `subtitulo`) ES OPCIONAL Y VA SIN CAJA
 * ======================================================================
 * Una aplicación sembrada no pasa ninguno por defecto: el JPEG ya imprime el
 * nombre de la unidad y repetirlo es ruido. Si hay texto, la hoja lo coloca
 * sobre el campo plano, sin fondo. Hasta el 2026-10-05 este componente lo
 * envolvía en una `.banner-titulo-franja` con fondo sólido; encima de la imagen
 * eso se veía como un recuadro y tapaba la marca (ver la hoja).
 *
 * Lo que se pinta lo verifican `scripts/verify-banner.mjs`, que mide el alto
 * real en el navegador contra `marca.json`, y `scripts/verificar-titulo.mjs`,
 * que ejecuta la hoja con un título largo y mide dónde cae y qué píxeles toca.
 * Este componente puede estar bien y el resultado estar mal: por eso la
 * comprobación mide, no lee.
 */

import { useEffect, useRef, useState } from 'react'

import marca from '../marca.json'
import './BannerInstitucional.css'

/* Duplicado consciente con `--umbral-asset-corto` de la hoja de estilos: una
 * media query no puede leer una custom property, así que el número vive en los
 * dos sitios. El `useEffect` de abajo comprueba en DESARROLLO que coincidan. */
const UMBRAL_ASSET_CORTO = marca.umbralAssetCorto ?? 560

/* Prefijo `use` a proposito pese al resto de nombres en espanol: es lo que
 * permite a las reglas de hooks reconocerlo como tal y revisar su interior. */
function useAnchoDeVentana() {
  const [ancho, setAncho] = useState(
    () => (typeof window === 'undefined' ? Infinity : window.innerWidth),
  )
  useEffect(() => {
    const alCambiar = () => setAncho(window.innerWidth)
    window.addEventListener('resize', alCambiar)
    return () => window.removeEventListener('resize', alCambiar)
  }, [])
  return ancho
}

export default function BannerInstitucional({ href = '/', titulo, subtitulo }) {
  const ancho = useAnchoDeVentana()
  const cabecera = useRef(null)

  /* Por debajo del umbral se cambia de asset, no se escala el largo. El asset
   * corto es una composición distinta —4,94:1 en vez de 17,13:1— pensada para
   * que la marca siga legible en un ancho estrecho. Escalar el largo la dejaría
   * en unos pocos píxeles. */
  const usarCorto = ancho < UMBRAL_ASSET_CORTO
  const asset = usarCorto ? marca.corto : marca.largo

  useEffect(() => {
    if (import.meta.env.PROD || !cabecera.current) return
    /* La hoja declara el token en `.banner-institucional`, no en `:root`: se lee de ahí.
     * Leerlo de <html> daba siempre '' y la guarda nunca podía avisar. */
    const enCss = getComputedStyle(cabecera.current)
      .getPropertyValue('--umbral-asset-corto').trim()
    if (enCss && Number(enCss) !== UMBRAL_ASSET_CORTO) {
      console.warn(
        `[banner] el umbral del asset corto no coincide: marca.json dice ` +
        `${UMBRAL_ASSET_CORTO} y la hoja de estilos ${enCss}. Con dos valores ` +
        `distintos hay un rango de anchos donde el fondo y la imagen no casan.`,
      )
    }
  }, [])

  const imagen = (
    <img
      className="banner-imagen"
      src={`/${asset.archivo}`}
      /* El alto y el ancho reales evitan el salto de maqueta mientras la imagen
       * decodifica: sin ellos el contenido de debajo se mueve al cargar. */
      width={asset.ancho}
      height={asset.alto}
      alt={marca.nombreOficial ?? `Banner institucional de ${marca.etiqueta}`}
      /* `eager` porque está en la primera pantalla: diferirlo produce
       * exactamente el salto que los atributos de arriba evitan. */
      loading="eager"
      decoding="async"
    />
  )

  return (
    <header className="banner-institucional" ref={cabecera}>
      {href ? (
        <a className="banner-enlace" href={href}>{imagen}</a>
      ) : (
        imagen
      )}

      {/* Superpuesto, NO dentro del <a>: el banner entero enlaza al inicio, pero el
          texto es de la página, no parte del nombre accesible del enlace. Sin
          envoltura ni fondo: dónde va y cómo se corta lo dice la hoja. Por debajo
          de 560 px la misma regla lo baja a su propia franja bajo la imagen. */}
      {(titulo || subtitulo) && (
        <div className="banner-titulo">
          {titulo && <span className="banner-titulo-nombre">{titulo}</span>}
          {subtitulo && <span className="banner-titulo-meta">{subtitulo}</span>}
        </div>
      )}
    </header>
  )
}
