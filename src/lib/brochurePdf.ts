import jsPDF from "jspdf";
import { PACKAGES } from "./contractPdf";

const BRAND_RGB: [number, number, number] = [28, 175, 154];
const BRAND_DARK: [number, number, number] = [20, 130, 115];
const DARK: [number, number, number] = [30, 30, 30];
const GRAY: [number, number, number] = [100, 100, 100];
const WHITE: [number, number, number] = [255, 255, 255];
const LIGHT_TINT: [number, number, number] = [220, 245, 240];

function setColor(doc: jsPDF, color: [number, number, number]) {
  doc.setTextColor(color[0], color[1], color[2]);
}

const LEFT = 17;
const RIGHT_LIMIT = 193;
const CONTENT_WIDTH = RIGHT_LIMIT - LEFT;

function drawBrochureHeader(doc: jsPDF) {
  // Full-width brand bar
  doc.setFillColor(...BRAND_RGB);
  doc.rect(0, 0, 210, 36, "F");

  // Logo square
  doc.setFillColor(...WHITE);
  doc.roundedRect(LEFT, 8, 10, 10, 2, 2, "F");
  doc.setTextColor(...BRAND_RGB);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("D", LEFT + 3, 15.5);

  // Title
  doc.setTextColor(...WHITE);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("DERM247", LEFT + 14, 15.5);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Softwarelösung für die Dermatologie", LEFT + 14, 22);

  doc.setFontSize(8);
  doc.text("Produkt- & Preisübersicht", LEFT + 14, 28);
}

function drawBrochureFooter(doc: jsPDF) {
  const y = 282;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(LEFT, y, RIGHT_LIMIT, y);

  doc.setFontSize(7);
  doc.setTextColor(...GRAY);
  doc.text("Derm247 – TechAssist | Dällikerstrasse 48, 8105 Regensdorf | info@techassist.ch", LEFT, y + 5);
  doc.text(`Stand: ${new Date().toLocaleDateString("de-CH")}`, RIGHT_LIMIT, y + 5, { align: "right" });
}

/** Features included in all packages */
const BASE_FEATURES = [
  "Patientenverwaltung mit Suchfunktion",
  "Interaktive 3D-Körperkarte (Body-Map)",
  "Mobiler Foto-Upload via QR-Code",
  "ABCDE-Bewertung für Hautläsionen",
  "Zeitlicher Bildvergleich (Overlay-Slider)",
  "PDF-Berichte für Patienten & Zuweiser",
  "Schweizer Hosting (Infomaniak)",
  "Tägliche Backups & Snapshots",
  "Verschlüsselte Datenübertragung (TLS 1.2/1.3)",
  "E-Mail-Support",
];

/** Extra features per package tier */
const TIER_FEATURES: Record<string, string[]> = {
  single: [],
  small: ["Mehrbenutzerverwaltung", "Gemeinsame Patientendaten"],
  medium: ["Mehrbenutzerverwaltung", "Gemeinsame Patientendaten", "Prioritäts-Support"],
  unlimited: ["Mehrbenutzerverwaltung", "Gemeinsame Patientendaten", "Prioritäts-Support", "Individuelle Anpassungen auf Anfrage"],
};

