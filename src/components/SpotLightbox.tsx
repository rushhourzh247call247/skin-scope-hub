import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { X, ChevronLeft, ChevronRight, GitCompareArrows, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/dateUtils";
import type { LocationImage } from "@/types/patient";

interface SpotLightboxProps {
  open: boolean;
  onClose: () => void;
  images: LocationImage[];
  locationName: string;
  onCompare?: () => void;
}

const riskColor = (level?: string | null) => {
  const v = (level ?? "").toLowerCase();
  if (v.includes("high") || v.includes("hoch")) return "bg-red-500";
  if (v.includes("medium") || v.includes("mittel")) return "bg-amber-500";
  if (v.includes("low") || v.includes("niedrig")) return "bg-emerald-500";
  return "bg-muted-foreground/40";
};

const SpotLightbox = ({ open, onClose, images, locationName, onCompare }: SpotLightboxProps) => {
  const { t } = useTranslation();
  const sorted = useMemo(
    () => [...images].sort((a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime()),
    [images],
  );
  const [index, setIndex] = useState(sorted.length - 1);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (open) setIndex(Math.max(0, sorted.length - 1));
  }, [open, sorted.length]);

  const go = useCallback((dir: -1 | 1) => {
    setIndex(i => Math.min(sorted.length - 1, Math.max(0, i + dir)));
  }, [sorted.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, go]);

  if (!open || sorted.length === 0) return null;

  const current = sorted[index];

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -60) go(1);
    else if (info.offset.x > 60) go(-1);
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex flex-col bg-background/95 backdrop-blur-sm"
        onClick={onClose}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between gap-2 border-b border-border/40 px-4 py-3 safe-area-top"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-foreground">{locationName}</h3>
            <p className="text-[11px] text-muted-foreground">
              {t('imageGallery.recording')} {index + 1} / {sorted.length}
            </p>
          </div>
          {sorted.length >= 2 && onCompare && (
            <Button size="sm" variant="outline" onClick={onCompare} className="gap-1.5">
              <GitCompareArrows className="h-3.5 w-3.5" />
              <span>{t('imageGallery.compare')}</span>
            </Button>
          )}
          <Button size="icon" variant="ghost" onClick={onClose} className="h-9 w-9 shrink-0">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Image area */}
        <div
          className="relative flex flex-1 items-center justify-center overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Desktop arrows */}
          {index > 0 && (
            <button
              onClick={() => go(-1)}
              className="absolute left-2 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-card/80 shadow-md hover:bg-card md:flex"
              aria-label="Previous"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          {index < sorted.length - 1 && (
            <button
              onClick={() => go(1)}
              className="absolute right-2 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-card/80 shadow-md hover:bg-card md:flex"
              aria-label="Next"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={current.id}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="flex h-full w-full touch-pan-y items-center justify-center p-4"
            >
              <img
                src={api.resolveImageSrc(current)}
                alt={`${t('imageGallery.recording')} ${index + 1}`}
                className="max-h-full max-w-full select-none rounded-lg object-contain shadow-2xl"
                draggable={false}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer: meta + history dots */}
        <div
          className="border-t border-border/40 bg-card/60 px-4 py-3 safe-area-bottom"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-2 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span className="tabular-nums">
              {current.created_at ? formatDate(current.created_at, "dd.MM.yyyy") : "–"}
            </span>
            {current.risk_level && (
              <>
                <span className="mx-1 opacity-40">•</span>
                <span className="capitalize">{current.risk_level}</span>
              </>
            )}
          </div>
          <div className="flex items-center justify-center gap-1.5">
            {sorted.map((img, i) => (
              <button
                key={img.id}
                onClick={() => setIndex(i)}
                aria-label={`Go to ${i + 1}`}
                className={cn(
                  "h-2 rounded-full transition-all",
                  i === index ? "w-6" : "w-2 opacity-50 hover:opacity-80",
                  riskColor(img.risk_level),
                )}
              />
            ))}
          </div>
          {current.note && (
            <p className="mt-2 line-clamp-2 text-center text-[11px] text-muted-foreground">
              {current.note}
            </p>
          )}
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
};

export default SpotLightbox;
