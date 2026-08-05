import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface InvoiceData {
  appointmentId: string;
  date: string;
  customerName: string;
  customerDocument?: string;
  barberName: string;
  services: { name: string; price: number }[];
  products: { name: string; price: number; qty: number }[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
}

interface BusinessInfo {
  name: string;
  nit: string;
  address: string;
  phone: string;
  regime: string;
  footerMessage: string;
}

// Datos de ejemplo de la barbería - Estos pueden ser pasados como parámetros o venir de la base de datos
const DEFAULT_BUSINESS_INFO: BusinessInfo = {
  name: "BARBERÍA SAAS",
  nit: "900.000.000-1",
  address: "Calle Principal #123, Ciudad",
  phone: "+57 300 000 0000",
  regime: "No Responsable de IVA",
  footerMessage: "¡Gracias por preferirnos! Vuelve pronto."
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(amount);
};

const removeEmojis = (str: string) => {
  if (!str) return "";
  // Strip emojis and other non-standard jsPDF helvetica characters.
  return str.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2B50}\u{2500}-\u{257F}]/gu, '').trim();
};

export const generateInvoicePDF = (data: InvoiceData, businessInfo: BusinessInfo = DEFAULT_BUSINESS_INFO) => {
  // Configuración de tirilla de impresión (ancho típico de 80mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 200] // Formato tirilla
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 10;
  
  const centerText = (text: string, y: number, size: number = 10, isBold: boolean = false) => {
    doc.setFontSize(size);
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    const textWidth = doc.getStringUnitWidth(text) * size / doc.internal.scaleFactor;
    const x = (pageWidth - textWidth) / 2;
    doc.text(text, x, y);
    return y + size * 0.4; // Return next Y approx
  };

  const leftRightText = (left: string, right: string, y: number, size: number = 9, isBold: boolean = false) => {
    doc.setFontSize(size);
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.text(left, 5, y);
    const rightWidth = doc.getStringUnitWidth(right) * size / doc.internal.scaleFactor;
    doc.text(right, pageWidth - 5 - rightWidth, y);
    return y + 5;
  };

  // Cabecera de la Barbería
  yPos = centerText(businessInfo.name, yPos, 14, true) + 2;
  yPos = centerText(`NIT: ${businessInfo.nit}`, yPos, 9) + 1;
  yPos = centerText(businessInfo.address, yPos, 8) + 1;
  yPos = centerText(`Tel: ${businessInfo.phone}`, yPos, 8) + 1;
  yPos = centerText(businessInfo.regime, yPos, 8) + 5;

  doc.setLineWidth(0.5);
  doc.line(5, yPos, pageWidth - 5, yPos);
  yPos += 5;

  // Datos de la Factura
  yPos = leftRightText("Factura de Venta No:", data.appointmentId.slice(0,8).toUpperCase(), yPos, 9, true);
  yPos = leftRightText("Fecha:", new Date(data.date).toLocaleString('es-CO'), yPos, 9);
  yPos = leftRightText("Barbero:", data.barberName, yPos, 9);
  
  if (data.customerName) {
    yPos = leftRightText("Cliente:", data.customerName, yPos, 9);
  }
  if (data.customerDocument) {
    yPos = leftRightText("CC/NIT:", data.customerDocument, yPos, 9);
  }

  yPos += 2;
  doc.line(5, yPos, pageWidth - 5, yPos);
  yPos += 5;

  // Detalles de items (Servicios y Productos)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("CANT  DESCRIPCIÓN", 5, yPos);
  const totalLabel = "TOTAL";
  const totalLabelWidth = doc.getStringUnitWidth(totalLabel) * 9 / doc.internal.scaleFactor;
  doc.text(totalLabel, pageWidth - 5 - totalLabelWidth, yPos);
  yPos += 5;
  
  doc.setFont("helvetica", "normal");
  
  data.services.forEach(service => {
    const name = doc.splitTextToSize(`1x ${removeEmojis(service.name)}`, pageWidth - 30);
    doc.text(name, 5, yPos);
    
    const price = formatCurrency(service.price);
    const priceWidth = doc.getStringUnitWidth(price) * 9 / doc.internal.scaleFactor;
    doc.text(price, pageWidth - 5 - priceWidth, yPos);
    
    yPos += (name.length * 4) + 1;
  });

  data.products.forEach(product => {
    const name = doc.splitTextToSize(`${product.qty}x ${removeEmojis(product.name)}`, pageWidth - 30);
    doc.text(name, 5, yPos);
    
    const price = formatCurrency(product.price * product.qty);
    const priceWidth = doc.getStringUnitWidth(price) * 9 / doc.internal.scaleFactor;
    doc.text(price, pageWidth - 5 - priceWidth, yPos);
    
    yPos += (name.length * 4) + 1;
  });

  yPos += 2;
  doc.line(5, yPos, pageWidth - 5, yPos);
  yPos += 5;

  // Totales
  yPos = leftRightText("Subtotal:", formatCurrency(data.subtotal), yPos);
  if (data.discount > 0) {
    yPos = leftRightText("Descuento:", `-${formatCurrency(data.discount)}`, yPos);
  }
  
  yPos += 2;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL A PAGAR:", 5, yPos);
  const finalTotal = formatCurrency(data.total);
  const finalTotalWidth = doc.getStringUnitWidth(finalTotal) * 11 / doc.internal.scaleFactor;
  doc.text(finalTotal, pageWidth - 5 - finalTotalWidth, yPos);
  yPos += 6;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const methodMap: any = {
    'cash': 'Efectivo',
    'transfer': 'Transferencia',
    'card': 'Tarjeta',
    'split': 'Pago Mixto'
  };
  yPos = leftRightText("Medio de Pago:", methodMap[data.paymentMethod] || data.paymentMethod, yPos);

  yPos += 5;
  doc.line(5, yPos, pageWidth - 5, yPos);
  yPos += 5;

  // Pie de página
  yPos = centerText(businessInfo.footerMessage, yPos, 8) + 2;
  yPos = centerText("Generado por Barbershop SaaS", yPos, 7);

  // Guardar PDF
  doc.save(`Factura_${data.appointmentId.slice(0,8)}.pdf`);
};
