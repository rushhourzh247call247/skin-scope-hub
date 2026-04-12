import jsPDF from "jspdf";
import { PACKAGES } from "./contractPdf";
import { getPdfTexts, type PdfLang } from "./pdfTranslations";

const BRAND: [number, number, number] = [28, 175, 154];
const BRAND_DARK: [number, number, number] = [20, 130, 115];
const DARK: [number, number, number] = [30, 30, 30];
const GRAY: [number, number, number] = [100, 100, 100];
const WHITE: [number, number, number] = [255, 255, 255];
const LIGHT_BG: [number, number, number] = [245, 247, 249];

const LEFT = 17;
const RIGHT = 193;
const W = RIGHT - LEFT;

function color(doc: jsPDF, c: [number, number, number]) {
  doc.setTextColor(c[0], c[1], c[2]);
}

// ── Shared chrome ──────────────────────────────────────────────

function drawHeader(doc: jsPDF, lang: PdfLang) {
  const t = getPdfTexts(lang);
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, 210, 36, "F");

  doc.setFillColor(...WHITE);
  doc.roundedRect(LEFT, 8, 10, 10, 2, 2, "F");
  doc.setTextColor(...BRAND);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("D", LEFT + 3, 15.5);

  doc.setFontSize(22);
  doc.setTextColor(...WHITE);
  doc.text("DERM", LEFT + 14, 15.5);
  const dermW = doc.getTextWidth("DERM");
  doc.setTextColor(200, 245, 230);
  doc.text("247", LEFT + 14 + dermW, 15.5);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(t.headerSubtitle, LEFT + 14, 22);

  doc.setFontSize(7.5);
  doc.text(t.headerTrust, LEFT + 14, 28);
}

function drawFooter(doc: jsPDF, pageNum: number, totalPages: number, lang: PdfLang) {
  const t = getPdfTexts(lang);
  const y = 282;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(LEFT, y, RIGHT, y);

  doc.setFontSize(7);
  doc.setTextColor(...GRAY);
  doc.text(t.footerLine, LEFT, y + 5);
  doc.text(t.pageOf(pageNum, totalPages), RIGHT, y + 5, { align: "right" });
}

// ── Bullet helpers ─────────────────────────────────────────────

function bulletCircle(doc: jsPDF, x: number, y: number, text: string) {
  doc.setFillColor(...BRAND);
  doc.circle(x + 2, y - 1.2, 1.5, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  color(doc, DARK);
  doc.text(text, x + 7, y);
}

function bulletDash(doc: jsPDF, x: number, y: number, text: string, textColor = DARK) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  color(doc, textColor);
  doc.text("–  " + text, x, y);
}

// ── Section heading ────────────────────────────────────────────

function sectionTitle(doc: jsPDF, y: number, title: string): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  color(doc, BRAND);
  doc.text(title, LEFT, y);
  return y + 7;
}

// ── PAGE 1 ─────────────────────────────────────────────────────

