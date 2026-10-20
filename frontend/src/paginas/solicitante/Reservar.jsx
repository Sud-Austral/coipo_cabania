import { useCallback, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Landmark, Plus, Trash2 } from 'lucide-react'
import { REGIONES } from '../../datos/casas.js'
import { crearReserva, misReservas, obtenerCasa, ocupacionesDe, nochesLiberadas, proximoCodigo, useDatos } from '../../datos/servicio.js'
import { fechaCorta, fechaLarga, rangoFechas, sumarDias } from '../../lib/fechas.js'
import { pesos, plural } from '../../lib/formato.js'
import {
  CALIDADES,
  CONDICIONES_USO,
  PARAMETROS,
  PARENTESCOS,
  formasDePago,
  glosaTransferencia,
  nochesNoDisponibles,
  noches,
  tarifaPara,
  validarFechas,
} from '../../lib/reglas.js'
import { Calendario } from '../../componentes/Calendario.jsx'
import { rutaFoto } from '../../componentes/fotos.js'
import { Aviso, Boton, Campo, Tarjeta, claseEntrada } from '../../componentes/ui.jsx'
import { useSesion } from '../../componentes/Perfil.jsx'
import { CuadroTransferencia } from '../../componentes/Transferencia.jsx'

const PASOS = ['Fechas', 'Quiénes van', 'Pago y confirmación']
const nombreRegion = (c) => REGIONES.find((r) => r.codigo === c)?.nombre ?? '—'

/**
 * Reserva en tres pasos. La usa el solicitante para sí mismo y, con `titular`
 * y `gestor`, la encargada regional u Oficina Central para registrar la
 * reserva que una persona les pidió (asistida).
 */
