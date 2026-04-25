import { useState, useCallback, useRef, useEffect } from "react";
import BodyMap3D from "@/components/BodyMap3D";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LESION_CLASSIFICATIONS, type LesionClassification, type Gender } from "@/types/patient";
import { RotateCcw, Sparkles, MousePointerClick, Upload, QrCode, Camera, X, Image as ImageIcon, Check, Loader2, Smartphone, Plus, GitCompareArrows } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { cn } from "@/lib/utils";

// Wasserzeichen-Overlay für alle Demo-Bilder (verhindert kostenfreie Nutzung)
function DemoWatermark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const fontSize =
    size === "sm" ? "text-[13px]" : size === "lg" ? "text-2xl" : "text-lg";
  const centerSize =
    size === "sm" ? "text-2xl" : size === "lg" ? "text-5xl" : "text-4xl";
  const tile = size === "sm" ? 110 : size === "lg" ? 240 : 180;
  return (
    <div
      className="pointer-events-none absolute inset-0 z-20 overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* Diagonal gekacheltes Wasserzeichen — kräftig & dicht */}
      <div
        className={cn(
          "absolute -inset-[30%] flex flex-wrap content-start gap-x-4 gap-y-5",
          fontSize,
        )}
        style={{ transform: "rotate(-30deg)" }}
      >
        {Array.from({ length: 140 }).map((_, i) => (
          <span
            key={i}
            className="font-black tracking-tight whitespace-nowrap"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              width: tile,
              color: "rgba(255,255,255,0.55)",
              textShadow:
                "0 0 1px rgba(0,0,0,0.9), 1px 1px 0 rgba(0,0,0,0.7), -1px -1px 0 rgba(0,0,0,0.5)",
              WebkitTextStroke: "0.5px rgba(0,0,0,0.6)",
            }}
          >
            DERM<span style={{ color: "hsl(var(--primary))" }}>247</span>
            <span className="ml-1 opacity-90">· DEMO</span>
          </span>
        ))}
      </div>

      {/* Großes Center-Logo — unübersehbar */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className={cn(
            "font-black tracking-tighter",
            centerSize,
          )}
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            transform: "rotate(-20deg)",
            color: "rgba(255,255,255,0.85)",
            textShadow:
              "0 2px 8px rgba(0,0,0,0.85), 0 0 2px rgba(0,0,0,1), 2px 2px 0 rgba(0,0,0,0.7)",
            WebkitTextStroke: "1px rgba(0,0,0,0.7)",
          }}
        >
          DERM<span style={{ color: "hsl(var(--primary))" }}>247</span>
        </div>
      </div>

      {/* Prominentes Logo unten rechts */}
      <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded-md bg-black/75 px-2 py-1 backdrop-blur-sm ring-1 ring-white/20">
        <span
          className={cn("font-black tracking-tight text-white", fontSize)}
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          DERM<span style={{ color: "hsl(var(--primary))" }}>247</span>
          <span className="ml-1 text-white/80">· DEMO</span>
        </span>
      </div>
    </div>
  );
}

// API-Auswahl: Live-API nur wenn Demo unter demo.derm247.ch läuft.
// Dev (proto.derm247.ch), Lovable Preview, localhost → Dev-API
const DEMO_API_BASE = (() => {
  if (typeof window === "undefined") return "https://dev.derm247.ch/api";
  return window.location.hostname === "demo.derm247.ch"
    ? "https://api.derm247.ch/api"
    : "https://dev.derm247.ch/api";
})();

// QR-Link: zeigt auf eine vom Handy erreichbare HTTPS-Domain.
// - demo.derm247.ch (Live)         → demo.derm247.ch
// - proto.derm247.ch (Dev)         → proto.derm247.ch  (gleiche Domain wie aktuelles Frontend)
// - Lovable Preview / localhost    → proto.derm247.ch  (Handy kann Preview-URL nicht erreichen)
const FRONTEND_DEMO_DOMAIN = (() => {
  if (typeof window === "undefined") return "https://demo.derm247.ch";
  const host = window.location.hostname;
  if (host === "demo.derm247.ch") return "https://demo.derm247.ch";
  if (host === "proto.derm247.ch") return "https://proto.derm247.ch";
  return "https://proto.derm247.ch";
})();

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
  photos: string[];
}

