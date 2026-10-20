/**
 * Nómina de demostración — PERSONAS Y RUT FICTICIOS.
 *
 * Representa el cruce de la nómina de afiliados de Bienestar con la nómina de
 * Personal. En la versión real se carga desde esas fuentes: el RUT determina
 * la calidad de la persona (Anexo A), su tipo de contrato (Art. 21), su región
 * y su perfil en el sistema. El usuario nunca elige su categoría.
 *
 * calidad: afiliado | jubilado | no_afiliado   (otro_servicio no está en nómina)
 * perfil:  solicitante | encargada | central | uia
 */

export const NOMINA = [
  {
    id: 1,
    nombre: 'María Fuentes Rojas',
    rut: '13.457.902-1',
    correo: 'maria.fuentes@conaf.cl',
    telefono: '+56 9 6123 4587',
    region: '05',
    rol: 'Técnica administrativa',
    unidad: 'Dirección Regional Valparaíso',
    calidad: 'afiliado',
    plazo_fijo: false,
    perfil: 'solicitante',
    grupo_familiar: [
      { nombre: 'Rodrigo Salinas Pérez', edad: 44, parentesco: 'conyuge' },
      { nombre: 'Emilia Salinas Fuentes', edad: 12, parentesco: 'hijo' },
      { nombre: 'Tomás Salinas Fuentes', edad: 9, parentesco: 'hijo' },
    ],
  },
  {
    id: 2,
    nombre: 'Paula Ortiz Cárcamo',
    rut: '16.882.409-2',
    correo: 'paula.ortiz@conaf.cl',
    telefono: '+56 9 5520 7714',
    region: '09',
    rol: 'Guardaparque',
    unidad: 'P.N. Conguillío, Dirección Regional Araucanía',
    calidad: 'afiliado',
    plazo_fijo: true,
    perfil: 'solicitante',
    grupo_familiar: [{ nombre: 'Matías Ortiz Ortiz', edad: 6, parentesco: 'hijo' }],
  },
  {
    id: 3,
    nombre: 'Hernán Soto Valenzuela',
    rut: '6.884.215-8',
    correo: 'hsoto.valenzuela@gmail.com',
    telefono: '+56 9 8455 1290',
    region: '08',
    rol: 'Afiliado jubilado',
    unidad: '—',
    calidad: 'jubilado',
    plazo_fijo: false,
    perfil: 'solicitante',
    grupo_familiar: [{ nombre: 'Gloria Muñoz Araya', edad: 68, parentesco: 'conyuge' }],
  },
  {
    id: 4,
    nombre: 'Jorge Pavez Contreras',
    rut: '15.336.204-1',
    correo: 'jorge.pavez@conaf.cl',
    telefono: '+56 9 7341 0028',
    region: '13',
    rol: 'Analista de presupuesto',
    unidad: 'Gerencia de Finanzas, Oficina Central',
    calidad: 'no_afiliado',
    plazo_fijo: false,
    perfil: 'solicitante',
    grupo_familiar: [],
  },
  {
    id: 5,
    nombre: 'Carolina Núñez Vidal',
    rut: '14.102.558-9',
    correo: 'carolina.nunez@conaf.cl',
    telefono: '+56 9 6610 4432',
    region: '05',
    rol: 'Encargada regional de Bienestar',
    unidad: 'Bienestar, Región de Valparaíso',
    calidad: 'afiliado',
    plazo_fijo: false,
    perfil: 'encargada',
    grupo_familiar: [],
  },
  {
    id: 6,
    nombre: 'Patricia Herrera Muñoz',
    rut: '12.554.871-7',
    correo: 'patricia.herrera@conaf.cl',
    telefono: '+56 9 7788 1203',
    region: '13',
    rol: 'Administradora de casas de veraneo',
    unidad: 'Servicio de Bienestar, Oficina Central',
    calidad: 'afiliado',
    plazo_fijo: false,
    perfil: 'central',
    grupo_familiar: [],
  },
  {
    id: 7,
    nombre: 'Diego Lagos Mena',
    rut: '17.330.962-7',
    correo: 'diego.lagos@conaf.cl',
    telefono: '+56 9 4401 9932',
    region: '13',
    rol: 'Desarrollador',
    unidad: 'Unidad de Información y Análisis',
    calidad: 'no_afiliado',
    plazo_fijo: false,
    perfil: 'uia',
    grupo_familiar: [],
  },
]

/** Persona de otro servicio público para los botones de demostración (no está en nómina). */
export const EXTERNO_DEMO = {
  nombre: 'Andrea Molina Pizarro',
  rut: '15.903.447-K',
  institucion: 'Servicio Agrícola y Ganadero',
  correo: 'andrea.molina@sag.gob.cl',
  telefono: '+56 9 6234 1187',
}

/** Accesos rápidos de la maqueta, en el orden en que se muestran. */
export const ACCESOS_DEMO = [
  { etiqueta: 'Afiliada', id: 1 },
  { etiqueta: 'Afiliada a plazo fijo', id: 2 },
  { etiqueta: 'Jubilado', id: 3 },
  { etiqueta: 'No afiliado', id: 4 },
  { etiqueta: 'Otro servicio público', externo: true },
  { etiqueta: 'Encargada regional', id: 5 },
  { etiqueta: 'Oficina Central', id: 6 },
  { etiqueta: 'Mantenimiento UIA', id: 7 },
]

const normalizarRut = (r) => String(r).replace(/[^0-9kK]/g, '').toUpperCase()

export const buscarEnNomina = (rut) => NOMINA.find((p) => normalizarRut(p.rut) === normalizarRut(rut)) ?? null

export const porId = (id) => NOMINA.find((p) => p.id === id) ?? null

const palabras = (t) =>
  String(t)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/\s+/)
    .filter((x) => x.length > 1)

/**
 * El nombre escrito coincide con la nómina si tiene al menos nombre y un
 * apellido, y todas sus palabras están en el nombre registrado
 * (sin distinguir tildes ni mayúsculas).
 */
export function nombreCoincide(escrito, registrado) {
  const e = palabras(escrito)
  const r = new Set(palabras(registrado))
  return e.length >= 2 && e.every((x) => r.has(x))
}

/**
 * Correo de la encargada regional, al que el usuario envía las observaciones
 * de ingreso (12 horas) y el acta de salida firmada (Art. 13, Art. 26).
 * Solo la Región de Valparaíso tiene encargada en la nómina de demostración;
 * el resto usa una casilla genérica ficticia.
 */
export function correoEncargada(region) {
  const enNomina = NOMINA.find((p) => p.perfil === 'encargada' && p.region === region)
  return enNomina?.correo ?? `bienestar.region${region}@conaf.cl`
}
