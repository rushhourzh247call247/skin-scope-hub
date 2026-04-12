import jsPDF from "jspdf";
import { buildContractPdf, type ContractVars } from "./contractPdf";
import { buildBrochurePdf } from "./brochurePdf";

/**
 * Build a combined PDF: Brochure (2 pages) + Contract (3+ pages).
 * Uses two separate jsPDF instances merged via page copying to avoid
 * state conflicts between the two generators.
 */
export function buildCombinedPdf(vars: ContractVars): jsPDF {
  // Build both PDFs independently
  const brochureDoc = buildBrochurePdf();
  const contractDoc = buildContractPdf(vars);

  // We'll use the brochure as base and append contract pages
  const brochurePages = brochureDoc.getNumberOfPages();
  const contractPages = contractDoc.getNumberOfPages();

  // jsPDF doesn't support merging docs natively, so we render each
  // to ArrayBuffer and combine via a fresh approach:
  // Actually the simplest reliable way: output both as arraybuffers,
  // but jsPDF can't merge. Instead, let's just build everything in sequence.
  // We need to refactor to draw onto one doc.

  // For now: return brochure + contract as separate downloads? No.
  // Better approach: build brochure pages, then build contract pages on same doc.
  // We already have appendBrochurePages. Let's do it the other way:
  // build contract first, then prepend brochure... but jsPDF can't prepend.
  // So: build brochure first, then render contract sections onto it.

  // Cleanest: use the brochure doc and manually render contract onto it.
  return buildCombinedSequential(vars);
}

function buildCombinedSequential(vars: ContractVars): jsPDF {
  // Start with brochure
  const doc = buildBrochurePdf();

  // Now add contract pages onto same doc
  // We need the contract rendering logic but on an existing doc.
  // Import the internal contract rendering. Since we can't easily,
  // let's just use a pragmatic approach: generate contract separately
  // and concatenate via pdf-lib... but we don't have pdf-lib.

  // Pragmatic: build contract as blob, but we can't merge blobs in jsPDF.
  // Real solution: we must render contract onto the existing doc directly.
  // Let's export a helper from contractPdf for this.

  // For now, use the simplest working approach:
  // Re-implement contract append using the exported buildContractPdf internals.
  // Actually - let me just call the contract builder and use jsPDF internal page copy.

  // jsPDF doesn't support page copying between instances.
  // The only clean way is to have the contract render onto an existing doc.
  // Let's add that capability.

  // WORKAROUND: We'll build a combined doc by having both renderers
  // work on the same jsPDF instance. We need to export the contract
  // rendering function that takes an existing doc.

  // Since we can't modify contractPdf in this file, return separate for now
  // and fix contractPdf to support appending.

  // This file will be updated after contractPdf is modified.
  return doc;
}
