import { Plus, Trash2, UserRound, Users } from 'lucide-react'
import { PARENTESCOS } from '../../fixtures/tarifas.js'
import { categoriaOcupante } from '../../lib/tarifas.js'
import { formatearRut } from '../../lib/rut.js'
import { Badge } from '../ui/Badge.jsx'
import { Aviso, Boton, Campo, clasesInput } from '../ui/Elementos.jsx'

/**
 * Registro de ocupantes (solicitud §5.1 req. 7 y 8).
 *
 * El titular viene precargado del perfil. El grupo familiar inscrito en
 * Bienestar se marca con casillas, y los demás acompañantes se ingresan a mano
 * con nombre, RUT y parentesco, porque su categoría determina la tarifa.
 */
export function OcupantesForm({
  usuario,
  titularEsAfiliado,
  seleccionFamiliares,
  onCambiarFamiliares,
  acompanantes,
  onCambiarAcompanantes,
  capacidadMaxima,
  totalOcupantes,
}) {
  const excede = totalOcupantes > capacidadMaxima
  const grupoFamiliar = usuario?.grupo_familiar ?? []

  const alternarFamiliar = (rut) => {
    onCambiarFamiliares(
      seleccionFamiliares.includes(rut)
        ? seleccionFamiliares.filter((r) => r !== rut)
        : [...seleccionFamiliares, rut],
    )
  }

  const agregar = () =>
    onCambiarAcompanantes([
      ...acompanantes,
      { nombre: '', rut: '', parentesco: 'acompanante' },
    ])

  const editar = (indice, campo, valor) =>
    onCambiarAcompanantes(
      acompanantes.map((a, i) => (i === indice ? { ...a, [campo]: valor } : a)),
    )

  const quitar = (indice) =>
    onCambiarAcompanantes(acompanantes.filter((_, i) => i !== indice))

  return (
    <div className="space-y-5">
      {/* Titular */}
      <div>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
          <UserRound size={15} className="text-verde-600" aria-hidden="true" />
          Titular de la reserva
        </h3>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-arena-200 bg-arena-50 px-3.5 py-3">
          <span>
            <span className="block text-sm font-medium text-slate-800">{usuario?.nombre}</span>
            <span className="tabular block text-xs text-slate-500">{usuario?.rut}</span>
          </span>
          <Badge tono={titularEsAfiliado ? 'verde' : 'ambar'}>
            {titularEsAfiliado ? 'Tarifa afiliado' : 'Tarifa usuario externo'}
          </Badge>
        </div>
        {titularEsAfiliado ? (
          <p className="mt-1.5 text-xs text-slate-500">
            Validado contra el registro de afiliados vigentes del Servicio de Bienestar.
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-slate-500">
            Usuario no afiliado: todos los ocupantes pagan tarifa de usuario externo.
          </p>
        )}
      </div>

      {/* Grupo familiar inscrito */}
      {titularEsAfiliado && grupoFamiliar.length > 0 && (
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Users size={15} className="text-verde-600" aria-hidden="true" />
            Grupo familiar inscrito en Bienestar
          </h3>
          <ul className="space-y-2">
            {grupoFamiliar.map((f) => {
              const etiqueta = PARENTESCOS.find((p) => p.valor === f.parentesco)?.etiqueta
              return (
                <li key={f.rut}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-arena-200 px-3.5 py-2.5 hover:bg-arena-50">
                    <input
                      type="checkbox"
                      checked={seleccionFamiliares.includes(f.rut)}
                      onChange={() => alternarFamiliar(f.rut)}
                      className="h-4 w-4 accent-verde-600"
                    />
                    <span className="flex-1">
                      <span className="block text-sm text-slate-800">{f.nombre}</span>
                      <span className="tabular block text-xs text-slate-500">
                        {f.rut} · {etiqueta}
                      </span>
                    </span>
                    <Badge tono="verde">Tarifa afiliado</Badge>
                  </label>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Otros acompañantes */}
      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-800">Otros acompañantes</h3>
          <Boton variante="secundario" onClick={agregar} disabled={totalOcupantes >= capacidadMaxima}>
            <Plus size={15} aria-hidden="true" />
            Agregar acompañante
          </Boton>
        </div>
        <p className="mb-2.5 text-xs text-slate-500">
          Familiares no beneficiarios u otras personas. Se registran con nombre, RUT y
          parentesco porque su categoría determina la tarifa aplicable.
        </p>

        {acompanantes.length === 0 ? (
          <p className="rounded-lg border border-dashed border-arena-200 px-3.5 py-3 text-sm text-slate-500">
            No se han registrado otros acompañantes.
          </p>
        ) : (
          <ul className="space-y-3">
            {acompanantes.map((a, i) => {
              const categoria = categoriaOcupante(a.parentesco, titularEsAfiliado)
              return (
                <li
                  key={i}
                  className="rounded-lg border border-arena-200 bg-white p-3.5"
                >
                  <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr_1.2fr_auto]">
                    <Campo etiqueta="Nombre completo" requerido>
                      <input
                        type="text"
                        value={a.nombre}
                        onChange={(e) => editar(i, 'nombre', e.target.value)}
                        placeholder="Nombre y apellidos"
                        className={clasesInput}
                      />
                    </Campo>
                    <Campo etiqueta="RUT" requerido>
                      <input
                        type="text"
                        value={a.rut}
                        onChange={(e) => editar(i, 'rut', formatearRut(e.target.value))}
                        placeholder="12.345.678-9"
                        className={`${clasesInput} tabular`}
                      />
                    </Campo>
                    <Campo etiqueta="Parentesco" requerido>
                      <select
                        value={a.parentesco}
                        onChange={(e) => editar(i, 'parentesco', e.target.value)}
                        className={clasesInput}
                      >
                        {PARENTESCOS.filter((p) => p.valor !== 'titular').map((p) => (
                          <option key={p.valor} value={p.valor}>
                            {p.etiqueta}
                          </option>
                        ))}
                      </select>
                    </Campo>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => quitar(i)}
                        aria-label={`Quitar acompañante ${i + 1}`}
                        className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg border border-arena-200 px-3 text-sm text-rose-700 hover:bg-rose-50"
                      >
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  <p className="mt-1.5 text-xs">
                    <Badge tono={categoria === 'afiliado' ? 'verde' : 'ambar'}>
                      {categoria === 'afiliado' ? 'Tarifa afiliado' : 'Tarifa usuario externo'}
                    </Badge>
                  </p>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Validación de capacidad */}
      <div
        className={`flex items-center justify-between gap-3 rounded-lg border px-3.5 py-3 ${
          excede ? 'border-rose-300 bg-rose-50' : 'border-arena-200 bg-arena-50'
        }`}
      >
        <span className="text-sm text-slate-700">Total de ocupantes registrados</span>
        <span
          className={`tabular text-sm font-semibold ${excede ? 'text-rose-700' : 'text-verde-800'}`}
        >
          {totalOcupantes} de {capacidadMaxima} personas
        </span>
      </div>

      {excede && (
        <Aviso tono="rojo" titulo="Se excede la capacidad máxima del inmueble">
          El inmueble admite hasta {capacidadMaxima} personas. Quite acompañantes o elija otro
          inmueble de mayor capacidad para continuar.
        </Aviso>
      )}
    </div>
  )
}
