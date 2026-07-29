import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { getReservas } from '../../api/reservas.js'
import { REGIONES } from '../../fixtures/inmuebles.js'
import { MOTIVOS } from '../../fixtures/tarifas.js'
import { FiltroEstados, TablaReservas } from '../../components/reservas/TablaReservas.jsx'
import {
  Campo,
  Cargando,
  Tarjeta,
  TituloSeccion,
  clasesInput,
} from '../../components/ui/Elementos.jsx'

export function ReservasPais() {
  const [reservas, setReservas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [estado, setEstado] = useState('todos')
  const [region, setRegion] = useState('')
  const [motivo, setMotivo] = useState('')
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    setCargando(true)
    getReservas({})
      .then((r) => setReservas(r.items))
      .finally(() => setCargando(false))
  }, [])

  const visibles = useMemo(() => {
    let lista = reservas
    if (estado !== 'todos') lista = lista.filter((r) => r.estado === estado)
    if (region) lista = lista.filter((r) => r.inmueble?.region === region)
    if (motivo) lista = lista.filter((r) => r.motivo === motivo)
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      lista = lista.filter(
        (r) =>
          r.titular_nombre.toLowerCase().includes(q) ||
          r.titular_rut.includes(q) ||
          r.codigo.toLowerCase().includes(q) ||
          (r.inmueble?.nombre ?? '').toLowerCase().includes(q),
      )
    }
    return lista
  }, [reservas, estado, region, motivo, busqueda])

  if (cargando) return <Cargando texto="Cargando las reservas del país…" />

  return (
    <>
      <TituloSeccion
        titulo="Reservas de toda la red"
        descripcion="Acceso nacional a las reservas de las 13 regiones, para el cálculo de cobros y la revisión de casos."
      />

      <Tarjeta className="mb-5 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Campo etiqueta="Región">
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className={clasesInput}
            >
              <option value="">Todas las regiones</option>
              {REGIONES.map((r) => (
                <option key={r.codigo} value={r.codigo}>
                  {r.nombre}
                </option>
              ))}
            </select>
          </Campo>

          <Campo etiqueta="Motivo">
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className={clasesInput}
            >
              <option value="">Todos los motivos</option>
              {MOTIVOS.map((m) => (
                <option key={m.valor} value={m.valor}>
                  {m.etiqueta}
                </option>
              ))}
            </select>
          </Campo>

          <Campo etiqueta="Buscar por titular, RUT, código o inmueble">
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
                placeholder="Ej.: R-2026-0004"
                className={`${clasesInput} pl-9`}
              />
            </div>
          </Campo>
        </div>
        <p className="mt-3 border-t border-arena-200 pt-3 text-sm text-slate-600">
          {visibles.length} de {reservas.length} reservas
        </p>
      </Tarjeta>

      <FiltroEstados
        reservas={reservas}
        estados={['recibida', 'confirmada', 'en_curso', 'finalizada', 'lista_espera', 'anulada']}
        activo={estado}
        onCambiar={setEstado}
      />

      <TablaReservas
        reservas={visibles}
        mostrar={{ titular: true, region: true, monto: true }}
        vacio="No hay reservas que cumplan con los filtros aplicados."
      />
    </>
  )
}
