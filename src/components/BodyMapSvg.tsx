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

/* ─── Shared skin colors ─── */
const SKIN = "hsl(30 40% 85%)";
const SKIN_DARK = "hsl(30 40% 83%)";
const SKIN_SHADOW = "hsl(30 40% 80%)";
const STROKE = "hsl(30 20% 70%)";
const DETAIL = "hsl(30 20% 75%)";
const DETAIL_LIGHT = "hsl(30 20% 78%)";
const NAIL = "hsl(30 30% 88%)";

/* ─── Front Body SVG ─── */
const FrontBody = () => (
  <g>
    {/* Head */}
    <ellipse cx="100" cy="36" rx="22" ry="27" fill={SKIN} stroke={STROKE} strokeWidth="0.8" />
    <ellipse cx="77" cy="36" rx="4" ry="7" fill={SKIN_DARK} stroke={STROKE} strokeWidth="0.5" />
    <ellipse cx="123" cy="36" rx="4" ry="7" fill={SKIN_DARK} stroke={STROKE} strokeWidth="0.5" />
    <path d="M78 28 Q80 12 100 8 Q120 12 122 28 Q115 18 100 16 Q85 18 78 28Z" fill="hsl(30 30% 30%)" opacity="0.3" />
    <ellipse cx="91" cy="32" rx="2.5" ry="1.5" fill="hsl(30 20% 65%)" />
    <ellipse cx="109" cy="32" rx="2.5" ry="1.5" fill="hsl(30 20% 65%)" />
    <path d="M96 40 Q100 43 104 40" fill="none" stroke="hsl(30 20% 65%)" strokeWidth="0.8" />
    <line x1="100" y1="35" x2="100" y2="39" stroke="hsl(30 20% 68%)" strokeWidth="0.5" />

    {/* Neck */}
    <rect x="92" y="62" width="16" height="14" rx="3" fill={SKIN_DARK} stroke={STROKE} strokeWidth="0.8" />

    {/* Torso */}
    <path d="M64 76 Q64 74 70 74 L130 74 Q136 74 136 76 L140 190 Q140 216 126 216 L74 216 Q60 216 60 190 Z" fill={SKIN} stroke={STROKE} strokeWidth="0.8" />
    <circle cx="85" cy="100" r="3" fill={DETAIL} opacity="0.4" />
    <circle cx="115" cy="100" r="3" fill={DETAIL} opacity="0.4" />
    <path d="M84 96 Q100 112 116 96" fill="none" stroke={DETAIL} strokeWidth="0.4" />
    <path d="M92 130 L92 180" stroke={DETAIL_LIGHT} strokeWidth="0.3" />
    <path d="M108 130 L108 180" stroke={DETAIL_LIGHT} strokeWidth="0.3" />
    <path d="M88 145 L112 145" stroke={DETAIL_LIGHT} strokeWidth="0.2" />
    <path d="M88 160 L112 160" stroke={DETAIL_LIGHT} strokeWidth="0.2" />
    <circle cx="100" cy="175" r="2" fill="hsl(30 25% 72%)" />
    <path d="M70 78 Q85 82 100 80 Q115 82 130 78" fill="none" stroke="hsl(30 20% 73%)" strokeWidth="0.5" />

    {/* Left arm */}
    <path d="M64 76 Q50 78 40 92 L24 152 Q20 162 22 170 L30 168 Q34 160 38 148 L56 98" fill={SKIN} stroke={STROKE} strokeWidth="0.8" />
    {/* Left wrist */}
    <path d="M22 170 L20 176 Q19 178 20 180 L28 178 Q30 176 30 174 L30 168" fill={SKIN_DARK} stroke={STROKE} strokeWidth="0.5" />
    {/* Left palm */}
    <path d="M20 180 Q17 184 16 190 Q15 196 18 200 Q20 202 24 202 L28 202 Q30 200 30 196 Q30 190 28 184 L28 178" fill={SKIN_DARK} stroke={STROKE} strokeWidth="0.5" />
    {/* Left thumb */}
    <path d="M16 190 Q12 186 10 188 Q8 190 9 194 Q10 198 14 200 Q16 199 18 197" fill={SKIN_DARK} stroke={STROKE} strokeWidth="0.4" />
    <ellipse cx="10" cy="189" rx="2" ry="1.5" fill={NAIL} stroke={DETAIL} strokeWidth="0.3" />
    {/* Left fingers */}
    <path d="M18 200 L16 210 Q16 212 17 213 Q18 213 19 212 L20 202" fill={SKIN_DARK} stroke={STROKE} strokeWidth="0.35" />
    <path d="M20 202 L18 214 Q18 216 19 217 Q20 217 21 216 L22 202" fill={SKIN_DARK} stroke={STROKE} strokeWidth="0.35" />
    <path d="M22 202 L21 213 Q21 215 22 216 Q23 216 24 215 L24 202" fill={SKIN_DARK} stroke={STROKE} strokeWidth="0.35" />
    <path d="M24 202 L24 211 Q24 213 25 213 Q26 213 27 212 L27 200" fill={SKIN_DARK} stroke={STROKE} strokeWidth="0.35" />
    {/* Left finger nails */}
    <ellipse cx="17" cy="211" rx="1.2" ry="1" fill={NAIL} stroke={DETAIL} strokeWidth="0.2" />
    <ellipse cx="19.5" cy="215" rx="1.2" ry="1" fill={NAIL} stroke={DETAIL} strokeWidth="0.2" />
    <ellipse cx="22.5" cy="214" rx="1.2" ry="1" fill={NAIL} stroke={DETAIL} strokeWidth="0.2" />
    <ellipse cx="25" cy="212" rx="1.2" ry="1" fill={NAIL} stroke={DETAIL} strokeWidth="0.2" />
    {/* Left palm lines */}
    <path d="M20 186 Q24 190 28 188" fill="none" stroke={DETAIL} strokeWidth="0.2" />
    <path d="M18 192 Q22 196 28 194" fill="none" stroke={DETAIL} strokeWidth="0.2" />

    {/* Right arm */}
    <path d="M136 76 Q150 78 160 92 L176 152 Q180 162 178 170 L170 168 Q166 160 162 148 L144 98" fill={SKIN} stroke={STROKE} strokeWidth="0.8" />
    {/* Right wrist */}
    <path d="M178 170 L180 176 Q181 178 180 180 L172 178 Q170 176 170 174 L170 168" fill={SKIN_DARK} stroke={STROKE} strokeWidth="0.5" />
    {/* Right palm */}
    <path d="M180 180 Q183 184 184 190 Q185 196 182 200 Q180 202 176 202 L172 202 Q170 200 170 196 Q170 190 172 184 L172 178" fill={SKIN_DARK} stroke={STROKE} strokeWidth="0.5" />
    {/* Right thumb */}
    <path d="M184 190 Q188 186 190 188 Q192 190 191 194 Q190 198 186 200 Q184 199 182 197" fill={SKIN_DARK} stroke={STROKE} strokeWidth="0.4" />
    <ellipse cx="190" cy="189" rx="2" ry="1.5" fill={NAIL} stroke={DETAIL} strokeWidth="0.3" />
    {/* Right fingers */}
    <path d="M182 200 L184 210 Q184 212 183 213 Q182 213 181 212 L180 202" fill={SKIN_DARK} stroke={STROKE} strokeWidth="0.35" />
    <path d="M180 202 L182 214 Q182 216 181 217 Q180 217 179 216 L178 202" fill={SKIN_DARK} stroke={STROKE} strokeWidth="0.35" />
    <path d="M178 202 L179 213 Q179 215 178 216 Q177 216 176 215 L176 202" fill={SKIN_DARK} stroke={STROKE} strokeWidth="0.35" />
    <path d="M176 202 L176 211 Q176 213 175 213 Q174 213 173 212 L173 200" fill={SKIN_DARK} stroke={STROKE} strokeWidth="0.35" />
    {/* Right finger nails */}
    <ellipse cx="183" cy="211" rx="1.2" ry="1" fill={NAIL} stroke={DETAIL} strokeWidth="0.2" />
    <ellipse cx="180.5" cy="215" rx="1.2" ry="1" fill={NAIL} stroke={DETAIL} strokeWidth="0.2" />
    <ellipse cx="177.5" cy="214" rx="1.2" ry="1" fill={NAIL} stroke={DETAIL} strokeWidth="0.2" />
    <ellipse cx="175" cy="212" rx="1.2" ry="1" fill={NAIL} stroke={DETAIL} strokeWidth="0.2" />
    {/* Right palm lines */}
    <path d="M180 186 Q176 190 172 188" fill="none" stroke={DETAIL} strokeWidth="0.2" />
    <path d="M182 192 Q178 196 172 194" fill="none" stroke={DETAIL} strokeWidth="0.2" />

    {/* Left leg */}
    <path d="M74 216 L70 310 Q68 330 65 348 L62 420 Q61 430 62 440 L84 440 Q83 430 84 420 L87 330 L92 216 Z" fill={SKIN_DARK} stroke={STROKE} strokeWidth="0.8" />
    <ellipse cx="78" cy="310" rx="8" ry="5" fill="none" stroke={DETAIL} strokeWidth="0.3" />
    {/* Left foot with toes */}
    <path d="M58 440 Q56 442 54 448 Q52 454 54 458 Q56 462 62 464 L82 464 Q88 462 88 458 Q88 454 86 448 Q85 444 84 440 Z" fill={SKIN_SHADOW} stroke={STROKE} strokeWidth="0.6" />
    <circle cx="62" cy="438" r="2.5" fill={SKIN_SHADOW} stroke={DETAIL} strokeWidth="0.3" />
    <circle cx="84" cy="438" r="2" fill={SKIN_SHADOW} stroke={DETAIL} strokeWidth="0.3" />
    {/* Left toes */}
    <ellipse cx="58" cy="464" rx="2.5" ry="3" fill={SKIN_SHADOW} stroke={STROKE} strokeWidth="0.35" />
    <ellipse cx="63" cy="466" rx="2.8" ry="3.5" fill={SKIN_SHADOW} stroke={STROKE} strokeWidth="0.35" />
    <ellipse cx="69" cy="467" rx="2.8" ry="3.5" fill={SKIN_SHADOW} stroke={STROKE} strokeWidth="0.35" />
    <ellipse cx="75" cy="466" rx="2.5" ry="3" fill={SKIN_SHADOW} stroke={STROKE} strokeWidth="0.35" />
    <ellipse cx="80" cy="464" rx="2.2" ry="2.5" fill={SKIN_SHADOW} stroke={STROKE} strokeWidth="0.35" />
    {/* Left toenails */}
    <ellipse cx="58" cy="462.5" rx="1.5" ry="1" fill={NAIL} stroke={DETAIL} strokeWidth="0.2" />
    <ellipse cx="63" cy="464" rx="1.8" ry="1.2" fill={NAIL} stroke={DETAIL} strokeWidth="0.2" />
    <ellipse cx="69" cy="465" rx="1.8" ry="1.2" fill={NAIL} stroke={DETAIL} strokeWidth="0.2" />
    <ellipse cx="75" cy="464" rx="1.5" ry="1" fill={NAIL} stroke={DETAIL} strokeWidth="0.2" />
    <ellipse cx="80" cy="462.5" rx="1.3" ry="0.8" fill={NAIL} stroke={DETAIL} strokeWidth="0.2" />

    {/* Right leg */}
    <path d="M108 216 L113 330 L116 420 Q117 430 116 440 L138 440 Q139 430 138 420 L135 348 Q132 330 130 310 L126 216 Z" fill={SKIN_DARK} stroke={STROKE} strokeWidth="0.8" />
    <ellipse cx="121" cy="310" rx="8" ry="5" fill="none" stroke={DETAIL} strokeWidth="0.3" />
    {/* Right foot with toes */}
    <path d="M112 440 Q110 442 108 448 Q106 454 108 458 Q110 462 116 464 L136 464 Q142 462 142 458 Q142 454 140 448 Q139 444 138 440 Z" fill={SKIN_SHADOW} stroke={STROKE} strokeWidth="0.6" />
    <circle cx="116" cy="438" r="2" fill={SKIN_SHADOW} stroke={DETAIL} strokeWidth="0.3" />
    <circle cx="138" cy="438" r="2.5" fill={SKIN_SHADOW} stroke={DETAIL} strokeWidth="0.3" />
    {/* Right toes */}
    <ellipse cx="120" cy="464" rx="2.2" ry="2.5" fill={SKIN_SHADOW} stroke={STROKE} strokeWidth="0.35" />
    <ellipse cx="125" cy="466" rx="2.5" ry="3" fill={SKIN_SHADOW} stroke={STROKE} strokeWidth="0.35" />
    <ellipse cx="131" cy="467" rx="2.8" ry="3.5" fill={SKIN_SHADOW} stroke={STROKE} strokeWidth="0.35" />
    <ellipse cx="137" cy="466" rx="2.8" ry="3.5" fill={SKIN_SHADOW} stroke={STROKE} strokeWidth="0.35" />
    <ellipse cx="142" cy="464" rx="2.5" ry="3" fill={SKIN_SHADOW} stroke={STROKE} strokeWidth="0.35" />
    {/* Right toenails */}
    <ellipse cx="120" cy="462.5" rx="1.3" ry="0.8" fill={NAIL} stroke={DETAIL} strokeWidth="0.2" />
    <ellipse cx="125" cy="464" rx="1.5" ry="1" fill={NAIL} stroke={DETAIL} strokeWidth="0.2" />
    <ellipse cx="131" cy="465" rx="1.8" ry="1.2" fill={NAIL} stroke={DETAIL} strokeWidth="0.2" />
    <ellipse cx="137" cy="464" rx="1.8" ry="1.2" fill={NAIL} stroke={DETAIL} strokeWidth="0.2" />
    <ellipse cx="142" cy="462.5" rx="1.5" ry="1" fill={NAIL} stroke={DETAIL} strokeWidth="0.2" />
  </g>
);

