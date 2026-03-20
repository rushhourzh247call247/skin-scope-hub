import { useState, useRef, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { LocationImage } from "@/types/patient";
import { Upload, Calendar, ImageIcon, GitCompareArrows, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import ImageCompare from "@/components/ImageCompare";
import AiAnalysisResult from "@/components/AiAnalysisResult";

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
  const [noteValues, setNoteValues] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    images.forEach(img => { if (img.note) initial[img.id] = img.note; });
    return initial;
  });
  const [analyzingIds, setAnalyzingIds] = useState<Set<number>>(new Set());
  const [aiResults, setAiResults] = useState<Record<number, LocationImage["ai_analysis"]>>(() => {
    const initial: Record<number, LocationImage["ai_analysis"]> = {};
    images.forEach(img => { if (img.ai_analysis) initial[img.id] = img.ai_analysis; });
    return initial;
  });
  const [expandedAi, setExpandedAi] = useState<Set<number>>(new Set());
  const debounceTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

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

  const handleNoteChange = useCallback((imageId: number, value: string) => {
    setNoteValues(prev => ({ ...prev, [imageId]: value }));
    if (debounceTimers.current[imageId]) clearTimeout(debounceTimers.current[imageId]);
    debounceTimers.current[imageId] = setTimeout(() => {
      api.updateImageNote(imageId, value).catch(() => {});
    }, 800);
  }, []);

  const handleAnalyze = useCallback(async (imageId: number) => {
    setAnalyzingIds(prev => new Set(prev).add(imageId));
    try {
      const result = await api.analyzeImage(imageId);
      setAiResults(prev => ({ ...prev, [imageId]: result }));
      setExpandedAi(prev => new Set(prev).add(imageId));
    } finally {
      setAnalyzingIds(prev => { const next = new Set(prev); next.delete(imageId); return next; });
    }
  }, []);

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
        <div className={locationType === "spot" ? "grid grid-cols-2 gap-4 sm:grid-cols-3" : "grid grid-cols-2 gap-4 sm:grid-cols-3"}>
          {sorted.map((img) => {
            const isAnalyzing = analyzingIds.has(img.id);
            const aiResult = aiResults[img.id] || img.ai_analysis;
            const isAiExpanded = expandedAi.has(img.id);

            return (
              <div key={img.id} className="space-y-2 rounded-lg border bg-card p-2">
                {locationType === "spot" ? (
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-border shadow-sm">
                      <img
                        src={api.getImageUrl(img.image_path)}
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
                  <div>
                    <div className="aspect-[3/4] overflow-hidden rounded-md">
                      <img
                        src={api.getImageUrl(img.image_path)}
                        alt={`Aufnahme #${img.id}`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="flex items-center gap-1 px-1 py-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span className="tabular-nums">
                        {img.created_at ? format(new Date(img.created_at), "dd.MM.yyyy", { locale: de }) : "–"}
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

                {/* KI button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-7 text-[10px] gap-1.5"
                  onClick={() => handleAnalyze(img.id)}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <><Loader2 className="h-3 w-3 animate-spin" /> Analysiert…</>
                  ) : (
                    <><Sparkles className="h-3 w-3" /> KI-Analyse</>
                  )}
                </Button>

                {/* AI Result */}
                {aiResult && (
                  <div>
                    {isAiExpanded ? (
                      <div onClick={() => setExpandedAi(prev => { const next = new Set(prev); next.delete(img.id); return next; })} className="cursor-pointer">
                        <AiAnalysisResult analysis={aiResult} />
                      </div>
                    ) : (
                      <button
                        onClick={() => setExpandedAi(prev => new Set(prev).add(img.id))}
                        className="w-full text-[9px] text-amber-600 hover:text-amber-700 font-medium flex items-center justify-center gap-1 py-1 rounded border border-amber-200 bg-amber-50/50"
                      >
                        <Sparkles className="h-2.5 w-2.5" /> KI-Ergebnis anzeigen
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ImageGallery;
