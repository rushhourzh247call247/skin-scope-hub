import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Camera, CheckCircle, AlertTriangle, Loader2, X, ImageIcon, Images } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/dateUtils";
// ─── Types ───

interface UploadedPhoto {
  id?: number;
  file: File;
  preview: string;
  order: number;
  uploading: boolean;
  uploaded: boolean;
  deleting?: boolean;
  error?: string;
  created_at?: string;
  image_url?: string;
}

type SessionState =
  | { status: "loading" }
  | { status: "invalid"; message: string }
  | { status: "expired" }
  | { status: "completed"; imageCount: number }
  | {
      status: "active";
      patientName: string;
      locationName: string;
      locationId: number;
      expiresAt: string;
    };

// ─── Main Component ───

const MobileUpload = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [session, setSession] = useState<SessionState>({ status: "loading" });
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [completing, setCompleting] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const orderRef = useRef(0);

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setSession({ status: "invalid", message: t('mobileUpload.noToken') });
      return;
    }

    const validate = async () => {
      try {
        const result = await api.validateUploadSession(token);
        if (result.expired) {
          setSession({ status: "expired" });
          return;
        }
        if (!result.valid) {
          setSession({ status: "invalid", message: t('mobileUpload.invalidToken') });
          return;
        }
        if (result.completed) {
          setSession({ status: "completed", imageCount: result.image_count });
          return;
        }
        orderRef.current = result.image_count;
        setSession({
          status: "active",
          patientName: result.patient_name,
          locationName: result.location_name,
          locationId: result.location_id,
          expiresAt: result.expires_at,
        });
      } catch (err: any) {
        // If 410 Gone or similar, treat as expired
        if (err.message?.includes('abgelaufen') || err.message?.includes('expired')) {
          setSession({ status: "expired" });
        } else {
          setSession({
            status: "invalid",
            message: err.message || t('mobileUpload.invalidToken'),
          });
        }
      }
    };

    validate();
  }, [token]);

  const handleOpenCamera = useCallback(() => {
    cameraInputRef.current?.click();
  }, []);

  const handleOpenGallery = useCallback(() => {
    galleryInputRef.current?.click();
  }, []);

  const handleFiles = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!token || session.status !== "active") return;
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      for (const file of files) {
        orderRef.current += 1;
        const order = orderRef.current;
        const preview = URL.createObjectURL(file);

        const photo: UploadedPhoto = {
          file,
          preview,
          order,
          uploading: true,
          uploaded: false,
        };

        setPhotos((prev) => [...prev, photo]);

        try {
          const result = await api.uploadSessionImage(token, file, order);
          setPhotos((prev) =>
            prev.map((p) =>
              p.order === order
                ? {
                    ...p,
                    uploading: false,
                    uploaded: true,
                    id: result.id,
                    created_at: result.created_at,
                    image_url: result.image_url,
                  }
                : p
            )
          );
        } catch (err: any) {
          setPhotos((prev) =>
            prev.map((p) =>
              p.order === order
                ? { ...p, uploading: false, error: err.message || t('mobileUpload.uploadError') }
                : p
            )
          );
        }
      }

      e.target.value = "";
    },
    [token, session]
  );

  // Delete photo – calls backend DELETE if already uploaded
  const removePhoto = useCallback(async (order: number) => {
    const photo = photos.find((p) => p.order === order);
    if (!photo) return;

    // If uploaded to server, delete via API
    if (photo.uploaded && photo.id) {
      setPhotos((prev) =>
        prev.map((p) => (p.order === order ? { ...p, deleting: true } : p))
      );
      try {
        await api.deleteImage(photo.id);
      } catch {
        // Even if delete fails, remove from UI – server cleanup can happen later
      }
    }

    URL.revokeObjectURL(photo.preview);
    setPhotos((prev) => prev.filter((p) => p.order !== order));
  }, [photos]);

  const retryFailedUploads = useCallback(async () => {
    if (!token || session.status !== "active") return;
    const failed = photos.filter((p) => p.error);
    for (const photo of failed) {
      setPhotos((prev) =>
        prev.map((p) => (p.order === photo.order ? { ...p, uploading: true, error: undefined } : p))
      );
      try {
        const result = await api.uploadSessionImage(token, photo.file, photo.order);
        setPhotos((prev) =>
          prev.map((p) =>
            p.order === photo.order
              ? { ...p, uploading: false, uploaded: true, id: result.id, created_at: result.created_at, image_url: result.image_url }
              : p
          )
        );
      } catch (err: any) {
        setPhotos((prev) =>
          prev.map((p) =>
            p.order === photo.order
              ? { ...p, uploading: false, error: err.message || t('mobileUpload.uploadError') }
              : p
          )
        );
      }
    }
  }, [token, session, photos]);

  const handleComplete = async () => {
    if (!token) return;
    setCompleting(true);
    try {
      const result = await api.completeUploadSession(token);
      setSession({ status: "completed", imageCount: result.image_count });
    } catch {
      if (photos.filter((p) => p.uploaded).length > 0) {
        setSession({ status: "completed", imageCount: photos.filter((p) => p.uploaded).length });
      }
    } finally {
      setCompleting(false);
    }
  };

  const uploadedCount = photos.filter((p) => p.uploaded).length;
  const uploadingCount = photos.filter((p) => p.uploading).length;

  // ─── Render by status ───

  if (session.status === "loading") {
    return (
      <MobileShell>
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">{t('mobileUpload.checkingSession')}</p>
        </div>
      </MobileShell>
    );
  }

  if (session.status === "invalid") {
    return (
      <MobileShell>
        <StatusCard
          icon={<AlertTriangle className="h-8 w-8 text-destructive" />}
          title={t('mobileUpload.invalidLink')}
          description={session.message}
        />
      </MobileShell>
    );
  }

  if (session.status === "expired") {
    return (
      <MobileShell>
        <StatusCard
          icon={<AlertTriangle className="h-8 w-8 text-amber-500" />}
          title="Link abgelaufen"
          description="Dieser Upload-Link ist abgelaufen. Bitte generieren Sie einen neuen QR-Code am PC."
        />
      </MobileShell>
    );
  }

  if (session.status === "completed") {
    return (
      <MobileShell>
        <StatusCard
          icon={<CheckCircle className="h-8 w-8 text-green-600" />}
          title="Upload abgeschlossen"
          description={`${session.imageCount} ${session.imageCount === 1 ? "Foto wurde" : "Fotos wurden"} erfolgreich hochgeladen.`}
        />
      </MobileShell>
    );
  }

  // ─── Active Upload Session ───
  return (
    <MobileShell>
      {/* Session Info */}
      <SessionInfoCard session={session} />

      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFiles}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFiles}
      />

      {/* Capture Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          size="lg"
          className="h-14 text-sm gap-2 rounded-xl shadow-lg"
          onClick={handleOpenCamera}
          disabled={uploadingCount > 0}
        >
          {uploadingCount > 0 ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Camera className="h-5 w-5" /> Kamera
            </>
          )}
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="h-14 text-sm gap-2 rounded-xl shadow-lg"
          onClick={handleOpenGallery}
          disabled={uploadingCount > 0}
        >
          <Images className="h-5 w-5" /> Galerie
        </Button>
      </div>

      {/* Photos Grid */}
      {photos.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <ImageIcon className="h-3.5 w-3.5 text-primary" />
              {uploadedCount} von {photos.length} {photos.length === 1 ? "Foto" : "Fotos"} hochgeladen
            </h2>
          </div>

          {/* Show error summary if uploads failed */}
          {photos.some((p) => p.error) && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2">
              <p className="text-xs text-destructive font-medium">
                {photos.filter((p) => p.error).length} Upload(s) fehlgeschlagen
              </p>
              <p className="text-[10px] text-destructive/80">
                {photos.find((p) => p.error)?.error}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1.5 border-destructive/30 text-destructive"
                onClick={() => retryFailedUploads()}
              >
                <AlertTriangle className="h-3 w-3" /> Fehlgeschlagene erneut versuchen
              </Button>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo) => (
              <PhotoThumbnail
                key={photo.order}
                photo={photo}
                onRemove={removePhoto}
              />
            ))}
          </div>
        </div>
      )}

      {/* Complete Button – show when at least some photos uploaded */}
      {uploadedCount > 0 && (
        <Button
          variant="default"
          size="lg"
          className="w-full h-12 text-sm gap-2 rounded-xl bg-green-600 hover:bg-green-700 text-white"
          onClick={handleComplete}
          disabled={completing || uploadingCount > 0}
        >
          {completing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Wird abgeschlossen…
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4" /> Fertig – {uploadedCount}{" "}
              {uploadedCount === 1 ? "Foto" : "Fotos"} hochgeladen
            </>
          )}
        </Button>
      )}
    </MobileShell>
  );
};