/* ─── Back Body SVG ─── */
const BackBody = () => (
  <g>
    {/* Head */}
    <ellipse cx="100" cy="36" rx="22" ry="27" fill={SKIN} stroke={STROKE} strokeWidth="0.8" />
    <ellipse cx="77" cy="36" rx="4" ry="7" fill={SKIN_DARK} stroke={STROKE} strokeWidth="0.5" />
    <ellipse cx="123" cy="36" rx="4" ry="7" fill={SKIN_DARK} stroke={STROKE} strokeWidth="0.5" />
    {/* Hair (more visible from back) */}
    <path d="M78 22 Q80 6 100 2 Q120 6 122 22 Q118 10 100 8 Q82 10 78 22Z" fill="hsl(30 30% 30%)" opacity="0.4" />
    <path d="M78 22 L78 42 Q82 52 100 56 Q118 52 122 42 L122 22" fill="hsl(30 30% 30%)" opacity="0.25" />
    <path d="M88 58 Q100 62 112 58" fill="hsl(30 30% 30%)" opacity="0.1" />

    {/* Neck */}
    <rect x="92" y="62" width="16" height="14" rx="3" fill={SKIN_DARK} stroke={STROKE} strokeWidth="0.8" />
    <circle cx="100" cy="68" r="2" fill={SKIN_SHADOW} stroke={DETAIL} strokeWidth="0.3" />

    {/* Torso */}
    <path d="M64 76 Q64 74 70 74 L130 74 Q136 74 136 76 L140 190 Q140 216 126 216 L74 216 Q60 216 60 190 Z" fill={SKIN} stroke={STROKE} strokeWidth="0.8" />
    
    {/* Spine with vertebrae */}
    <line x1="100" y1="76" x2="100" y2="210" stroke="hsl(30 20% 73%)" strokeWidth="0.5" />
    {[82,90,98,106,114,122,130,140,150,160,170,180,190,200].map(y => (
      <circle key={y} cx={100} cy={y} r={y < 130 ? 1.2 : 1.5} fill={SKIN_SHADOW} opacity={y < 106 ? 0.5 : y < 130 ? 0.4 : 0.3} />
    ))}

    {/* Shoulder blades */}
    <path d="M74 88 Q80 95 84 108 Q86 118 82 126 Q78 120 76 108 Q74 98 74 88Z" fill={SKIN_SHADOW} opacity="0.4" stroke={DETAIL} strokeWidth="0.2" />
    <path d="M126 88 Q120 95 116 108 Q114 118 118 126 Q122 120 124 108 Q126 98 126 88Z" fill={SKIN_SHADOW} opacity="0.4" stroke={DETAIL} strokeWidth="0.2" />
    <path d="M74 92 Q82 98 90 96" fill="none" stroke={DETAIL} strokeWidth="0.3" />
    <path d="M126 92 Q118 98 110 96" fill="none" stroke={DETAIL} strokeWidth="0.3" />

    {/* Rib hints */}
    <path d="M76 108 Q88 114 100 112" fill="none" stroke={DETAIL_LIGHT} strokeWidth="0.2" />
    <path d="M124 108 Q112 114 100 112" fill="none" stroke={DETAIL_LIGHT} strokeWidth="0.2" />
    <path d="M72 120 Q86 128 100 126" fill="none" stroke={DETAIL_LIGHT} strokeWidth="0.15" />
    <path d="M128 120 Q114 128 100 126" fill="none" stroke={DETAIL_LIGHT} strokeWidth="0.15" />

    {/* Lower back muscles */}
    <path d="M80 160 Q90 180 92 200" fill="none" stroke={DETAIL_LIGHT} strokeWidth="0.25" />
    <path d="M120 160 Q110 180 108 200" fill="none" stroke={DETAIL_LIGHT} strokeWidth="0.25" />
    
    {/* Venus dimples & sacrum */}
    <circle cx="90" cy="202" r="2.5" fill={SKIN_SHADOW} opacity="0.35" />
    <circle cx="110" cy="202" r="2.5" fill={SKIN_SHADOW} opacity="0.35" />
    <path d="M94 200 L100 212 L106 200" fill="none" stroke={DETAIL} strokeWidth="0.3" />

    <path d="M70 78 Q85 82 100 80 Q115 82 130 78" fill="none" stroke="hsl(30 20% 73%)" strokeWidth="0.5" />

    {/* Buttocks */}
    <path d="M76 210 Q82 230 100 218 Q118 230 124 210" fill="none" stroke="hsl(30 20% 73%)" strokeWidth="0.5" />
    <path d="M100 212 L100 222" stroke="hsl(30 20% 73%)" strokeWidth="0.4" />
    <path d="M80 226 Q88 230 92 226" fill="none" stroke={DETAIL} strokeWidth="0.25" />
    <path d="M108 226 Q112 230 120 226" fill="none" stroke={DETAIL} strokeWidth="0.25" />

    {/* Left arm */}
    <path d="M64 76 Q50 78 40 92 L24 152 Q20 162 22 170 L30 168 Q34 160 38 148 L56 98" fill={SKIN} stroke={STROKE} strokeWidth="0.8" />
    <ellipse cx="36" cy="140" rx="4" ry="3" fill={SKIN_SHADOW} opacity="0.3" />
    {/* Left wrist & hand back */}
    <path d="M22 170 L20 176 Q19 178 20 180 L28 178 Q30 176 30 174 L30 168" fill={SKIN_DARK} stroke={STROKE} strokeWidth="0.5" />
    <path d="M20 180 Q17 184 16 190 Q15 196 18 200 Q20 202 24 202 L28 202 Q30 200 30 196 Q30 190 28 184 L28 178" fill={SKIN_DARK} stroke={STROKE} strokeWidth="0.5" />
    {/* Left knuckles */}
    <circle cx="20" cy="198" r="1.5" fill={SKIN_SHADOW} stroke={DETAIL} strokeWidth="0.2" />
    <circle cx="23" cy="199" r="1.5" fill={SKIN_SHADOW} stroke={DETAIL} strokeWidth="0.2" />
    <circle cx="26" cy="198" r="1.5" fill={SKIN_SHADOW} stroke={DETAIL} strokeWidth="0.2" />
    {/* Left thumb */}
    <path d="M16 190 Q12 186 10 188 Q8 190 9 194 Q10 198 14 200 Q16 199 18 197" fill={SKIN_DARK} stroke={STROKE} strokeWidth="0.4" />
    <ellipse cx="10" cy="189" rx="2" ry="1.5" fill={NAIL} stroke={DETAIL} strokeWidth="0.3" />
    {/* Left fingers */}
    <path d="M18 200 L16 210 Q16 212 17 213 Q18 213 19 212 L20 202" fill={SKIN_DARK} stroke={STROKE} strokeWidth="0.35" />
    <path d="M20 202 L18 214 Q18 216 19 217 Q20 217 21 216 L22 202" fill={SKIN_DARK} stroke={STROKE} strokeWidth="0.35" />
    <path d="M22 202 L21 213 Q21 215 22 216 Q23 216 24 215 L24 202" fill={SKIN_DARK} stroke={STROKE} strokeWidth="0.35" />
    <path d="M24 202 L24 211 Q24 213 25 213 Q26 213 27 212 L27 200" fill={SKIN_DARK} stroke={STROKE} strokeWidth="0.35" />
    <ellipse cx="17" cy="211" rx="1.2" ry="1.3" fill={NAIL} stroke={DETAIL} strokeWidth="0.2" />
    <ellipse cx="19.5" cy="215" rx="1.2" ry="1.3" fill={NAIL} stroke={DETAIL} strokeWidth="0.2" />
    <ellipse cx="22.5" cy="214" rx="1.2" ry="1.3" fill={NAIL} stroke={DETAIL} strokeWidth="0.2" />
    <ellipse cx="25" cy="212" rx="1.2" ry="1.3" fill={NAIL} stroke={DETAIL} strokeWidth="0.2" />

    {/* Right arm */}
    <path d="M136 76 Q150 78 160 92 L176 152 Q180 162 178 170 L170 168 Q166 160 162 148 L144 98" fill={SKIN} stroke={STROKE} strokeWidth="0.8" />
    <ellipse cx="164" cy="140" rx="4" ry="3" fill={SKIN_SHADOW} opacity="0.3" />
    {/* Right wrist & hand back */}
    <path d="M178 170 L180 176 Q181 178 180 180 L172 178 Q170 176 170 174 L170 168" fill={SKIN_DARK} stroke={STROKE} strokeWidth="0.5" />
    <path d="M180 180 Q183 184 184 190 Q185 196 182 200 Q180 202 176 202 L172 202 Q170 200 170 196 Q170 190 172 184 L172 178" fill={SKIN_DARK} stroke={STROKE} strokeWidth="0.5" />
    <circle cx="174" cy="198" r="1.5" fill={SKIN_SHADOW} stroke={DETAIL} strokeWidth="0.2" />
    <circle cx="177" cy="199" r="1.5" fill={SKIN_SHADOW} stroke={DETAIL} strokeWidth="0.2" />
    <circle cx="180" cy="198" r="1.5" fill={SKIN_SHADOW} stroke={DETAIL} strokeWidth="0.2" />
    {/* Right thumb */}
    <path d="M184 190 Q188 186 190 188 Q192 190 191 194 Q190 198 186 200 Q184 199 182 197" fill={SKIN_DARK} stroke={STROKE} strokeWidth="0.4" />
    <ellipse cx="190" cy="189" rx="2" ry="1.5" fill={NAIL} stroke={DETAIL} strokeWidth="0.3" />
    {/* Right fingers */}
    <path d="M182 200 L184 210 Q184 212 183 213 Q182 213 181 212 L180 202" fill={SKIN_DARK} stroke={STROKE} strokeWidth="0.35" />
    <path d="M180 202 L182 214 Q182 216 181 217 Q180 217 179 216 L178 202" fill={SKIN_DARK} stroke={STROKE} strokeWidth="0.35" />
    <path d="M178 202 L179 213 Q179 215 178 216 Q177 216 176 215 L176 202" fill={SKIN_DARK} stroke={STROKE} strokeWidth="0.35" />
    <path d="M176 202 L176 211 Q176 213 175 213 Q174 213 173 212 L173 200" fill={SKIN_DARK} stroke={STROKE} strokeWidth="0.35" />
    <ellipse cx="183" cy="211" rx="1.2" ry="1.3" fill={NAIL} stroke={DETAIL} strokeWidth="0.2" />
    <ellipse cx="180.5" cy="215" rx="1.2" ry="1.3" fill={NAIL} stroke={DETAIL} strokeWidth="0.2" />
    <ellipse cx="177.5" cy="214" rx="1.2" ry="1.3" fill={NAIL} stroke={DETAIL} strokeWidth="0.2" />
    <ellipse cx="175" cy="212" rx="1.2" ry="1.3" fill={NAIL} stroke={DETAIL} strokeWidth="0.2" />

    {/* Left leg back */}
    <path d="M74 216 L70 310 Q68 330 65 348 L62 420 Q61 430 62 440 L84 440 Q83 430 84 420 L87 330 L92 216 Z" fill={SKIN_DARK} stroke={STROKE} strokeWidth="0.8" />
    <ellipse cx="76" cy="360" rx="8" ry="22" fill={SKIN_SHADOW} opacity="0.3" />
    <path d="M72 345 Q76 355 80 345" fill="none" stroke={DETAIL_LIGHT} strokeWidth="0.25" />
    <path d="M72 306 Q78 314 84 306" fill="none" stroke={DETAIL} strokeWidth="0.3" />
    <path d="M72 420 Q73 432 73 440" fill="none" stroke={DETAIL} strokeWidth="0.3" />
    {/* Left heel */}
    <path d="M58 440 Q56 446 56 452 Q56 458 60 462 Q64 464 72 464 L82 464 Q86 462 88 458 Q90 454 88 448 Q87 444 84 440 Z" fill={SKIN_SHADOW} stroke={STROKE} strokeWidth="0.6" />
    <ellipse cx="71" cy="456" rx="8" ry="5" fill={SKIN_SHADOW} stroke={DETAIL} strokeWidth="0.2" opacity="0.3" />
    <circle cx="60" cy="436" r="2.5" fill={SKIN_SHADOW} stroke={DETAIL} strokeWidth="0.3" />
    <circle cx="84" cy="436" r="2" fill={SKIN_SHADOW} stroke={DETAIL} strokeWidth="0.3" />

    {/* Right leg back */}
    <path d="M108 216 L113 330 L116 420 Q117 430 116 440 L138 440 Q139 430 138 420 L135 348 Q132 330 130 310 L126 216 Z" fill={SKIN_DARK} stroke={STROKE} strokeWidth="0.8" />
    <ellipse cx="125" cy="360" rx="8" ry="22" fill={SKIN_SHADOW} opacity="0.3" />
    <path d="M120 345 Q125 355 130 345" fill="none" stroke={DETAIL_LIGHT} strokeWidth="0.25" />
    <path d="M118 306 Q124 314 130 306" fill="none" stroke={DETAIL} strokeWidth="0.3" />
    <path d="M128 420 Q127 432 127 440" fill="none" stroke={DETAIL} strokeWidth="0.3" />
    {/* Right heel */}
    <path d="M112 440 Q110 446 110 452 Q110 458 114 462 Q118 464 126 464 L136 464 Q140 462 142 458 Q144 454 142 448 Q141 444 138 440 Z" fill={SKIN_SHADOW} stroke={STROKE} strokeWidth="0.6" />
    <ellipse cx="127" cy="456" rx="8" ry="5" fill={SKIN_SHADOW} stroke={DETAIL} strokeWidth="0.2" opacity="0.3" />
    <circle cx="116" cy="436" r="2" fill={SKIN_SHADOW} stroke={DETAIL} strokeWidth="0.3" />
    <circle cx="138" cy="436" r="2.5" fill={SKIN_SHADOW} stroke={DETAIL} strokeWidth="0.3" />
  </g>
);

export default BodyMapSvg;
