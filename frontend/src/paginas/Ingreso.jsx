import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft, Building2, ShieldCheck, UserRoundCheck } from 'lucide-react'
import { Banner } from '../componentes/Banner.jsx'
import { REGIONES } from '../datos/casas.js'
import { ACCESOS_DEMO, EXTERNO_DEMO, buscarEnNomina, nombreCoincide, porId } from '../datos/usuarios.js'
import { formatearRut, rutValido } from '../lib/formato.js'
import { INICIO, useSesion } from '../componentes/Perfil.jsx'
import { Aviso, Boton, Campo, claseEntrada } from '../componentes/ui.jsx'

/** a••••••@conaf.cl */
const ocultarCorreo = (c) => {
  const [u, d] = c.split('@')
  return `${u[0]}${'•'.repeat(5)}@${d}`
}

const nuevoCodigo = () => String(Math.floor(100000 + Math.random() * 900000))

const VACIO = { rut: '', nombre: '', institucion: '', region: '', correo: '', telefono: '' }

export function Ingreso() {
  const { usuario, ingresar } = useSesion()
  const navegar = useNavigate()
  const [relacion, setRelacion] = useState(null) // 'conaf' | 'externo'
  const [datos, setDatos] = useState(VACIO)
  const [errores, setErrores] = useState({})
  const [errorGeneral, setErrorGeneral] = useState(null)
  const [pendiente, setPendiente] = useState(null) // { sesion, correo, codigo, destino }
  const [codigo, setCodigo] = useState('')
  const [errorCodigo, setErrorCodigo] = useState(null)
  const campoCodigo = useRef(null)

  useEffect(() => {
    if (pendiente) campoCodigo.current?.focus()
  }, [pendiente])

  if (usuario) return <Navigate to={INICIO[usuario.perfil]} replace />

  const fijar = (k, v) => {
    setDatos((d) => ({ ...d, [k]: v }))
    setErrores((e) => ({ ...e, [k]: null }))
    setErrorGeneral(null)
  }

  function enviar(e) {
    e.preventDefault()
    const err = {}
    if (!rutValido(datos.rut)) err.rut = 'Revise el RUT: el dígito verificador no corresponde.'
    if (datos.nombre.trim().split(/\s+/).length < 2) err.nombre = 'Escriba su nombre y al menos un apellido.'
    if (relacion === 'externo') {
      if (datos.institucion.trim().length < 3) err.institucion = 'Indique el servicio público donde trabaja.'
      if (!datos.region) err.region = 'Elija la región donde trabaja.'
      if (!/^\S+@\S+\.\S+$/.test(datos.correo)) err.correo = 'Escriba un correo válido.'
    }
    setErrores(err)
    if (Object.keys(err).length) return

    if (relacion === 'conaf') {
      const persona = buscarEnNomina(datos.rut)
      if (!persona) {
        // Solo maqueta: sin nóminas reales, un RUT válido que no está en la
        // nómina de prueba entra como afiliado activo de demostración. En la
        // versión real este caso muestra el mensaje de "no encontramos".
        const nombre = datos.nombre.trim().replace(/\s+/g, ' ')
        const usuario = nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().split(' ').slice(0, 2).join('.')
        const demo = { rut: formatearRut(datos.rut), nombre, correo: `${usuario}@conaf.cl`, telefono: '' }
        setPendiente({ sesion: { demo }, correo: demo.correo, codigo: nuevoCodigo(), destino: '/', demo: true })
        setCodigo('')
        setErrorCodigo(null)
        return
      }
      // Mensaje único para un nombre que no coincide: no revela datos de la nómina.
      if (!nombreCoincide(datos.nombre, persona.nombre)) {
        setErrorGeneral('No encontramos a una persona con ese RUT y ese nombre en las nóminas de CONAF y Bienestar. Revise los datos o consulte a su encargada regional de Bienestar.')
        return
      }
      setPendiente({ sesion: { id: persona.id }, correo: persona.correo, codigo: nuevoCodigo(), destino: INICIO[persona.perfil] })
    } else {
      const persona = buscarEnNomina(datos.rut)
      if (persona) {
        setErrorGeneral('Ese RUT pertenece a personal de CONAF o a una persona afiliada a Bienestar. Vuelva atrás y elija «Sí».')
        return
      }
      const externo = {
        rut: formatearRut(datos.rut),
        nombre: datos.nombre.trim(),
        institucion: datos.institucion.trim(),
        region: datos.region,
        correo: datos.correo.trim(),
        telefono: datos.telefono.trim(),
      }
      setPendiente({ sesion: { externo }, correo: externo.correo, codigo: nuevoCodigo(), destino: '/' })
    }
    setCodigo('')
    setErrorCodigo(null)
  }

  function verificar(e) {
    e.preventDefault()
    if (codigo.trim() !== pendiente.codigo) {
      setErrorCodigo('El código no coincide. Revise el correo o pida uno nuevo.')
      return
    }
    ingresar(pendiente.sesion)
    navegar(pendiente.destino, { replace: true })
  }

  function accesoDemo(a) {
    setPendiente(null)
    setErrores({})
    setErrorGeneral(null)
    if (a.externo) {
      setRelacion('externo')
      setDatos({ ...VACIO, ...EXTERNO_DEMO, region: '13' })
    } else {
      const p = porId(a.id)
      setRelacion('conaf')
      setDatos({ ...VACIO, rut: p.rut, nombre: p.nombre })
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-fondo">
      <Banner />

      <main className="mx-auto w-full max-w-md flex-1 px-4 py-8 sm:py-12">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-verde-700">Servicio de Bienestar · CONAF</p>
        <h1 className="mt-1 text-[26px] font-bold leading-tight text-tinta-900">Casas de Veraneo</h1>

        <div className="mt-6 rounded-2xl border border-borde bg-white p-5 sm:p-6">
          {!pendiente ? (
            <form onSubmit={enviar} noValidate>
              <fieldset>
                <legend className="text-[17px] font-semibold text-tinta-900">¿Es usted funcionario/a de CONAF?</legend>
                <div className="mt-3 grid gap-2.5" role="radiogroup">
                  <Opcion
                    activa={relacion === 'conaf'}
                    onClick={() => setRelacion('conaf')}
                    icono={UserRoundCheck}
                    titulo="Sí"
                    detalle="Trabajo en CONAF, o soy afiliado/a jubilado/a de Bienestar."
                  />
                  <Opcion
                    activa={relacion === 'externo'}
                    onClick={() => setRelacion('externo')}
                    icono={Building2}
                    titulo="No, trabajo en otro servicio público"
                    detalle="Puede reservar con poca anticipación los cupos que no ocupa el personal de CONAF."
                  />
                </div>
              </fieldset>

              {relacion && (
                <div className="mt-5 space-y-3 border-t border-borde pt-5">
                  <Campo etiqueta="RUT" error={errores.rut}>
                    <input
                      className={claseEntrada}
                      value={datos.rut}
                      onChange={(e) => fijar('rut', formatearRut(e.target.value))}
                      placeholder="12.345.678-9"
                      autoComplete="off"
                      inputMode="text"
                      maxLength={12}
                    />
                  </Campo>
                  <Campo etiqueta="Nombre y apellidos" error={errores.nombre}>
                    <input className={claseEntrada} value={datos.nombre} onChange={(e) => fijar('nombre', e.target.value)} autoComplete="name" />
                  </Campo>

                  {relacion === 'externo' && (
                    <>
                      <Campo etiqueta="Servicio público donde trabaja" error={errores.institucion}>
                        <input className={claseEntrada} value={datos.institucion} onChange={(e) => fijar('institucion', e.target.value)} autoComplete="organization" />
                      </Campo>
                      <Campo etiqueta="Región" error={errores.region}>
                        <select className={claseEntrada} value={datos.region} onChange={(e) => fijar('region', e.target.value)}>
                          <option value="">Elija una región</option>
                          {REGIONES.map((r) => (
                            <option key={r.codigo} value={r.codigo}>
                              {r.nombre}
                            </option>
                          ))}
                        </select>
                      </Campo>
                      <Campo etiqueta="Correo institucional" ayuda="Le enviaremos un código de ingreso." error={errores.correo}>
                        <input className={claseEntrada} type="email" value={datos.correo} onChange={(e) => fijar('correo', e.target.value)} autoComplete="email" />
                      </Campo>
                      <Campo etiqueta="Teléfono (opcional)">
                        <input className={claseEntrada} type="tel" value={datos.telefono} onChange={(e) => fijar('telefono', e.target.value)} autoComplete="tel" />
                      </Campo>
                    </>
                  )}

                  {errorGeneral && <Aviso tipo="error">{errorGeneral}</Aviso>}

                  <Boton type="submit" className="w-full">
                    Continuar
                  </Boton>
                  {relacion === 'conaf' && <p className="text-center text-[13px] text-tinta-500">Le enviaremos un código al correo registrado en la nómina.</p>}
                </div>
              )}
            </form>
          ) : (
            <form onSubmit={verificar} noValidate>
              <button type="button" onClick={() => setPendiente(null)} className="-ml-1 inline-flex items-center gap-1 rounded px-1 text-sm font-medium text-verde-700 hover:underline">
                <ArrowLeft className="size-4" aria-hidden /> Cambiar datos
              </button>
              <ShieldCheck className="mt-4 size-9 text-verde-600" aria-hidden />
              <h2 className="mt-2 text-[19px] font-semibold">Revise su correo</h2>
              <p className="mt-1 text-[15px] text-tinta-700">
                Enviamos un código de 6 dígitos a <strong className="font-semibold">{ocultarCorreo(pendiente.correo)}</strong>. Vence en 10 minutos.
              </p>
              <Campo etiqueta="Código" error={errorCodigo} className="mt-4">
                <input
                  ref={campoCodigo}
                  className={`${claseEntrada} text-center text-xl tracking-[0.5em] tabular-nums`}
                  value={codigo}
                  onChange={(e) => {
                    setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))
                    setErrorCodigo(null)
                  }}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  aria-describedby="codigo-demo"
                />
              </Campo>
              <Boton type="submit" className="mt-4 w-full" disabled={codigo.length !== 6}>
                Ingresar
              </Boton>
              <button
                type="button"
                onClick={() => {
                  setPendiente({ ...pendiente, codigo: nuevoCodigo() })
                  setCodigo('')
                  setErrorCodigo(null)
                }}
                className="mt-3 w-full rounded py-2 text-sm font-medium text-verde-700 hover:underline"
              >
                No me llegó: enviar otro código
              </button>
              {pendiente.demo && (
                <p className="mt-3 rounded-lg bg-verde-50 px-3 py-2 text-sm text-verde-800">
                  Maqueta: su RUT no está en la nómina de prueba. Ingresará como <strong>afiliado/a activo/a de la Región Metropolitana</strong>, con datos ficticios.
                </p>
              )}
              <p id="codigo-demo" className="mt-3 rounded-lg border border-dashed border-alerta-700/40 bg-alerta-50 px-3 py-2 text-center text-sm text-alerta-700">
                Maqueta: el correo no se envía. Su código es <strong className="tabular-nums tracking-widest">{pendiente.codigo}</strong>
              </p>
            </form>
          )}
        </div>

        <p className="mt-4 text-[13px] leading-snug text-tinta-500">
          Sus datos se usan solo para gestionar el beneficio de alojamiento, conforme a las Leyes 19.628 y 21.719 (Art. 25 del reglamento).
        </p>

        <section className="mt-8 rounded-xl border border-dashed border-borde p-4" aria-labelledby="demo-titulo">
          <h2 id="demo-titulo" className="text-[13px] font-semibold uppercase tracking-wide text-tinta-500">
            Maqueta · probar como
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {ACCESOS_DEMO.map((a) => (
              <button
                key={a.etiqueta}
                type="button"
                onClick={() => accesoDemo(a)}
                className="rounded-full bg-white px-3 py-1.5 text-sm text-tinta-700 ring-1 ring-borde hover:bg-verde-50 hover:text-verde-800"
              >
                {a.etiqueta}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[13px] text-tinta-500">Completa el formulario con una persona ficticia; luego presione «Continuar».</p>
        </section>
      </main>
    </div>
  )
}

function Opcion({ activa, onClick, icono: Icono, titulo, detalle }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={activa}
      onClick={onClick}
      className={`flex w-full items-start gap-3 rounded-xl p-3.5 text-left ring-inset transition-colors ${activa ? 'bg-verde-50 ring-2 ring-verde-600' : 'bg-white ring-1 ring-borde hover:bg-stone-50'}`}
    >
      <Icono className={`mt-0.5 size-5 shrink-0 ${activa ? 'text-verde-700' : 'text-tinta-400'}`} aria-hidden />
      <span>
        <span className="block font-semibold text-tinta-900">{titulo}</span>
        <span className="block text-sm text-tinta-500">{detalle}</span>
      </span>
    </button>
  )
}
