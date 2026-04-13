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

export const ReportsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const windowScale = spring({ frame: frame - 5, fps, config: { damping: 20, stiffness: 180 } });

  const cursorPositions = [
    { x: 700, y: 300, frame: 0 },
    { x: 1380, y: 115, frame: 30, click: true },
    { x: 900, y: 400, frame: 60 },
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
            src={staticFile("images/screenshot-reports.png")}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </WindowFrame>
      </div>

      <AnimatedCursor positions={cursorPositions} />

      <FeatureBadge
        text="PDF-Berichte auf Knopfdruck generieren"
        delay={20}
        icon="📄"
      />
    </AbsoluteFill>
  );
};
