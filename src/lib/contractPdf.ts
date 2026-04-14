import jsPDF from "jspdf";
import { getPdfTexts, type PdfLang } from "./pdfTranslations";

export const PRICE_PER_DOCTOR = 80;

export const PACKAGES = [
  { id: "individual", label: "Einzellizenz", price: "80.–", priceNum: 80, desc: "1–4 Ärzte, je CHF 80.–/Mt.", minDocs: 1, maxDocs: 4, perDoctor: true },
  { id: "pack5", label: "5er-Paket", price: "350.–", priceNum: 350, desc: "5 Ärzte, Festpreis", minDocs: 5, maxDocs: 5, perDoctor: false },
  { id: "medium", label: "6–10 Ärzte", price: "650.–", priceNum: 650, desc: "bis 10 Ärzte, Festpreis", minDocs: 6, maxDocs: 10, perDoctor: false },
  { id: "unlimited", label: "Unbegrenzt", price: "1'200.–", priceNum: 1200, desc: "unbegrenzt, Festpreis", minDocs: 1, maxDocs: 999, perDoctor: false },
];

export function calcPrice(pkgId: string, doctors: number): { total: number; display: string } {
  const pkg = PACKAGES.find(p => p.id === pkgId);
  if (!pkg) return { total: 0, display: "–" };
  if (pkg.perDoctor) {
    const total = doctors * PRICE_PER_DOCTOR;
    return { total, display: `${total}.–` };
  }
  return { total: pkg.priceNum, display: pkg.price };
}

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
  lang?: PdfLang;
}

function buildContractSections(vars: ContractVars): { title?: string; lines: string[] }[] {
  const lang = vars.lang || "de";
  const t = getPdfTexts(lang);
  const mwstHinweis = vars.mwst ? t.exclVat : "";

  // Map German package id to translated label
  const pkgIdMap: Record<string, keyof typeof t.packages> = {
    "Einzellizenz": "individual",
    "5er-Paket": "pack5",
    "6–10 Ärzte": "medium",
    "Unbegrenzt": "unlimited",
  };
  const pkgKey = pkgIdMap[vars.paket] || "individual";
  const translatedPaket = t.packages[pkgKey].label;
  const isIndividual = pkgKey === "individual";

  const andWord = { de: "und", en: "and", fr: "et", it: "e", es: "y" }[lang] || "und";
  const monthWord = { de: "Monat", en: "month", fr: "mois", it: "mese", es: "mes" }[lang] || "Monat";

  return [
    {
      title: t.contractTitle,
      lines: [t.contractLabel, "", `${t.contractNumberLabel}: ${vars.vertragsnummer}`],
    },
    {
      lines: [
        t.between,
        "",
        "TechAssist",
        "Dällikerstrasse 48",
        "8105 Regensdorf",
        "E-Mail: info@techassist.ch",
        t.licensor,
        "",
        andWord,
        "",
        vars.kundeName,
        vars.kundeAdresse,
        t.licensee,
      ],
    },
    {
      title: t.section1Title,
      lines: [t.section1Text],
    },
    {
      title: t.section2Title,
      lines: [
        `${t.packageLabel}: ${translatedPaket}`,
        ...(isIndividual ? [] : [`${t.doctorCountLabel}: ${vars.anzahlAerzte}`]),
        `${t.monthlyFeeLabel}: CHF ${vars.preis} / ${monthWord}${mwstHinweis}`,
      ],
    },
    {
      title: t.section3Title,
      lines: [
        t.section3Text1(vars.vertragsbeginn),
        "",
        t.section3Text2,
      ],
    },
    {
      title: t.section4Title,
      lines: [
        t.section4Text,
        "",
        t.bankDetails,
        t.iban,
        t.recipient,
      ],
    },
    {
      title: t.section5Title,
      lines: [
        t.section5Text1,
        "",
        t.section5Text2,
        "",
        t.section5Text3,
      ],
    },
    {
      title: t.section6Title,
      lines: [
        t.section6Text1,
        "",
        t.section6NoLiability,
        ...t.section6Bullets.map(b => `  •  ${b}`),
        "",
        t.section6Support,
      ],
    },
    {
      title: t.section7Title,
      lines: [t.section7Text],
    },
    {
      title: t.section8Title,
      lines: [t.section8Text],
    },
    {
      lines: [
        "",
        "",
        `${t.placeDateLabel}: ________________________          ${t.placeDateLabel}: ________________________`,
        "",
        "",
        `${t.licensorLabel}:                                 ${t.licenseeLabel}:`,
        "",
        "Rached Mtiraoui (TechAssist)                   " + vars.kundeName,
        "",
        "",
        `________________________                       ________________________`,
        `${t.signatureLabel}                                   ${t.signatureLabel}`,
      ],
    },
  ];
}

