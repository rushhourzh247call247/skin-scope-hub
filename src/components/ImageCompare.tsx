import { useState, useRef, useCallback } from "react";
import type { LocationImage } from "@/types/patient";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { ArrowLeft, Calendar, Check, GitCompareArrows, RotateCcw, ZoomIn, Layers, Move, RotateCw, ChevronDown, Wand2, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { mockApi } from "@/lib/mockData";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import AiAnalysisResult from "@/components/AiAnalysisResult";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
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
  const [selected, setSelected] = useState<number[]>([]);
  const [zoomedImage, setZoomedImage] = useState<LocationImage | null>(null);
  const [compareMode, setCompareMode] = useState<"side" | "overlay">("side");
  const [overlayOpacity, setOverlayOpacity] = useState(50);
  const [overlayRotation, setOverlayRotation] = useState(0);
  const [overlayScale, setOverlayScale] = useState(100);
  const [overlayOffsetX, setOverlayOffsetX] = useState(0);
  const [overlayOffsetY, setOverlayOffsetY] = useState(0);
  const [showAlignControls, setShowAlignControls] = useState(false);

  const isAlignmentModified = overlayRotation !== 0 || overlayScale !== 100 || overlayOffsetX !== 0 || overlayOffsetY !== 0;

  const handleAutoAlign = () => {
    setOverlayRotation(0);
    setOverlayScale(100);
    setOverlayOffsetX(0);
    setOverlayOffsetY(0);
  };

  const sorted = [...images].sort(
    (a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime()
  );

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((i) => i !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const compareImages = selected.length === 2
    ? sorted.filter((img) => selected.includes(img.id))
    : null;

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
              Verlaufsvergleich – {locationName}
            </h3>
            <p className="text-xs text-muted-foreground">
              Wählen Sie 2 Bilder zum Vergleichen aus
            </p>
          </div>
        </div>
        {selected.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => setSelected([])}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Auswahl zurücksetzen
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
                <div
                  onClick={() => toggleSelect(img.id)}
                  className={cn(
                    "flex flex-1 cursor-pointer items-center gap-4 rounded-lg border p-3 transition-all duration-200",
                    isSelected
                      ? "border-primary/30 bg-primary/5 ring-1 ring-primary/20"
                      : "border-border bg-card hover:bg-muted/50"
                  )}
                >
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-border shadow-sm">
                    <img
                      src={mockApi.getImageUrl(img.image_path)}
                      alt={`Aufnahme #${img.id}`}
                      className="h-full w-full object-cover"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                        <Check className="h-5 w-5 text-primary" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">Aufnahme #{index + 1}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {img.created_at ? format(new Date(img.created_at), "dd. MMMM yyyy, HH:mm", { locale: de }) : "–"}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="shrink-0" onClick={(e) => { e.stopPropagation(); setZoomedImage(img); }}>
                    <ZoomIn className="h-4 w-4" />
                  </Button>
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
                Vergleich
              </h4>
              {/* Mode toggle */}
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
                  <GitCompareArrows className="h-3 w-3" /> Nebeneinander
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
                  <Layers className="h-3 w-3" /> Overlay
                </button>
              </div>
            </div>

            {compareMode === "side" ? (
              /* Side-by-side */
              <div className="grid grid-cols-2 gap-4">
                {compareImages.map((img, i) => (
                  <div key={img.id} className="space-y-2">
                    <div className="relative overflow-hidden rounded-lg border aspect-square bg-muted">
                      <img src={mockApi.getImageUrl(img.image_path)} alt={`Vergleich ${i + 1}`} className="h-full w-full object-contain" />
                      <div className={cn(
                        "absolute top-2 left-2 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                        i === 0 ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"
                      )}>
                        {i + 1}
                      </div>
                    </div>
                    <p className="text-center text-xs text-muted-foreground tabular-nums">
                      {img.created_at ? format(new Date(img.created_at), "dd. MMM yyyy", { locale: de }) : "–"}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              /* Overlay mode */
              <div className="space-y-4">
                <div className="relative overflow-hidden rounded-lg border aspect-square bg-muted">
                  {/* Base image (older) */}
                  <img
                    src={mockApi.getImageUrl(compareImages[0].image_path)}
                    alt="Ältere Aufnahme"
                    className="absolute inset-0 h-full w-full object-contain"
                  />
                  {/* Overlay image (newer) with adjustable opacity */}
                  <img
                    src={mockApi.getImageUrl(compareImages[1].image_path)}
                    alt="Neuere Aufnahme"
                    className="absolute inset-0 h-full w-full object-contain"
                    style={{
                      opacity: overlayOpacity / 100,
                      transform: `rotate(${overlayRotation}deg) scale(${overlayScale / 100}) translate(${overlayOffsetX}px, ${overlayOffsetY}px)`,
                    }}
                  />
                  {/* Labels */}
                  <div className="absolute top-2 left-2 rounded-full bg-primary/90 px-2 py-0.5 text-[9px] font-bold text-primary-foreground backdrop-blur-sm">
                    ÄLTER
                  </div>
                  <div className="absolute top-2 right-2 rounded-full bg-accent/90 px-2 py-0.5 text-[9px] font-bold text-accent-foreground backdrop-blur-sm">
                    NEUER ({overlayOpacity}%)
                  </div>
                </div>
                {/* Opacity slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {compareImages[0].created_at ? format(new Date(compareImages[0].created_at), "dd.MM.yy", { locale: de }) : "–"}
                    </span>
                    <span className="text-[10px] font-medium text-foreground">Transparenz: {overlayOpacity}%</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {compareImages[1].created_at ? format(new Date(compareImages[1].created_at), "dd.MM.yy", { locale: de }) : "–"}
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

                {/* Quick Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] gap-1.5"
                    onClick={handleAutoAlign}
                  >
                    <Wand2 className="h-3 w-3" /> Auto Ausrichten
                  </Button>
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
                    Manuell
                    {isAlignmentModified && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                    <ChevronDown className={cn("h-3 w-3 transition-transform", showAlignControls && "rotate-180")} />
                  </button>
                </div>

                {/* Collapsible Alignment Controls */}
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
                            onClick={handleAutoAlign}
                          >
                            <RotateCcw className="mr-1 h-3 w-3" /> Reset
                          </Button>
                        </div>

                        {/* Rotation */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-1"><RotateCw className="h-3 w-3" /> Rotation</span>
                            <span className="font-mono">{overlayRotation}°</span>
                          </div>
                          <Slider value={[overlayRotation]} onValueChange={([v]) => setOverlayRotation(v)} min={-180} max={180} step={1} />
                        </div>

                        {/* Scale */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-1"><ZoomIn className="h-3 w-3" /> Zoom</span>
                            <span className="font-mono">{overlayScale}%</span>
                          </div>
                          <Slider value={[overlayScale]} onValueChange={([v]) => setOverlayScale(v)} min={50} max={200} step={1} />
                        </div>

                        {/* Offset X */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                            <span>← Horizontal →</span>
                            <span className="font-mono">{overlayOffsetX}px</span>
                          </div>
                          <Slider value={[overlayOffsetX]} onValueChange={([v]) => setOverlayOffsetX(v)} min={-100} max={100} step={1} />
                        </div>

                        {/* Offset Y */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                            <span>↑ Vertikal ↓</span>
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

            {/* Time difference */}
            {compareImages[0].created_at && compareImages[1].created_at && (
              <div className="text-center">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  Zeitraum: {getDaysDiff(compareImages[0].created_at, compareImages[1].created_at)}
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
              <img src={mockApi.getImageUrl(zoomedImage.image_path)} alt="Vergrössert" className="w-full rounded-md object-contain" />
              <p className="text-center text-xs text-muted-foreground tabular-nums">
                {zoomedImage.created_at ? format(new Date(zoomedImage.created_at), "dd. MMMM yyyy, HH:mm", { locale: de }) : "–"}
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
  if (days === 0) return "Gleicher Tag";
  if (days < 30) return `${days} Tage`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} Monat${months > 1 ? "e" : ""}`;
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  return remMonths > 0 ? `${years} Jahr${years > 1 ? "e" : ""}, ${remMonths} Mon.` : `${years} Jahr${years > 1 ? "e" : ""}`;
}

export default ImageCompare;
