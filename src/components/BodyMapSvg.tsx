import { useState } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw } from "lucide-react";

type View = "front" | "back";
type BodyRegion = "full" | "head" | "torso" | "legs" | "hands";

interface RegionViewBox {
  viewBox: string;
  label: string;
}

const REGION_VIEWS: Record<BodyRegion, RegionViewBox> = {
  full:  { viewBox: "0 0 200 500", label: "Ganzkörper" },
  head:  { viewBox: "50 0 100 120", label: "Kopf & Hals" },
  torso: { viewBox: "30 65 140 170", label: "Oberkörper" },
  legs:  { viewBox: "30 200 140 280", label: "Beine & Füsse" },
  hands: { viewBox: "0 60 200 140", label: "Arme & Hände" },
};

const RegionIcon = ({ region, active, onClick }: { region: BodyRegion; active: boolean; onClick: () => void }) => {
  const iconMap: Record<BodyRegion, React.ReactNode> = {
    full: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M12 2a3 3 0 100 6 3 3 0 000-6zM9 9.5C7.3 9.5 6 10.8 6 12.5v4c0 .3.2.5.5.5H8v5.5c0 .8.7 1.5 1.5 1.5h5c.8 0 1.5-.7 1.5-1.5V17h1.5c.3 0 .5-.2.5-.5v-4c0-1.7-1.3-3-3-3H9z"/>
      </svg>
    ),
    head: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M12 2C9.2 2 7 4.2 7 7v2c0 2.8 2.2 5 5 5s5-2.2 5-5V7c0-2.8-2.2-5-5-5zM9 16c-1.7 0-3 1.3-3 3v1h12v-1c0-1.7-1.3-3-3-3H9z"/>
      </svg>
    ),
    torso: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M8 2h8c1.1 0 2 .9 2 2v14c0 1.1-.9 2-2 2H8c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2zm4 3a1.5 1.5 0 100 3 1.5 1.5 0 000-3z"/>
      </svg>
    ),
    legs: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M8 2h3v12l-2 8H7l1-8V2zm5 0h3v4l1 8h-2l-2-8V2zm-4 20h2v2H9v-2zm5 0h2v2h-2v-2z"/>
      </svg>
    ),
    hands: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M18 9V5a1 1 0 00-2 0v4h-1V3a1 1 0 00-2 0v6h-1V4a1 1 0 00-2 0v5h-1V6a1 1 0 00-2 0v8c0 .6-.4 1-1 1a1 1 0 01-1-1V9L4 12v5l3 5h10l2-7V9a1 1 0 00-1-1z"/>
      </svg>
    ),
  };

  return (
    <button
      onClick={onClick}
      title={REGION_VIEWS[region].label}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200",
        active
          ? "bg-primary text-primary-foreground shadow-md scale-110"
          : "bg-card text-muted-foreground hover:bg-primary/10 hover:text-primary border border-border"
      )}
    >
      {iconMap[region]}
    </button>
  );
};

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
  const [region, setRegion] = useState<BodyRegion>("full");

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 200;
    const y = ((e.clientY - rect.top) / rect.height) * 500;
    // Convert back to percentage
    const xPct = (x / 200) * 100;
    const yPct = (y / 500) * 100;
    onMapClick(Math.round(xPct * 10) / 10, Math.round(yPct * 10) / 10, view);
  };

  // For zoomed regions, we need to calculate click coords based on the viewBox
  const handleZoomedClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const vb = REGION_VIEWS[region].viewBox.split(" ").map(Number);
    const [vbX, vbY, vbW, vbH] = vb;
    
    const relX = (e.clientX - rect.left) / rect.width;
    const relY = (e.clientY - rect.top) / rect.height;
    
    const svgX = vbX + relX * vbW;
    const svgY = vbY + relY * vbH;
    
    const xPct = (svgX / 200) * 100;
    const yPct = (svgY / 500) * 100;
    onMapClick(Math.round(xPct * 10) / 10, Math.round(yPct * 10) / 10, view);
  };

  const filteredMarkers = markers.filter(m => (m.view || "front") === view);
  const currentViewBox = REGION_VIEWS[region].viewBox;

  const bodyParts = view === "front" ? <FrontBody /> : <BackBody />;

  return (
    <div className="flex gap-3">
      {/* Region selector - vertical icon bar */}
      <div className="flex flex-col items-center gap-2 pt-2">
        {/* Rotate button */}
        <button
          onClick={() => setView(v => v === "front" ? "back" : "front")}
          title={view === "front" ? "Zur Rückseite" : "Zur Vorderseite"}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-card text-primary border border-border hover:bg-primary/10 transition-all duration-200"
        >
          <RotateCcw className="h-5 w-5" />
        </button>

        <div className="h-px w-6 bg-border my-1" />

        {(["head", "torso", "hands", "legs", "full"] as BodyRegion[]).map((r) => (
          <RegionIcon key={r} region={r} active={region === r} onClick={() => setRegion(r)} />
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 space-y-2">
        {/* View label */}
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {view === "front" ? "Vorderseite" : "Rückseite"}
          </span>
          <span className="text-[10px] text-primary font-medium">
            {REGION_VIEWS[region].label}
          </span>
        </div>

        <div className="relative rounded-xl border bg-gradient-to-b from-card to-muted/30 p-3 overflow-hidden">
          <motion.div
            key={`${view}-${region}`}
            initial={{ opacity: 0.5, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <svg
              viewBox={currentViewBox}
              className="w-full cursor-crosshair"
              style={{ maxHeight: region === "full" ? "420px" : "350px" }}
              onClick={region === "full" ? handleClick : handleZoomedClick}
            >
              {/* Body silhouette */}
              {bodyParts}

              {/* Markers */}
              {filteredMarkers.map((marker) => {
                const cx = (marker.x / 100) * 200;
                const cy = (marker.y / 100) * 500;
                const isSelected = marker.id === selectedLocationId;
                const markerSize = region === "full" ? 1 : 0.6;
                return (
                  <g key={marker.id}>
                    {isSelected && (
                      <>
                        <circle cx={cx} cy={cy} r={16 * markerSize} className="fill-primary/10 animate-pulse-marker" />
                        <circle cx={cx} cy={cy} r={11 * markerSize} className="fill-primary/20" />
                      </>
                    )}
                    <circle
                      cx={cx} cy={cy} r={7 * markerSize}
                      className={isSelected ? "fill-primary" : "fill-none"}
                      stroke="hsl(var(--primary))"
                      strokeWidth={2 * markerSize}
                    />
                    <circle
                      cx={cx} cy={cy} r={3 * markerSize}
                      className={isSelected ? "fill-primary-foreground" : "fill-primary"}
                    />
                    {/* Label on hover/zoom */}
                    {region !== "full" && marker.name && (
                      <text
                        x={cx + 10 * markerSize}
                        y={cy + 4 * markerSize}
                        className="fill-foreground text-[6px] font-medium"
                      >
                        {marker.name}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </motion.div>
        </div>

        <p className="text-center text-[10px] text-muted-foreground">
          Klicken um Stelle zu markieren
        </p>
      </div>
    </div>
  );
};

/* ─── Front Body SVG ─── */
const FrontBody = () => (
  <g>
    {/* Skin colored body */}
    {/* Head */}
    <ellipse cx="100" cy="36" rx="22" ry="27" fill="hsl(30 40% 85%)" stroke="hsl(30 20% 70%)" strokeWidth="0.8" />
    {/* Ears */}
    <ellipse cx="77" cy="36" rx="4" ry="7" fill="hsl(30 40% 83%)" stroke="hsl(30 20% 70%)" strokeWidth="0.5" />
    <ellipse cx="123" cy="36" rx="4" ry="7" fill="hsl(30 40% 83%)" stroke="hsl(30 20% 70%)" strokeWidth="0.5" />
    {/* Hair */}
    <path d="M78 28 Q80 12 100 8 Q120 12 122 28 Q115 18 100 16 Q85 18 78 28Z" fill="hsl(30 30% 30%)" opacity="0.3" />
    {/* Face features */}
    <ellipse cx="91" cy="32" rx="2.5" ry="1.5" fill="hsl(30 20% 65%)" />
    <ellipse cx="109" cy="32" rx="2.5" ry="1.5" fill="hsl(30 20% 65%)" />
    <path d="M96 40 Q100 43 104 40" fill="none" stroke="hsl(30 20% 65%)" strokeWidth="0.8" />
    <line x1="100" y1="35" x2="100" y2="39" stroke="hsl(30 20% 68%)" strokeWidth="0.5" />

    {/* Neck */}
    <rect x="92" y="62" width="16" height="14" rx="3" fill="hsl(30 40% 84%)" stroke="hsl(30 20% 70%)" strokeWidth="0.8" />

    {/* Torso */}
    <path
      d="M64 76 Q64 74 70 74 L130 74 Q136 74 136 76 L140 190 Q140 216 126 216 L74 216 Q60 216 60 190 Z"
      fill="hsl(30 40% 85%)" stroke="hsl(30 20% 70%)" strokeWidth="0.8"
    />
    {/* Chest details */}
    <circle cx="85" cy="100" r="3" fill="hsl(30 30% 75%)" opacity="0.4" />
    <circle cx="115" cy="100" r="3" fill="hsl(30 30% 75%)" opacity="0.4" />
    <path d="M84 96 Q100 112 116 96" fill="none" stroke="hsl(30 20% 75%)" strokeWidth="0.4" />
    {/* Abs hint */}
    <path d="M92 130 L92 180" stroke="hsl(30 20% 78%)" strokeWidth="0.3" />
    <path d="M108 130 L108 180" stroke="hsl(30 20% 78%)" strokeWidth="0.3" />
    <path d="M88 145 L112 145" stroke="hsl(30 20% 78%)" strokeWidth="0.2" />
    <path d="M88 160 L112 160" stroke="hsl(30 20% 78%)" strokeWidth="0.2" />
    {/* Navel */}
    <circle cx="100" cy="175" r="2" fill="hsl(30 25% 72%)" />

    {/* Left arm */}
    <path
      d="M64 76 Q50 78 40 92 L24 152 Q20 165 24 170 L32 166 Q36 160 40 148 L56 98"
      fill="hsl(30 40% 85%)" stroke="hsl(30 20% 70%)" strokeWidth="0.8"
    />
    {/* Left hand */}
    <path d="M24 170 Q18 178 20 185 Q22 190 28 188 Q30 184 26 176 L32 166" fill="hsl(30 40% 84%)" stroke="hsl(30 20% 70%)" strokeWidth="0.6" />
    {/* Fingers hint */}
    <path d="M20 185 L18 192 M22 186 L21 194 M24 186 L24 193 M26 185 L27 191" stroke="hsl(30 20% 72%)" strokeWidth="0.4" />

    {/* Right arm */}
    <path
      d="M136 76 Q150 78 160 92 L176 152 Q180 165 176 170 L168 166 Q164 160 160 148 L144 98"
      fill="hsl(30 40% 85%)" stroke="hsl(30 20% 70%)" strokeWidth="0.8"
    />
    {/* Right hand */}
    <path d="M176 170 Q182 178 180 185 Q178 190 172 188 Q170 184 174 176 L168 166" fill="hsl(30 40% 84%)" stroke="hsl(30 20% 70%)" strokeWidth="0.6" />
    <path d="M180 185 L182 192 M178 186 L179 194 M176 186 L176 193 M174 185 L173 191" stroke="hsl(30 20% 72%)" strokeWidth="0.4" />

    {/* Left leg */}
    <path
      d="M74 216 L70 310 Q68 330 65 348 L60 432 Q59 445 66 448 L78 448 Q84 446 82 432 L87 330 L92 216"
      fill="hsl(30 40% 84%)" stroke="hsl(30 20% 70%)" strokeWidth="0.8"
    />
    {/* Left foot */}
    <path d="M60 432 L56 448 Q54 458 64 460 L80 460 Q86 458 84 448 L82 432" fill="hsl(30 40% 83%)" stroke="hsl(30 20% 70%)" strokeWidth="0.6" />
    {/* Knee */}
    <ellipse cx="81" cy="310" rx="8" ry="5" fill="none" stroke="hsl(30 20% 75%)" strokeWidth="0.3" />

    {/* Right leg */}
    <path
      d="M108 216 L113 330 L118 432 Q119 445 124 448 L136 448 Q142 446 141 432 L138 348 Q135 330 133 310 L129 216"
      fill="hsl(30 40% 84%)" stroke="hsl(30 20% 70%)" strokeWidth="0.8"
    />
    {/* Right foot */}
    <path d="M118 432 L116 448 Q114 458 120 460 L140 460 Q146 458 144 448 L141 432" fill="hsl(30 40% 83%)" stroke="hsl(30 20% 70%)" strokeWidth="0.6" />
    {/* Knee */}
    <ellipse cx="121" cy="310" rx="8" ry="5" fill="none" stroke="hsl(30 20% 75%)" strokeWidth="0.3" />

    {/* Collarbone */}
    <path d="M70 78 Q85 82 100 80 Q115 82 130 78" fill="none" stroke="hsl(30 20% 73%)" strokeWidth="0.5" />
  </g>
);

/* ─── Back Body SVG ─── */
const BackBody = () => (
  <g>
    {/* Head */}
    <ellipse cx="100" cy="36" rx="22" ry="27" fill="hsl(30 40% 85%)" stroke="hsl(30 20% 70%)" strokeWidth="0.8" />
    <ellipse cx="77" cy="36" rx="4" ry="7" fill="hsl(30 40% 83%)" stroke="hsl(30 20% 70%)" strokeWidth="0.5" />
    <ellipse cx="123" cy="36" rx="4" ry="7" fill="hsl(30 40% 83%)" stroke="hsl(30 20% 70%)" strokeWidth="0.5" />
    {/* Hair (more visible from back) */}
    <path d="M78 28 Q80 10 100 6 Q120 10 122 28 Q118 14 100 12 Q82 14 78 28Z" fill="hsl(30 30% 30%)" opacity="0.35" />
    <path d="M85 48 Q100 55 115 48" fill="hsl(30 30% 30%)" opacity="0.15" />

    {/* Neck */}
    <rect x="92" y="62" width="16" height="14" rx="3" fill="hsl(30 40% 84%)" stroke="hsl(30 20% 70%)" strokeWidth="0.8" />

    {/* Torso */}
    <path
      d="M64 76 Q64 74 70 74 L130 74 Q136 74 136 76 L140 190 Q140 216 126 216 L74 216 Q60 216 60 190 Z"
      fill="hsl(30 40% 85%)" stroke="hsl(30 20% 70%)" strokeWidth="0.8"
    />
    {/* Spine */}
    <line x1="100" y1="76" x2="100" y2="208" stroke="hsl(30 20% 73%)" strokeWidth="0.6" strokeDasharray="3 2" />
    {/* Shoulder blades */}
    <path d="M76 92 Q86 105 82 122 Q78 110 76 92Z" fill="hsl(30 35% 82%)" opacity="0.5" />
    <path d="M124 92 Q114 105 118 122 Q122 110 124 92Z" fill="hsl(30 35% 82%)" opacity="0.5" />
    {/* Lower back dimples */}
    <circle cx="92" cy="200" r="2" fill="hsl(30 25% 78%)" opacity="0.4" />
    <circle cx="108" cy="200" r="2" fill="hsl(30 25% 78%)" opacity="0.4" />

    {/* Left arm */}
    <path d="M64 76 Q50 78 40 92 L24 152 Q20 165 24 170 L32 166 Q36 160 40 148 L56 98" fill="hsl(30 40% 85%)" stroke="hsl(30 20% 70%)" strokeWidth="0.8" />
    <path d="M24 170 Q18 178 20 185 Q22 190 28 188 Q30 184 26 176 L32 166" fill="hsl(30 40% 84%)" stroke="hsl(30 20% 70%)" strokeWidth="0.6" />
    <path d="M20 185 L18 192 M22 186 L21 194 M24 186 L24 193 M26 185 L27 191" stroke="hsl(30 20% 72%)" strokeWidth="0.4" />

    {/* Right arm */}
    <path d="M136 76 Q150 78 160 92 L176 152 Q180 165 176 170 L168 166 Q164 160 160 148 L144 98" fill="hsl(30 40% 85%)" stroke="hsl(30 20% 70%)" strokeWidth="0.8" />
    <path d="M176 170 Q182 178 180 185 Q178 190 172 188 Q170 184 174 176 L168 166" fill="hsl(30 40% 84%)" stroke="hsl(30 20% 70%)" strokeWidth="0.6" />
    <path d="M180 185 L182 192 M178 186 L179 194 M176 186 L176 193 M174 185 L173 191" stroke="hsl(30 20% 72%)" strokeWidth="0.4" />

    {/* Buttocks */}
    <path d="M80 208 Q90 225 100 215 Q110 225 120 208" fill="none" stroke="hsl(30 20% 73%)" strokeWidth="0.5" />

    {/* Left leg */}
    <path d="M74 216 L70 310 Q68 330 65 348 L60 432 Q59 445 66 448 L78 448 Q84 446 82 432 L87 330 L92 216" fill="hsl(30 40% 84%)" stroke="hsl(30 20% 70%)" strokeWidth="0.8" />
    <path d="M60 432 L56 448 Q54 458 64 460 L80 460 Q86 458 84 448 L82 432" fill="hsl(30 40% 83%)" stroke="hsl(30 20% 70%)" strokeWidth="0.6" />
    {/* Calf muscle */}
    <ellipse cx="78" cy="365" rx="7" ry="18" fill="hsl(30 38% 83%)" opacity="0.3" />

    {/* Right leg */}
    <path d="M108 216 L113 330 L118 432 Q119 445 124 448 L136 448 Q142 446 141 432 L138 348 Q135 330 133 310 L129 216" fill="hsl(30 40% 84%)" stroke="hsl(30 20% 70%)" strokeWidth="0.8" />
    <path d="M118 432 L116 448 Q114 458 120 460 L140 460 Q146 458 144 448 L141 432" fill="hsl(30 40% 83%)" stroke="hsl(30 20% 70%)" strokeWidth="0.6" />
    <ellipse cx="125" cy="365" rx="7" ry="18" fill="hsl(30 38% 83%)" opacity="0.3" />

    {/* Collarbone back */}
    <path d="M70 78 Q85 82 100 80 Q115 82 130 78" fill="none" stroke="hsl(30 20% 73%)" strokeWidth="0.5" />
  </g>
);

export default BodyMapSvg;
