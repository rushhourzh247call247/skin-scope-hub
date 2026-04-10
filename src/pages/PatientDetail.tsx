import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { getAnatomicalName, ANATOMICAL_ZONES, getNeighborZones } from "@/lib/anatomyLookup";
import { translateAnatomyName } from "@/lib/anatomyTranslation";

import type { FullPatient, LesionClassification } from "@/types/patient";
import { LESION_CLASSIFICATIONS } from "@/types/patient";
import { getClassificationLabel } from "@/lib/classificationTranslation";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { LesionClassification as LesionClassificationType } from "@/types/patient";
import { ArrowLeft, MapPin, Plus, Calendar, ImageIcon, User, Hash, Activity, Mail, Phone, Pencil, Trash2, Save, X, Square, GitCompareArrows, Move, Camera, Tag, QrCode, Undo2, AlertTriangle, FileDown, Loader2, Eye, ChevronDown, Upload, ClipboardList } from "lucide-react";
import PatientAkte from "@/components/PatientAkte";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/dateUtils";
import BodyMap3D from "@/components/BodyMap3D";
import ImageGallery from "@/components/ImageGallery";
import ImageCompare from "@/components/ImageCompare";
import RiskProgression from "@/components/RiskProgression";
import QrUploadDialog from "@/components/QrUploadDialog";
import OverviewPhoto from "@/components/OverviewPhoto";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { generatePatientPDF, getPatientPdfFilename } from "@/lib/pdfExport";
import PdfExportDialog from "@/components/PdfExportDialog";
import PdfReportHistory from "@/components/PdfReportHistory";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

