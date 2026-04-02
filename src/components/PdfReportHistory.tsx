import { useState } from "react";
import { getSavedReports, deleteReport } from "@/lib/pdfReportStorage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileDown, Trash2, Eye } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "sonner";
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

interface PdfReportHistoryProps {
  patientId: number;
  patientName: string;
}

export default function PdfReportHistory({ patientId, patientName }: PdfReportHistoryProps) {
  const [reports, setReports] = useState(() => getSavedReports(patientId));
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleDownload = (report: typeof reports[0]) => {
    const link = document.createElement("a");
    link.href = report.pdfBase64;
    link.download = `Derm247_${patientName.replace(/\s+/g, "_")}_${format(new Date(report.createdAt), "yyyy-MM-dd")}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("PDF heruntergeladen");
  };

  const handlePreview = (report: typeof reports[0]) => {
    // Convert base64 data URL to blob URL for iframe
    try {
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
      // Fallback: open data URL directly
      window.open(report.pdfBase64, "_blank");
    }
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteReport(deleteId);
    setReports(getSavedReports(patientId));
    setDeleteId(null);
    toast.success("Bericht gelöscht");
  };

  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileDown className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">Noch keine Berichte gespeichert.</p>
        <p className="text-xs text-muted-foreground mt-1">Erstellen Sie einen PDF-Bericht über den Export-Button.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Preview overlay */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-background rounded-lg shadow-xl w-[90vw] max-w-4xl h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-3 border-b">
              <span className="text-sm font-medium">PDF-Vorschau</span>
              <Button variant="ghost" size="sm" onClick={() => { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }}>
                Schliessen
              </Button>
            </div>
            <iframe src={previewUrl} className="flex-1 w-full" title="PDF Vorschau" />
          </div>
        </div>
      )}

      {reports.map((report) => (
        <div
          key={report.id}
          className="flex items-center gap-3 rounded-lg border bg-card p-3 hover:bg-accent/30 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-sm font-medium truncate">
                {format(new Date(report.createdAt), "dd.MM.yyyy HH:mm", { locale: de })}
              </span>
              <Badge variant="outline" className="text-[10px] shrink-0">
                {report.reportType === "lastVisit" ? "Letzte Konsultation" : "Gesamtverlauf"}
              </Badge>
            </div>
            {report.doctorName && (
              <p className="text-xs text-muted-foreground">Arzt: {report.doctorName}</p>
            )}
            {report.options.doctorSummary && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {report.options.doctorSummary.slice(0, 80)}{report.options.doctorSummary.length > 80 ? "…" : ""}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
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
