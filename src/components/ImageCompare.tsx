import { useState, useRef, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { LocationImage } from "@/types/patient";
import { formatDate } from "@/lib/dateUtils";
import { ArrowLeft, Calendar, Check, GitCompareArrows, RotateCcw, ZoomIn, Layers, Move, RotateCw, ChevronDown, Wand2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { alignImages } from "@/lib/imageAlign";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface ImageCompareProps {
  images: LocationImage[];
  locationName: string;
  onClose: () => void;
}

const ImageCompare = ({ images, locationName, onClose }: ImageCompareProps) => {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<number[]>([]);
  const [zoomedImage, setZoomedImage] = useState<LocationImage | null>(null);
  const [compareMode, setCompareMode] = useState<"side" | "overlay">("side");
  const [overlayOpacity, setOverlayOpacity] = useState(50);
  const [overlayRotation, setOverlayRotation] = useState(0);
  const [overlayScale, setOverlayScale] = useState(100);
  const [overlayOffsetX, setOverlayOffsetX] = useState(0);
  const [overlayOffsetY, setOverlayOffsetY] = useState(0);
  const [showAlignControls, setShowAlignControls] = useState(false);
  const [isAutoAligning, setIsAutoAligning] = useState(false);
  const [noteValues, setNoteValues] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    images.forEach(img => { if (img.note) initial[img.id] = img.note; });
    return initial;
  });
  const debounceTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const alignSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (selected.length === 2) {
      api.getImageAlignment(selected[0], selected[1]).then(saved => {
        setOverlayRotation(saved.rotation ?? 0);
        setOverlayScale(saved.scale ?? 100);
        setOverlayOffsetX(saved.offset_x ?? 0);
        setOverlayOffsetY(saved.offset_y ?? 0);
      }).catch(() => {
        setOverlayRotation(0); setOverlayScale(100); setOverlayOffsetX(0); setOverlayOffsetY(0);
      });
    }
  }, [selected]);

  useEffect(() => {
    if (selected.length !== 2) return;
    if (alignSaveTimer.current) clearTimeout(alignSaveTimer.current);
    alignSaveTimer.current = setTimeout(() => {
      api.saveImageAlignment(selected[0], selected[1], {
        rotation: overlayRotation,
        scale: overlayScale,
        offset_x: overlayOffsetX,
        offset_y: overlayOffsetY,
      });
    }, 800);
    return () => { if (alignSaveTimer.current) clearTimeout(alignSaveTimer.current); };
  }, [overlayRotation, overlayScale, overlayOffsetX, overlayOffsetY, selected]);

  const handleNoteChange = useCallback((imageId: number, value: string) => {
    setNoteValues(prev => ({ ...prev, [imageId]: value }));
    if (debounceTimers.current[imageId]) clearTimeout(debounceTimers.current[imageId]);
    debounceTimers.current[imageId] = setTimeout(() => {
      api.updateImageNote(imageId, value);
    }, 800);
  }, []);

  const isAlignmentModified = overlayRotation !== 0 || overlayScale !== 100 || overlayOffsetX !== 0 || overlayOffsetY !== 0;

  const sorted = [...images].sort(
    (a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime()
  );

  const compareImages = selected.length === 2
    ? sorted.filter((img) => selected.includes(img.id))
    : null;

  const handleAutoAlign = async () => {
    if (selected.length !== 2 || !compareImages) return;
    setIsAutoAligning(true);
    try {
      const baseSrc = api.resolveImageSrc(compareImages[0]);
      const overlaySrc = api.resolveImageSrc(compareImages[1]);
      const result = await alignImages(baseSrc, overlaySrc);
      if (result.rotation === 0 && result.scale === 100 && result.offset_x === 0 && result.offset_y === 0) {
        toast.info(t('imageCompare.alreadyAligned'));
      } else {
        toast.success(t('imageCompare.autoAligned'));
      }
      setOverlayRotation(result.rotation);
      setOverlayScale(result.scale);
      setOverlayOffsetX(result.offset_x);
      setOverlayOffsetY(result.offset_y);
      api.saveImageAlignment(selected[0], selected[1], {
        rotation: result.rotation, scale: result.scale,
        offset_x: result.offset_x, offset_y: result.offset_y,
      });
    } catch (err) {
      console.error("[AutoAlign] Error:", err);
      toast.error(t('imageCompare.autoAlignFailed'));
      setOverlayRotation(0); setOverlayScale(100); setOverlayOffsetX(0); setOverlayOffsetY(0);
    } finally {
      setIsAutoAligning(false);
    }
  };

  const handleReset = () => {
    setOverlayRotation(0); setOverlayScale(100); setOverlayOffsetX(0); setOverlayOffsetY(0);
    if (selected.length === 2) {
      api.saveImageAlignment(selected[0], selected[1], { rotation: 0, scale: 100, offset_x: 0, offset_y: 0 });
    }
  };

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((i) => i !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <GitCompareArrows className="h-4 w-4 text-primary" />
              {t('imageCompare.title', { location: locationName })}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t('imageCompare.selectImages')}
            </p>
          </div>
        </div>
        {selected.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => setSelected([])}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> {t('imageCompare.resetSelection')}
          </Button>
        )}
      </div>

      {/* Timeline */}
      <div className="relative">
        <div className="absolute left-[18px] top-0 bottom-0 w-0.5 bg-border" />
        <div className="space-y-4">
          {sorted.map((img, index) => {
            const isSelected = selected.includes(img.id);
            const selectionOrder = selected.indexOf(img.id);
            return (
              <motion.div
                key={img.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="relative flex items-start gap-4 pl-1"
              >
                <button
                  onClick={() => toggleSelect(img.id)}
                  className={cn(
                    "relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground scale-110"
                      : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:bg-primary/5"
                  )}
                >
                  {isSelected ? (
                    <span className="text-xs font-bold">{selectionOrder + 1}</span>
                  ) : (
                    <Calendar className="h-3.5 w-3.5" />
                  )}
                </button>
                <div className="flex-1 space-y-2">
                  <div
                    onClick={() => toggleSelect(img.id)}
                    className={cn(
                      "flex cursor-pointer items-center gap-4 rounded-lg border p-3 transition-all duration-200",
                      isSelected
                        ? "border-primary/30 bg-primary/5 ring-1 ring-primary/20"
                        : "border-border bg-card hover:bg-muted/50"
                    )}
                  >
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-border shadow-sm">
                      <img
                        src={api.resolveImageSrc(img)}
                        alt={t('imageCompare.recording', { index: index + 1 })}
                        className="h-full w-full object-cover"
                      />
                      {isSelected && (
                        <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                          <Check className="h-5 w-5 text-primary" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{t('imageCompare.recording', { index: index + 1 })}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {img.created_at ? formatDate(img.created_at, "dd. MMMM yyyy, HH:mm") : "–"}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="shrink-0" onClick={(e) => { e.stopPropagation(); setZoomedImage(img); }}>
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-start gap-2 pl-1">
                    <Textarea
                      placeholder={t('imageCompare.notePlaceholder')}
                      className="min-h-[32px] h-8 text-[11px] resize-none bg-muted/30 border-muted flex-1"
                      value={noteValues[img.id] ?? ""}
                      onChange={(e) => { e.stopPropagation(); handleNoteChange(img.id, e.target.value); }}
                      onClick={(e) => e.stopPropagation()}
                      rows={1}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Comparison View */}
      <AnimatePresence>
        {compareImages && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="rounded-lg border bg-card p-4 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <GitCompareArrows className="h-4 w-4 text-primary" />
                {t('imageCompare.comparison')}
              </h4>
              <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
                <button
                  onClick={() => setCompareMode("side")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[10px] font-medium transition-all",
                    compareMode === "side"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <GitCompareArrows className="h-3 w-3" /> {t('imageCompare.sideMode')}
                </button>
                <button
                  onClick={() => setCompareMode("overlay")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[10px] font-medium transition-all",
                    compareMode === "overlay"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Layers className="h-3 w-3" /> {t('imageCompare.overlayMode')}
                </button>
              </div>
            </div>

            {compareMode === "side" ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  {compareImages.map((img, i) => (
                    <div key={img.id} className="space-y-2">
                      <div className="relative overflow-hidden rounded-lg border aspect-square bg-muted">
                        <img src={api.resolveImageSrc(img)} alt={`${t('imageCompare.comparison')} ${i + 1}`} className="h-full w-full object-contain" />
                        <div className={cn(
                          "absolute top-2 left-2 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                          i === 0 ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"
                        )}>
                          {i + 1}
                        </div>
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
                    onClick={async () => {
                      await handleAutoAlign();
                      setCompareMode("overlay");
                    }}
                    disabled={isAutoAligning}
                  >
                    {isAutoAligning ? (
                      <><Loader2 className="h-3 w-3 animate-spin" /> {t('imageCompare.analyzing')}</>
                    ) : (
                      <><Wand2 className="h-3 w-3" /> {t('imageCompare.aiAlignment')}</>
                    )}
                  </Button>
                  {isAlignmentModified && (
                    <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1" onClick={handleReset}>
                      <RotateCcw className="h-3 w-3" /> {t('common.reset')}
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative overflow-hidden rounded-lg border aspect-square bg-muted">
                  <img
                    src={api.resolveImageSrc(compareImages[0])}
                    alt={t('imageCompare.olderAlt')}
                    className="absolute inset-0 h-full w-full object-contain"
                  />
                  <img
                    src={api.resolveImageSrc(compareImages[1])}
                    alt={t('imageCompare.newerAlt')}
                    className="absolute inset-0 h-full w-full object-contain"
                    style={{
                      opacity: overlayOpacity / 100,
                      transform: `rotate(${overlayRotation}deg) scale(${overlayScale / 100}) translate(${overlayOffsetX}px, ${overlayOffsetY}px)`,
                    }}
                  />
                  <div className="absolute top-2 left-2 rounded-full bg-primary/90 px-2 py-0.5 text-[9px] font-bold text-primary-foreground backdrop-blur-sm">
                    {t('imageCompare.olderLabel')}
                  </div>
                  <div className="absolute top-2 right-2 rounded-full bg-accent/90 px-2 py-0.5 text-[9px] font-bold text-accent-foreground backdrop-blur-sm">
                    {t('imageCompare.newerPercent', { percent: overlayOpacity })}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {compareImages[0].created_at ? formatDate(compareImages[0].created_at, "dd.MM.yy") : "–"}
                    </span>
                    <span className="text-[10px] font-medium text-foreground">{t('imageCompare.transparency')}: {overlayOpacity}%</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {compareImages[1].created_at ? formatDate(compareImages[1].created_at, "dd.MM.yy") : "–"}
                    </span>
                  </div>
                  <Slider
                    value={[overlayOpacity]}
                    onValueChange={([v]) => setOverlayOpacity(v)}
                    min={0}
                    max={100}
                    step={1}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] gap-1.5"
                    onClick={handleAutoAlign}
                    disabled={isAutoAligning}
                  >
                    {isAutoAligning ? (
                      <><Loader2 className="h-3 w-3 animate-spin" /> {t('imageCompare.analyzing')}</>
                    ) : (
                      <><Wand2 className="h-3 w-3" /> {t('imageCompare.aiAlignment')}</>
                    )}
                  </Button>
                  {isAlignmentModified && (
                    <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1" onClick={handleReset}>
                      <RotateCcw className="h-3 w-3" /> {t('common.reset')}
                    </Button>
                  )}
                  <button
                    onClick={() => setShowAlignControls(!showAlignControls)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[10px] font-medium transition-all",
                      showAlignControls || isAlignmentModified
                        ? "border-primary/30 bg-primary/5 text-primary"
                        : "border-border bg-card text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Move className="h-3 w-3" />
                    {t('imageCompare.manualAlign')}
                    {isAlignmentModified && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                    <ChevronDown className={cn("h-3 w-3 transition-transform", showAlignControls && "rotate-180")} />
                  </button>
                </div>

                <AnimatePresence>
                  {showAlignControls && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
                        <div className="flex items-center justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[10px]"
                            onClick={() => { setOverlayRotation(0); setOverlayScale(100); setOverlayOffsetX(0); setOverlayOffsetY(0); }}
                          >
                            <RotateCcw className="mr-1 h-3 w-3" /> {t('common.reset')}
                          </Button>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-1"><RotateCw className="h-3 w-3" /> {t('imageCompare.rotation')}</span>
                            <span className="font-mono">{overlayRotation}°</span>
                          </div>
                          <Slider value={[overlayRotation]} onValueChange={([v]) => setOverlayRotation(v)} min={-180} max={180} step={1} />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-1"><ZoomIn className="h-3 w-3" /> {t('imageCompare.scale')}</span>
                            <span className="font-mono">{overlayScale}%</span>
                          </div>
                          <Slider value={[overlayScale]} onValueChange={([v]) => setOverlayScale(v)} min={50} max={200} step={1} />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                            <span>{t('imageCompare.horizontal')}</span>
                            <span className="font-mono">{overlayOffsetX}px</span>
                          </div>
                          <Slider value={[overlayOffsetX]} onValueChange={([v]) => setOverlayOffsetX(v)} min={-100} max={100} step={1} />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                            <span>{t('imageCompare.vertical')}</span>
                            <span className="font-mono">{overlayOffsetY}px</span>
                          </div>
                          <Slider value={[overlayOffsetY]} onValueChange={([v]) => setOverlayOffsetY(v)} min={-100} max={100} step={1} />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {compareImages[0].created_at && compareImages[1].created_at && (
              <div className="text-center">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {t('imageCompare.timePeriod')}: {getDaysDiff(compareImages[0].created_at, compareImages[1].created_at)}
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Zoom Dialog */}
      <Dialog open={!!zoomedImage} onOpenChange={(o) => !o && setZoomedImage(null)}>
        <DialogContent className="max-w-2xl p-2">
          {zoomedImage && (
            <div className="space-y-2">
              <img src={api.resolveImageSrc(zoomedImage)} alt={t('imageCompare.enlarged')} className="w-full rounded-md object-contain" />
              <p className="text-center text-xs text-muted-foreground tabular-nums">
                {zoomedImage.created_at ? formatDate(zoomedImage.created_at, "dd. MMMM yyyy, HH:mm") : "–"}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

function getDaysDiff(dateA: string, dateB: string): string {
  const a = new Date(dateA);
  const b = new Date(dateB);
  const diffMs = Math.abs(b.getTime() - a.getTime());
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return "–";
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}m`;
  const years = Math.floor(months / 12);
  return `${years}y`;
}

export default ImageCompare;
