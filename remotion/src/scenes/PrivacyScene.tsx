import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  AbsoluteFill,
} from "remotion";

const features = [
  { icon: "🇨🇭", title: "Hosting in der Schweiz", desc: "Daten bleiben in der Schweiz" },
  { icon: "🔒", title: "Ende-zu-Ende-Verschlüsselung", desc: "Sichere Datenübertragung" },
  { icon: "🚫", title: "Keine Drittanbieter", desc: "Keine externen Cloud-Dienste" },
  { icon: "🔑", title: "Auth-geschützte Bilder", desc: "Zugriff nur mit gültigem Token" },
  { icon: "⏱️", title: "Automatischer Logout", desc: "Session läuft nach Inaktivität ab" },
  { icon: "🗑️", title: "Papierkorb & Soft-Delete", desc: "Gelöschte Daten wiederherstellbar" },
];

export const PrivacyScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProgress = spring({ frame: frame - 5, fps, config: { damping: 15 } });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #0f1419 0%, #0d2818 50%, #0f1419 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
      }}
    >
      {/* Shield icon */}
      <div
        style={{
          fontSize: 64,
          marginBottom: 16,
          opacity: titleProgress,
          transform: `scale(${titleProgress})`,
        }}
      >
        🛡️
      </div>

      <div
        style={{
          fontSize: 42,
          fontWeight: 800,
          color: "white",
          fontFamily: "sans-serif",
          marginBottom: 48,
          opacity: titleProgress,
          transform: `translateY(${interpolate(titleProgress, [0, 1], [20, 0])}px)`,
        }}
      >
        Datenschutz & Sicherheit
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 24,
          maxWidth: 1200,
        }}
      >
        {features.map((f, i) => {
          const delay = 15 + i * 8;
          const itemProgress = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 200 } });
          return (
            <div
              key={i}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(45,212,191,0.15)",
                borderRadius: 16,
                padding: "24px 28px",
                opacity: itemProgress,
                transform: `translateY(${interpolate(itemProgress, [0, 1], [25, 0])}px)`,
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 12 }}>{f.icon}</div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "white",
                  fontFamily: "sans-serif",
                  marginBottom: 6,
                }}
              >
                {f.title}
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: "rgba(255,255,255,0.5)",
                  fontFamily: "sans-serif",
                }}
              >
                {f.desc}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
