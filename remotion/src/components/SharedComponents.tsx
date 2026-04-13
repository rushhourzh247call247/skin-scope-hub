import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  AbsoluteFill,
  Img,
  staticFile,
} from "remotion";

// Animated cursor component
export const AnimatedCursor: React.FC<{
  positions: { x: number; y: number; frame: number; click?: boolean }[];
}> = ({ positions }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (positions.length === 0) return null;

  // Find current segment
  let segIdx = 0;
  for (let i = 0; i < positions.length - 1; i++) {
    if (frame >= positions[i].frame && frame < positions[i + 1].frame) {
      segIdx = i;
      break;
    }
    if (i === positions.length - 2) segIdx = i;
  }

  const from = positions[segIdx];
  const to = positions[Math.min(segIdx + 1, positions.length - 1)];

  const progress = interpolate(
    frame,
    [from.frame, to.frame],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Smooth easing
  const eased = progress < 0.5
    ? 2 * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 2) / 2;

  const x = from.x + (to.x - from.x) * eased;
  const y = from.y + (to.y - from.y) * eased;

  // Check if clicking
  const isClicking = positions.some(
    (p) => p.click && Math.abs(frame - p.frame) < 5
  );

  const clickScale = isClicking
    ? interpolate(
        frame % 10,
        [0, 3, 5, 10],
        [1, 0.85, 1, 1],
        { extrapolateRight: "clamp" }
      )
    : 1;

  // Click ripple
  const showRipple = positions.find(
    (p) => p.click && frame >= p.frame && frame < p.frame + 15
  );

  return (
    <>
      {showRipple && (
        <div
          style={{
            position: "absolute",
            left: x - 20,
            top: y - 20,
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "2px solid rgba(45, 212, 191, 0.6)",
            transform: `scale(${interpolate(
              frame - showRipple.frame,
              [0, 15],
              [0.5, 2.5],
              { extrapolateRight: "clamp" }
            )})`,
            opacity: interpolate(
              frame - showRipple.frame,
              [0, 15],
              [0.8, 0],
              { extrapolateRight: "clamp" }
            ),
          }}
        />
      )}
      <svg
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: 24,
          height: 24,
          transform: `scale(${clickScale})`,
          filter: "drop-shadow(2px 3px 4px rgba(0,0,0,0.4))",
          zIndex: 9999,
        }}
        viewBox="0 0 24 24"
        fill="none"
      >
        <path
          d="M5 3L19 12L12 13L8 21L5 3Z"
          fill="white"
          stroke="#1a1a2e"
          strokeWidth="1.5"
        />
      </svg>
    </>
  );
};

// MacOS-style window frame
export const WindowFrame: React.FC<{
  children: React.ReactNode;
  scale?: number;
}> = ({ children, scale = 0.85 }) => {
  return (
    <div
      style={{
        width: 1920 * scale,
        height: 1080 * scale,
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "0 25px 80px rgba(0,0,0,0.5), 0 10px 30px rgba(0,0,0,0.3)",
        border: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      {/* Title bar */}
      <div
        style={{
          height: 32,
          background: "linear-gradient(180deg, #3a3a4a 0%, #2d2d3d 100%)",
          display: "flex",
          alignItems: "center",
          paddingLeft: 12,
          gap: 8,
        }}
      >
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ff5f56" }} />
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ffbd2e" }} />
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#27c93f" }} />
        <span
          style={{
            marginLeft: 12,
            fontSize: 12,
            color: "rgba(255,255,255,0.5)",
            fontFamily: "sans-serif",
          }}
        >
          derm247.ch
        </span>
      </div>
      {/* Content */}
      <div style={{ width: "100%", height: `calc(100% - 32px)`, overflow: "hidden" }}>
        {children}
      </div>
    </div>
  );
};

// Text overlay badge
export const FeatureBadge: React.FC<{
  text: string;
  delay?: number;
  x?: number;
  y?: number;
  icon?: string;
}> = ({ text, delay = 0, x = 960, y = 950, icon }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 20, stiffness: 200 },
  });

  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const translateY = interpolate(progress, [0, 1], [30, 0]);

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translateX(-50%) translateY(${translateY}px)`,
        opacity,
        background: "linear-gradient(135deg, rgba(45, 212, 191, 0.95), rgba(20, 184, 166, 0.95))",
        padding: "12px 28px",
        borderRadius: 50,
        fontSize: 22,
        fontWeight: 600,
        color: "white",
        fontFamily: "sans-serif",
        letterSpacing: "0.02em",
        display: "flex",
        alignItems: "center",
        gap: 10,
        boxShadow: "0 8px 32px rgba(45, 212, 191, 0.3)",
      }}
    >
      {icon && <span>{icon}</span>}
      {text}
    </div>
  );
};

// Scene title overlay
export const SceneTitle: React.FC<{
  title: string;
  subtitle?: string;
  delay?: number;
}> = ({ title, subtitle, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProgress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 15, stiffness: 180 },
  });

  const subtitleProgress = spring({
    frame: frame - delay - 8,
    fps,
    config: { damping: 15, stiffness: 180 },
  });

  return (
    <div
      style={{
        position: "absolute",
        bottom: 80,
        left: 80,
        zIndex: 100,
      }}
    >
      <div
        style={{
          fontSize: 36,
          fontWeight: 700,
          color: "white",
          fontFamily: "sans-serif",
          opacity: titleProgress,
          transform: `translateY(${interpolate(titleProgress, [0, 1], [20, 0])}px)`,
          textShadow: "0 2px 20px rgba(0,0,0,0.5)",
        }}
      >
        {title}
      </div>
      {subtitle && (
        <div
          style={{
            fontSize: 20,
            color: "rgba(255,255,255,0.7)",
            fontFamily: "sans-serif",
            marginTop: 8,
            opacity: subtitleProgress,
            transform: `translateY(${interpolate(subtitleProgress, [0, 1], [15, 0])}px)`,
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
};

// Blur overlay for sensitive data
export const BlurOverlay: React.FC<{
  x: number;
  y: number;
  width: number;
  height: number;
}> = ({ x, y, width, height }) => {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        height,
        background: "rgba(200, 200, 220, 0.5)",
        borderRadius: 6,
        filter: "blur(3px)",
      }}
    />
  );
};
