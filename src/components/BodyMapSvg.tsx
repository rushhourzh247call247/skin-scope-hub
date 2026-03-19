import { useState } from "react";
import { cn } from "@/lib/utils";

type View = "front" | "back";

const BodyMapSvg = ({
  markers,
  onMapClick,
  selectedLocationId,
}: {
  markers: { id: number; x: number; y: number; name?: string; view?: string }[];
  onMapClick: (x: number, y: number, view: View) => void;
  selectedLocationId?: number | null;
}) => {
  const [view, setView] = useState<View>("front");

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onMapClick(Math.round(x * 10) / 10, Math.round(y * 10) / 10, view);
  };

  const filteredMarkers = markers.filter(m => (m.view || "front") === view);

  return (
    <div className="space-y-3">
      {/* View Toggle */}
      <div className="flex items-center justify-center gap-1 rounded-lg bg-muted p-1">
        <button
          onClick={() => setView("front")}
          className={cn(
            "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
            view === "front"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Vorne
        </button>
        <button
          onClick={() => setView("back")}
          className={cn(
            "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
            view === "back"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Hinten
        </button>
      </div>

      <div className="relative w-full max-w-[240px] mx-auto">
        <svg
          viewBox="0 0 200 500"
          className="w-full cursor-crosshair"
          onClick={handleClick}
        >
          {/* Background */}
          <rect width="200" height="500" fill="transparent" />

          {view === "front" ? (
            /* FRONT VIEW */
            <g>
              {/* Head */}
              <ellipse cx="100" cy="38" rx="24" ry="28" className="fill-secondary stroke-border" strokeWidth="1" />
              {/* Eyes hint */}
              <circle cx="90" cy="34" r="2" className="fill-border" />
              <circle cx="110" cy="34" r="2" className="fill-border" />
              {/* Neck */}
              <rect x="91" y="64" width="18" height="14" rx="4" className="fill-secondary stroke-border" strokeWidth="1" />
              {/* Torso */}
              <path d="M62 78 Q62 76 68 76 L132 76 Q138 76 138 78 L143 195 Q143 218 128 218 L72 218 Q57 218 57 195 Z" className="fill-secondary stroke-border" strokeWidth="1" />
              {/* Chest lines */}
              <path d="M82 100 Q100 115 118 100" className="stroke-border fill-none" strokeWidth="0.5" />
              {/* Left arm */}
              <path d="M62 78 Q48 80 38 95 L22 155 Q18 168 22 172 L30 168 Q34 162 38 150 L54 100" className="fill-secondary stroke-border" strokeWidth="1" />
              {/* Left hand */}
              <ellipse cx="22" cy="175" rx="8" ry="10" className="fill-secondary stroke-border" strokeWidth="1" />
              {/* Right arm */}
              <path d="M138 78 Q152 80 162 95 L178 155 Q182 168 178 172 L170 168 Q166 162 162 150 L146 100" className="fill-secondary stroke-border" strokeWidth="1" />
              {/* Right hand */}
              <ellipse cx="178" cy="175" rx="8" ry="10" className="fill-secondary stroke-border" strokeWidth="1" />
              {/* Left leg */}
              <path d="M72 218 L68 310 Q66 330 63 350 L58 435 Q57 448 66 450 L76 450 Q82 448 80 435 L86 330 L91 218" className="fill-secondary stroke-border" strokeWidth="1" />
              {/* Left foot */}
              <ellipse cx="67" cy="454" rx="12" ry="6" className="fill-secondary stroke-border" strokeWidth="1" />
              {/* Right leg */}
              <path d="M109 218 L114 330 L120 435 Q122 448 124 450 L134 450 Q143 448 142 435 L137 350 Q134 330 132 310 L128 218" className="fill-secondary stroke-border" strokeWidth="1" />
              {/* Right foot */}
              <ellipse cx="133" cy="454" rx="12" ry="6" className="fill-secondary stroke-border" strokeWidth="1" />
              {/* Navel */}
              <circle cx="100" cy="175" r="2.5" className="fill-border" />
            </g>
          ) : (
            /* BACK VIEW */
            <g>
              {/* Head */}
              <ellipse cx="100" cy="38" rx="24" ry="28" className="fill-secondary stroke-border" strokeWidth="1" />
              {/* Hair hint */}
              <path d="M78 28 Q80 15 100 12 Q120 15 122 28" className="stroke-border fill-none" strokeWidth="1" />
              {/* Neck */}
              <rect x="91" y="64" width="18" height="14" rx="4" className="fill-secondary stroke-border" strokeWidth="1" />
              {/* Torso */}
              <path d="M62 78 Q62 76 68 76 L132 76 Q138 76 138 78 L143 195 Q143 218 128 218 L72 218 Q57 218 57 195 Z" className="fill-secondary stroke-border" strokeWidth="1" />
              {/* Spine */}
              <line x1="100" y1="78" x2="100" y2="210" className="stroke-border" strokeWidth="0.8" strokeDasharray="4 3" />
              {/* Shoulder blades */}
              <path d="M75 95 Q85 105 80 120" className="stroke-border fill-none" strokeWidth="0.5" />
              <path d="M125 95 Q115 105 120 120" className="stroke-border fill-none" strokeWidth="0.5" />
              {/* Left arm */}
              <path d="M62 78 Q48 80 38 95 L22 155 Q18 168 22 172 L30 168 Q34 162 38 150 L54 100" className="fill-secondary stroke-border" strokeWidth="1" />
              <ellipse cx="22" cy="175" rx="8" ry="10" className="fill-secondary stroke-border" strokeWidth="1" />
              {/* Right arm */}
              <path d="M138 78 Q152 80 162 95 L178 155 Q182 168 178 172 L170 168 Q166 162 162 150 L146 100" className="fill-secondary stroke-border" strokeWidth="1" />
              <ellipse cx="178" cy="175" rx="8" ry="10" className="fill-secondary stroke-border" strokeWidth="1" />
              {/* Left leg */}
              <path d="M72 218 L68 310 Q66 330 63 350 L58 435 Q57 448 66 450 L76 450 Q82 448 80 435 L86 330 L91 218" className="fill-secondary stroke-border" strokeWidth="1" />
              <ellipse cx="67" cy="454" rx="12" ry="6" className="fill-secondary stroke-border" strokeWidth="1" />
              {/* Right leg */}
              <path d="M109 218 L114 330 L120 435 Q122 448 124 450 L134 450 Q143 448 142 435 L137 350 Q134 330 132 310 L128 218" className="fill-secondary stroke-border" strokeWidth="1" />
              <ellipse cx="133" cy="454" rx="12" ry="6" className="fill-secondary stroke-border" strokeWidth="1" />
              {/* Buttock line */}
              <path d="M82 210 Q100 225 118 210" className="stroke-border fill-none" strokeWidth="0.5" />
            </g>
          )}

          {/* Markers */}
          {filteredMarkers.map((marker) => {
            const cx = (marker.x / 100) * 200;
            const cy = (marker.y / 100) * 500;
            const isSelected = marker.id === selectedLocationId;
            return (
              <g key={marker.id}>
                {isSelected && (
                  <circle cx={cx} cy={cy} r="14" className="fill-primary/20 animate-pulse-marker" />
                )}
                <circle
                  cx={cx} cy={cy} r="7"
                  className={isSelected ? "fill-primary stroke-primary-foreground" : "fill-none stroke-primary"}
                  strokeWidth="2"
                />
                <circle cx={cx} cy={cy} r="3" className={isSelected ? "fill-primary-foreground" : "fill-primary"} />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

export default BodyMapSvg;
