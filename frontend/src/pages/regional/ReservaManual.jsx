import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getInmuebles } from '../../api/inmuebles.js'
import { crearReserva } from '../../api/reservas.js'
import { afiliadosEjemplo } from '../../fixtures/usuarios.js'
import { MOTIVOS } from '../../fixtures/tarifas.js'
import { useRol } from '../../context/RolContext.jsx'
import { Aviso, Boton, Campo, Tarjeta, TituloSeccion, clasesInput } from '../../components/ui/Elementos.jsx'

export function ReservaManual() {
  const { usuario, actor } = useRol()
  const navegar = useNavigate()
  const afiliados = afiliadosEjemplo.filter((a) => a.region === usuario?.region)
  const [inmuebles, setInmuebles] = useState([])
  const [form, setForm] = useState({ afiliado_id: '', inmueble_id: '', entrada: '', salida: '', motivo: 'personal', origen: 'telefonica', observaciones: '' })
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  useEffect(() => { getInmuebles({ region: usuario?.region }).then((r) => setInmuebles(r.items)) }, [usuario?.region])
  const titular = afiliados.find((a) => a.id === Number(form.afiliado_id))
  const inmueble = inmuebles.find((i) => i.id === Number(form.inmueble_id))
  const valido = useMemo(() => titular && inmueble && form.entrada && form.salida > form.entrada, [titular, inmueble, form])
  const cambiar = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }))
  const guardar = async () => {
    setGuardando(true); setError('')
    try {
      const reserva = await crearReserva({
        inmueble_id: inmueble.id, fecha_entrada: form.entrada, fecha_salida: form.salida,
        motivo: form.motivo, origen: form.origen, observaciones: form.observaciones,
        titular: { ...titular, afiliado_vigente: true },
        ocupantes: [{ nombre: titular.nombre, rut: titular.rut, parentesco: 'titular', categoria_tarifa: 'afiliado' }],
      }, actor)
      navegar(`/reservas/${reserva.codigo}`)
    } catch (e) { setError(e.detail ?? 'No fue posible registrar la reserva.') }
    finally { setGuardando(false) }
  }
  return <>
    <TituloSeccion titulo="Ingresar reserva manual" descripcion="Registro presencial o telefónico en nombre de un afiliado de la región." />
    <Tarjeta className="max-w-3xl p-5"><div className="space-y-4">
      <Aviso tono="info">La reserva quedará identificada con su canal de origen y la encargada que la registró.</Aviso>
      <Campo etiqueta="Afiliado" requerido><select value={form.afiliado_id} onChange={cambiar('afiliado_id')} className={clasesInput}><option value="">Seleccione</option>{afiliados.map((a) => <option key={a.id} value={a.id}>{a.nombre} · {a.rut}</option>)}</select></Campo>
      <Campo etiqueta="Inmueble" requerido><select value={form.inmueble_id} onChange={cambiar('inmueble_id')} className={clasesInput}><option value="">Seleccione</option>{inmuebles.map((i) => <option key={i.id} value={i.id}>{i.nombre} · capacidad {i.capacidad_maxima}</option>)}</select></Campo>
      <div className="grid gap-3 sm:grid-cols-2"><Campo etiqueta="Ingreso" requerido><input type="date" value={form.entrada} onChange={cambiar('entrada')} className={clasesInput} /></Campo><Campo etiqueta="Salida" requerido><input type="date" min={form.entrada || undefined} value={form.salida} onChange={cambiar('salida')} className={clasesInput} /></Campo></div>
      <div className="grid gap-3 sm:grid-cols-2"><Campo etiqueta="Motivo" requerido><select value={form.motivo} onChange={cambiar('motivo')} className={clasesInput}>{MOTIVOS.map((m) => <option key={m.valor} value={m.valor}>{m.etiqueta}</option>)}</select></Campo><Campo etiqueta="Canal" requerido><select value={form.origen} onChange={cambiar('origen')} className={clasesInput}><option value="telefonica">Telefónica</option><option value="presencial">Presencial</option></select></Campo></div>
      <Campo etiqueta="Observaciones"><textarea rows={4} value={form.observaciones} onChange={cambiar('observaciones')} className={clasesInput} /></Campo>
      {error && <Aviso tono="rojo">{error}</Aviso>}
      <div className="flex justify-end"><Boton disabled={!valido} cargando={guardando} onClick={guardar}>Registrar reserva manual</Boton></div>
    </div></Tarjeta>
  </>
}
