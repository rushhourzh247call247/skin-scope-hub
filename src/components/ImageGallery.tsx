import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { mockApi } from "@/lib/mockData";
import type { LocationImage } from "@/types/patient";
import { Upload, Calendar, ImageIcon, GitCompareArrows } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import ImageCompare from "@/components/ImageCompare";

interface ImageGalleryProps {
  locationId: number;
  patientId: number;
  images: LocationImage[];
  locationName?: string;
  locationType?: "spot" | "region";
}

const ImageGallery = ({ locationId, patientId, images, locationName, locationType = "spot" }: ImageGalleryProps) => {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [compareMode, setCompareMode] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => mockApi.uploadImage(locationId, file),
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
        <div className={locationType === "spot" ? "grid grid-cols-3 gap-3 sm:grid-cols-4" : "grid grid-cols-2 gap-3 sm:grid-cols-3"}>
          {sorted.map((img) => (
            <div key={img.id} className="group relative overflow-hidden bg-card">
              {locationType === "spot" ? (
                /* Circular display for spots */
                <div className="flex flex-col items-center gap-1.5">
                  <div className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-border shadow-sm">
                    <img
                      src={mockApi.getImageUrl(img.image_path)}
                      alt={`Aufnahme #${img.id}`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {img.created_at ? format(new Date(img.created_at), "dd.MM.yy", { locale: de }) : "–"}
                  </span>
                </div>
              ) : (
                /* Portrait display for regions */
                <div className="rounded-md border">
                  <div className="aspect-[3/4]">
                    <img
                      src={mockApi.getImageUrl(img.image_path)}
                      alt={`Aufnahme #${img.id}`}
                      className="h-full w-full object-cover rounded-t-md"
                      loading="lazy"
                    />
                  </div>
                  <div className="flex items-center gap-1 border-t px-2 py-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span className="tabular-nums">
                      {img.created_at ? format(new Date(img.created_at), "dd.MM.yyyy", { locale: de }) : "–"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageGallery;
