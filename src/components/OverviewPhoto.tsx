import { useState, useRef, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Location, OverviewPin, LocationImage, LesionClassification } from "@/types/patient";
import { LESION_CLASSIFICATIONS } from "@/types/patient";
import { Upload, Plus, X, Trash2, MapPin, Eye, Pencil, ImageIcon, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "sonner";
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
}

const OverviewPhoto = ({ overviewLocation, spotLocations, patientId, onNavigateToSpot, onDelete, onQrUpload }: OverviewPhotoProps) => {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pinMode, setPinMode] = useState(false);
  const [pendingPin, setPendingPin] = useState<{ x_pct: number; y_pct: number } | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [hoveredPin, setHoveredPin] = useState<number | null>(null);

  const { data: pins = [] } = useQuery({
    queryKey: ["overview-pins", overviewLocation.id],
    queryFn: () => api.getOverviewPins(overviewLocation.id),
    enabled: !!overviewLocation.id,
  });

  const createPinMutation = useMutation({
    mutationFn: (data: { linked_location_id: number; x_pct: number; y_pct: number; label?: string }) =>
      api.createOverviewPin(overviewLocation.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["overview-pins", overviewLocation.id] });
      setPendingPin(null);
      setPinMode(false);
      toast.success("Pin gesetzt");
    },
  });

  const deletePinMutation = useMutation({
    mutationFn: (pinId: number) => api.deleteOverviewPin(pinId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["overview-pins", overviewLocation.id] });
      setDeleteTarget(null);
      toast.success("Pin entfernt");
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => api.uploadImage(overviewLocation.id, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["full-patient", patientId] });
      setUploading(false);
      toast.success("Übersichtsfoto hochgeladen");
    },
    onError: () => setUploading(false),
  });

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    uploadMutation.mutate(file);
  };

  const handleImageClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!pinMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x_pct = ((e.clientX - rect.left) / rect.width) * 100;
    const y_pct = ((e.clientY - rect.top) / rect.height) * 100;
    setPendingPin({ x_pct, y_pct });
  }, [pinMode]);

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

  const latestImage = overviewLocation.images?.length
    ? [...overviewLocation.images].sort((a, b) =>
        new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
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

  if (!latestImage) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-muted-foreground">
        <Camera className="mb-3 h-10 w-10" />
        <p className="text-sm font-medium">Noch kein Übersichtsfoto</p>
        <p className="text-xs mt-1 mb-4">Laden Sie ein Foto der Körperregion hoch</p>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
        <Button size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
          <Upload className="mr-1.5 h-3.5 w-3.5" />
          {uploading ? "Lädt hoch…" : "Foto hochladen"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium text-foreground">
            {overviewLocation.name || "Übersichtsfoto"}
          </h4>
          <Badge variant="outline" className="text-[10px]">
            {pins.length} {pins.length === 1 ? "Pin" : "Pins"}
          </Badge>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant={pinMode ? "default" : "outline"}
            onClick={() => { setPinMode(!pinMode); setPendingPin(null); setEditMode(false); }}
            className="gap-1.5 text-xs h-8"
          >
            <Plus className="h-3.5 w-3.5" />
            {pinMode ? "Pin-Modus aktiv" : "Pin setzen"}
          </Button>
          <Button
            size="sm"
            variant={editMode ? "default" : "outline"}
            onClick={() => { setEditMode(!editMode); setPinMode(false); setPendingPin(null); }}
            className="gap-1.5 text-xs h-8"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="gap-1.5 text-xs h-8"
          >
            <Upload className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {pinMode && (
        <div className="flex items-center gap-2 rounded-md bg-primary/10 border border-primary/20 px-3 py-2 text-xs text-primary">
          <MapPin className="h-4 w-4 shrink-0" />
          <span>Klicken Sie auf das Foto, um einen Pin zu platzieren. Danach wählen Sie den zugehörigen Spot.</span>
          <Button size="sm" variant="ghost" className="ml-auto h-6 px-2" onClick={() => { setPinMode(false); setPendingPin(null); }}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      <div
        ref={containerRef}
        className={cn(
          "relative overflow-hidden rounded-lg border bg-muted",
          pinMode && "cursor-crosshair ring-2 ring-primary/30"
        )}
        onClick={handleImageClick}
      >
        <img
          src={api.resolveImageSrc(latestImage)}
          alt="Übersichtsfoto"
          className="w-full h-auto block"
          draggable={false}
        />

        {pins.map((pin: OverviewPin, i: number) => {
          const color = getSpotColor(pin);
          const spot = getLinkedSpot(pin);
          const previewUrl = getSpotPreviewImage(pin);

          return (
            <div key={pin.id}>
              <button
                className={cn(
                  "absolute flex items-center justify-center rounded-full border-2 border-white shadow-lg transition-transform hover:scale-125 z-10",
                  editMode ? "cursor-move" : "cursor-pointer"
                )}
                style={{
                  left: `${pin.x_pct}%`,
                  top: `${pin.y_pct}%`,
                  transform: "translate(-50%, -50%)",
                  width: 28,
                  height: 28,
                  backgroundColor: color,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (editMode) {
                    setDeleteTarget(pin.id);
                  } else {
                    onNavigateToSpot(pin.linked_location_id);
                  }
                }}
                onMouseEnter={() => setHoveredPin(pin.id)}
                onMouseLeave={() => setHoveredPin(null)}
                title={editMode ? "Klicken zum Löschen" : `→ ${spot?.name || pin.label || `Spot #${pin.linked_location_id}`}`}
              >
                {editMode ? (
                  <Trash2 className="h-3.5 w-3.5 text-white" />
                ) : (
                  <span className="text-[10px] font-bold text-white">{i + 1}</span>
                )}
              </button>

              {hoveredPin === pin.id && !editMode && (
                <div
                  className="absolute z-20 pointer-events-none"
                  style={{
                    left: `${pin.x_pct}%`,
                    top: `${pin.y_pct}%`,
                    transform: `translate(-50%, ${pin.y_pct > 70 ? 'calc(-100% - 24px)' : '20px'})`,
                  }}
                >
                  <div className="bg-card rounded-lg border shadow-xl p-2 min-w-[140px]">
                    <div className="flex items-center gap-2">
                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt=""
                          className="h-10 w-10 rounded-full object-cover border shrink-0"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">
                          {spot?.name || pin.label || `Spot #${pin.linked_location_id}`}
                        </p>
                        {spot && (
                          <p className="text-[10px] text-muted-foreground">
                            {spot.images?.length ?? 0} Bilder
                          </p>
                        )}
                        {(() => {
                          const cls = (spot as any)?.classification as LesionClassification | undefined;
                          if (!cls || cls === "unclassified") return null;
                          const info = LESION_CLASSIFICATIONS[cls];
                          return (
                            <span
                              className="text-[9px] font-bold px-1 rounded mt-0.5 inline-block"
                              style={{ backgroundColor: `${info.color}20`, color: info.color }}
                            >
                              {info.shortLabel}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                    <p className="text-[10px] text-primary mt-1.5 text-center">Klicken → Spot anzeigen</p>
                  </div>
                </div>
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
            <PopoverContent className="w-64 p-2" side="right" align="start" onClick={(e) => e.stopPropagation()}>
              <p className="text-xs font-semibold text-foreground mb-2">Mit Spot verknüpfen:</p>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {spotLocations.filter(s => s.type !== "overview").length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2 text-center">Keine Spots vorhanden</p>
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
                            {spot.images?.length ?? 0} Bilder
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
                  Abbrechen
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        )}
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

      {latestImage?.created_at && (
        <p className="text-[10px] text-muted-foreground">
          Aufnahme vom {format(new Date(latestImage.created_at), "dd.MM.yyyy", { locale: de })}
          {overviewLocation.images.length > 1 && ` · ${overviewLocation.images.length} Fotos gespeichert`}
        </p>
      )}

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pin entfernen?</AlertDialogTitle>
            <AlertDialogDescription>
              Dieser Pin wird vom Übersichtsfoto entfernt. Der verknüpfte Spot bleibt erhalten.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deletePinMutation.mutate(deleteTarget)}
            >
              Entfernen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default OverviewPhoto;
