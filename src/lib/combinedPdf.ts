import jsPDF from "jspdf";
import { renderContractPages, type ContractVars } from "./contractPdf";
import { buildBrochurePdf, drawBrochureFooters } from "./brochurePdf";

/**
 * Build a combined PDF: Brochure (2 pages) + Contract (3+ pages).
 * Brochure = sales, Contract = legal. No duplication.
 * Durchgehende Seitennummerierung über das gesamte Dokument.
 */
export function buildCombinedPdf(vars: ContractVars): jsPDF {
  // Build brochure (2 pages, footers NOT yet drawn)
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  // Draw brochure pages without footers (we handle them globally)
  // We need the raw page builders, so we re-use buildBrochurePdf but
  // override footers. Simpler: just build and we'll redraw footers.
  // Actually buildBrochurePdf already draws footers for standalone.
  // Let's use the internal approach instead.

  // Import page builders indirectly via buildBrochurePdf
  // then strip its footers by redrawing. Better: just call the export.
  const brochure = buildBrochurePdf();

  // Copy brochure pages to our doc by just using brochure as base
  // jsPDF doesn't support page copy, so use brochure doc directly
  // and append contract to it.

  // Append contract pages onto brochure doc
  renderContractPages(brochure, vars, true);

  const totalPages = brochure.getNumberOfPages();

  // Redraw brochure footers with global page numbers
  drawBrochureFooters(brochure, 1, 2, totalPages);

  // Contract footers are already drawn by renderContractPages
  // but with local numbering. We need to override them.
  // The contract footer draws at y=290 with a line at y=287.
  // We'll overlay the correct page numbers.
  for (let i = 3; i <= totalPages; i++) {
    brochure.setPage(i);
    // White-out the old footer text area
    brochure.setFillColor(255, 255, 255);
    brochure.rect(0, 287, 210, 10, "F");
    // Redraw line and footer with global numbering
    brochure.setDrawColor(200, 200, 200);
    brochure.setLineWidth(0.2);
    brochure.line(17, 287, 193, 287);
    brochure.setFontSize(7);
    brochure.setTextColor(100, 100, 100);
    const isFirstContractPage = i === 3;
    const footerLeft = `DERM247 – Lizenzvertrag | ${vars.vertragsnummer}`;
    brochure.text(footerLeft, 17, 290);
    brochure.text(`Seite ${i} von ${totalPages}`, 193, 290, { align: "right" });
  }

  // Add "VERTRAGSBESTANDTEIL" separator at top of first contract page (page 3)
  brochure.setPage(3);
  // Draw a subtle separator line + label between header and content
  const sepY = 23; // just below the header bar
  brochure.setDrawColor(28, 175, 154);
  brochure.setLineWidth(0.5);
  brochure.line(17, sepY, 193, sepY);
  brochure.setFontSize(8);
  brochure.setFont("helvetica", "bold");
  brochure.setTextColor(28, 175, 154);
  brochure.text("VERTRAGSBESTANDTEIL", 105, sepY + 4, { align: "center" });

  return brochure;
}
