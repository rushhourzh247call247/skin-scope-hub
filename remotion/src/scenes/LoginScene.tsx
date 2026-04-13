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

export const LoginScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const windowScale = spring({ frame: frame - 5, fps, config: { damping: 20, stiffness: 180 } });
  const windowOpacity = interpolate(windowScale, [0, 1], [0, 1]);

  const cursorPositions = [
    { x: 200, y: 100, frame: 0 },
    { x: 760, y: 395, frame: 20, click: true },
    { x: 760, y: 462, frame: 50, click: true },
    { x: 760, y: 510, frame: 80, click: true },
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
          opacity: windowOpacity,
        }}
      >
        <WindowFrame>
          <div style={{ position: "relative", width: "100%", height: "100%" }}>
            <Img
              src={staticFile("images/screenshot-login.png")}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            {/* Blur email/password fields */}
            <BlurOverlay x={505} y={335} width={310} height={30} />
            <BlurOverlay x={505} y={400} width={310} height={30} />
          </div>
        </WindowFrame>
      </div>

      <AnimatedCursor positions={cursorPositions} />

      <FeatureBadge
        text="Sichere Anmeldung mit 2-Faktor-Authentifizierung"
        delay={30}
        icon="🔐"
      />
    </AbsoluteFill>
  );
};
