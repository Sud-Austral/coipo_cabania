/* Hoja de gestión de la encargada: confirmar, rechazar, responder consulta, registrar llegada o salida.
   Todas las reglas (transiciones, cupo al confirmar, cobro al registrar salida) están en la lógica. */
import { useState } from 'react'
import { cambiarEstado, registrarEstadia, responderConsultaReserva } from '../../logica/api/reservas.js'
import { MOTIVOS } from '../../logica/fixtures/tarifas.js'
import { useAccion } from '../../nucleo/consulta.js'
import { useSesion } from '../../nucleo/sesion.js'
import { pesos, plural, rangoCorto } from '../../nucleo/textos.js'
import Hoja from '../../piezas/Hoja.jsx'
import { Campo, Falla } from '../../piezas/basicas.jsx'

const TEXTO = {
  confirmar: { titulo: 'Confirmar reserva', boton: 'Sí, confirmar', campo: 'Nota (opcional)', obligatorio: false },
  rechazar: { titulo: 'Rechazar solicitud', boton: 'Rechazar', campo: 'Motivo (lo verá el afiliado)', obligatorio: true, peligro: true },
  responder: { titulo: 'Responder consulta', boton: 'Enviar respuesta', campo: 'Respuesta', obligatorio: true },
  llegada: { titulo: 'Registrar llegada', boton: 'Registrar llegada', campo: 'Nota (opcional)', obligatorio: false },
  salida: { titulo: 'Registrar salida', boton: 'Registrar salida', campo: 'Nota (opcional)', obligatorio: false },
}

export default function Gestion({ accion, r, alCerrar }) {
  const { actor } = useSesion()
  const t = TEXTO[accion]
  const [texto, setTexto] = useState('')
  const [d, setD] = useState({ llaves: true, ocupantes_verificados: true, estado_inmueble: 'bueno', aseo: 'conforme', hay_incidencia: false, tipo_incidencia: 'danos', recomendacion_bloqueo: false, evidencia: null })
  const [correr, { ocupado, error }] = useAccion()
  const cambiar = (k) => (e) => setD((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const falta = (t.obligatorio || (accion === 'salida' && d.hay_incidencia)) && !texto.trim()

  const ejecutar = async () => {
    const nota = texto.trim() || undefined
    const x = await correr(() => {
      if (accion === 'confirmar') return cambiarEstado(r.codigo, 'confirmada', { fundamento: nota, actor })
      if (accion === 'rechazar') return cambiarEstado(r.codigo, 'rechazada', { fundamento: nota, actor })
      if (accion === 'responder') return responderConsultaReserva(r.codigo, { respuesta: texto, actor })
      return registrarEstadia(r.codigo, accion === 'llegada' ? 'check_in' : 'check_out', { observaciones: nota, detalles: d, actor })
    })
    if (x.ok) alCerrar()
  }

  return (
    <Hoja abierta titulo={t.titulo} sub={`${r.codigo} · ${r.inmueble?.nombre}`} alCerrar={alCerrar}
      pie={<><button type="button" className="cb-btn cb-btn-sec" onClick={alCerrar}>Volver</button>
        <button type="button" className={t.peligro ? 'cb-btn cb-btn-peligro' : 'b-boton'} disabled={falta} aria-busy={ocupado || undefined} onClick={ocupado ? undefined : ejecutar}>{t.boton}</button></>}>
      <dl className="cb-resumen">
        <div><dt>Titular</dt><dd>{r.titular_nombre}</dd></div>
        <div><dt>Fechas</dt><dd>{rangoCorto(r.fecha_entrada, r.fecha_salida)}</dd></div>
        <div><dt>Motivo</dt><dd>{MOTIVOS.find((m) => m.valor === r.motivo)?.corto}</dd></div>
        <div><dt>Valor</dt><dd>{pesos(r.monto_total)} · {plural(r.ocupantes?.length ?? 1, 'persona', 'personas')}</dd></div>
      </dl>
      {accion === 'responder' && <p className="cb-consulta">«{r.observaciones}»</p>}

      {(accion === 'llegada' || accion === 'salida') && (
        <div className="cb-estadia">
          <label className="cb-casilla"><input type="checkbox" checked={d.llaves} onChange={cambiar('llaves')} />{accion === 'llegada' ? 'Llaves entregadas' : 'Llaves devueltas'}</label>
          {accion === 'llegada' && <label className="cb-casilla"><input type="checkbox" checked={d.ocupantes_verificados} onChange={cambiar('ocupantes_verificados')} />Personas verificadas</label>}
          <Campo etiqueta="Estado de la casa" como="select" value={d.estado_inmueble} onChange={cambiar('estado_inmueble')}>
            <option value="bueno">Bueno</option><option value="con_observaciones">Con observaciones</option><option value="dano">Con daños</option>
          </Campo>
          {accion === 'salida' && (
            <>
              <Campo etiqueta="Aseo" como="select" value={d.aseo} onChange={cambiar('aseo')}>
                <option value="conforme">Conforme</option><option value="requiere_limpieza">Falta limpieza</option>
              </Campo>
              <label className="cb-casilla cb-casilla-alerta"><input type="checkbox" checked={d.hay_incidencia} onChange={cambiar('hay_incidencia')} />Hubo un problema</label>
              {d.hay_incidencia && (
                <div className="cb-incidencia">
                  <Campo etiqueta="Tipo" como="select" value={d.tipo_incidencia} onChange={cambiar('tipo_incidencia')}>
                    <option value="danos">Daños</option><option value="no_show">No llegó</option><option value="conducta">No respetó las normas</option>
                  </Campo>
                  <Campo etiqueta="Foto o documento (opcional)" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => { const f = e.target.files?.[0]; setD((x) => ({ ...x, evidencia: f ? { nombre: f.name, tipo: f.type } : null })) }} />
                  <label className="cb-casilla"><input type="checkbox" checked={d.recomendacion_bloqueo} onChange={cambiar('recomendacion_bloqueo')} />Pedir bloqueo a Oficina Central</label>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <Campo etiqueta={accion === 'salida' && d.hay_incidencia ? '¿Qué pasó?' : t.campo} como="textarea" rows={accion === 'responder' ? 3 : 2} value={texto} onChange={(e) => setTexto(e.target.value)} required={!falta ? undefined : true} />
      <Falla>{error}</Falla>
    </Hoja>
  )
}
