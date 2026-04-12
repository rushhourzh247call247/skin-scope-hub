import jsPDF from "jspdf";
import { renderContractPages, type ContractVars } from "./contractPdf";
import { buildBrochurePdf } from "./brochurePdf";

/**
 * Build a combined PDF: Brochure (2 pages) + Contract (3+ pages).
 * Brochure = sales, Contract = legal. No duplication.
 */
export function buildCombinedPdf(vars: ContractVars): jsPDF {
  // Start with brochure pages
  const doc = buildBrochurePdf();

  // Append contract pages onto the same document
  renderContractPages(doc, vars, true);

  return doc;
}