function drawPage1(doc: jsPDF, lang: PdfLang) {
  const t = getPdfTexts(lang);
  drawHeader(doc, lang);
  let y = 48;

  y = sectionTitle(doc, y, t.benefitsTitle);
  for (const b of t.benefits) {
    bulletCircle(doc, LEFT, y, b);
    y += 6.5;
  }
  y += 4;

  y = sectionTitle(doc, y, t.audienceTitle);
  for (const a of t.audiences) {
    bulletDash(doc, LEFT + 2, y, a);
    y += 5.5;
  }
  y += 4;

  y = sectionTitle(doc, y, t.whyTitle);
  for (const r of t.reasons) {
    bulletCircle(doc, LEFT, y, r);
    y += 6.5;
  }
  y += 6;

  y = sectionTitle(doc, y, t.packagesTitle);
  const cardW = (W - 6) / 2;

  for (let i = 0; i < PACKAGES.length; i++) {
    const pkg = PACKAGES[i];
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = LEFT + col * (cardW + 6);
    const cy = y + row * 42;
    const isPopular = pkg.id === "pack5";

    if (isPopular) {
      doc.setFillColor(...BRAND);
    } else {
      doc.setFillColor(...LIGHT_BG);
    }
    doc.roundedRect(cx, cy, cardW, 37, 3, 3, "F");

    if (isPopular) {
      doc.setFontSize(7);
      doc.setTextColor(...WHITE);
      doc.setFont("helvetica", "bold");
      doc.text(t.popularBadge, cx + cardW - 6, cy + 6, { align: "right" });
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    color(doc, isPopular ? WHITE : DARK);
    doc.text(pkg.label, cx + 5, cy + 11);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    color(doc, isPopular ? [220, 245, 240] : GRAY);
    doc.text(pkg.desc, cx + 5, cy + 17);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    color(doc, isPopular ? WHITE : BRAND);
    doc.text(pkg.perDoctor ? `CHF ${pkg.price}${t.perDoctor}` : `CHF ${pkg.price}`, cx + 5, cy + 28);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    color(doc, isPopular ? [220, 245, 240] : GRAY);
    doc.text(t.perMonth, cx + 5, cy + 33);
  }

  y += 42 * 2 + 6;

  doc.setFillColor(...LIGHT_BG);
  doc.roundedRect(LEFT, y, W, 22, 2, 2, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  color(doc, GRAY);
  doc.text(t.fineprint[0], LEFT + 4, y + 7);
  doc.text(t.fineprint[1], LEFT + 4, y + 12);

  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  color(doc, GRAY);
  doc.text(t.nonBinding, LEFT + 4, y + 17);
}

// ── PAGE 2 ─────────────────────────────────────────────────────

function drawPage2(doc: jsPDF, lang: PdfLang) {
  const t = getPdfTexts(lang);
  drawHeader(doc, lang);
  let y = 44;

  y = sectionTitle(doc, y, t.featuresTitle);
  for (const f of t.features) {
    bulletCircle(doc, LEFT, y, f);
    y += 6;
  }
  y += 4;

  doc.setFillColor(245, 247, 249);
  doc.roundedRect(LEFT, y, W, 16, 2, 2, "F");
  doc.setFillColor(...BRAND);
  doc.roundedRect(LEFT + 4, y + 3, 34, 5, 1, 1, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(...WHITE);
  doc.text(t.inDevelopment, LEFT + 6, y + 6.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  color(doc, DARK);
  doc.text(t.aiFeatureTitle, LEFT + 41, y + 7);
  doc.setFontSize(7.5);
  color(doc, GRAY);
  doc.text(t.aiFeatureDesc, LEFT + 41, y + 12.5);
  y += 22;

  y = sectionTitle(doc, y, t.securityTitle);
  for (const s of t.securityItems) {
    doc.setFillColor(...BRAND_DARK);
    doc.rect(LEFT, y - 2.5, 3, 3, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    color(doc, DARK);
    doc.text(s, LEFT + 7, y);
    y += 6;
  }
  y += 8;

  doc.setFillColor(...BRAND);
  doc.roundedRect(LEFT, y, W, 30, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...WHITE);
  doc.text(t.contactTitle, LEFT + 8, y + 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(t.contactLine1, LEFT + 8, y + 17);
  doc.text(t.contactLine2, LEFT + 8, y + 23);
  doc.text(t.contactLine3, LEFT + 8, y + 29);
}

// ── Public API ─────────────────────────────────────────────────

export function drawBrochureFooters(doc: jsPDF, fromPage: number, toPage: number, totalPages: number, lang: PdfLang = "de") {
  for (let i = fromPage; i <= toPage; i++) {
    doc.setPage(i);
    drawFooter(doc, i, totalPages, lang);
  }
}

export function buildBrochurePdf(lang: PdfLang = "de"): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  drawPage1(doc, lang);
  doc.addPage();
  drawPage2(doc, lang);
  drawBrochureFooters(doc, 1, 2, 2, lang);
  return doc;
}

export function appendBrochurePages(doc: jsPDF, lang: PdfLang = "de") {
  doc.addPage();
  drawPage1(doc, lang);
  doc.addPage();
  drawPage2(doc, lang);
}
