import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Camera, Check, ExternalLink, Pencil, Search } from 'lucide-react'
import { actualizarInmueble, getInmuebles } from '../../api/inmuebles.js'
import { REGIONES, TIPOS_INMUEBLE, etiquetaTipo, nombreRegion } from '../../fixtures/inmuebles.js'
import { rutaFoto } from '../../components/inmuebles/fotos.js'
import { useRol } from '../../context/RolContext.jsx'
import { Badge } from '../../components/ui/Badge.jsx'
import { Modal } from '../../components/ui/Modal.jsx'
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

export function InmueblesAdmin() {
  const { actor } = useRol()
  const [inmuebles, setInmuebles] = useState([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [editando, setEditando] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [aviso, setAviso] = useState(null)

  const cargar = useCallback(() => {
    setCargando(true)
    getInmuebles({ busqueda })
      .then((r) => setInmuebles(r.items))
      .finally(() => setCargando(false))
  }, [busqueda])

  useEffect(() => {
    cargar()
  }, [cargar])

  const guardar = async () => {
    setGuardando(true)
    try {
      await actualizarInmueble(
        editando.id,
        {
          nombre: editando.nombre,
          tipo: editando.tipo,
          localidad: editando.localidad,
          direccion: editando.direccion,
          capacidad_maxima: Number(editando.capacidad_maxima),
          dormitorios: Number(editando.dormitorios),
          descripcion: editando.descripcion,
          equipamiento: editando.equipamiento
            .split(',')
            .map((e) => e.trim())
            .filter(Boolean),
        },
        actor,
      )
      setAviso(`Se guardaron los cambios de «${editando.nombre}».`)
      setEditando(null)
      cargar()
    } finally {
      setGuardando(false)
    }
  }

  const abrir = (i) =>
    setEditando({ ...i, equipamiento: i.equipamiento.join(', ') })

  if (cargando && !inmuebles.length) return <Cargando texto="Cargando los inmuebles…" />

  return (
    <>
      <TituloSeccion
        titulo="Mantención de inmuebles"
        descripcion="Administración del catálogo: datos, capacidad, equipamiento y contenidos de las fichas de los 34 inmuebles de la red."
      />

      {aviso && (
        <div className="mb-5">
          <Aviso tono="verde" icono={Check} titulo="Cambios guardados">
            {aviso} Los cambios se reflejan de inmediato en el catálogo público.
          </Aviso>
        </div>
      )}

      <Tarjeta className="mb-5 p-4">
        <Campo etiqueta="Buscar inmueble" className="max-w-md">
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
              placeholder="Nombre o localidad"
              className={`${clasesInput} pl-9`}
            />
          </div>
        </Campo>
        <p className="mt-3 border-t border-arena-200 pt-3 text-sm text-slate-600">
          {inmuebles.length} inmuebles
        </p>
      </Tarjeta>

      <Tabla>
        <Encabezado
          columnas={[
            { clave: 'foto', titulo: 'Foto' },
            { clave: 'nombre', titulo: 'Inmueble' },
            { clave: 'region', titulo: 'Región' },
            { clave: 'tipo', titulo: 'Tipo' },
            { clave: 'cap', titulo: 'Capacidad', alineacion: 'derecha' },
            { clave: 'ficha', titulo: 'Ficha' },
            { clave: 'acciones', titulo: '' },
          ]}
        />
        <Cuerpo>
          {inmuebles.map((i) => (
            <Fila key={i.id}>
              <Celda>
                <img
                  src={rutaFoto(i.fotos?.[0])}
                  alt=""
                  loading="lazy"
                  className="h-11 w-16 rounded-md object-cover"
                />
              </Celda>
              <Celda>
                <span className="block font-medium text-slate-800">{i.nombre}</span>
                <span className="block text-xs text-slate-500">{i.localidad}</span>
              </Celda>
              <Celda className="text-slate-600">{nombreRegion(i.region)}</Celda>
              <Celda>
                <Badge tono={i.tipo === 'veraneo' ? 'verde' : 'azul'}>
                  {etiquetaTipo(i.tipo)}
                </Badge>
              </Celda>
              <Celda numerica>{i.capacidad_maxima}</Celda>
              <Celda>
                <span className="flex items-center gap-1.5 text-xs text-slate-600">
                  <Camera size={13} aria-hidden="true" />
                  {i.fotos?.length ?? 0} fotos · {i.zonas_interes?.length ?? 0} zonas
                </span>
              </Celda>
              <Celda>
                <div className="flex justify-end gap-1.5">
                  <Link
                    to={`/inmuebles/${i.id}`}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-arena-200 px-3 text-sm text-slate-700 hover:bg-arena-50"
                  >
                    <ExternalLink size={14} aria-hidden="true" />
                    Ver ficha
                  </Link>
                  <Boton variante="secundario" onClick={() => abrir(i)}>
                    <Pencil size={14} aria-hidden="true" />
                    Editar
                  </Boton>
                </div>
              </Celda>
            </Fila>
          ))}
        </Cuerpo>
      </Tabla>

      <Modal
        abierto={Boolean(editando)}
        onCerrar={() => setEditando(null)}
        titulo="Editar inmueble"
        descripcion={editando?.nombre}
        pie={
          <>
            <Boton variante="neutro" onClick={() => setEditando(null)}>
              Cancelar
            </Boton>
            <Boton cargando={guardando} onClick={guardar}>
              Guardar cambios
            </Boton>
          </>
        }
      >
        {editando && (
          <div className="space-y-3">
            <Campo etiqueta="Nombre" requerido>
              <input
                type="text"
                value={editando.nombre}
                onChange={(e) => setEditando((i) => ({ ...i, nombre: e.target.value }))}
                className={clasesInput}
              />
            </Campo>

            <div className="grid gap-3 sm:grid-cols-2">
              <Campo etiqueta="Tipo de inmueble">
                <select
                  value={editando.tipo}
                  onChange={(e) => setEditando((i) => ({ ...i, tipo: e.target.value }))}
                  className={clasesInput}
                >
                  {TIPOS_INMUEBLE.map((t) => (
                    <option key={t.valor} value={t.valor}>
                      {t.etiqueta}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo etiqueta="Región" ayuda="La región no se modifica en la maqueta.">
                <select value={editando.region} disabled className={clasesInput}>
                  {REGIONES.map((r) => (
                    <option key={r.codigo} value={r.codigo}>
                      {r.nombre}
                    </option>
                  ))}
                </select>
              </Campo>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Campo etiqueta="Localidad">
                <input
                  type="text"
                  value={editando.localidad}
                  onChange={(e) => setEditando((i) => ({ ...i, localidad: e.target.value }))}
                  className={clasesInput}
                />
              </Campo>
              <Campo etiqueta="Dirección">
                <input
                  type="text"
                  value={editando.direccion}
                  onChange={(e) => setEditando((i) => ({ ...i, direccion: e.target.value }))}
                  className={clasesInput}
                />
              </Campo>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Campo
                etiqueta="Capacidad máxima"
                ayuda="El sistema impide reservas que la excedan."
              >
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={editando.capacidad_maxima}
                  onChange={(e) =>
                    setEditando((i) => ({ ...i, capacidad_maxima: e.target.value }))
                  }
                  className={`${clasesInput} tabular`}
                />
              </Campo>
              <Campo etiqueta="Dormitorios">
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={editando.dormitorios}
                  onChange={(e) => setEditando((i) => ({ ...i, dormitorios: e.target.value }))}
                  className={`${clasesInput} tabular`}
                />
              </Campo>
            </div>

            <Campo etiqueta="Descripción">
              <textarea
                rows={4}
                value={editando.descripcion}
                onChange={(e) => setEditando((i) => ({ ...i, descripcion: e.target.value }))}
                className={clasesInput}
              />
            </Campo>

            <Campo etiqueta="Equipamiento" ayuda="Separado por comas.">
              <input
                type="text"
                value={editando.equipamiento}
                onChange={(e) => setEditando((i) => ({ ...i, equipamiento: e.target.value }))}
                className={clasesInput}
              />
            </Campo>

            <Aviso tono="info">
              La carga de fotografías y zonas de interés se hará en el sistema definitivo. En la
              maqueta se muestran imágenes de referencia.
            </Aviso>
          </div>
        )}
      </Modal>
    </>
  )
}
