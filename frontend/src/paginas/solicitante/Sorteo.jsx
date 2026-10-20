import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2, Ticket } from 'lucide-react'
import { REGIONES } from '../../datos/casas.js'
import { condicionSorteo, demanda, listarCasas, postulacionAbierta, postulacionDe, postular, sorteoVigente, turnosVacantes, useDatos } from '../../datos/servicio.js'
import { fechaCorta, fechaLarga, rangoFechas } from '../../lib/fechas.js'
import { pesos, plural } from '../../lib/formato.js'
import { PARAMETROS, formasDePago, tarifaPara } from '../../lib/reglas.js'
import { HORAS_OFERTA, puedePostular } from '../../lib/sorteo.js'
import { rutaFoto } from '../../componentes/fotos.js'
import { TarjetaPostulacion, salidaTurno } from '../../componentes/Postulacion.jsx'
import { Aviso, Boton, Campo, Tarjeta, claseEntrada } from '../../componentes/ui.jsx'
import { useSesion } from '../../componentes/Perfil.jsx'

const nombreRegion = (c) => REGIONES.find((r) => r.codigo === c)?.nombre ?? ''

export function Sorteo() {
  useDatos()
  const { usuario } = useSesion()
  const navegar = useNavigate()
  const s = sorteoVigente()
  const mia = postulacionDe(usuario.id)
  const abierta = postulacionAbierta()
  const condicion = condicionSorteo(usuario.id)
  const [nueva, setNueva] = useState(null)

  if (!s) return <p>No hay un sorteo de temporada alta en curso.</p>

  const primerTurno = s.turnos[0]
  const ultimoTurno = s.turnos[s.turnos.length - 1]

  return (
    <>
      <h1 className="text-2xl font-bold text-tinta-900 sm:text-[28px]">Sorteo · {s.nombre}</h1>
      <p className="mt-1 max-w-3xl text-[15px] text-tinta-500">
        En temporada alta las casas no se reservan directo: se asignan por sorteo entre quienes postulan (Art. 6). Turnos de{' '}
        {PARAMETROS.noches_max_temporada_alta} noches, de sábado a sábado, entre el {fechaCorta(primerTurno.entrada)} y el {fechaCorta(ultimoTurno.salida, true)}.
      </p>

      <ul className="mt-4 grid gap-2 text-[15px] text-tinta-700 sm:grid-cols-3">
        <Regla t="Una opción" d="Postula a una casa y un turno. Se adjudica un solo período por temporada." />
        <Regla t="Prioridad" d={`Tiene prioridad quien no tuvo casa en ${condicion.anterior?.toLowerCase() ?? 'la temporada alta anterior'}.`} />
        <Regla t="Lista de espera" d={`Si alguien desiste, el cupo se ofrece por correo en orden; hay ${HORAS_OFERTA} horas para aceptar.`} />
      </ul>

      <div className="mt-6">
        {nueva ? (
          <Exito codigo={nueva} postulacion={mia} />
        ) : mia ? (
          <>
            <h2 className="mb-3 text-lg font-semibold">Su postulación</h2>
            <TarjetaPostulacion postulacion={mia} sorteo={s} onReserva={(c) => navegar(`/reserva/${c}?nueva=1`)} />
          </>
        ) : !puedePostular(usuario) ? (
          <Aviso tipo="info">
            Los funcionarios de otros servicios públicos no postulan al sorteo. Después del sorteo, los turnos que queden vacantes se pueden reservar directo, con hasta{' '}
            {PARAMETROS.anticipacion_maxima_otro_servicio_dias} días de anticipación (Art. 9).
          </Aviso>
        ) : condicion.pierde_posibilidad ? (
          <Aviso tipo="error">
            No puede participar en este sorteo: en {condicion.anterior?.toLowerCase()} desistió sin aviso o no se presentó (Art. 10 d). Después del sorteo podrá reservar los turnos que queden vacantes.
          </Aviso>
        ) : abierta ? (
          <Formulario sorteo={s} usuario={usuario} condicion={condicion} onListo={setNueva} />
        ) : s.estado === 'postulacion' ? (
          <Aviso>La postulación abre el {fechaLarga(s.postulacion.desde)}.</Aviso>
        ) : (
          <Aviso>La postulación cerró el {fechaCorta(s.postulacion.hasta, true)} y el sorteo ya se realizó.</Aviso>
        )}
      </div>

      {s.estado === 'sorteado' && <Vacantes />}
    </>
  )
}

function Regla({ t, d }) {
  return (
    <li className="rounded-lg bg-white px-4 py-3 ring-1 ring-borde">
      <span className="block font-semibold text-tinta-900">{t}</span>
      {d}
    </li>
  )
}