function drawContractHeader(doc: jsPDF, vertragsnummer: string, lang: PdfLang = "de") {
  const t = getPdfTexts(lang);
  // Same tall header as brochure (36mm)
  doc.setFillColor(...BRAND_RGB);
  doc.rect(0, 0, 210, 36, "F");

  // Logo icon
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(17, 8, 10, 10, 2, 2, "F");
  doc.setTextColor(...BRAND_RGB);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("D", 20, 15.5);

  // DERM247
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text("DERM", 31, 15.5);
  const dermW = doc.getTextWidth("DERM");
  doc.setTextColor(200, 245, 230);
  doc.text("247", 31 + dermW, 15.5);

  // Subtitle
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(255, 255, 255);
  doc.text(t.headerSubtitle, 31, 22);

  // Contract number right-aligned
  doc.setFontSize(8);
  doc.text(vertragsnummer, 193, 15.5, { align: "right" });
}

function drawContractFooter(doc: jsPDF, pageNum: number, totalPages: number, lang: PdfLang = "de") {
  const t = getPdfTexts(lang);
  const y = 282;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(17, y, 193, y);

  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text(t.footerLine, 17, y + 5);
  doc.text(t.pageOf(pageNum, totalPages), 193, y + 5, { align: "right" });
}

const PAGE_TOP = 42;
const PAGE_BOTTOM = 278;
const LINE_HEIGHT = 5;
const SECTION_GAP = 4;
const LEFT_MARGIN = 17;
const TEXT_WIDTH = 175;
const TEXT_WIDTH = 175;

export function renderContractPages(doc: jsPDF, vars: ContractVars, startOnNewPage = true): { firstPage: number; lastPage: number } {
  const sections = buildContractSections(vars);

  if (startOnNewPage) {
    doc.addPage();
  }
  const firstPage = doc.getNumberOfPages();

  drawContractHeader(doc, vars.vertragsnummer, vars.lang);

  let y = PAGE_TOP + 4;

  for (const section of sections) {
    const sectionLines: { text: string; style: string; size: number; color: [number, number, number] }[] = [];

    if (section.title) {
      const t = getPdfTexts(vars.lang || "de");
      if (section.title === t.contractTitle) {
        sectionLines.push({ text: section.title, style: "normal", size: 9, color: [100, 100, 100] });
      } else {
        sectionLines.push({ text: section.title, style: "bold", size: 11, color: [30, 30, 30] });
      }
    }

    for (const rawLine of section.lines) {
      const wrapped = doc.splitTextToSize(rawLine || " ", TEXT_WIDTH) as string[];
      const t = getPdfTexts(vars.lang || "de");
      for (const w of wrapped) {
        let style = "normal";
        let size = 10;
        let color: [number, number, number] = [30, 30, 30];

        if (w === t.contractLabel) {
          style = "bold";
          size = 16;
        } else if (w.startsWith(`${t.contractNumberLabel}:`)) {
          style = "bold";
          size = 9;
          color = [100, 100, 100];
        } else if (w === t.between || w === "und" || w === "et" || w === "e" || w === "and" || w === "y") {
          style = "italic";
        }
        sectionLines.push({ text: w, style, size, color });
      }
    }

    const sectionHeight = sectionLines.length * LINE_HEIGHT + SECTION_GAP;
    const remainingSpace = PAGE_BOTTOM - y;

    if ((y + sectionHeight > PAGE_BOTTOM || remainingSpace < 25) && y > PAGE_TOP + 10) {
      doc.addPage();
      drawContractHeader(doc, vars.vertragsnummer, vars.lang);
      y = PAGE_TOP;
    }

    for (const ln of sectionLines) {
      if (y > PAGE_BOTTOM) {
        doc.addPage();
        drawContractHeader(doc, vars.vertragsnummer, vars.lang);
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

  const contractPageCount = lastPage - firstPage + 1;
  for (let i = 0; i < contractPageCount; i++) {
    doc.setPage(firstPage + i);
    drawContractFooter(doc, i + 1, contractPageCount, vars.lang);
  }

  return { firstPage, lastPage };
}

export function buildContractPdf(vars: ContractVars): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  renderContractPages(doc, vars, false);
  return doc;
}
