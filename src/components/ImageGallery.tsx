import { useState, useRef, useCallback, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { LocationImage } from "@/types/patient";
import { Upload, Calendar, ImageIcon, GitCompareArrows, Trash2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/dateUtils";
import ImageCompare from "@/components/ImageCompare";
import AbcdeForm from "@/components/AbcdeForm";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ImageGalleryProps {
  locationId: number;
  patientId: number;
  images: LocationImage[];
  locationName?: string;
  locationType?: "spot" | "region";
  patientName?: string;
  patientBirthDate?: string;
}

const ImageGallery = ({ locationId, patientId, images, locationName, locationType = "spot", patientName, patientBirthDate }: ImageGalleryProps) => {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [noteValues, setNoteValues] = useState<Record<number, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const debounceTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  // Sync note values from API data whenever images prop changes
  useEffect(() => {
    const notes: Record<number, string> = {};
    images.forEach(img => {
      notes[img.id] = img.note ?? "";
    });
    setNoteValues(prev => {
      const merged = { ...notes };
      Object.keys(prev).forEach(key => {
        const id = Number(key);
        if (debounceTimers.current[id]) {
          merged[id] = prev[id];
        }
      });
      return merged;
    });
  }, [images]);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => api.uploadImage(locationId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["full-patient", patientId] });
      setUploading(false);
    },
    onError: () => setUploading(false),
  });

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    uploadMutation.mutate(file);
  };

  const deleteMutation = useMutation({
    mutationFn: (imageId: number) => api.deleteImage(imageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["full-patient", patientId] });
      toast.success("Bild wurde gelöscht");
      setDeleteTarget(null);
    },
    onError: () => {
      toast.error("Bild konnte nicht gelöscht werden");
      setDeleteTarget(null);
    },
  });

  const handleNoteChange = useCallback((imageId: number, value: string) => {
    setNoteValues(prev => ({ ...prev, [imageId]: value }));
    if (debounceTimers.current[imageId]) clearTimeout(debounceTimers.current[imageId]);
    debounceTimers.current[imageId] = setTimeout(async () => {
      delete debounceTimers.current[imageId];
      try {
        await api.updateImageNote(imageId, value);
        queryClient.invalidateQueries({ queryKey: ["full-patient", patientId] });
      } catch {
        toast.error("Notiz konnte nicht gespeichert werden");
      }
    }, 800);
  }, [patientId, queryClient]);

  const handleImageExport = useCallback((img: LocationImage) => {
    const imgEl = new Image();
    imgEl.crossOrigin = "anonymous";
    imgEl.onload = () => {
      const canvas = document.createElement("canvas");
      const barHeight = 64;
      canvas.width = imgEl.naturalWidth;
      canvas.height = imgEl.naturalHeight + barHeight;
      const ctx = canvas.getContext("2d")!;

      // Draw white bar at top
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, barHeight);

      // Draw separator line
      ctx.fillStyle = "#e2e8f0";
      ctx.fillRect(0, barHeight - 1, canvas.width, 1);

      // Text
      const fontSize = Math.max(14, Math.round(canvas.width / 40));
      ctx.fillStyle = "#1e293b";
      ctx.font = `bold ${fontSize}px sans-serif`;

      const nameText = patientName || "Patient";
      ctx.fillText(nameText, 12, fontSize + 8);

      ctx.font = `${fontSize * 0.85}px sans-serif`;
      ctx.fillStyle = "#64748b";
      const details: string[] = [];
      if (patientBirthDate) {
        try {
          details.push(`geb. ${formatDate(, "")}`);
        } catch { details.push(patientBirthDate); }
      }
      if (locationName) details.push(locationName);
      if (img.created_at) {
        try {
          details.push(formatDate(, ""));
        } catch {}
      }
      ctx.fillText(details.join("  •  "), 12, fontSize + 8 + fontSize * 1.1);

      // Draw image below bar
      ctx.drawImage(imgEl, 0, barHeight);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const safeName = (patientName || "patient").replace(/\s+/g, "_");
        const safeSpot = (locationName || "spot").replace(/\s+/g, "_");
        a.download = `${safeName}_${safeSpot}_${img.id}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1500);
        toast.success("Bild exportiert");
      }, "image/jpeg", 0.95);
    };
    imgEl.onerror = () => toast.error("Bild konnte nicht geladen werden");
    imgEl.src = api.resolveImageSrc(img);
  }, [patientName, patientBirthDate, locationName]);

  if (compareMode && images.length >= 2) {
    return (
      <ImageCompare
        images={images}
        locationName={locationName || `Stelle #${locationId}`}
        onClose={() => setCompareMode(false)}
      />
    );
  }

  const sorted = [...images].sort(
    (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground">Bilder ({images.length})</h4>
        <div className="flex items-center gap-2">
          {images.length >= 2 && (
            <Button size="sm" variant="outline" onClick={() => setCompareMode(true)}>
              <GitCompareArrows className="mr-1.5 h-3.5 w-3.5" /> Vergleichen
            </Button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            {uploading ? "Lädt hoch…" : "Bild hochladen"}
          </Button>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-10 text-muted-foreground">
          <ImageIcon className="mb-2 h-8 w-8" />
          <p className="text-sm">Noch keine Bilder vorhanden</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {sorted.map((img) => (
            <div key={img.id} className="relative space-y-2 rounded-lg border bg-card p-2">
              <div className="absolute right-2 top-2 z-10 flex gap-1">
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8 rounded-full shadow-md opacity-80 hover:opacity-100"
                  onClick={() => handleImageExport(img)}
                  title="Bild exportieren"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="destructive"
                  className="h-8 w-8 rounded-full shadow-md opacity-80 hover:opacity-100"
                  onClick={() => setDeleteTarget(img.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {locationType === "spot" ? (
                <div className="flex flex-col items-center gap-1.5">
                  <div className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-border shadow-sm">
                    <img
                      src={api.resolveImageSrc(img)}
                      alt={`Aufnahme #${img.id}`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {img.created_at ? formatDate(, "") : "–"}
                  </span>
                </div>
              ) : (
                <div>
                  <div className="aspect-[3/4] overflow-hidden rounded-md">
                    <img
                      src={api.resolveImageSrc(img)}
                      alt={`Aufnahme #${img.id}`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="flex items-center gap-1 px-1 py-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span className="tabular-nums">
                      {img.created_at ? formatDate(, "") : "–"}
                    </span>
                  </div>
                </div>
              )}

              {/* Note field */}
              <Textarea
                placeholder="Notiz zum Bild…"
                className="min-h-[36px] h-9 text-[11px] resize-none bg-muted/30 border-muted"
                value={noteValues[img.id] ?? ""}
                onChange={(e) => handleNoteChange(img.id, e.target.value)}
                rows={1}
              />

              {/* ABCDE Assessment */}
              <AbcdeForm
                imageId={img.id}
                patientId={patientId}
                initialData={{
                  abc_asymmetry: img.abc_asymmetry ?? undefined,
                  abc_border: img.abc_border ?? undefined,
                  abc_color: img.abc_color ?? undefined,
                  abc_diameter: img.abc_diameter ?? undefined,
                  abc_evolution: img.abc_evolution ?? undefined,
                  risk_score: img.risk_score ?? undefined,
                  risk_level: img.risk_level ?? undefined,
                }}
              />
            </div>
          ))}
        </div>
      )}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bild löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Dieses Bild wird unwiderruflich gelöscht. Möchten Sie fortfahren?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Löscht…" : "Löschen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ImageGallery;
