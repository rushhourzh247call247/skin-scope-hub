import jsPDF from "jspdf";
import { renderContractPages, type ContractVars } from "./contractPdf";
import { buildBrochurePdf, drawBrochureFooters } from "./brochurePdf";
import { getPdfTexts, type PdfLang } from "./pdfTranslations";

/**
 * Build a combined PDF: Brochure (2 pages) + Contract (3+ pages).
 * Durchgehende Seitennummerierung über das gesamte Dokument.
 */
export function buildCombinedPdf(vars: ContractVars): jsPDF {
  const lang = (vars.lang || "de") as PdfLang;
  const t = getPdfTexts(lang);

  const brochure = buildBrochurePdf(lang);

  // Append contract pages onto brochure doc
  renderContractPages(brochure, vars, true);

  const totalPages = brochure.getNumberOfPages();

  // Unified footers across all pages (same style)
  for (let i = 1; i <= totalPages; i++) {
    brochure.setPage(i);
    // Clear old footer area
    brochure.setFillColor(255, 255, 255);
    brochure.rect(0, 278, 210, 20, "F");
    // Draw unified footer
    brochure.setDrawColor(200, 200, 200);
    brochure.setLineWidth(0.2);
    brochure.line(17, 282, 193, 282);
    brochure.setFontSize(7);
    brochure.setTextColor(100, 100, 100);
    brochure.text(t.footerLine, 17, 287);
    brochure.text(t.pageOf(i, totalPages), 193, 287, { align: "right" });
  }

  // "VERTRAGSBESTANDTEIL" separator on first contract page
  brochure.setPage(3);
  const sepY = 23;
  brochure.setDrawColor(28, 175, 154);
  brochure.setLineWidth(0.5);
  brochure.line(17, sepY, 193, sepY);
  brochure.setFontSize(8);
  brochure.setFont("helvetica", "bold");
  brochure.setTextColor(28, 175, 154);
  const contractPartLabel = lang === "de" ? "VERTRAGSBESTANDTEIL" :
    lang === "en" ? "CONTRACTUAL COMPONENT" :
    lang === "fr" ? "PARTIE CONTRACTUELLE" :
    lang === "it" ? "PARTE CONTRATTUALE" :
    "PARTE CONTRACTUAL";
  brochure.text(contractPartLabel, 105, sepY + 4, { align: "center" });

  return brochure;
}
