import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";

import type { FullPatient, LesionClassification } from "@/types/patient";
import { LESION_CLASSIFICATIONS } from "@/types/patient";
import { useState } from "react";
import type { LesionClassification as LesionClassificationType } from "@/types/patient";
import { ArrowLeft, MapPin, Plus, Calendar, ImageIcon, User, Hash, Activity, Mail, Phone, Pencil, Trash2, Save, X, Square, GitCompareArrows, Move, Camera, Tag, QrCode, Undo2, AlertTriangle } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import BodyMap3D from "@/components/BodyMap3D";
import ImageGallery from "@/components/ImageGallery";
import ImageCompare from "@/components/ImageCompare";
import QrUploadDialog from "@/components/QrUploadDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
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
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const patientId = Number(id);

  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [mapClickDialog, setMapClickDialog] = useState<{
    x: number;
    y: number;
    view: "front" | "back";
    markType?: "spot" | "region";
    x3d?: number;
    y3d?: number;
    z3d?: number;
    nx?: number;
    ny?: number;
    nz?: number;
  } | null>(null);
  const [locationName, setLocationName] = useState("");
  const [activeTab, setActiveTab] = useState<"spots" | "timeline" | "fotos">("spots");
  const [newFindingText, setNewFindingText] = useState("");
  const [regionWidth, setRegionWidth] = useState(40);
  const [regionHeight, setRegionHeight] = useState(30);
  const [spotX, setSpotX] = useState(0);
  const [spotY, setSpotY] = useState(0);
  const [editingFindingId, setEditingFindingId] = useState<number | null>(null);
  const [editingFindingText, setEditingFindingText] = useState("");
  const [classificationFilter, setClassificationFilter] = useState<LesionClassificationType[]>([]);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [showTrash, setShowTrash] = useState(false);
  const [permanentDeleteId, setPermanentDeleteId] = useState<number | null>(null);
  const [mobileMapExpanded, setMobileMapExpanded] = useState(true);

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
      type?: "spot" | "region";
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
      queryClient.invalidateQueries({ queryKey: ["full-patient", patientId] });
      setMapClickDialog(null);
      setLocationName("");
      setSelectedLocationId(newLoc.id);
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["full-patient", patientId] });
      queryClient.invalidateQueries({ queryKey: ["trashed-locations", patientId] });
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
    setMapClickDialog({
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
    });
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
  };

  const handleCreateLocation = () => {
    if (!mapClickDialog) return;
    const isRegion = mapClickDialog.markType === "region";

    createLocationMutation.mutate({
      name: locationName.trim() || undefined,
      x: mapClickDialog.x,
      y: mapClickDialog.y,
      view: mapClickDialog.view,
      type: mapClickDialog.markType || "spot",
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
        <p className="text-sm text-destructive">Patient konnte nicht geladen werden.</p>
        <Button variant="outline" onClick={() => navigate("/patients")}>Zurück zur Liste</Button>
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
            <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Zurück</span>
          </Button>

          <div className="h-6 w-px bg-border hidden sm:block" />

          <div className="flex items-center gap-2 lg:gap-3 min-w-0">
            <div className="flex h-8 w-8 lg:h-10 lg:w-10 items-center justify-center rounded-full bg-primary/10 text-xs lg:text-sm font-semibold text-primary shrink-0">
              {patient.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-semibold text-foreground truncate">{patient.name}</h1>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">Aktiv</Badge>
              </div>
              <p className="text-xs text-muted-foreground hidden sm:block">Patient</p>
            </div>
          </div>

          {/* Mode tabs - push right */}
          <div className="ml-auto flex items-center gap-1 rounded-lg bg-muted p-0.5 lg:p-1 shrink-0">
            {[
              { key: "spots" as const, icon: MapPin, label: "SPOTS" },
              { key: "fotos" as const, icon: Camera, label: "FOTOS" },
              { key: "timeline" as const, icon: Activity, label: "TIMELINE" },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-1 rounded-md px-2 py-1 lg:px-3 lg:py-1.5 text-[10px] lg:text-xs font-medium transition-all",
                  activeTab === tab.key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <tab.icon className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Patient details row - hidden on mobile, shown on desktop */}
        <div className="hidden lg:flex items-center gap-6 text-xs mt-2 pl-[52px]">
          <div>
            <span className="text-muted-foreground">ID</span>
            <p className="font-mono font-medium text-foreground">{patient.id}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Geschlecht</span>
            <p className="font-medium text-foreground">{patient.gender === "female" ? "Weiblich" : "Männlich"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Geburtsdatum</span>
            <p className="font-medium text-foreground tabular-nums">
              {patient.birth_date ? format(new Date(patient.birth_date), "dd.MM.yyyy", { locale: de }) : "–"}
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
            <span className="text-muted-foreground">Stellen</span>
            <p className="font-medium text-foreground">{locations.length}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Aufnahmen</span>
            <p className="font-medium text-foreground">{totalImages}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Body Map */}
        <div className={cn(
          "shrink-0 border-r bg-card p-3 overflow-y-auto flex flex-col transition-all duration-300",
          mapClickDialog ? "w-[480px]" : "w-[360px]"
        )}>
          <div className={cn(
            "transition-all duration-300",
            mapClickDialog ? "h-[560px]" : "h-[450px]"
          )}>
            <BodyMap3D
              markers={locations.map((l) => {
                const pf = (v: any) => v != null ? parseFloat(String(v)) : null;
                const pfn = (v: any) => { const n = pf(v); return n != null && !isNaN(n) ? n : null; };
                return { id: l.id, x: pfn(l.x), y: pfn(l.y), x3d: pfn(l.x3d), y3d: pfn(l.y3d), z3d: pfn(l.z3d), nx: pfn(l.nx), ny: pfn(l.ny), nz: pfn(l.nz), name: l.name, view: l.view, type: l.type, width: l.width, height: l.height, imageCount: l.images?.length ?? 0, findingCount: l.findings?.length ?? 0, classification: (l as any).classification, classificationColor: LESION_CLASSIFICATIONS[(l as any).classification as LesionClassification || "unclassified"]?.color };
              })}
              gender={patient.gender}
              onMapClick={handleMapClick}
              selectedLocationId={selectedLocationId}
              onMarkerClick={(id) => { setMapClickDialog(null); setSelectedLocationId(id); }}
              classificationFilter={classificationFilter}
              onFilterChange={setClassificationFilter}
              isPlacementMode={!!mapClickDialog}
              onPreviewMove={handlePreviewMove}
              previewMarker={mapClickDialog ? {
                x: mapClickDialog.x,
                y: mapClickDialog.y,
                view: mapClickDialog.view,
                type: mapClickDialog.markType || "spot",
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
                  {mapClickDialog.markType === "region" ? (
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
                <Badge variant="outline" className="text-[10px]">{mapClickDialog.view === "back" ? "Rückseite" : "Vorderseite"}</Badge>
                {mapClickDialog.markType !== "region" && (
                  <span className="flex items-center gap-1 text-green-600 font-medium">
                    <Move className="h-3 w-3" /> Marker ziehen zum Verschieben
                  </span>
                )}
              </div>

              {/* Region: Size adjustment with live preview */}
              {mapClickDialog.markType === "region" && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                    <Square className="h-3 w-3 text-amber-500" /> Grösse anpassen
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Label className="text-[10px] w-10 shrink-0">Breite</Label>
                      <Slider value={[regionWidth]} onValueChange={([v]) => setRegionWidth(v)} min={10} max={150} step={1} className="flex-1" />
                      <span className="text-[10px] text-muted-foreground font-mono w-6 text-right">{regionWidth}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-[10px] w-10 shrink-0">Höhe</Label>
                      <Slider value={[regionHeight]} onValueChange={([v]) => setRegionHeight(v)} min={10} max={150} step={1} className="flex-1" />
                      <span className="text-[10px] text-muted-foreground font-mono w-6 text-right">{regionHeight}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-[10px]">Bezeichnung</Label>
                <Input
                  placeholder={mapClickDialog.markType === "region" ? "z.B. Oberer Rücken..." : "z.B. Linker Unterarm..."}
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <Button className="w-full h-8 text-xs" onClick={handleCreateLocation} disabled={createLocationMutation.isPending}>
                {createLocationMutation.isPending ? "Wird erstellt…" : mapClickDialog.markType === "region" ? "Region anlegen" : "Spot anlegen"}
              </Button>
            </div>
          )}

          {/* Spots List */}
          <div className="mt-4 space-y-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Spots</h3>
              <span className="text-[10px] text-muted-foreground">{locations.filter(l => l.type !== "region").length} Stellen</span>
            </div>
            {locations.filter(l => l.type !== "region").filter(l => {
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
                  onClick={() => { setMapClickDialog(null); setSelectedLocationId(loc.id); }}
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
                      <p className="truncate font-medium">{loc.name || `Spot ${i + 1}`}</p>
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
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {loc.images?.length ?? 0} Bilder · {loc.view === "back" ? "Hinten" : "Vorne"}
                    </p>
                  </div>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(loc.id); }}
                  className="shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  title="In Papierkorb verschieben"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Trash Bin */}
          <div className="mt-4 border-t pt-3">
            <button
              onClick={() => setShowTrash(!showTrash)}
              className="flex w-full items-center justify-between text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="flex items-center gap-1.5 font-semibold uppercase tracking-wider">
                <Trash2 className="h-3 w-3" /> Papierkorb
              </span>
              <span>{trashedLocations.length}</span>
            </button>
            {showTrash && trashedLocations.length > 0 && (
              <div className="mt-2 space-y-1">
                {trashedLocations.map((loc) => (
                  <div
                    key={loc.id}
                    className="flex items-center gap-2 rounded-md border border-dashed border-border/50 bg-muted/30 px-2.5 py-1.5 text-xs text-muted-foreground"
                  >
                    <Trash2 className="h-3 w-3 shrink-0 opacity-50" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{loc.name || "Spot"}</p>
                      <p className="text-[10px]">{loc.images?.length ?? 0} Bilder</p>
                    </div>
                    <button
                      onClick={() => restoreMutation.mutate(loc.id)}
                      className="shrink-0 p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                      title="Wiederherstellen"
                    >
                      <Undo2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setPermanentDeleteId(loc.id)}
                      className="shrink-0 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title="Endgültig löschen"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {showTrash && trashedLocations.length === 0 && (
              <p className="mt-2 text-[10px] text-muted-foreground italic">Papierkorb ist leer</p>
            )}
          </div>
        </div>


        {/* Center + Right: Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {activeTab === "fotos" ? (
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
                      const locName = loc.name || (loc.type === "region" ? "Region" : `Spot #${loc.id}`);
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
                          <div className="grid grid-cols-4 gap-3 sm:grid-cols-5 md:grid-cols-6">
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
                                    {img.created_at ? format(new Date(img.created_at), "dd.MM.yy", { locale: de }) : "–"}
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
                  const events: { date: string; type: "image" | "finding" | "location"; label: string; detail?: string; locationName: string; locationId: number; imagePath?: string }[] = [];
                  locations.forEach((loc) => {
                    const locName = loc.name || `Spot #${loc.id}`;
                    // Location creation
                    events.push({ date: loc.created_at ?? "", type: "location", label: "Spot erstellt", detail: locName, locationName: locName, locationId: loc.id });
                    // Images
                    (loc.images ?? []).forEach((img) => {
                      events.push({ date: img.created_at ?? "", type: "image", label: "Bild hochgeladen", locationName: locName, locationId: loc.id, imagePath: img.image_path });
                    });
                    // Findings
                    (loc.findings ?? []).forEach((f) => {
                      events.push({ date: f.created_at ?? "", type: "finding", label: "Befund", detail: f.description, locationName: locName, locationId: loc.id });
                    });
                  });
                  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                  if (events.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                        <Activity className="h-10 w-10 mb-3" />
                        <p className="text-sm">Noch keine Einträge vorhanden</p>
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
                                {ev.date ? format(new Date(ev.date), "dd.MM.yyyy HH:mm", { locale: de }) : "–"}
                              </span>
                            </div>
                            {ev.detail && <p className="text-sm text-muted-foreground">{ev.detail}</p>}
                            {ev.imagePath && (
                              <img
                                src={api.getImageUrl(ev.imagePath)}
                                alt="Aufnahme"
                                className="h-24 w-20 rounded object-cover border mt-1"
                                loading="lazy"
                              />
                            )}
                            <button
                              onClick={() => { setActiveTab("spots"); setSelectedLocationId(ev.locationId); }}
                              className="text-[10px] text-primary hover:underline"
                            >
                              → Zum Spot
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
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
                        {selectedLocation.name || (selectedLocation.type === "region" ? "Region" : `Spot #${selectedLocation.id}`)}
                        {selectedLocation.type === "region" && (
                          <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">Region</Badge>
                        )}
                      </h2>
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>{selectedLocation.view === "back" ? "Rückseite" : "Vorderseite"}</span>
                        <span>·</span>
                        <span>{selectedLocation.images?.length ?? 0} Aufnahmen</span>
                      </p>
                    </div>
                  </div>
                  {/* QR Upload Button – nur für Spots, nicht für Regionen */}
                  {selectedLocation.type !== "region" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={() => setQrDialogOpen(true)}
                    >
                      <QrCode className="h-3.5 w-3.5" /> QR Upload
                    </Button>
                  )}
                </div>

                {/* QR Upload Dialog */}
                <QrUploadDialog
                  open={qrDialogOpen}
                  onOpenChange={setQrDialogOpen}
                  patientId={patientId}
                  patientName={patient.name}
                  locationId={selectedLocation.id}
                  locationName={selectedLocation.name || `Spot #${selectedLocation.id}`}
                />

                {/* Lesion Classification */}
                {selectedLocation.type !== "region" && (
                  <div className="rounded-lg border bg-card p-4 space-y-3">
                    <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                      <Tag className="h-3.5 w-3.5 text-primary" />
                      Klassifizierung
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {(Object.entries(LESION_CLASSIFICATIONS) as [LesionClassification, { label: string; color: string; shortLabel: string }][]).map(([key, cls]) => {
                        const current = (selectedLocation as any).classification || "unclassified";
                        const isActive = current === key;
                        return (
                          <button
                            key={key}
                            onClick={() => classifyMutation.mutate({ locationId: selectedLocation.id, classification: key })}
                            className={cn(
                              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium border transition-all",
                              isActive
                                ? "ring-2 ring-offset-1 ring-offset-background shadow-sm"
                                : "opacity-60 hover:opacity-100"
                            )}
                            style={{
                              borderColor: cls.color,
                              backgroundColor: isActive ? `${cls.color}20` : "transparent",
                              color: cls.color,
                              ...(isActive ? { ringColor: cls.color } : {}),
                            }}
                          >
                            <span
                              className="h-2.5 w-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: cls.color }}
                            />
                            {cls.label}
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
                      Verlaufsvergleich
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
                                  src={api.getImageUrl(oldest.image_path)}
                                  alt="Ältere Aufnahme"
                                  className="h-full w-full object-cover"
                                />
                                <div className="absolute top-2 left-2 rounded-full bg-muted/90 px-2 py-0.5 text-[10px] font-semibold text-foreground backdrop-blur-sm">
                                  ÄLTER
                                </div>
                              </div>
                              <p className="text-center text-xs text-muted-foreground tabular-nums">
                                {oldest.created_at ? format(new Date(oldest.created_at), "dd. MMM yyyy", { locale: de }) : "–"}
                              </p>
                            </div>
                            <div className="space-y-2">
                              <div className="relative overflow-hidden rounded-lg border aspect-[3/4] bg-muted">
                                <img
                                  src={api.getImageUrl(newest.image_path)}
                                  alt="Neuere Aufnahme"
                                  className="h-full w-full object-cover"
                                />
                                <div className="absolute top-2 left-2 rounded-full bg-primary/90 px-2 py-0.5 text-[10px] font-semibold text-primary-foreground backdrop-blur-sm">
                                  NEUER
                                </div>
                              </div>
                              <p className="text-center text-xs text-muted-foreground tabular-nums">
                                {newest.created_at ? format(new Date(newest.created_at), "dd. MMM yyyy", { locale: de }) : "–"}
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
                  <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Befunde</h4>

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
                              <Save className="mr-1 h-3 w-3" /> Speichern
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => { setEditingFindingId(null); setEditingFindingText(""); }}>
                              <X className="mr-1 h-3 w-3" /> Abbrechen
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
                      placeholder="Neuen Befund eingeben…"
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
                      <Plus className="mr-1 h-3 w-3" /> Befund hinzufügen
                    </Button>
                  </div>
                </div>

                {/* Image Gallery */}
                <ImageGallery
                  locationId={selectedLocation.id}
                  patientId={patientId}
                  images={selectedLocation.images ?? []}
                  locationName={selectedLocation.name || (selectedLocation.type === "region" ? "Region" : `Spot #${selectedLocation.id}`)}
                  locationType={selectedLocation.type || "spot"}
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
                <p className="text-sm font-medium">Wählen Sie eine Körperstelle aus</p>
                <p className="text-xs mt-1">oder klicken Sie auf die Body Map, um eine neue Stelle zu markieren</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Soft Delete Confirmation */}
      <AlertDialog open={deleteConfirmId !== null} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Spot in Papierkorb verschieben?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const loc = locations.find(l => l.id === deleteConfirmId);
                if (!loc) return "Dieser Spot wird in den Papierkorb verschoben.";
                return (
                  <>
                    <strong>{loc.name || "Dieser Spot"}</strong> wird mit {loc.images?.length ?? 0} Bildern und {loc.findings?.length ?? 0} Befunden in den Papierkorb verschoben. Sie können ihn jederzeit wiederherstellen.
                  </>
                );
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirmId && softDeleteMutation.mutate(deleteConfirmId)}
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              In Papierkorb
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
              Endgültig löschen?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const loc = trashedLocations.find(l => l.id === permanentDeleteId);
                if (!loc) return "Dieser Spot wird unwiderruflich gelöscht.";
                return (
                  <>
                    <strong>{loc.name || "Dieser Spot"}</strong> wird mit allen zugehörigen Bildern und Befunden unwiderruflich gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
                  </>
                );
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => permanentDeleteId && permanentDeleteMutation.mutate(permanentDeleteId)}
            >
              Endgültig löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