const SELECTABLE_CLASSIFICATIONS: LesionClassification[] = [
  "naevus",
  "melanoma_suspect",
  "bcc",
  "keratosis",
  "other",
];


export const LoginDemoBodyMap = () => {
  const [gender, setGender] = useState<Gender>("male");
  const [spots, setSpots] = useState<DemoSpot[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [pendingSpot, setPendingSpot] = useState<DemoSpot | null>(null);
  const [photoDialogSpotId, setPhotoDialogSpotId] = useState<number | null>(null);
  const [compareSpotId, setCompareSpotId] = useState<number | null>(null);
  const [compareMode, setCompareMode] = useState<"side" | "aligned" | "overlay">("side");
  const [overlayOpacity, setOverlayOpacity] = useState(50);
  const [compareIndices, setCompareIndices] = useState<[number, number]>([0, 1]);
  const [aligning, setAligning] = useState(false);
  const [lightboxSpotId, setLightboxSpotId] = useState<number | null>(null);
  const [lightboxIdx, setLightboxIdx] = useState(0);
  const [qrSession, setQrSession] = useState<{ token: string; url: string } | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [qrPolling, setQrPolling] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<number | null>(null);

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
        photos: [],
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
    // Auto-open photo dialog for the new spot
    setTimeout(() => setPhotoDialogSpotId(finalized.id), 200);
  };

  const clearPollingInterval = () => {
    if (pollIntervalRef.current) {
      window.clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const stopPolling = () => {
    clearPollingInterval();
    setQrPolling(false);
  };

  const reset = () => {
    setSpots([]);
    setSelectedId(null);
    setPendingSpot(null);
    setPhotoDialogSpotId(null);
    setLightboxSpotId(null);
    setCompareSpotId(null);
    setQrSession(null);
    setQrError(null);
    stopPolling();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.target;
    const file = inputEl.files?.[0];
    if (!file || !photoDialogSpotId) {
      inputEl.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setSpots((prev) =>
        prev.map((s) =>
          s.id === photoDialogSpotId && s.photos.length < 3
            ? { ...s, photos: [...s.photos, dataUrl] }
            : s,
        ),
      );
      setPhotoDialogSpotId(null);
    };
    reader.readAsDataURL(file);
    inputEl.value = "";
  };

  const startQrUpload = async () => {
    if (!photoDialogSpotId) return;
    setQrLoading(true);
    setQrError(null);
    try {
      const res = await fetch(`${DEMO_API_BASE}/demo/qr-token`, { method: "POST" });
      if (!res.ok) {
        if (res.status === 429) throw new Error("Demo-Limit erreicht — bitte 1 Stunde warten.");
        if (res.status === 404) throw new Error('QR-Upload aktuell nicht verfügbar. Bitte "Kamera" oder "Galerie" verwenden.');
        throw new Error("Konnte keinen QR-Code erstellen.");
      }
      const data = await res.json();
      const url = `${FRONTEND_DEMO_DOMAIN}/demo-upload?token=${data.token}`;
      setQrSession({ token: data.token, url });
      setQrPolling(true);
    } catch (e: any) {
      // TypeError = Network/CORS-Fehler (Backend nicht erreichbar)
      const msg = e?.message?.includes("Failed to fetch") || e?.name === "TypeError"
        ? 'QR-Upload aktuell nicht verfügbar. Bitte "Kamera" oder "Galerie" verwenden.'
        : (e?.message || "Fehler — Demo-Server nicht erreichbar.");
      setQrError(msg);
    } finally {
      setQrLoading(false);
    }
  };

  // Poll for upload completion
  useEffect(() => {
    if (!qrSession || !qrPolling || !photoDialogSpotId) return;
    const targetSpotId = photoDialogSpotId;
    const token = qrSession.token;
    let cancelled = false;
    let handlingCompletion = false;

    const blobToDataUrl = (blob: Blob) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("FileReader failed"));
        reader.readAsDataURL(blob);
      });

    const tick = async () => {
      if (cancelled || handlingCompletion) return;
      try {
        const res = await fetch(`${DEMO_API_BASE}/demo/qr-status/${token}`);
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        console.log("[QR-Demo] poll status:", data.status, data.image_url);
        if (data.status === "completed" && data.image_url) {
          handlingCompletion = true;
          clearPollingInterval();
          try {
            const imgRes = await fetch(data.image_url, { cache: "no-store" });
            if (!imgRes.ok) throw new Error(`Image fetch failed: ${imgRes.status}`);
            const blob = await imgRes.blob();
            console.log("[QR-Demo] blob loaded, size:", blob.size, "type:", blob.type);

            let localImageUrl: string;
            try {
              localImageUrl = await blobToDataUrl(blob);
            } catch {
              localImageUrl = URL.createObjectURL(blob);
            }

            if (cancelled) return;
            console.log("[QR-Demo] applying photo to spot", targetSpotId, "url length:", localImageUrl.length);
            setSpots((prev) => {
              const exists = prev.some((s) => s.id === targetSpotId);
              console.log("[QR-Demo] spot exists in state?", exists, "current spots:", prev.map((s) => s.id));
              return prev.map((s) =>
                s.id === targetSpotId && s.photos.length < 3
                  ? { ...s, photos: [...s.photos, localImageUrl] }
                  : s,
              );
            });
            setSelectedId(targetSpotId);
            setPhotoDialogSpotId(null);
            setQrSession(null);
            setQrError(null);
            fetch(`${DEMO_API_BASE}/demo/consume/${token}`, { method: "POST" }).catch(() => {});
          } catch (err) {
            console.error("[QR-Demo] image load failed:", err);
            setQrError("Foto wurde hochgeladen, konnte aber am Desktop nicht geladen werden.");
            setQrSession(null);
            handlingCompletion = false;
          }
        } else if (data.status === "expired" || data.status === "invalid") {
          setQrError("QR-Code abgelaufen. Bitte neu generieren.");
          setQrSession(null);
          stopPolling();
        }
      } catch {
        // Network hiccup — keep polling
      }
    };

    pollIntervalRef.current = window.setInterval(tick, 2500);
    tick();
    return () => {
      cancelled = true;
      if (pollIntervalRef.current) window.clearInterval(pollIntervalRef.current);
    };
  }, [qrSession, qrPolling, photoDialogSpotId]);

  useEffect(() => () => stopPolling(), []);

  const removePhoto = (spotId: number, index: number) => {
    setSpots((prev) =>
      prev.map((s) =>
        s.id === spotId ? { ...s, photos: s.photos.filter((_, i) => i !== index) } : s,
      ),
    );
  };

  const selectedSpot = spots.find((s) => s.id === selectedId);

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
    imageCount: s.photos.length,
    findingCount: 0,
    photoThumbnailUrl: s.photos[s.photos.length - 1],
  }));

  return (
    <div className="relative h-full w-full overflow-hidden flex flex-col">
      {/* Top bar: Demo badge + Gender toggle + Reset */}
      <div className="relative z-20 flex items-center justify-between gap-2 px-4 pt-4">
        <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-card/90 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur-md">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span>Live Demo</span>
        </div>

        {/* Gender toggle */}
        <div className="flex items-center rounded-full border border-border bg-card/90 p-0.5 shadow-sm backdrop-blur-md">
          <button
            onClick={() => setGender("male")}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-all",
              gender === "male"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            ♂ Männlich
          </button>
          <button
            onClick={() => setGender("female")}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-all",
              gender === "female"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            ♀ Weiblich
          </button>
        </div>

        {spots.length > 0 ? (
          <button
            onClick={reset}
            className="flex items-center gap-1.5 rounded-full border border-border bg-card/90 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur-md transition-colors hover:bg-card"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
        ) : (
          <div className="w-[68px]" />
        )}
      </div>

      {/* Onboarding hint */}
      {!hasInteracted && spots.length === 0 && (
        <div className="pointer-events-none absolute left-1/2 top-16 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-medium text-primary shadow-md backdrop-blur-md animate-pulse">
          <MousePointerClick className="h-4 w-4" />
          <span>Klicken Sie auf den Körper, um eine Hautstelle zu markieren</span>
        </div>
      )}

      {/* Body map (constrained, not full height) */}
      <div className="relative flex-1 mx-auto w-full max-w-[520px] px-4">
        <div className="h-full w-full" key={gender}>
          <BodyMap3D
            markers={markers}
            selectedLocationId={selectedId}
            gender={gender}
            onMapClick={handleMapClick}
            onMarkerClick={(id) => setSelectedId(id)}
            onMarkerPhotoClick={(id) => {
              const spot = spots.find((s) => s.id === id);
              setSelectedId(id);
              if (spot?.photos.length) {
                setLightboxSpotId(id);
                setLightboxIdx(spot.photos.length - 1);
              }
            }}
          />
        </div>
      </div>

      {/* Selected spot card with photo */}
      {selectedSpot && (
        <div className="relative z-20 mx-4 mb-4 rounded-xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur-md">
          <div className="flex items-start gap-3">
            {/* Photo strip — alle Fotos + Plus-Button */}
            <div className="flex flex-shrink-0 gap-1.5">
              {selectedSpot.photos.map((photo, idx) => (
                <div
                  key={idx}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setLightboxSpotId(selectedSpot.id);
                    setLightboxIdx(idx);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setLightboxSpotId(selectedSpot.id);
                      setLightboxIdx(idx);
                    }
                  }}
                  className="group relative h-16 w-16 cursor-pointer overflow-hidden rounded-lg border border-border transition-all hover:border-primary hover:ring-2 hover:ring-primary/30"
                  aria-label={`Foto ${idx + 1} öffnen`}
                  style={{ touchAction: "manipulation" }}
                >
                  <img
                    src={photo}
                    alt={`Demo Foto ${idx + 1}`}
                    className="pointer-events-none h-full w-full object-cover"
                    draggable={false}
                  />
                  <span className="pointer-events-none absolute bottom-0 left-0 rounded-tr-md bg-background/80 px-1 text-[8px] font-bold text-foreground">
                    {idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removePhoto(selectedSpot.id, idx);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow"
                    aria-label="Foto entfernen"
                    style={{ touchAction: "manipulation" }}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
              {/* Plus-Button: weiteres Foto hinzufügen (max 4 für Übersicht) */}
              {selectedSpot.photos.length < 3 && (
                <button
                  onClick={() => setPhotoDialogSpotId(selectedSpot.id)}
                  className={cn(
                    "flex h-16 w-16 flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-dashed text-primary transition-colors",
                    selectedSpot.photos.length === 0
                      ? "border-primary/40 bg-primary/5 hover:border-primary hover:bg-primary/10"
                      : "border-border hover:border-primary hover:bg-primary/5",
                  )}
                  aria-label="Foto hinzufügen"
                >
                  {selectedSpot.photos.length === 0 ? (
                    <>
                      <Camera className="h-5 w-5" />
                      <span className="text-[8px] font-medium">Foto</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-5 w-5" />
                      <span className="text-[8px] font-medium">Weiteres</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full ring-2 ring-background"
                  style={{ backgroundColor: LESION_CLASSIFICATIONS[selectedSpot.classification].color }}
                />
                <span className="truncate text-sm font-semibold text-foreground">
                  {LESION_CLASSIFICATIONS[selectedSpot.classification].label}
                </span>
              </div>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {selectedSpot.view === "front" ? "Vorderseite" : "Rückseite"} ·{" "}
                {selectedSpot.photos.length === 0
                  ? "Demo: Foto hinzufügen"
                  : `${selectedSpot.photos.length} Foto${selectedSpot.photos.length === 1 ? "" : "s"} angehängt ✓`}
              </p>
              {/* Vergleichen-Button erst ab 2 Fotos */}
              {selectedSpot.photos.length >= 2 && (
                <button
                  onClick={() => setCompareSpotId(selectedSpot.id)}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                >
                  <GitCompareArrows className="h-3 w-3" />
                  Verlauf vergleichen
                </button>
              )}
            </div>

            <button
              onClick={() => setSelectedId(null)}
              className="flex-shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Schließen"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Spots counter (when no spot selected) */}
      {spots.length > 0 && !selectedSpot && (
        <div className="relative z-20 mx-4 mb-4 flex items-center justify-between rounded-lg border border-border bg-card/90 px-3 py-2 shadow-sm backdrop-blur-md">
          <div>
            <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Markiert</div>
            <div className="text-sm font-bold text-foreground">
              {spots.length} {spots.length === 1 ? "Hautstelle" : "Hautstellen"}
              {spots.filter((s) => s.photos.length > 0).length > 0 && (
                <span className="ml-2 text-[10px] font-normal text-muted-foreground">
                  · {spots.reduce((sum, s) => sum + s.photos.length, 0)} Foto{spots.reduce((sum, s) => sum + s.photos.length, 0) === 1 ? "" : "s"}
                </span>
              )}
            </div>
          </div>
          <ImageIcon className="h-4 w-4 text-muted-foreground" />
        </div>
      )}

      {/* Hidden file inputs — getrennt für Kamera (capture) und Galerie/Datei */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileUpload}
        className="hidden"
      />

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
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-left text-sm transition-all hover:border-primary hover:bg-primary/5"
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

      {/* Photo upload dialog */}
      {photoDialogSpotId !== null && (
        <div
          className="absolute inset-0 z-30 flex items-center justify-center bg-background/40 backdrop-blur-sm"
          onClick={() => {
            if (qrLoading) return;
            setPhotoDialogSpotId(null);
            setQrSession(null);
            setQrError(null);
            stopPolling();
          }}
        >
          <div
            className="w-[90%] max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 text-sm font-semibold text-foreground">
              Foto hinzufügen
            </div>
            <p className="mb-4 text-xs text-muted-foreground">
              Demo-Modus — bis zu 4 Fotos pro Hautstelle für Verlaufs-Vergleich
            </p>

            {qrSession ? (
              // QR code shown — waiting for phone upload
              <div className="flex flex-col items-center gap-3 py-2">
                <div className="rounded-xl border-2 border-primary/20 bg-white p-3">
                  <QRCodeSVG value={qrSession.url} size={180} level="M" includeMargin={false} />
                </div>
                <div className="flex items-center gap-2 text-xs text-primary">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span className="font-medium">Warte auf Foto vom Handy…</span>
                </div>
                <div className="flex items-start gap-1.5 rounded-md bg-muted/50 px-2.5 py-2 text-left">
                  <Smartphone className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-[10px] text-muted-foreground leading-tight">
                    Scannen Sie den Code mit Ihrer Handy-Kamera. Das Foto erscheint live an der markierten Stelle.
                  </span>
                </div>
              </div>
            ) : qrLoading ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground">QR-Code wird erstellt…</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex flex-col items-center gap-2 rounded-xl border-2 border-border p-3 text-center transition-all hover:border-primary hover:bg-primary/5"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Camera className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-foreground">Kamera</div>
                    <div className="text-[10px] text-muted-foreground">Direkt aufnehmen</div>
                  </div>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-2 rounded-xl border-2 border-border p-3 text-center transition-all hover:border-primary hover:bg-primary/5"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <ImageIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-foreground">Galerie</div>
                    <div className="text-[10px] text-muted-foreground">Datei wählen</div>
                  </div>
                </button>

                <button
                  onClick={startQrUpload}
                  className="flex flex-col items-center gap-2 rounded-xl border-2 border-border p-3 text-center transition-all hover:border-primary hover:bg-primary/5"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <QrCode className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-foreground">QR-Code</div>
                    <div className="text-[10px] text-muted-foreground">Anderes Handy</div>
                  </div>
                </button>
              </div>
            )}

            {qrError && (
              <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 px-2.5 py-2 text-[10px] text-destructive text-center">
                {qrError}
              </div>
            )}

            {!qrSession && !qrLoading && (
              <div className="mt-3 flex items-center gap-1.5 rounded-md bg-muted/50 px-2.5 py-1.5">
                <Check className="h-3 w-3 text-primary" />
                <span className="text-[10px] text-muted-foreground">
                  Bild wird nach Übertragung sofort vom Server gelöscht
                </span>
              </div>
            )}

            {!qrLoading && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-3 w-full text-xs text-muted-foreground"
                onClick={() => {
                  setPhotoDialogSpotId(null);
                  setQrSession(null);
                  setQrError(null);
                  stopPolling();
                }}
              >
                {qrSession ? "Schließen" : "Abbrechen"}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Foto-Lightbox: Klick aufs Thumbnail zeigt Foto groß + Aktionen */}
      {lightboxSpotId !== null && (() => {
        const spot = spots.find((s) => s.id === lightboxSpotId);
        if (!spot || spot.photos.length === 0) return null;
        const safeIdx = Math.min(lightboxIdx, spot.photos.length - 1);
        const photo = spot.photos[safeIdx];
        const canCompare = spot.photos.length >= 2;

        return (
          <div
            className="absolute inset-0 z-40 flex items-center justify-center bg-background/80 backdrop-blur-sm p-3"
            onClick={() => setLightboxSpotId(null)}
          >
            <div
              className="w-full max-w-md rounded-2xl border border-border bg-card p-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="mb-3 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full ring-2 ring-background"
                      style={{ backgroundColor: LESION_CLASSIFICATIONS[spot.classification].color }}
                    />
                    <span className="truncate text-sm font-semibold text-foreground">
                      {LESION_CLASSIFICATIONS[spot.classification].label}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Foto {safeIdx + 1} von {spot.photos.length}
                  </p>
                </div>
                <button
                  onClick={() => setLightboxSpotId(null)}
                  className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Schließen"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Großes Foto */}
              <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-border bg-muted/20">
                <img src={photo} alt={`Foto ${safeIdx + 1}`} className="h-full w-full object-cover" />
                <DemoWatermark size="md" />
                <span className="absolute left-2 top-2 z-30 rounded-md bg-background/85 px-2 py-0.5 text-[11px] font-bold">
                  {safeIdx + 1} / {spot.photos.length}
                </span>
              </div>

              {/* Foto-Navigation (wenn mehrere) */}
              {spot.photos.length > 1 && (
                <div className="mt-2 flex items-center justify-center gap-1.5">
                  {spot.photos.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setLightboxIdx(i)}
                      className={cn(
                        "h-8 w-8 overflow-hidden rounded-md border-2 transition-all",
                        safeIdx === i ? "border-primary" : "border-transparent opacity-60 hover:opacity-100",
                      )}
                    >
                      <img src={spot.photos[i]} alt={`Vorschau ${i + 1}`} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Aktionen */}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setLightboxSpotId(null);
                    setPhotoDialogSpotId(spot.id);
                  }}
                  disabled={spot.photos.length >= 4}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-lg border-2 border-primary bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-all",
                    spot.photos.length >= 4
                      ? "cursor-not-allowed opacity-50"
                      : "hover:bg-primary/90",
                  )}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Weiteres Foto
                </button>
                <button
                  onClick={() => {
                    if (!canCompare) return;
                    setCompareIndices([safeIdx, safeIdx === 0 ? 1 : 0]);
                    setCompareMode("side");
                    setCompareSpotId(spot.id);
                  }}
                  disabled={!canCompare}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-lg border-2 border-border bg-card px-3 py-2 text-xs font-semibold text-foreground transition-all",
                    !canCompare
                      ? "cursor-not-allowed opacity-50"
                      : "hover:border-primary hover:bg-primary/5",
                  )}
                  title={canCompare ? "Verlauf vergleichen" : "Mindestens 2 Fotos nötig"}
                >
                  <GitCompareArrows className="h-3.5 w-3.5" />
                  Vergleichen
                </button>
              </div>

              {!canCompare && (
                <p className="mt-2 text-center text-[10px] text-muted-foreground">
                  Fügen Sie ein weiteres Foto hinzu, um den Verlauf zu vergleichen
                </p>
              )}
            </div>
          </div>
        );
      })()}

      {/* Foto-Vergleich Overlay (Side-by-Side / KI-Ausrichtung / Overlay-Slider) */}
      {compareSpotId !== null && (() => {
        const spot = spots.find((s) => s.id === compareSpotId);
        if (!spot || spot.photos.length < 2) return null;
        const [iA, iB] = compareIndices;
        const safeA = Math.min(iA, spot.photos.length - 1);
        const safeB = Math.min(iB, spot.photos.length - 1);
        const photoA = spot.photos[safeA];
        const photoB = spot.photos[safeB];

        return (
          <div
            className="absolute inset-0 z-40 flex items-center justify-center bg-background/70 backdrop-blur-sm p-3"
            onClick={() => setCompareSpotId(null)}
          >
            <div
              className="w-full max-w-md rounded-2xl border border-border bg-card p-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-foreground">Foto-Vergleich</div>
                  <p className="text-[10px] text-muted-foreground">
                    {LESION_CLASSIFICATIONS[spot.classification].label} · Demo
                  </p>
                </div>
                <button
                  onClick={() => setCompareSpotId(null)}
                  className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Schließen"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Mode toggle */}
              <div className="mb-3 flex items-center rounded-full border border-border bg-muted/40 p-0.5">
                <button
                  onClick={() => setCompareMode("side")}
                  className={cn(
                    "flex-1 rounded-full px-2 py-1 text-[11px] font-medium transition-all",
                    compareMode === "side"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground",
                  )}
                >
                  Nebeneinander
                </button>
                <button
                  onClick={() => {
                    setCompareMode("aligned");
                    setAligning(true);
                    window.setTimeout(() => setAligning(false), 1400);
                  }}
                  className={cn(
                    "flex-1 rounded-full px-2 py-1 text-[11px] font-medium transition-all",
                    compareMode === "aligned"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground",
                  )}
                >
                  KI-Ausrichtung
                </button>
                <button
                  onClick={() => setCompareMode("overlay")}
                  className={cn(
                    "flex-1 rounded-full px-2 py-1 text-[11px] font-medium transition-all",
                    compareMode === "overlay"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground",
                  )}
                >
                  Überlagern
                </button>
              </div>

              {/* Photo selectors (wenn >2 Fotos) */}
              {spot.photos.length > 2 && (
                <div className="mb-3 grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <div className="mb-1 font-medium text-muted-foreground">Foto A</div>
                    <div className="flex gap-1">
                      {spot.photos.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCompareIndices([i, safeB])}
                          className={cn(
                            "h-7 w-7 rounded-md border text-xs font-bold transition-colors",
                            safeA === i
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-muted/30 text-muted-foreground hover:border-primary/50",
                          )}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 font-medium text-muted-foreground">Foto B</div>
                    <div className="flex gap-1">
                      {spot.photos.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCompareIndices([safeA, i])}
                          className={cn(
                            "h-7 w-7 rounded-md border text-xs font-bold transition-colors",
                            safeB === i
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-muted/30 text-muted-foreground hover:border-primary/50",
                          )}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Compare view */}
              {compareMode === "side" && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative aspect-square overflow-hidden rounded-lg border border-border bg-muted/20">
                    <img src={photoA} alt="Foto A" className="h-full w-full object-cover" />
                    <DemoWatermark size="sm" />
                    <span className="absolute left-1.5 top-1.5 z-30 rounded-md bg-background/80 px-1.5 py-0.5 text-[10px] font-bold">
                      A · {safeA + 1}
                    </span>
                  </div>
                  <div className="relative aspect-square overflow-hidden rounded-lg border border-border bg-muted/20">
                    <img src={photoB} alt="Foto B" className="h-full w-full object-cover" />
                    <DemoWatermark size="sm" />
                    <span className="absolute left-1.5 top-1.5 z-30 rounded-md bg-background/80 px-1.5 py-0.5 text-[10px] font-bold">
                      B · {safeB + 1}
                    </span>
                  </div>
                </div>
              )}

              {compareMode === "aligned" && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative aspect-square overflow-hidden rounded-lg border border-border bg-muted/20">
                      <img src={photoA} alt="Foto A" className="h-full w-full object-cover" />
                      <DemoWatermark size="sm" />
                      <span className="absolute left-1.5 top-1.5 z-30 rounded-md bg-background/80 px-1.5 py-0.5 text-[10px] font-bold">
                        A · {safeA + 1}
                      </span>
                      {!aligning && (
                        <span className="absolute bottom-1.5 left-1.5 z-30 rounded-md bg-primary/90 px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">
                          Referenz
                        </span>
                      )}
                    </div>
                    <div className="relative aspect-square overflow-hidden rounded-lg border border-border bg-muted/20">
                      <img
                        src={photoB}
                        alt="Foto B (ausgerichtet)"
                        className={cn(
                          "h-full w-full object-cover transition-all duration-1000 ease-out",
                          aligning && "scale-110 rotate-3 blur-[1px]",
                        )}
                      />
                      <DemoWatermark size="sm" />
                      <span className="absolute left-1.5 top-1.5 z-30 rounded-md bg-background/80 px-1.5 py-0.5 text-[10px] font-bold">
                        B · {safeB + 1}
                      </span>
                      {aligning ? (
                        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-1.5 bg-background/40 backdrop-blur-[2px]">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          <span className="text-[10px] font-semibold text-foreground">
                            KI richtet aus…
                          </span>
                        </div>
                      ) : (
                        <span className="absolute bottom-1.5 left-1.5 z-30 rounded-md bg-primary/90 px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">
                          ✓ Ausgerichtet
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-center text-[10px] text-muted-foreground">
                    {aligning
                      ? "Demo: simulierte Ausrichtung — echte App nutzt OpenCV (Feature-Matching)"
                      : "Foto B wurde anhand markanter Strukturen auf Foto A ausgerichtet"}
                  </p>
                </div>
              )}

              {compareMode === "overlay" && (
                <div className="space-y-2">
                  <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-border bg-muted/20">
                    <img src={photoA} alt="Foto A" className="absolute inset-0 h-full w-full object-cover" />
                    <img
                      src={photoB}
                      alt="Foto B"
                      className="absolute inset-0 h-full w-full object-cover"
                      style={{ opacity: overlayOpacity / 100 }}
                    />
                    <DemoWatermark size="md" />
                    <span className="absolute left-1.5 top-1.5 z-30 rounded-md bg-background/80 px-1.5 py-0.5 text-[10px] font-bold">
                      A · {safeA + 1}
                    </span>
                    <span className="absolute right-1.5 top-1.5 z-30 rounded-md bg-background/80 px-1.5 py-0.5 text-[10px] font-bold">
                      B · {safeB + 1}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-[10px] font-medium text-muted-foreground">A</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={overlayOpacity}
                      onChange={(e) => setOverlayOpacity(Number(e.target.value))}
                      className="flex-1 accent-primary"
                    />
                    <span className="text-[10px] font-medium text-muted-foreground">B</span>
                  </div>
                </div>
              )}

              <p className="mt-3 text-center text-[10px] text-muted-foreground">
                In der echten App: präzise Bild-Ausrichtung (OpenCV) und zeitlicher Verlauf
              </p>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default LoginDemoBodyMap;
