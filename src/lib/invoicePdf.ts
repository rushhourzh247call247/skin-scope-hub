import jsPDF from "jspdf";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const BRAND_RGB: [number, number, number] = [28, 175, 154];
const DARK_RGB: [number, number, number] = [30, 30, 30];
const GRAY_RGB: [number, number, number] = [120, 120, 120];
const LIGHT_GRAY_RGB: [number, number, number] = [240, 240, 240];

interface InvoiceData {
  invoice_number: string;
  company_name: string;
  amount: number;
  due_date: string;
  status: "open" | "paid" | "overdue" | "cancelled";
  paid_at?: string;
  dunning_level: number;
  notes?: string;
  created_at: string;
  contract_number?: string;
}

const COMPANY_INFO = {
  name: "DERM247",
  addressLine1: "Derm247 GmbH",
  addressLine2: "Musterstrasse 10",
  addressLine3: "8000 Zürich",
  country: "Schweiz",
  email: "info@derm247.ch",
  web: "www.derm247.ch",
  phone: "+41 44 000 00 00",
  uid: "CHE-000.000.000",
  iban: "CH00 0000 0000 0000 0000 0",
  bank: "Zürcher Kantonalbank",
};

export function generateInvoicePdf(invoice: InvoiceData): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = 210;
  const marginL = 25;
  const marginR = 25;
  const contentW = pageW - marginL - marginR;
  let y = 20;

  // ── Header bar ──
  doc.setFillColor(...BRAND_RGB);
  doc.rect(0, 0, pageW, 8, "F");

  // ── Logo / Company name ──
  y = 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...DARK_RGB);
  doc.text("DERM", marginL, y);
  const dermW = doc.getTextWidth("DERM");
  doc.setTextColor(...BRAND_RGB);
  doc.text("247", marginL + dermW, y);

  // ── Sender line (small) ──
  y = 30;
  doc.setFontSize(7);
  doc.setTextColor(...GRAY_RGB);
  doc.setFont("helvetica", "normal");
  doc.text(`${COMPANY_INFO.addressLine1} · ${COMPANY_INFO.addressLine2} · ${COMPANY_INFO.addressLine3}`, marginL, y);

  // ── Recipient ──
  y = 40;
  doc.setFontSize(11);
  doc.setTextColor(...DARK_RGB);
  doc.setFont("helvetica", "normal");
  doc.text(invoice.company_name, marginL, y);

  // ── Invoice meta (right side) ──
  const metaX = pageW - marginR;
  let metaY = 40;
  doc.setFontSize(9);
  doc.setTextColor(...GRAY_RGB);
  doc.setFont("helvetica", "normal");

  const metaLines = [
    ["Rechnungsnr.:", invoice.invoice_number],
    ["Rechnungsdatum:", format(new Date(invoice.created_at), "dd.MM.yyyy", { locale: de })],
    ["Fälligkeitsdatum:", format(new Date(invoice.due_date), "dd.MM.yyyy", { locale: de })],
  ];
  if (invoice.contract_number) {
    metaLines.push(["Vertragsnr.:", invoice.contract_number]);
  }

  for (const [label, value] of metaLines) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY_RGB);
    doc.text(label, metaX - 60, metaY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK_RGB);
    doc.text(value, metaX, metaY, { align: "right" });
    metaY += 5;
  }

  // ── Title ──
  y = 70;
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK_RGB);
  doc.text("RECHNUNG", marginL, y);

  // Status badge
  if (invoice.status === "paid") {
    doc.setFontSize(10);
    doc.setTextColor(34, 139, 34);
    doc.text("BEZAHLT", marginL + doc.getTextWidth("RECHNUNG  ") + 5, y);
  } else if (invoice.status === "cancelled") {
    doc.setFontSize(10);
    doc.setTextColor(180, 0, 0);
    doc.text("STORNIERT", marginL + doc.getTextWidth("RECHNUNG  ") + 5, y);
  }

  // ── Separator ──
  y = 75;
  doc.setDrawColor(...BRAND_RGB);
  doc.setLineWidth(0.8);
  doc.line(marginL, y, pageW - marginR, y);

  // ── Table header ──
  y = 85;
  doc.setFillColor(...LIGHT_GRAY_RGB);
  doc.rect(marginL, y - 5, contentW, 8, "F");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK_RGB);
  doc.text("Beschreibung", marginL + 3, y);
  doc.text("Menge", marginL + contentW - 60, y, { align: "right" });
  doc.text("Einzelpreis", marginL + contentW - 30, y, { align: "right" });
  doc.text("Betrag", marginL + contentW - 3, y, { align: "right" });

  // ── Table row ──
  y += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...DARK_RGB);

  const description = invoice.contract_number
    ? `Monatliche Lizenzgebühr (Vertrag ${invoice.contract_number})`
    : "Monatliche Lizenzgebühr – DERM247 Software";

  doc.text(description, marginL + 3, y);
  doc.text("1", marginL + contentW - 60, y, { align: "right" });
  doc.text(`CHF ${invoice.amount.toLocaleString("de-CH", { minimumFractionDigits: 2 })}`, marginL + contentW - 30, y, { align: "right" });
  doc.text(`CHF ${invoice.amount.toLocaleString("de-CH", { minimumFractionDigits: 2 })}`, marginL + contentW - 3, y, { align: "right" });

  // ── Subtotal separator ──
  y += 8;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(marginL + contentW - 80, y, marginL + contentW, y);

  // ── Subtotal ──
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRAY_RGB);
  doc.text("Zwischensumme", marginL + contentW - 80, y);
  doc.setTextColor(...DARK_RGB);
  doc.text(`CHF ${invoice.amount.toLocaleString("de-CH", { minimumFractionDigits: 2 })}`, marginL + contentW - 3, y, { align: "right" });

  // MwSt
  y += 6;
  doc.setTextColor(...GRAY_RGB);
  doc.text("MwSt. (0% – von der Steuer befreit)", marginL + contentW - 80, y);
  doc.setTextColor(...DARK_RGB);
  doc.text("CHF 0.00", marginL + contentW - 3, y, { align: "right" });

  // ── Total ──
  y += 4;
  doc.setDrawColor(...BRAND_RGB);
  doc.setLineWidth(0.8);
  doc.line(marginL + contentW - 80, y, marginL + contentW, y);

  y += 7;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...DARK_RGB);
  doc.text("Gesamtbetrag", marginL + contentW - 80, y);
  doc.text(`CHF ${invoice.amount.toLocaleString("de-CH", { minimumFractionDigits: 2 })}`, marginL + contentW - 3, y, { align: "right" });

  // ── Payment info box ──
  y += 18;
  doc.setFillColor(245, 250, 249);
  doc.setDrawColor(...BRAND_RGB);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginL, y, contentW, 35, 2, 2, "FD");

  y += 7;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND_RGB);
  doc.text("Zahlungsinformationen", marginL + 5, y);

  y += 7;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...DARK_RGB);

  const paymentLines = [
    [`Bank: ${COMPANY_INFO.bank}`, `IBAN: ${COMPANY_INFO.iban}`],
    [`Zahlbar bis: ${format(new Date(invoice.due_date), "dd.MM.yyyy", { locale: de })}`, `Referenz: ${invoice.invoice_number}`],
  ];

  for (const [left, right] of paymentLines) {
    doc.text(left, marginL + 5, y);
    doc.text(right, marginL + contentW / 2, y);
    y += 6;
  }

  // ── Notes ──
  if (invoice.notes) {
    y += 10;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...GRAY_RGB);
    doc.text("Bemerkungen:", marginL, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.text(invoice.notes, marginL, y, { maxWidth: contentW });
  }

  // ── Paid stamp ──
  if (invoice.status === "paid" && invoice.paid_at) {
    doc.setFontSize(36);
    doc.setTextColor(34, 139, 34);
    doc.setFont("helvetica", "bold");
    doc.text("BEZAHLT", pageW / 2, 180, { align: "center", angle: 25 });
    doc.setFontSize(10);
    doc.text(`am ${format(new Date(invoice.paid_at), "dd.MM.yyyy", { locale: de })}`, pageW / 2, 190, { align: "center", angle: 25 });
  }

  // ── Footer ──
  const footerY = 272;
  doc.setDrawColor(...LIGHT_GRAY_RGB);
  doc.setLineWidth(0.3);
  doc.line(marginL, footerY, pageW - marginR, footerY);

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY_RGB);

  const col1X = marginL;
  const col2X = marginL + 55;
  const col3X = marginL + 110;

  doc.text(COMPANY_INFO.addressLine1, col1X, footerY + 5);
  doc.text(COMPANY_INFO.addressLine2, col1X, footerY + 9);
  doc.text(COMPANY_INFO.addressLine3, col1X, footerY + 13);

  doc.text(`Tel: ${COMPANY_INFO.phone}`, col2X, footerY + 5);
  doc.text(`E-Mail: ${COMPANY_INFO.email}`, col2X, footerY + 9);
  doc.text(`Web: ${COMPANY_INFO.web}`, col2X, footerY + 13);

  doc.text(`UID: ${COMPANY_INFO.uid}`, col3X, footerY + 5);
  doc.text(`IBAN: ${COMPANY_INFO.iban}`, col3X, footerY + 9);
  doc.text(`Bank: ${COMPANY_INFO.bank}`, col3X, footerY + 13);

  // Bottom brand bar
  doc.setFillColor(...BRAND_RGB);
  doc.rect(0, 289, pageW, 8, "F");

  return doc;
}

export function downloadInvoicePdf(invoice: InvoiceData) {
  const doc = generateInvoicePdf(invoice);
  doc.save(`Rechnung_${invoice.invoice_number}.pdf`);
}
