import type { LesionAsset } from "../types";
import { buildImageUrl } from "../api";

interface Props {
  assets: LesionAsset[];
  /** Stufe 2: Vergleichsmodus – zwei Bilder auswählbar. Heute deaktiviert. */
  selectable?: boolean;
  selected?: number[];
  onToggle?: (id: number) => void;
  onOpen?: (asset: LesionAsset) => void;
}

/**
 * LesionAssetGrid – kompakte Galerie aller Bilder/Befunde eines Markers.
 * Bewusst so gebaut, dass später ein Vergleichsmodus (A↔B) ohne Umbau
 * von LesionDetailScreen oder API hinzugefügt werden kann.
 */
export function LesionAssetGrid({
  assets,
  selectable = false,
  selected = [],
  onToggle,
  onOpen,
}: Props) {
  if (assets.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-12 text-sm">
        Noch keine Aufnahmen für diesen Marker.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {assets.map((a) => {
        const isImg =
          a.kind === "clinical" || a.kind === "dermoscopy";
        const isSelected = selected.includes(a.id);
        return (
          <button
            key={a.id}
            onClick={() => {
              if (selectable) onToggle?.(a.id);
              else onOpen?.(a);
            }}
            className={`relative aspect-square rounded-lg overflow-hidden bg-secondary text-left active:opacity-80 ${
              isSelected ? "ring-2 ring-primary" : ""
            }`}
          >
            {isImg && a.file_path ? (
              <img
                src={buildImageUrl(a.file_path)}
                alt={a.kind}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-[10px] uppercase tracking-wide text-muted-foreground">
                {a.kind}
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 px-1.5 py-1 bg-gradient-to-t from-black/70 to-transparent text-[10px] text-white">
              {new Date(a.taken_at).toLocaleDateString("de-CH")}
            </div>
            <div className="absolute top-1 right-1 text-[10px] bg-black/60 text-white rounded px-1">
              {labelFor(a.kind)}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function labelFor(kind: LesionAsset["kind"]) {
  switch (kind) {
    case "dermoscopy":
      return "Dermo";
    case "clinical":
      return "Klinisch";
    case "abcde":
      return "ABCDE";
    case "ai":
      return "KI";
    case "finding":
      return "Befund";
    default:
      return kind;
  }
}