// ─── Sub-Components ───

function MobileShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur-sm px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold">
            D
          </div>
          <span className="text-sm font-semibold text-foreground">Derm247</span>
          <span className="ml-auto text-[10px] text-muted-foreground">Foto-Upload</span>
        </div>
      </header>
      <main className="mx-auto max-w-md space-y-4 p-4">{children}</main>
    </div>
  );
}

function StatusCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border bg-card p-8 text-center shadow-sm">
      {icon}
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function SessionInfoCard({ session }: { session: Extract<SessionState, { status: "active" }> }) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-2 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
          <Camera className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-foreground">Foto-Upload</h1>
          <p className="text-[10px] text-muted-foreground">
            Gültig bis {formatDate(session.expiresAt, "HH:mm")} Uhr
          </p>
        </div>
      </div>
      <div className="flex gap-4 text-xs">
        <div>
          <span className="text-muted-foreground">Patient</span>
          <p className="font-medium text-foreground">{session.patientName}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Stelle</span>
          <p className="font-medium text-foreground">{session.locationName}</p>
        </div>
      </div>
    </div>
  );
}

function PhotoThumbnail({ photo, onRemove }: { photo: UploadedPhoto; onRemove: (order: number) => void }) {
  return (
    <div
      className={cn(
        "relative aspect-square overflow-hidden rounded-lg border",
        photo.error && "border-destructive/50",
        photo.uploading && "opacity-70",
        photo.deleting && "opacity-40"
      )}
    >
      <img
        src={photo.preview}
        alt={`Foto ${photo.order}`}
        className="h-full w-full object-cover"
      />

      {/* Upload spinner */}
      {photo.uploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      )}

      {/* Delete spinner */}
      {photo.deleting && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
          <Loader2 className="h-5 w-5 animate-spin text-destructive" />
        </div>
      )}

      {/* Success check */}
      {photo.uploaded && !photo.deleting && (
        <div className="absolute top-1 left-1">
          <CheckCircle className="h-4 w-4 text-green-500 drop-shadow" />
        </div>
      )}

      {/* Error */}
      {photo.error && (
        <div className="absolute top-1 left-1">
          <AlertTriangle className="h-4 w-4 text-destructive drop-shadow" />
        </div>
      )}

      {/* Order badge */}
      <div className="absolute bottom-1 left-1 rounded bg-background/80 px-1 py-0.5 text-[9px] font-mono font-medium text-foreground backdrop-blur-sm">
        #{photo.order}
      </div>

      {/* Delete button */}
      {!photo.uploading && !photo.deleting && (
        <button
          onClick={() => onRemove(photo.order)}
          className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive/90 text-destructive-foreground shadow"
        >
          <X className="h-3 w-3" />
        </button>
      )}

      {/* Timestamp */}
      {photo.created_at && (
        <div className="absolute bottom-1 right-1 rounded bg-background/80 px-1 py-0.5 text-[8px] text-muted-foreground backdrop-blur-sm">
          {formatDate(photo.created_at, "HH:mm:ss")}
        </div>
      )}
    </div>
  );
}

export default MobileUpload;
