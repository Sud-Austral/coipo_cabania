/* Cobros. Dos pestañas:
   · Nómina mensual: 1 elija el mes → 2 enviar a Remuneraciones → 3 confirmar descontado;
     cuota puntual «Descontada / No se descontó»; transferencias por confirmar.
   · Por reserva: solo lectura (getCobros). */
import { useState } from 'react'
import { confirmarPagoTransferencia, getPagosTransferenciaPendientes } from '../../logica/api/reservas.js'
import { getNominas, marcarCuota, marcarNomina } from '../../logica/api/gestion.js'
import { getCobros } from '../../logica/api/administracion.js'
import { useAccion, useConsulta } from '../../nucleo/consulta.js'
import { useSesion } from '../../nucleo/sesion.js'
import { fecha, pesos, plural } from '../../nucleo/textos.js'
import { Modulo } from '../../diseno/index.js'
import { Cargando, Chip, Falla, Titulo, Vacio } from '../../piezas/basicas.jsx'
import { periodoActual } from './InicioCentral.jsx'

const ESTADO_CUOTA = { pendiente: ['aviso', 'Pendiente'], informado: ['info', 'Enviado'], descontado: ['correcto', 'Descontado'] }
const SITUACION = { en_planilla: ['info', 'Descuento por sueldo'], transferencia_por_confirmar: ['aviso', 'Transferencia por confirmar'], pagado: ['correcto', 'Pagado'], por_pagar: ['aviso', 'Por pagar'] }

