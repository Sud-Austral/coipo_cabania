import { useEffect, useMemo, useState } from 'react'
import { Download, Search, ShieldCheck } from 'lucide-react'
import { getAuditoria } from '../../api/gestion.js'
import { fechaHora } from '../../lib/formato.js'
import { Badge } from '../../components/ui/Badge.jsx'
import { Tabla, Encabezado, Cuerpo, Fila, Celda } from '../../components/ui/Tabla.jsx'
import {
  Aviso,
  Boton,
  Campo,
  Cargando,
  Tarjeta,
  TituloSeccion,
  clasesInput,
} from '../../components/ui/Elementos.jsx'

const TONO_PERFIL = {
  Afiliado: 'verde',
  'Usuario no afiliado': 'ambar',
  'Encargada regional': 'azul',
  'Oficina Central': 'arena',
  Administrador: 'neutro',
  Sistema: 'neutro',
}

function descargarCSV(nombre, filas) {
  const contenido = filas.map((f) => f.map((c) => `"${String(c ?? '')}"`).join(';')).join('\n')
  const blob = new Blob(['﻿' + contenido], { type: 'text/csv;charset=utf-8;' })
  const enlace = document.createElement('a')
  enlace.href = URL.createObjectURL(blob)
  enlace.download = nombre
  enlace.click()
  URL.revokeObjectURL(enlace.href)
}

export function Auditoria() {
  const [registros, setRegistros] = useState([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [perfil, setPerfil] = useState('')

  useEffect(() => {
    getAuditoria()
      .then((r) => setRegistros(r.items))
      .finally(() => setCargando(false))
  }, [])

  const perfiles = useMemo(
    () => [...new Set(registros.map((r) => r.perfil))].sort(),
    [registros],
  )

  const visibles = useMemo(() => {
    let lista = registros
    if (perfil) lista = lista.filter((r) => r.perfil === perfil)
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      lista = lista.filter(
        (r) =>
          r.usuario.toLowerCase().includes(q) ||
          r.accion.toLowerCase().includes(q) ||
          r.entidad.toLowerCase().includes(q) ||
          (r.detalle ?? '').toLowerCase().includes(q),
      )
    }
    return lista
  }, [registros, perfil, busqueda])

  if (cargando) return <Cargando texto="Cargando las pistas de auditoría…" />

  const exportar = () =>
    descargarCSV('auditoria_maqueta.csv', [
      ['Fecha y hora', 'Usuario', 'Perfil', 'Acción', 'Entidad', 'Detalle'],
      ...visibles.map((r) => [
        fechaHora(r.fecha_hora),
        r.usuario,
        r.perfil,
        r.accion,
        r.entidad,
        r.detalle,
      ]),
    ])

  return (
    <>
      <TituloSeccion
        titulo="Pistas de auditoría"
        descripcion="Registro de las acciones realizadas en el sistema: quién hizo qué, sobre qué dato y cuándo."
        acciones={
          <Boton variante="secundario" onClick={exportar}>
            <Download size={16} aria-hidden="true" />
            Exportar CSV
          </Boton>
        }
      />

      <Aviso tono="verde" icono={ShieldCheck} titulo="Protección de datos personales">
        El sistema trata datos de afiliados, cargas familiares y acompañantes conforme a la Ley
        N° 19.628 y la Ley N° 21.719: el acceso se limita según el perfil de cada usuario y toda
        consulta o modificación de datos personales queda registrada en esta bitácora. En la
        maqueta se muestran registros de ejemplo para representar esa trazabilidad.
      </Aviso>

      <Tarjeta className="my-5 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo etiqueta="Perfil">
            <select
              value={perfil}
              onChange={(e) => setPerfil(e.target.value)}
              className={clasesInput}
            >
              <option value="">Todos los perfiles</option>
              {perfiles.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Buscar por usuario, acción o entidad">
            <div className="relative">
              <Search
                size={16}
                className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Ej.: confirmación, nómina, R-2026-0004"
                className={`${clasesInput} pl-9`}
              />
            </div>
          </Campo>
        </div>
        <p className="mt-3 border-t border-arena-200 pt-3 text-sm text-slate-600">
          {visibles.length} de {registros.length} registros
        </p>
      </Tarjeta>

      <Tabla>
        <Encabezado
          columnas={[
            { clave: 'fecha', titulo: 'Fecha y hora' },
            { clave: 'usuario', titulo: 'Usuario' },
            { clave: 'perfil', titulo: 'Perfil' },
            { clave: 'accion', titulo: 'Acción' },
            { clave: 'entidad', titulo: 'Entidad' },
            { clave: 'detalle', titulo: 'Detalle' },
          ]}
        />
        <Cuerpo>
          {visibles.map((r) => (
            <Fila key={r.id}>
              <Celda className="tabular whitespace-nowrap text-slate-600">
                {fechaHora(r.fecha_hora)}
              </Celda>
              <Celda className="text-slate-800">{r.usuario}</Celda>
              <Celda>
                <Badge tono={TONO_PERFIL[r.perfil] ?? 'neutro'}>{r.perfil}</Badge>
              </Celda>
              <Celda className="font-medium text-slate-800">{r.accion}</Celda>
              <Celda className="text-slate-600">{r.entidad}</Celda>
              <Celda className="text-xs text-slate-500">{r.detalle}</Celda>
            </Fila>
          ))}
        </Cuerpo>
      </Tabla>
    </>
  )
}
