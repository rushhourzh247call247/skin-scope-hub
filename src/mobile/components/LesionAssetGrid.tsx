import type { LesionAsset } from "../types";
import { buildImageUrl } from "../api";

interface Props {
  assets: LesionAsset[];
  selectable?: boolean;
  selected?: number[];
  onToggle?: (id: number) => void;
  onOpen?: (asset: LesionAsset) => void;
}

export function LesionAssetGrid({
  assets,
  selectable = false,
  selected = [],
  onToggle,
  onOpen,
}: Props) {
  if (assets.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Noch keine Aufnahmen für diesen Marker.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {assets.map((a) => {
        const isImg = a.kind === "clinical" || a.kind === "dermoscopy";
        const isSelected = selected.includes(a.id);
        return (
          <button
            key={a.id}
            onClick={() => {
              if (selectable) onToggle?.(a.id);
              else onOpen?.(a);
            }}
            className={`relative aspect-square overflow-hidden rounded-[18px] bg-secondary text-left shadow-sm active:opacity-80 ${
              isSelected ? "ring-2 ring-primary" : ""
            }`}
          >
            {isImg && a.file_path ? (
              <img
                src={buildImageUrl(a.file_path)}
                alt={a.kind}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-xs uppercase tracking-wide text-muted-foreground">
                {a.kind}
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/95 via-background/35 to-transparent px-3 py-3 text-card-foreground">
              <div className="text-2xl font-semibold leading-none tracking-normal">
                {labelFor(a.kind)}
              </div>
              <div className="mt-2 text-base text-foreground/90">
                {new Date(a.taken_at).toLocaleDateString("de-CH")}
              </div>
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