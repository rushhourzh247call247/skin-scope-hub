import { useState, useCallback } from "react";
import BodyMap3D from "@/components/BodyMap3D";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LESION_CLASSIFICATIONS, type LesionClassification } from "@/types/patient";
import { RotateCcw, Sparkles, MousePointerClick } from "lucide-react";
import { cn } from "@/lib/utils";

interface DemoSpot {
  id: number;
  x: number;
  y: number;
  view: "front" | "back";
  x3d?: number;
  y3d?: number;
  z3d?: number;
  nx?: number;
  ny?: number;
  nz?: number;
  classification: LesionClassification;
}

const SEEDED_SPOTS: DemoSpot[] = [
  // Skip seeded — let user explore from scratch for the strongest "wow" moment.
];

const SELECTABLE_CLASSIFICATIONS: LesionClassification[] = [
  "naevus",
  "melanoma_suspect",
  "bcc",
  "keratosis",
  "other",
];

export const LoginDemoBodyMap = () => {
  const [spots, setSpots] = useState<DemoSpot[]>(SEEDED_SPOTS);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [pendingSpot, setPendingSpot] = useState<DemoSpot | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);

  const handleMapClick = useCallback(
    (
      x: number,
      y: number,
      view: "front" | "back",
      _markType?: "spot" | "region" | "zone",
      point3d?: [number, number, number],
      normal3d?: [number, number, number],
    ) => {
      setHasInteracted(true);
      const newSpot: DemoSpot = {
        id: Date.now(),
        x,
        y,
        view,
        x3d: point3d?.[0],
        y3d: point3d?.[1],
        z3d: point3d?.[2],
        nx: normal3d?.[0],
        ny: normal3d?.[1],
        nz: normal3d?.[2],
        classification: "unclassified",
      };
      setPendingSpot(newSpot);
    },
    [],
  );

  const confirmSpot = (classification: LesionClassification) => {
    if (!pendingSpot) return;
    const finalized: DemoSpot = { ...pendingSpot, classification };
    setSpots((prev) => [...prev, finalized]);
    setSelectedId(finalized.id);
    setPendingSpot(null);
  };

  const reset = () => {
    setSpots([]);
    setSelectedId(null);
    setPendingSpot(null);
  };

  const markers = spots.map((s) => ({
    id: s.id,
    x: s.x,
    y: s.y,
    x3d: s.x3d,
    y3d: s.y3d,
    z3d: s.z3d,
    nx: s.nx,
    ny: s.ny,
    nz: s.nz,
    view: s.view,
    type: "spot" as const,
    classification: s.classification,
    classificationColor: LESION_CLASSIFICATIONS[s.classification].color,
    name: LESION_CLASSIFICATIONS[s.classification].label,
    imageCount: 0,
    findingCount: 0,
  }));

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Demo badge */}
      <div className="absolute left-4 top-4 z-20 flex items-center gap-2 rounded-full border border-primary/20 bg-card/90 px-3 py-1.5 text-xs font-medium shadow-lg backdrop-blur-md">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span>Live Demo</span>
      </div>

      {/* Reset button */}
      {spots.length > 0 && (
        <button
          onClick={reset}
          className="absolute right-4 top-4 z-20 flex items-center gap-1.5 rounded-full border border-border bg-card/90 px-3 py-1.5 text-xs font-medium shadow-lg backdrop-blur-md transition-colors hover:bg-card"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Zurücksetzen
        </button>
      )}

      {/* Onboarding hint */}
      {!hasInteracted && spots.length === 0 && (
        <div className="pointer-events-none absolute left-1/2 top-16 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-medium text-primary shadow-md backdrop-blur-md animate-pulse">
          <MousePointerClick className="h-4 w-4" />
          <span>Klicken Sie auf den Körper, um eine Hautstelle zu markieren</span>
        </div>
      )}

      {/* Spots counter */}
      {spots.length > 0 && (
        <div className="absolute bottom-4 left-4 z-20 rounded-lg border border-border bg-card/90 px-3 py-2 shadow-lg backdrop-blur-md">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Markiert</div>
          <div className="text-lg font-bold text-foreground">
            {spots.length} {spots.length === 1 ? "Hautstelle" : "Hautstellen"}
          </div>
        </div>
      )}

      {/* The actual 3D body map */}
      <div className="h-full w-full">
        <BodyMap3D
          markers={markers}
          selectedLocationId={selectedId}
          gender="male"
          onMapClick={handleMapClick}
          onMarkerClick={(id) => setSelectedId(id)}
        />
      </div>

      {/* Classification picker overlay */}
      {pendingSpot && (
        <div
          className="absolute inset-0 z-30 flex items-center justify-center bg-background/40 backdrop-blur-sm"
          onClick={() => setPendingSpot(null)}
        >
          <div
            className="w-[90%] max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 text-sm font-semibold text-foreground">
              Hautstelle klassifizieren
            </div>
            <p className="mb-4 text-xs text-muted-foreground">
              Demo-Modus — wählen Sie eine Klassifizierung
            </p>
            <div className="grid grid-cols-1 gap-2">
              {SELECTABLE_CLASSIFICATIONS.map((c) => {
                const meta = LESION_CLASSIFICATIONS[c];
                return (
                  <button
                    key={c}
                    onClick={() => confirmSpot(c)}
                    className={cn(
                      "flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-left text-sm transition-all hover:border-primary hover:bg-primary/5",
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="inline-block h-3 w-3 rounded-full ring-2 ring-background"
                        style={{ backgroundColor: meta.color }}
                      />
                      <span className="font-medium text-foreground">{meta.label}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {meta.shortLabel}
                    </Badge>
                  </button>
                );
              })}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 w-full text-xs text-muted-foreground"
              onClick={() => setPendingSpot(null)}
            >
              Abbrechen
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginDemoBodyMap;
