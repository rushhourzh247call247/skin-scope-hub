import jsPDF from "jspdf";

export const PRICE_PER_DOCTOR = 80;

export const PACKAGES = [
  { id: "individual", label: "Einzellizenz", price: "80.–", priceNum: 80, desc: "1–4 Ärzte, je CHF 80.–/Mt.", minDocs: 1, maxDocs: 4, perDoctor: true },
  { id: "pack5", label: "5er-Paket", price: "350.–", priceNum: 350, desc: "5 Ärzte, Festpreis", minDocs: 5, maxDocs: 5, perDoctor: false },
  { id: "medium", label: "6–10 Ärzte", price: "650.–", priceNum: 650, desc: "bis 10 Ärzte, Festpreis", minDocs: 6, maxDocs: 10, perDoctor: false },
  { id: "unlimited", label: "Unbegrenzt", price: "1'200.–", priceNum: 1200, desc: "unbegrenzt, Festpreis", minDocs: 1, maxDocs: 999, perDoctor: false },
];

/** Calculate actual monthly price based on package and doctor count */
export function calcPrice(pkgId: string, doctors: number): { total: number; display: string } {
  const pkg = PACKAGES.find(p => p.id === pkgId);
  if (!pkg) return { total: 0, display: "–" };
  if (pkg.perDoctor) {
    const total = doctors * PRICE_PER_DOCTOR;
    return { total, display: `${total}.–` };
  }
  return { total: pkg.priceNum, display: pkg.price };
}

/** Suggest the best package for a given doctor count */
export function suggestPackage(count: number): string {
  if (count <= 4) return "individual";
  if (count === 5) return "pack5";
  if (count <= 10) return "medium";
  return "unlimited";
}

export function generateContractNumber(): string {
  const year = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 9999) + 1).padStart(4, "0");
  return `V-${year}-${seq}`;
}

const BRAND_RGB: [number, number, number] = [28, 175, 154];

export interface ContractVars {
  vertragsnummer: string;
  kundeName: string;
  kundeAdresse: string;
  paket: string;
  preis: string;
  anzahlAerzte: string;
  datum: string;
  vertragsbeginn: string;
  mwst?: boolean;
}

/**
 * Build contract text as structured sections for proper page-break handling.
 * Each section is { title?: string, lines: string[] }.
 */