const PatientDetail = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const patientId = Number(id);

  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [mapClickDialog, setMapClickDialog] = useState<{
    x: number;
    y: number;
    view: "front" | "back";
    markType?: "spot" | "region" | "zone";
    x3d?: number;
    y3d?: number;
    z3d?: number;
    nx?: number;
    ny?: number;
    nz?: number;
  } | null>(null);
  const [locationName, setLocationName] = useState("");
  const [activeTab, setActiveTab] = useState<"akte" | "spots" | "timeline" | "fotos" | "uebersicht" | "berichte">("akte");
  const [sidebarTab, setSidebarTab] = useState<"spots" | "zones">("spots");
  const [newFindingText, setNewFindingText] = useState("");
  const [regionWidth, setRegionWidth] = useState(40);
  const [regionHeight, setRegionHeight] = useState(30);
  const [spotX, setSpotX] = useState(0);
  const [spotY, setSpotY] = useState(0);
  const [editingFindingId, setEditingFindingId] = useState<number | null>(null);
  const [editingFindingText, setEditingFindingText] = useState("");
  const [classificationFilter, setClassificationFilter] = useState<LesionClassificationType[]>([]);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrLocationId, setQrLocationId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [showTrash, setShowTrash] = useState(false);
  const [permanentDeleteId, setPermanentDeleteId] = useState<number | null>(null);
  const [expandedTrashId, setExpandedTrashId] = useState<number | null>(null);
  const [mobileMapExpanded, setMobileMapExpanded] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [newlyCreatedZoneId, setNewlyCreatedZoneId] = useState<number | null>(null);
  const zoneFileRef = useRef<HTMLInputElement>(null);
  const [zoneUploadTargetId, setZoneUploadTargetId] = useState<number | null>(null);

  const handleZoneSidebarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !zoneUploadTargetId) return;
    api.uploadImage(zoneUploadTargetId, file).then(() => {
      queryClient.invalidateQueries({ queryKey: ["full-patient", patientId] });
      toast.success(t('overviewPhoto.overviewUploaded'));
    }).catch(() => {
      toast.error(t('imageGallery.noteError'));
    });
    if (zoneFileRef.current) zoneFileRef.current.value = "";
  };

  useEffect(() => {
    if (newlyCreatedZoneId && activeTab === "uebersicht") {
      const timer = setTimeout(() => {
        const el = document.getElementById(`zone-${newlyCreatedZoneId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          setNewlyCreatedZoneId(null);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [newlyCreatedZoneId, activeTab]);

  const handlePdfExport = async () => {
    if (!patient) return;
    setPdfLoading(true);
    try {
      const filename = getPatientPdfFilename(patient);

      try {
        const pdfBlob = await api.downloadPatientPdf(patient.id);
        const downloadUrl = URL.createObjectURL(pdfBlob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(downloadUrl), 1500);
        toast.success(t('patientDetail.pdfDownloaded'));
        return;
      } catch {
        await generatePatientPDF(patient, "download", user?.name);
        toast.success(t('patientDetail.pdfDownloaded'));
      }
    } catch {
      toast.error(t('patientDetail.pdfError'));
    } finally {
      setPdfLoading(false);
    }
  };

  const handlePdfDownload = () => {
    if (!pdfPreviewUrl || !patient) return;
    const link = document.createElement("a");
    link.href = pdfPreviewUrl;
    link.download = getPatientPdfFilename(patient);
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // Mobile fallback
    if (/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
      window.open(pdfPreviewUrl, "_blank");
    }
    toast.success(t('patientDetail.pdfDownloaded'));
  };

  const { data: patient, isLoading, error } = useQuery({
    queryKey: ["full-patient", patientId],
    queryFn: () => api.getFullPatient(patientId),
    enabled: !!patientId,
    refetchInterval: qrDialogOpen ? 5000 : false,
  });

  const createLocationMutation = useMutation({
    mutationFn: (loc: {
      name?: string;
      x: number;
      y: number;
      view?: "front" | "back";
      type?: "spot" | "region" | "overview";
      width?: number;
      height?: number;
      x3d?: number;
      y3d?: number;
      z3d?: number;
      nx?: number;
      ny?: number;
      nz?: number;
    }) => api.createLocation(patientId, loc),
    onSuccess: (newLoc) => {
      const wasZone = mapClickDialog?.markType === "zone" || newLoc.type === "overview";
      queryClient.invalidateQueries({ queryKey: ["full-patient", patientId] });
      setMapClickDialog(null);
      setLocationName("");
      if (wasZone) {
        setSelectedLocationId(newLoc.id);
        setActiveTab("uebersicht");
        setNewlyCreatedZoneId(newLoc.id);
      } else {
        setSelectedLocationId(newLoc.id);
      }
    },
  });

  const createFindingMutation = useMutation({
    mutationFn: ({ locationId, description }: { locationId: number; description: string }) =>
      api.createFinding(locationId, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["full-patient", patientId] });
      setNewFindingText("");
    },
  });

  const updateFindingMutation = useMutation({
    mutationFn: ({ findingId, description }: { findingId: number; description: string }) =>
      api.updateFinding(findingId, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["full-patient", patientId] });
      setEditingFindingId(null);
      setEditingFindingText("");
    },
  });

  const deleteFindingMutation = useMutation({
    mutationFn: (findingId: number) => api.deleteFinding(findingId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["full-patient", patientId] }),
  });

  const classifyMutation = useMutation({
    mutationFn: ({ locationId, classification }: { locationId: number; classification: LesionClassification }) =>
      api.updateClassification(locationId, classification),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["full-patient", patientId] }),
  });

  const opStatusMutation = useMutation({
    mutationFn: ({ locationId, op_status }: { locationId: number; op_status: string }) =>
      api.updateLocationStatus(locationId, op_status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["full-patient", patientId] }),
  });

  const { data: trashedLocations = [] } = useQuery({
    queryKey: ["trashed-locations", patientId],
    queryFn: () => api.getTrashedLocations(patientId),
    enabled: !!patientId,
  });

  const softDeleteMutation = useMutation({
    mutationFn: (locationId: number) => api.softDeleteLocation(locationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["full-patient", patientId] });
      queryClient.invalidateQueries({ queryKey: ["trashed-locations", patientId] });
      if (selectedLocationId === deleteConfirmId) setSelectedLocationId(null);
      setDeleteConfirmId(null);
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (locationId: number) => api.restoreLocation(locationId),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["full-patient", patientId] });
      queryClient.invalidateQueries({ queryKey: ["trashed-locations", patientId] });
      setExpandedTrashId(null);
      if (data?.renamed) {
        toast.success(t('patientDetail.restoredRenamed', { name: data.new_name }));
      } else {
        toast.success(t('patientDetail.restoredSuccess'));
      }
    },
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: (locationId: number) => api.permanentDeleteLocation(locationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trashed-locations", patientId] });
      setPermanentDeleteId(null);
    },
  });

  const locations = (patient?.locations ?? []).filter((l: any) => !l.deleted_at);
  const spotLocations = locations.filter(l => l.type !== "overview");
  const overviewLocations = locations.filter(l => l.type === "overview");
  const selectedLocation = locations.find((l) => l.id === selectedLocationId);
  const totalImages = locations.reduce((sum, l) => sum + (l.images?.length ?? 0), 0);

  const handleMapClick = (
    x: number,
    y: number,
    view: "front" | "back",
    markType?: "spot" | "region",
    point3d?: [number, number, number],
    normal3d?: [number, number, number],
  ) => {
    setSpotX(x);
    setSpotY(y);
    setRegionWidth(40);
    setRegionHeight(30);
    const dialogData = {
      x,
      y,
      view,
      markType,
      x3d: point3d?.[0],
      y3d: point3d?.[1],
      z3d: point3d?.[2],
      nx: normal3d?.[0],
      ny: normal3d?.[1],
      nz: normal3d?.[2],
    };
    setMapClickDialog(dialogData);

    // Auto-fill anatomical name from 3D coordinates
    if (point3d) {
      if (import.meta.env.DEV) console.log('[BodyMap Debug] click:', { x3d: point3d[0], y3d: point3d[1], z3d: point3d[2], view });
      const autoName = getAnatomicalName(point3d[0], point3d[1], point3d[2], view);
      setLocationName(autoName);
    }
  };

  const handlePreviewMove = (
    x: number,
    y: number,
    view: "front" | "back",
    point3d: [number, number, number],
    normal3d: [number, number, number],
  ) => {
    setSpotX(x);
    setSpotY(y);
    setMapClickDialog((prev) => prev ? {
      ...prev,
      x, y, view,
      x3d: point3d[0],
      y3d: point3d[1],
      z3d: point3d[2],
      nx: normal3d[0],
      ny: normal3d[1],
      nz: normal3d[2],
    } : null);
    setLocationName(getAnatomicalName(point3d[0], point3d[1], point3d[2], view));
  };

  const handleCreateLocation = () => {
    if (!mapClickDialog) return;
    const isRegion = mapClickDialog.markType === "region";
    const isZone = mapClickDialog.markType === "zone";

    createLocationMutation.mutate({
      name: isZone ? `Zone ${overviewLocations.length + 1}` : (locationName.trim() || undefined),
      x: mapClickDialog.x,
      y: mapClickDialog.y,
      view: mapClickDialog.view,
      type: isZone ? "overview" : (mapClickDialog.markType === "region" ? "region" : "spot"),
      width: isRegion ? regionWidth : undefined,
      height: isRegion ? regionHeight : undefined,
      x3d: mapClickDialog.x3d,
      y3d: mapClickDialog.y3d,
      z3d: mapClickDialog.z3d,
      nx: mapClickDialog.nx,
      ny: mapClickDialog.ny,
      nz: mapClickDialog.nz,
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-sm text-destructive">{t('patientDetail.notLoaded')}</p>
        <Button variant="outline" onClick={() => navigate("/patients")}>{t('patientDetail.backToListBtn')}</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Patient Header Bar */}
      <div className="border-b bg-card px-3 py-2 lg:px-4 lg:py-3">
        {/* Top row: back + name + tabs */}
        <div className="flex items-center gap-2 lg:gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/patients")} className="gap-1 shrink-0 h-8 px-2 lg:gap-1.5 lg:h-9 lg:px-3">
            <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">{t('patientDetail.backToList')}</span>
          </Button>

          <div className="h-6 w-px bg-border hidden sm:block" />

          <div className="flex items-center gap-2 lg:gap-3 min-w-0">
            <div className="flex h-8 w-8 lg:h-10 lg:w-10 items-center justify-center rounded-full bg-primary/10 text-xs lg:text-sm font-semibold text-primary shrink-0">
              {patient.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-semibold text-foreground truncate">{patient.name}</h1>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">{t('common.active')}</Badge>
              </div>
              <p className="text-xs text-muted-foreground hidden sm:block">{t('patientDetail.patient')}</p>
            </div>
          </div>

          {/* Mode tabs - hidden on mobile (bottom nav instead), shown on desktop with labels */}
          <div className="ml-auto hidden lg:flex items-center gap-1.5 shrink-0">
            <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
              {[
                { key: "akte" as const, icon: ClipboardList, label: t('patientDetail.tabs.chart') },
                { key: "spots" as const, icon: MapPin, label: t('patientDetail.tabs.spots') },
                { key: "uebersicht" as const, icon: Eye, label: t('patientDetail.tabs.overview') },
                { key: "fotos" as const, icon: Camera, label: t('patientDetail.tabs.photos') },
                { key: "timeline" as const, icon: Activity, label: t('patientDetail.tabs.timeline') },
                { key: "berichte" as const, icon: FileDown, label: t('patientDetail.tabs.reports') },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                    activeTab === tab.key
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPdfDialogOpen(true)}
              className="h-8 w-8"
              title="PDF Export"
            >
              <FileDown className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Patient details row - hidden on mobile, shown on desktop */}
        <div className="hidden lg:flex items-center gap-6 text-xs mt-2 pl-[52px]">
          <div>
            <span className="text-muted-foreground">{t('common.id')}</span>
            <p className="font-mono font-medium text-foreground">{patient.id}</p>
          </div>
          <div>
            <span className="text-muted-foreground">{t('common.gender')}</span>
            <p className="font-medium text-foreground">{patient.gender === "female" ? t('common.female') : t('common.male')}</p>
          </div>
          <div>
            <span className="text-muted-foreground">{t('common.birthDate')}</span>
            <p className="font-medium text-foreground tabular-nums">
              {patient.birth_date ? formatDate(patient.birth_date, "dd.MM.yyyy") : "–"}
            </p>
          </div>
          {patient.email && (
            <div className="flex items-center gap-1">
              <Mail className="h-3 w-3 text-muted-foreground" />
              <p className="font-medium text-foreground">{patient.email}</p>
            </div>
          )}
          {patient.phone && (
            <div className="flex items-center gap-1">
              <Phone className="h-3 w-3 text-muted-foreground" />
              <p className="font-medium text-foreground">{patient.phone}</p>
            </div>
          )}
          <div>
            <span className="text-muted-foreground">{t('common.spots')}</span>
            <p className="font-medium text-foreground">{locations.length}</p>
          </div>
          <div>
            <span className="text-muted-foreground">{t('patientDetail.recordings')}</span>
            <p className="font-medium text-foreground">{totalImages}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left: Body Map */}
        <div className={cn(
          "shrink-0 border-b lg:border-b-0 lg:border-r bg-card p-2 lg:p-3 overflow-y-auto flex flex-col transition-all duration-300",
          "w-full lg:w-auto",
          mapClickDialog ? "lg:w-[480px]" : "lg:w-[360px]"
        )}>
          {/* Mobile toggle for map - collapsed by default with mini preview */}
          <button
            className="lg:hidden flex items-center justify-between w-full py-2 px-1 text-xs font-semibold text-foreground rounded-md hover:bg-muted/50 transition-colors"
            onClick={() => setMobileMapExpanded(!mobileMapExpanded)}
          >
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-primary" /> Body Map
              <span className="text-[10px] text-muted-foreground font-normal">
                ({spotLocations.length} {t('common.spots')})
              </span>
            </span>
            <span className={cn("text-muted-foreground transition-transform", mobileMapExpanded && "rotate-180")}>
              <ChevronDown className="h-4 w-4" />
            </span>
          </button>

          <div className={cn(
            "transition-all duration-300",
            mobileMapExpanded ? "h-[300px] lg:h-[450px]" : "h-0 overflow-hidden lg:h-[450px]",
            mapClickDialog && mobileMapExpanded && "h-[350px] lg:h-[560px]"
          )}>
            <BodyMap3D
              markers={spotLocations.map((l) => {
                const pf = (v: any) => v != null ? parseFloat(String(v)) : null;
                const pfn = (v: any) => { const n = pf(v); return n != null && !isNaN(n) ? n : null; };
                return { id: l.id, x: pfn(l.x), y: pfn(l.y), x3d: pfn(l.x3d), y3d: pfn(l.y3d), z3d: pfn(l.z3d), nx: pfn(l.nx), ny: pfn(l.ny), nz: pfn(l.nz), name: l.name, view: l.view, type: l.type, width: l.width, height: l.height, imageCount: l.images?.length ?? 0, findingCount: l.findings?.length ?? 0, classification: (l as any).classification, classificationColor: LESION_CLASSIFICATIONS[(l as any).classification as LesionClassification || "unclassified"]?.color };
              })}
              gender={patient.gender}
              onMapClick={handleMapClick}
              selectedLocationId={selectedLocationId}
              onMarkerClick={(id) => { setMapClickDialog(null); setSelectedLocationId(id); setActiveTab("spots"); }}
              classificationFilter={classificationFilter}
              onFilterChange={setClassificationFilter}
              isPlacementMode={!!mapClickDialog}
              onPreviewMove={handlePreviewMove}
              previewMarker={mapClickDialog ? {
                x: mapClickDialog.x,
                y: mapClickDialog.y,
                view: mapClickDialog.view,
                type: mapClickDialog.markType === "region" ? "region" : "spot",
                width: mapClickDialog.markType === "region" ? regionWidth : undefined,
                height: mapClickDialog.markType === "region" ? regionHeight : undefined,
                x3d: mapClickDialog.x3d,
                y3d: mapClickDialog.y3d,
                z3d: mapClickDialog.z3d,
                nx: mapClickDialog.nx,
                ny: mapClickDialog.ny,
                nz: mapClickDialog.nz,
              } : null}
            />
          </div>

          {/* Inline Spot/Region Creation Panel */}
          {mapClickDialog && (
            <div className="mt-3 rounded-lg border bg-card p-3 space-y-3 animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  {mapClickDialog.markType === "zone" ? (
                    <><Camera className="h-3.5 w-3.5 text-blue-500" /> {t('patientDetail.newOverview')}</>
                  ) : mapClickDialog.markType === "region" ? (
                    <><Square className="h-3.5 w-3.5 text-amber-500" /> Neue Region</>
                  ) : (
                    <><Plus className="h-3.5 w-3.5 text-primary" /> Neuer Spot</>
                  )}
                </h3>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setMapClickDialog(null)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <Badge variant="outline" className="text-[10px]">{mapClickDialog.view === "back" ? t('common.backSide') : t('common.front')}</Badge>
                {mapClickDialog.markType !== "region" && (
                  <span className="flex items-center gap-1 text-green-600 font-medium">
                    <Move className="h-3 w-3" /> {t('patientDetail.dragToMove')}
                  </span>
                )}
              </div>

              {/* Region: Size adjustment with live preview */}
              {mapClickDialog.markType === "region" && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                    <Square className="h-3 w-3 text-amber-500" /> {t('patientDetail.adjustSize')}
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Label className="text-[10px] w-10 shrink-0">{t('patientDetail.width')}</Label>
                      <Slider value={[regionWidth]} onValueChange={([v]) => setRegionWidth(v)} min={10} max={150} step={1} className="flex-1" />
                      <span className="text-[10px] text-muted-foreground font-mono w-6 text-right">{regionWidth}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-[10px] w-10 shrink-0">{t('patientDetail.height')}</Label>
                      <Slider value={[regionHeight]} onValueChange={([v]) => setRegionHeight(v)} min={10} max={150} step={1} className="flex-1" />
                      <span className="text-[10px] text-muted-foreground font-mono w-6 text-right">{regionHeight}</span>
                    </div>
                  </div>
                </div>
              )}

              {mapClickDialog.markType !== "zone" && (
              <div className="space-y-1.5">
                <Label className="text-[10px]">{t('patientDetail.label')}</Label>
                {(() => {
                  const neighbors = getNeighborZones(locationName);
                  const options = locationName 
                    ? [locationName, ...neighbors.filter(n => n !== locationName)]
                    : [...ANATOMICAL_ZONES];
                  return (
                    <select
                      value={locationName}
                      onChange={(e) => setLocationName(e.target.value)}
                      className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {!locationName && <option value="">{t('patientDetail.selectZone')}</option>}
                      {options.map((zone) => (
                        <option key={zone} value={zone}>{translateAnatomyName(zone)}</option>
                      ))}
                    </select>
                  );
                })()}
              </div>
              )}
              <Button className="w-full h-8 text-xs" onClick={handleCreateLocation} disabled={createLocationMutation.isPending}>
                {createLocationMutation.isPending ? t('common.creating') : mapClickDialog.markType === "zone" ? t('overviewPhoto.createFirstZone') : mapClickDialog.markType === "region" ? t('patientDetail.createRegion') : t('patientDetail.createSpot')}
              </Button>
            </div>
          )}

          {/* Sidebar tabs for Zones / Spots */}
          <div className={cn("mt-3 lg:mt-4", !mobileMapExpanded && "lg:block")}>
            <div className="flex items-center gap-1 rounded-lg bg-muted p-0.5 mb-3">
              <button
                onClick={() => setSidebarTab("spots")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-medium transition-all",
                  sidebarTab === "spots" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <MapPin className="h-3 w-3" />
                {t('patientDetail.sidebarTab.spots')} ({spotLocations.filter(l => l.type !== "region").length})
              </button>
              <button
                onClick={() => setSidebarTab("zones")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-medium transition-all",
                  sidebarTab === "zones" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Camera className="h-3 w-3" />
                {t('patientDetail.sidebarTab.zones')} ({overviewLocations.length})
              </button>
            </div>

            {/* Zones list - shown when zones tab active */}
            {sidebarTab === "zones" && (
              <div className="space-y-1 mb-3">
                {overviewLocations.length > 0 ? overviewLocations.map((loc) => {
                  const firstImg = loc.images?.[0];
                  const imgCount = loc.images?.length ?? 0;
                  return (
                    <div
                      key={loc.id}
                      className={cn("flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 transition-all text-xs hover:bg-muted text-foreground border group", selectedLocationId === loc.id && activeTab === "uebersicht" ? "bg-primary/15 border-primary/30" : "border-transparent bg-accent/30")}
                    >
                      <button
                        className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
                        onClick={() => { setSelectedLocationId(loc.id); setActiveTab("uebersicht"); }}
                      >
                        {firstImg ? (
                          <img src={api.resolveImageSrc(firstImg)} alt={loc.name} className="h-6 w-6 rounded object-cover shrink-0" />
                        ) : (
                          <div className="h-6 w-6 rounded bg-muted flex items-center justify-center shrink-0">
                            <Camera className="h-3 w-3 text-muted-foreground" />
                          </div>
                        )}
                        <span className="truncate font-medium flex-1">{translateAnatomyName(loc.name) || t('patientDetail.overview')}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">{imgCount} {imgCount === 1 ? t('common.image') : t('common.images')}</span>
                      </button>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button onClick={(e) => { e.stopPropagation(); setZoneUploadTargetId(loc.id); setTimeout(() => zoneFileRef.current?.click(), 0); }} className="h-5 w-5 rounded flex items-center justify-center hover:bg-muted-foreground/10 text-muted-foreground hover:text-foreground" title={t('imageGallery.uploadImage')}><Upload className="h-3 w-3" /></button>
                        <button onClick={(e) => { e.stopPropagation(); setQrLocationId(loc.id); setQrDialogOpen(true); }} className="h-5 w-5 rounded flex items-center justify-center hover:bg-muted-foreground/10 text-muted-foreground hover:text-foreground" title={t('patientDetail.uploadFromPhone')}><QrCode className="h-3 w-3" /></button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(loc.id); }} className="h-5 w-5 rounded flex items-center justify-center hover:bg-destructive/10 text-muted-foreground hover:text-destructive" title={t('common.delete')}><Trash2 className="h-3 w-3" /></button>
                      </div>
                    </div>
                  );
                }) : (
                  <p className="text-[11px] text-muted-foreground text-center py-4">{t('overviewPhoto.noZonesYet')}</p>
                )}
              </div>
            )}

          {/* Spots List - shown when spots tab active */}
          {sidebarTab === "spots" && (
            <div className="space-y-1">
            {spotLocations.filter(l => l.type !== "region").filter(l => {
              if (classificationFilter.length === 0) return true;
              const cls = ((l as any).classification as LesionClassificationType) || "unclassified";
              return classificationFilter.includes(cls);
            }).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                <MapPin className="h-8 w-8 mb-2 text-muted-foreground/50" />
                <p className="text-xs font-medium">{t('patientDetail.selectBodyPart')}</p>
                <p className="text-[10px] mt-1 text-center">{t('patientDetail.clickBodyMapInstruction')}</p>
              </div>
            ) : spotLocations.filter(l => l.type !== "region").filter(l => {
              if (classificationFilter.length === 0) return true;
              const cls = ((l as any).classification as LesionClassificationType) || "unclassified";
              return classificationFilter.includes(cls);
            }).map((loc, i) => (
              <div
                key={loc.id}
                className={cn(
                  "group flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-all text-xs",
                  selectedLocationId === loc.id
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "hover:bg-muted text-foreground border border-transparent"
                )}
              >
                <button
                  className="flex flex-1 items-center gap-2.5 min-w-0"
                  onClick={() => { setMapClickDialog(null); setSelectedLocationId(loc.id); setActiveTab("spots"); setMobileMapExpanded(true); }}
                >
                  {(() => {
                    const cls = (loc as any).classification as LesionClassification | undefined;
                    const hasClass = cls && cls !== "unclassified";
                    const clsColor = hasClass ? LESION_CLASSIFICATIONS[cls]?.color : undefined;
                    return (
                      <div
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                          !hasClass && (selectedLocationId === loc.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"),
                        )}
                        style={hasClass ? { backgroundColor: clsColor, color: "#fff" } : undefined}
                      >
                        {i + 1}
                      </div>
                    );
                  })()}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate font-medium">{translateAnatomyName(loc.name) || `Spot ${i + 1}`}</p>
                      {(() => {
                        const cls = (loc as any).classification as LesionClassification | undefined;
                        if (!cls || cls === "unclassified") return null;
                        const info = LESION_CLASSIFICATIONS[cls];
                        const isHighRisk = cls === "melanoma_suspect" || cls === "scc";
                        return (
                          <span className="flex items-center gap-0.5">
                            <span
                              className="text-[8px] font-bold px-1 rounded"
                              style={{ backgroundColor: `${info.color}20`, color: info.color }}
                            >
                              {info.shortLabel}
                            </span>
                            {isHighRisk && (
                              <span className="text-[8px]">⚠️</span>
                            )}
                         </span>
                        );
                      })()}
                      {(() => {
                        const opStatus = (loc as any).op_status;
                        if (!opStatus || opStatus === "none") return null;
                        return (
                          <span
                            className={cn(
                              "text-[8px] font-medium px-1.5 rounded border",
                              opStatus === "praesens"
                                ? "bg-sky-500/10 text-sky-600 border-sky-200 dark:border-sky-800"
                                : "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800"
                            )}
                          >
                            {opStatus === "praesens" ? "St. praes." : "St. post"}
                          </span>
                        );
                      })()}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {loc.images?.length ?? 0} {t('common.images')} · {loc.view === "back" ? t('common.backSide') : t('common.front')}
                    </p>
                  </div>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(loc.id); }}
                  className="shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  title={t('patientDetail.moveToTrash')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            </div>
          )}
          </div>

          {/* Trash Bin */}
          <div className="mt-4 border-t pt-3">
            <button
              onClick={() => setShowTrash(!showTrash)}
              className="flex w-full items-center justify-between text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="flex items-center gap-1.5 font-semibold uppercase tracking-wider">
                <Trash2 className="h-3 w-3" /> {t('patientDetail.trash')}
              </span>
              <span>{trashedLocations.length}</span>
            </button>
            {showTrash && trashedLocations.length > 0 && (
              <div className="mt-2 space-y-1">
                {trashedLocations.map((loc) => {
                  const isExpanded = expandedTrashId === loc.id;
                  const images = loc.images ?? [];
                  return (
                    <div key={loc.id} className="rounded-md border border-dashed border-border/50 bg-muted/30 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2 px-2.5 py-1.5">
                        <button
                          onClick={() => setExpandedTrashId(isExpanded ? null : loc.id)}
                          className="shrink-0 p-0.5 rounded hover:bg-accent transition-colors"
                          title={isExpanded ? t('common.collapse') : t('common.expand')}
                        >
                          <ChevronDown className={cn("h-3 w-3 transition-transform", isExpanded && "rotate-180")} />
                        </button>
                        <button
                          onClick={() => setExpandedTrashId(isExpanded ? null : loc.id)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <p className="truncate font-medium">{translateAnatomyName(loc.name) || "Spot"}</p>
                          <p className="text-[10px]">{images.length} {t('common.images')}</p>
                        </button>
                        <button
                          onClick={() => restoreMutation.mutate(loc.id)}
                          className="shrink-0 p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                          title={t('patientDetail.restoreFromTrash')}
                        >
                          <Undo2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setPermanentDeleteId(loc.id)}
                          className="shrink-0 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          title={t('patientDetail.permanentlyDelete')}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {isExpanded && images.length > 0 && (
                        <div className="px-2.5 pb-2 pt-1 border-t border-border/30">
                          <div className="grid grid-cols-3 gap-1.5">
                            {images.map((img: any, idx: number) => (
                              <div key={img.id ?? idx} className="relative aspect-square overflow-hidden rounded bg-muted">
                                <img
                                  src={api.resolveImageSrc(img)}
                                  alt={`${translateAnatomyName(loc.name)} ${idx + 1}`}
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                />
                                {img.created_at && (
                                  <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-[8px] text-white text-center py-0.5 truncate">
                                    {formatDate(img.created_at, 'dd.MM.yyyy')}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                          {loc.classification && (
                            <p className="mt-1.5 text-[10px]">
                              <span className="font-medium">{t('patientDetail.classification')}:</span>{" "}
                              {getClassificationLabel(loc.classification)}
                            </p>
                          )}
                        </div>
                      )}
                      {isExpanded && images.length === 0 && (
                        <p className="px-2.5 pb-2 pt-1 text-[10px] italic border-t border-border/30">{t('patientDetail.noImages')}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {showTrash && trashedLocations.length === 0 && (
              <p className="mt-2 text-[10px] text-muted-foreground italic">{t('patientDetail.trashEmpty')}</p>
            )}
          </div>
        </div>

      {/* Hidden file input for zone sidebar upload */}
      <input ref={zoneFileRef} type="file" accept="image/*" className="hidden" onChange={handleZoneSidebarUpload} />

        {/* Center + Right: Content */}
        <div className="flex-1 overflow-y-auto p-3 lg:p-6">
          <AnimatePresence mode="wait">
            {activeTab === "akte" ? (
              <motion.div
                key="akte"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
              >
                <PatientAkte
                  patient={patient}
                  onNavigateToSpot={(locationId) => {
                    setSelectedLocationId(locationId);
                    setActiveTab("spots");
                  }}
                />
              </motion.div>
            ) : activeTab === "uebersicht" ? (
              <motion.div
                key="uebersicht"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                {(() => {
                  const selectedZone = selectedLocationId
                    ? overviewLocations.find(l => l.id === selectedLocationId)
                    : null;
                  const zonesToShow = selectedZone ? [selectedZone] : overviewLocations;

                  return (
                    <>
                      <div className="flex items-center justify-between">
                        {selectedZone ? (
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="ghost" className="gap-1 h-8 px-2" onClick={() => setSelectedLocationId(null)}>
                              <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <h2 className="text-lg font-semibold text-foreground">{translateAnatomyName(selectedZone.name) || t('patientDetail.overview')}</h2>
                          </div>
                        ) : (
                          <h2 className="text-lg font-semibold text-foreground">{t('patientDetail.overviewPhotos')}</h2>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-xs"
                          onClick={() => {
                            createLocationMutation.mutate({
                              name: `Zone ${overviewLocations.length + 1}`,
                              x: 0, y: 0,
                              view: "front",
                              type: "overview",
                            });
                          }}
                          disabled={createLocationMutation.isPending}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          {t('patientDetail.newOverview')}
                        </Button>
                      </div>

                      {overviewLocations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                          <Eye className="h-10 w-10 mb-3" />
                          <p className="text-sm font-medium">{t('overviewPhoto.noZonesYet')}</p>
                          <p className="text-xs mt-1">{t('overviewPhoto.zonesDescription')}</p>
                          <Button
                            size="sm"
                            className="mt-4 gap-1.5"
                            onClick={() => {
                              createLocationMutation.mutate({
                                name: "Zone 1",
                                x: 0, y: 0,
                                view: "front",
                                type: "overview",
                              });
                            }}
                            disabled={createLocationMutation.isPending}
                          >
                            <Plus className="h-3.5 w-3.5" />
                            {t('overviewPhoto.createFirstZone')}
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-8">
                          {zonesToShow.map((loc) => (
                            <div key={loc.id} id={`zone-${loc.id}`}>
                            <OverviewPhoto
                              overviewLocation={loc}
                              spotLocations={spotLocations}
                              patientId={patientId}
                              onNavigateToSpot={(spotId) => {
                                setSelectedLocationId(spotId);
                                setActiveTab("spots");
                              }}
                              onDelete={(locationId) => setDeleteConfirmId(locationId)}
                              onQrUpload={(locationId) => {
                                setQrLocationId(locationId);
                                setQrDialogOpen(true);
                              }}
                              onCreateSpotAndLink={async (name, pinCoords, overviewLocId) => {
                                try {
                                  const newLoc = await api.createLocation(patientId, {
                                    name: name || "Neuer Spot",
                                    x: 0, y: 0, view: "front", type: "spot",
                                  });
                                  await api.createOverviewPin(overviewLocId, {
                                    linked_location_id: newLoc.id,
                                    x_pct: pinCoords.x_pct,
                                    y_pct: pinCoords.y_pct,
                                  label: name || t("patientDetail.newSpot"),
                                  });
                                  queryClient.invalidateQueries({ queryKey: ["full-patient", patientId] });
                                  queryClient.invalidateQueries({ queryKey: ["overview-pins", overviewLocId] });
                                  setSelectedLocationId(newLoc.id);
                                  setActiveTab("spots");
                                  toast.success(t("patientDetail.spotCreated", { name: name || t("patientDetail.newSpot") }));
                                } catch {
                                  toast.error(t("patientDetail.spotCreateError"));
                                }
                              }}
                            />
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </motion.div>
            ) : activeTab === "fotos" ? (
              <motion.div
                key="fotos"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                <h2 className="text-lg font-semibold text-foreground">Alle Fotos ({totalImages})</h2>
                {totalImages === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <Camera className="h-10 w-10 mb-3" />
                    <p className="text-sm">Noch keine Fotos vorhanden</p>
                    <p className="text-xs mt-1">Wählen Sie einen Spot und laden Sie Bilder hoch</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {locations.filter(loc => (loc.images?.length ?? 0) > 0).map((loc) => {
                      const locName = translateAnatomyName(loc.name) || (loc.type === "region" ? "Region" : `Spot #${loc.id}`);
                      const sortedImages = [...(loc.images ?? [])].sort(
                        (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
                      );
                      return (
                        <div key={loc.id} className="space-y-3">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "flex h-5 w-5 items-center justify-center text-[10px] font-bold",
                              loc.type === "region" ? "rounded bg-amber-500 text-white" : "rounded-full bg-primary text-primary-foreground"
                            )}>
                              {loc.type === "region" ? "▭" : <MapPin className="h-3 w-3" />}
                            </div>
                            <h3 className="text-sm font-semibold text-foreground">{locName}</h3>
                            <span className="text-[10px] text-muted-foreground">
                              {sortedImages.length} {sortedImages.length === 1 ? "Foto" : "Fotos"} · {loc.view === "back" ? "Hinten" : "Vorne"}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 lg:gap-3">
                            {sortedImages.map((img) => (
                              <button
                                key={img.id}
                                onClick={() => {
                                  setSelectedLocationId(loc.id);
                                  setActiveTab("spots");
                                }}
                                className="group relative overflow-hidden rounded-lg border bg-card transition-all hover:ring-2 hover:ring-primary hover:shadow-md cursor-pointer"
                                title={`→ ${locName} anzeigen`}
                              >
                                <div className="aspect-square">
                                  <img
                                    src={api.resolveImageSrc(img)}
                                    alt={`${locName} – Aufnahme`}
                                    className="h-full w-full object-cover"
                                    loading="lazy"
                                  />
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute bottom-0 left-0 right-0 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <p className="text-[9px] text-white font-medium truncate">{locName}</p>
                                  <p className="text-[8px] text-white/70 tabular-nums">
                                    {img.created_at ? formatDate(img.created_at, "dd.MM.yy") : "–"}
                                  </p>
                                </div>
                                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <MapPin className="h-3 w-3 text-white drop-shadow-md" />
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            ) : activeTab === "timeline" ? (
              <motion.div
                key="timeline"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="space-y-2"
              >
                <h2 className="text-lg font-semibold text-foreground mb-4">Chronologischer Verlauf</h2>
                {(() => {
                  // Collect all events from all locations
                  const events: { date: string; type: "image" | "finding" | "location"; label: string; detail?: string; locationName: string; locationId: number; imagePath?: string; imageUrl?: string; userName?: string }[] = [];
                  locations.forEach((loc) => {
                    const locName = translateAnatomyName(loc.name) || `Spot #${loc.id}`;
                    // Location creation
                    events.push({ date: loc.created_at ?? "", type: "location", label: t('patientDetail.spotCreatedEvent'), detail: locName, locationName: locName, locationId: loc.id });
                    // Images
                    (loc.images ?? []).forEach((img) => {
                      events.push({ date: img.created_at ?? "", type: "image", label: t('patientDetail.imageUploadedEvent'), locationName: locName, locationId: loc.id, imagePath: img.image_path, imageUrl: img.image_url });
                    });
                    // Findings
                    (loc.findings ?? []).forEach((f: any) => {
                      events.push({ date: f.created_at ?? "", type: "finding", label: t('patientDetail.findingEvent'), detail: f.description, locationName: locName, locationId: loc.id, userName: f.user_name });
                    });
                  });
                  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                  if (events.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                        <Activity className="h-10 w-10 mb-3" />
                        <p className="text-sm">{t('patientDetail.noEntriesYet')}</p>
                      </div>
                    );
                  }

                  return (
                    <div className="relative border-l-2 border-muted ml-4 space-y-4">
                      {events.map((ev, i) => (
                        <div key={i} className="relative pl-6">
                          <div className={cn(
                            "absolute -left-[9px] top-1.5 h-4 w-4 rounded-full border-2 border-background",
                            ev.type === "image" ? "bg-blue-500" : ev.type === "finding" ? "bg-amber-500" : "bg-primary"
                          )} />
                          <div className="rounded-lg border bg-card p-3 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-xs">
                                {ev.type === "image" && <ImageIcon className="h-3.5 w-3.5 text-blue-500" />}
                                {ev.type === "finding" && <Activity className="h-3.5 w-3.5 text-amber-500" />}
                                {ev.type === "location" && <MapPin className="h-3.5 w-3.5 text-primary" />}
                                <span className="font-medium text-foreground">{ev.label}</span>
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">{ev.locationName}</Badge>
                              </div>
                              <span className="text-[10px] text-muted-foreground tabular-nums flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {ev.date ? formatDate(ev.date, "dd.MM.yyyy HH:mm") : "–"}
                              </span>
                            </div>
                            {ev.userName && <p className="text-xs text-muted-foreground italic">{t('patientDetail.by')} {ev.userName}</p>}
                            {ev.detail && <p className="text-sm text-muted-foreground">{ev.detail}</p>}
                            {ev.imagePath && (
                              <img
                                src={ev.imageUrl || api.getImageUrl(ev.imagePath)}
                                alt="Aufnahme"
                                className="h-24 w-20 rounded object-cover border mt-1"
                                loading="lazy"
                              />
                            )}
                            <button
                              onClick={() => { setActiveTab("spots"); setSelectedLocationId(ev.locationId); }}
                              className="text-[10px] text-primary hover:underline"
                            >
                              {t('patientDetail.toSpot')}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </motion.div>
            ) : activeTab === "berichte" ? (
              <motion.div
                key="berichte"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">{t('patientDetail.reports')}</h2>
                  <Button onClick={() => setPdfDialogOpen(true)} size="sm" className="gap-1.5">
                    <FileDown className="h-3.5 w-3.5" />
                    {t('patientDetail.newReport')}
                  </Button>
                </div>
                <PdfReportHistory patientId={patient.id} patientName={patient.name} />
              </motion.div>
            ) : selectedLocation ? (
              <motion.div
                key={selectedLocation.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                {/* Location Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "flex h-8 w-8 items-center justify-center text-sm font-bold",
                      selectedLocation.type === "region"
                        ? "rounded bg-amber-500 text-white"
                        : "rounded-full bg-primary text-primary-foreground"
                    )}>
                      {selectedLocation.type === "region" ? <Square className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        {translateAnatomyName(selectedLocation.name) || (selectedLocation.type === "region" ? "Region" : `Spot #${selectedLocation.id}`)}
                        {selectedLocation.type === "region" && (
                          <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">Region</Badge>
                        )}
                      </h2>
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>{selectedLocation.view === "back" ? t('common.backSide') : t('common.front')}</span>
                        <span>·</span>
                        <span>{selectedLocation.images?.length ?? 0} {t('patientDetail.recordings')}</span>
                      </p>
                    </div>
                  </div>
                  {/* QR Upload Button – nur für Spots, nicht für Regionen */}
                  {selectedLocation.type !== "region" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={() => { setQrLocationId(selectedLocation.id); setQrDialogOpen(true); }}
                    >
                      <QrCode className="h-3.5 w-3.5" /> QR Upload
                    </Button>
                  )}
                </div>

                {/* Lesion Classification – compact collapsible */}
                {selectedLocation.type !== "region" && (() => {
                  const currentCls = (selectedLocation as any).classification as LesionClassification || "unclassified";
                  const currentInfo = LESION_CLASSIFICATIONS[currentCls];
                  return (
                    <Collapsible className="rounded-lg border bg-card">
                      <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-2.5 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-2">
                          <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">{t('patientDetail.classification')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1.5 text-[11px] font-medium text-foreground/80">
                            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: currentInfo?.color || 'hsl(var(--muted-foreground))' }} />
                            {getClassificationLabel(currentCls)}
                          </span>
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="flex flex-wrap gap-1.5 px-4 pb-3 pt-1">
                          {(Object.entries(LESION_CLASSIFICATIONS) as [LesionClassification, { label: string; color: string; shortLabel: string }][]).map(([key, cls]) => {
                            const isActive = currentCls === key;
                            return (
                              <button
                                key={key}
                                onClick={() => classifyMutation.mutate({ locationId: selectedLocation.id, classification: key })}
                                className={cn(
                                  "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium border transition-all",
                                  isActive
                                    ? "ring-1 ring-offset-1 ring-offset-background shadow-sm"
                                    : "opacity-50 hover:opacity-90 border-border text-foreground/70"
                                )}
                                style={isActive ? {
                                  borderColor: cls.color,
                                  backgroundColor: `${cls.color}15`,
                                  color: cls.color,
                                } : {}}
                              >
                                <span
                                  className="h-2 w-2 rounded-full shrink-0"
                                  style={{ backgroundColor: isActive ? cls.color : `${cls.color}60` }}
                                />
                                {getClassificationLabel(key)}
                              </button>
                            );
                          })}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })()}

                {/* OP Status */}
                {selectedLocation.type !== "region" && (
                  <div className="rounded-lg border bg-card p-4 space-y-3">
                    <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                      <Activity className="h-3.5 w-3.5 text-primary" />
                      {t('patientDetail.clinicalStatus')}
                    </h4>
                    <div className="flex gap-1.5">
                      {([
                        { key: "none", label: t('patientDetail.noStatus'), icon: "–" },
                        { key: "praesens", label: t('patientDetail.statusPraesens'), icon: "Sp" },
                        { key: "post", label: t('patientDetail.statusPost'), icon: "St.p." },
                      ] as const).map((opt) => {
                        const current = (selectedLocation as any).op_status || "none";
                        const isActive = current === opt.key;
                        return (
                          <button
                            key={opt.key}
                            onClick={() => opStatusMutation.mutate({ locationId: selectedLocation.id, op_status: opt.key })}
                            className={cn(
                              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium border transition-all",
                              isActive
                                ? opt.key === "praesens"
                                  ? "bg-sky-500/10 text-sky-600 border-sky-300 ring-1 ring-sky-300 dark:border-sky-700 dark:ring-sky-700"
                                  : opt.key === "post"
                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-300 ring-1 ring-emerald-300 dark:border-emerald-700 dark:ring-emerald-700"
                                    : "bg-muted text-foreground border-border ring-1 ring-border"
                                : "opacity-60 hover:opacity-100 border-border text-muted-foreground"
                            )}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedLocation.type === "region" && (selectedLocation.images?.length ?? 0) >= 2 && (
                  <div className="rounded-lg border bg-card p-4 space-y-4">
                    <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                      <GitCompareArrows className="h-3.5 w-3.5 text-amber-500" />
                      {t('patientDetail.progressComparison')}
                    </h4>
                    {(() => {
                      const sorted = [...(selectedLocation.images ?? [])].sort(
                        (a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime()
                      );
                      const oldest = sorted[0];
                      const newest = sorted[sorted.length - 1];
                      return (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <div className="relative overflow-hidden rounded-lg border aspect-[3/4] bg-muted">
                                <img
                                  src={api.resolveImageSrc(oldest)}
                                  alt="Ältere Aufnahme"
                                  className="h-full w-full object-cover"
                                />
                                  <div className="absolute top-2 left-2 rounded-full bg-muted/90 px-2 py-0.5 text-[10px] font-semibold text-foreground backdrop-blur-sm">
                                   {t('patientDetail.older')}
                                </div>
                              </div>
                              <p className="text-center text-xs text-muted-foreground tabular-nums">
                                {oldest.created_at ? formatDate(oldest.created_at, "dd. MMM yyyy") : "–"}
                              </p>
                            </div>
                            <div className="space-y-2">
                              <div className="relative overflow-hidden rounded-lg border aspect-[3/4] bg-muted">
                                <img
                                  src={api.resolveImageSrc(newest)}
                                  alt="Neuere Aufnahme"
                                  className="h-full w-full object-cover"
                                />
                                 <div className="absolute top-2 left-2 rounded-full bg-primary/90 px-2 py-0.5 text-[10px] font-semibold text-primary-foreground backdrop-blur-sm">
                                   {t('patientDetail.newer')}
                                </div>
                              </div>
                              <p className="text-center text-xs text-muted-foreground tabular-nums">
                                {newest.created_at ? formatDate(newest.created_at, "dd. MMM yyyy") : "–"}
                              </p>
                            </div>
                          </div>
                          {oldest.created_at && newest.created_at && (
                            <div className="text-center">
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                Zeitraum: {getDaysDiff(oldest.created_at, newest.created_at)}
                              </span>
                            </div>
                          )}
                          {sorted.length > 2 && (
                            <p className="text-center text-[10px] text-muted-foreground">
                              {sorted.length} Aufnahmen insgesamt · Alle Fotos unten in der Galerie
                            </p>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Findings */}
                <div className="rounded-lg border bg-card p-4 space-y-3">
                  <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">{t('patientDetail.findingsTitle')}</h4>

                  {/* Existing findings */}
                  {selectedLocation.findings && selectedLocation.findings.map((f) => (
                    <div key={f.id} className="flex items-start gap-2 rounded-md bg-muted/50 p-3">
                      <Activity className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                      {editingFindingId === f.id ? (
                        <div className="flex-1 space-y-2">
                          <Textarea
                            value={editingFindingText}
                            onChange={(e) => setEditingFindingText(e.target.value)}
                            rows={2}
                            className="text-sm"
                          />
                          <div className="flex gap-1.5">
                            <Button size="sm" variant="default" onClick={() => updateFindingMutation.mutate({ findingId: f.id, description: editingFindingText })} disabled={updateFindingMutation.isPending}>
                              <Save className="mr-1 h-3 w-3" /> {t('common.save')}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => { setEditingFindingId(null); setEditingFindingText(""); }}>
                              <X className="mr-1 h-3 w-3" /> {t('common.cancel')}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 flex items-start justify-between">
                          <div>
                            <p className="text-sm text-foreground">{f.description || "–"}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {f.user_name && <span className="font-medium">{f.user_name}</span>}
                              {f.user_name && f.created_at && " · "}
                              {f.created_at && new Date(f.created_at).toLocaleDateString("de-CH")}
                            </p>
                          </div>
                          <div className="flex gap-1 shrink-0 ml-2">
                            <button onClick={() => { setEditingFindingId(f.id); setEditingFindingText(f.description || ""); }} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => deleteFindingMutation.mutate(f.id)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add new finding */}
                  <div className="space-y-2 pt-2 border-t">
                    <Textarea
                      placeholder={t('patientDetail.newFindingPlaceholder')}
                      value={newFindingText}
                      onChange={(e) => setNewFindingText(e.target.value)}
                      rows={2}
                      className="text-sm"
                    />
                    <Button
                      size="sm"
                      disabled={!newFindingText.trim() || createFindingMutation.isPending}
                      onClick={() => createFindingMutation.mutate({ locationId: selectedLocation.id, description: newFindingText.trim() })}
                    >
                      <Plus className="mr-1 h-3 w-3" /> {t('patientDetail.addFinding')}
                    </Button>
                  </div>
                </div>

                {/* Risk Progression */}
                {(selectedLocation.images?.length ?? 0) > 0 && (
                  <RiskProgression
                    images={selectedLocation.images ?? []}
                    locationName={translateAnatomyName(selectedLocation.name) || `Spot #${selectedLocation.id}`}
                  />
                )}

                {/* Image Gallery */}
                <ImageGallery
                  locationId={selectedLocation.id}
                  patientId={patientId}
                  images={selectedLocation.images ?? []}
                  locationName={translateAnatomyName(selectedLocation.name) || (selectedLocation.type === "region" ? "Region" : `Spot #${selectedLocation.id}`)}
                  locationType={selectedLocation.type || "spot"}
                  patientName={patient.name}
                  patientBirthDate={patient.birth_date}
                />
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-full text-muted-foreground"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                  <MapPin className="h-8 w-8" />
                </div>
                <p className="text-sm font-medium">{t('patientDetail.selectBodyPart')}</p>
                <p className="text-xs mt-1">{t('patientDetail.clickBodyMapInstruction')}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Global QR Upload Dialog */}
      {qrLocationId && (
        <QrUploadDialog
          open={qrDialogOpen}
          onOpenChange={(open) => { setQrDialogOpen(open); if (!open) setQrLocationId(null); }}
          patientId={patientId}
          patientName={patient.name}
          locationId={qrLocationId}
          locationName={locations.find(l => l.id === qrLocationId)?.name || `Location #${qrLocationId}`}
        />
      )}

      {/* Soft Delete Confirmation */}
      <AlertDialog open={deleteConfirmId !== null} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {t('patientDetail.softDeleteTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const loc = locations.find(l => l.id === deleteConfirmId);
                if (!loc) return t('patientDetail.softDeleteGeneric');
                return (
                  <>
                    <strong>{translateAnatomyName(loc.name) || t('patientDetail.softDeleteGeneric')}</strong> {t('patientDetail.softDeleteDesc', { images: loc.images?.length ?? 0, findings: loc.findings?.length ?? 0 })}
                  </>
                );
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
             <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirmId && softDeleteMutation.mutate(deleteConfirmId)}
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              {t('patientDetail.moveToTrashBtn')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permanent Delete Confirmation */}
      <AlertDialog open={permanentDeleteId !== null} onOpenChange={(open) => !open && setPermanentDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {t('patientDetail.permanentDeleteTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const loc = trashedLocations.find(l => l.id === permanentDeleteId);
                if (!loc) return t('patientDetail.permanentDeleteGeneric');
                return (
                  <>
                    <strong>{translateAnatomyName(loc.name) || t('patientDetail.permanentDeleteGeneric')}</strong> {t('patientDetail.permanentDeleteDesc', { images: loc.images?.length ?? 0, findings: loc.findings?.length ?? 0 })}
                  </>
                );
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => permanentDeleteId && permanentDeleteMutation.mutate(permanentDeleteId)}
            >
              {t('patientDetail.permanentlyDelete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PDF Preview Dialog */}
      <Dialog open={!!pdfPreviewUrl} onOpenChange={(open) => { if (!open) { if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl); setPdfPreviewUrl(null); } }}>
        <DialogContent className="max-w-3xl h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle className="flex items-center justify-between">
               <span className="text-sm">{t('patientDetail.pdfPreviewTitle')}</span>
               <Button size="sm" onClick={handlePdfDownload} className="gap-1.5">
                 <FileDown className="h-3.5 w-3.5" /> {t('common.download')}
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 px-4 pb-4">
            {pdfPreviewUrl && (
              <object
                data={pdfPreviewUrl}
                type="application/pdf"
                className="w-full h-full rounded-md border"
              >
                <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                   <p className="text-sm">{t('patientDetail.pdfNotSupported')}</p>
                   <Button size="sm" onClick={handlePdfDownload} className="gap-1.5">
                     <FileDown className="h-3.5 w-3.5" /> {t('patientDetail.directDownload')}
                  </Button>
                </div>
              </object>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* PDF Export Dialog */}
      <PdfExportDialog
        open={pdfDialogOpen}
        onOpenChange={setPdfDialogOpen}
        patient={patient}
        doctorName={user?.name}
      />

      {/* Mobile Bottom Navigation - fixed at bottom, only on small screens */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur-sm lg:hidden safe-area-bottom">
        <div className="flex items-center justify-around py-1.5">
          {[
            { key: "akte" as const, icon: ClipboardList, label: t('patientDetail.bottomNav.chart') },
            { key: "spots" as const, icon: MapPin, label: t('patientDetail.bottomNav.spots') },
            { key: "fotos" as const, icon: Camera, label: t('patientDetail.bottomNav.photos') },
            { key: "berichte" as const, icon: FileDown, label: t('patientDetail.bottomNav.reports') },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-all min-w-[60px]",
                activeTab === tab.key
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <tab.icon className={cn("h-5 w-5", activeTab === tab.key && "text-primary")} />
              <span className={cn("text-[10px] font-medium", activeTab === tab.key && "font-semibold")}>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

function getDaysDiff(dateA: string, dateB: string): string {
  const a = new Date(dateA);
  const b = new Date(dateB);
  const diffMs = Math.abs(b.getTime() - a.getTime());
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return "Gleicher Tag";
  if (days < 30) return `${days} Tage`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} Monat${months > 1 ? "e" : ""}`;
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  return remMonths > 0 ? `${years} Jahr${years > 1 ? "e" : ""}, ${remMonths} Mon.` : `${years} Jahr${years > 1 ? "e" : ""}`;
}

export default PatientDetail;
