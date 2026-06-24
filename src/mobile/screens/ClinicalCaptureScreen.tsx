import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, RotateCcw, Check, Camera, Accessibility, Search } from "lucide-react";
import { MobileHeader } from "../components/MobileHeader";
import { compressImage, takePhoto, type CapturedPhoto } from "../native/camera";
import { uploadClinicalPhoto, MobileApiError } from "../api";
import { successHaptic, tapHaptic } from "../native/haptics";

/**
 * Bildfokussierter Capture-Flow in DermLite-Anmutung.
 */
export function ClinicalCaptureScreen() {
  const { id } = useParams<{ id: string }>();
  const patientId = Number(id);
  const navigate = useNavigate();

  const [captured, setCaptured] = useState<CapturedPhoto | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const photo = await takePhoto();
      if (cancelled) return;
      if (!photo) {
        navigate(-1);
        return;
      }
      setCaptured(photo);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const retake = async () => {
    tapHaptic();
    if (captured) URL.revokeObjectURL(captured.previewUrl);
    setCaptured(null);
    const photo = await takePhoto();
    if (!photo) {
      navigate(-1);
      return;
    }
    setCaptured(photo);
  };

  const save = async () => {
    if (!captured || uploading) return;
    setUploading(true);
    setError(null);
    try {
      const blob = await compressImage(captured.file);
      const photo = await uploadClinicalPhoto(patientId, blob);
      successHaptic();
      URL.revokeObjectURL(captured.previewUrl);
      navigate(`/m/patients/${patientId}/clinical/${photo.id}?fresh=1`, {
        replace: true,
      });
    } catch (err) {
      const msg =
        err instanceof MobileApiError
          ? err.notDeployed
            ? "Backend (/api/m) auf diesem Server noch nicht aktiviert."
            : err.message
          : "Upload fehlgeschlagen.";
      setError(msg);
      setUploading(false);
    }
  };

  return (
    <>
      <MobileHeader onClick={() => navigate(-1)} />

      <main className="flex-1 px-4 pb-32">
        {!captured && (
          <div className="flex min-h-[60dvh] items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Kamera wird geöffnet…
          </div>
        )}

        {captured && (
          <>
            <section className="mb-4 flex items-center gap-3 rounded-[20px] bg-background px-0 py-0">
              <div className="inline-flex h-[56px] w-[56px] items-center justify-center rounded-[18px] bg-secondary text-foreground">
                <Camera className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1 rounded-[18px] bg-primary/20 px-4 py-3">
                <div className="truncate text-xl font-semibold tracking-normal">Neues klinisches Foto</div>
                <div className="text-base text-muted-foreground">Voransicht prüfen und speichern</div>
              </div>
            </section>

            <section className="rounded-[24px] bg-card p-3 shadow-sm">
              <div className="relative overflow-hidden rounded-[22px] bg-secondary">
                <img
                  src={captured.previewUrl}
                  alt="Vorschau"
                  className="h-[58dvh] w-full object-cover"
                />

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
                    aria-label="Zoom"
                  >
                    <Search className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-3">
                <div className="relative h-28 w-24 overflow-hidden rounded-[18px] bg-secondary shadow-sm">
                  <img
                    src={captured.previewUrl}
                    alt="Thumbnail"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute right-2 top-2 inline-flex items-center justify-center rounded-full bg-card px-1.5 py-0.5 text-xs font-semibold text-foreground shadow-sm">
                    1
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  Dieses Bild wird nach dem Speichern direkt für Marker und Verlauf verwendet.
                </div>
              </div>
            </section>
          </>
        )}

        {error && (
          <div className="mt-4 rounded-[20px] border border-destructive/40 bg-destructive/10 p-4 text-sm">
            {error}
          </div>
        )}
      </main>

      <div
        className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 px-4 pb-4 pt-3 backdrop-blur"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1rem)" }}
      >
        <div className="flex gap-3">
          <button
            onClick={retake}
            disabled={uploading}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-[18px] bg-secondary py-4 text-foreground disabled:opacity-50"
          >
            <RotateCcw className="h-5 w-5" />
            <span className="text-lg">Erneut</span>
          </button>
          <button
            onClick={save}
            disabled={!captured || uploading}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-[18px] bg-primary py-4 font-medium text-primary-foreground disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Check className="h-5 w-5" />
            )}
            <span className="text-lg">Speichern</span>
          </button>
        </div>
      </div>
    </>
  );
}