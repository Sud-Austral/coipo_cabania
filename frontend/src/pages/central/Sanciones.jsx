import { useCallback, useEffect, useState } from 'react'
import { Ban, Plus, ShieldCheck, ShieldAlert } from 'lucide-react'
import { crearSancion, getSanciones, levantarSancion } from '../../api/gestion.js'
import { fechaCorta } from '../../lib/formato.js'
import { useRol } from '../../context/RolContext.jsx'
import { Badge } from '../../components/ui/Badge.jsx'
import { Modal } from '../../components/ui/Modal.jsx'
import { Tabla, Encabezado, Cuerpo, Fila, Celda } from '../../components/ui/Tabla.jsx'
import {
  Aviso,
  Boton,
  Campo,
  Cargando,
  StatCard,
  TituloSeccion,
  clasesInput,
} from '../../components/ui/Elementos.jsx'

const TIPOS = [
  { valor: 'no_pago', etiqueta_tipo: 'Deuda por uso del beneficio' },
  { valor: 'destrozos', etiqueta_tipo: 'Daños al inmueble' },
  { valor: 'no_show', etiqueta_tipo: 'No presentación reiterada' },
  { valor: 'normas', etiqueta_tipo: 'Incumplimiento de normas de uso' },
]

export function Sanciones() {
  const { actor } = useRol()
  const [sanciones, setSanciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modalNueva, setModalNueva] = useState(false)
  const [porLevantar, setPorLevantar] = useState(null)
  const [fundamento, setFundamento] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [nueva, setNueva] = useState({
    usuario_nombre: '',
    usuario_rut: '',
    tipo: 'no_pago',
    motivo: '',
    respaldo: '',
    desde: '',
    hasta: '',
    duracion: 'temporal',
  })

  const cargar = useCallback(() => {
    setCargando(true)
    getSanciones()
      .then((r) => setSanciones(r.items))
      .finally(() => setCargando(false))
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  const vigentes = sanciones.filter((s) => s.estado === 'vigente')

  const guardar = async () => {
    setProcesando(true)
    try {
      const tipo = TIPOS.find((t) => t.valor === nueva.tipo)
      await crearSancion(
        {
          ...nueva,
          etiqueta_tipo: tipo?.etiqueta_tipo ?? nueva.tipo,
          hasta: nueva.duracion === 'indefinida' ? null : nueva.hasta,
        },
        actor,
      )
      setModalNueva(false)
      setNueva({
        usuario_nombre: '',
        usuario_rut: '',
        tipo: 'no_pago',
        motivo: '',
        respaldo: '',
        desde: '',
        hasta: '',
        duracion: 'temporal',
      })
      cargar()
    } finally {
      setProcesando(false)
    }
  }

  const levantar = async () => {
    setProcesando(true)
    try {
      await levantarSancion(porLevantar.id, fundamento, actor)
      setPorLevantar(null)
      setFundamento('')
      cargar()
    } finally {
      setProcesando(false)
    }
  }

  if (cargando) return <Cargando texto="Cargando bloqueos y sanciones…" />

  const nuevaValida =
    nueva.usuario_nombre.trim() &&
    nueva.usuario_rut.trim() &&
    nueva.motivo.trim().length > 5 &&
    nueva.desde &&
    (nueva.duracion === 'indefinida' || nueva.hasta)

  return (
    <>
      <TituloSeccion
        titulo="Bloqueos y sanciones"
        descripcion="Registro de usuarios bloqueados por no pago, daños al inmueble, no presentación reiterada u otros incumplimientos. Un usuario con sanción vigente no puede generar nuevas reservas."
        acciones={
          <Boton onClick={() => setModalNueva(true)}>
            <Plus size={16} aria-hidden="true" />
            Registrar sanción
          </Boton>
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard
          etiqueta="Sanciones vigentes"
          valor={vigentes.length}
          detalle="Usuarios impedidos de reservar"
          icono={ShieldAlert}
        />
        <StatCard
          etiqueta="Levantadas"
          valor={sanciones.filter((s) => s.estado === 'levantada').length}
          detalle="Historial del año"
          icono={ShieldCheck}
        />
        <StatCard
          etiqueta="Indefinidas"
          valor={sanciones.filter((s) => s.duracion === 'indefinida' && s.estado === 'vigente').length}
          detalle="Hasta su levantamiento"
          icono={Ban}
        />
      </div>

      <Aviso tono="ambar" titulo="Efecto de una sanción vigente">
        El sistema impide generar nuevas reservas e informa al usuario el motivo general del
        bloqueo y el canal de regularización. Las reservas ya confirmadas de un usuario que
        resulte bloqueado se revisan caso a caso por el Servicio de Bienestar.
      </Aviso>

      <div className="mt-5">
        <Tabla>
          <Encabezado
            columnas={[
              { clave: 'usuario', titulo: 'Usuario' },
              { clave: 'tipo', titulo: 'Motivo de la sanción' },
              { clave: 'vigencia', titulo: 'Vigencia' },
              { clave: 'respaldo', titulo: 'Respaldo' },
              { clave: 'estado', titulo: 'Estado' },
              { clave: 'acciones', titulo: '' },
            ]}
          />
          <Cuerpo>
            {sanciones.map((s) => (
              <Fila key={s.id}>
                <Celda>
                  <span className="block text-slate-800">{s.usuario_nombre}</span>
                  <span className="tabular block text-xs text-slate-500">{s.usuario_rut}</span>
                </Celda>
                <Celda>
                  <span className="block font-medium text-slate-800">{s.etiqueta_tipo}</span>
                  <span className="block text-xs text-slate-500">{s.motivo}</span>
                </Celda>
                <Celda className="tabular whitespace-nowrap text-slate-600">
                  {fechaCorta(s.desde)}
                  {s.hasta ? ` → ${fechaCorta(s.hasta)}` : ' → indefinida'}
                </Celda>
                <Celda className="text-xs text-slate-500">{s.respaldo}</Celda>
                <Celda>
                  <Badge tono={s.estado === 'vigente' ? 'rojo' : 'verde'}>
                    {s.estado === 'vigente' ? 'Vigente' : 'Levantada'}
                  </Badge>
                  {s.fundamento_levantamiento && (
                    <span className="mt-1 block text-xs text-slate-500">
                      {s.fundamento_levantamiento}
                    </span>
                  )}
                </Celda>
                <Celda>
                  {s.estado === 'vigente' && (
                    <Boton variante="secundario" onClick={() => setPorLevantar(s)}>
                      Levantar
                    </Boton>
                  )}
                </Celda>
              </Fila>
            ))}
          </Cuerpo>
        </Tabla>
      </div>

      {/* Registrar nueva sanción */}
      <Modal
        abierto={modalNueva}
        onCerrar={() => setModalNueva(false)}
        titulo="Registrar una sanción"
        descripcion="Los datos quedan en el historial del usuario y en las pistas de auditoría."
        pie={
          <>
            <Boton variante="neutro" onClick={() => setModalNueva(false)}>
              Cancelar
            </Boton>
            <Boton cargando={procesando} disabled={!nuevaValida} onClick={guardar}>
              Registrar sanción
            </Boton>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="Nombre del usuario" requerido>
              <input
                type="text"
                value={nueva.usuario_nombre}
                onChange={(e) => setNueva((n) => ({ ...n, usuario_nombre: e.target.value }))}
                className={clasesInput}
              />
            </Campo>
            <Campo etiqueta="RUT" requerido>
              <input
                type="text"
                value={nueva.usuario_rut}
                onChange={(e) => setNueva((n) => ({ ...n, usuario_rut: e.target.value }))}
                placeholder="12.345.678-9"
                className={`${clasesInput} tabular`}
              />
            </Campo>
          </div>

          <Campo etiqueta="Tipo de sanción" requerido>
            <select
              value={nueva.tipo}
              onChange={(e) => setNueva((n) => ({ ...n, tipo: e.target.value }))}
              className={clasesInput}
            >
              {TIPOS.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.etiqueta_tipo}
                </option>
              ))}
            </select>
          </Campo>

          <Campo etiqueta="Motivo" requerido>
            <textarea
              rows={2}
              value={nueva.motivo}
              onChange={(e) => setNueva((n) => ({ ...n, motivo: e.target.value }))}
              className={clasesInput}
              placeholder="Descripción del hecho que origina la sanción."
            />
          </Campo>

          <Campo
            etiqueta="Respaldo o evidencia"
            ayuda="Por ejemplo: informe de la encargada regional con fecha."
          >
            <input
              type="text"
              value={nueva.respaldo}
              onChange={(e) => setNueva((n) => ({ ...n, respaldo: e.target.value }))}
              className={clasesInput}
            />
          </Campo>

          <div className="grid gap-3 sm:grid-cols-3">
            <Campo etiqueta="Duración" requerido>
              <select
                value={nueva.duracion}
                onChange={(e) => setNueva((n) => ({ ...n, duracion: e.target.value }))}
                className={clasesInput}
              >
                <option value="temporal">Temporal</option>
                <option value="indefinida">Indefinida</option>
              </select>
            </Campo>
            <Campo etiqueta="Desde" requerido>
              <input
                type="date"
                value={nueva.desde}
                onChange={(e) => setNueva((n) => ({ ...n, desde: e.target.value }))}
                className={clasesInput}
              />
            </Campo>
            {nueva.duracion === 'temporal' && (
              <Campo etiqueta="Hasta" requerido>
                <input
                  type="date"
                  value={nueva.hasta}
                  min={nueva.desde || undefined}
                  onChange={(e) => setNueva((n) => ({ ...n, hasta: e.target.value }))}
                  className={clasesInput}
                />
              </Campo>
            )}
          </div>
        </div>
      </Modal>

      {/* Levantar sanción */}
      <Modal
        abierto={Boolean(porLevantar)}
        onCerrar={() => setPorLevantar(null)}
        titulo="Levantar la sanción"
        descripcion={porLevantar ? `${porLevantar.usuario_nombre} · ${porLevantar.usuario_rut}` : ''}
        pie={
          <>
            <Boton variante="neutro" onClick={() => setPorLevantar(null)}>
              Cancelar
            </Boton>
            <Boton cargando={procesando} disabled={!fundamento.trim()} onClick={levantar}>
              Levantar sanción
            </Boton>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Al levantar la sanción, el usuario recupera la posibilidad de generar reservas y se
            le notifica el cambio.
          </p>
          <Campo
            etiqueta="Fundamento del levantamiento"
            requerido
            ayuda="Queda registrado en el historial de sanciones del usuario."
          >
            <textarea
              rows={3}
              value={fundamento}
              onChange={(e) => setFundamento(e.target.value)}
              className={clasesInput}
              placeholder="Ej.: deuda regularizada mediante descuento en planilla del período 2026-07."
            />
          </Campo>
        </div>
      </Modal>
    </>
  )
}
