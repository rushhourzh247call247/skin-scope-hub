import { useCallback, useEffect, useState } from "react";
import { getSavedReports, deleteReport, PDF_REPORTS_UPDATED_EVENT } from "@/lib/pdfReportStorage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileDown, Trash2, Eye } from "lucide-react";
import { formatDate } from "@/lib/dateUtils";
import { toast } from "sonner";
import type { PdfReport } from "@/types/patient";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import PdfPreviewPages from "@/components/PdfPreviewPages";

interface PdfReportHistoryProps {
  patientId: number;
  patientName: string;
}

export default function PdfReportHistory({ patientId, patientName }: PdfReportHistoryProps) {
  const [reports, setReports] = useState<PdfReport[] | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    const savedReports = await getSavedReports(patientId);
    setReports(savedReports);
  }, [patientId]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  useEffect(() => {
    const handleReportsChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ patientId?: number }>).detail;
      if (detail?.patientId == null || detail.patientId === patientId) {
        void loadReports();
      }
    };

    window.addEventListener(PDF_REPORTS_UPDATED_EVENT, handleReportsChanged);
    return () => window.removeEventListener(PDF_REPORTS_UPDATED_EVENT, handleReportsChanged);
  }, [loadReports, patientId]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleDownload = (report: PdfReport) => {
    const link = document.createElement("a");
    link.href = report.pdfBase64;
    link.download = `Derm247_${patientName.replace(/\s+/g, "_")}_${formatDate(, "")}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("PDF heruntergeladen");
  };

  const handlePreview = (report: PdfReport) => {
    try {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const byteString = atob(report.pdfBase64.split(",")[1]);
      const mimeString = report.pdfBase64.split(",")[0].split(":")[1].split(";")[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mimeString });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch {
      window.open(report.pdfBase64, "_blank");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteReport(deleteId);
    await loadReports();
    setDeleteId(null);
    toast.success("Bericht gelöscht");
  };

  if (reports === null) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileDown className="mb-3 h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Berichte werden geladen…</p>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileDown className="mb-3 h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Noch keine Berichte gespeichert.</p>
        <p className="mt-1 text-xs text-muted-foreground">Erstellen Sie einen PDF-Bericht über den Export-Button.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="flex h-[85vh] w-[90vw] max-w-5xl flex-col rounded-lg bg-background shadow-xl">
            <div className="flex items-center justify-between border-b p-3">
              <span className="text-sm font-medium">PDF-Vorschau</span>
              <Button variant="ghost" size="sm" onClick={() => { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }}>
                Schliessen
              </Button>
            </div>
            <div className="min-h-0 flex-1 p-3">
              <PdfPreviewPages pdfUrl={previewUrl} />
            </div>
          </div>
        </div>
      )}

      {reports.map((report) => (
        <div
          key={report.id}
          className="flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent/30"
        >
          <div className="min-w-0 flex-1">
            <div className="mb-0.5 flex items-center gap-2">
              <span className="truncate text-sm font-medium">
                {formatDate(, "")}
              </span>
              <Badge variant="outline" className="shrink-0 text-[10px]">
                {report.reportType === "lastVisit" ? "Letzte Konsultation" : "Gesamtverlauf"}
              </Badge>
            </div>
            {report.doctorName && (
              <p className="text-xs text-muted-foreground">Arzt: {report.doctorName}</p>
            )}
            {report.options.doctorSummary && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {report.options.doctorSummary.slice(0, 80)}{report.options.doctorSummary.length > 80 ? "…" : ""}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handlePreview(report)} title="Vorschau">
              <Eye className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(report)} title="Herunterladen">
              <FileDown className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(report.id)} title="Löschen">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bericht löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Dieser Bericht wird unwiderruflich gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
