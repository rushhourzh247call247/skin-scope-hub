import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Accessibility, Search, Loader2 } from "lucide-react";

interface Props {
  referenceSrc?: string | null;
  title?: string;
  subtitle?: string;
  onCancel: () => void;
  onCapture: (file: File) => void | Promise<void>;
}

/**
 * Fullscreen in-app camera with a ghost overlay of a reference photo
 * and a vertical opacity slider, used to re-photograph an existing
 * spot from the same angle. Falls back to the system file picker if
 * getUserMedia is unavailable / denied.
 */
export function CameraOverlayCapture({
  referenceSrc,
  title,
  subtitle,
  onCancel,
  onCapture,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [opacity, setOpacity] = useState(0.65);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1440 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setReady(true);
      } catch (e: any) {
        setError(e?.message || "Kamera nicht verfügbar");
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  const capture = async () => {
    if (busy) return;
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    setBusy(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = v.videoWidth;
      canvas.height = v.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas-Fehler");
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      const blob: Blob = await new Promise((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Encoding fehlgeschlagen"))),
          "image/jpeg",
          0.92,
        ),
      );
      const file = new File([blob], `lesion-${Date.now()}.jpg`, { type: "image/jpeg" });
      await onCapture(file);
    } catch (e: any) {
      setError(e?.message || "Aufnahme fehlgeschlagen");
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black text-white">
      {/* Live camera */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Reference overlay */}
      {referenceSrc && (
        <img
          src={referenceSrc}
          alt="Referenz"
          className="pointer-events-none absolute left-1/2 top-1/2 max-h-full max-w-full -translate-x-1/2 -translate-y-1/2 object-contain object-center"
          style={{ opacity }}
        />
      )}

      {/* Top bar */}
      <div className="absolute inset-x-0 top-0 flex items-center gap-3 px-4 pt-[max(env(safe-area-inset-top),12px)]">
        <button
          type="button"
          onClick={onCancel}
          aria-label="Zurück"
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-black/45 backdrop-blur"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-pink-400">♀</span>
          <div className="min-w-0">
            {title && <div className="truncate text-lg font-semibold leading-tight">{title}</div>}
            {subtitle && <div className="truncate text-xs text-white/80">{subtitle}</div>}
          </div>
        </div>
      </div>

      {/* Vertical opacity slider, left */}
      {referenceSrc && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2">
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={opacity}
            onChange={(e) => setOpacity(parseFloat(e.target.value))}
            aria-label="Overlay-Transparenz"
            className="vertical-range h-64 w-2 accent-white"
            style={{
              WebkitAppearance: "slider-vertical" as any,
              writingMode: "vertical-lr" as any,
            }}
          />
        </div>
      )}

      {/* Loading / error */}
      {!ready && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Kamera wird geöffnet…
        </div>
      )}
      {error && (
        <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 rounded-xl bg-black/70 p-4 text-center text-sm">
          {error}
          <div className="mt-3">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg bg-white px-4 py-2 text-black"
            >
              Schließen
            </button>
          </div>
        </div>
      )}

      {/* Bottom controls */}
      <div
        className="absolute inset-x-0 bottom-0 flex items-end justify-between px-6"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 20px)" }}
      >
        <div className="w-16" />
        <button
          type="button"
          onClick={capture}
          disabled={!ready || busy}
          aria-label="Auslösen"
          className="relative inline-flex h-20 w-20 items-center justify-center rounded-full border-4 border-white/90 bg-white/20 active:scale-95 disabled:opacity-60"
        >
          <span className="h-16 w-16 rounded-full bg-white" />
          {busy && (
            <Loader2 className="absolute h-6 w-6 animate-spin text-black" />
          )}
        </button>
        <div className="inline-flex items-center gap-2 rounded-full bg-black/45 px-3 py-2 backdrop-blur">
          <Accessibility className="h-5 w-5" />
          <Search className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
