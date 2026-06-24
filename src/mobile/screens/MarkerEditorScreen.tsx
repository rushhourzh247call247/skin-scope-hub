import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Check, Loader2, Trash2, AlertTriangle } from "lucide-react";
import { MobileHeader } from "../components/MobileHeader";
import {
  buildImageUrl,
  createLesion,
  deleteLesion,
  fetchClinicalPhoto,
  MobileApiError,
  updateLesion,
} from "../api";
import type { Lesion } from "../types";
import { successHaptic, tapHaptic } from "../native/haptics";

/**
 * MarkerEditorScreen – das Herzstück.
 * Tap auf das Foto = neuer Marker (Label automatisch L1, L2, ...).
 * Drag auf einen Pin = Position ändern (ID bleibt!).
 * Long-Press = Marker löschen (Soft-Delete; Label-Nummer wird nicht wieder vergeben).
 */
export function MarkerEditorScreen() {
  const { patientId, photoId } = useParams<{
    patientId: string;
    photoId: string;
  }>();
  const navigate = useNavigate();
  const imgWrapRef = useRef<HTMLDivElement | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [lesions, setLesions] = useState<Lesion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { photo, lesions } = await fetchClinicalPhoto(Number(photoId));
        if (cancelled) return;
        setPhotoUrl(buildImageUrl(photo.file_path));
        setLesions(lesions);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof MobileApiError
            ? err.notDeployed
              ? "Backend (/api/m) ist auf diesem Server noch nicht aktiviert."
              : err.message
            : "Foto konnte nicht geladen werden.",
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [photoId]);

  // Foto-Tap = neuer Marker an dieser Position
  const handlePhotoTap = async (e: React.MouseEvent | React.TouchEvent) => {
    if (busy || dragId) return;
    const rect = imgWrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const point =
      "touches" in e
        ? e.changedTouches[0] ?? e.touches[0]
        : (e as React.MouseEvent);
    const x = (point.clientX - rect.left) / rect.width;
    const y = (point.clientY - rect.top) / rect.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    setBusy(true);
    try {
      const created = await createLesion(Number(photoId), x, y);
      tapHaptic();
      setLesions((prev) => [...prev, created]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Konnte Marker nicht setzen.");
    } finally {
      setBusy(false);
    }
  };

  // Drag-Logik via Pointer Events – funktioniert Touch und Maus gleich
  const handlePinPointerDown = (
    lesion: Lesion,
    e: React.PointerEvent<HTMLDivElement>,
  ) => {
    e.stopPropagation();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragId(lesion.id);
    longPressTimer.current = setTimeout(() => {
      // Long-Press = Löschen (Soft-Delete im Backend)
      void promptDelete(lesion);
    }, 700);
  };

  const handlePinPointerMove = (
    lesion: Lesion,
    e: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (dragId !== lesion.id) return;
    const rect = imgWrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    setLesions((prev) =>
      prev.map((l) =>
        l.id === lesion.id ? { ...l, x_pct: x, y_pct: y } : l,
      ),
    );
  };

  const handlePinPointerUp = async (
    lesion: Lesion,
    _e: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setDragId(null);
    // Position persistieren – ID bleibt erhalten
    const moved = lesions.find((l) => l.id === lesion.id);
    if (!moved) return;
    if (
      moved.x_pct === lesion.x_pct &&
      moved.y_pct === lesion.y_pct
    )
      return;
    try {
      await updateLesion(lesion.id, {
        x_pct: moved.x_pct,
        y_pct: moved.y_pct,
      });
      tapHaptic();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verschieben fehlgeschlagen.");
    }
  };

  const promptDelete = async (lesion: Lesion) => {
    if (!window.confirm(`Marker ${lesion.label} löschen?`)) return;
    try {
      await deleteLesion(lesion.id);
      setLesions((prev) => prev.filter((l) => l.id !== lesion.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Löschen fehlgeschlagen.");
    }
  };

  return (
    <>
      <MobileHeader
        onClick={() => navigate(-1)}
        title="Marker setzen"
        right={
          <button
            onClick={() => {
              successHaptic();
              navigate(`/m/patients/${patientId}`);
            }}
            className="inline-flex items-center gap-1 text-sm text-primary"
          >
            <Check className="h-4 w-4" /> Fertig
          </button>
        }
      />

      <main className="flex-1 flex flex-col px-4 pb-6">
        {error && (
          <div className="mb-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="text-xs text-muted-foreground mb-2 text-center">
          Tippen = Marker setzen · Ziehen = verschieben · Lange drücken = löschen
        </div>

        <div
          ref={imgWrapRef}
          onClick={handlePhotoTap}
          className="relative w-full max-h-[70dvh] aspect-square sm:aspect-auto bg-black rounded-xl overflow-hidden touch-none select-none"
        >
          {photoUrl ? (
            <img
              src={photoUrl}
              alt="Klinisches Foto"
              draggable={false}
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}

          {lesions.map((l) => (
            <div
              key={l.id}
              onPointerDown={(e) => handlePinPointerDown(l, e)}
              onPointerMove={(e) => handlePinPointerMove(l, e)}
              onPointerUp={(e) => handlePinPointerUp(l, e)}
              onClick={(e) => {
                e.stopPropagation();
                if (dragId) return;
                navigate(`/m/lesions/${l.id}`);
              }}
              style={{
                left: `${l.x_pct * 100}%`,
                top: `${l.y_pct * 100}%`,
              }}
              className="absolute -translate-x-1/2 -translate-y-full flex flex-col items-center cursor-pointer"
            >
              <div className="px-2 py-0.5 rounded-md bg-white/95 text-black text-xs font-semibold shadow-md">
                {l.label}
              </div>
              <div className="w-3 h-3 rounded-full bg-white/95 border-2 border-primary -mt-0.5 shadow-md" />
            </div>
          ))}

          {busy && (
            <div className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-2">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          )}
        </div>

        {lesions.length > 0 && (
          <div className="mt-3 text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
            {lesions.map((l) => (
              <button
                key={l.id}
                onClick={() => navigate(`/m/lesions/${l.id}`)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-secondary"
              >
                <span className="font-medium text-foreground">{l.label}</span>
                <Trash2
                  className="h-3.5 w-3.5 opacity-60"
                  onClick={(e) => {
                    e.stopPropagation();
                    void promptDelete(l);
                  }}
                />
              </button>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
