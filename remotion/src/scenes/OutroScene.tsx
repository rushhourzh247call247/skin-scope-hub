import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  AbsoluteFill,
} from "remotion";

export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame: frame - 10, fps, config: { damping: 12, stiffness: 150 } });
  const urlProgress = spring({ frame: frame - 30, fps, config: { damping: 20 } });
  const ctaProgress = spring({ frame: frame - 45, fps, config: { damping: 20 } });

  const bgPulse = Math.sin(frame * 0.03) * 0.02 + 1;

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
      {/* Glow */}
      <div
        style={{
          position: "absolute",
          width: 700,
          height: 700,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(45,212,191,0.1) 0%, transparent 70%)",
          transform: `scale(${bgPulse})`,
        }}
      />

      {/* Logo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
          transform: `scale(${logoScale})`,
          marginBottom: 32,
        }}
      >
        <div
          style={{
            width: 70,
            height: 70,
            borderRadius: 14,
            background: "linear-gradient(135deg, #2dd4bf, #14b8a6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 38,
            fontWeight: 800,
            color: "white",
            fontFamily: "sans-serif",
            boxShadow: "0 10px 40px rgba(45,212,191,0.3)",
          }}
        >
          D
        </div>
        <div style={{ fontSize: 64, fontWeight: 800, fontFamily: "sans-serif", letterSpacing: "-0.02em" }}>
          <span style={{ color: "white" }}>DERM</span>
          <span style={{ color: "#2dd4bf" }}>247</span>
        </div>
      </div>

      {/* URL */}
      <div
        style={{
          fontSize: 28,
          color: "#2dd4bf",
          fontFamily: "sans-serif",
          fontWeight: 600,
          opacity: urlProgress,
          transform: `translateY(${interpolate(urlProgress, [0, 1], [15, 0])}px)`,
          marginBottom: 16,
        }}
      >
        www.derm247.ch
      </div>

      {/* Tagline */}
      <div
        style={{
          fontSize: 18,
          color: "rgba(255,255,255,0.5)",
          fontFamily: "sans-serif",
          opacity: urlProgress,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        🇨🇭 Schweizer Qualität & Datenschutz
      </div>

      {/* CTA */}
      <div
        style={{
          marginTop: 40,
          fontSize: 20,
          color: "rgba(255,255,255,0.6)",
          fontFamily: "sans-serif",
          opacity: ctaProgress,
          transform: `translateY(${interpolate(ctaProgress, [0, 1], [10, 0])}px)`,
          background: "rgba(45,212,191,0.1)",
          border: "1px solid rgba(45,212,191,0.3)",
          borderRadius: 50,
          padding: "14px 36px",
        }}
      >
        Jetzt kostenlos testen
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          bottom: 30,
          fontSize: 13,
          color: "rgba(255,255,255,0.2)",
          fontFamily: "sans-serif",
        }}
      >
        designed by techassist.ch
      </div>
    </AbsoluteFill>
  );
};
