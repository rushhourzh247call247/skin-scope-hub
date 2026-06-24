import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Camera,
  Loader2,
  AlertTriangle,
  GitCompareArrows,
  Clock,
  CircleDot,
} from "lucide-react";
import { MobileHeader } from "../components/MobileHeader";
import { LesionAssetGrid } from "../components/LesionAssetGrid";
import {
  fetchLesion,
  MobileApiError,
  uploadLesionAsset,
} from "../api";
import { compressImage, takePhoto } from "../native/camera";
import { successHaptic, tapHaptic } from "../native/haptics";
import type { Lesion, LesionAsset } from "../types";

export function LesionDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lesion, setLesion] = useState<Lesion | null>(null);
  const [assets, setAssets] = useState<LesionAsset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    try {
      const { lesion, assets } = await fetchLesion(id!);
      setLesion(lesion);
      setAssets(assets);
    } catch (err) {
      setError(
        err instanceof MobileApiError
          ? err.notDeployed
            ? "Backend (/api/m) ist auf diesem Server noch nicht aktiviert."
            : err.message
          : "Marker konnte nicht geladen werden.",
      );
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const captureDermoscopy = async () => {
    tapHaptic();
    const photo = await takePhoto();
    if (!photo) return;
    setUploading(true);
    try {
      const blob = await compressImage(photo.file);
      const asset = await uploadLesionAsset(id!, blob, "dermoscopy");
      setAssets((prev) => [...prev, asset]);
      successHaptic();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload fehlgeschlagen.");
    } finally {
      URL.revokeObjectURL(photo.previewUrl);
      setUploading(false);
    }
  };

  return (
    <>
      <MobileHeader onClick={() => navigate(-1)} />

      <main className="flex-1 px-4 pb-32">
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-[20px] border border-destructive/40 bg-destructive/10 p-4 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!lesion && !error && (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Lade…
          </div>
        )}

        {lesion && (
          <>
            <section className="mb-4 flex items-center gap-3">
              <div className="inline-flex h-[56px] w-[56px] items-center justify-center rounded-[18px] bg-secondary text-foreground">
                <CircleDot className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1 rounded-[18px] bg-primary/20 px-4 py-3">
                <div className="truncate text-2xl font-semibold tracking-normal">Marker {lesion.label}</div>
                <div className="text-base text-muted-foreground">Verlauf und Dermatoskopie</div>
              </div>
            </section>

            <section className="rounded-[24px] bg-card p-4 shadow-sm">
              <div className="rounded-[18px] bg-secondary px-4 py-4">
                <div className="text-lg font-medium">
                  Erstellt am {new Date(lesion.created_at).toLocaleDateString("de-CH")}
                </div>
                {lesion.notes && (
                  <div className="mt-2 text-sm text-muted-foreground">{lesion.notes}</div>
                )}
              </div>

              <div className="mt-4">
                <LesionAssetGrid assets={assets} />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  onClick={() => navigate(`/m/lesions/${id}/compare`)}
                  className="inline-flex items-center justify-center gap-2 rounded-[18px] bg-secondary py-4 text-foreground"
                >
                  <GitCompareArrows className="h-5 w-5" />
                  <span className="text-base">Vergleich</span>
                </button>
                <button
                  onClick={() => navigate(`/m/lesions/${id}/timeline`)}
                  className="inline-flex items-center justify-center gap-2 rounded-[18px] bg-secondary py-4 text-foreground"
                >
                  <Clock className="h-5 w-5" />
                  <span className="text-base">Verlauf</span>
                </button>
              </div>
            </section>
          </>
        )}
      </main>

      <div
        className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 px-4 pb-4 pt-3 backdrop-blur"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1rem)" }}
      >
        <button
          onClick={captureDermoscopy}
          disabled={uploading || !lesion}
          className="w-full inline-flex items-center justify-center gap-2 rounded-[18px] bg-primary py-4 font-medium text-primary-foreground disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Camera className="h-5 w-5" />
          )}
          <span className="text-lg">Dermatoskopie aufnehmen</span>
        </button>
      </div>
    </>
  );
}