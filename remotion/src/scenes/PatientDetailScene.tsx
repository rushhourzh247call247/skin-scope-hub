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
import { WindowFrame, AnimatedCursor, FeatureBadge } from "../components/SharedComponents";

export const PatientDetailScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const windowScale = spring({ frame: frame - 5, fps, config: { damping: 20, stiffness: 180 } });

  const cursorPositions = [
    { x: 500, y: 200, frame: 0 },
    { x: 1100, y: 30, frame: 25, click: true },
    { x: 1180, y: 30, frame: 50, click: true },
    { x: 1260, y: 30, frame: 75, click: true },
    { x: 1340, y: 30, frame: 95, click: true },
  ];

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #0f1419 0%, #1a2332 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          transform: `scale(${interpolate(windowScale, [0, 1], [0.95, 1])})`,
          opacity: interpolate(windowScale, [0, 1], [0, 1]),
        }}
      >
        <WindowFrame>
          <Img
            src={staticFile("images/screenshot-patientdetail.png")}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </WindowFrame>
      </div>

      <AnimatedCursor positions={cursorPositions} />

      <FeatureBadge
        text="Vollständige Patientenakte — Akte, Spots, Zonen, Berichte"
        delay={20}
        icon="📋"
      />
    </AbsoluteFill>
  );
};
