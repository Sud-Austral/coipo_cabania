/**
 * Mapa de nombres lógicos de foto → archivo real.
 *
 * Los fixtures nombran las fotos de forma descriptiva ('bahia-1', 'urbano-3').
 * Acá esos nombres se resuelven a las imágenes de referencia disponibles: varias
 * entradas comparten archivo, porque son fotos de stock y no de los inmuebles
 * reales. La asignación busca dos cosas: que el exterior sea verosímil para la
 * zona (norte desértico, costa, montaña, urbano, bosque) y que dos inmuebles
 * contiguos del catálogo no muestren la misma imagen.
 *
 * Cuando Bienestar entregue las fotografías oficiales, basta reemplazar los
 * archivos de `src/assets/fotos/` y ampliar este mapa.
 *
 * Ver src/assets/fotos/CREDITS.md para el origen y la licencia.
 */

import extNorte from './fotos/ext-norte.webp'
import extRural from './fotos/ext-rural.webp'
import extCasaAmplia from './fotos/ext-casa-amplia.webp'
import extPatrimonial from './fotos/ext-patrimonial.webp'
import extCostaDepto from './fotos/ext-costa-depto.webp'
import extCostaCasa from './fotos/ext-costa-casa.webp'
import extSuburbano from './fotos/ext-suburbano.webp'
import extUrbano from './fotos/ext-urbano.webp'
import extUrbano2 from './fotos/ext-urbano-2.webp'
import extBosque from './fotos/ext-bosque.webp'
import extLodge from './fotos/ext-lodge.webp'
import extCabana from './fotos/ext-cabana.webp'
import extCabana2 from './fotos/ext-cabana-2.webp'
import extLagoMontana from './fotos/ext-lago-montana.webp'
import extNieve from './fotos/ext-nieve.webp'
import intLiving1 from './fotos/int-living-1.webp'
import intLiving2 from './fotos/int-living-2.webp'
import intLiving3 from './fotos/int-living-3.webp'
import intLiving4 from './fotos/int-living-4.webp'
import intLiving5 from './fotos/int-living-5.webp'
import intLiving6 from './fotos/int-living-6.webp'
import intLiving7 from './fotos/int-living-7.webp'
import intDorm1 from './fotos/int-dorm-1.webp'
import intDorm2 from './fotos/int-dorm-2.webp'
import intDorm3 from './fotos/int-dorm-3.webp'
import intDorm4 from './fotos/int-dorm-4.webp'
import intCocina from './fotos/int-cocina.webp'
import entPlaya from './fotos/ent-playa.webp'
import entMontana from './fotos/ent-montana.webp'
import entBosque from './fotos/ent-bosque.webp'
import entPaine from './fotos/ent-paine.webp'
import entPatagonia from './fotos/ent-patagonia.webp'
import bahiaReal1 from './fotos/bahia-real-1.webp'
import bahiaReal2 from './fotos/bahia-real-2.webp'
import bahiaReal3 from './fotos/bahia-real-3.webp'
import bahiaReal4 from './fotos/bahia-real-4.webp'
import bahiaReal5 from './fotos/bahia-real-5.webp'
import bahiaReal6 from './fotos/bahia-real-6.webp'
import bahiaReal7 from './fotos/bahia-real-7.webp'
import bahiaPlaya1 from './fotos/bahia-playa-1.webp'
import bahiaPlaya2 from './fotos/bahia-playa-2.webp'
import bahiaPlaya3 from './fotos/bahia-playa-3.webp'

