import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Check,
  Loader2,
  Trash2,
  AlertTriangle,
  Accessibility,
  CircleDot,
  Trash,
  Expand,
} from "lucide-react";
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

  const handlePinPointerDown = (
    lesion: Lesion,
    e: React.PointerEvent<HTMLDivElement>,
  ) => {
    e.stopPropagation();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragId(lesion.id);
    longPressTimer.current = setTimeout(() => {
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
    const moved = lesions.find((l) => l.id === lesion.id);
    if (!moved) return;
    if (moved.x_pct === lesion.x_pct && moved.y_pct === lesion.y_pct) return;
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
      <MobileHeader onClick={() => navigate(-1)} />

      <main className="flex-1 px-4 pb-24">
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-[20px] border border-destructive/40 bg-destructive/10 p-4 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <section className="mb-4 flex items-center gap-3">
          <div className="inline-flex h-[56px] w-[56px] items-center justify-center rounded-[18px] bg-secondary text-foreground">
            <CircleDot className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1 rounded-[18px] bg-primary/20 px-4 py-3">
            <div className="truncate text-2xl font-semibold tracking-normal">Marker setzen</div>
            <div className="text-base text-muted-foreground">Tippen zum Anlegen, ziehen zum Verschieben</div>
          </div>
        </section>

        <section className="rounded-[24px] bg-card p-3 shadow-sm">
          <div
            ref={imgWrapRef}
            onClick={handlePhotoTap}
            className="relative aspect-[0.86] w-full overflow-hidden rounded-[22px] bg-secondary touch-none select-none"
          >
            {photoUrl ? (
              <img
                src={photoUrl}
                alt="Klinisches Foto"
                draggable={false}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            )}

            <div className="absolute left-4 top-4 text-card-foreground">
              <div className="text-2xl font-semibold tracking-normal">Klinisch {lesions.length}</div>
              <div className="mt-1 text-base text-card-foreground/85">Marker direkt auf dem Bild platzieren</div>
            </div>

            <div className="absolute bottom-4 left-4 inline-flex h-14 w-14 items-center justify-center rounded-[18px] bg-card/92 text-foreground shadow-sm">
              <Expand className="h-6 w-6" />
            </div>

            <div className="absolute bottom-4 right-4 flex flex-col gap-3">
              <button
                type="button"
                className="inline-flex h-14 w-14 items-center justify-center rounded-[18px] bg-card/92 text-foreground shadow-sm"
                aria-label="Körperansicht"
              >
                <Accessibility className="h-6 w-6" />
              </button>
              <button
                type="button"
                className="inline-flex h-14 w-14 items-center justify-center rounded-[18px] bg-card/92 text-foreground shadow-sm"
                aria-label="Zielhilfe"
              >
                <CircleDot className="h-6 w-6" />
              </button>
              <button
                type="button"
                className="inline-flex h-14 w-14 items-center justify-center rounded-[18px] bg-card/92 text-foreground shadow-sm"
                aria-label="Löschen"
              >
                <Trash className="h-6 w-6" />
              </button>
            </div>

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
                className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer"
              >
                <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-4 border-card bg-primary/20 shadow-[0_0_0_8px_hsl(var(--primary)/0.18)]">
                  <span className="rounded-xl bg-card px-3 py-1 text-xl font-semibold text-foreground shadow-sm">
                    {l.label}
                  </span>
                  <span className="absolute bottom-[-10px] h-0 w-0 border-l-[10px] border-r-[10px] border-t-[16px] border-l-transparent border-r-transparent border-t-primary" />
                </div>
              </div>
            ))}

            {busy && (
              <div className="absolute right-3 top-3 rounded-full bg-card/92 p-2 text-foreground shadow-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            )}
          </div>

          {lesions.length > 0 && (
            <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
              {lesions.map((l) => (
                <button
                  key={l.id}
                  onClick={() => navigate(`/m/lesions/${l.id}`)}
                  className="group relative h-28 min-w-[108px] overflow-hidden rounded-[18px] bg-secondary px-3 py-3 text-left shadow-sm"
                >
                  <div className="text-2xl font-semibold tracking-normal">{l.label}</div>
                  <div className="mt-1 text-sm text-muted-foreground">Öffnen</div>
                  <Trash2
                    className="absolute bottom-3 right-3 h-4 w-4 text-muted-foreground opacity-70 group-active:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      void promptDelete(l);
                    }}
                  />
                </button>
              ))}
            </div>
          )}
        </section>
      </main>

      <div
        className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 px-4 pb-4 pt-3 backdrop-blur"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1rem)" }}
      >
        <button
          onClick={() => {
            successHaptic();
            navigate(`/m/patients/${patientId}`);
          }}
          className="w-full inline-flex items-center justify-center gap-2 rounded-[18px] bg-secondary py-4 text-foreground active:opacity-80"
        >
          <Check className="h-5 w-5" />
          <span className="text-lg font-medium">Fertig</span>
        </button>
      </div>
    </>
  );
}