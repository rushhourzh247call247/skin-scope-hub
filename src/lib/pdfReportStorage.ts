import type { PdfReport } from "@/types/patient";

const STORAGE_KEY = "derm247_pdf_reports";
const DB_NAME = "derm247_pdf_reports_db";
const STORE_NAME = "reports";
const MAX_REPORTS = 20;
export const PDF_REPORTS_UPDATED_EVENT = "derm247:pdf-reports-updated";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function sortReports(reports: PdfReport[]): PdfReport[] {
  return [...reports].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function readLocalReports(): PdfReport[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as PdfReport[] : [];
  } catch {
    return [];
  }
}

function writeLocalReports(reports: PdfReport[]): void {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
}

function emitReportsUpdated(patientId?: number): void {
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent(PDF_REPORTS_UPDATED_EVENT, { detail: { patientId } }));
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed"));
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
  });
}

function openDatabase(): Promise<IDBDatabase> {
  if (!isBrowser() || !("indexedDB" in window)) {
    return Promise.reject(new Error("IndexedDB unavailable"));
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("patientId", "patientId", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };

    request.onerror = () => reject(request.error ?? new Error("Could not open PDF report database"));
  });
}

function readIndexedDbReports(db: IDBDatabase): Promise<PdfReport[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve((request.result as PdfReport[]) ?? []);
    request.onerror = () => reject(request.error ?? new Error("Could not read PDF reports"));
  });
}

export async function getSavedReports(patientId: number): Promise<PdfReport[]> {
  try {
    const db = await openDatabase();
    try {
      const all = await readIndexedDbReports(db);
      return sortReports(all)
        .filter((r) => r.patientId === patientId);
    } finally {
      db.close();
    }
  } catch {
    return sortReports(readLocalReports())
      .filter((r) => r.patientId === patientId)
  }
}

export async function saveReport(report: PdfReport): Promise<void> {
  try {
    const db = await openDatabase();
    try {
      const existing = await readIndexedDbReports(db);
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const nextReports = sortReports([report, ...existing.filter((item) => item.id !== report.id)]);

      store.put(report);
      for (const staleReport of nextReports.slice(MAX_REPORTS)) {
        store.delete(staleReport.id);
      }

      await transactionDone(transaction);
    } finally {
      db.close();
    }

    emitReportsUpdated(report.patientId);
  } catch (error) {
    try {
      const all = sortReports([report, ...readLocalReports().filter((item) => item.id !== report.id)]).slice(0, MAX_REPORTS);
      writeLocalReports(all);
      emitReportsUpdated(report.patientId);
    } catch {
      console.warn("Could not save PDF report to storage", error);
      throw error instanceof Error ? error : new Error("Could not save PDF report");
    }
  }
}

export async function deleteReport(reportId: string): Promise<void> {
  try {
    const db = await openDatabase();
    try {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).delete(reportId);
      await transactionDone(transaction);
    } finally {
      db.close();
    }

    emitReportsUpdated();
  } catch (error) {
    try {
      const filtered = readLocalReports().filter((report) => report.id !== reportId);
      writeLocalReports(filtered);
      emitReportsUpdated();
    } catch {
      console.warn("Could not delete PDF report from storage", error);
      throw error instanceof Error ? error : new Error("Could not delete PDF report");
    }
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