function descargarCSV(nomina, cuotas) {
  const filas = [['RUT', 'Nombre', 'Reserva', 'Concepto', 'Casa', 'Cuota', 'Monto', 'Estado'],
    ...cuotas.map((i) => [i.rut, i.nombre, i.reserva_codigo, i.concepto, i.inmueble, `${i.cuota ?? 1}/${i.total_cuotas ?? 1}`, i.monto, ESTADO_CUOTA[i.estado]?.[1] ?? i.estado])]
  const texto = filas.map((f) => f.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([`﻿${texto}`], { type: 'text/csv;charset=utf-8' }))
  a.download = `nomina-${nomina.periodo}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

function Paso({ n, titulo, hecho, children }) {
  return (
    <li className="cb-paso-nomina" data-hecho={hecho || undefined}>
      <p className="cb-paso-n">{hecho ? '✓' : n}</p>
      <h3>{titulo}</h3>
      {children}
    </li>
  )
}

function Nomina() {
  const { actor } = useSesion()
  const { datos } = useConsulta(async () => {
    const [n, t] = await Promise.all([getNominas(), getPagosTransferenciaPendientes()])
    return { nominas: n.items, transf: t.items }
  }, [])
  const [elegido, setElegido] = useState(null)
  const [correr, { ocupado, error }] = useAccion()
  if (!datos) return <Cargando />
  const { nominas, transf } = datos
  const periodo = elegido ?? (nominas.some((n) => n.periodo === periodoActual()) ? periodoActual() : nominas[0]?.periodo)
  const nomina = nominas.find((n) => n.periodo === periodo)
  const cuotas = nomina?.items ?? []
  const enviables = cuotas.filter((i) => !i.retenido_por_transferencia)
  const de = (e) => enviables.filter((i) => i.estado === e)
  const suma = (xs) => xs.reduce((s, i) => s + i.monto, 0)
  const pend = de('pendiente'), env = de('informado'), desc = de('descontado')

  return (
    <>
      <ol className="cb-pasos-nomina">
        <Paso n={1} titulo="Elija el mes" hecho={Boolean(nomina)}>
          <select className="cb-select" value={periodo ?? ''} onChange={(e) => setElegido(e.target.value)} aria-label="Mes">
            {nominas.map((n) => <option key={n.periodo} value={n.periodo}>{n.etiqueta}</option>)}
          </select>
          <p className="cb-tenue">{plural(enviables.length, 'cuota', 'cuotas')} · {pesos(suma(enviables))}</p>
        </Paso>
        <Paso n={2} titulo="Enviar a Remuneraciones" hecho={nomina && !pend.length}>
          <p className="cb-paso-cifra">{pesos(suma(pend))}</p>
          <p className="cb-tenue">{plural(pend.length, 'cuota por enviar', 'cuotas por enviar')}</p>
          <div className="cb-acciones">
            <button type="button" className="cb-btn cb-btn-sec" disabled={!enviables.length} onClick={() => descargarCSV(nomina, enviables)}>Descargar</button>
            <button type="button" className="b-boton cb-boton-chico" disabled={!pend.length} aria-busy={ocupado || undefined} onClick={ocupado ? undefined : () => correr(() => marcarNomina(periodo, 'informado', actor))}>Marcar enviado</button>
          </div>
        </Paso>
        <Paso n={3} titulo="Confirmar descontado" hecho={nomina && !pend.length && !env.length && desc.length > 0}>
          <p className="cb-paso-cifra">{pesos(suma(env))}</p>
          <p className="cb-tenue">{plural(env.length, 'cuota enviada', 'cuotas enviadas')}</p>
          <div className="cb-acciones">
            <button type="button" className="b-boton cb-boton-chico" disabled={!env.length} aria-busy={ocupado || undefined} onClick={ocupado ? undefined : () => correr(() => marcarNomina(periodo, 'descontado', actor))}>Todo descontado</button>
          </div>
        </Paso>
      </ol>
      <Falla>{error}</Falla>

      <h2 className="cb-h2">Cuotas de {nomina?.etiqueta ?? '—'}</h2>
      {cuotas.length ? (
        <ul className="b-cola cb-cola">
          {cuotas.map((i) => {
            const [tono, txt] = i.retenido_por_transferencia ? ['aviso', 'Retenida: transferencia'] : ESTADO_CUOTA[i.estado] ?? ['info', i.estado]
            return (
              <li key={`${i.reserva_codigo}-${i.cuota ?? 1}`} data-codigo={i.reserva_codigo}>
                <span className="b-cola-nombre"><b>{i.nombre}</b><span>{i.rut} · {i.inmueble} · {i.concepto} · cuota {i.cuota ?? 1}/{i.total_cuotas ?? 1} · {i.reserva_codigo}</span></span>
                <Chip tono={tono}>{txt}</Chip>
                <span className="b-cola-meta">
                  <b className="cb-monto">{pesos(i.monto)}</b>
                  {i.estado === 'informado' && !i.retenido_por_transferencia && (
                    <>
                      <button type="button" className="cb-btn cb-btn-sec" onClick={() => correr(() => marcarCuota(periodo, i.reserva_codigo, i.cuota ?? 1, 'descontado', actor))}>Descontada</button>
                      <button type="button" className="cb-btn cb-btn-sec cb-btn-rojo" onClick={() => correr(() => marcarCuota(periodo, i.reserva_codigo, i.cuota ?? 1, 'no_descontado', actor))}>No se descontó</button>
                    </>
                  )}
                </span>
              </li>
            )
          })}
        </ul>
      ) : <Vacio>Sin cuotas este mes.</Vacio>}

      <Modulo className="cb-transf">
        <p className="b-rotulo">{transf.length ? <span className="b-pulso" aria-hidden="true" /> : null}Transferencias por confirmar</p>
        {transf.length ? (
          <ul className="cb-mini">
            {transf.map((r) => (
              <li key={r.codigo} data-codigo={r.codigo}>
                <span><b>{r.titular_nombre} · {pesos(r.pago_transferencia.monto)}</b><small>{r.codigo} · {r.inmueble?.nombre} · {fecha(r.pago_transferencia.informado_en)}</small></span>
                <button type="button" className="b-boton cb-boton-chico" onClick={() => correr(() => confirmarPagoTransferencia(r.codigo, actor))}>Confirmar</button>
              </li>
            ))}
          </ul>
        ) : <p className="b-texto">Ninguna pendiente.</p>}
      </Modulo>
    </>
  )
}

function PorReserva() {
  const { datos } = useConsulta(getCobros, [])
  if (!datos) return <Cargando />
  return datos.items.length ? (
    <ul className="b-cola cb-cola">
      {datos.items.map((c) => {
        const [tono, txt] = SITUACION[c.situacion] ?? ['info', c.situacion]
        return (
          <li key={c.reserva_codigo} data-codigo={c.reserva_codigo}>
            <span className="b-cola-nombre"><b>{c.titular_nombre}</b><span>{c.reserva_codigo} · {c.inmueble} · {c.concepto}{c.cuotas.length > 1 ? ` · ${c.cuotas.length} cuotas` : ''}</span></span>
            <Chip tono={tono}>{txt}</Chip>
            <span className="b-cola-meta"><span>{pesos(c.monto)}</span>{c.saldo > 0 && <span>Saldo {pesos(c.saldo)}</span>}</span>
          </li>
        )
      })}
    </ul>
  ) : <Vacio>Sin cobros.</Vacio>
}

export default function Cobros() {
  const [pestana, setPestana] = useState('nomina')
  return (
    <div className="cb-pagina">
      <Titulo pre="Oficina Central">Cobros</Titulo>
      <div className="cb-segmento cb-pestanas" role="tablist" aria-label="Vista de cobros">
        <button type="button" role="tab" aria-selected={pestana === 'nomina'} onClick={() => setPestana('nomina')}>Nómina mensual</button>
        <button type="button" role="tab" aria-selected={pestana === 'reserva'} onClick={() => setPestana('reserva')}>Por reserva</button>
      </div>
      <div role="tabpanel">{pestana === 'nomina' ? <Nomina /> : <PorReserva />}</div>
    </div>
  )
}
