import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  AbsoluteFill,
} from "remotion";

const items = [
  { icon: "🏥", title: "Pro Praxis", desc: "Geeignet für Einzelpraxen" },
  { icon: "👥", title: "Pro Benutzer", desc: "Skalierbar für Teams" },
  { icon: "🏢", title: "Multi-Mandant", desc: "Mehrere Praxen isoliert verwalten" },
  { icon: "🎫", title: "Kostenloser Test", desc: "Unverbindlich testen" },
];

export const PricingScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProgress = spring({ frame: frame - 5, fps, config: { damping: 15 } });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #0f1419 0%, #1a1a2e 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          fontSize: 42,
          fontWeight: 800,
          color: "white",
          fontFamily: "sans-serif",
          marginBottom: 16,
          opacity: titleProgress,
          transform: `translateY(${interpolate(titleProgress, [0, 1], [20, 0])}px)`,
        }}
      >
        Flexible Lizenzmodelle
      </div>
      <div
        style={{
          fontSize: 20,
          color: "rgba(255,255,255,0.5)",
          fontFamily: "sans-serif",
          marginBottom: 48,
          opacity: titleProgress,
        }}
      >
        Passend für jede Praxisgrösse
      </div>

      <div style={{ display: "flex", gap: 28 }}>
        {items.map((item, i) => {
          const delay = 15 + i * 10;
          const itemProgress = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 200 } });
          return (
            <div
              key={i}
              style={{
                width: 240,
                background: i === 3
                  ? "linear-gradient(135deg, rgba(45,212,191,0.15), rgba(45,212,191,0.05))"
                  : "rgba(255,255,255,0.04)",
                border: i === 3
                  ? "2px solid rgba(45,212,191,0.4)"
                  : "1px solid rgba(255,255,255,0.08)",
                borderRadius: 20,
                padding: "36px 28px",
                textAlign: "center",
                opacity: itemProgress,
                transform: `translateY(${interpolate(itemProgress, [0, 1], [30, 0])}px) scale(${interpolate(itemProgress, [0, 1], [0.95, 1])})`,
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 16 }}>{item.icon}</div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: "white",
                  fontFamily: "sans-serif",
                  marginBottom: 8,
                }}
              >
                {item.title}
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: "rgba(255,255,255,0.5)",
                  fontFamily: "sans-serif",
                }}
              >
                {item.desc}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
