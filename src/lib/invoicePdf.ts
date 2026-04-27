import jsPDF from "jspdf";
import { format } from "date-fns";
import { PAYMENT_QR_PNG } from "@/assets/paymentQrBase64";
import {
  INVOICE_STRINGS,
  DATE_LOCALES,
  NUMBER_LOCALES,
  type InvoiceLanguage,
} from "./invoiceTranslations";

const BRAND_RGB: [number, number, number] = [28, 175, 154];
const DARK_RGB: [number, number, number] = [30, 30, 30];
const GRAY_RGB: [number, number, number] = [120, 120, 120];
const LIGHT_GRAY_RGB: [number, number, number] = [240, 240, 240];
const REMINDER_RGB: [number, number, number] = [200, 70, 30];

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
  licenses?: number;
  package_name?: string;
}

const COMPANY_INFO = {
  name: "TechAssist",
  owner: "Rached Mtiraoui",
  addressLine1: "TechAssist – Rached Mtiraoui",
  addressLine2: "Dällikerstrasse 48",
  addressLine3: "8105 Regensdorf",
  country: "Schweiz",
  email: "info@techassist.ch",
  web: "www.derm247.ch",
  phone: "+41 79 801 20 48",
  iban: "CH95 0070 0114 9053 5408 5",
  bank: "Zürcher Kantonalbank",
};

const DATE_FMT: Record<InvoiceLanguage, string> = {
  de: "dd.MM.yyyy",
  en: "dd/MM/yyyy",
  fr: "dd/MM/yyyy",
  it: "dd/MM/yyyy",
  es: "dd/MM/yyyy",
};

export interface GenerateInvoicePdfOptions {
  /** When true, the green "BEZAHLT" stamp will be omitted (e.g. for sending to the customer). */
  skipPaidStamp?: boolean;
}

