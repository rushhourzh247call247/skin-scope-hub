import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Camera, Loader2, AlertTriangle, GitCompareArrows, Clock } from "lucide-react";
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
      <MobileHeader
        onClick={() => navigate(-1)}
        title={lesion ? `Marker ${lesion.label}` : "Marker"}
      />

      <main className="flex-1 px-4 pb-32">
        {error && (
          <div className="mb-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!lesion && !error && (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Lade…
          </div>
        )}

        {lesion && (
          <>
            <div className="rounded-xl bg-secondary px-4 py-3 mb-4">
              <div className="text-sm">
                Erstellt am{" "}
                {new Date(lesion.created_at).toLocaleDateString("de-CH")}
              </div>
              {lesion.notes && (
                <div className="text-xs text-muted-foreground mt-1">
                  {lesion.notes}
                </div>
              )}
            </div>

            <LesionAssetGrid assets={assets} />

            {/* Reserve für Stufe 2 – Vergleich / Zeitstrahl */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => navigate(`/m/lesions/${id}/compare`)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-secondary/70 text-foreground py-3 text-xs"
              >
                <GitCompareArrows className="h-4 w-4" />
                Vergleich
              </button>
              <button
                onClick={() => navigate(`/m/lesions/${id}/timeline`)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-secondary/70 text-foreground py-3 text-xs"
              >
                <Clock className="h-4 w-4" />
                Verlauf
              </button>
            </div>
          </>
        )}
      </main>

      <div
        className="fixed inset-x-0 bottom-0 px-4 pb-4 pt-3 bg-background/95 backdrop-blur border-t border-border"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1rem)" }}
      >
        <button
          onClick={captureDermoscopy}
          disabled={uploading || !lesion}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground py-4 font-medium disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Camera className="h-5 w-5" />
          )}
          Dermatoskopie aufnehmen
        </button>
      </div>
    </>
  );
}
