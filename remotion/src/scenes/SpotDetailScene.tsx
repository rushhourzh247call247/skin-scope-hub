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

export const SpotDetailScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const windowScale = spring({ frame: frame - 5, fps, config: { damping: 20, stiffness: 180 } });

  const cursorPositions = [
    { x: 700, y: 400, frame: 0 },
    { x: 850, y: 200, frame: 20, click: true },
    { x: 1100, y: 350, frame: 50 },
    { x: 1250, y: 670, frame: 75, click: true },
    { x: 900, y: 750, frame: 100 },
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
            src={staticFile("images/screenshot-spotdetail.png")}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </WindowFrame>
      </div>

      <AnimatedCursor positions={cursorPositions} />

      <FeatureBadge
        text="Klassifikation, Befunde & ABCDE-Bewertung"
        delay={20}
        icon="🔬"
      />
    </AbsoluteFill>
  );
};
