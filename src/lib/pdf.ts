import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency, formatDate, formatTime } from "./utils";

export async function generateCashClosingPDF(session: any, compiledBarbersBreakdown: any[]) {
  const doc = new jsPDF();
  const dateStr = formatDate(new Date().toISOString());
  const timeStr = formatTime(new Date().toISOString());

  // Header
  doc.setFontSize(18);
  doc.setTextColor(0, 0, 0);
  doc.text("Arqueo y Cierre de Caja", 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Fecha de Cierre: ${dateStr} a las ${timeStr}`, 14, 28);
  doc.text(`ID de Sesión: ${session.id}`, 14, 33);

  // General Summary
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text("Resumen General", 14, 45);

  const summaryData = [
    ["Base de Apertura", formatCurrency(session.opening_balance || 0)],
    ["Total Citas (Efectivo)", formatCurrency(session.appointments_cash_total || 0)],
    ["Total Ventas de Productos", formatCurrency(session.sales_total || 0)],
    ["Gastos Registrados", `-${formatCurrency(session.expenses_total || 0)}`],
    ["Total Efectivo Esperado", formatCurrency(session.expected_cash || 0)],
    ["Total Digital Recaudado", formatCurrency(session.expected_digital || 0)],
    ["Total General de Caja", formatCurrency(session.expected_balance || 0)]
  ];

  autoTable(doc, {
    startY: 50,
    head: [["Concepto", "Monto"]],
    body: summaryData,
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'right' } }
  });

  // Barbers Breakdown
  let currentY = (doc as any).lastAutoTable.finalY + 15;
  
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text("Detalle por Barbero", 14, currentY);
  
  currentY += 5;

  compiledBarbersBreakdown.forEach(b => {
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(12);
    doc.setTextColor(41, 128, 185);
    doc.text(b.name, 14, currentY + 5);

    const detailData = [
      ["Servicios Realizados", b.appointments_count.toString()],
      ["Recaudo Total (Efectivo + Digital)", formatCurrency((b.total_cash || 0) + (b.total_digital || 0))],
      ["Comisión del Barbero", formatCurrency(b.total_commission || 0)],
      ["Utilidad de la Barbería", formatCurrency(b.total_shop_profit || 0)],
      ["Efectivo Físico de Citas", formatCurrency(b.total_cash || 0)],
      ["Digital Recaudado", formatCurrency(b.total_digital || 0)]
    ];

    if (b.total_advances > 0) detailData.push(["Vales de Caja Hoy", `-${formatCurrency(b.total_advances)}`]);
    if (b.total_payments > 0) detailData.push(["Abonos / Pagos Hoy", `+${formatCurrency(b.total_payments)}`]);
    if (b.total_consignments > 0) detailData.push(["Fiados / Consignación Hoy", formatCurrency(b.total_consignments)]);
    
    detailData.push(
      ["Efectivo Neto Esperado", formatCurrency(b.expected_cash || 0)],
      ["Efectivo Físico Entregado", formatCurrency(b.actual_cash || 0)],
      ["Diferencia (Descuadre)", formatCurrency(b.discrepancy || 0)]
    );

    autoTable(doc, {
      startY: currentY + 8,
      body: detailData,
      theme: 'grid',
      columnStyles: { 
        0: { fontStyle: 'bold', cellWidth: 110 }, 
        1: { halign: 'right' } 
      },
      didParseCell: function(data) {
        if (data.section === 'body' && data.row.index === detailData.length - 1 && data.column.index === 1) {
          const val = b.discrepancy;
          if (val < 0) {
            data.cell.styles.textColor = [231, 76, 60]; // Red
          } else if (val > 0) {
            data.cell.styles.textColor = [220, 160, 0]; // Yellow-orange for visibility
          } else {
            data.cell.styles.textColor = [46, 204, 113]; // Green
          }
        }
        if (data.section === 'body' && (data.row.index === detailData.length - 2 || data.row.index === detailData.length - 3) && data.column.index === 1) {
           data.cell.styles.fontStyle = 'bold';
        }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;
  });

  currentY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150);
  doc.text("Documento generado automáticamente por BarberOS", 14, currentY);

  // Return the PDF as a Blob
  return doc.output("blob");
}
