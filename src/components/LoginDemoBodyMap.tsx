import { useState, useCallback, useRef, useEffect } from "react";
import BodyMap3D from "@/components/BodyMap3D";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LESION_CLASSIFICATIONS, type LesionClassification, type Gender } from "@/types/patient";
import { RotateCcw, Sparkles, MousePointerClick, Upload, QrCode, Camera, X, Image as ImageIcon, Check, Loader2, Smartphone } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { cn } from "@/lib/utils";

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
  photoDataUrl?: string;
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
  const [qrSession, setQrSession] = useState<{ token: string; url: string } | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [qrPolling, setQrPolling] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      window.clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setQrPolling(false);
  };

  const reset = () => {
    setSpots([]);
    setSelectedId(null);
    setPendingSpot(null);
    setPhotoDialogSpotId(null);
    setQrSession(null);
    setQrError(null);
    stopPolling();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !photoDialogSpotId) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setSpots((prev) =>
        prev.map((s) => (s.id === photoDialogSpotId ? { ...s, photoDataUrl: dataUrl } : s)),
      );
      setPhotoDialogSpotId(null);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const startQrUpload = async () => {
    if (!photoDialogSpotId) return;
    setQrLoading(true);
    setQrError(null);
    try {
      const res = await fetch(`${DEMO_API_BASE}/demo/qr-token`, { method: "POST" });
      if (!res.ok) {
        if (res.status === 429) throw new Error("Zu viele Anfragen — bitte später erneut versuchen.");
        throw new Error("Konnte keinen QR-Code erstellen.");
      }
      const data = await res.json();
      const url = `${FRONTEND_DEMO_DOMAIN}/demo-upload?token=${data.token}`;
      setQrSession({ token: data.token, url });
      setQrPolling(true);
    } catch (e: any) {
      setQrError(e?.message || "Fehler — Demo-Server nicht erreichbar.");
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

    const tick = async () => {
      try {
        const res = await fetch(`${DEMO_API_BASE}/demo/qr-status/${token}`);
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (data.status === "completed" && data.image_url) {
          try {
            const imgRes = await fetch(data.image_url);
            const blob = await imgRes.blob();
            const reader = new FileReader();
            reader.onload = (ev) => {
              if (cancelled) return;
              setSpots((prev) =>
                prev.map((s) =>
                  s.id === targetSpotId ? { ...s, photoDataUrl: ev.target?.result as string } : s,
                ),
              );
              setPhotoDialogSpotId(null);
              setQrSession(null);
              stopPolling();
            };
            reader.readAsDataURL(blob);
          } catch {
            setSpots((prev) =>
              prev.map((s) => (s.id === targetSpotId ? { ...s, photoDataUrl: data.image_url } : s)),
            );
            setPhotoDialogSpotId(null);
            setQrSession(null);
            stopPolling();
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

  const removePhoto = (spotId: number) => {
    setSpots((prev) => prev.map((s) => (s.id === spotId ? { ...s, photoDataUrl: undefined } : s)));
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
    imageCount: s.photoDataUrl ? 1 : 0,
    findingCount: 0,
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
          />
        </div>
      </div>

      {/* Selected spot card with photo */}
      {selectedSpot && (
        <div className="relative z-20 mx-4 mb-4 rounded-xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-3">
            {/* Photo or upload prompt */}
            {selectedSpot.photoDataUrl ? (
              <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-border">
                <img
                  src={selectedSpot.photoDataUrl}
                  alt="Demo Foto"
                  className="h-full w-full object-cover"
                />
                <button
                  onClick={() => removePhoto(selectedSpot.id)}
                  className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setPhotoDialogSpotId(selectedSpot.id)}
                className="flex h-16 w-16 flex-shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 text-primary transition-colors hover:border-primary hover:bg-primary/10"
              >
                <Camera className="h-5 w-5" />
                <span className="text-[8px] font-medium">Foto</span>
              </button>
            )}

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
                {selectedSpot.photoDataUrl ? "Foto angehängt ✓" : "Demo: Foto hinzufügen"}
              </p>
            </div>

            <button
              onClick={() => setSelectedId(null)}
              className="flex-shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
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
              {spots.filter((s) => s.photoDataUrl).length > 0 && (
                <span className="ml-2 text-[10px] font-normal text-muted-foreground">
                  · {spots.filter((s) => s.photoDataUrl).length} mit Foto
                </span>
              )}
            </div>
          </div>
          <ImageIcon className="h-4 w-4 text-muted-foreground" />
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
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
              Demo-Modus — nur 1 Foto pro Hautstelle
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
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-2 rounded-xl border-2 border-border p-4 text-center transition-all hover:border-primary hover:bg-primary/5"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Upload className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-foreground">Hochladen</div>
                    <div className="text-[10px] text-muted-foreground">Vom Computer</div>
                  </div>
                </button>

                <button
                  onClick={startQrUpload}
                  className="flex flex-col items-center gap-2 rounded-xl border-2 border-border p-4 text-center transition-all hover:border-primary hover:bg-primary/5"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <QrCode className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-foreground">QR-Upload</div>
                    <div className="text-[10px] text-muted-foreground">Per Smartphone</div>
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
                  Demo-Server löscht alle Bilder automatisch nach 24h
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
    </div>
  );
};

export default LoginDemoBodyMap;