const MAPA = {
  // ---- Vitrina: Bahía Inglesa (veraneo, costa de Atacama) ----
  // Fotos reales enviadas por Bienestar (oct-2026).
  'bahia-1': bahiaPlaya1,
  'bahia-2': bahiaReal1,
  'bahia-3': bahiaReal2,
  'bahia-4': bahiaReal3,
  'bahia-5': bahiaReal4,
  'bahia-6': bahiaReal5,
  'bahia-7': bahiaReal6,
  'bahia-8': bahiaReal7,
  'bahia-9': bahiaPlaya2,
  'bahia-10': bahiaPlaya3,

  // ---- Vitrina: Viña del Mar (veraneo, urbano costero) ----
  'vina-1': extCasaAmplia,
  'vina-2': intLiving2,
  'vina-3': intDorm4,
  'vina-4': intLiving6,
  'vina-5': entPlaya,

  // ---- Vitrina: Radal 7 Tazas (veraneo, montaña) ----
  'radal-1': extCabana2,
  'radal-2': intLiving5,
  'radal-3': intDorm2,
  'radal-4': intCocina,
  'radal-5': entMontana,

  // ---- Vitrina: P.N. Puyehue (veraneo, bosque valdiviano) ----
  'puyehue-1': extLodge,
  'puyehue-2': intLiving4,
  'puyehue-3': intDorm3,
  'puyehue-4': intLiving7,
  'puyehue-5': entBosque,

  // ---- Vitrina: Punta Arenas (huéspedes, austral urbano) ----
  'puntaarenas-1': extUrbano,
  'puntaarenas-2': intLiving1,
  'puntaarenas-3': intDorm4,
  'puntaarenas-4': intCocina,
  'puntaarenas-5': entPaine,

  // ---- Fichas completas: La Serena (veraneo, costa de Coquimbo) ----
  'laserena-1': extCostaDepto,
  'laserena-2': intLiving6,
  'laserena-3': intDorm1,
  'laserena-4': entPlaya,

  // ---- Fichas completas: Pichilemu (veraneo, costa de O'Higgins) ----
  'pichilemu-1': extRural,
  'pichilemu-2': intLiving2,
  'pichilemu-3': intDorm2,
  'pichilemu-4': entPlaya,

  // ---- Fichas completas: Vilches (huéspedes, precordillera del Maule) ----
  'vilches-1': extLagoMontana,
  'vilches-2': intLiving5,
  'vilches-3': intDorm4,
  'vilches-4': entMontana,

  // ---- Fichas completas: Concepción (huéspedes, urbano) ----
  'concepcion-1': extUrbano,
  'concepcion-2': intLiving1,
  'concepcion-3': intDorm1,
  'concepcion-4': intCocina,

  // ---- Fichas completas: P.N. Conguillío (veraneo, montaña) ----
  'conguillio-1': extNieve,
  'conguillio-2': intLiving4,
  'conguillio-3': intDorm2,
  'conguillio-4': entMontana,

  // ---- Fichas completas: Valdivia (huéspedes, urbano fluvial) ----
  'valdivia-1': extPatrimonial,
  'valdivia-2': intLiving7,
  'valdivia-3': intDorm3,
  'valdivia-4': entBosque,

  // ---- Fichas completas: Coyhaique (huéspedes, austral) ----
  'coyhaique-1': extSuburbano,
  'coyhaique-2': intLiving3,
  'coyhaique-3': intDorm4,
  'coyhaique-4': entPatagonia,

  // ---- Resto de la red, por zona ----
  'norte-1': extNorte, // Toconao (adobe blanqueado, altiplano)
  'costa-1': extUrbano2, // Bahía Inglesa 2
  'costa-2': extCostaDepto, // La Serena (Av. del Mar)
  'costa-3': extCostaCasa, // Las Cruces
  'costa-4': extPatrimonial, // Rocas de Santo Domingo (sector arbolado)
  'costa-5': extRural, // Pichilemu 1
  'costa-6': extCostaCasa, // Pichilemu 2
  'costa-7': extRural, // Pelluco, Puerto Montt
  'urbano-1': extUrbano, // Copiapó
  'urbano-2': extSuburbano, // Pichilemu huéspedes
  'urbano-3': extUrbano, // Concepción
  'urbano-4': extUrbano2, // Temuco
  'urbano-5': extPatrimonial, // Valdivia
  'urbano-6': extUrbano, // Puerto Montt huéspedes
  'urbano-7': extSuburbano, // Coyhaique
  'urbano-8': extUrbano2, // Santiago 1
  'urbano-9': extUrbano, // Santiago 2
  'bosque-1': extBosque, // R.N. Lago Peñuelas
  'bosque-2': extCabana, // R.N. Laguna Torca
  'bosque-3': extBosque, // El Belloto
  'bosque-4': extCabana, // Puyehue 2
  'bosque-5': extCabana2, // Anticura
  'bosque-6': extBosque, // Río Clarillo veraneo
  'bosque-7': extCabana, // Río Clarillo huéspedes
  'montana-1': extLagoMontana, // Vilches
  'montana-2': extNieve, // P.N. Conguillío
  'montana-3': extLagoMontana, // R.N. Malalcahuello
  'montana-4': extCabana, // La Junta
  'montana-5': extNieve, // Cochrane
}

/** Imagen de respaldo cuando el nombre no está en el mapa. */
const RESPALDO = entPatagonia

/** Inmuebles con fotos reales entregadas por Bienestar. */
export const FOTOS_REALES = new Set([2])
export const tieneFotosReales = (inmueble) => FOTOS_REALES.has(inmueble?.id)

export const rutaFoto = (nombre) => MAPA[nombre] ?? RESPALDO

/** Todas las fotos de un inmueble, ya resueltas a rutas utilizables. */
export const fotosDe = (inmueble) =>
  (inmueble?.fotos?.length ? inmueble.fotos : ['norte-1']).map((nombre) => ({
    nombre,
    ruta: rutaFoto(nombre),
  }))
