import jsPDF from "jspdf";
import { format } from "date-fns";
import { de } from "date-fns/locale";

/**
 * Begleitbrief-Generator für Postversand (Schweizer Brief, Adressfenster links).
 *
 * Wird zusammen mit dem Hauptdokument (Rechnung/Mahnung/Kündigung) gedruckt
 * und beigelegt — damit kein manueller Begleitbrief geschrieben werden muss.
 */

const BRAND_RGB: [number, number, number] = [28, 175, 154];
const DARK_RGB: [number, number, number] = [30, 30, 30];
const GRAY_RGB: [number, number, number] = [120, 120, 120];

const SENDER = {
  name: "TechAssist – Rached Mtiraoui",
  address: "Dällikerstrasse 48",
  zip: "8105 Regensdorf",
  country: "Schweiz",
  email: "info@techassist.ch",
  phone: "+41 79 801 20 48",
  web: "www.derm247.ch",
  iban: "CH95 0070 0114 9053 5408 5",
  bank: "Zürcher Kantonalbank",
};

export type CoverLetterType =
  | "invoice"
  | "dunning_1"
  | "dunning_2"
  | "dunning_3"
  | "cancellation";

export interface CoverLetterRecipient {
  company_name: string;
  address_line1?: string;
  address_line2?: string;
  zip?: string;
  city?: string;
  country?: string;
  contact_name?: string;
}

export interface CoverLetterContext {
  /** Rechnungsnummer oder Vertragsnummer */
  documentNumber?: string;
  amount?: number;
  dueDate?: string;
  /** Kündigungs-Enddatum (für cancellation) */
  endDate?: string;
}

const fmtDate = (d?: string) =>
  d ? format(new Date(d), "dd.MM.yyyy", { locale: de }) : "";
const fmtCHF = (n?: number) =>
  n != null ? `CHF ${n.toLocaleString("de-CH", { minimumFractionDigits: 2 })}` : "";

function buildBody(type: CoverLetterType, ctx: CoverLetterContext): {
  subject: string;
  salutation: string;
  paragraphs: string[];
  closing: string;
} {
  const greeting = "Sehr geehrte Damen und Herren";

  switch (type) {
    case "invoice":
      return {
        subject: `Rechnung ${ctx.documentNumber ?? ""}`.trim(),
        salutation: greeting,
        paragraphs: [
          "vielen Dank für Ihr Vertrauen in DERM247.",
          `In der Beilage erhalten Sie die Rechnung ${ctx.documentNumber ?? ""} über ${fmtCHF(ctx.amount)} mit Fälligkeit am ${fmtDate(ctx.dueDate)}.`,
          "Bitte begleichen Sie den Betrag fristgerecht über den beigefügten QR-Einzahlungsschein. Bei Fragen stehen wir Ihnen jederzeit gerne zur Verfügung.",
        ],
        closing: "Freundliche Grüsse",
      };
    case "dunning_1":
      return {
        subject: `Zahlungserinnerung – Rechnung ${ctx.documentNumber ?? ""}`.trim(),
        salutation: greeting,
        paragraphs: [
          `gemäss unseren Unterlagen ist die Rechnung ${ctx.documentNumber ?? ""} über ${fmtCHF(ctx.amount)} mit Fälligkeit am ${fmtDate(ctx.dueDate)} bislang offen.`,
          "Möglicherweise hat sich Ihre Zahlung mit diesem Schreiben überschnitten — in diesem Fall bitten wir Sie, dieses Schreiben als gegenstandslos zu betrachten.",
          "Andernfalls bitten wir Sie höflich, den ausstehenden Betrag innerhalb der nächsten 10 Tage zu begleichen.",
        ],
        closing: "Freundliche Grüsse",
      };
    case "dunning_2":
      return {
        subject: `2. Mahnung – Rechnung ${ctx.documentNumber ?? ""}`.trim(),
        salutation: greeting,
        paragraphs: [
          `trotz unserer Zahlungserinnerung ist die Rechnung ${ctx.documentNumber ?? ""} über ${fmtCHF(ctx.amount)} weiterhin offen.`,
          "Wir bitten Sie dringend, den ausstehenden Betrag innerhalb der nächsten 7 Tage zu begleichen, um weitere Massnahmen zu vermeiden.",
          "Sollten Sie Fragen zur Rechnung haben, kontaktieren Sie uns bitte umgehend.",
        ],
        closing: "Freundliche Grüsse",
      };
    case "dunning_3":
      return {
        subject: `Letzte Mahnung – Rechnung ${ctx.documentNumber ?? ""}`.trim(),
        salutation: greeting,
        paragraphs: [
          `leider mussten wir feststellen, dass die Rechnung ${ctx.documentNumber ?? ""} über ${fmtCHF(ctx.amount)} trotz mehrfacher Mahnung weiterhin offen ist.`,
          "Wir setzen Ihnen hiermit eine letzte Frist von 5 Tagen zur Begleichung des ausstehenden Betrags.",
          "Sollte bis zu diesem Zeitpunkt kein Zahlungseingang erfolgen, sehen wir uns gezwungen, Ihren Zugang zu DERM247 zu sperren und das Inkassoverfahren einzuleiten.",
        ],
        closing: "Freundliche Grüsse",
      };
    case "cancellation":
      return {
        subject: `Kündigungsbestätigung – Vertrag ${ctx.documentNumber ?? ""}`.trim(),
        salutation: greeting,
        paragraphs: [
          `hiermit bestätigen wir den Eingang Ihrer Kündigung des Vertrags ${ctx.documentNumber ?? ""}.`,
          `Ihr Vertrag endet vereinbarungsgemäss am ${fmtDate(ctx.endDate)}. Bis zu diesem Datum bleibt Ihr Zugang zu DERM247 in vollem Umfang nutzbar.`,
          "Wir bedanken uns für die bisherige Zusammenarbeit und wünschen Ihnen für die Zukunft alles Gute. Selbstverständlich stehen wir Ihnen für Rückfragen jederzeit zur Verfügung.",
        ],
        closing: "Freundliche Grüsse",
      };
  }
}

