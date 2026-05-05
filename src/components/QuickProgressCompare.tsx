import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { createPortal } from "react-dom";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import {
  GitCompareArrows,
  Layers,
  Wand2,
  Loader2,
  ArrowLeftRight,
  RotateCcw,
  Move,
  ChevronDown,
  Calendar,
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/dateUtils";
import { alignImages } from "@/lib/imageAlign";
import { toast } from "sonner";
import type { LocationImage } from "@/types/patient";

interface QuickProgressCompareProps {
  images: LocationImage[];
  getDaysDiff: (a: string, b: string) => string;
}

const QuickProgressCompare = ({ images, getDaysDiff }: QuickProgressCompareProps) => {
  const { t } = useTranslation();

  const sorted = useMemo(
    () => [...images].sort(
      (a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime()
    ),
    [images],
  );

  // Default: oldest (left) + newest (right)
  const [leftId, setLeftId] = useState<number>(sorted[0]?.id ?? 0);
  const [rightId, setRightId] = useState<number>(sorted[sorted.length - 1]?.id ?? 0);

  useEffect(() => {
    // Reset defaults if list changes and current ids no longer present
    if (!sorted.find(s => s.id === leftId)) setLeftId(sorted[0]?.id ?? 0);
    if (!sorted.find(s => s.id === rightId)) setRightId(sorted[sorted.length - 1]?.id ?? 0);
  }, [sorted, leftId, rightId]);

  const left = sorted.find(s => s.id === leftId) ?? sorted[0];
  const right = sorted.find(s => s.id === rightId) ?? sorted[sorted.length - 1];

  const [mode, setMode] = useState<"side" | "overlay">("side");
  const [opacity, setOpacity] = useState(50);
  const [rotation, setRotation] = useState(0);
  const [scale, setScale] = useState(100);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [showAlignControls, setShowAlignControls] = useState(false);
  const [isAligning, setIsAligning] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<0 | 1 | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load saved alignment whenever pair changes
  useEffect(() => {
    if (!left || !right || left.id === right.id) return;
    api.getImageAlignment(left.id, right.id).then(saved => {
      setRotation(saved.rotation ?? 0);
      setScale(saved.scale ?? 100);
      setOffsetX(saved.offset_x ?? 0);
      setOffsetY(saved.offset_y ?? 0);
    }).catch(() => {
      setRotation(0); setScale(100); setOffsetX(0); setOffsetY(0);
    });
  }, [left?.id, right?.id]);

  // Persist alignment (debounced)
  useEffect(() => {
    if (!left || !right || left.id === right.id) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      api.saveImageAlignment(left.id, right.id, {
        rotation, scale, offset_x: offsetX, offset_y: offsetY,
      });
    }, 800);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [rotation, scale, offsetX, offsetY, left?.id, right?.id]);

  const isModified = rotation !== 0 || scale !== 100 || offsetX !== 0 || offsetY !== 0;

  const handleAutoAlign = async () => {
    if (!left || !right) return;
    setIsAligning(true);
    try {
      const result = await alignImages(api.resolveImageSrc(left), api.resolveImageSrc(right));
      setRotation(result.rotation);
      setScale(result.scale);
      setOffsetX(result.offset_x);
      setOffsetY(result.offset_y);
      api.saveImageAlignment(left.id, right.id, {
        rotation: result.rotation, scale: result.scale,
        offset_x: result.offset_x, offset_y: result.offset_y,
      });
      toast.success(t('imageCompare.autoAligned'));
    } catch {
      toast.error(t('imageCompare.autoAlignFailed'));
    } finally {
      setIsAligning(false);
    }
  };

  const handleSwap = () => {
    setLeftId(right.id);
    setRightId(left.id);
  };

  const handleReset = () => {
    setRotation(0); setScale(100); setOffsetX(0); setOffsetY(0);
  };

  if (!left || !right) return null;

  const renderSelector = (id: number, onChange: (n: number) => void, label: string) => (
    <Select value={String(id)} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger className="h-7 text-[10px]">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {sorted.map((img, i) => (
          <SelectItem key={img.id} value={String(img.id)} className="text-xs">
            #{i + 1} · {img.created_at ? formatDate(img.created_at, "dd.MM.yy") : "–"}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-lg border bg-card p-4 space-y-3"
    >
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
          <GitCompareArrows className="h-3.5 w-3.5 text-amber-500" />
          Vergleich
        </h4>
        <div className="flex items-center gap-1 rounded-lg bg-muted p-0.5">
          <button
            onClick={() => setMode("side")}
            className={cn(
              "flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-all",
              mode === "side" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
            )}
          >
            <GitCompareArrows className="h-3 w-3" /> {t('imageCompare.sideMode')}
          </button>
          <button
            onClick={() => setMode("overlay")}
            className={cn(
              "flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-all",
              mode === "overlay" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
            )}
          >
            <Layers className="h-3 w-3" /> {t('imageCompare.overlayMode')}
          </button>
        </div>
      </div>

      {sorted.length > 2 && (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t('patientDetail.older')}</p>
            {renderSelector(leftId, setLeftId, t('patientDetail.older'))}
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t('patientDetail.newer')}</p>
            {renderSelector(rightId, setRightId, t('patientDetail.newer'))}
          </div>
        </div>
      )}

      {mode === "side" ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => setLightboxIdx(0)}
              className="group relative block w-full overflow-hidden rounded-lg border aspect-square bg-muted"
            >
              <img src={api.resolveImageSrc(left)} alt="A" className="h-full w-full object-cover" />
              <div className="absolute top-2 left-2 rounded-full bg-muted/90 px-2 py-0.5 text-[10px] font-semibold text-foreground backdrop-blur-sm">
                {t('patientDetail.older')}
              </div>
              <div className="absolute bottom-2 right-2 rounded-full bg-background/80 p-1 opacity-0 transition-opacity group-hover:opacity-100">
                <ZoomIn className="h-3 w-3" />
              </div>
            </button>
            <p className="text-center text-[11px] text-muted-foreground tabular-nums">
              {left.created_at ? formatDate(left.created_at, "dd. MMM yyyy") : "–"}
            </p>
          </div>
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => setLightboxIdx(1)}
              className="group relative block w-full overflow-hidden rounded-lg border aspect-square bg-muted"
            >
              <img
                src={api.resolveImageSrc(right)}
                alt="B"
                className="h-full w-full object-cover"
                style={isModified ? {
                  transform: `translate(${offsetX}%, ${offsetY}%) scale(${scale / 100}) rotate(${rotation}deg)`,
                } : undefined}
              />
              <div className="absolute top-2 left-2 rounded-full bg-primary/90 px-2 py-0.5 text-[10px] font-semibold text-primary-foreground backdrop-blur-sm">
                {t('patientDetail.newer')}
              </div>
              <div className="absolute bottom-2 right-2 rounded-full bg-background/80 p-1 opacity-0 transition-opacity group-hover:opacity-100">
                <ZoomIn className="h-3 w-3" />
              </div>
            </button>
            <p className="text-center text-[11px] text-muted-foreground tabular-nums">
              {right.created_at ? formatDate(right.created_at, "dd. MMM yyyy") : "–"}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="relative overflow-hidden rounded-lg border aspect-square bg-muted">
            <img src={api.resolveImageSrc(left)} alt="A" className="absolute inset-0 h-full w-full object-contain" />
            <img
              src={api.resolveImageSrc(right)}
              alt="B"
              className="absolute inset-0 h-full w-full object-contain"
              style={{
                opacity: opacity / 100,
                transform: `translate(${offsetX}%, ${offsetY}%) scale(${scale / 100}) rotate(${rotation}deg)`,
              }}
            />
            <div className="absolute top-2 left-2 rounded-full bg-muted/90 px-2 py-0.5 text-[10px] font-semibold backdrop-blur-sm">
              {t('imageCompare.olderLabel')}
            </div>
            <div className="absolute top-2 right-2 rounded-full bg-primary/90 px-2 py-0.5 text-[10px] font-semibold text-primary-foreground backdrop-blur-sm">
              {t('imageCompare.newerPercent', { percent: opacity })}
            </div>
            <button
              type="button"
              onClick={() => setLightboxIdx(1)}
              className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-background/80 px-2 py-1 text-[10px] font-medium backdrop-blur-sm hover:bg-background"
            >
              <ZoomIn className="h-3 w-3" /> Vollbild
            </button>
          </div>
          <Slider value={[opacity]} onValueChange={([v]) => setOpacity(v)} min={0} max={100} step={1} />
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1.5" onClick={handleAutoAlign} disabled={isAligning}>
          {isAligning ? (
            <><Loader2 className="h-3 w-3 animate-spin" /> {t('imageCompare.analyzing')}</>
          ) : (
            <><Wand2 className="h-3 w-3" /> {t('imageCompare.aiAlignment')}</>
          )}
        </Button>
        <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1.5" onClick={handleSwap} title={t('imageCompare.swap', 'Tauschen')}>
          <ArrowLeftRight className="h-3 w-3" />
          {t('imageCompare.swap', 'Tauschen')}
        </Button>
        {isModified && (
          <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1" onClick={handleReset}>
            <RotateCcw className="h-3 w-3" /> {t('common.reset')}
          </Button>
        )}
        {mode === "overlay" && (
          <button
            onClick={() => setShowAlignControls(!showAlignControls)}
            className={cn(
              "flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-medium transition-all",
              showAlignControls || isModified
                ? "border-primary/30 bg-primary/5 text-primary"
                : "border-border bg-card text-muted-foreground"
            )}
          >
            <Move className="h-3 w-3" />
            {t('imageCompare.manualAlign')}
            <ChevronDown className={cn("h-3 w-3 transition-transform", showAlignControls && "rotate-180")} />
          </button>
        )}
      </div>

      {/* (Bildauswahl jetzt oberhalb der Bilder) */}

      {/* Manual alignment controls */}
      {mode === "overlay" && showAlignControls && (
        <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{t('imageCompare.rotation', 'Rotation')}</span><span>{rotation}°</span>
            </div>
            <Slider value={[rotation]} onValueChange={([v]) => setRotation(v)} min={-45} max={45} step={1} />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{t('imageCompare.scaleLabel', 'Skalierung')}</span><span>{scale}%</span>
            </div>
            <Slider value={[scale]} onValueChange={([v]) => setScale(v)} min={50} max={200} step={1} />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>X</span><span>{offsetX}%</span>
            </div>
            <Slider value={[offsetX]} onValueChange={([v]) => setOffsetX(v)} min={-50} max={50} step={1} />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Y</span><span>{offsetY}%</span>
            </div>
            <Slider value={[offsetY]} onValueChange={([v]) => setOffsetY(v)} min={-50} max={50} step={1} />
          </div>
        </div>
      )}

      {left.created_at && right.created_at && left.id !== right.id && (
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-[11px] font-medium text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {t('imageCompare.timePeriod')}: {getDaysDiff(left.created_at, right.created_at)}
          </span>
        </div>
      )}
    {lightboxIdx !== null && createPortal(
      <CompareLightbox
        pair={[left, right]}
        startIndex={lightboxIdx}
        onClose={() => setLightboxIdx(null)}
      />,
      document.body,
    )}
    </motion.div>
  );
};

interface CompareLightboxProps {
  pair: [LocationImage, LocationImage];
  startIndex: 0 | 1;
  onClose: () => void;
}

const CompareLightbox = ({ pair, startIndex, onClose }: CompareLightboxProps) => {
  const [idx, setIdx] = useState<0 | 1>(startIndex);
  const labels = ["Älter", "Neuer"] as const;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setIdx(0);
      if (e.key === "ArrowRight") setIdx(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -60) setIdx(1);
    else if (info.offset.x > 60) setIdx(0);
  };

  const current = pair[idx];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex flex-col bg-background/95 backdrop-blur-sm"
      >
        <div className="flex items-center justify-between gap-2 border-b border-border/40 px-4 py-3 safe-area-top">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-foreground">{labels[idx]}</h3>
            <p className="text-[11px] text-muted-foreground tabular-nums">
              {current.created_at ? formatDate(current.created_at, "dd. MMM yyyy") : "–"}
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-muted p-0.5">
            {[0, 1].map((i) => (
              <button
                key={i}
                onClick={() => setIdx(i as 0 | 1)}
                className={cn(
                  "rounded-md px-3 py-1 text-[11px] font-medium transition-all",
                  idx === i ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
                )}
              >
                {labels[i]}
              </button>
            ))}
          </div>
          <Button size="icon" variant="ghost" onClick={onClose} className="h-9 w-9 shrink-0">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="relative flex flex-1 items-center justify-center overflow-hidden">
          <button
            onClick={() => setIdx(0)}
            disabled={idx === 0}
            className="absolute left-2 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-card/80 shadow-md hover:bg-card disabled:opacity-30 md:flex"
            aria-label="Älter"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => setIdx(1)}
            disabled={idx === 1}
            className="absolute right-2 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-card/80 shadow-md hover:bg-card disabled:opacity-30 md:flex"
            aria-label="Neuer"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={current.id}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="h-full w-full"
            >
              <TransformWrapper
                doubleClick={{ mode: "toggle", step: 2 }}
                pinch={{ step: 5 }}
                wheel={{ step: 0.2 }}
                panning={{ velocityDisabled: true }}
              >
                <TransformComponent
                  wrapperStyle={{ width: "100%", height: "100%" }}
                  contentStyle={{ width: "100%", height: "100%" }}
                >
                  <img
                    src={api.resolveImageSrc(current)}
                    alt={labels[idx]}
                    className="h-full w-full select-none object-contain"
                    draggable={false}
                  />
                </TransformComponent>
              </TransformWrapper>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="border-t border-border/40 bg-card/60 px-4 py-2 text-center text-[11px] text-muted-foreground safe-area-bottom">
          Doppeltippen zum Zoomen · Wischen zum Wechseln
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
export default QuickProgressCompare;