export function buildBrochurePdf(): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  // ─── PAGE 1: Header + Intro + Package overview ───
  drawBrochureHeader(doc);

  let y = 46;

  // Intro text
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  const intro =
    "Derm247 ist eine spezialisierte Softwarelösung für dermatologische Praxen in der Schweiz. " +
    "Sie ermöglicht die digitale Erfassung, Dokumentation und Nachverfolgung von Hautveränderungen – " +
    "sicher, effizient und DSGVO-konform.";
  const introLines = doc.splitTextToSize(intro, CONTENT_WIDTH) as string[];
  for (const line of introLines) {
    doc.text(line, LEFT, y);
    y += 5;
  }
  y += 6;

  // ─── Package cards ───
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...BRAND_RGB);
  doc.text("Unsere Pakete", LEFT, y);
  y += 8;

  const cardWidth = (CONTENT_WIDTH - 6) / 2; // 2 columns with 6mm gap
  const cardPadding = 5;

  for (let i = 0; i < PACKAGES.length; i++) {
    const pkg = PACKAGES[i];
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = LEFT + col * (cardWidth + 6);
    const cy = y + row * 62;

    // Card background
    const isHighlighted = pkg.id === "small"; // highlight popular package
    if (isHighlighted) {
      doc.setFillColor(...BRAND_RGB);
    } else {
      doc.setFillColor(245, 247, 249);
    }
    doc.roundedRect(cx, cy, cardWidth, 56, 3, 3, "F");

    // Popular badge
    if (isHighlighted) {
      doc.setFontSize(7);
      doc.setTextColor(...WHITE);
      doc.setFont("helvetica", "bold");
      doc.text("BELIEBT", cx + cardWidth - cardPadding - 1, cy + 6, { align: "right" });
    }

    // Package name
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(isHighlighted ? WHITE : DARK);
    doc.text(pkg.label, cx + cardPadding, cy + 12);

    // Description
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(isHighlighted ? [220, 245, 240] : GRAY);
    doc.text(pkg.desc, cx + cardPadding, cy + 19);

    // Price
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(isHighlighted ? WHITE : BRAND_RGB);
    doc.text(`CHF ${pkg.price}`, cx + cardPadding, cy + 32);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(isHighlighted ? [220, 245, 240] : GRAY);
    doc.text("pro Monat", cx + cardPadding, cy + 38);

    // Extra features for this tier
    const extras = TIER_FEATURES[pkg.id] || [];
    let fy = cy + 44;
    doc.setFontSize(7.5);
    for (const feat of extras.slice(0, 2)) {
      doc.setTextColor(isHighlighted ? [220, 245, 240] : GRAY);
      doc.text(`+ ${feat}`, cx + cardPadding, fy);
      fy += 4;
    }
  }

  y += 62 * 2 + 10; // after 2 rows of cards

  // ─── Key info box ───
  doc.setFillColor(245, 247, 249);
  doc.roundedRect(LEFT, y, CONTENT_WIDTH, 20, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  doc.text("Vertragsbedingungen", LEFT + 5, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text("Mindestlaufzeit: 12 Monate  |  Kündigungsfrist: 60 Tage  |  Upgrade jederzeit möglich", LEFT + 5, y + 13);

  drawBrochureFooter(doc);

  // ─── PAGE 2: Features ───
  doc.addPage();
  drawBrochureHeader(doc);
  y = 46;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...BRAND_RGB);
  doc.text("Enthaltene Funktionen – alle Pakete", LEFT, y);
  y += 8;

  // Feature list with checkmarks
  for (const feat of BASE_FEATURES) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...BRAND_RGB);
    doc.text("✓", LEFT, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...DARK);
    doc.text(feat, LEFT + 7, y);
    y += 7;
  }

  y += 8;

  // ─── Data protection section ───
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...BRAND_RGB);
  doc.text("Datenschutz & Sicherheit", LEFT, y);
  y += 8;

  const securityPoints = [
    "Hosting ausschliesslich in der Schweiz (Infomaniak)",
    "Keine Datenweitergabe an Dritte",
    "Keine Verarbeitung ausserhalb der Schweiz",
    "Konform mit DSG und DSGVO",
    "Verschlüsselte Übertragung (TLS 1.2 / 1.3)",
    "Tägliche Backups & regelmässige Snapshots",
  ];

  for (const point of securityPoints) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...BRAND_DARK);
    doc.text("🔒", LEFT, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...DARK);
    doc.text(point, LEFT + 8, y);
    y += 7;
  }

  y += 10;

  // ─── Contact section ───
  doc.setFillColor(...BRAND_RGB);
  doc.roundedRect(LEFT, y, CONTENT_WIDTH, 30, 3, 3, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...WHITE);
  doc.text("Kontakt & nächste Schritte", LEFT + 8, y + 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Gerne erstellen wir Ihnen ein individuelles Angebot oder einen Testaccount.", LEFT + 8, y + 17);
  doc.text("E-Mail: info@techassist.ch  |  Web: derm247.ch", LEFT + 8, y + 23);

  drawBrochureFooter(doc);

  return doc;
}