export function generateInvoicePdf(
  invoice: InvoiceData,
  language: InvoiceLanguage = "de",
  options: GenerateInvoicePdfOptions = {},
): jsPDF {
  const t = INVOICE_STRINGS[language];
  const locale = DATE_LOCALES[language];
  const numLocale = NUMBER_LOCALES[language];
  const dateFmt = DATE_FMT[language];
  const fmtDate = (d: string) => format(new Date(d), dateFmt, { locale });
  const fmtCHF = (n: number) =>
    `CHF ${n.toLocaleString(numLocale, { minimumFractionDigits: 2 })}`;

  const isReminder = (invoice.dunning_level || 0) > 0;
  const reminderLevel = invoice.dunning_level || 0;

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

  const metaLines: [string, string][] = [
    [t.invoiceNumber, invoice.invoice_number],
    [t.invoiceDate, fmtDate(invoice.created_at)],
    [t.dueDate, fmtDate(invoice.due_date)],
  ];
  if (invoice.contract_number) {
    metaLines.push([t.contractNumber, invoice.contract_number]);
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
  doc.setTextColor(isReminder ? REMINDER_RGB[0] : DARK_RGB[0], isReminder ? REMINDER_RGB[1] : DARK_RGB[1], isReminder ? REMINDER_RGB[2] : DARK_RGB[2]);
  const title = isReminder ? t.reminderTitle(reminderLevel) : t.invoiceTitle;
  doc.text(title, marginL, y);

  // Status badge
  if (invoice.status === "paid") {
    doc.setFontSize(10);
    doc.setTextColor(34, 139, 34);
    doc.text(t.paid, marginL + doc.getTextWidth(title + "  ") + 5, y);
  } else if (invoice.status === "cancelled") {
    doc.setFontSize(10);
    doc.setTextColor(180, 0, 0);
    doc.text(t.cancelled, marginL + doc.getTextWidth(title + "  ") + 5, y);
  }

  // ── Separator ──
  y = 75;
  doc.setDrawColor(...BRAND_RGB);
  doc.setLineWidth(0.8);
  doc.line(marginL, y, pageW - marginR, y);

  // ── Reminder banner (if dunning_level > 0) ──
  if (isReminder) {
    y += 6;
    const bannerH = 16;
    doc.setFillColor(255, 240, 230);
    doc.setDrawColor(...REMINDER_RGB);
    doc.setLineWidth(0.4);
    doc.roundedRect(marginL, y, contentW, bannerH, 1.5, 1.5, "FD");
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...DARK_RGB);
    const bannerText = t.reminderBanner(reminderLevel, fmtDate(invoice.due_date));
    doc.text(bannerText, marginL + 4, y + 6, { maxWidth: contentW - 8 });
    y += bannerH;
  }

  // ── Table header ──
  y += 10;
  doc.setFillColor(...LIGHT_GRAY_RGB);
  doc.rect(marginL, y - 5, contentW, 8, "F");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK_RGB);
  doc.text(t.description, marginL + 3, y);
  doc.text(t.quantity, marginL + contentW - 60, y, { align: "right" });
  doc.text(t.unitPrice, marginL + contentW - 30, y, { align: "right" });
  doc.text(t.amount, marginL + contentW - 3, y, { align: "right" });

  // ── Table row ──
  y += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...DARK_RGB);

  const licenseCount = invoice.licenses || 1;
  const description = t.licenseDescription(invoice.package_name, invoice.contract_number);
  const unitPrice = licenseCount > 0 ? invoice.amount / licenseCount : invoice.amount;

  doc.text(description, marginL + 3, y);
  doc.text(String(licenseCount), marginL + contentW - 60, y, { align: "right" });
  doc.text(fmtCHF(unitPrice), marginL + contentW - 30, y, { align: "right" });
  doc.text(fmtCHF(invoice.amount), marginL + contentW - 3, y, { align: "right" });

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
  doc.text(t.subtotal, marginL + contentW - 80, y);
  doc.setTextColor(...DARK_RGB);
  doc.text(fmtCHF(invoice.amount), marginL + contentW - 3, y, { align: "right" });

  // VAT
  y += 6;
  doc.setTextColor(...GRAY_RGB);
  doc.text(t.vatLine, marginL + contentW - 80, y);
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
  doc.text(t.total, marginL + contentW - 80, y);
  doc.text(fmtCHF(invoice.amount), marginL + contentW - 3, y, { align: "right" });

  // ── Payment info box with QR ──
  y += 18;
  const qrSize = 32;
  const payBoxH = 48;
  doc.setFillColor(245, 250, 249);
  doc.setDrawColor(...BRAND_RGB);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginL, y, contentW, payBoxH, 2, 2, "FD");

  // QR code on the right side with subtle border
  const qrX = marginL + contentW - qrSize - 6;
  const qrY = y + (payBoxH - qrSize) / 2;
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.2);
  doc.roundedRect(qrX - 1.5, qrY - 1.5, qrSize + 3, qrSize + 3, 1, 1, "S");
  try {
    doc.addImage(PAYMENT_QR_PNG, "PNG", qrX, qrY, qrSize, qrSize);
  } catch { /* QR image not available */ }

  // "Scan to pay" label under QR
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY_RGB);
  doc.text(t.scanQr, qrX + qrSize / 2, qrY + qrSize + 4, { align: "center" });

  // Title
  const infoY = y + 7;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND_RGB);
  doc.text(t.paymentInfo, marginL + 5, infoY);

  // Payment details – left column layout
  const lineX = marginL + 5;
  const valX = marginL + 42;
  let lineY = infoY + 8;
  doc.setFontSize(8.5);

  const payDetails: [string, string][] = [
    [t.recipient, COMPANY_INFO.owner],
    [t.bank, COMPANY_INFO.bank],
    [t.iban, COMPANY_INFO.iban],
    [t.reference, invoice.invoice_number],
    [t.payableUntil, fmtDate(invoice.due_date)],
  ];

  for (const [label, value] of payDetails) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY_RGB);
    doc.text(label, lineX, lineY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK_RGB);
    doc.text(value, valX, lineY);
    lineY += 5.5;
  }

  // ── Notes ──
  if (invoice.notes) {
    y += 10;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...GRAY_RGB);
    doc.text(t.notesLabel, marginL, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.text(invoice.notes, marginL, y, { maxWidth: contentW });
  }

  // ── Paid stamp ──
  if (invoice.status === "paid" && invoice.paid_at && !options.skipPaidStamp) {
    doc.setFontSize(36);
    doc.setTextColor(34, 139, 34);
    doc.setFont("helvetica", "bold");
    doc.text(t.paidStamp, pageW / 2, 180, { align: "center", angle: 25 });
    doc.setFontSize(10);
    doc.text(`${t.paidOn} ${fmtDate(invoice.paid_at)}`, pageW / 2, 190, { align: "center", angle: 25 });
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

  doc.text(`${t.ownerLabel} ${COMPANY_INFO.owner}`, col3X, footerY + 5);
  doc.text(`${t.iban} ${COMPANY_INFO.iban}`, col3X, footerY + 9);
  doc.text(`${t.bank} ${COMPANY_INFO.bank}`, col3X, footerY + 13);

  // Bottom brand bar
  doc.setFillColor(...BRAND_RGB);
  doc.rect(0, 289, pageW, 8, "F");

  return doc;
}

export function downloadInvoicePdf(invoice: InvoiceData, language: InvoiceLanguage = "de") {
  const t = INVOICE_STRINGS[language];
  const doc = generateInvoicePdf(invoice, language);
  const filename = (invoice.dunning_level || 0) > 0
    ? t.filenameReminder(invoice.dunning_level, invoice.invoice_number)
    : t.filenameInvoice(invoice.invoice_number);
  doc.save(filename);
}
