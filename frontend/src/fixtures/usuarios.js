/**
 * Usuarios de la maqueta — TODAS LAS PERSONAS Y RUT SON FICTICIOS.
 *
 * Un usuario por perfil, para que el selector de rol muestre una experiencia
 * coherente. Los RUT están construidos con dígito verificador válido pero no
 * corresponden a personas reales.
 */

export const ROLES = [
  {
    valor: 'afiliado',
    etiqueta: 'Afiliado/a',
    descripcion: 'Trabajador/a afiliado al Servicio de Bienestar',
  },
  {
    valor: 'no_afiliado',
    etiqueta: 'Usuario no afiliado',
    descripcion: 'Trabajador/a CONAF no afiliado o persona externa',
  },
  {
    valor: 'regional',
    etiqueta: 'Encargada regional',
    descripcion: 'Encargada de Bienestar de una región',
  },
  {
    valor: 'central',
    etiqueta: 'Oficina Central',
    descripcion: 'Descuentos por planilla y reportería nacional',
  },
  {
    valor: 'admin',
    etiqueta: 'Administrador',
    descripcion: 'Mantención de inmuebles, tarifas y parámetros',
  },
]

export const usuarios = [
  {
    id: 1,
    rol: 'afiliado',
    nombre: 'María Fuentes Rojas',
    rut: '13.457.902-8',
    correo: 'maria.fuentes@conaf.cl',
    tipo: 'afiliado',
    afiliado_vigente: true,
    region: '05',
    unidad: 'Dirección Regional Valparaíso',
    grupo_familiar: [
      { nombre: 'Rodrigo Salinas Pérez', rut: '12.998.451-2', parentesco: 'conyuge' },
      { nombre: 'Emilia Salinas Fuentes', rut: '24.115.663-4', parentesco: 'hijo' },
      { nombre: 'Tomás Salinas Fuentes', rut: '25.447.128-K', parentesco: 'hijo' },
    ],
  },
  {
    id: 2,
    rol: 'no_afiliado',
    nombre: 'Jorge Pavez Contreras',
    rut: '15.336.204-1',
    correo: 'jorge.pavez@ejemplo.cl',
    tipo: 'externo',
    afiliado_vigente: false,
    region: '13',
    unidad: 'Persona externa',
    grupo_familiar: [
      { nombre: 'Carla Bustos Lagos', rut: '16.204.775-3', parentesco: 'familiar' },
    ],
  },
  {
    id: 3,
    rol: 'regional',
    nombre: 'Carolina Núñez Vidal',
    rut: '14.102.558-6',
    correo: 'carolina.nunez@conaf.cl',
    tipo: 'funcionaria',
    afiliado_vigente: true,
    region: '05',
    unidad: 'Bienestar — Región de Valparaíso',
    grupo_familiar: [],
  },
  {
    id: 4,
    rol: 'central',
    nombre: 'Patricia Herrera Muñoz',
    rut: '11.874.336-9',
    correo: 'patricia.herrera@conaf.cl',
    tipo: 'funcionaria',
    afiliado_vigente: true,
    region: '13',
    unidad: 'Oficina Central — Servicio de Bienestar',
    grupo_familiar: [],
  },
  {
    id: 5,
    rol: 'admin',
    nombre: 'Administrador del sistema',
    rut: '10.556.201-7',
    correo: 'bienestar.sistemas@conaf.cl',
    tipo: 'funcionario',
    afiliado_vigente: true,
    region: '13',
    unidad: 'Unidad de Información y Análisis Institucional',
    grupo_familiar: [],
  },
]

/** Otros afiliados ficticios, solo para poblar reservas de ejemplo. */
export const afiliadosEjemplo = [
  { id: 11, nombre: 'Luis Cárdenas Soto', rut: '12.665.309-4', region: '05' },
  { id: 12, nombre: 'Ana Villalobos Díaz', rut: '15.902.114-7', region: '05' },
  { id: 13, nombre: 'Pedro Millán Quezada', rut: '13.007.882-5', region: '05' },
  { id: 14, nombre: 'Soledad Ríos Peña', rut: '16.448.720-1', region: '10' },
  { id: 15, nombre: 'Óscar Maldonado Vera', rut: '11.339.605-8', region: '09' },
  { id: 16, nombre: 'Javiera Toro Sepúlveda', rut: '17.884.223-6', region: '03' },
  { id: 17, nombre: 'Manuel Aguirre Lizana', rut: '10.998.447-2', region: '12' },
  { id: 18, nombre: 'Ximena Bravo Alarcón', rut: '14.775.360-9', region: '07' },
  { id: 19, nombre: 'Rodrigo Escobar Paredes', rut: '15.118.994-3', region: '11' },
  { id: 20, nombre: 'Claudia Sandoval Rivas', rut: '16.930.257-K', region: '13' },
]

export const usuarioPorRol = (rol) => usuarios.find((u) => u.rol === rol)
