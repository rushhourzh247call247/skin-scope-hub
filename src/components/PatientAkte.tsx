import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { translateAnatomyName } from "@/lib/anatomyTranslation";
import { getClassificationLabel } from "@/lib/classificationTranslation";
import type { FullPatient, LesionClassification, Appointment, PatientDocument, Consultation } from "@/types/patient";
import { LESION_CLASSIFICATIONS } from "@/types/patient";
import { formatDate } from "@/lib/dateUtils";
import { useState, useRef } from "react";
import {
  User, Calendar, Mail, Phone, Hash, Activity, MapPin,
  Plus, Trash2, FileText, Upload, Download, AlertTriangle,
  Clock, ClipboardList, X, Save, FileUp, Eye, Pencil, Stethoscope
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PatientAkteProps {
  patient: FullPatient;
  onNavigateToSpot: (locationId: number) => void;
}

const PatientAkte = ({ patient, onNavigateToSpot }: PatientAkteProps) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentNotes, setAppointmentNotes] = useState("");
  const [documentNotes, setDocumentNotes] = useState("");
  const [showConsultationForm, setShowConsultationForm] = useState(false);
  const [consultationText, setConsultationText] = useState("");
  const [editingConsultationId, setEditingConsultationId] = useState<number | null>(null);
  const [editingConsultationText, setEditingConsultationText] = useState("");

  // Queries
  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery({
    queryKey: ["appointments", patient.id],
    queryFn: () => api.getAppointments(patient.id),
  });

  const { data: documents = [], isLoading: documentsLoading } = useQuery({
    queryKey: ["patient-documents", patient.id],
    queryFn: () => api.getPatientDocuments(patient.id),
  });

  const { data: consultations = [], isLoading: consultationsLoading } = useQuery({
    queryKey: ["consultations", patient.id],
    queryFn: () => api.getConsultations(patient.id),
  });

  const createAppointmentMutation = useMutation({
    mutationFn: (data: { scheduled_at: string; notes?: string }) =>
      api.createAppointment(patient.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments", patient.id] });
      setShowAppointmentForm(false);
      setAppointmentDate("");
      setAppointmentNotes("");
      toast.success(t("akte.appointmentCreated"));
    },
    onError: () => toast.error(t("akte.appointmentError")),
  });

  const deleteAppointmentMutation = useMutation({
    mutationFn: (id: number) => api.deleteAppointment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments", patient.id] });
      toast.success(t("akte.appointmentDeleted"));
    },
  });

  const uploadDocumentMutation = useMutation({
    mutationFn: ({ file, notes }: { file: File; notes?: string }) =>
      api.uploadPatientDocument(patient.id, file, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-documents", patient.id] });
      setDocumentNotes("");
      toast.success(t("akte.documentUploaded"));
    },
    onError: () => toast.error(t("akte.documentError")),
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: (id: number) => api.deletePatientDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-documents", patient.id] });
      toast.success(t("akte.documentDeleted"));
    },
  });

  const createConsultationMutation = useMutation({
    mutationFn: (notes: string) => api.createConsultation(patient.id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consultations", patient.id] });
      setShowConsultationForm(false);
      setConsultationText("");
      toast.success(t("akte.consultationCreated"));
    },
    onError: () => toast.error(t("akte.consultationError")),
  });

  const updateConsultationMutation = useMutation({
    mutationFn: ({ id, notes }: { id: number; notes: string }) => api.updateConsultation(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consultations", patient.id] });
      setEditingConsultationId(null);
      setEditingConsultationText("");
      toast.success(t("akte.consultationUpdated"));
    },
    onError: () => toast.error(t("akte.consultationError")),
  });

  const deleteConsultationMutation = useMutation({
    mutationFn: (id: number) => api.deleteConsultation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consultations", patient.id] });
      toast.success(t("akte.consultationDeleted"));
    },
  });

  // Derived data
  const locations = (patient.locations ?? []).filter((l: any) => !l.deleted_at);
  const spotLocations = locations.filter((l) => l.type !== "overview");

  // Classification summary
  const classificationCounts: Record<string, number> = {};
  spotLocations.forEach((loc) => {
    const cls = (loc as any).classification || "unclassified";
    classificationCounts[cls] = (classificationCounts[cls] || 0) + 1;
  });

  const highRiskSpots = spotLocations.filter((loc) => {
    const cls = (loc as any).classification as LesionClassification;
    return cls === "melanoma_suspect" || cls === "scc" || cls === "bcc";
  });

  // Latest finding
  const allFindings = locations.flatMap((loc) =>
    (loc.findings ?? []).map((f: any) => ({
      ...f,
      locationName: translateAnatomyName(loc.name) || `Spot #${loc.id}`,
      locationId: loc.id,
    }))
  );
  allFindings.sort(
    (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
  );

  const totalImages = locations.reduce((sum, l) => sum + (l.images?.length ?? 0), 0);

  const now = new Date();

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadDocumentMutation.mutate({ file, notes: documentNotes || undefined });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <ClipboardList className="h-5 w-5 text-primary" />
        {t("akte.title")}
      </h2>

      {/* Patient Master Data */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
          <User className="h-3.5 w-3.5 text-primary" />
          {t("akte.masterData")}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <div>
            <span className="text-xs text-muted-foreground">{t("common.name")}</span>
            <p className="font-medium text-foreground">{patient.name}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">{t("common.birthDate")}</span>
            <p className="font-medium text-foreground tabular-nums">
              {patient.birth_date ? formatDate(patient.birth_date, "dd.MM.yyyy") : "–"}
            </p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">{t("common.gender")}</span>
            <p className="font-medium text-foreground">
              {patient.gender === "female" ? t("common.female") : t("common.male")}
            </p>
          </div>
          {patient.insurance_number && (
            <div>
              <span className="text-xs text-muted-foreground">{t("newPatient.insuranceNumber")}</span>
              <p className="font-medium text-foreground">{patient.insurance_number}</p>
            </div>
          )}
          {patient.email && (
            <div className="flex items-center gap-1.5">
              <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
              <div>
                <span className="text-xs text-muted-foreground">{t("common.email")}</span>
                <p className="font-medium text-foreground">{patient.email}</p>
              </div>
            </div>
          )}
          {patient.phone && (
            <div className="flex items-center gap-1.5">
              <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
              <div>
                <span className="text-xs text-muted-foreground">{t("common.phone")}</span>
                <p className="font-medium text-foreground">{patient.phone}</p>
              </div>
            </div>
          )}
        </div>
        {patient.notes && (
          <div className="pt-2 border-t">
            <span className="text-xs text-muted-foreground">{t("common.notes")}</span>
            <p className="text-sm text-foreground mt-0.5">{patient.notes}</p>
          </div>
        )}
      </div>

      {/* Clinical Summary */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-primary" />
          {t("akte.clinicalSummary")}
        </h3>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{spotLocations.length}</p>
            <p className="text-[10px] text-muted-foreground uppercase">{t("common.spots")}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{totalImages}</p>
            <p className="text-[10px] text-muted-foreground uppercase">{t("common.images")}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{allFindings.length}</p>
            <p className="text-[10px] text-muted-foreground uppercase">{t("common.findings")}</p>
          </div>
        </div>

        {/* Classification breakdown */}
        {Object.keys(classificationCounts).filter((k) => k !== "unclassified").length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {Object.entries(classificationCounts)
              .filter(([k]) => k !== "unclassified")
              .map(([cls, count]) => {
                const info = LESION_CLASSIFICATIONS[cls as LesionClassification];
                return (
                  <span
                    key={cls}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border"
                    style={{
                      borderColor: `${info?.color}40`,
                      backgroundColor: `${info?.color}10`,
                      color: info?.color,
                    }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: info?.color }} />
                    {count}× {getClassificationLabel(cls as LesionClassification)}
                  </span>
                );
              })}
          </div>
        )}

        {/* High Risk Alert */}
        {highRiskSpots.length > 0 && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" />
              {t("akte.highRiskSpots")} ({highRiskSpots.length})
            </div>
            <div className="space-y-1">
              {highRiskSpots.map((loc) => {
                const cls = (loc as any).classification as LesionClassification;
                const info = LESION_CLASSIFICATIONS[cls];
                return (
                  <button
                    key={loc.id}
                    onClick={() => onNavigateToSpot(loc.id)}
                    className="flex items-center gap-2 w-full text-left text-xs hover:bg-destructive/10 rounded px-2 py-1 transition-colors"
                  >
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: info?.color }} />
                    <span className="font-medium text-foreground">{translateAnatomyName(loc.name) || `Spot #${loc.id}`}</span>
                    <span className="text-[10px] font-bold px-1 rounded" style={{ backgroundColor: `${info?.color}20`, color: info?.color }}>
                      {info?.shortLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Latest findings */}
        {allFindings.length > 0 && (
          <div className="pt-2 border-t space-y-2">
            <h4 className="text-[11px] font-semibold text-muted-foreground uppercase">{t("akte.lastFindings")}</h4>
            {allFindings.slice(0, 5).map((f, i) => (
              <button
                key={i}
                onClick={() => onNavigateToSpot(f.locationId)}
                className="flex items-start gap-2 w-full text-left rounded-md bg-muted/30 p-2.5 hover:bg-muted/60 transition-colors"
              >
                <Activity className="h-3.5 w-3.5 mt-0.5 text-amber-500 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-foreground truncate">{f.description || "–"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                    <Badge variant="outline" className="text-[9px] px-1 py-0">{f.locationName}</Badge>
                    {f.user_name && <span>{f.user_name}</span>}
                    {f.created_at && <span className="tabular-nums">{formatDate(f.created_at, "dd.MM.yyyy")}</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Appointments */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            {t("akte.appointments")}
          </h3>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => setShowAppointmentForm(!showAppointmentForm)}
          >
            <Plus className="h-3 w-3" />
            {t("akte.addAppointment")}
          </Button>
        </div>

        {showAppointmentForm && (
          <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">{t("common.date")}</Label>
                <Input
                  type="datetime-local"
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-[10px]">{t("common.notes")}</Label>
                <Input
                  value={appointmentNotes}
                  onChange={(e) => setAppointmentNotes(e.target.value)}
                  placeholder={t("akte.appointmentNotesPlaceholder")}
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div className="flex gap-1.5">
              <Button
                size="sm"
                className="h-7 text-xs"
                disabled={!appointmentDate || createAppointmentMutation.isPending}
                onClick={() => createAppointmentMutation.mutate({
                  scheduled_at: appointmentDate,
                  notes: appointmentNotes || undefined,
                })}
              >
                <Save className="h-3 w-3 mr-1" />
                {t("common.save")}
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowAppointmentForm(false)}>
                <X className="h-3 w-3 mr-1" />
                {t("common.cancel")}
              </Button>
            </div>
          </div>
        )}

        {appointmentsLoading ? (
          <p className="text-xs text-muted-foreground">{t("common.loading")}</p>
        ) : appointments.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">{t("akte.noAppointments")}</p>
        ) : (
          <div className="space-y-1.5">
            {[...appointments]
              .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
              .map((apt) => {
                const aptDate = new Date(apt.scheduled_at);
                const isOverdue = aptDate < now;
                const isSoon = !isOverdue && aptDate.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000;
                return (
                  <div
                    key={apt.id}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-3 py-2 text-xs border transition-all group",
                      isOverdue
                        ? "border-destructive/30 bg-destructive/5"
                        : isSoon
                          ? "border-amber-300/50 bg-amber-50/50 dark:bg-amber-950/20"
                          : "border-border bg-muted/30"
                    )}
                  >
                    <Clock className={cn("h-3.5 w-3.5 shrink-0", isOverdue ? "text-destructive" : isSoon ? "text-amber-500" : "text-muted-foreground")} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn("font-medium tabular-nums", isOverdue ? "text-destructive" : "text-foreground")}>
                          {formatDate(apt.scheduled_at, "dd.MM.yyyy HH:mm")}
                        </span>
                        {isOverdue && (
                          <Badge variant="destructive" className="text-[9px] px-1 py-0">{t("akte.overdue")}</Badge>
                        )}
                      </div>
                      {apt.notes && <p className="text-[10px] text-muted-foreground truncate mt-0.5">{apt.notes}</p>}
                    </div>
                    <button
                      onClick={() => deleteAppointmentMutation.mutate(apt.id)}
                      className="shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Documents */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-primary" />
            {t("akte.documents")}
          </h3>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadDocumentMutation.isPending}
          >
            <FileUp className="h-3 w-3" />
            {uploadDocumentMutation.isPending ? t("common.loading") : t("akte.uploadDocument")}
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          className="hidden"
          onChange={handleDocumentUpload}
        />

        <div className="space-y-1">
          <Label className="text-[10px]">{t("akte.documentNotesOptional")}</Label>
          <Input
            value={documentNotes}
            onChange={(e) => setDocumentNotes(e.target.value)}
            placeholder={t("akte.documentNotesPlaceholder")}
            className="h-8 text-xs"
          />
        </div>

        {documentsLoading ? (
          <p className="text-xs text-muted-foreground">{t("common.loading")}</p>
        ) : documents.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">{t("akte.noDocuments")}</p>
        ) : (
          <div className="space-y-1.5">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-2.5 rounded-md px-3 py-2 text-xs border border-border bg-muted/30 group"
              >
                <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{doc.original_name}</p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    {doc.created_at && <span className="tabular-nums">{formatDate(doc.created_at, "dd.MM.yyyy")}</span>}
                    {doc.notes && <span className="truncate">· {doc.notes}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => {
                      const baseUrl = api.getDocumentDownloadUrl(doc.id);
                      const separator = baseUrl.includes("?") ? "&" : "?";
                      const previewWindow = window.open(
                        `${baseUrl}${separator}inline=1`,
                        "_blank",
                        "noopener,noreferrer"
                      );

                      if (!previewWindow) {
                        toast.error(t("akte.previewError", "Vorschau konnte nicht geladen werden"));
                      }
                    }}
                    className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                    title={t("akte.preview", "Vorschau")}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const blob = await api.downloadDocumentBlob(doc.id);
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = doc.original_name || "document";
                        a.click();
                        URL.revokeObjectURL(url);
                      } catch {
                        toast.error(t("common.downloadError", "Download fehlgeschlagen"));
                      }
                    }}
                    className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                    title={t("common.download")}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => deleteDocumentMutation.mutate(doc.id)}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientAkte;
