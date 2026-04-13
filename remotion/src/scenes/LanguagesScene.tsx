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
import { WindowFrame, FeatureBadge } from "../components/SharedComponents";

const languages = [
  { flag: "🇩🇪", label: "Deutsch" },
  { flag: "🇬🇧", label: "English" },
  { flag: "🇫🇷", label: "Français" },
  { flag: "🇮🇹", label: "Italiano" },
  { flag: "🇪🇸", label: "Español" },
];

export const LanguagesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProgress = spring({ frame: frame - 5, fps, config: { damping: 15 } });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #0f1419 0%, #1a2332 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 40,
      }}
    >
      <div
        style={{
          fontSize: 38,
          fontWeight: 800,
          color: "white",
          fontFamily: "sans-serif",
          opacity: titleProgress,
          transform: `translateY(${interpolate(titleProgress, [0, 1], [15, 0])}px)`,
        }}
      >
        5 Sprachen verfügbar
      </div>

      <div style={{ display: "flex", gap: 24 }}>
        {languages.map((lang, i) => {
          const delay = 15 + i * 8;
          const progress = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 180 } });
          return (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 20,
                padding: "28px 36px",
                opacity: progress,
                transform: `translateY(${interpolate(progress, [0, 1], [25, 0])}px) scale(${interpolate(progress, [0, 1], [0.9, 1])})`,
              }}
            >
              <div style={{ fontSize: 56 }}>{lang.flag}</div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: "white",
                  fontFamily: "sans-serif",
                }}
              >
                {lang.label}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