function Exito({ codigo, postulacion }) {
  return (
    <Tarjeta className="mx-auto max-w-xl p-6 text-center">
      <CheckCircle2 className="mx-auto size-12 text-verde-600" aria-hidden />
      <h2 className="mt-3 text-xl font-bold">Postulación recibida</h2>
      <p className="mt-1 text-[15px] text-tinta-500">
        Código <strong className="text-tinta-900">{codigo}</strong>. Le enviamos el comprobante a {postulacion?.contacto.correo}.
      </p>
      {postulacion && (
        <p className="mt-3 text-[15px]">
          {postulacion.casa.nombre} · {rangoFechas(postulacion.turno, salidaTurno(postulacion.turno))}
        </p>
      )}
      <p className="mt-3 text-[15px] text-tinta-700">El sorteo se realiza al cierre de la postulación. Puede ver el estado o retirar su postulación en Mis reservas.</p>
      <Boton a="/mis-reservas" variante="secundario" className="mt-5">
        Ir a Mis reservas
      </Boton>
    </Tarjeta>
  )
}

function Formulario({ sorteo: s, usuario, condicion, onListo }) {
  const casas = listarCasas()
  const [region, setRegion] = useState('')
  const [casaId, setCasaId] = useState('')
  const [turno, setTurno] = useState('')
  const [personas, setPersonas] = useState(1)
  const formas = formasDePago(usuario)
  const [pago, setPago] = useState(formas.length === 1 ? formas[0] : '')
  const [cuotas, setCuotas] = useState(1)
  const [autoriza, setAutoriza] = useState(false)
  const [correo, setCorreo] = useState(usuario.correo)
  const [telefono, setTelefono] = useState(usuario.telefono ?? '')
  const [acepta, setAcepta] = useState(false)
  const [intento, setIntento] = useState(false)
  const [error, setError] = useState(null)

  const casa = casas.find((c) => String(c.id) === casaId)
  const dem = demanda()
  const visibles = casas.filter((c) => !region || c.region === region)
  const tarifa = casa ? tarifaPara(casa, usuario) : 0
  const total = tarifa * PARAMETROS.noches_max_temporada_alta

  const errores = {
    casa: !casa && 'Elija una casa.',
    turno: !turno && 'Elija un turno.',
    personas: casa && (personas < 1 || personas > casa.capacidad) && `La casa admite hasta ${casa.capacidad} personas.`,
    pago: !pago ? 'Elija una forma de pago.' : pago === 'planilla' && !autoriza ? 'Debe autorizar el descuento si se adjudica el turno.' : null,
    contacto: !/^\S+@\S+\.\S+$/.test(correo) ? 'Escriba un correo válido.' : telefono.replace(/\D/g, '').length < 8 ? 'Escriba un teléfono de contacto.' : null,
    acepta: !acepta && 'Debe aceptar el reglamento.',
  }
  const valido = !Object.values(errores).some(Boolean)

  function enviar() {
    setIntento(true)
    if (!valido) return
    const r = postular({
      usuario,
      casa_id: casa.id,
      turno,
      personas,
      forma_pago: pago === 'planilla' ? { tipo: 'planilla', cuotas, autorizacion: true } : { tipo: 'transferencia', anticipado: true },
      contacto: { correo, telefono },
    })
    if (r.error) setError(r.error)
    else {
      window.scrollTo({ top: 0 })
      onListo(r.codigo)
    }
  }

  const err = (k) => intento && errores[k] && <p className="mt-2 text-sm text-error-700">{errores[k]}</p>

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="min-w-0 space-y-5">
        <Aviso tipo={condicion.prioridad ? 'info' : 'alerta'}>
          Postulación abierta hasta el <strong>{fechaLarga(s.postulacion.hasta)}</strong>.{' '}
          {condicion.prioridad
            ? `Usted tiene prioridad: no tuvo casa en ${condicion.anterior.toLowerCase()}.`
            : `Usted participa sin prioridad porque tuvo casa en ${condicion.anterior.toLowerCase()} (Art. 6 a).`}
        </Aviso>

        <Tarjeta className="p-5">
          <h2 className="text-lg font-semibold">1. Casa</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="Región">
              <select
                className={claseEntrada}
                value={region}
                onChange={(e) => {
                  setRegion(e.target.value)
                  setCasaId('')
                  setTurno('')
                }}
              >
                <option value="">Todas las regiones</option>
                {REGIONES.filter((r) => casas.some((c) => c.region === r.codigo)).map((r) => (
                  <option key={r.codigo} value={r.codigo}>
                    {r.nombre}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo etiqueta="Casa">
              <select
                className={claseEntrada}
                value={casaId}
                onChange={(e) => {
                  setCasaId(e.target.value)
                  setTurno('')
                }}
              >
                <option value="">Elija una casa</option>
                {visibles.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} · hasta {c.capacidad} personas{region ? '' : ` · ${nombreRegion(c.region)}`}
                  </option>
                ))}
              </select>
            </Campo>
          </div>
          {err('casa')}
        </Tarjeta>

        <Tarjeta className="p-5">
          <h2 className="text-lg font-semibold">2. Turno</h2>
          <p className="mt-1 text-[13px] text-tinta-500">
            Llegada el sábado desde las {PARAMETROS.hora_ingreso} y salida el sábado siguiente hasta las {PARAMETROS.hora_salida}. Se muestra cuántas personas ya postularon a cada turno.
          </p>
          {!casa ? (
            <p className="mt-3 text-[15px] text-tinta-500">Elija primero una casa.</p>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Turno">
              {s.turnos.map((t) => {
                const n = dem[`${casa.id}|${t.entrada}`] ?? 0
                const activo = turno === t.entrada
                return (
                  <button
                    key={t.entrada}
                    type="button"
                    role="radio"
                    aria-checked={activo}
                    onClick={() => setTurno(t.entrada)}
                    className={`rounded-lg p-3 text-left ring-inset ${activo ? 'bg-verde-50 ring-2 ring-verde-600' : 'bg-white ring-1 ring-borde hover:bg-stone-50'}`}
                  >
                    <span className="block text-[13px] text-tinta-500">Turno {t.numero}</span>
                    <span className="block font-semibold">{rangoFechas(t.entrada, t.salida)}</span>
                    <span className={`block text-[13px] ${n ? 'text-alerta-700' : 'text-verde-700'}`}>{n ? plural(n, 'postulante', 'postulantes') : 'Sin postulantes'}</span>
                  </button>
                )
              })}
            </div>
          )}
          {err('turno')}
        </Tarjeta>

        <Tarjeta className="p-5">
          <h2 className="text-lg font-semibold">3. Personas y contacto</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-[140px_1fr_1fr]">
            <Campo etiqueta="Personas" ayuda={casa ? `Máximo ${casa.capacidad}` : undefined}>
              <input type="number" min="1" max={casa?.capacidad ?? 10} className={claseEntrada} value={personas} onChange={(e) => setPersonas(Number(e.target.value))} />
            </Campo>
            <Campo etiqueta="Correo" ayuda="Aquí le avisaremos el resultado.">
              <input type="email" className={claseEntrada} value={correo} onChange={(e) => setCorreo(e.target.value)} autoComplete="email" />
            </Campo>
            <Campo etiqueta="Teléfono">
              <input type="tel" className={claseEntrada} value={telefono} onChange={(e) => setTelefono(e.target.value)} autoComplete="tel" />
            </Campo>
          </div>
          {err('personas')}
          {err('contacto')}
          <p className="mt-3 text-[13px] text-tinta-500">Si se adjudica el turno, podrá indicar los nombres de quienes viajan antes de llegar (Art. 14).</p>
        </Tarjeta>

        <Tarjeta className="p-5">
          <h2 className="text-lg font-semibold">4. Pago, si se adjudica</h2>
          <div className="mt-3 grid gap-3" role="radiogroup" aria-label="Forma de pago">
            {formas.includes('planilla') && (
              <Opcion activa={pago === 'planilla'} onClick={() => setPago('planilla')} titulo="Descuento por planilla" detalle="Se descuenta de su remuneración.">
                {pago === 'planilla' && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Número de cuotas">
                      {Array.from({ length: PARAMETROS.cuotas_maximas_planilla }, (_, i) => i + 1).map((c) => (
                        <button
                          key={c}
                          type="button"
                          role="radio"
                          aria-checked={cuotas === c}
                          onClick={() => setCuotas(c)}
                          className={`rounded-lg px-3 py-2 text-sm ring-1 ring-inset ${cuotas === c ? 'bg-verde-700 font-semibold text-white ring-verde-700' : 'bg-white text-tinta-700 ring-borde hover:bg-stone-50'}`}
                        >
                          {plural(c, 'cuota', 'cuotas')}
                        </button>
                      ))}
                    </div>
                    <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-lg bg-white p-3 ring-1 ring-borde">
                      <input type="checkbox" className="mt-0.5 size-5 accent-verde-700" checked={autoriza} onChange={(e) => setAutoriza(e.target.checked)} />
                      <span className="text-[15px]">
                        Si me adjudico el turno, autorizo el descuento por planilla del total de la estadía{casa ? ` (${pesos(total)})` : ''} en {plural(cuotas, 'cuota', 'cuotas')}.
                      </span>
                    </label>
                  </div>
                )}
              </Opcion>
            )}
            {formas.includes('transferencia') && (
              <Opcion
                activa={pago === 'transferencia'}
                onClick={() => setPago('transferencia')}
                titulo="Transferencia electrónica"
                detalle="Antes de llegar. Si se adjudica el turno, recibirá la cuenta de CONAF y la glosa con su código de reserva."
              />
            )}
          </div>
          {err('pago')}
        </Tarjeta>

        <Tarjeta className="p-5">
          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" className="mt-0.5 size-5 accent-verde-700" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} />
            <span className="text-[15px]">
              Conozco y acepto el Reglamento General de Uso de Casas de Veraneo o Descanso. Entiendo que si me adjudico el turno y desisto sin aviso o no me presento, pierdo la posibilidad en el sorteo de la temporada alta siguiente (Art. 10 d).
            </span>
          </label>
          {err('acepta')}
          {error && (
            <div className="mt-3">
              <Aviso tipo="error">{error}</Aviso>
            </div>
          )}
        </Tarjeta>

        <div className="flex justify-end">
          <Boton onClick={enviar}>
            <Ticket className="size-4" aria-hidden /> Enviar postulación
          </Boton>
        </div>
      </div>

      <aside className="lg:sticky lg:top-4 lg:self-start">
        <Tarjeta className="overflow-hidden">
          {casa ? <img src={rutaFoto(casa.fotos[0])} alt="" className="aspect-[16/9] w-full object-cover" /> : <div className="aspect-[16/9] w-full bg-stone-100" />}
          <div className="p-4">
            <p className="font-semibold">{casa ? casa.nombre : 'Su postulación'}</p>
            {casa && <p className="text-[13px] text-tinta-500">{nombreRegion(casa.region)}</p>}
            <dl className="mt-3 space-y-2 text-[15px]">
              <div>
                <dt className="text-[13px] text-tinta-500">Turno</dt>
                <dd>{turno ? rangoFechas(turno, salidaTurno(turno)) : '—'}</dd>
              </div>
              <div>
                <dt className="text-[13px] text-tinta-500">Personas</dt>
                <dd>{plural(personas, 'persona', 'personas')}</dd>
              </div>
              {casa && (
                <div className="flex justify-between border-t border-borde pt-2 text-[17px] font-bold">
                  <dt>Total si se adjudica</dt>
                  <dd>{pesos(total)}</dd>
                </div>
              )}
            </dl>
            {casa && (
              <p className="mt-1 text-[13px] text-tinta-500">
                {PARAMETROS.noches_max_temporada_alta} noches × {pesos(tarifa)}
              </p>
            )}
            <p className="mt-3 text-[13px] text-tinta-500">
              ¿Prefiere otra fecha fuera de temporada alta? <Link to="/" className="font-medium text-verde-700 hover:underline">Reserve directo</Link>.
            </p>
          </div>
        </Tarjeta>
      </aside>
    </div>
  )
}