function buildContractSections(vars: ContractVars): { title?: string; lines: string[] }[] {
  const mwstHinweis = vars.mwst ? " (exkl. MwSt.)" : "";

  return [
    {
      title: "DERM247 – Softwarelizenzvertrag",
      lines: ["LIZENZVERTRAG", "", `Vertragsnummer: ${vars.vertragsnummer}`],
    },
    {
      lines: [
        "zwischen",
        "",
        "TechAssist",
        "Dällikerstrasse 48",
        "8105 Regensdorf",
        "E-Mail: info@techassist.ch",
        "(nachfolgend «Lizenzgeberin»)",
        "",
        "und",
        "",
        vars.kundeName,
        vars.kundeAdresse,
        "(nachfolgend «Lizenznehmer»)",
      ],
    },
    {
      title: "1. Vertragsgegenstand",
      lines: [
        "Die Lizenzgeberin gewährt dem Lizenznehmer das nicht-exklusive, nicht übertragbare Recht zur Nutzung der Software «DERM247» gemäss den Bedingungen dieses Vertrags.",
      ],
    },
    {
      title: "2. Lizenzumfang",
      lines: [
        `Paket: ${vars.paket}`,
        ...(vars.paket === "Einzellizenz" ? [] : [`Anzahl Ärzte: ${vars.anzahlAerzte}`]),
        `Monatliche Lizenzgebühr: CHF ${vars.preis} / Monat${mwstHinweis}`,
      ],
    },
    {
      title: "3. Laufzeit und Paketänderungen",
      lines: [
        `Der Vertrag beginnt am ${vars.vertragsbeginn}. Die Mindestlaufzeit beträgt 12 Monate. Die Kündigungsfrist beträgt 60 Tage zum Vertragsende. Erfolgt keine fristgerechte Kündigung, verlängert sich der Vertrag automatisch um jeweils 12 Monate.`,
        "",
        "Ein Upgrade auf ein höheres Paket oder zusätzliche Lizenzen ist jederzeit möglich. Die neue Gebühr gilt ab dem Folgemonat. Ein Downgrade ist unter Einhaltung der laufenden Vertragsdauer möglich und wird frühestens zum Ende der aktuellen Laufzeit wirksam.",
      ],
    },
    {
      title: "4. Zahlungsbedingungen",
      lines: [
        "Die Lizenzgebühr wird monatlich im Voraus in Rechnung gestellt und ist innert 30 Tagen nach Rechnungsdatum zahlbar. Bei Zahlungsverzug behält sich die Lizenzgeberin das Recht vor, den Zugang zur Software zu sperren.",
        "",
        "Bankverbindung:",
        "IBAN: CH66 0070 0110 0057 8304 8",
        "Empfänger: Rached Mtiraoui (TechAssist)",
      ],
    },
    {
      title: "5. Datenschutz und Datensicherheit",
      lines: [
        "Die Lizenzgeberin verpflichtet sich, alle im Zusammenhang mit der Nutzung der Software anfallenden Daten gemäss dem Schweizerischen Datenschutzgesetz (DSG) und der DSGVO zu behandeln.",
        "",
        "Die Daten werden ausschliesslich auf Servern in der Schweiz (Infomaniak) gespeichert. Es werden tägliche Backups sowie regelmässige Snapshots durchgeführt. Die Daten werden nicht an Drittanbieter weitergegeben und nicht ausserhalb der Schweiz verarbeitet. Die Übertragung erfolgt verschlüsselt (TLS 1.2 / 1.3).",
        "",
        "Die Nutzung beinhaltet eine angemessene Datenspeicherung im üblichen Rahmen. Bei aussergewöhnlich hohem Speicherbedarf kann eine individuelle Vereinbarung getroffen werden.",
      ],
    },
    {
      title: "6. Gewährleistung, Haftung und Support",
      lines: [
        "Die Lizenzgeberin betreibt die Software nach bestem Wissen und mit aktuellen Sicherheitsstandards. Eine Haftung besteht nur bei grober Fahrlässigkeit oder Vorsatz.",
        "",
        "Keine Haftung besteht insbesondere für:",
        "  •  Fehlbedienung durch den Kunden",
        "  •  Ausfälle durch höhere Gewalt",
        "  •  externe Angriffe trotz Schutzmassnahmen",
        "  •  indirekte Schäden oder Folgeschäden",
        "",
        "Support erfolgt ausschliesslich per E-Mail an info@techassist.ch. Ein Anspruch auf telefonischen oder Live-Support besteht nicht.",
      ],
    },
    {
      title: "7. Geheimhaltung",
      lines: [
        "Beide Parteien verpflichten sich, vertrauliche Informationen der jeweils anderen Partei geheim zu halten und nicht an Dritte weiterzugeben.",
      ],
    },
    {
      title: "8. Schlussbestimmungen",
      lines: [
        "Es gilt Schweizer Recht. Gerichtsstand ist Zürich. Dieser Vertrag wurde in zwei Exemplaren ausgefertigt und von beiden Parteien unterzeichnet.",
      ],
    },
    {
      // Signature block – must NEVER be split across pages
      lines: [
        "",
        "",
        "Ort, Datum: ________________________          Ort, Datum: ________________________",
        "",
        "",
        "Lizenzgeberin:                                 Lizenznehmer:",
        "",
        "Rached Mtiraoui (TechAssist)                   " + vars.kundeName,
        "",
        "",
        "________________________                       ________________________",
        "Unterschrift                                   Unterschrift",
      ],
    },
  ];
}

