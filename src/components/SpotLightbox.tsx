import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { X, ChevronLeft, ChevronRight, GitCompareArrows, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/dateUtils";
import { formatCreatedByLabel } from "@/lib/createdByLabel";
import type { LocationImage } from "@/types/patient";
import { useAuth } from "@/contexts/AuthContext";

interface SpotLightboxProps {
  open: boolean;
  onClose: () => void;
  images: LocationImage[];
  locationName: string;
  onCompare?: () => void;
  initialImageId?: number | null;
}

const riskColor = (level?: string | null) => {
  const v = (level ?? "").toLowerCase();
  if (v.includes("high") || v.includes("hoch")) return "bg-red-500";
  if (v.includes("medium") || v.includes("mittel")) return "bg-amber-500";
  if (v.includes("low") || v.includes("niedrig")) return "bg-emerald-500";
  return "bg-muted-foreground/40";
};

const SpotLightbox = ({ open, onClose, images, locationName, onCompare, initialImageId }: SpotLightboxProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isPma = user?.role === "pma";
  const sorted = useMemo(
    () => [...images].sort((a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime()),
    [images],
  );
  const [index, setIndex] = useState(sorted.length - 1);
  const touchStartX = useRef<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const pinchRef = useRef<{ startDist: number; startZoom: number; startPan: { x: number; y: number } } | null>(null);
  const panRef = useRef<{ startX: number; startY: number; startPan: { x: number; y: number } } | null>(null);
  const resetZoom = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, []);

  useEffect(() => {
    if (!open) return;
    if (initialImageId != null) {
      const i = sorted.findIndex(im => im.id === initialImageId);
      setIndex(i >= 0 ? i : Math.max(0, sorted.length - 1));
    } else {
      setIndex(Math.max(0, sorted.length - 1));
    }
  }, [open, sorted, initialImageId]);

  const go = useCallback((dir: -1 | 1) => {
    setIndex(i => Math.min(sorted.length - 1, Math.max(0, i + dir)));
    setZoom(1); setPan({ x: 0, y: 0 });
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

  const safeIndex = Math.min(Math.max(0, index), sorted.length - 1);
  const current = sorted[safeIndex];
  if (!current) return null;

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
          {sorted.length >= 2 && onCompare && !isPma && (
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

          <div
            className="flex h-full w-full touch-none items-center justify-center overflow-hidden p-4"
            onWheel={(e) => {
              e.preventDefault();
              const delta = -e.deltaY * 0.0015;
              setZoom(z => {
                const nz = Math.min(5, Math.max(1, z + delta * z));
                if (nz === 1) setPan({ x: 0, y: 0 });
                return nz;
              });
            }}
            onDoubleClick={() => {
              setZoom(z => (z > 1 ? 1 : 2));
              setPan({ x: 0, y: 0 });
            }}
            onTouchStart={(e) => {
              if (e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                pinchRef.current = { startDist: Math.hypot(dx, dy), startZoom: zoom, startPan: pan };
              } else if (e.touches.length === 1 && zoom > 1) {
                panRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, startPan: pan };
              } else if (e.touches.length === 1) {
                touchStartX.current = e.touches[0].clientX;
              }
            }}
            onTouchMove={(e) => {
              if (e.touches.length === 2 && pinchRef.current) {
                e.preventDefault();
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const dist = Math.hypot(dx, dy);
                const ratio = dist / pinchRef.current.startDist;
                const nz = Math.min(5, Math.max(1, pinchRef.current.startZoom * ratio));
                setZoom(nz);
                if (nz === 1) setPan({ x: 0, y: 0 });
              } else if (e.touches.length === 1 && panRef.current && zoom > 1) {
                e.preventDefault();
                const dx = e.touches[0].clientX - panRef.current.startX;
                const dy = e.touches[0].clientY - panRef.current.startY;
                setPan({ x: panRef.current.startPan.x + dx, y: panRef.current.startPan.y + dy });
              }
            }}
            onTouchEnd={(e) => {
              if (e.touches.length < 2) pinchRef.current = null;
              if (e.touches.length === 0) {
                if (zoom <= 1 && touchStartX.current != null) {
                  const dx = (e.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
                  if (dx < -60) go(1);
                  else if (dx > 60) go(-1);
                }
                touchStartX.current = null;
                panRef.current = null;
              }
            }}
            onPointerDown={(e) => {
              if (e.pointerType === "mouse" && zoom > 1) {
                panRef.current = { startX: e.clientX, startY: e.clientY, startPan: pan };
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              }
            }}
            onPointerMove={(e) => {
              if (e.pointerType === "mouse" && panRef.current && zoom > 1) {
                const dx = e.clientX - panRef.current.startX;
                const dy = e.clientY - panRef.current.startY;
                setPan({ x: panRef.current.startPan.x + dx, y: panRef.current.startPan.y + dy });
              }
            }}
            onPointerUp={(e) => {
              if (e.pointerType === "mouse") panRef.current = null;
            }}
            style={{ cursor: zoom > 1 ? (panRef.current ? "grabbing" : "grab") : "default" }}
          >
            <img
              key={current.id}
              src={api.resolveImageSrc(current)}
              alt={`${t('imageGallery.recording')} ${index + 1}`}
              className="max-h-full max-w-full select-none rounded-lg object-contain shadow-2xl"
              draggable={false}
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: "center center",
                transition: panRef.current || pinchRef.current ? "none" : "transform 0.15s ease-out",
              }}
            />
          </div>
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
            {current.created_by_label && (
              <>
                <span className="mx-1 opacity-40">•</span>
                <span>{formatCreatedByLabel(current.created_by_label)}</span>
              </>
            )}
            {current.risk_level && !isPma && (
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
                  isPma ? "bg-muted-foreground/40" : riskColor(img.risk_level),
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