function Opcion({ activa, onClick, titulo, detalle, children }) {
  return (
    <div
      role="radio"
      aria-checked={activa}
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && e.target === e.currentTarget && (e.preventDefault(), onClick())}
      className={`cursor-pointer rounded-lg p-4 ring-inset ${activa ? 'bg-verde-50 ring-2 ring-verde-600' : 'bg-white ring-1 ring-borde hover:bg-stone-50'}`}
    >
      <span className="flex items-center gap-3">
        <span className={`grid size-5 shrink-0 place-items-center rounded-full ring-2 ${activa ? 'ring-verde-700' : 'ring-stone-300'}`}>
          {activa && <span className="size-2.5 rounded-full bg-verde-700" />}
        </span>
        <span>
          <span className="block font-semibold">{titulo}</span>
          <span className="block text-sm text-tinta-500">{detalle}</span>
        </span>
      </span>
      {children}
    </div>
  )
}

/** Turnos que quedaron sin adjudicar: se reservan directo (Art. 6 c). */
function Vacantes() {
  const lista = turnosVacantes()
  if (!lista.length) return null
  const porCasa = Object.values(
    lista.reduce((m, v) => {
      ;(m[v.casa.id] ??= { casa: v.casa, turnos: [] }).turnos.push(v)
      return m
    }, {}),
  )
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold">Turnos vacantes después del sorteo</h2>
      <p className="mt-1 text-[15px] text-tinta-500">Quedaron sin postulantes: se reservan directo, como cualquier fecha, mientras sigan libres.</p>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {porCasa.map(({ casa, turnos }) => (
          <li key={casa.id} className="rounded-xl border border-borde bg-white p-4">
            <p className="font-semibold">{casa.nombre}</p>
            <p className="text-[13px] text-tinta-500">{nombreRegion(casa.region)}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {turnos.map((t) => (
                <Link
                  key={t.entrada}
                  to={`/casa/${casa.id}?entrada=${t.entrada}&salida=${t.salida}`}
                  className="rounded-md bg-verde-50 px-2 py-1 text-[13px] font-medium text-verde-800 hover:underline"
                >
                  {rangoFechas(t.entrada, t.salida)}
                </Link>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
