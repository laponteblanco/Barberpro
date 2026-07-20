import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency, formatDate, formatTime } from "./utils";
import type { ActiveSessionDetails } from "@/services/cash.service";

// ─── Color palette ────────────────────────────────────────────────────────────
const COLORS = {
  black: [15, 15, 20] as [number, number, number],
  darkGray: [35, 35, 40] as [number, number, number],
  midGray: [90, 90, 100] as [number, number, number],
  lightGray: [200, 200, 210] as [number, number, number],
  offWhite: [245, 245, 248] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  emerald: [16, 185, 129] as [number, number, number],
  cyan: [6, 182, 212] as [number, number, number],
  rose: [244, 63, 94] as [number, number, number],
  amber: [245, 158, 11] as [number, number, number],
  primary: [99, 102, 241] as [number, number, number],
  primaryDark: [67, 56, 202] as [number, number, number],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function sanitizeText(str: string | null | undefined): string {
  if (!str) return "";
  
  // Replace minus sign unicode character with standard hyphen
  let cleaned = str.replace(/\u2212/g, "-");
  
  // Replace em-dash or en-dash with standard hyphen
  cleaned = cleaned.replace(/[\u2013\u2014]/g, "-");
  
  // Strip emojis and pictographs using Unicode Property Escapes if supported
  try {
    cleaned = cleaned.replace(/\p{Extended_Pictographic}/gu, "");
  } catch (e) {
    // Fallback if environment doesn't support Extended_Pictographic property escape
    cleaned = cleaned.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2B50}]/gu, "");
  }

  // Remove any character that is not in the basic printable ASCII or Spanish / Latin-1 range (U+0020 to U+00FF)
  cleaned = cleaned.split("").filter(char => {
    const code = char.charCodeAt(0);
    return (code >= 32 && code <= 255) || code === 10 || code === 13;
  }).join("");

  return cleaned.trim().replace(/\s+/g, " ");
}

function drawSectionHeader(
  doc: jsPDF,
  title: string,
  subtitle: string,
  y: number,
  accentColor: [number, number, number]
): number {
  // Accent bar
  doc.setFillColor(...accentColor);
  doc.roundedRect(14, y, 3, 10, 1.5, 1.5, "F");

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.black);
  doc.text(title, 20, y + 7);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.midGray);
  doc.text(subtitle, 20, y + 13);

  return y + 20;
}

function drawKpiCard(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  label: string,
  value: string,
  accentColor: [number, number, number]
): void {
  // Card background
  doc.setFillColor(...COLORS.offWhite);
  doc.roundedRect(x, y, width, 22, 3, 3, "F");

  // Top accent border
  doc.setFillColor(...accentColor);
  doc.roundedRect(x, y, width, 2, 1, 1, "F");

  // Label
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.midGray);
  doc.text(label.toUpperCase(), x + 5, y + 9);

  // Value
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.black);
  doc.text(value, x + 5, y + 18);
}

function addPageBreakIfNeeded(
  doc: jsPDF,
  currentY: number,
  neededSpace: number = 40
): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (currentY + neededSpace > pageHeight - 20) {
    doc.addPage();
    return 20;
  }
  return currentY;
}

function drawDivider(doc: jsPDF, y: number): number {
  doc.setDrawColor(...COLORS.lightGray);
  doc.setLineWidth(0.3);
  doc.line(14, y, 196, y);
  return y + 6;
}

// ─── Main PDF generator ───────────────────────────────────────────────────────