export function generateCoverLetterPdf(
  type: CoverLetterType,
  recipient: CoverLetterRecipient,
  ctx: CoverLetterContext = {},
): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = 210;
  const marginL = 25;
  const marginR = 25;
  const contentW = pageW - marginL - marginR;

  // === Briefkopf (Logo-Bereich oben rechts) ===
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...BRAND_RGB);
  doc.text("DERM247", pageW - marginR, 20, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...GRAY_RGB);
  doc.text("by TechAssist", pageW - marginR, 25, { align: "right" });

  // === Absender-Mini-Zeile (über Adressfenster, klein) ===
  doc.setFontSize(7);
  doc.setTextColor(...GRAY_RGB);
  doc.text(
    `${SENDER.name} · ${SENDER.address} · ${SENDER.zip}`,
    marginL,
    47,
  );
  // Linie unter Absenderzeile (Schweizer Brief-Standard)
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.2);
  doc.line(marginL, 48, marginL + 85, 48);

  // === Empfänger-Adresse (Adressfenster: 25mm links, 50mm oben) ===
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...DARK_RGB);
  let ay = 55;
  doc.text(recipient.company_name, marginL, ay);
  ay += 5;
  if (recipient.contact_name) {
    doc.text(recipient.contact_name, marginL, ay);
    ay += 5;
  }
  if (recipient.address_line1) {
    doc.text(recipient.address_line1, marginL, ay);
    ay += 5;
  }
  if (recipient.address_line2) {
    doc.text(recipient.address_line2, marginL, ay);
    ay += 5;
  }
  if (recipient.zip || recipient.city) {
    doc.text(`${recipient.zip ?? ""} ${recipient.city ?? ""}`.trim(), marginL, ay);
    ay += 5;
  }
  if (recipient.country && recipient.country.toLowerCase() !== "schweiz") {
    doc.text(recipient.country, marginL, ay);
  }

  // === Datum + Ort (rechts) ===
  doc.setFontSize(10);
  doc.setTextColor(...DARK_RGB);
  doc.text(
    `Regensdorf, ${format(new Date(), "dd.MM.yyyy", { locale: de })}`,
    pageW - marginR,
    55,
    { align: "right" },
  );

  // === Betreff ===
  const body = buildBody(type, ctx);
  let y = 100;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...DARK_RGB);
  doc.text(body.subject, marginL, y);
  y += 10;

  // === Anrede ===
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`${body.salutation},`, marginL, y);
  y += 8;

  // === Body-Paragraphen ===
  doc.setFontSize(11);
  doc.setTextColor(...DARK_RGB);
  body.paragraphs.forEach((p) => {
    const lines = doc.splitTextToSize(p, contentW);
    doc.text(lines, marginL, y);
    y += lines.length * 5.5 + 4;
  });

  // === Grussformel ===
  y += 6;
  doc.text(body.closing, marginL, y);
  y += 18;
  doc.text("TechAssist – Rached Mtiraoui", marginL, y);

  // === Footer ===
  const footerY = 285;
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.2);
  doc.line(marginL, footerY - 4, pageW - marginR, footerY - 4);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY_RGB);
  doc.text(
    `${SENDER.name}  ·  ${SENDER.address}, ${SENDER.zip}  ·  ${SENDER.phone}  ·  ${SENDER.email}  ·  ${SENDER.web}`,
    pageW / 2,
    footerY,
    { align: "center" },
  );
  doc.text(
    `Bank: ${SENDER.bank}  ·  IBAN: ${SENDER.iban}`,
    pageW / 2,
    footerY + 3.5,
    { align: "center" },
  );

  return doc;
}

export function downloadCoverLetterPdf(
  type: CoverLetterType,
  recipient: CoverLetterRecipient,
  ctx: CoverLetterContext = {},
  filename?: string,
): void {
  const doc = generateCoverLetterPdf(type, recipient, ctx);
  const fname =
    filename ?? `Begleitbrief_${ctx.documentNumber ?? "DERM247"}.pdf`;
  doc.save(fname);
}
