/* Mapa chico de la ficha: dónde queda la casa (MapLibre + OSM, cargado solo al abrir la ficha).
   De noche, la misma capa raster invertida y desaturada (DISENO_BENTO.md → Mapas). */
import { useEffect, useRef, useState } from 'react'
import { useTema } from '../../diseno/index.js'
import { ESTILO, MapaGL, Marker, NavigationControl, pedir } from '../../mapa/maplibre.js'

export default function MapaCasa({ lat, lng, nombre }) {
  const caja = useRef(null)
  const mapa = useRef(null)
  const [listo, setListo] = useState(false)
  const [tema] = useTema()

  useEffect(() => {
    const m = new MapaGL({
      container: caja.current, style: ESTILO, transformRequest: pedir,
      center: [lng, lat], zoom: 12, minZoom: 4, maxZoom: 17,
      attributionControl: { compact: true }, cooperativeGestures: true,
    })
    m.addControl(new NavigationControl({ showCompass: false }), 'top-right')
    const punto = document.createElement('div')
    punto.className = 'cb-mapa-punto'
    punto.setAttribute('aria-label', nombre)
    new Marker({ element: punto }).setLngLat([lng, lat]).addTo(m)
    m.on('load', () => setListo(true))
    mapa.current = m
    // El módulo entra animado (escala y desenfoque): el mapa se crea antes de tener su ancho final.
    const ro = new ResizeObserver(() => m.resize())
    ro.observe(caja.current)
    return () => { ro.disconnect(); m.remove() }
  }, [lat, lng, nombre])

  useEffect(() => {
    const m = mapa.current
    if (!m || !listo) return
    const n = tema === 'noche'
    m.setPaintProperty('base', 'raster-brightness-min', n ? 0.92 : 0)
    m.setPaintProperty('base', 'raster-brightness-max', n ? 0.06 : 1)
    m.setPaintProperty('base', 'raster-saturation', n ? -0.85 : -0.3)
    m.setPaintProperty('base', 'raster-contrast', n ? 0.15 : 0)
    m.setPaintProperty('base', 'raster-hue-rotate', n ? 180 : 0)
  }, [tema, listo])

  return <div ref={caja} className="cb-mapa" role="region" aria-label={`Mapa: ${nombre}`} />
}