export async function generateCashClosingPDF(
  session: ActiveSessionDetails,
  compiledBarbersBreakdown: any[],
  tenantName = "BarberOS"
): Promise<Blob> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const dateStr = formatDate(new Date().toISOString());
  const timeStr = formatTime(new Date().toISOString());

  // ── COVER / HEADER ──────────────────────────────────────────────────────────
  // Dark header background
  doc.setFillColor(...COLORS.darkGray);
  doc.rect(0, 0, pageWidth, 52, "F");

  // Primary accent gradient bar
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 48, pageWidth, 4, "F");

  // Logo placeholder and title
  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(14, 12, 12, 12, 2, 2, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.white);
  doc.text("B", 18.5, 20.5);

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.white);
  doc.text("Arqueo y Cierre de Caja", 30, 20);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.lightGray);
  doc.text(`${sanitizeText(tenantName)}  ·  Generado el ${dateStr} a las ${timeStr}`, 30, 27);
  doc.text(`ID de Sesión: ${session.id}`, 30, 33);
  doc.text(`Apertura: ${formatDate(session.opened_at)} a las ${formatTime(session.opened_at)}`, 30, 39);

  let currentY = 62;

  // ── KPI CARDS ───────────────────────────────────────────────────────────────
  const cardW = 54;
  const gap = 7;
  const startX = 14;

  drawKpiCard(doc, startX, currentY, cardW, "Ingresos Totales",
    formatCurrency(session.appointments_total + session.sales_total), COLORS.primary);

  drawKpiCard(doc, startX + cardW + gap, currentY, cardW, "Efectivo Esperado en Caja",
    formatCurrency(session.expected_cash), COLORS.emerald);

  drawKpiCard(doc, startX + (cardW + gap) * 2, currentY, cardW, "Saldo Digital Esperado",
    formatCurrency(session.expected_digital), COLORS.cyan);

  currentY += 30;

  // ── SECCIÓN 1: RESUMEN GLOBAL DE SERVICIOS ──────────────────────────────────
  currentY = drawSectionHeader(
    doc,
    "1. Resumen Global de Servicios e Ingresos",
    "Consolidado de todas las transacciones del día.",
    currentY,
    COLORS.primary
  );

  const totalServices = compiledBarbersBreakdown.reduce(
    (sum, b) => sum + (b.appointments_total_count ?? (b.appointments_count || 0)),
    0
  );

  const totalBarberCommission = compiledBarbersBreakdown.reduce(
    (sum, b) => sum + (b.total_commission || 0),
    0
  );

  const totalExpenses = session.expenses_cash_total + session.expenses_digital_total;
  const barbershopProfit = (session.appointments_total - totalBarberCommission) + session.sales_total - totalExpenses;

  autoTable(doc, {
    startY: currentY,
    head: [["Concepto", "Cantidad / Monto"]],
    body: [
      ["Total de servicios realizados", `${totalServices} servicio(s)`],
      ["Ingresos por citas (bruto)", formatCurrency(session.appointments_total)],
      ["Ingresos por venta de productos", formatCurrency(session.sales_total)],
      ["TOTAL INGRESOS DEL DÍA", formatCurrency(session.appointments_total + session.sales_total)],
      ["Pago total a barberos (Comisiones)", `-${formatCurrency(totalBarberCommission)}`],
      ["SUBTOTAL (Ingresos - Comisiones)", formatCurrency((session.appointments_total + session.sales_total) - totalBarberCommission)],
      ["Gastos de caja (Efectivo + Digital)", `-${formatCurrency(totalExpenses)}`],
      ["GANANCIA NETA DE LA BARBERÍA", formatCurrency(barbershopProfit)],
    ],
    theme: "grid",
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontStyle: "bold",
      fontSize: 8,
    },
    bodyStyles: { fontSize: 9, textColor: COLORS.black },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 120 },
      1: { halign: "right", fontStyle: "bold" },
    },
    didParseCell(data) {
      if (data.section === "body") {
        if (data.row.index === 3) {
          data.cell.styles.fillColor = COLORS.offWhite;
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.textColor = COLORS.primaryDark;
        } else if (data.row.index === 4 || data.row.index === 6) {
          data.cell.styles.textColor = COLORS.rose;
        } else if (data.row.index === 5) {
          data.cell.styles.fillColor = COLORS.offWhite;
          data.cell.styles.fontStyle = "bold";
        } else if (data.row.index === 7) {
          data.cell.styles.fillColor = COLORS.offWhite;
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.textColor = COLORS.emerald;
        }
      }
    },
    margin: { left: 14, right: 14 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // ── NUEVA SECCIÓN: RESUMEN DE PRODUCTOS ──────────────────────────────────────
  if (session.product_sales_details && session.product_sales_details.length > 0) {
    currentY = addPageBreakIfNeeded(doc, currentY, 40);
    currentY = drawSectionHeader(
      doc,
      "Resumen de Productos (Vendidos y Fiados)",
      "Detalle de movimientos de inventario, stock restante y ganancias.",
      currentY,
      COLORS.primary
    );

    const productRows = session.product_sales_details.map((p: any) => [
      p.name,
      p.quantity_sold.toString(),
      p.quantity_consigned.toString(),
      p.stock_remaining.toString(),
      formatCurrency(p.total_revenue),
      formatCurrency(p.total_profit)
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [["Producto", "Vendidos", "Fiados", "Stock Restante", "Total Ingresos", "Ganancia"]],
      body: productRows,
      theme: "striped",
      headStyles: { fillColor: COLORS.offWhite, textColor: COLORS.primaryDark, fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { halign: "center" },
        2: { halign: "center" },
        3: { halign: "center" },
        4: { halign: "right" },
        5: { halign: "right", fontStyle: "bold", textColor: COLORS.emerald }
      },
      margin: { left: 14, right: 14 },
    });
    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  // ── SECCIÓN 2: INGRESOS POR MÉTODO DE PAGO ──────────────────────────────────
  currentY = addPageBreakIfNeeded(doc, currentY, 60);
  currentY = drawSectionHeader(
    doc,
    "2. Ingresos por Método de Pago",
    "Discriminación entre dinero físico y digital recibido.",
    currentY,
    COLORS.emerald
  );

  autoTable(doc, {
    startY: currentY,
    head: [["Método de Pago", "Monto Recibido", "% del Total"]],
    body: [
      // Cash
      ["Efectivo Físico (Citas)", formatCurrency(session.appointments_cash_total),
        `${session.appointments_total > 0 ? ((session.appointments_cash_total / (session.appointments_total + session.sales_total)) * 100).toFixed(1) : "0.0"}%`],
      ["Ventas de Productos", formatCurrency(session.sales_total),
        `${session.appointments_total > 0 ? ((session.sales_total / (session.appointments_total + session.sales_total)) * 100).toFixed(1) : "0.0"}%`],
      // Digital breakdown
      ["Tarjeta de Crédito/Débito", formatCurrency(session.digital_breakdown.card),
        `${session.appointments_total > 0 ? ((session.digital_breakdown.card / (session.appointments_total + session.sales_total)) * 100).toFixed(1) : "0.0"}%`],
      ["Nequi", formatCurrency(session.digital_breakdown.nequi),
        `${session.appointments_total > 0 ? ((session.digital_breakdown.nequi / (session.appointments_total + session.sales_total)) * 100).toFixed(1) : "0.0"}%`],
      ["Daviplata", formatCurrency(session.digital_breakdown.daviplata),
        `${session.appointments_total > 0 ? ((session.digital_breakdown.daviplata / (session.appointments_total + session.sales_total)) * 100).toFixed(1) : "0.0"}%`],
      ["Transferencia Bancaria", formatCurrency(session.digital_breakdown.transfer),
        `${session.appointments_total > 0 ? ((session.digital_breakdown.transfer / (session.appointments_total + session.sales_total)) * 100).toFixed(1) : "0.0"}%`],
    ],
    foot: [
      ["SUBTOTAL EFECTIVO FÍSICO",
        formatCurrency(session.appointments_cash_total + session.sales_total), ""],
      ["SUBTOTAL DIGITAL",
        formatCurrency(session.appointments_digital_total), ""],
    ],
    theme: "grid",
    headStyles: {
      fillColor: COLORS.emerald,
      textColor: COLORS.white,
      fontStyle: "bold",
      fontSize: 8,
    },
    footStyles: {
      fillColor: COLORS.offWhite,
      textColor: COLORS.black,
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles: { fontSize: 9, textColor: COLORS.black },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { halign: "right" },
      2: { halign: "right", textColor: COLORS.midGray },
    },
    margin: { left: 14, right: 14 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // ── SECCIÓN 3: LIQUIDACIÓN DIARIA DE BARBEROS ────────────────────────────────
  currentY = addPageBreakIfNeeded(doc, currentY, 50);
  currentY = drawSectionHeader(
    doc,
    "3. Liquidación Diaria de Barberos",
    "Comisiones calculadas y discriminación de pago por fondo (físico vs. digital).",
    currentY,
    COLORS.cyan
  );

  if (compiledBarbersBreakdown.length === 0) {
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.midGray);
    doc.text("No hay barberos con movimientos en este turno.", 14, currentY + 5);
    currentY += 15;
  } else {
    compiledBarbersBreakdown.forEach((barber, index) => {
      currentY = addPageBreakIfNeeded(doc, currentY, 55);

      // Barber name header
      doc.setFillColor(...COLORS.offWhite);
      doc.roundedRect(14, currentY, 182, 8, 2, 2, "F");
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...COLORS.black);
      doc.text(`Barbero ${index + 1}: ${sanitizeText(barber.name)}`, 18, currentY + 5.5);

      const totalServicios = barber.appointments_total_count ?? (barber.appointments_count || 0);
      const recaudoTotal = (barber.total_cash || 0) + (barber.total_digital || 0);
      let commissionRate = barber.commission_rate || 0;
      if (commissionRate === 0 && recaudoTotal > 0 && (barber.total_commission || 0) > 0) {
        commissionRate = Math.round(((barber.total_commission || 0) / recaudoTotal) * 100);
      }

      const barberBody: string[][] = [
        ["Servicios realizados (efectivo)", `${barber.appointments_count || 0}`],
        ["Servicios realizados (digital)", `${barber.appointments_digital_count || 0}`],
        ["Total servicios del turno", `${totalServicios}`],
        ["Recaudo en Efectivo (citas)", formatCurrency(barber.total_cash || 0)],
        ["Recaudo en Digital (citas)", formatCurrency(barber.total_digital || 0)],
        ["Recaudo Total", formatCurrency(recaudoTotal)],
        [`Comisión (${commissionRate}% sobre recaudo total)`, formatCurrency(barber.total_commission || 0)],
        ["Utilidad de la Barbería", formatCurrency(barber.total_shop_profit || 0)],
      ];

      if ((barber.total_advances_cash || 0) > 0) {
        barberBody.push(["Vales / Adelantos en CAJA FÍSICA (-)", `-${formatCurrency(barber.total_advances_cash)}`]);
      }
      if ((barber.total_advances_digital || 0) > 0) {
        barberBody.push(["Vales / Adelantos en DIGITAL (-)", `-${formatCurrency(barber.total_advances_digital)}`]);
      }
      if ((barber.total_advances || 0) > 0 && !(barber.total_advances_cash || 0) && !(barber.total_advances_digital || 0)) {
        // Fallback for legacy records that don't have per-fund data
        barberBody.push(["Vales / Adelantos tomados hoy (-)", `-${formatCurrency(barber.total_advances)}`]);
      }
      if ((barber.total_payments_cash || 0) > 0) {
        barberBody.push(["Abonos devueltos a CAJA FÍSICA (+)", `+${formatCurrency(barber.total_payments_cash)}`]);
      }
      if ((barber.total_payments_digital || 0) > 0) {
        barberBody.push(["Abonos devueltos a DIGITAL (+)", `+${formatCurrency(barber.total_payments_digital)}`]);
      }
      if ((barber.total_payments || 0) > 0 && !(barber.total_payments_cash || 0) && !(barber.total_payments_digital || 0)) {
        // Fallback for legacy records
        barberBody.push(["Abonos / Pagos devueltos (+)", `+${formatCurrency(barber.total_payments)}`]);
      }
      if ((barber.total_consignments || 0) > 0) {
        barberBody.push(["Fiados / Consignación (Bebidas) (-)", `-${formatCurrency(barber.total_consignments)}`]);
      }

      // The key discriminated rows — show NET values after advances per fund
      const netPayoutCash = barber.net_payout_cash ?? barber.payout_cash ?? 0;
      const netPayoutDigital = barber.net_payout_digital ?? barber.payout_digital ?? 0;
      barberBody.push(
        ["PAGO AL BARBERO - Sale de CAJA FÍSICA", formatCurrency(netPayoutCash)],
        ["PAGO AL BARBERO - Sale de FONDO DIGITAL", formatCurrency(netPayoutDigital)],
        ["TOTAL NETO A LIQUIDAR AL BARBERO", formatCurrency(netPayoutCash + netPayoutDigital)],
      );

      const payoutCashIdx = barberBody.length - 3;
      const payoutDigitalIdx = barberBody.length - 2;
      const totalNetIdx = barberBody.length - 1;

      autoTable(doc, {
        startY: currentY + 10,
        body: barberBody,
        theme: "grid",
        bodyStyles: { fontSize: 8.5, textColor: COLORS.black },
        columnStyles: {
          0: { fontStyle: "normal", cellWidth: 120 },
          1: { halign: "right", fontStyle: "bold" },
        },
        didParseCell(data) {
          if (data.section === "body") {
            if (data.row.index === payoutCashIdx) {
              data.cell.styles.fillColor = [230, 250, 240];
              data.cell.styles.textColor = [5, 120, 80];
              data.cell.styles.fontStyle = "bold";
            }
            if (data.row.index === payoutDigitalIdx) {
              data.cell.styles.fillColor = [225, 245, 255];
              data.cell.styles.textColor = [5, 100, 170];
              data.cell.styles.fontStyle = "bold";
            }
            if (data.row.index === totalNetIdx) {
              data.cell.styles.fillColor = COLORS.offWhite;
              data.cell.styles.fontStyle = "bold";
              data.cell.styles.fontSize = 9.5;
              data.cell.styles.textColor = COLORS.black;
            }
          }
        },
        margin: { left: 14, right: 14 },
      });

      // Services breakdown sub-table
      const serviceEntries = Object.entries(barber.services_breakdown || {});
      if (serviceEntries.length > 0) {
        const serviceY = (doc as any).lastAutoTable.finalY + 3;
        autoTable(doc, {
          startY: serviceY,
          head: [["Desglose de Servicios Realizados", "Cantidad"]],
          body: serviceEntries.map(([name, qty]) => [sanitizeText(name), `× ${qty}`]),
          theme: "plain",
          headStyles: {
            fillColor: COLORS.offWhite,
            textColor: COLORS.midGray,
            fontStyle: "bold",
            fontSize: 7,
          },
          bodyStyles: { fontSize: 8, textColor: COLORS.midGray },
          columnStyles: {
            0: { cellWidth: 120 },
            1: { halign: "right" },
          },
          margin: { left: 14, right: 14 },
        });
      }

      currentY = (doc as any).lastAutoTable.finalY + 8;
    });
  }

  // ── SECCIÓN 4: GASTOS OPERATIVOS ─────────────────────────────────────────────
  currentY = addPageBreakIfNeeded(doc, currentY, 50);
  currentY = drawSectionHeader(
    doc,
    "4. Gastos Operativos del Día (Egresos)",
    "Salidas de dinero registradas, discriminadas por fondo de origen.",
    currentY,
    COLORS.rose
  );

  if (!session.expenses || session.expenses.length === 0) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.midGray);
    doc.text("No se registraron gastos operativos en este período.", 14, currentY + 5);
    currentY += 15;
  } else {
    const expensesCashRows = session.expenses.filter((e) => e.payment_method === "cash");
    const expensesDigitalRows = session.expenses.filter((e) => e.payment_method === "digital");

    autoTable(doc, {
      startY: currentY,
      head: [["Categoría", "Descripción", "Monto", "Fondo"]],
      body: session.expenses.map((exp) => [
        sanitizeText(exp.category),
        sanitizeText(exp.description) || "-",
        formatCurrency(exp.amount),
        exp.payment_method === "cash" ? "Efectivo" : "Digital",
      ]),
      foot: [
        ["Total gastos en Efectivo", "", formatCurrency(session.expenses_cash_total), ""],
        ["Total gastos en Digital", "", formatCurrency(session.expenses_digital_total), ""],
        ["TOTAL EGRESOS", "", formatCurrency(session.expenses_total), ""],
      ],
      theme: "grid",
      headStyles: {
        fillColor: COLORS.rose,
        textColor: COLORS.white,
        fontStyle: "bold",
        fontSize: 8,
      },
      footStyles: {
        fillColor: COLORS.offWhite,
        fontStyle: "bold",
        textColor: COLORS.black,
        fontSize: 9,
      },
      bodyStyles: { fontSize: 8.5, textColor: COLORS.black },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 75 },
        2: { halign: "right", fontStyle: "bold", cellWidth: 35 },
        3: { halign: "center", cellWidth: 30 },
      },
      didParseCell(data) {
        if (data.section === "body" && data.column.index === 3) {
          const method = session.expenses[data.row.index]?.payment_method;
          if (method === "cash") {
            data.cell.styles.textColor = [5, 120, 80];
          } else {
            data.cell.styles.textColor = [5, 100, 170];
          }
        }
      },
      margin: { left: 14, right: 14 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  // ── SECCIÓN 5: BALANCE FINAL - CUADRE DE CAJA ────────────────────────────────
  currentY = addPageBreakIfNeeded(doc, currentY, 80);
  currentY = drawSectionHeader(
    doc,
    "5. Balance Final - Cuadre de Caja",
    "Fórmula exacta del dinero esperado en cada fondo al cierre del día.",
    currentY,
    COLORS.amber
  );

  // Two-column balance table
  autoTable(doc, {
    startY: currentY,
    head: [["CÁLCULO", "FONDO FÍSICO (Efectivo)", "FONDO DIGITAL"]],
    body: [
      ["(+) Base inicial de apertura", formatCurrency(session.opening_balance), "-"],
      ["(+) Ingresos por citas",
        formatCurrency(session.appointments_cash_total),
        formatCurrency(session.appointments_digital_total)],
      ["(+) Ingresos por productos", formatCurrency(session.sales_total), "-"],
      ["(-) Gastos operativos",
        `-${formatCurrency(session.expenses_cash_total)}`,
        `-${formatCurrency(session.expenses_digital_total)}`],
      ["(-) Vales / Adelantos a barberos",
        `-${formatCurrency(session.ledger_advances_cash || 0)}`,
        `-${formatCurrency(session.ledger_advances_digital || 0)}`],
      ["(+) Devoluciones a caja",
        `+${formatCurrency(session.ledger_payments_cash || 0)}`,
        `+${formatCurrency(session.ledger_payments_digital || 0)}`],
    ],
    foot: [
      ["= BALANCE ESPERADO AL CIERRE",
        formatCurrency(session.expected_cash),
        formatCurrency(session.expected_digital)],
      ["= TOTAL CONSOLIDADO DE CAJA",
        formatCurrency(session.expected_balance), ""],
    ],
    theme: "grid",
    headStyles: {
      fillColor: COLORS.amber,
      textColor: COLORS.white,
      fontStyle: "bold",
      fontSize: 8,
    },
    footStyles: {
      fillColor: COLORS.darkGray,
      textColor: COLORS.white,
      fontStyle: "bold",
      fontSize: 10,
    },
    bodyStyles: { fontSize: 9, textColor: COLORS.black },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 85 },
      1: { halign: "right", textColor: [5, 120, 80] as [number, number, number] },
      2: { halign: "right", textColor: [5, 100, 170] as [number, number, number] },
    },
    margin: { left: 14, right: 14 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 12;

  // ── ACTUAL BALANCE (if provided) ─────────────────────────────────────────────
  const hasActual = compiledBarbersBreakdown.some(
    (b) => typeof b.actual_cash === "number" && b.actual_cash > 0
  );
  const actualBalance = compiledBarbersBreakdown.reduce(
    (sum, b) => sum + (b.actual_cash || 0),
    0
  );

  if (hasActual) {
    const discrepancy = actualBalance - session.expected_cash;
    autoTable(doc, {
      startY: currentY,
      body: [
        ["Efectivo físico contado al cierre", formatCurrency(actualBalance)],
        ["Efectivo esperado en caja", formatCurrency(session.expected_cash)],
        [
          discrepancy === 0 ? "CAJA CUADRADA" :
            discrepancy < 0 ? "FALTANTE DE EFECTIVO" : "SOBRANTE DE EFECTIVO",
          discrepancy === 0 ? "-" : formatCurrency(Math.abs(discrepancy)),
        ],
      ],
      theme: "grid",
      bodyStyles: { fontSize: 10, fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: 120 },
        1: { halign: "right" },
      },
      didParseCell(data) {
        if (data.section === "body" && data.row.index === 2) {
          if (discrepancy === 0) {
            data.cell.styles.fillColor = [230, 250, 240];
            data.cell.styles.textColor = [5, 120, 80];
          } else if (discrepancy < 0) {
            data.cell.styles.fillColor = [255, 235, 235];
            data.cell.styles.textColor = [180, 30, 30];
          } else {
            data.cell.styles.fillColor = [255, 248, 225];
            data.cell.styles.textColor = [120, 80, 0];
          }
        }
      },
      margin: { left: 14, right: 14 },
    });
    currentY = (doc as any).lastAutoTable.finalY + 12;
  }

  // ── SECCIÓN 6: REGISTRO DETALLADO DE TRANSACCIONES ───────────────────────────
  currentY = addPageBreakIfNeeded(doc, currentY, 50);
  currentY = drawSectionHeader(
    doc,
    "6. Registro Detallado de Transacciones",
    "Listado de todas las citas y servicios completados en el período.",
    currentY,
    COLORS.primary
  );

  const appointmentsList = session.appointments || [];

  if (appointmentsList.length === 0) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.midGray);
    doc.text("No se registraron transacciones en este período.", 14, currentY + 5);
    currentY += 15;
  } else {
    autoTable(doc, {
      startY: currentY,
      head: [["Hora", "Barbero", "Cliente", "Servicio", "Monto", "Medio de Pago"]],
      body: appointmentsList.map((appt: any) => {
        const timeStr = appt.start_time ? formatTime(appt.start_time) : "-";
        const barberName = sanitizeText(appt.staff?.profiles?.full_name) || "-";
        const clientName = sanitizeText(appt.client?.full_name) || "-";
        const serviceName = sanitizeText(appt.service?.name) || "-";
        const amount = formatCurrency(appt.total_price || 0);
        
        const method = appt.payment_method;
        let paymentMethodLabel = method || "Otro";
        if (method === "cash") paymentMethodLabel = "Efectivo";
        else if (method === "card") paymentMethodLabel = "Tarjeta";
        else if (method === "nequi") paymentMethodLabel = "Nequi";
        else if (method === "daviplata") paymentMethodLabel = "Daviplata";
        else if (method === "transfer") paymentMethodLabel = "Transferencia";
        else if (method === "split") {
          const cash = Number(appt.split_cash_amount || 0);
          const dig = Number(appt.split_digital_amount || 0);
          const digMethod = appt.split_digital_method || "Digital";
          const cleanDigMethod = digMethod === "card" ? "Tarjeta" : 
                                 digMethod === "nequi" ? "Nequi" : 
                                 digMethod === "daviplata" ? "Daviplata" : 
                                 digMethod === "transfer" ? "Transferencia" : digMethod;
          paymentMethodLabel = `Mixto (${formatCurrency(cash)} Efe. / ${formatCurrency(dig)} ${cleanDigMethod})`;
        }

        return [
          timeStr,
          barberName,
          clientName,
          serviceName,
          amount,
          paymentMethodLabel
        ];
      }),
      theme: "grid",
      headStyles: {
        fillColor: COLORS.primary,
        textColor: COLORS.white,
        fontStyle: "bold",
        fontSize: 8,
      },
      bodyStyles: { fontSize: 8, textColor: COLORS.black },
      columnStyles: {
        0: { cellWidth: 18 },
        1: { cellWidth: 28, fontStyle: "bold" },
        2: { cellWidth: 28 },
        3: { cellWidth: 38 },
        4: { halign: "right", fontStyle: "bold", cellWidth: 23, textColor: [5, 120, 80] },
        5: { halign: "right", cellWidth: 35, fontSize: 7 }
      },
      margin: { left: 14, right: 14 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 12;
  }

  // ── FOOTER ───────────────────────────────────────────────────────────────────
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const footerY = doc.internal.pageSize.getHeight() - 10;

    doc.setDrawColor(...COLORS.lightGray);
    doc.setLineWidth(0.3);
    doc.line(14, footerY - 4, 196, footerY - 4);

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.midGray);
    doc.text(
      `Documento generado automáticamente por BarberOS  ·  ${dateStr} ${timeStr}`,
      14,
      footerY
    );
    doc.text(`Página ${i} de ${totalPages}`, 196, footerY, { align: "right" });
  }

  return doc.output("blob");
}
