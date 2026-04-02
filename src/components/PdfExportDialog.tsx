import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileDown, Eye, Save, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { FullPatient, PdfExportOptions } from "@/types/patient";
import { generatePatientPDF, getPatientPdfFilename } from "@/lib/pdfExport";
import { saveReport, getDefaultPdfOptions, saveDefaultPdfOptions } from "@/lib/pdfReportStorage";

interface PdfExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: FullPatient;
  doctorName?: string;
}

export default function PdfExportDialog({ open, onOpenChange, patient, doctorName }: PdfExportDialogProps) {
  const defaults = getDefaultPdfOptions();
  const [reportType, setReportType] = useState<"lastVisit" | "fullHistory">(defaults.reportType);
  const [showClassification, setShowClassification] = useState(defaults.showClassification);
  const [showAbcde, setShowAbcde] = useState(defaults.showAbcde);
  const [showRiskScore, setShowRiskScore] = useState(defaults.showRiskScore);
  const [showImages, setShowImages] = useState(defaults.showImages);
  const [showNotes, setShowNotes] = useState(defaults.showNotes);
  const [doctorSummary, setDoctorSummary] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"config" | "preview">("config");

  const buildOptions = useCallback((): PdfExportOptions => ({
    reportType,
    showClassification,
    showAbcde,
    showRiskScore,
    showImages,
    showNotes,
    doctorSummary,
  }), [reportType, showClassification, showAbcde, showRiskScore, showImages, showNotes, doctorSummary]);

  const handlePreview = async () => {
    setLoading(true);
    try {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const url = await generatePatientPDF(patient, "preview", doctorName, buildOptions());
      if (url) {
        setPreviewUrl(url);
        setStep("preview");
      }
    } catch {
      toast.error("Vorschau konnte nicht erstellt werden");
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshPreview = async () => {
    setLoading(true);
    try {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const url = await generatePatientPDF(patient, "preview", doctorName, buildOptions());
      if (url) setPreviewUrl(url);
    } catch {
      toast.error("Vorschau konnte nicht aktualisiert werden");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndDownload = async () => {
    setLoading(true);
    try {
      const options = buildOptions();
      // Generate final PDF
      const blobUrl = await generatePatientPDF(patient, "preview", doctorName, options);
      if (!blobUrl) throw new Error("PDF generation failed");

      // Download it
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = getPatientPdfFilename(patient);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Save to history
      try {
        const res = await fetch(blobUrl);
        const blob = await res.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          saveReport({
            id: crypto.randomUUID(),
            patientId: patient.id,
            patientName: patient.name,
            createdAt: new Date().toISOString(),
            reportType: options.reportType,
            options,
            doctorName: doctorName ?? null,
            pdfBase64: base64,
          });
        };
        reader.readAsDataURL(blob);
      } catch {
        // Save failed silently — download still works
      }

      toast.success("PDF gespeichert & heruntergeladen");
      setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
    } catch {
      toast.error("PDF konnte nicht erstellt werden");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDefaults = () => {
    saveDefaultPdfOptions({ reportType, showClassification, showAbcde, showRiskScore, showImages, showNotes });
    toast.success("Voreinstellungen gespeichert");
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setStep("config");
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={cn(
        "max-h-[90vh] overflow-y-auto",
        step === "preview" ? "max-w-4xl" : "max-w-md"
      )}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5" />
            PDF-Bericht erstellen
          </DialogTitle>
        </DialogHeader>

        {step === "config" && (
          <div className="space-y-5">
            {/* Report Type */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Berichtstyp</Label>
              <div className="flex gap-2">
                <button
                  onClick={() => setReportType("lastVisit")}
                  className={cn(
                    "flex-1 rounded-lg border p-3 text-left text-sm transition-all",
                    reportType === "lastVisit"
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <span className="font-medium">Letzte Konsultation</span>
                  <p className="text-xs text-muted-foreground mt-0.5">Nur neueste Befunde</p>
                </button>
                <button
                  onClick={() => setReportType("fullHistory")}
                  className={cn(
                    "flex-1 rounded-lg border p-3 text-left text-sm transition-all",
                    reportType === "fullHistory"
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <span className="font-medium">Gesamtverlauf</span>
                  <p className="text-xs text-muted-foreground mt-0.5">Chronologisch komplett</p>
                </button>
              </div>
            </div>

            {/* Content Toggles */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Inhalte</Label>
              <div className="space-y-2.5">
                {[
                  { id: "classification", label: "Klassifizierungen", checked: showClassification, set: setShowClassification },
                  { id: "abcde", label: "ABCDE-Bewertung", checked: showAbcde, set: setShowAbcde },
                  { id: "risk", label: "Risiko-Score & Verlauf", checked: showRiskScore, set: setShowRiskScore },
                  { id: "images", label: "Bilder", checked: showImages, set: setShowImages },
                  { id: "notes", label: "Notizen & Befunde", checked: showNotes, set: setShowNotes },
                ].map((item) => (
                  <div key={item.id} className="flex items-center gap-2.5">
                    <Checkbox
                      id={item.id}
                      checked={item.checked}
                      onCheckedChange={(c) => item.set(c === true)}
                    />
                    <Label htmlFor={item.id} className="text-sm cursor-pointer">{item.label}</Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Doctor Summary */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Ärztliche Zusammenfassung (optional)</Label>
              <Textarea
                placeholder="Freitext für den Bericht eingeben..."
                value={doctorSummary}
                onChange={(e) => setDoctorSummary(e.target.value)}
                rows={3}
                className="text-sm"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <Button onClick={handlePreview} disabled={loading} className="flex-1 gap-1.5">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                Vorschau
              </Button>
              <Button variant="outline" onClick={handleSaveDefaults} size="icon" title="Voreinstellungen speichern">
                <Settings2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            {/* PDF Preview */}
            <div className="rounded-lg border bg-muted/30 overflow-hidden" style={{ height: "50vh" }}>
              {previewUrl ? (
                <iframe src={previewUrl} className="w-full h-full" title="PDF Vorschau" />
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                  Keine Vorschau verfügbar
                </div>
              )}
            </div>

            {/* Editable Summary */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Ärztliche Zusammenfassung</Label>
              <Textarea
                placeholder="Text eingeben oder anpassen — wird ins PDF übernommen..."
                value={doctorSummary}
                onChange={(e) => setDoctorSummary(e.target.value)}
                rows={3}
                className="text-sm"
              />
              <Button variant="ghost" size="sm" onClick={handleRefreshPreview} disabled={loading} className="gap-1 text-xs">
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                Vorschau aktualisieren
              </Button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setStep("config")} className="gap-1.5">
                <Settings2 className="h-4 w-4" />
                Optionen
              </Button>
              <Button onClick={handleSaveAndDownload} disabled={loading} className="flex-1 gap-1.5">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Speichern & Herunterladen
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
