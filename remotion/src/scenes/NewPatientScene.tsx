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
import { WindowFrame, AnimatedCursor, FeatureBadge, BlurOverlay } from "../components/SharedComponents";

export const NewPatientScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const windowScale = spring({ frame: frame - 5, fps, config: { damping: 20, stiffness: 180 } });

  const cursorPositions = [
    { x: 700, y: 300, frame: 0 },
    { x: 780, y: 270, frame: 20, click: true },
    { x: 780, y: 340, frame: 40, click: true },
    { x: 780, y: 410, frame: 60, click: true },
    { x: 730, y: 610, frame: 85, click: true },
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
          <div style={{ position: "relative", width: "100%", height: "100%" }}>
            <Img
              src={staticFile("images/screenshot-newpatient.png")}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        </WindowFrame>
      </div>

      <AnimatedCursor positions={cursorPositions} />

      <FeatureBadge
        text="Patient in Sekunden erfasst"
        delay={25}
        icon="👤"
      />
    </AbsoluteFill>
  );
};
