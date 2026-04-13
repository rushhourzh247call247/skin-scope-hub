import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  AbsoluteFill,
} from "remotion";

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo icon scale
  const iconScale = spring({ frame: frame - 10, fps, config: { damping: 12, stiffness: 150 } });
  // Text reveal
  const textOpacity = spring({ frame: frame - 20, fps, config: { damping: 20 } });
  // Tagline
  const taglineOpacity = spring({ frame: frame - 40, fps, config: { damping: 20 } });
  // Subtle background pulse
  const bgPulse = Math.sin(frame * 0.04) * 0.02 + 1;

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #0f1419 0%, #1a2332 50%, #0d1117 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
      }}
    >
      {/* Decorative circles */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(45,212,191,0.08) 0%, transparent 70%)",
          transform: `scale(${bgPulse})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 900,
          height: 900,
          borderRadius: "50%",
          border: "1px solid rgba(45,212,191,0.05)",
          transform: `scale(${bgPulse * 1.1})`,
        }}
      />

      {/* Logo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
          transform: `scale(${iconScale})`,
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 16,
            background: "linear-gradient(135deg, #2dd4bf, #14b8a6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 42,
            fontWeight: 800,
            color: "white",
            fontFamily: "sans-serif",
            boxShadow: "0 10px 40px rgba(45,212,191,0.3)",
          }}
        >
          D
        </div>
        <div style={{ fontSize: 72, fontWeight: 800, fontFamily: "sans-serif", letterSpacing: "-0.02em" }}>
          <span style={{ color: "white" }}>DERM</span>
          <span style={{ color: "#2dd4bf" }}>247</span>
        </div>
      </div>

      {/* Tagline */}
      <div
        style={{
          marginTop: 32,
          fontSize: 28,
          color: "rgba(255,255,255,0.6)",
          fontFamily: "sans-serif",
          fontWeight: 400,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          opacity: taglineOpacity,
          transform: `translateY(${interpolate(taglineOpacity, [0, 1], [15, 0])}px)`,
        }}
      >
        Digitale Hautkrebsvorsorge
      </div>

      {/* Swiss badge */}
      <div
        style={{
          marginTop: 20,
          fontSize: 16,
          color: "rgba(255,255,255,0.35)",
          fontFamily: "sans-serif",
          display: "flex",
          alignItems: "center",
          gap: 8,
          opacity: taglineOpacity,
        }}
      >
        🇨🇭 Hosting in der Schweiz
      </div>
    </AbsoluteFill>
  );
};
