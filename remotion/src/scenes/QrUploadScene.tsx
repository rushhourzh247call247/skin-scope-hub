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

export const QrUploadScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const windowScale = spring({ frame: frame - 5, fps, config: { damping: 20, stiffness: 180 } });

  // Simulate a QR code overlay appearing
  const qrScale = spring({ frame: frame - 30, fps, config: { damping: 15, stiffness: 200 } });

  const cursorPositions = [
    { x: 700, y: 300, frame: 0 },
    { x: 1350, y: 120, frame: 20, click: true },
    { x: 800, y: 400, frame: 60 },
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

      {/* QR Code overlay */}
      <div
        style={{
          position: "absolute",
          transform: `scale(${qrScale})`,
          opacity: interpolate(qrScale, [0, 1], [0, 1]),
          background: "white",
          borderRadius: 20,
          padding: 30,
          boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "#1a2332",
            fontFamily: "sans-serif",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          📱 QR-Upload
        </div>
        {/* Fake QR grid */}
        <div
          style={{
            width: 180,
            height: 180,
            background: "#111",
            borderRadius: 8,
            display: "grid",
            gridTemplateColumns: "repeat(9, 1fr)",
            gridTemplateRows: "repeat(9, 1fr)",
            gap: 2,
            padding: 8,
          }}
        >
          {Array.from({ length: 81 }).map((_, i) => (
            <div
              key={i}
              style={{
                background: Math.random() > 0.4 ? "white" : "#111",
                borderRadius: 1,
              }}
            />
          ))}
        </div>
        <div
          style={{
            fontSize: 13,
            color: "#666",
            fontFamily: "sans-serif",
            textAlign: "center",
            maxWidth: 200,
          }}
        >
          Bilder landen sicher beim richtigen Patienten
        </div>
      </div>

      <AnimatedCursor positions={cursorPositions} />

      <FeatureBadge
        text="Mobiler Upload via QR-Code — sicher & direkt"
        delay={35}
        icon="📲"
        y={980}
      />
    </AbsoluteFill>
  );
};
