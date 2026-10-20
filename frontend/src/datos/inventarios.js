/**
 * Inventario de cada casa (Art. 2 e, Art. 13 y Anexo B del reglamento) —
 * DATOS DE MAQUETA.
 *
 * Lo mantiene la encargada regional. Cada vez que lo guarda se crea una nueva
 * versión, que se envía a las reservas confirmadas que aún no comienzan.
 * El usuario lo revisa al llegar y tiene 12 horas para informar diferencias.
 */

import { CASAS } from './casas.js'
import { sumarDias } from '../lib/fechas.js'

export const CATEGORIAS_INVENTARIO = ['Mobiliario', 'Equipamiento', 'Menaje', 'Ropa de cama']

export const ESTADOS_ITEM = [
  { valor: 'bueno', etiqueta: 'Bueno' },
  { valor: 'regular', etiqueta: 'Regular' },
  { valor: 'malo', etiqueta: 'Malo' },
]

let correlativo = 0
const item = (categoria, nombre, cantidad, estado = 'bueno', observacion = '') => ({
  id: `it-${++correlativo}`,
  categoria,
  nombre,
  cantidad,
  estado,
  observacion,
})

/** Lista base sugerida para una casa nueva, según su capacidad y dormitorios. */
export function plantillaInventario(casa) {
  const p = casa.capacidad
  const d = casa.dormitorios
  return [
    item('Mobiliario', 'Camas', d + 1),
    item('Mobiliario', 'Mesa de comedor', 1),
    item('Mobiliario', 'Sillas', p),
    item('Mobiliario', 'Sofá', 1),
    item('Mobiliario', 'Veladores', d * 2),
    item('Equipamiento', 'Cocina a gas con horno', 1),
    item('Equipamiento', 'Refrigerador', 1),
    item('Equipamiento', 'Microondas', 1),
    item('Equipamiento', 'Hervidor eléctrico', 1),
    item('Equipamiento', 'Estufa o calefactor', 1),
    item('Equipamiento', 'Televisor', 1),
    item('Menaje', 'Platos', p * 3),
    item('Menaje', 'Vasos', p),
    item('Menaje', 'Tazas', p),
    item('Menaje', 'Juegos de cubiertos', p),
    item('Menaje', 'Ollas y sartenes', 5),
    item('Ropa de cama', 'Juegos de sábanas', d + 1),
    item('Ropa de cama', 'Frazadas', p),
    item('Ropa de cama', 'Almohadas', p),
    item('Ropa de cama', 'Cubrecamas', d + 1),
  ]
}

export const seguridadVacia = () => ({ llaves: '', controles: '', gas: '', extintor_vence: '', observaciones: '' })

/** Inventarios iniciales: tres casas de Valparaíso completas y una pendiente (Las Cruces). */
export function inventarioInicial(hoy) {
  const casa = (id) => CASAS.find((c) => c.id === id)
  const con = (id, ajustes, seguridad, dias) => {
    const items = plantillaInventario(casa(id)).map((it) => ({ ...it, ...ajustes[it.nombre] }))
    return {
      version: 1,
      actualizado_en: sumarDias(hoy, -dias) + 'T12:00:00',
      actualizado_por: 'Carolina Núñez Vidal',
      items,
      seguridad,
    }
  }
  return {
    6: con(
      6,
      { Sofá: { estado: 'regular', observacion: 'Tapiz gastado en un brazo' }, Televisor: { observacion: 'Control remoto en el cajón del mueble' } },
      { llaves: '2 juegos (puerta principal y reja)', controles: '1 portón eléctrico', gas: 'Cilindro de 45 kg al 60%', extintor_vence: sumarDias(hoy, 200), observaciones: '' },
      14,
    ),
    8: con(
      8,
      { Microondas: { estado: 'malo', observacion: 'No calienta; reposición solicitada' }, Vasos: { cantidad: 6, observacion: 'Faltan 2' } },
      { llaves: '1 juego', controles: '—', gas: 'Red de gas natural', extintor_vence: sumarDias(hoy, 40), observaciones: 'Llave de paso del gas bajo el lavaplatos' },
      40,
    ),
    9: con(
      9,
      { 'Estufa o calefactor': { nombre: 'Estufa a leña', observacion: 'Leña en el cobertizo' } },
      { llaves: '2 juegos', controles: '—', gas: 'Cilindro de 15 kg lleno', extintor_vence: sumarDias(hoy, -5), observaciones: '' },
      90,
    ),
  }
}
