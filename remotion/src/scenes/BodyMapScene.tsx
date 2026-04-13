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

export const BodyMapScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const windowScale = spring({ frame: frame - 5, fps, config: { damping: 20, stiffness: 180 } });

  const cursorPositions = [
    { x: 400, y: 300, frame: 0 },
    { x: 330, y: 250, frame: 25, click: true },
    { x: 330, y: 350, frame: 55, click: true },
    { x: 300, y: 500, frame: 85 },
  ];

  // Pulsing marker effect
  const pulseScale = 1 + Math.sin(frame * 0.15) * 0.15;

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
              src={staticFile("images/screenshot-spots.png")}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            {/* Pulsing marker overlay */}
            <div
              style={{
                position: "absolute",
                left: 288,
                top: 183,
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: "rgba(45, 212, 191, 0.4)",
                transform: `scale(${pulseScale})`,
                border: "2px solid rgba(45, 212, 191, 0.8)",
              }}
            />
          </div>
        </WindowFrame>
      </div>

      <AnimatedCursor positions={cursorPositions} />

      <FeatureBadge
        text="3D-Körperkarte — automatische Benennung der Körperstelle"
        delay={20}
        icon="🎯"
      />
    </AbsoluteFill>
  );
};
