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

  // Redraw brochure footers with global page numbers
  drawBrochureFooters(brochure, 1, 2, totalPages, lang);

  // Contract footers: override with global numbering
  for (let i = 3; i <= totalPages; i++) {
    brochure.setPage(i);
    brochure.setFillColor(255, 255, 255);
    brochure.rect(0, 287, 210, 10, "F");
    brochure.setDrawColor(200, 200, 200);
    brochure.setLineWidth(0.2);
    brochure.line(17, 287, 193, 287);
    brochure.setFontSize(7);
    brochure.setTextColor(100, 100, 100);
    const footerLeft = `${t.contractFooter} | ${vars.vertragsnummer}`;
    brochure.text(footerLeft, 17, 290);
    brochure.text(t.pageOf(i, totalPages), 193, 290, { align: "right" });
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