function drawLogo(doc: jsPDF, x: number, y: number) {
  doc.setFillColor(...BRAND_RGB);
  doc.roundedRect(x, y, 8, 8, 1.5, 1.5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("D", x + 2.3, y + 6);

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("DERM", x + 10.5, y + 6.5);
  const dw = doc.getTextWidth("DERM");
  doc.setTextColor(200, 245, 230);
  doc.text("247", x + 10.5 + dw, y + 6.5);
}

function drawHeader(doc: jsPDF, vertragsnummer: string) {
  doc.setFillColor(...BRAND_RGB);
  doc.rect(0, 0, 210, 20, "F");
  drawLogo(doc, 14, 5.5);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(vertragsnummer, 195, 13, { align: "right" });
}

function drawFooter(doc: jsPDF, vertragsnummer: string, pageNum: number, totalPages: number) {
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `DERM247 – Lizenzvertrag | ${vertragsnummer} | Seite ${pageNum} von ${totalPages}`,
    17,
    290,
  );
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(17, 287, 193, 287);
}

const PAGE_TOP = 28;
const PAGE_BOTTOM = 278;
const LINE_HEIGHT = 5;
const SECTION_GAP = 4;
const LEFT_MARGIN = 17;
const TEXT_WIDTH = 175;

/**
 * Render contract sections onto an existing jsPDF doc.
 * Returns the page numbers used (for footer rendering).
 */
export function renderContractPages(doc: jsPDF, vars: ContractVars, startOnNewPage = true): { firstPage: number; lastPage: number } {
  const sections = buildContractSections(vars);

  if (startOnNewPage) {
    doc.addPage();
  }
  const firstPage = doc.getNumberOfPages();

  drawHeader(doc, vars.vertragsnummer);

  let y = PAGE_TOP + 4;

  for (const section of sections) {
    const sectionLines: { text: string; style: string; size: number; color: [number, number, number] }[] = [];

    if (section.title) {
      if (section.title === "DERM247 – Softwarelizenzvertrag") {
        sectionLines.push({ text: section.title, style: "normal", size: 9, color: [100, 100, 100] });
      } else {
        sectionLines.push({ text: section.title, style: "bold", size: 11, color: [30, 30, 30] });
      }
    }

    for (const rawLine of section.lines) {
      const wrapped = doc.splitTextToSize(rawLine || " ", TEXT_WIDTH) as string[];
      for (const w of wrapped) {
        let style = "normal";
        let size = 10;
        let color: [number, number, number] = [30, 30, 30];

        if (w === "LIZENZVERTRAG") {
          style = "bold";
          size = 16;
        } else if (w.startsWith("Vertragsnummer:")) {
          style = "bold";
          size = 9;
          color = [100, 100, 100];
        } else if (w === "zwischen" || w === "und") {
          style = "italic";
        }
        sectionLines.push({ text: w, style, size, color });
      }
    }

    const sectionHeight = sectionLines.length * LINE_HEIGHT + SECTION_GAP;
    const remainingSpace = PAGE_BOTTOM - y;

    // If section doesn't fit OR less than 25mm (~5 lines) remaining, start new page
    if ((y + sectionHeight > PAGE_BOTTOM || remainingSpace < 25) && y > PAGE_TOP + 10) {
      doc.addPage();
      drawHeader(doc, vars.vertragsnummer);
      y = PAGE_TOP;
    }

    for (const ln of sectionLines) {
      if (y > PAGE_BOTTOM) {
        doc.addPage();
        drawHeader(doc, vars.vertragsnummer);
        y = PAGE_TOP;
      }
      doc.setFont("helvetica", ln.style as any);
      doc.setFontSize(ln.size);
      doc.setTextColor(...ln.color);
      doc.text(ln.text, LEFT_MARGIN, y);
      y += LINE_HEIGHT;
    }

    y += SECTION_GAP;
  }

  const lastPage = doc.getNumberOfPages();

  // Draw contract footers on contract pages only
  const contractPageCount = lastPage - firstPage + 1;
  for (let i = 0; i < contractPageCount; i++) {
    doc.setPage(firstPage + i);
    drawFooter(doc, vars.vertragsnummer, i + 1, contractPageCount);
  }

  return { firstPage, lastPage };
}

export function buildContractPdf(vars: ContractVars): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  renderContractPages(doc, vars, false);
  return doc;
}
