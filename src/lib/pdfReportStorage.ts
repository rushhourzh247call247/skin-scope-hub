import type { PdfReport } from "@/types/patient";

const STORAGE_KEY = "derm247_pdf_reports";
const MAX_REPORTS = 20;

export function getSavedReports(patientId: number): PdfReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const all: PdfReport[] = JSON.parse(raw);
    return all
      .filter((r) => r.patientId === patientId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch {
    return [];
  }
}

export function saveReport(report: PdfReport): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all: PdfReport[] = raw ? JSON.parse(raw) : [];
    all.unshift(report);
    // Keep only the latest MAX_REPORTS across all patients
    const trimmed = all.slice(0, MAX_REPORTS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    console.warn("Could not save PDF report to localStorage");
  }
}

export function deleteReport(reportId: string): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const all: PdfReport[] = JSON.parse(raw);
    const filtered = all.filter((r) => r.id !== reportId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch {
    console.warn("Could not delete PDF report from localStorage");
  }
}

export function getDefaultPdfOptions(): {
  reportType: "lastVisit" | "fullHistory";
  showClassification: boolean;
  showAbcde: boolean;
  showRiskScore: boolean;
  showImages: boolean;
  showNotes: boolean;
} {
  try {
    const raw = localStorage.getItem("derm247_pdf_defaults");
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    reportType: "lastVisit",
    showClassification: true,
    showAbcde: true,
    showRiskScore: true,
    showImages: true,
    showNotes: true,
  };
}

export function saveDefaultPdfOptions(options: ReturnType<typeof getDefaultPdfOptions>): void {
  try {
    localStorage.setItem("derm247_pdf_defaults", JSON.stringify(options));
  } catch {}
}
