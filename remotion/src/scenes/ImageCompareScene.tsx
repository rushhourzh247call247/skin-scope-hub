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
import { FeatureBadge } from "../components/SharedComponents";

export const ImageCompareScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scaleIn = spring({ frame: frame - 5, fps, config: { damping: 20, stiffness: 180 } });

  // Animated slider position
  const sliderX = interpolate(
    frame,
    [20, 90],
    [0.3, 0.7],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const imgWidth = 500;
  const imgHeight = 500;

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
          transform: `scale(${interpolate(scaleIn, [0, 1], [0.9, 1])})`,
          opacity: interpolate(scaleIn, [0, 1], [0, 1]),
          display: "flex",
          gap: 40,
          alignItems: "center",
        }}
      >
        {/* Before */}
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: 16,
              color: "rgba(255,255,255,0.5)",
              fontFamily: "sans-serif",
              marginBottom: 12,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            Vorher
          </div>
          <div
            style={{
              width: imgWidth,
              height: imgHeight,
              borderRadius: 16,
              overflow: "hidden",
              boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
              border: "2px solid rgba(255,255,255,0.1)",
            }}
          >
            <Img
              src={staticFile("images/mole1.jpg")}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
          <div
            style={{
              fontSize: 14,
              color: "rgba(255,255,255,0.4)",
              fontFamily: "sans-serif",
              marginTop: 8,
            }}
          >
            10.01.2026
          </div>
        </div>

        {/* Comparison slider */}
        <div style={{ position: "relative", textAlign: "center" }}>
          <div
            style={{
              fontSize: 16,
              color: "rgba(255,255,255,0.5)",
              fontFamily: "sans-serif",
              marginBottom: 12,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            Overlay-Vergleich
          </div>
          <div
            style={{
              width: imgWidth,
              height: imgHeight,
              borderRadius: 16,
              overflow: "hidden",
              position: "relative",
              boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
              border: "2px solid rgba(45,212,191,0.3)",
            }}
          >
            <Img
              src={staticFile("images/mole2.jpg")}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                position: "absolute",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: `${sliderX * 100}%`,
                height: "100%",
                overflow: "hidden",
              }}
            >
              <Img
                src={staticFile("images/mole1.jpg")}
                style={{
                  width: imgWidth,
                  height: imgHeight,
                  objectFit: "cover",
                }}
              />
            </div>
            {/* Slider line */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: `${sliderX * 100}%`,
                width: 3,
                height: "100%",
                background: "#2dd4bf",
                boxShadow: "0 0 10px rgba(45,212,191,0.5)",
              }}
            />
            {/* Slider handle */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: `${sliderX * 100}%`,
                transform: "translate(-50%, -50%)",
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "#2dd4bf",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                color: "white",
                boxShadow: "0 4px 20px rgba(45,212,191,0.4)",
              }}
            >
              ↔
            </div>
          </div>
        </div>

        {/* After */}
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: 16,
              color: "rgba(255,255,255,0.5)",
              fontFamily: "sans-serif",
              marginBottom: 12,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            Nachher
          </div>
          <div
            style={{
              width: imgWidth,
              height: imgHeight,
              borderRadius: 16,
              overflow: "hidden",
              boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
              border: "2px solid rgba(255,255,255,0.1)",
            }}
          >
            <Img
              src={staticFile("images/mole2.jpg")}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
          <div
            style={{
              fontSize: 14,
              color: "rgba(255,255,255,0.4)",
              fontFamily: "sans-serif",
              marginTop: 8,
            }}
          >
            10.04.2026
          </div>
        </div>
      </div>

      <FeatureBadge
        text="Bildvergleich mit KI-Ausrichtung (OpenCV)"
        delay={15}
        icon="🔍"
      />
    </AbsoluteFill>
  );
};
