import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Camera, Loader2, RotateCcw, Check } from "lucide-react";
import { MobileHeader } from "../components/MobileHeader";
import { compressImage, takePhoto, type CapturedPhoto } from "../native/camera";
import { uploadClinicalPhoto, MobileApiError } from "../api";
import { successHaptic, tapHaptic } from "../native/haptics";

/**
 * ClinicalCaptureScreen – DermLite-artiger, möglichst klickarmer Flow:
 *   Öffnen → Kamera springt sofort auf → Foto → Vorschau → Speichern
 *
 * Nach Speichern: direkt weiter in den Marker-Editor.
 */
export function ClinicalCaptureScreen() {
  const { id } = useParams<{ id: string }>();
  const patientId = Number(id);
  const navigate = useNavigate();

  const [captured, setCaptured] = useState<CapturedPhoto | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Kamera direkt beim Öffnen starten – minimiert Klicks
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
      <MobileHeader onClick={() => navigate(-1)} title="Klinisches Foto" />

      <main className="flex-1 flex flex-col px-4 pb-32">
        {!captured && (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Kamera wird geöffnet…
          </div>
        )}

        {captured && (
          <div className="flex-1 flex items-center justify-center">
            <img
              src={captured.previewUrl}
              alt="Vorschau"
              className="max-h-[70dvh] w-full object-contain rounded-xl bg-black"
            />
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs">
            {error}
          </div>
        )}
      </main>

      <div
        className="fixed inset-x-0 bottom-0 px-4 pb-4 pt-3 bg-background/95 backdrop-blur border-t border-border"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1rem)" }}
      >
        <div className="flex gap-3">
          <button
            onClick={retake}
            disabled={uploading}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-secondary text-foreground py-4 disabled:opacity-50"
          >
            <RotateCcw className="h-5 w-5" />
            Erneut
          </button>
          <button
            onClick={save}
            disabled={!captured || uploading}
            className="flex-[2] inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground py-4 disabled:opacity-50 font-medium"
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Check className="h-5 w-5" />
            )}
            Speichern
          </button>
        </div>
        <p className="mt-2 text-center text-[10px] text-muted-foreground">
          <Camera className="inline h-3 w-3 mr-1" />
          Nach dem Speichern können Sie Marker auf dem Foto setzen.
        </p>
      </div>
    </>
  );
}
