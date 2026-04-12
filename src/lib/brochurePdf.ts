import jsPDF from "jspdf";
import { PACKAGES } from "./contractPdf";

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

function drawHeader(doc: jsPDF) {
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, 210, 36, "F");

  // Logo square
  doc.setFillColor(...WHITE);
  doc.roundedRect(LEFT, 8, 10, 10, 2, 2, "F");
  doc.setTextColor(...BRAND);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("D", LEFT + 3, 15.5);

  // Title
  doc.setTextColor(...WHITE);
  doc.setFontSize(22);
  doc.text("DERM247", LEFT + 14, 15.5);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Digitale Hautdokumentation für moderne Praxen", LEFT + 14, 22);

  doc.setFontSize(7.5);
  doc.text("Schweizer Hosting  •  DSG konform  •  Für medizinische Praxen entwickelt", LEFT + 14, 28);
}

function drawFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  const y = 282;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(LEFT, y, RIGHT, y);

  doc.setFontSize(7);
  doc.setTextColor(...GRAY);
  doc.text(
    "Derm247 | TechAssist | info@techassist.ch | derm247.ch",
    LEFT, y + 5,
  );
  doc.text(`Seite ${pageNum} von ${totalPages}`, RIGHT, y + 5, { align: "right" });
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

function drawPage1(doc: jsPDF) {
  drawHeader(doc);
  let y = 48; // extra breathing room for premium feel

  // ── Nutzen (Benefits) ──
  y = sectionTitle(doc, y, "Ihr Nutzen");
  const benefits = [
    "Schnellere Diagnosen durch digitale Verlaufsdokumentation",
    "Klare Verlaufskontrolle mit Bildvergleich",
    "Weniger administrativer Aufwand",
    "Sichere Speicherung ausschliesslich in der Schweiz",
  ];
  for (const b of benefits) {
    bulletCircle(doc, LEFT, y, b);
    y += 6.5;
  }
  y += 4;

  // ── Zielgruppe ──
  y = sectionTitle(doc, y, "Für wen?");
  const audiences = ["Dermatologen", "Hausärzte mit Hautsprechstunde", "Gemeinschaftspraxen", "Kliniken"];
  for (const a of audiences) {
    bulletDash(doc, LEFT + 2, y, a);
    y += 5.5;
  }
  y += 4;

  // ── Warum Derm247 ──
  y = sectionTitle(doc, y, "Warum Derm247?");
  const reasons = [
    "Schweizer Hosting (Infomaniak) – keine Daten im Ausland",
    "QR-basierter Foto-Upload direkt vom Smartphone",
    "Interaktive 3D-Body-Map zur Lokalisierung",
    "Zeitlicher Bildvergleich mit Overlay-Slider",
    "PDF-Berichte für Patienten & Zuweiser",
  ];
  for (const r of reasons) {
    bulletCircle(doc, LEFT, y, r);
    y += 6.5;
  }
  y += 6;

  // ── Preise (compact cards) ──
  y = sectionTitle(doc, y, "Pakete & Preise");
  const cardW = (W - 6) / 2;

  for (let i = 0; i < PACKAGES.length; i++) {
    const pkg = PACKAGES[i];
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = LEFT + col * (cardW + 6);
    const cy = y + row * 42;
    const isPopular = pkg.id === "small";

    // Card bg
    if (isPopular) {
      doc.setFillColor(...BRAND);
    } else {
      doc.setFillColor(...LIGHT_BG);
    }
    doc.roundedRect(cx, cy, cardW, 37, 3, 3, "F");

    // Popular badge
    if (isPopular) {
      doc.setFontSize(7);
      doc.setTextColor(...WHITE);
      doc.setFont("helvetica", "bold");
      doc.text("BELIEBT", cx + cardW - 6, cy + 6, { align: "right" });
    }

    // Name
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    color(doc, isPopular ? WHITE : DARK);
    doc.text(pkg.label, cx + 5, cy + 11);

    // Desc
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    color(doc, isPopular ? [220, 245, 240] : GRAY);
    doc.text(pkg.desc, cx + 5, cy + 17);

    // Price
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    color(doc, isPopular ? WHITE : BRAND);
    doc.text(`CHF ${pkg.price}`, cx + 5, cy + 28);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    color(doc, isPopular ? [220, 245, 240] : GRAY);
    doc.text("pro Monat", cx + 5, cy + 33);
  }

  y += 42 * 2 + 6;

  // ── Kleingedrucktes (footer area) ──
  doc.setFillColor(...LIGHT_BG);
  doc.roundedRect(LEFT, y, W, 22, 2, 2, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  color(doc, GRAY);
  const fine = [
    "Mindestlaufzeit: 12 Monate  |  Kündigungsfrist: 60 Tage  |  Monatliche Abrechnung im Voraus",
    "Fair-Use Speicherregelung  |  Upgrade jederzeit möglich  |  Änderungen vorbehalten",
  ];
  doc.text(fine[0], LEFT + 4, y + 7);
  doc.text(fine[1], LEFT + 4, y + 12);

  // Unverbindlichkeits-Hinweis
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  color(doc, GRAY);
  doc.text("Unverbindliches Angebot – Änderungen vorbehalten", LEFT + 4, y + 17);
}

// ── PAGE 2 ─────────────────────────────────────────────────────

function drawPage2(doc: jsPDF) {
  drawHeader(doc);
  let y = 44;

  // ── Enthaltene Funktionen ──
  y = sectionTitle(doc, y, "Enthaltene Funktionen (alle Pakete)");
  const features = [
    "Patientenverwaltung mit Suchfunktion",
    "Interaktive 3D-Körperkarte (Body-Map)",
    "Mobiler Foto-Upload via QR-Code",
    "ABCDE-Bewertung für Hautläsionen",
    "Zeitlicher Bildvergleich (Overlay-Slider)",
    "PDF-Berichte für Patienten & Zuweiser",
    "E-Mail-Support",
    "Tägliche Backups & Snapshots",
  ];
  for (const f of features) {
    bulletCircle(doc, LEFT, y, f);
    y += 6.5;
  }
  y += 6;

  // ── Datenschutz ──
  y = sectionTitle(doc, y, "Datenschutz & Sicherheit");
  const security = [
    "Hosting ausschliesslich in der Schweiz (Infomaniak)",
    "Keine Datenweitergabe an Dritte",
    "Keine Verarbeitung ausserhalb der Schweiz",
    "Konform mit DSG und DSGVO",
    "Verschlüsselte Übertragung (TLS 1.2 / 1.3)",
    "Tägliche Backups & regelmässige Snapshots",
  ];
  for (const s of security) {
    doc.setFillColor(...BRAND_DARK);
    doc.rect(LEFT, y - 2.5, 3, 3, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    color(doc, DARK);
    doc.text(s, LEFT + 7, y);
    y += 6.5;
  }
  y += 10;

  // ── Kontakt ──
  doc.setFillColor(...BRAND);
  doc.roundedRect(LEFT, y, W, 30, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...WHITE);
  doc.text("Kontakt & nächste Schritte", LEFT + 8, y + 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Gerne erstellen wir Ihnen ein individuelles Angebot oder einen Testaccount.", LEFT + 8, y + 17);
  doc.text("Testzugang auf Anfrage verfügbar.", LEFT + 8, y + 23);
  doc.text("E-Mail: info@techassist.ch  |  Web: derm247.ch", LEFT + 8, y + 29);

  // Contact box is taller now
  // Footer drawn separately via drawAllFooters
}

// ── Public API ─────────────────────────────────────────────────

/** Draw brochure-style footers on given page range */
export function drawBrochureFooters(doc: jsPDF, fromPage: number, toPage: number, totalPages: number) {
  for (let i = fromPage; i <= toPage; i++) {
    doc.setPage(i);
    drawFooter(doc, i, totalPages);
  }
}

/** Standalone 2-page brochure */
export function buildBrochurePdf(): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  drawPage1(doc);
  doc.addPage();
  drawPage2(doc);
  // Draw footers with standalone page count
  drawBrochureFooters(doc, 1, 2, 2);
  return doc;
}

/** Append brochure pages to an existing jsPDF doc (for combined PDF) */
export function appendBrochurePages(doc: jsPDF) {
  doc.addPage();
  drawPage1(doc);
  doc.addPage();
  drawPage2(doc);
}
}
