const BodyMapSvg = ({
  markers,
  onMapClick,
  selectedLocationId,
}: {
  markers: { id: number; x: number; y: number; name?: string }[];
  onMapClick: (x: number, y: number) => void;
  selectedLocationId?: number | null;
}) => {
  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onMapClick(Math.round(x * 10) / 10, Math.round(y * 10) / 10);
  };

  return (
    <div className="relative w-full max-w-[280px] mx-auto">
      <svg
        viewBox="0 0 200 500"
        className="w-full cursor-crosshair"
        onClick={handleClick}
      >
        {/* Body silhouette - front view */}
        {/* Head */}
        <ellipse cx="100" cy="40" rx="25" ry="30" className="fill-secondary stroke-border" strokeWidth="1.5" />
        {/* Neck */}
        <rect x="90" y="68" width="20" height="15" rx="4" className="fill-secondary stroke-border" strokeWidth="1.5" />
        {/* Torso */}
        <path
          d="M60 83 Q60 80 65 78 L90 78 Q100 78 110 78 L135 78 Q140 80 140 83 L145 200 Q145 220 130 220 L70 220 Q55 220 55 200 Z"
          className="fill-secondary stroke-border"
          strokeWidth="1.5"
        />
        {/* Left arm */}
        <path
          d="M60 83 Q45 85 35 100 L20 160 Q18 170 25 175 L35 170 Q38 165 40 155 L55 110 L55 200"
          className="fill-secondary stroke-border"
          strokeWidth="1.5"
          fill="none"
        />
        <path
          d="M60 83 Q45 85 35 100 L20 160 Q18 170 25 175 L35 170 Q38 165 40 155 L55 105"
          className="fill-secondary stroke-border"
          strokeWidth="1.5"
        />
        {/* Right arm */}
        <path
          d="M140 83 Q155 85 165 100 L180 160 Q182 170 175 175 L165 170 Q162 165 160 155 L145 105"
          className="fill-secondary stroke-border"
          strokeWidth="1.5"
        />
        {/* Left leg */}
        <path
          d="M70 220 L65 320 Q63 340 60 360 L55 440 Q54 455 65 455 L75 455 Q80 455 78 440 L85 340 L90 220"
          className="fill-secondary stroke-border"
          strokeWidth="1.5"
        />
        {/* Right leg */}
        <path
          d="M110 220 L115 340 L122 440 Q124 455 125 455 L135 455 Q146 455 145 440 L140 360 Q137 340 135 320 L130 220"
          className="fill-secondary stroke-border"
          strokeWidth="1.5"
        />

        {/* Markers */}
        {markers.map((marker) => {
          const cx = (marker.x / 100) * 200;
          const cy = (marker.y / 100) * 500;
          const isSelected = marker.id === selectedLocationId;
          return (
            <g key={marker.id}>
              {isSelected && (
                <circle
                  cx={cx}
                  cy={cy}
                  r="12"
                  className="fill-primary/20 animate-pulse-marker"
                />
              )}
              <circle
                cx={cx}
                cy={cy}
                r="6"
                className={isSelected ? "fill-primary stroke-primary-foreground" : "fill-accent stroke-accent-foreground"}
                strokeWidth="2"
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default BodyMapSvg;