export function Reservar({ titular, gestor, casaId, onCambiar }) {
  useDatos()
  const params = useParams()
  const [p, setP] = useSearchParams()
  const navegar = useNavigate()
  const sesion = useSesion()
  const usuario = titular ?? sesion.usuario
  const asistida = Boolean(gestor)
  const casa = obtenerCasa(casaId ?? params.id)

  const entrada = p.get('entrada')
  const salida = p.get('salida')
  const [paso, setPaso] = useState(entrada && salida ? 1 : 0)
  const [viaja, setViaja] = useState(true)
  const [aCargo, setACargo] = useState('')
  const [otros, setOtros] = useState([])
  const [telefono, setTelefono] = useState(usuario.telefono ?? '')
  const [correo, setCorreo] = useState(usuario.correo)
  const [perro, setPerro] = useState(false)
  const [credencial, setCredencial] = useState(null)
  const [sanitario, setSanitario] = useState(null)
  const formas = formasDePago(usuario)
  // Si hay transferencia, nada viene marcado: al elegirla se abre el cuadro con la cuenta.
  const [pago, setPago] = useState(formas.length === 1 && formas[0] === 'planilla' ? 'planilla' : null)
  const [cuadro, setCuadro] = useState(false)
  const [vioCuenta, setVioCuenta] = useState(false)
  const cerrarCuadro = useCallback(() => {
    setCuadro(false)
    setVioCuenta(true)
  }, [])
  const [cuotas, setCuotas] = useState(1)
  const [autoriza, setAutoriza] = useState(false)
  const [acepta, setAcepta] = useState(false)
  const [intento, setIntento] = useState(false)
  const [ocupada, setOcupada] = useState(false)

  if (!casa) return <p>No encontramos esa casa.</p>

  const tarifa = tarifaPara(casa, usuario)
  const noDisponibles = nochesNoDisponibles(ocupacionesDe(casa.id))
  const liberadas = nochesLiberadas(casa.id)
  const erroresFechas = validarFechas({ entrada, salida, noDisponibles, reservasUsuario: misReservas(usuario.id), calidad: usuario.calidad, liberadas })
  const n = noches(entrada, salida)
  const total = tarifa * n

  const personas = (viaja ? 1 : 0) + otros.length
  const excede = personas > casa.capacidad
  const adultos = otros.filter((o) => o.nombre.trim() && Number(o.edad) >= 18)
  const errorGrupo = personas === 0
    ? 'Agregue a las personas que viajan.'
    : !viaja && !adultos.some((o) => o.nombre.trim() === aCargo)
      ? 'Indique qué persona mayor de edad estará a cargo en la casa.'
      : null
  const errorPerro = perro && (!credencial || !sanitario) ? 'Adjunte la credencial y el certificado sanitario del perro de asistencia.' : null
  const errorOtro = (o) => ({
    nombre: o.nombre.trim().split(/\s+/).length < 2 ? 'Escriba nombre y apellido.' : null,
    edad: o.edad === '' || Number(o.edad) < 0 || Number(o.edad) > 110 ? 'Indique la edad.' : null,
  })
  const otrosConError = otros.some((o) => Object.values(errorOtro(o)).some(Boolean))
  const contactoError = !/^\S+@\S+\.\S+$/.test(correo)
    ? 'Escriba un correo válido.'
    : telefono.replace(/\D/g, '').length < 8
      ? 'Escriba un teléfono donde ubicarlo durante la estadía.'
      : null

  const pagoValido = pago === 'planilla' ? autoriza || asistida : pago === 'transferencia' ? vioCuenta : false
  const pasoValido = [erroresFechas.length === 0, !excede && !otrosConError && !contactoError && !errorGrupo && !errorPerro, acepta && pagoValido]
  const glosa = glosaTransferencia(casa, proximoCodigo())
  const elegirTransferencia = () => {
    setPago('transferencia')
    setCuadro(true)
  }
  const limiteDesistir = sumarDias(entrada ?? '2026-01-01', -PARAMETROS.aviso_desistimiento_sin_costo_dias)

  function avanzar() {
    setIntento(true)
    if (!pasoValido[paso]) return
    setIntento(false)
    if (paso < 2) {
      setPaso(paso + 1)
      window.scrollTo({ top: 0 })
      return
    }
    const codigo = crearReserva({
      usuario,
      casa,
      entrada,
      salida,
      tarifa_noche: tarifa,
      ocupantes: [
        ...(viaja ? [{ nombre: usuario.nombre, parentesco: 'titular' }] : []),
        ...otros.map((o) => ({ ...o, nombre: o.nombre.trim(), edad: Number(o.edad) })),
      ],
      contacto: { telefono, correo },
      titular_viaja: viaja,
      a_cargo: viaja ? usuario.nombre : aCargo,
      perro_asistencia: perro ? { credencial: credencial.name, certificado_sanitario: sanitario.name } : false,
      forma_pago:
        pago === 'planilla'
          ? { tipo: 'planilla', cuotas, autorizacion: !asistida }
          : { tipo: 'transferencia', anticipado: true, glosa },
      ...(asistida && {
        registrada_por: { nombre: gestor.nombre, perfil: gestor.perfil, region: gestor.region ?? null },
        aceptacion_pendiente: true,
      }),
    })
    if (!codigo) {
      setOcupada(true)
      return
    }
    navegar(asistida ? `/gestion/reserva/${codigo}?nueva=1` : `/reserva/${codigo}?nueva=1`, { replace: !asistida })
  }

  const cambiarFechas = ({ entrada: e, salida: s }) => {
    const q = new URLSearchParams()
    if (e) q.set('entrada', e)
    if (s) q.set('salida', s)
    setP(q, { replace: true })
  }

  return (
    <>
      {asistida ? (
        <button type="button" onClick={onCambiar} className="inline-flex items-center gap-1 text-sm font-medium text-verde-700 hover:underline">
          <ArrowLeft className="size-4" aria-hidden /> Cambiar persona o casa
        </button>
      ) : (
        <Link to={`/casa/${casa.id}${entrada && salida ? `?entrada=${entrada}&salida=${salida}` : ''}`} className="inline-flex items-center gap-1 text-sm font-medium text-verde-700 hover:underline">
          <ArrowLeft className="size-4" aria-hidden /> Volver a la casa
        </Link>
      )}
      <h1 className="mt-3 text-2xl font-bold text-tinta-900">
        Reservar {casa.nombre}
        {asistida && <span className="block text-lg font-semibold text-tinta-700">a nombre de {usuario.nombre}</span>}
      </h1>

      <ol className="mt-4 flex gap-2" aria-label="Pasos de la reserva">
        {PASOS.map((t, i) => (
          <li key={t} className="flex-1">
            <button type="button" disabled={i > paso} onClick={() => setPaso(i)} aria-current={i === paso ? 'step' : undefined} className="w-full text-left disabled:cursor-default">
              <span className={`block h-1.5 rounded-full ${i <= paso ? 'bg-verde-600' : 'bg-stone-200'}`} />
              <span className={`mt-1.5 block text-[13px] sm:text-sm ${i === paso ? 'font-semibold text-tinta-900' : 'text-tinta-500'}`}>
                {i + 1}. {t}
              </span>
            </button>
          </li>
        ))}
      </ol>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-5">
          {paso === 0 && (
            <Tarjeta className="p-5">
              <h2 className="mb-4 text-lg font-semibold">¿Cuándo quiere ir?</h2>
              <Calendario noDisponibles={noDisponibles} entrada={entrada} salida={salida} onCambio={cambiarFechas} calidad={usuario.calidad} liberadas={liberadas} />
              {entrada && salida && erroresFechas.map((e) => <div key={e} className="mt-3"><Aviso tipo="error">{e}</Aviso></div>)}
            </Tarjeta>
          )}

          {paso === 1 && (
            <>
              <Tarjeta className="p-5">
                <h2 className="text-lg font-semibold">Usuario/a responsable</h2>
                <dl className="mt-3 grid gap-x-6 gap-y-2 text-[15px] sm:grid-cols-2">
                  <Dato t="Nombre" v={usuario.nombre} />
                  <Dato t="RUT" v={usuario.rut} />
                  <Dato t={usuario.calidad === 'otro_servicio' ? 'Servicio' : 'Rol'} v={usuario.calidad === 'otro_servicio' ? usuario.institucion : usuario.rol} />
                  <Dato t="Región" v={nombreRegion(usuario.region)} />
                  <Dato t="Calidad" v={CALIDADES[usuario.calidad] + (usuario.plazo_fijo ? ' · contrato a plazo fijo' : '')} />
                </dl>
                <p className="mt-3 text-[13px] text-tinta-500">
                  {usuario.calidad === 'otro_servicio'
                    ? 'Datos que usted declaró al ingresar.'
                    : 'Datos de la nómina de CONAF y Bienestar. Si hay un error, avise a su encargada regional.'}
                </p>
              </Tarjeta>

              <Tarjeta className="p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-lg font-semibold">¿Quiénes van?</h2>
                  <span className={`text-[15px] font-semibold ${excede ? 'text-error-700' : 'text-tinta-500'}`}>
                    {personas} de {casa.capacidad} personas
                  </span>
                </div>
                <p className="mt-1 text-[13px] text-tinta-500">Incluya a todas las personas que pernoctarán, también niños y niñas (Art. 14).</p>

                <div className="mt-4 rounded-lg border border-borde px-4 py-3">
                  <p className="font-medium">{usuario.nombre}</p>
                  <p className="text-sm text-tinta-500">Usuario/a responsable · {asistida ? `pide la reserva por medio de ${gestor.nombre}` : 'hace la solicitud'} y responde por el grupo (Art. 2 a)</p>
                  <label className="mt-3 flex cursor-pointer items-center gap-3">
                    <input type="checkbox" className="size-5 accent-verde-700" checked={viaja} onChange={(e) => setViaja(e.target.checked)} />
                    <span className="text-[15px]">{asistida ? 'Viaja' : 'Yo también viajo'}</span>
                  </label>
                </div>
                {!viaja && (
                  <div className="mt-3 space-y-3">
                    <Aviso>
                      {asistida ? `${usuario.nombre} sigue siendo el usuario/a responsable:` : 'Usted sigue siendo el usuario/a responsable:'} responde por el grupo, por los daños y por el cumplimiento del reglamento durante toda la estadía, aunque no viaje (Art. 2 a y 22). La reserva no se puede ceder (Art. 8).
                    </Aviso>
                    <Campo etiqueta="Persona a cargo en la casa" ayuda="Debe ser una de las personas que viajan, mayor de edad.">
                      <select className={claseEntrada} value={aCargo} onChange={(e) => setACargo(e.target.value)}>
                        <option value="">{adultos.length ? 'Elija a una persona' : 'Primero agregue a las personas que viajan'}</option>
                        {adultos.map((o, i) => (
                          <option key={i} value={o.nombre.trim()}>
                            {o.nombre.trim()}
                          </option>
                        ))}
                      </select>
                    </Campo>
                  </div>
                )}

                {otros.map((o, i) => {
                  const err = intento ? errorOtro(o) : {}
                  const cambiar = (k, v) => setOtros(otros.map((x, j) => (j === i ? { ...x, [k]: v } : x)))
                  return (
                    <fieldset key={i} className="mt-4 rounded-lg border border-borde p-4">
                      <legend className="px-1 text-sm font-semibold text-tinta-700">Persona {i + 1}</legend>
                      <div className="grid gap-3 sm:grid-cols-[1fr_90px_1fr]">
                        <Campo etiqueta="Nombre y apellido" error={err.nombre}>
                          <input className={claseEntrada} value={o.nombre} onChange={(e) => cambiar('nombre', e.target.value)} autoComplete="off" />
                        </Campo>
                        <Campo etiqueta="Edad" error={err.edad}>
                          <input className={claseEntrada} type="number" min="0" max="110" value={o.edad} onChange={(e) => cambiar('edad', e.target.value)} />
                        </Campo>
                        <Campo etiqueta="Relación">
                          <select className={claseEntrada} value={o.parentesco} onChange={(e) => cambiar('parentesco', e.target.value)}>
                            {PARENTESCOS.map((x) => (
                              <option key={x.valor} value={x.valor}>
                                {x.etiqueta}
                              </option>
                            ))}
                          </select>
                        </Campo>
                      </div>
                      <button type="button" onClick={() => setOtros(otros.filter((_, j) => j !== i))} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-error-700 hover:underline">
                        <Trash2 className="size-4" aria-hidden /> Quitar
                      </button>
                    </fieldset>
                  )
                })}

                <Boton variante="secundario" className="mt-4" disabled={personas >= casa.capacidad} onClick={() => setOtros([...otros, { nombre: '', edad: '', parentesco: 'familiar' }])}>
                  <Plus className="size-4" aria-hidden /> Agregar persona
                </Boton>
                {excede && <div className="mt-3"><Aviso tipo="error">La casa admite hasta {casa.capacidad} personas. Quite a alguien para continuar.</Aviso></div>}

                {intento && errorGrupo && <div className="mt-3"><Aviso tipo="error">{errorGrupo}</Aviso></div>}

                <label className="mt-5 flex cursor-pointer items-start gap-3">
                  <input type="checkbox" className="mt-0.5 size-5 accent-verde-700" checked={perro} onChange={(e) => setPerro(e.target.checked)} />
                  <span className="text-[15px]">Viaja un perro de asistencia (Ley 20.422)</span>
                </label>
                {perro && (
                  <div className="mt-3 rounded-lg bg-stone-50 p-4">
                    <p className="text-[15px] text-tinta-700">
                      Las mascotas no pueden ingresar a las casas; los perros de asistencia de personas con discapacidad sí (Art. 15). Para acreditarlo, adjunte:
                    </p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px] text-tinta-700">
                      <li>
                        <strong>Credencial de usuario de perro de asistencia</strong>, emitida por la entidad que adiestró al perro, inscrita en el Registro Nacional de la Discapacidad. Incluye la foto de la persona con el perro y sus datos (D.S. N° 223/2006, Art. 6).
                      </li>
                      <li>
                        <strong>Certificado sanitario vigente</strong>, firmado por un médico veterinario, con la vacuna antirrábica del último año (D.S. N° 223/2006, Art. 9).
                      </li>
                    </ul>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <Adjunto etiqueta="Credencial del perro de asistencia" archivo={credencial} onCambio={setCredencial} />
                      <Adjunto etiqueta="Certificado sanitario vigente" archivo={sanitario} onCambio={setSanitario} />
                    </div>
                    <p className="mt-2 text-[13px] text-tinta-500">PDF o imagen, hasta 5 MB cada uno. Los revisa la encargada regional.</p>
                    {intento && errorPerro && <p className="mt-2 text-sm text-error-700">{errorPerro}</p>}
                  </div>
                )}
              </Tarjeta>

              <Tarjeta className="p-5">
                <h2 className="text-lg font-semibold">Contacto durante la estadía</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Campo etiqueta="Teléfono">
                    <input className={claseEntrada} type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} autoComplete="tel" />
                  </Campo>
                  <Campo etiqueta="Correo" ayuda="Aquí le avisaremos la confirmación.">
                    <input className={claseEntrada} type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} autoComplete="email" />
                  </Campo>
                </div>
                {intento && contactoError && <div className="mt-3"><Aviso tipo="error">{contactoError}</Aviso></div>}
              </Tarjeta>
            </>
          )}

          {paso === 2 && (
            <>
              <Tarjeta className="p-5">
                <h2 className="text-lg font-semibold">¿Cómo pagará?</h2>
                <p className="mt-1 text-[15px] text-tinta-500">
                  Total de la estadía: <strong className="text-tinta-900">{pesos(total)}</strong>
                </p>
                <p className="mt-3 text-[15px] text-tinta-700">
                  {formas.length === 1 && formas[0] === 'transferencia'
                    ? usuario.calidad === 'jubilado'
                      ? 'Como persona pensionada, paga por transferencia antes de llegar (Art. 21).'
                      : 'Como funcionario/a de otro servicio público, paga por transferencia antes de llegar (Art. 21).'
                    : formas.length > 1
                      ? 'Con contrato a plazo fijo puede elegir descuento por planilla o transferencia.'
                      : 'Como funcionario/a de CONAF, paga con descuento por planilla.'}
                </p>
                <div className="mt-4 grid gap-3" role="radiogroup" aria-label="Forma de pago">
                  {formas.includes('planilla') && (
                    <OpcionPago activa={pago === 'planilla'} onClick={() => setPago('planilla')} titulo="Descuento por planilla" detalle="Se descuenta de su remuneración.">
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
                                {c === 1 ? `1 cuota de ${pesos(total)}` : `${c} cuotas de ${pesos(total / c)}`}
                              </button>
                            ))}
                          </div>
                          {asistida ? (
                            <p className="mt-3 rounded-lg bg-white p-3 text-[15px] ring-1 ring-borde">
                              {usuario.nombre} autorizará el descuento de <strong>{pesos(total)}</strong> en {plural(cuotas, 'cuota', 'cuotas')} con el enlace que recibirá por correo.
                            </p>
                          ) : (
                          <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-lg bg-white p-3 ring-1 ring-borde">
                            <input type="checkbox" className="mt-0.5 size-5 accent-verde-700" checked={autoriza} onChange={(e) => setAutoriza(e.target.checked)} />
                            <span className="text-[15px]">
                              Autorizo el descuento por planilla de <strong>{pesos(total)}</strong> en {plural(cuotas, 'cuota', 'cuotas')}, más los cargos que correspondan según el reglamento (Anexo A).
                            </span>
                          </label>
                          )}
                          {intento && !autoriza && !asistida && <p className="mt-2 text-sm text-error-700">Debe autorizar el descuento{formas.length > 1 ? ', o elegir la transferencia' : ''}.</p>}
                        </div>
                      )}
                    </OpcionPago>
                  )}
                  {formas.includes('transferencia') && (
                    <OpcionPago activa={pago === 'transferencia'} onClick={elegirTransferencia} titulo="Transferencia electrónica" detalle="Antes de llegar, a la cuenta corriente de CONAF.">
                      {pago === 'transferencia' && vioCuenta && (
                        <div onClick={(e) => e.stopPropagation()} className="mt-3 rounded-lg bg-white p-3 text-[15px] ring-1 ring-borde">
                          <span className="text-[13px] text-tinta-500">Glosa de su transferencia</span>
                          <span className="block font-semibold text-verde-800">{glosa}</span>
                          <button type="button" onClick={() => setCuadro(true)} className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-verde-700 hover:underline">
                            <Landmark className="size-4" aria-hidden /> Ver datos de la cuenta
                          </button>
                        </div>
                      )}
                    </OpcionPago>
                  )}
                </div>
                {intento && !pago && <div className="mt-3"><Aviso tipo="error">Elija una forma de pago.</Aviso></div>}
              </Tarjeta>

              <Tarjeta className="p-5">
                <h2 className="text-lg font-semibold">Antes de enviar</h2>
                <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[15px] text-tinta-700">
                  <li>Si las fechas siguen disponibles, la reserva queda <strong>confirmada al instante</strong> y {asistida ? 'se envían' : 'le enviamos'} el comprobante y el acta de entrega por correo.</li>
                  <li>
                    Si desiste <strong>hasta el {fechaCorta(limiteDesistir, true)}</strong> no tiene costo. Después, o si no se presenta, se cobra una noche ({pesos(tarifa)}), salvo fuerza mayor acreditada (Art. 10).
                  </li>
                </ul>
                <details className="mt-3 rounded-lg bg-stone-50 px-4 py-3">
                  <summary className="cursor-pointer text-[15px] font-medium text-verde-800">Condiciones de uso de la casa</summary>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px] text-tinta-700">
                    {CONDICIONES_USO.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </details>
                <label className="mt-4 flex cursor-pointer items-start gap-3">
                  <input type="checkbox" className="mt-0.5 size-5 accent-verde-700" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} />
                  <span className="text-[15px]">
                    {asistida
                      ? `Declaro que ${usuario.nombre} me pidió esta reserva. Recibirá en ${correo} el comprobante, el acta de entrega y un enlace para aceptar el reglamento${pago === 'planilla' ? ' y autorizar el descuento por planilla' : ''}.`
                      : 'Conozco y acepto el Reglamento General de Uso de Casas de Veraneo o Descanso.'}
                  </span>
                </label>
                {intento && !acepta && <div className="mt-3"><Aviso tipo="error">{asistida ? 'Debe declarar que la persona pidió la reserva.' : 'Debe aceptar el reglamento para confirmar la reserva.'}</Aviso></div>}
                {ocupada && <div className="mt-3"><Aviso tipo="error">Otra persona acaba de reservar esas fechas. Vuelva al paso 1 y elija otras.</Aviso></div>}
              </Tarjeta>
            </>
          )}

          <div className="flex flex-wrap justify-between gap-3">
            {paso > 0 ? (
              <Boton variante="secundario" onClick={() => setPaso(paso - 1)}>
                Atrás
              </Boton>
            ) : (
              <span />
            )}
            <Boton onClick={avanzar} disabled={paso === 0 && (!entrada || !salida || erroresFechas.length > 0)}>
              {paso < 2 ? 'Continuar' : 'Confirmar reserva'}
            </Boton>
          </div>
        </div>

        <aside className="lg:sticky lg:top-4 lg:self-start">
          <Tarjeta className="overflow-hidden">
            <img src={rutaFoto(casa.fotos[0])} alt="" className="aspect-[16/9] w-full object-cover" />
            <div className="p-4">
              <p className="font-semibold">{casa.nombre}</p>
              {entrada && salida ? (
                <dl className="mt-3 space-y-2 text-[15px]">
                  <Dato t="Llegada" v={`${fechaLarga(entrada)}, desde las ${PARAMETROS.hora_ingreso}`} />
                  <Dato t="Salida" v={`${fechaLarga(salida)}, hasta las ${PARAMETROS.hora_salida}`} />
                  {paso > 0 && <Dato t="Personas" v={plural(personas, 'persona', 'personas')} />}
                  <div className="flex justify-between border-t border-borde pt-2 text-[17px] font-bold">
                    <dt>Total</dt>
                    <dd>{pesos(total)}</dd>
                  </div>
                  <p className="text-[13px] text-tinta-500">
                    {rangoFechas(entrada, salida)} · {plural(n, 'noche', 'noches')} × {pesos(tarifa)}
                  </p>
                </dl>
              ) : (
                <p className="mt-2 text-sm text-tinta-500">Elija las fechas en el calendario.</p>
              )}
            </div>
          </Tarjeta>
        </aside>
      </div>
      {cuadro && <CuadroTransferencia monto={total} glosa={glosa} plazo="antes de su llegada" onCerrar={cerrarCuadro} />}
    </>
  )
}

function Dato({ t, v }) {
  return (
    <div>
      <dt className="text-[13px] text-tinta-500">{t}</dt>
      <dd className="first-letter:uppercase">{v}</dd>
    </div>
  )
}

function OpcionPago({ activa, onClick, titulo, detalle, children }) {
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

function Adjunto({ etiqueta, archivo, onCambio }) {
  const [error, setError] = useState(null)
  return (
    <label className="relative block cursor-pointer rounded-lg border border-dashed border-borde bg-white px-3 py-3 hover:border-verde-600">
      <span className="block text-sm font-medium text-tinta-700">{etiqueta}</span>
      <span className={`mt-1 block truncate text-[13px] ${archivo ? 'text-verde-700' : 'text-tinta-500'}`}>{archivo ? `✓ ${archivo.name}` : 'Seleccionar archivo'}</span>
      {error && <span className="mt-1 block text-[13px] text-error-700">{error}</span>}
      <input
        type="file"
        accept="application/pdf,image/*"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (!f) return
          if (f.size > 5 * 1024 * 1024) {
            setError('El archivo supera 5 MB.')
            return
          }
          setError(null)
          onCambio({ name: f.name })
        }}
      />
    </label>
  )
}
