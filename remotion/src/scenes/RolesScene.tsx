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

const roles = [
  { icon: "👑", label: "Admin", color: "#ef4444" },
  { icon: "🩺", label: "Arzt", color: "#2dd4bf" },
  { icon: "👤", label: "Benutzer", color: "#6366f1" },
];

export const RolesScene: React.FC = () => {
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
        Firmen- & Rollenverwaltung
      </div>

      <div style={{ display: "flex", gap: 60, alignItems: "center" }}>
        {/* Settings screenshot */}
        <div
          style={{
            width: 750,
            opacity: interpolate(
              spring({ frame: frame - 10, fps, config: { damping: 20 } }),
              [0, 1],
              [0, 1]
            ),
            transform: `scale(${interpolate(
              spring({ frame: frame - 10, fps, config: { damping: 20 } }),
              [0, 1],
              [0.95, 1]
            )})`,
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          }}
        >
          <Img
            src={staticFile("images/screenshot-settings.png")}
            style={{ width: "100%", height: "auto" }}
          />
        </div>

        {/* Roles */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {roles.map((role, i) => {
            const delay = 20 + i * 12;
            const progress = spring({ frame: frame - delay, fps, config: { damping: 18 } });
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  background: "rgba(255,255,255,0.05)",
                  border: `1px solid ${role.color}33`,
                  borderRadius: 14,
                  padding: "18px 28px",
                  opacity: progress,
                  transform: `translateX(${interpolate(progress, [0, 1], [30, 0])}px)`,
                  minWidth: 220,
                }}
              >
                <div style={{ fontSize: 32 }}>{role.icon}</div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: role.color,
                    fontFamily: "sans-serif",
                  }}
                >
                  {role.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
