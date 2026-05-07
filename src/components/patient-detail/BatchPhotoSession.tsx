import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, Check, ChevronRight, Loader2, RotateCcw, SkipForward, X, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Location, LocationImage, Gender } from "@/types/patient";
import { formatDate } from "@/lib/dateUtils";
import BodyMap3D from "@/components/BodyMap3D";
import { getAnatomicalName } from "@/lib/anatomyLookup";

type SpotLoc = Location & { images: LocationImage[] };

interface BatchPhotoSessionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: number;
  spots: SpotLoc[];
  gender?: Gender;
}

type Status = "pending" | "captured" | "skipped";

export default function BatchPhotoSession({ open, onOpenChange, patientId, spots, gender }: BatchPhotoSessionProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const cameraRef = useRef<HTMLInputElement>(null);

  const [index, setIndex] = useState(0);
  const [statuses, setStatuses] = useState<Record<number, Status>>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [done, setDone] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const currentSpot = spots[index];
  const total = spots.length;
  const completedCount = Object.values(statuses).filter(s => s === "captured").length;
  const skippedCount = Object.values(statuses).filter(s => s === "skipped").length;
  const progressValue = total ? ((completedCount + skippedCount) / total) * 100 : 0;

  // Reset on open
  useEffect(() => {
    if (open) {
      setIndex(0);
      setStatuses({});
      setPreviewUrl(null);
      setPendingFile(null);
      setDone(false);
    }
  }, [open]);

  // Cleanup preview URL
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const lastImageBySpot = useMemo(() => {
    const map: Record<number, LocationImage | undefined> = {};
    spots.forEach(s => {
      const sorted = [...(s.images ?? [])].sort(
        (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
      );
      map[s.id] = sorted[0];
    });
    return map;
  }, [spots]);

  const uploadMutation = useMutation({
    mutationFn: ({ locationId, file }: { locationId: number; file: File }) =>
      api.uploadImage(locationId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["full-patient", patientId] });
    },
  });

  const openCamera = () => {
    cameraRef.current?.click();
  };

  // Auto-open camera when reaching a new pending spot
  useEffect(() => {
    if (!open || done || !currentSpot) return;
    if (statuses[currentSpot.id]) return; // already handled
    if (previewUrl) return; // already captured, awaiting decision
    const t = setTimeout(() => openCamera(), 200);
    return () => clearTimeout(t);
  }, [open, done, currentSpot, statuses, previewUrl]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPendingFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const advance = (newStatuses: Record<number, Status>) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPendingFile(null);
    if (index + 1 >= total) {
      setStatuses(newStatuses);
      setDone(true);
    } else {
      setStatuses(newStatuses);
      setIndex(index + 1);
    }
  };

  const handleKeep = async () => {
    if (!pendingFile || !currentSpot) return;
    try {
      await uploadMutation.mutateAsync({ locationId: currentSpot.id, file: pendingFile });
      const next = { ...statuses, [currentSpot.id]: "captured" as Status };
      advance(next);
    } catch {
      toast.error(t('imageGallery.loadError') ?? 'Upload fehlgeschlagen');
    }
  };

  const handleRetry = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPendingFile(null);
    setTimeout(openCamera, 100);
  };

  const handleSkip = () => {
    if (!currentSpot) return;
    const next = { ...statuses, [currentSpot.id]: "skipped" as Status };
    advance(next);
  };

  const skippedSpots = spots.filter(s => statuses[s.id] === "skipped");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 max-h-[100dvh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="px-4 py-3 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Camera className="h-4 w-4 text-primary" />
            {done ? 'Session abgeschlossen' : 'Verlaufs-Fotos'}
          </DialogTitle>
          {!done && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground tabular-nums">
                <span>Spot {index + 1} / {total}</span>
                <span>{completedCount} ✓ · {skippedCount} übersprungen</span>
              </div>
              <Progress value={progressValue} className="h-1.5" />
            </div>
          )}
        </DialogHeader>

        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFile}
        />

        <div className="flex-1 overflow-y-auto p-4">
          {done ? (
            <div className="flex flex-col items-center text-center py-6 space-y-4">
              <div className="rounded-full bg-emerald-500/10 p-4">
                <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">Alle Spots erfasst</h3>
                <p className="text-sm text-muted-foreground">
                  {completedCount} von {total} fotografiert
                  {skippedCount > 0 && ` · ${skippedCount} übersprungen`}
                </p>
              </div>
              {skippedSpots.length > 0 && (
                <div className="w-full text-left rounded-md border bg-muted/30 p-3 space-y-1.5">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Übersprungen
                  </p>
                  <ul className="space-y-1">
                    {skippedSpots.map(s => (
                      <li key={s.id} className="text-xs text-foreground flex items-center gap-2">
                        <SkipForward className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="truncate">{s.name || `Spot #${s.id}`}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <Button onClick={() => onOpenChange(false)} className="w-full">
                Schliessen
              </Button>
            </div>
          ) : !currentSpot ? null : (
            <div className="space-y-4">
              {/* Spot info card with reference photo + 3D body orientation */}
              {(() => {
                const lastImg = lastImageBySpot[currentSpot.id];
                const view = (currentSpot.view ?? "front") as "front" | "back";
                const has3d = typeof currentSpot.x3d === 'number' && typeof currentSpot.y3d === 'number' && typeof currentSpot.z3d === 'number';
                const anatomical = has3d
                  ? getAnatomicalName(currentSpot.x3d!, currentSpot.y3d!, currentSpot.z3d!, view)
                  : null;
                const mapMarkers = spots.map(s => ({
                  id: s.id,
                  x: s.x,
                  y: s.y,
                  x3d: s.x3d,
                  y3d: s.y3d,
                  z3d: s.z3d,
                  nx: s.nx,
                  ny: s.ny,
                  nz: s.nz,
                  name: s.name,
                  view: (s.view ?? 'front') as 'front' | 'back',
                  type: 'spot' as const,
                  classification: s.classification,
                }));
                return (
                  <div className="rounded-lg border bg-card p-3 space-y-3">
                    {/* Header: spot number badge + name + anatomy */}
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold tabular-nums">
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate">
                          {currentSpot.name || `Spot #${currentSpot.id}`}
                        </p>
                        {anatomical && (
                          <p className="text-[11px] text-primary font-medium truncate">
                            {anatomical} · {view === 'front' ? 'Vorne' : 'Hinten'}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Visual orientation: reference photo + real 3D body map */}
                    <div className="grid grid-cols-[1fr_140px] gap-3">
                      <div className="relative rounded-md overflow-hidden bg-muted aspect-square border">
                        {lastImg ? (
                          <>
                            <img
                              src={api.resolveImageSrc(lastImg)}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1">
                              <p className="text-[10px] text-white font-medium">
                                Letztes Foto · {lastImg.created_at ? formatDate(lastImg.created_at, 'dd.MM.yyyy') : '–'}
                              </p>
                            </div>
                          </>
                        ) : (
                          <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground gap-1">
                            <Camera className="h-6 w-6" />
                            <span className="text-[10px]">Erstes Foto</span>
                          </div>
                        )}
                      </div>
                      {/* Real 3D body map — active spot focused, others dimmed */}
                      <div className="relative h-[220px] rounded-md border bg-background overflow-hidden">
                        <BodyMap3D
                          markers={mapMarkers as any}
                          selectedLocationId={currentSpot.id}
                          gender={gender ?? 'male'}
                          dimNonSelected
                          embedded
                          focusSignal={currentSpot.id}
                        />
                        <div className="pointer-events-none absolute top-1 left-1 right-1 text-center text-[9px] font-semibold uppercase tracking-wide text-muted-foreground bg-background/80 rounded">
                          {view === 'front' ? 'Vorne' : 'Hinten'}
                        </div>
                      </div>
                    </div>

                  </div>
                );
              })()}

              {/* Preview area */}
              {previewUrl ? (
                <div ref={previewRef} className="space-y-3 scroll-mt-4">
                  <div className="relative rounded-lg overflow-hidden bg-black aspect-square">
                    <img src={previewUrl} alt="Vorschau" className="h-full w-full object-contain" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      onClick={handleRetry}
                      disabled={uploadMutation.isPending}
                      className="gap-1.5"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Wiederholen
                    </Button>
                    <Button
                      onClick={handleKeep}
                      disabled={uploadMutation.isPending}
                      className="gap-1.5"
                    >
                      {uploadMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Behalten & weiter
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={openCamera}
                    className={cn(
                      "w-full rounded-lg border-2 border-dashed border-primary/40 bg-primary/5",
                      "py-10 flex flex-col items-center gap-2 text-primary",
                      "hover:bg-primary/10 transition-colors"
                    )}
                  >
                    <Camera className="h-10 w-10" />
                    <span className="text-sm font-medium">Kamera öffnen</span>
                  </button>
                  <Button
                    variant="ghost"
                    onClick={handleSkip}
                    className="w-full gap-1.5 text-muted-foreground"
                    size="sm"
                  >
                    <SkipForward className="h-4 w-4" />
                    Diesen Spot überspringen
                    <ChevronRight className="h-3.5 w-3.5 ml-auto" />
                  </Button>
                </div>
              )}

              {/* Mini-list of remaining */}
              <div className="border-t pt-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Übersicht
                </p>
                <div className="flex flex-wrap gap-1">
                  {spots.map((s, i) => {
                    const st = statuses[s.id];
                    return (
                      <div
                        key={s.id}
                        className={cn(
                          "h-2 flex-1 min-w-[8px] rounded-full transition-colors",
                          i === index && !st ? "bg-primary" :
                          st === "captured" ? "bg-emerald-500" :
                          st === "skipped" ? "bg-amber-400" :
                          "bg-muted"
                        )}
                        title={s.name || `Spot #${s.id}`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {!done && (
          <div className="border-t px-4 py-2 flex justify-end shrink-0">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="gap-1.5">
              <X className="h-3.5 w-3.5" />
              Beenden
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
