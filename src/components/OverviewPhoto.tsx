import { useState, useRef, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Location, OverviewPin, LocationImage, LesionClassification } from "@/types/patient";
import { LESION_CLASSIFICATIONS } from "@/types/patient";
import { Upload, Plus, X, Trash2, MapPin, Eye, Pencil, ImageIcon, Camera, QrCode, Save, GitCompareArrows, Layers, Calendar, ZoomIn, ZoomOut, RotateCcw, Wand2, Move, RotateCw, ChevronDown, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/dateUtils";
import { toast } from "sonner";
import { alignImages } from "@/lib/imageAlign";
import { motion, AnimatePresence } from "framer-motion";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

interface OverviewPhotoProps {
  overviewLocation: Location & { images: LocationImage[] };
  spotLocations: (Location & { images: LocationImage[] })[];
  patientId: number;
  onNavigateToSpot: (locationId: number) => void;
  onDelete?: (locationId: number) => void;
  onQrUpload?: (locationId: number) => void;
  onCreateSpotAndLink?: (name: string, pinCoords: { x_pct: number; y_pct: number }, overviewLocationId: number) => void;
}

const OverviewPhoto = ({ overviewLocation, spotLocations, patientId, onNavigateToSpot, onDelete, onQrUpload, onCreateSpotAndLink }: OverviewPhotoProps) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const spotFileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pinMode, setPinMode] = useState(false);
  const [pendingPin, setPendingPin] = useState<{ x_pct: number; y_pct: number } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [editMode, setEditMode] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [hoveredPin, setHoveredPin] = useState<number | null>(null);
  const [openPinId, setOpenPinId] = useState<number | null>(null);
  const [spotUploading, setSpotUploading] = useState(false);

  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [compareMode, setCompareMode] = useState(false);
  const [compareView, setCompareView] = useState<"side" | "overlay">("side");
  const [overlayOpacity, setOverlayOpacity] = useState(50);
  const [overlayRotation, setOverlayRotation] = useState(0);
  const [overlayScale, setOverlayScale] = useState(100);
  const [overlayOffsetX, setOverlayOffsetX] = useState(0);
  const [overlayOffsetY, setOverlayOffsetY] = useState(0);
  const [showAlignControls, setShowAlignControls] = useState(false);
  const [isAutoAligning, setIsAutoAligning] = useState(false);
  const [compareIndexA, setCompareIndexA] = useState(0);
  const [compareIndexB, setCompareIndexB] = useState(1);
  const [zoomedGallery, setZoomedGallery] = useState<string[]>([]);
  const [zoomedIndex, setZoomedIndex] = useState(0);

  const openLightbox = useCallback((src: string, gallery?: string[]) => {
    const g = gallery ?? [src];
    setZoomedGallery(g);
    setZoomedIndex(Math.max(0, g.indexOf(src)));
  }, []);

  const closeLightbox = useCallback(() => setZoomedGallery([]), []);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (zoomedGallery.length === 0) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") setZoomedIndex(i => (i - 1 + zoomedGallery.length) % zoomedGallery.length);
      else if (e.key === "ArrowRight") setZoomedIndex(i => (i + 1) % zoomedGallery.length);
      else if (e.key === "Escape") closeLightbox();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [zoomedGallery, closeLightbox]);

  const { data: pins = [] } = useQuery({
    queryKey: ["overview-pins", overviewLocation.id],
    queryFn: () => api.getOverviewPins(overviewLocation.id),
    enabled: !!overviewLocation.id,
  });

  const renameMutation = useMutation({
    mutationFn: (name: string) => api.renameLocation(overviewLocation.id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["full-patient", patientId] });
      setIsRenaming(false);
      toast.success(t('overviewPhoto.renamed'));
    },
  });

  const createPinMutation = useMutation({
    mutationFn: (data: { linked_location_id: number; x_pct: number; y_pct: number; label?: string }) =>
      api.createOverviewPin(overviewLocation.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["overview-pins", overviewLocation.id] });
      setPendingPin(null);
      setPinMode(false);
      toast.success(t('overviewPhoto.pinSet'));
    },
  });

  const deletePinMutation = useMutation({
    mutationFn: (pinId: number) => api.deleteOverviewPin(pinId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["overview-pins", overviewLocation.id] });
      setDeleteTarget(null);
      toast.success(t('overviewPhoto.pinRemoved'));
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => api.uploadImage(overviewLocation.id, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["full-patient", patientId] });
      setUploading(false);
      toast.success(t('overviewPhoto.overviewUploaded'));
    },
    onError: () => setUploading(false),
  });

  const spotUploadMutation = useMutation({
    mutationFn: ({ locationId, file }: { locationId: number; file: File }) =>
      api.uploadImage(locationId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["full-patient", patientId] });
      queryClient.invalidateQueries({ queryKey: ["trashed-locations", patientId] });
      setSpotUploading(false);
      toast.success(t('overviewPhoto.spotPhotoUploaded'));
    },
    onError: () => setSpotUploading(false),
  });

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    uploadMutation.mutate(file);
  };

  const handleSpotUpload = (locationId: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSpotUploading(true);
    spotUploadMutation.mutate({ locationId, file });
  };

  const handleImageClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!pinMode) return;
    // Account for the transform scale — use the inner container's natural size
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x_pct = ((e.clientX - rect.left) / rect.width) * 100;
    const y_pct = ((e.clientY - rect.top) / rect.height) * 100;
    setPendingPin({ x_pct, y_pct });
  }, [pinMode]);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setZoomLevel(z => {
        const delta = e.deltaY > 0 ? -0.15 : 0.15;
        return Math.min(Math.max(z + delta, 0.5), 4);
      });
    }
  }, []);

  useEffect(() => {
    const scrollContainer = containerRef.current?.parentElement;
    if (!scrollContainer) return;
    scrollContainer.addEventListener("wheel", handleWheel, { passive: false });
    return () => scrollContainer.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  const handleLinkSpot = (spotId: number) => {
    if (!pendingPin) return;
    const spot = spotLocations.find(s => s.id === spotId);
    createPinMutation.mutate({
      linked_location_id: spotId,
      x_pct: pendingPin.x_pct,
      y_pct: pendingPin.y_pct,
      label: spot?.name || undefined,
    });
  };

  // The FIRST (oldest) image is always the pin reference
  const referenceImage = overviewLocation.images?.length
    ? [...overviewLocation.images].sort((a, b) =>
        new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime()
      )[0]
    : null;

  const getLinkedSpot = (pin: OverviewPin) => spotLocations.find(s => s.id === pin.linked_location_id);

  const getSpotColor = (pin: OverviewPin) => {
    const spot = getLinkedSpot(pin);
    const cls = (spot as any)?.classification as LesionClassification | undefined;
    if (cls && cls !== "unclassified") return LESION_CLASSIFICATIONS[cls]?.color;
    return "hsl(var(--primary))";
  };

  const getSpotPreviewImage = (pin: OverviewPin) => {
    const spot = getLinkedSpot(pin);
    if (!spot?.images?.length) return null;
    return api.resolveImageSrc(spot.images[0]);
  };

  if (!referenceImage) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-muted-foreground">
        <Camera className="mb-3 h-10 w-10" />
        <p className="text-sm font-medium">{t('overviewPhoto.noOverviewPhoto')}</p>
        <p className="text-xs mt-1 mb-4">{t('overviewPhoto.uploadDescription')}</p>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
        <Button size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
          <Upload className="mr-1.5 h-3.5 w-3.5" />
          {uploading ? t('overviewPhoto.uploading') : t('overviewPhoto.uploadPhoto')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header: name + badge */}
      <div className="flex items-center gap-2">
          {isRenaming ? (
            <div className="flex items-center gap-1.5">
              <Input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="h-7 text-sm w-40"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") renameMutation.mutate(renameValue.trim() || overviewLocation.name || "Zone");
                  if (e.key === "Escape") setIsRenaming(false);
                }}
              />
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => renameMutation.mutate(renameValue.trim() || overviewLocation.name || "Zone")}>
                <Save className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setIsRenaming(false)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <button
              className="flex items-center gap-1.5 rounded-md px-1.5 py-0.5 -ml-1.5 hover:bg-muted transition-colors group"
              onClick={() => { setRenameValue(overviewLocation.name || ""); setIsRenaming(true); }}
            title={t('overviewPhoto.clickToRemovePin')}
            >
              <h4 className="text-sm font-medium text-foreground">
                {overviewLocation.name || t('overviewPhoto.noOverviewPhoto')}
              </h4>
              <Pencil className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
          <Badge variant="outline" className="text-[10px]">
            {pins.length} {pins.length === 1 ? "Pin" : "Pins"}
          </Badge>
      </div>

      {/* Toolbar: wraps on small screens */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          size="sm"
          variant={pinMode ? "default" : "outline"}
          onClick={() => { setPinMode(!pinMode); setPendingPin(null); setEditMode(false); }}
          className="gap-1 text-xs h-8"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{pinMode ? t('overviewPhoto.pinActive') : t('overviewPhoto.pin')}</span>
        </Button>
        <Button
          size="sm"
          variant={editMode ? "default" : "outline"}
          onClick={() => { setEditMode(!editMode); setPinMode(false); setPendingPin(null); }}
          className="gap-1 text-xs h-8"
          title={t('overviewPhoto.editPins')}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
        <Button
          size="sm"
          variant="outline"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="gap-1 text-xs h-8 border-primary/40 text-primary hover:bg-primary/10"
          title="Weiteres Foto zu dieser Übersicht hinzufügen"
        >
          <Upload className="h-3.5 w-3.5" />
          <span>{t('overviewPhoto.addPhoto')}</span>
        </Button>
        {onQrUpload && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onQrUpload(overviewLocation.id)}
            className="gap-1 text-xs h-8"
            title={t('mobileUpload.title')}
          >
            <QrCode className="h-3.5 w-3.5" />
            <span>QR</span>
          </Button>
        )}
        {onDelete && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDelete(overviewLocation.id)}
            className="gap-1 text-xs h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            title={t('overviewPhoto.deleteOverview')}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {pinMode && (
        <div className="flex items-center gap-2 rounded-md bg-primary/10 border border-primary/20 px-3 py-2 text-xs text-primary">
          <MapPin className="h-4 w-4 shrink-0" />
          <span>{t('overviewPhoto.pinInstruction')}</span>
          <Button size="sm" variant="ghost" className="ml-auto h-6 px-2" onClick={() => { setPinMode(false); setPendingPin(null); }}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Zoom controls */}
      <div className="flex items-center gap-1.5 mb-1">
        <Button
          size="sm"
          variant="outline"
          className="h-7 w-7 p-0"
          onClick={() => setZoomLevel(z => Math.min(z + 0.25, 4))}
          title={t('overviewPhoto.zoomIn', 'Hineinzoomen')}
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 w-7 p-0"
          onClick={() => setZoomLevel(z => Math.max(z - 0.25, 0.5))}
          title={t('overviewPhoto.zoomOut', 'Herauszoomen')}
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        {zoomLevel !== 1 && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={() => setZoomLevel(1)}
          >
            {Math.round(zoomLevel * 100)}% – Reset
          </Button>
        )}
        <span className="text-[10px] text-muted-foreground ml-1">
          {t('overviewPhoto.zoomHint', 'Ctrl + Mausrad zum Zoomen')}
        </span>
      </div>

      <div className="max-h-[60vh] overflow-auto rounded-lg border bg-muted">
        <div
          ref={containerRef}
          className={cn(
            "relative",
            pinMode && "cursor-crosshair ring-2 ring-primary/30 ring-inset"
          )}
          style={{
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'top left',
            width: '100%',
          }}
          onClick={handleImageClick}
        >
          <img
            src={api.resolveImageSrc(referenceImage)}
            alt="Übersichtsfoto"
            className="w-full h-auto block"
            draggable={false}
          />


        {pins.map((pin: OverviewPin, i: number) => {
          const color = getSpotColor(pin);
          const spot = getLinkedSpot(pin);
          const previewUrl = getSpotPreviewImage(pin);

          // Smart label offset: leader line direction depends on pin position
          // Label goes away from nearest edge to avoid clipping
          const labelOffsetX = pin.x_pct > 50 ? -30 : 30;  // px offset for label
          const labelOffsetY = pin.y_pct > 30 ? -28 : 28;   // label above if pin is lower, below if pin is at top

          return (
            <div key={pin.id}>
              {/* Tiny crosshair at the exact lesion point – minimal occlusion */}
              <div
                className="absolute z-10 pointer-events-none"
                style={{
                  left: `${pin.x_pct}%`,
                  top: `${pin.y_pct}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14">
                  <line x1="7" y1="0" x2="7" y2="5" stroke={color} strokeWidth="1.5" />
                  <line x1="7" y1="9" x2="7" y2="14" stroke={color} strokeWidth="1.5" />
                  <line x1="0" y1="7" x2="5" y2="7" stroke={color} strokeWidth="1.5" />
                  <line x1="9" y1="7" x2="14" y2="7" stroke={color} strokeWidth="1.5" />
                </svg>
              </div>

              {/* Leader line connecting crosshair to label */}
              <div
                className="absolute z-[9] pointer-events-none"
                style={{
                  left: `${pin.x_pct}%`,
                  top: `${pin.y_pct}%`,
                  width: `${Math.abs(labelOffsetX)}px`,
                  height: `${Math.abs(labelOffsetY)}px`,
                  transform: `translate(${labelOffsetX > 0 ? '0' : `${labelOffsetX}px`}, ${labelOffsetY > 0 ? '0' : `${labelOffsetY}px`})`,
                  borderLeft: labelOffsetX > 0 ? 'none' : 'none',
                }}
              >
                <svg width="100%" height="100%" className="overflow-visible">
                  <line
                    x1={labelOffsetX > 0 ? "0" : "100%"}
                    y1={labelOffsetY > 0 ? "0" : "100%"}
                    x2={labelOffsetX > 0 ? "100%" : "0"}
                    y2={labelOffsetY > 0 ? "100%" : "0"}
                    stroke={color}
                    strokeWidth="1"
                    strokeOpacity="0.5"
                    strokeDasharray="3 2"
                  />
                </svg>
              </div>

              {editMode ? (
                <button
                  className="absolute z-10 transition-transform hover:scale-110 cursor-pointer"
                  style={{
                    left: `${pin.x_pct}%`,
                    top: `${pin.y_pct}%`,
                    transform: `translate(calc(-50% + ${labelOffsetX}px), calc(-50% + ${labelOffsetY}px))`,
                  }}
                  onClick={(e) => { e.stopPropagation(); setDeleteTarget(pin.id); }}
                  title={t('overviewPhoto.clickToRemovePin')}
                >
                  <span
                    className="flex items-center justify-center rounded-full text-[10px] font-bold text-white shadow-md border border-white/50"
                    style={{ width: 20, height: 20, backgroundColor: color }}
                  >
                    <Trash2 className="h-3 w-3 text-white" />
                  </span>
                </button>
              ) : (
                <Popover open={openPinId === pin.id} onOpenChange={(open) => { if (!open) setOpenPinId(null); }}>
                  <PopoverTrigger asChild>
                    <button
                      className="absolute z-10 transition-transform hover:scale-110 cursor-pointer"
                      style={{
                        left: `${pin.x_pct}%`,
                        top: `${pin.y_pct}%`,
                        transform: `translate(calc(-50% + ${labelOffsetX}px), calc(-50% + ${labelOffsetY}px))`,
                      }}
                      onClick={(e) => { e.stopPropagation(); setOpenPinId(openPinId === pin.id ? null : pin.id); }}
                      onMouseEnter={() => setHoveredPin(pin.id)}
                      onMouseLeave={() => setHoveredPin(null)}
                      title={spot?.name || pin.label || `Spot #${pin.linked_location_id}`}
                    >
                      <span
                        className="flex items-center gap-1 rounded-full text-[9px] font-bold text-white shadow-md border border-white/50 px-2 py-0.5 whitespace-nowrap max-w-[100px]"
                        style={{ backgroundColor: color }}
                      >
                        <span className="truncate">{spot?.name || pin.label || "Spot"}</span>
                      </span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    side={pin.y_pct > 60 ? "top" : "bottom"}
                    align="center"
                    className="w-72 p-3 z-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Spot header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="flex items-center justify-center rounded-full text-[10px] font-bold text-white shrink-0"
                          style={{ width: 20, height: 20, backgroundColor: color }}
                        >
                          {i + 1}
                        </span>
                        <p className="text-sm font-medium text-foreground truncate">
                          {spot?.name || pin.label || `Spot #${pin.linked_location_id}`}
                        </p>
                      </div>
                      {(() => {
                        const cls = (spot as any)?.classification as LesionClassification | undefined;
                        if (!cls || cls === "unclassified") return null;
                        const info = LESION_CLASSIFICATIONS[cls];
                        return (
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0"
                            style={{ backgroundColor: `${info.color}20`, color: info.color }}
                          >
                            {info.shortLabel}
                          </span>
                        );
                      })()}
                    </div>

                    {/* Photo timeline */}
                    {spot?.images?.length ? (
                      <div className="space-y-1.5">
                        <p className="text-[10px] text-muted-foreground font-medium">
                          {spot.images.length} {t('common.images')} — {t('overviewPhoto.photoTimeline')}
                        </p>
                        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                          {[...spot.images]
                            .sort((a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime())
                            .map((img, idx) => (
                              <div key={img.id} className="shrink-0 text-center">
                                <img
                                  src={api.resolveImageSrc(img)}
                                  alt={`${spot.name} #${idx + 1}`}
                                  className="h-14 w-14 rounded-lg object-cover border cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                                  onClick={() => {
                                    const sortedImages = [...spot.images].sort((a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime());
                                    const gallery = sortedImages.map(i => api.resolveImageSrc(i));
                                    openLightbox(api.resolveImageSrc(img), gallery);
                                  }}
                                />
                                <p className="text-[9px] text-muted-foreground mt-0.5">
                                  {img.created_at ? formatDate(img.created_at, 'dd.MM.yy') : `#${idx + 1}`}
                                </p>
                              </div>
                            ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center py-3 text-muted-foreground">
                        <ImageIcon className="h-6 w-6 mb-1" />
                        <p className="text-xs">{t('overviewPhoto.noSpotPhotos')}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-1.5 mt-2 pt-2 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs h-8 gap-1"
                        disabled={spotUploading}
                        onClick={() => {
                          const inp = document.createElement('input');
                          inp.type = 'file';
                          inp.accept = 'image/*';
                          inp.onchange = (ev) => {
                            const file = (ev.target as HTMLInputElement).files?.[0];
                            if (!file) return;
                            setSpotUploading(true);
                            spotUploadMutation.mutate({ locationId: pin.linked_location_id, file });
                          };
                          inp.click();
                        }}
                      >
                        {spotUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                        {t('overviewPhoto.uploadSpotPhoto')}
                      </Button>
                      {onQrUpload && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-8 px-2"
                          onClick={() => { setOpenPinId(null); onQrUpload(pin.linked_location_id); }}
                          title="QR Upload"
                        >
                          <QrCode className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="default"
                        className="flex-1 text-xs h-8 gap-1"
                        onClick={() => { setOpenPinId(null); onNavigateToSpot(pin.linked_location_id); }}
                      >
                        <Eye className="h-3 w-3" />
                        {t('overviewPhoto.openSpot')}
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          );
        })}

        {pendingPin && (
          <Popover open={true} onOpenChange={(open) => { if (!open) setPendingPin(null); }}>
            <PopoverTrigger asChild>
              <div
                className="absolute z-20 flex items-center justify-center rounded-full border-2 border-dashed border-primary bg-primary/20 animate-pulse"
                style={{
                  left: `${pendingPin.x_pct}%`,
                  top: `${pendingPin.y_pct}%`,
                  transform: "translate(-50%, -50%)",
                  width: 32,
                  height: 32,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <Plus className="h-4 w-4 text-primary" />
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-2" side="right" align="start" onClick={(e) => e.stopPropagation()}>
              <>
                <p className="text-xs font-semibold text-foreground mb-2">{t('overviewPhoto.linkToSpot')}</p>

                  {onCreateSpotAndLink && (
                    <button
                      onClick={() => {
                        if (pendingPin) {
                          const autoName = `Spot ${spotLocations.filter(s => s.type !== "overview").length + 1}`;
                          onCreateSpotAndLink(autoName, pendingPin, overviewLocation.id);
                          setPendingPin(null);
                          setPinMode(false);
                        }
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-primary/10 border border-dashed border-primary/30 transition-colors mb-2"
                    >
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Plus className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-primary">{t('overviewPhoto.createNewSpot')}</p>
                        <p className="text-[10px] text-muted-foreground">{t('overviewPhoto.autoNamed')}</p>
                      </div>
                    </button>
                  )}

                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {spotLocations.filter(s => s.type !== "overview").length === 0 && !onCreateSpotAndLink ? (
                      <p className="text-xs text-muted-foreground py-2 text-center">{t('overviewPhoto.noSpots')}</p>
                    ) : (
                      spotLocations.filter(s => s.type !== "overview").map((spot) => {
                        const cls = (spot as any).classification as LesionClassification | undefined;
                        const clsInfo = cls && cls !== "unclassified" ? LESION_CLASSIFICATIONS[cls] : null;
                        const firstImg = spot.images?.[0];
                        return (
                          <button
                            key={spot.id}
                            onClick={() => handleLinkSpot(spot.id)}
                            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted transition-colors"
                          >
                            {firstImg ? (
                              <img
                                src={api.resolveImageSrc(firstImg)}
                                alt=""
                                className="h-7 w-7 rounded-full object-cover border shrink-0"
                              />
                            ) : (
                              <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                                <MapPin className="h-3 w-3 text-muted-foreground" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-foreground truncate">
                                {spot.name || `Spot #${spot.id}`}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {spot.images?.length ?? 0} {t('common.images')}
                                {clsInfo && (
                                  <span className="ml-1 font-bold" style={{ color: clsInfo.color }}>
                                    {clsInfo.shortLabel}
                                  </span>
                                )}
                              </p>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                  <div className="mt-2 pt-2 border-t">
                    <Button size="sm" variant="ghost" className="w-full text-xs" onClick={() => setPendingPin(null)}>
                    {t('common.cancel')}
                    </Button>
                  </div>
                </>
            </PopoverContent>
          </Popover>
        )}
        </div>
      </div>

      {pins.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {pins.map((pin: OverviewPin, i: number) => {
            const spot = getLinkedSpot(pin);
            const color = getSpotColor(pin);
            return (
              <button
                key={pin.id}
                onClick={() => onNavigateToSpot(pin.linked_location_id)}
                className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium hover:bg-muted transition-colors"
              >
                <span
                  className="h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                  style={{ backgroundColor: color }}
                >
                  {i + 1}
                </span>
                <span className="truncate max-w-[120px]">
                  {spot?.name || pin.label || `Spot #${pin.linked_location_id}`}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Compare button + comparison view */}
      {overviewLocation.images.length >= 2 && !compareMode && (
        <Button
          size="sm"
          variant="outline"
          className="w-full gap-1.5 text-xs"
          onClick={() => {
            setCompareMode(true);
            setCompareIndexA(0);
            setCompareIndexB(overviewLocation.images.length - 1);
          }}
        >
          <GitCompareArrows className="h-3.5 w-3.5" />
          {t('overviewPhoto.comparePhotos', { count: overviewLocation.images.length })}
        </Button>
      )}

      <AnimatePresence>
        {compareMode && overviewLocation.images.length >= 2 && (() => {
          const sorted = [...overviewLocation.images].sort(
            (a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime()
          );
          const imgA = sorted[compareIndexA];
          const imgB = sorted[compareIndexB];
          if (!imgA || !imgB) return null;

          const isAlignmentModified = overlayRotation !== 0 || overlayScale !== 100 || overlayOffsetX !== 0 || overlayOffsetY !== 0;
          const handleReset = () => { setOverlayRotation(0); setOverlayScale(100); setOverlayOffsetX(0); setOverlayOffsetY(0); };

          return (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="rounded-lg border bg-card p-4 space-y-4"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <GitCompareArrows className="h-4 w-4 text-primary" />
                   {t('overviewPhoto.comparison')}
                </h4>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
                    <button
                      onClick={() => setCompareView("side")}
                      className={cn(
                        "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[10px] font-medium transition-all",
                        compareView === "side" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <GitCompareArrows className="h-3 w-3" /> {t('imageCompare.sideMode')}
                    </button>
                    <button
                      onClick={() => setCompareView("overlay")}
                      className={cn(
                        "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[10px] font-medium transition-all",
                        compareView === "overlay" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Layers className="h-3 w-3" /> {t('imageCompare.overlayMode')}
                    </button>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setCompareMode(false)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Image selection thumbnails */}
              {sorted.length > 2 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {sorted.map((img, idx) => (
                    <button
                      key={img.id}
                      onClick={() => {
                        if (idx === compareIndexB) return;
                        if (idx === compareIndexA) return;
                        // Click selects as B (comparison target)
                        setCompareIndexB(idx);
                      }}
                      className={cn(
                        "relative shrink-0 h-14 w-14 rounded-md overflow-hidden border-2 transition-all",
                        idx === compareIndexA ? "border-primary ring-1 ring-primary/30" :
                        idx === compareIndexB ? "border-accent ring-1 ring-accent/30" :
                        "border-border opacity-60 hover:opacity-100"
                      )}
                    >
                      <img src={api.resolveImageSrc(img)} alt="" className="h-full w-full object-cover" />
                      <span className={cn(
                        "absolute top-0.5 left-0.5 text-[8px] font-bold px-1 rounded",
                        idx === compareIndexA ? "bg-primary text-primary-foreground" :
                        idx === compareIndexB ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
                      )}>
                        {idx === compareIndexA ? "REF" : idx === compareIndexB ? "VGL" : idx + 1}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {compareView === "side" ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    {[imgA, imgB].map((img, i) => (
                      <div key={img.id} className="space-y-2">
                        <div
                          className="relative overflow-hidden rounded-lg border aspect-square bg-muted cursor-pointer"
                          onClick={() => openLightbox(api.resolveImageSrc(img), [imgA, imgB].map(i => api.resolveImageSrc(i)))}
                        >
                          <img src={api.resolveImageSrc(img)} alt={`Vergleich ${i + 1}`} className="h-full w-full object-contain" />
                          <div className={cn(
                            "absolute top-2 left-2 rounded-full px-2 py-0.5 text-[9px] font-bold backdrop-blur-sm",
                            i === 0 ? "bg-primary/90 text-primary-foreground" : "bg-accent/90 text-accent-foreground"
                          )}>
                            {i === 0 ? "REFERENZ" : "VERGLEICH"}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 h-6 w-6 bg-background/50 backdrop-blur-sm"
                            onClick={(e) => { e.stopPropagation(); openLightbox(api.resolveImageSrc(img), [imgA, imgB].map(i => api.resolveImageSrc(i))); }}
                          >
                            <ZoomIn className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="text-center text-xs text-muted-foreground tabular-nums">
                          {img.created_at ? formatDate(img.created_at, "dd. MMM yyyy") : "–"}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px] gap-1.5"
                      disabled={isAutoAligning}
                      onClick={async () => {
                        setIsAutoAligning(true);
                        try {
                          const baseSrc = api.resolveImageSrc(imgA);
                          const overlaySrc = api.resolveImageSrc(imgB);
                          const result = await alignImages(baseSrc, overlaySrc);
                          setOverlayRotation(result.rotation);
                          setOverlayScale(result.scale);
                          setOverlayOffsetX(result.offset_x);
                          setOverlayOffsetY(result.offset_y);
                          toast.success(t('imageCompare.switchToOverlay'));
                          setCompareView("overlay");
                        } catch (err) {
                          console.error("[AutoAlign] Error:", err);
                           toast.error(t('imageCompare.autoAlignFailed'));
                          handleReset();
                        } finally {
                          setIsAutoAligning(false);
                        }
                      }}
                    >
                      {isAutoAligning ? (
                       <><Loader2 className="h-3 w-3 animate-spin" /> {t('imageCompare.analyzing')}</>
                      ) : (
                        <><Wand2 className="h-3 w-3" /> {t('imageCompare.aiAlignment')}</>
                      )}
                    </Button>
                    {isAlignmentModified && (
                      <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1" onClick={handleReset}>
                        <RotateCcw className="h-3 w-3" /> Reset
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div
                    className="relative overflow-hidden rounded-lg border aspect-square bg-muted cursor-pointer"
                    onClick={() => openLightbox(api.resolveImageSrc(imgA), [imgA, imgB].map(i => api.resolveImageSrc(i)))}
                  >
                    <img src={api.resolveImageSrc(imgA)} alt="Referenz" className="absolute inset-0 h-full w-full object-contain" />
                    <img
                      src={api.resolveImageSrc(imgB)}
                      alt="Vergleich"
                      className="absolute inset-0 h-full w-full object-contain"
                      style={{
                        opacity: overlayOpacity / 100,
                        transform: `translate(${overlayOffsetX}%, ${overlayOffsetY}%) scale(${overlayScale / 100}) rotate(${overlayRotation}deg)`,
                      }}
                    />
                    <div className="absolute top-2 left-2 rounded-full bg-primary/90 px-2 py-0.5 text-[9px] font-bold text-primary-foreground backdrop-blur-sm">REFERENZ</div>
                    <div className="absolute top-2 right-2 rounded-full bg-accent/90 px-2 py-0.5 text-[9px] font-bold text-accent-foreground backdrop-blur-sm">VERGLEICH ({overlayOpacity}%)</div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{imgA.created_at ? formatDate(imgA.created_at, "dd.MM.yy") : "–"}</span>
                      <span className="text-[10px] font-medium text-foreground">{t('imageCompare.transparency')}: {overlayOpacity}%</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{imgB.created_at ? formatDate(imgB.created_at, "dd.MM.yy") : "–"}</span>
                    </div>
                    <Slider value={[overlayOpacity]} onValueChange={([v]) => setOverlayOpacity(v)} min={0} max={100} step={1} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px] gap-1.5"
                      disabled={isAutoAligning}
                      onClick={async () => {
                        setIsAutoAligning(true);
                        try {
                          const baseSrc = api.resolveImageSrc(imgA);
                          const overlaySrc = api.resolveImageSrc(imgB);
                          const result = await alignImages(baseSrc, overlaySrc);
                          setOverlayRotation(result.rotation);
                          setOverlayScale(result.scale);
                          setOverlayOffsetX(result.offset_x);
                          setOverlayOffsetY(result.offset_y);
                          toast.success(t('imageCompare.autoAligned'));
                        } catch (err) {
                          console.error("[AutoAlign] Error:", err);
                          toast.error(t('imageCompare.autoAlignFailed'));
                          handleReset();
                        } finally {
                          setIsAutoAligning(false);
                        }
                      }}
                    >
                      {isAutoAligning ? (
                       <><Loader2 className="h-3 w-3 animate-spin" /> {t('imageCompare.analyzing')}</>
                      ) : (
                        <><Wand2 className="h-3 w-3" /> {t('imageCompare.aiAlignment')}</>
                      )}
                    </Button>
                    {isAlignmentModified && (
                      <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1" onClick={handleReset}>
                        <RotateCcw className="h-3 w-3" /> Reset
                      </Button>
                    )}
                    <button
                      onClick={() => setShowAlignControls(!showAlignControls)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[10px] font-medium transition-all",
                        showAlignControls || isAlignmentModified ? "border-primary/30 bg-primary/5 text-primary" : "border-border bg-card text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Move className="h-3 w-3" /> {t('imageCompare.manualAlign')}
                      {isAlignmentModified && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                      <ChevronDown className={cn("h-3 w-3 transition-transform", showAlignControls && "rotate-180")} />
                    </button>
                  </div>
                  <AnimatePresence>
                    {showAlignControls && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
                          <div className="flex items-center justify-end">
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={handleReset}><RotateCcw className="mr-1 h-3 w-3" /> {t('common.reset')}</Button>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground"><span className="flex items-center gap-1"><RotateCw className="h-3 w-3" /> {t('imageCompare.rotation')}</span><span className="font-mono">{overlayRotation}°</span></div>
                            <Slider value={[overlayRotation]} onValueChange={([v]) => setOverlayRotation(v)} min={-180} max={180} step={1} />
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground"><span className="flex items-center gap-1"><ZoomIn className="h-3 w-3" /> {t('imageCompare.scale')}</span><span className="font-mono">{overlayScale}%</span></div>
                            <Slider value={[overlayScale]} onValueChange={([v]) => setOverlayScale(v)} min={50} max={200} step={1} />
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground"><span>{t('imageCompare.horizontal')}</span><span className="font-mono">{overlayOffsetX}%</span></div>
                            <Slider value={[overlayOffsetX]} onValueChange={([v]) => setOverlayOffsetX(v)} min={-50} max={50} step={0.5} />
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground"><span>{t('imageCompare.vertical')}</span><span className="font-mono">{overlayOffsetY}%</span></div>
                            <Slider value={[overlayOffsetY]} onValueChange={([v]) => setOverlayOffsetY(v)} min={-50} max={50} step={0.5} />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Time difference */}
              {imgA.created_at && imgB.created_at && (
                <div className="text-center">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    Zeitraum: {getOverviewDaysDiff(imgA.created_at, imgB.created_at)}
                  </span>
                </div>
              )}
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Fullscreen zoom dialog with gallery navigation */}
      {zoomedGallery.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={closeLightbox}
        >
          {/* Previous button */}
          {zoomedGallery.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-10 w-10 z-10"
              onClick={(e) => { e.stopPropagation(); setZoomedIndex((zoomedIndex - 1 + zoomedGallery.length) % zoomedGallery.length); }}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
          )}

          <img
            src={zoomedGallery[zoomedIndex]}
            alt="Vergrössert"
            className="max-h-[90vh] max-w-[80vw] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Next button */}
          {zoomedGallery.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-14 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-10 w-10 z-10"
              onClick={(e) => { e.stopPropagation(); setZoomedIndex((zoomedIndex + 1) % zoomedGallery.length); }}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          )}

          {/* Counter */}
          {zoomedGallery.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/80 text-sm bg-black/50 px-3 py-1 rounded-full">
              {zoomedIndex + 1} / {zoomedGallery.length}
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={closeLightbox}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      )}

      {referenceImage?.created_at && (
        <p className="text-[10px] text-muted-foreground">
           {t('pdf.recording')} {formatDate(referenceImage.created_at, "dd.MM.yyyy")}
          {overviewLocation.images.length > 1 && ` · ${overviewLocation.images.length} ${t('common.images')}`}
        </p>
      )}

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('overviewPhoto.deletePinTitle', { defaultValue: 'Remove pin?' })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('overviewPhoto.deletePinDesc', { defaultValue: 'This pin will be removed from the overview photo. The linked spot will remain.' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deletePinMutation.mutate(deleteTarget)}
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

function getOverviewDaysDiff(dateA: string, dateB: string): string {
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

export default OverviewPhoto;
