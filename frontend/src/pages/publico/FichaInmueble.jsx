import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  BedDouble,
  CalendarDays,
  CheckCircle2,
  Info,
  MapPin,
  Users,
} from 'lucide-react'
import { getInmueble } from '../../api/inmuebles.js'
import { etiquetaTipo, nombreRegion } from '../../fixtures/inmuebles.js'
import { tarifas } from '../../fixtures/tarifas.js'
import { pesos } from '../../lib/formato.js'
import { useRol } from '../../context/RolContext.jsx'
import { GaleriaFotos } from '../../components/inmuebles/GaleriaFotos.jsx'
import { MapaInmueble } from '../../components/inmuebles/MapaInmueble.jsx'
import { ZonasInteres } from '../../components/inmuebles/ZonasInteres.jsx'
import { CalendarioDisponibilidad } from '../../components/inmuebles/CalendarioDisponibilidad.jsx'
import { Badge } from '../../components/ui/Badge.jsx'
import { Aviso, Boton, Cargando, Tarjeta } from '../../components/ui/Elementos.jsx'

function TarifasReferencia({ inmueble, esExterno }) {
  const filas =
    inmueble.tipo === 'veraneo'
      ? [
          {
            concepto: 'Tarifa fija por noche (temporada baja)',
            valor: tarifas.veraneo.fija.baja,
            nota: 'Cubre al titular y su grupo familiar directo',
          },
          {
            concepto: 'Tarifa fija por noche (temporada alta)',
            valor: tarifas.veraneo.fija.alta,
            nota: 'Verano, vacaciones de invierno y fines de semana largos',
          },
          {
            concepto: 'Adicional por acompañante no beneficiario',
            valor: tarifas.veraneo.adicional_externo.baja,
            nota: 'Por persona y por noche',
          },
        ]
      : [
          {
            concepto: 'Afiliado y cargas inscritas, por persona/noche',
            valor: tarifas.huespedes.afiliado.baja,
            nota: `Temporada alta: ${pesos(tarifas.huespedes.afiliado.alta)}`,
          },
          {
            concepto: 'Motivo médico (afiliado y cargas)',
            valor: tarifas.huespedes.afiliado_medica.baja,
            nota: 'Tarifa preferente por persona/noche',
          },
          {
            concepto: 'Usuario externo, por persona/noche',
            valor: tarifas.huespedes.externo.baja,
            nota: `Temporada alta: ${pesos(tarifas.huespedes.externo.alta)}`,
          },
        ]

  return (
    <div>
      <ul className="divide-y divide-arena-200">
        {filas.map((f) => (
          <li key={f.concepto} className="flex items-start justify-between gap-4 py-2.5">
            <span>
              <span className="block text-sm text-slate-800">{f.concepto}</span>
              <span className="block text-xs text-slate-500">{f.nota}</span>
            </span>
            <span className="tabular text-sm font-semibold whitespace-nowrap text-verde-800">
              {pesos(f.valor)}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 rounded-lg bg-arena-50 px-3 py-2 text-xs text-slate-600">
        Valores de referencia para la maqueta, pendientes de validación con el Servicio de
        Bienestar. Vigencia anual del 1 de enero al 31 de diciembre.
        {esExterno && ' Como usuario no afiliado, se le aplica la tarifa de usuario externo.'}
      </p>
    </div>
  )
}

export function FichaInmueble() {
  const { id } = useParams()
  const navegar = useNavigate()
  const { esNoAfiliado, esPortal } = useRol()
  const [inmueble, setInmueble] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let vigente = true
    setCargando(true)
    getInmueble(id)
      .then((r) => vigente && setInmueble(r))
      .catch(() => vigente && setInmueble(null))
      .finally(() => vigente && setCargando(false))
    return () => {
      vigente = false
    }
  }, [id])

  if (cargando) return <Cargando texto="Cargando la ficha del inmueble…" />

  if (!inmueble) {
    return (
      <Aviso tono="rojo" titulo="Inmueble no encontrado">
        <Link to="/catalogo" className="underline">
          Volver al catálogo
        </Link>
      </Aviso>
    )
  }

  return (
    <>
      <Link
        to="/catalogo"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-verde-700 hover:underline"
      >
        <ArrowLeft size={15} aria-hidden="true" />
        Volver al catálogo
      </Link>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tono={inmueble.tipo === 'veraneo' ? 'verde' : 'azul'}>
              {etiquetaTipo(inmueble.tipo)}
            </Badge>
            {inmueble.vitrina && <Badge tono="arena">Ficha completa</Badge>}
          </div>
          <h1 className="mt-2 text-2xl font-semibold text-verde-900">{inmueble.nombre}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
            <MapPin size={15} className="text-slate-400" aria-hidden="true" />
            {inmueble.direccion} · {nombreRegion(inmueble.region)}
          </p>
        </div>

        {esPortal && (
          <Boton onClick={() => navegar(`/inmuebles/${inmueble.id}/reservar`)}>
            <CalendarDays size={16} aria-hidden="true" />
            Solicitar reserva
          </Boton>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <GaleriaFotos inmueble={inmueble} />

          <Tarjeta className="p-5">
            <h2 className="text-lg font-semibold text-verde-900">Descripción</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">{inmueble.descripcion}</p>

            <dl className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-arena-50 px-3 py-2.5">
                <dt className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Users size={13} aria-hidden="true" />
                  Capacidad máxima
                </dt>
                <dd className="tabular mt-0.5 text-sm font-semibold text-slate-800">
                  {inmueble.capacidad_maxima} personas
                </dd>
              </div>
              <div className="rounded-lg bg-arena-50 px-3 py-2.5">
                <dt className="flex items-center gap-1.5 text-xs text-slate-500">
                  <BedDouble size={13} aria-hidden="true" />
                  Dormitorios
                </dt>
                <dd className="tabular mt-0.5 text-sm font-semibold text-slate-800">
                  {inmueble.dormitorios}
                </dd>
              </div>
              <div className="rounded-lg bg-arena-50 px-3 py-2.5">
                <dt className="text-xs text-slate-500">Tipo de uso</dt>
                <dd className="mt-0.5 text-sm font-semibold text-slate-800">
                  {inmueble.tipo === 'veraneo' ? 'Exclusivo familiar' : 'Compartido'}
                </dd>
              </div>
            </dl>

            <h3 className="mt-5 text-sm font-semibold text-slate-800">Equipamiento</h3>
            <ul className="mt-2 flex flex-wrap gap-2">
              {inmueble.equipamiento.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-1.5 rounded-full border border-arena-200 bg-white px-2.5 py-1 text-xs text-slate-700"
                >
                  <CheckCircle2 size={12} className="text-verde-600" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>

            <h3 className="mt-5 text-sm font-semibold text-slate-800">Condiciones de uso</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
              <li>
                {inmueble.tipo === 'veraneo'
                  ? 'Uso exclusivo del funcionario o funcionaria y su grupo familiar directo.'
                  : 'Uso compartido: puede haber otros huéspedes en el inmueble durante su estadía.'}
              </li>
              <li>Se debe registrar a todos los ocupantes al momento de reservar.</li>
              <li>
                La anulación debe avisarse con al menos una semana de antelación para no
                generar cobro.
              </li>
              <li>Los daños o destrozos son de cargo del titular de la reserva.</li>
            </ul>
          </Tarjeta>

          <Tarjeta className="p-5">
            <h2 className="text-lg font-semibold text-verde-900">Ubicación y acceso</h2>
            <p className="mt-1 mb-3 text-sm text-slate-600">
              {inmueble.direccion}. El mapa usa componentes abiertos (Leaflet y
              OpenStreetMap).
            </p>
            <MapaInmueble inmueble={inmueble} />
          </Tarjeta>
        </div>

        <div className="min-w-0 space-y-6">
          <Tarjeta className="p-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-verde-900">
              <CalendarDays size={18} className="text-verde-600" aria-hidden="true" />
              Disponibilidad
            </h2>
            <p className="mt-1 mb-3 text-sm text-slate-600">
              Consulte en línea qué fechas están libres, sin necesidad de escribir a la
              encargada regional.
            </p>
            <CalendarioDisponibilidad inmuebleId={inmueble.id} meses={1} />
            {esPortal && (
              <Boton
                className="mt-4 w-full"
                onClick={() => navegar(`/inmuebles/${inmueble.id}/reservar`)}
              >
                Solicitar reserva
              </Boton>
            )}
          </Tarjeta>

          <Tarjeta className="p-5">
            <h2 className="text-lg font-semibold text-verde-900">Tarifas de referencia</h2>
            <div className="mt-3">
              <TarifasReferencia inmueble={inmueble} esExterno={esNoAfiliado} />
            </div>
          </Tarjeta>

          <Tarjeta className="p-5">
            <h2 className="text-lg font-semibold text-verde-900">Zonas de interés cercanas</h2>
            <p className="mt-1 mb-2 text-sm text-slate-600">
              Servicios y atractivos en torno al inmueble, con distancia aproximada.
            </p>
            <ZonasInteres zonas={inmueble.zonas_interes} />
          </Tarjeta>

          {!inmueble.vitrina && (
            <Aviso tono="info" icono={Info}>
              La información de este inmueble está incompleta en la maqueta. Las fichas con
              contenido completo se marcan como <strong>ficha completa</strong>.
            </Aviso>
          )}
        </div>
      </div>
    </>
  )
}
