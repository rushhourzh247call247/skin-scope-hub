import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, FileDown, Eye, Save, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { FullPatient, PdfExportOptions } from "@/types/patient";
import { generatePatientPDF, getPatientPdfFilename } from "@/lib/pdfExport";
import { saveReport, getDefaultPdfOptions, saveDefaultPdfOptions } from "@/lib/pdfReportStorage";
import PdfPreviewPages from "@/components/PdfPreviewPages";

interface PdfExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: FullPatient;
  doctorName?: string;
}

export default function PdfExportDialog({ open, onOpenChange, patient, doctorName }: PdfExportDialogProps) {
  const { t } = useTranslation();
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
      toast.error(t('pdfExport.previewError'));
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
      toast.error(t('pdfExport.refreshError'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndDownload = async () => {
    setLoading(true);
    try {
      const options = buildOptions();
      const blobUrl = await generatePatientPDF(patient, "preview", doctorName, options);
      if (!blobUrl) throw new Error("PDF generation failed");

      const res = await fetch(blobUrl);
      const blob = await res.blob();
      const filename = getPatientPdfFilename(patient);

      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
      }, 100);

      let reportSaved = false;
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error("FileReader failed"));
          reader.readAsDataURL(blob);
        });

        await saveReport({
          id: crypto.randomUUID(),
          patientId: patient.id,
          patientName: patient.name,
          createdAt: new Date().toISOString(),
          reportType: options.reportType,
          options,
          doctorName: doctorName ?? null,
          pdfBase64: base64,
        });
        reportSaved = true;
      } catch {
        console.warn("Could not save report to history");
      }

      if (reportSaved) {
        toast.success(t('pdfExport.savedAndDownloaded'));
      } else {
        toast.error(t('pdfExport.downloadedNotSaved'));
      }
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
        URL.revokeObjectURL(downloadUrl);
      }, 3000);
    } catch {
      toast.error(t('pdfExport.createError'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDefaults = () => {
    saveDefaultPdfOptions({ reportType, showClassification, showAbcde, showRiskScore, showImages, showNotes });
    toast.success(t('pdfExport.defaultsSaved'));
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
        step === "preview" ? "max-w-5xl" : "max-w-md"
      )}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5" />
            {t('pdfExport.dialogTitle')}
          </DialogTitle>
        </DialogHeader>

        {step === "config" && (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">{t('pdfExport.reportType')}</Label>
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
                  <span className="font-medium">{t('pdfExport.lastVisit')}</span>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t('pdfExport.lastVisitDesc')}</p>
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
                  <span className="font-medium">{t('pdfExport.fullHistory')}</span>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t('pdfExport.fullHistoryDesc')}</p>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">{t('pdfExport.contents')}</Label>
              <div className="space-y-2.5">
                {[
                  { id: "classification", label: t('pdfExport.classifications'), checked: showClassification, set: setShowClassification },
                  { id: "abcde", label: t('pdfExport.abcdeAssessment'), checked: showAbcde, set: setShowAbcde },
                  { id: "risk", label: t('pdfExport.riskScoreProgress'), checked: showRiskScore, set: setShowRiskScore },
                  { id: "images", label: t('pdfExport.imagesContent'), checked: showImages, set: setShowImages },
                  { id: "notes", label: t('pdfExport.notesFindings'), checked: showNotes, set: setShowNotes },
                ].map((item) => (
                  <div key={item.id} className="flex items-center gap-2.5">
                    <Checkbox
                      id={item.id}
                      checked={item.checked}
                      onCheckedChange={(c) => item.set(c === true)}
                    />
                    <Label htmlFor={item.id} className="cursor-pointer text-sm">{item.label}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">{t('pdfExport.doctorSummary')}</Label>
              <Textarea
                placeholder={t('pdfExport.doctorSummaryPlaceholder')}
                value={doctorSummary}
                onChange={(e) => setDoctorSummary(e.target.value)}
                rows={3}
                className="text-sm"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button onClick={handlePreview} disabled={loading} className="flex-1 gap-1.5">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                {t('pdfExport.preview')}
              </Button>
              <Button variant="outline" onClick={handleSaveDefaults} size="icon" title={t('pdfExport.saveDefaults')}>
                <Settings2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 md:h-[52vh] md:overflow-hidden">
              {previewUrl ? (
                <PdfPreviewPages pdfUrl={previewUrl} />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  {t('pdfExport.noPreview')}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">{t('pdfExport.doctorSummary')}</Label>
              <Textarea
                placeholder={t('pdfExport.updatePreviewPlaceholder')}
                value={doctorSummary}
                onChange={(e) => setDoctorSummary(e.target.value)}
                rows={3}
                className="text-sm"
              />
              <Button variant="ghost" size="sm" onClick={handleRefreshPreview} disabled={loading} className="gap-1 text-xs">
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                {t('pdfExport.refreshPreview')}
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setStep("config")} className="gap-1.5">
                <Settings2 className="h-4 w-4" />
                {t('pdfExport.options')}
              </Button>
              <Button onClick={handleSaveAndDownload} disabled={loading} className="flex-1 gap-1.5">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {t('pdfExport.saveAndDownload')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
