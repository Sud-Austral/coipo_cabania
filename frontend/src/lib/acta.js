/**
 * Acta de entrega-recepción e inventario (Art. 2 f, Art. 13 y Anexo B).
 *
 * Se genera al confirmar la reserva y cada vez que la encargada actualiza el
 * inventario antes de la llegada. Se envía al correo del usuario y queda en
 * el historial de la reserva para que la encargada la descargue.
 *
 * Se carga bajo demanda (import dinámico) para no engrosar la carga inicial.
 */

import { CALIDADES, PARAMETROS, PARENTESCOS, noches } from './reglas.js'
import { fechaCorta, fechaLarga } from './fechas.js'
import { pesos } from './formato.js'
import { correoEncargada } from '../datos/usuarios.js'
import { guardarArchivo } from './guardar.js'

const VERDE = [24, 85, 48]
const GRIS = [107, 104, 98]
const ESTADO = { bueno: 'Bueno', regular: 'Regular', malo: 'Malo' }
const parentesco = (v) => (v === 'titular' ? 'Responsable' : (PARENTESCOS.find((p) => p.valor === v)?.etiqueta ?? v))

export async function descargarActa(reserva, acta) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const ancho = doc.internal.pageSize.getWidth()
  const M = 16
  let y = 18

  const titulo = (t) => {
    if (y > 260) {
      doc.addPage()
      y = 18
    }
    doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(...VERDE)
    doc.text(t, M, y)
    y += 2
    doc.setDrawColor(...VERDE).setLineWidth(0.3).line(M, y, ancho - M, y)
    y += 6
    doc.setTextColor(0)
  }
  const tabla = (opciones) => {
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 1.8, lineColor: [227, 224, 216], lineWidth: 0.2 },
      headStyles: { fillColor: [238, 246, 240], textColor: VERDE, fontStyle: 'bold' },
      ...opciones,
    })
    y = doc.lastAutoTable.finalY + 7
  }
  const lineas = (n, etiqueta) => {
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...GRIS)
    if (etiqueta) {
      doc.text(etiqueta, M, y)
      y += 5
    }
    doc.setDrawColor(190)
    for (let i = 0; i < n; i++) {
      doc.line(M, y, ancho - M, y)
      y += 7
    }
    doc.setTextColor(0)
  }

  // Encabezado
  doc.setFont('helvetica', 'bold').setFontSize(15).setTextColor(...VERDE)
  doc.text('Acta de entrega-recepción e inventario', M, y)
  y += 6
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...GRIS)
  doc.text('Servicio de Bienestar · Corporación Nacional Forestal · Casas de Veraneo o Descanso', M, y)
  doc.text(`N° ${acta.numero}`, ancho - M, y - 6, { align: 'right' })
  doc.text(`Emitida el ${fechaCorta(acta.generada_en.slice(0, 10), true)}`, ancho - M, y, { align: 'right' })
  y += 9
  doc.setTextColor(0)

  // 1. Identificación
  titulo('1. Identificación de la casa, fechas y personas')
  const t = reserva.titular
  tabla({
    theme: 'plain',
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 1.2 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 42, textColor: GRIS } },
    body: [
      ['Casa', `${reserva.casa.nombre} · ${reserva.casa.direccion}`],
      ['Reserva', `${reserva.codigo} · ${noches(reserva.entrada, reserva.salida)} noches · ${pesos(reserva.total)}`],
      ['Ingreso (check-in)', `${fechaLarga(reserva.entrada)}, desde las ${PARAMETROS.hora_ingreso}`],
      ['Salida (check-out)', `${fechaLarga(reserva.salida)}, hasta las ${PARAMETROS.hora_salida}`],
      ['Usuario/a responsable', `${t.nombre} · RUT ${t.rut}`],
      ['Calidad', `${CALIDADES[t.calidad]}${t.rol ? ' · ' + t.rol : ''}`],
      ['Contacto', [reserva.contacto?.telefono, reserva.contacto?.correo].filter(Boolean).join(' · ')],
      ['Perro de asistencia', reserva.perro_asistencia ? 'Sí (Ley 20.422)' : 'No'],
    ],
  })
  tabla({
    head: [['Personas registradas', 'Relación', 'Edad']],
    body: reserva.ocupantes.map((o) => [o.nombre, parentesco(o.parentesco), o.edad ?? '—']),
    columnStyles: { 2: { cellWidth: 18, halign: 'center' } },
  })

  // 2. Inventario
  titulo('2. Inventario de la casa')
  doc.setFont('helvetica', 'normal').setFontSize(8.5).setTextColor(...GRIS)
  doc.text(`Versión ${acta.inventario.version}, actualizada el ${fechaCorta(acta.inventario.actualizado_en.slice(0, 10), true)} por ${acta.inventario.actualizado_por}.`, M, y - 2)
  y += 2
  doc.setTextColor(0)
  tabla({
    head: [['Categoría', 'Elemento', 'Cant.', 'Estado', 'Observación']],
    body: acta.inventario.items.map((x) => [x.categoria, x.nombre, x.cantidad, ESTADO[x.estado], x.observacion || '']),
    columnStyles: { 0: { cellWidth: 28 }, 2: { cellWidth: 13, halign: 'center' }, 3: { cellWidth: 18 } },
    didParseCell: (d) => {
      if (d.section === 'body' && d.column.index === 3) {
        if (d.cell.raw === 'Malo') d.cell.styles.textColor = [163, 32, 32]
        if (d.cell.raw === 'Regular') d.cell.styles.textColor = [138, 90, 0]
      }
    },
  })

  // 3. Lecturas y seguridad
  titulo('3. Llaves, gas y seguridad')
  const s = acta.inventario.seguridad ?? {}
  tabla({
    theme: 'plain',
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 1.2 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 42, textColor: GRIS } },
    body: [
      ['Llaves entregadas', s.llaves || '—'],
      ['Controles', s.controles || '—'],
      ['Gas', s.gas || '—'],
      ['Extintor, vencimiento', s.extintor_vence ? fechaCorta(s.extintor_vence, true) : '—'],
      ['Indicaciones', s.observaciones || '—'],
    ],
  })

  // 4. Ingreso
  titulo('4. Ingreso: observaciones del usuario/a')
  doc.setFont('helvetica', 'normal').setFontSize(9)
  doc.text(
    doc.splitTextToSize(
      `Revise el inventario al ingresar. Tiene ${PARAMETROS.plazo_observaciones_horas} horas para informar cualquier daño o faltante preexistente por correo a la encargada regional (${correoEncargada(reserva.casa.region)}), adjuntando esta acta con la sección 4 completa; vencido ese plazo, la casa se entiende recibida conforme (Art. 13).`,
      ancho - 2 * M,
    ),
    M,
    y,
  )
  y += 11
  lineas(1, 'Fecha y hora de ingreso:')
  lineas(3, 'Daños o faltantes detectados:')

  // 5. Salida
  titulo('5. Salida: estado de restitución')
  doc.setFont('helvetica', 'normal').setFontSize(9)
  doc.text('Estado de aseo:     [  ] Bueno     [  ] Regular     [  ] Malo', M, y)
  y += 7
  lineas(3, 'Daños o faltantes detectados:')
  lineas(1, 'Valorización estimada ($):')
  doc.setFont('helvetica', 'normal').setFontSize(9)
  doc.text('Conformidad del usuario/a:     [  ] Conforme     [  ] Con reservas (detallar arriba)', M, y)
  y += 6
  doc.setFontSize(8).setTextColor(...GRIS)
  doc.text(`Al salir, envíe esta acta firmada por correo a ${correoEncargada(reserva.casa.region)}. Los daños o faltantes se cobran al valor de reposición (Art. 22).`, M, y)
  doc.setTextColor(0)
  y += 10

  // 6. Firmas
  if (y > 250) {
    doc.addPage()
    y = 30
  }
  titulo('6. Firmas o validación electrónica')
  y += 14
  const mitad = (ancho - 2 * M) / 2
  doc.setDrawColor(120)
  doc.line(M, y, M + mitad - 10, y)
  doc.line(M + mitad + 10, y, ancho - M, y)
  y += 5
  doc.setFontSize(9)
  doc.text(`Usuario/a responsable: ${t.nombre}`, M, y)
  doc.text('Encargada/o regional de Bienestar', M + mitad + 10, y)

  // Pie en todas las páginas
  const paginas = doc.getNumberOfPages()
  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i)
    doc.setFontSize(7.5).setTextColor(...GRIS)
    doc.text('Reglamento General de Uso de Casas de Veraneo o Descanso · Anexo B · Documento de maqueta con datos ficticios', M, 289)
    doc.text(`Página ${i} de ${paginas}`, ancho - M, 289, { align: 'right' })
  }

  await guardarArchivo(`${acta.numero}.pdf`, doc.output('blob'))
}
