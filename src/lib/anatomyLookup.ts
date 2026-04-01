/**
 * Determines the anatomical region name based on 3D coordinates from the body model.
 *
 * Coordinate system:
 * - y3d: height (head ~1.8+, feet ~-1.5)
 * - x3d: left/right (negative = patient's right, positive = patient's left)
 * - view: "front" or "back"
 */

type View = "front" | "back";

const ARM_X_THRESHOLD = 0.55;

function sideM(x3d: number): string {
  return x3d < 0 ? "Rechter" : "Linker";
}

function sideF(x3d: number): string {
  return x3d < 0 ? "Rechte" : "Linke";
}

export function getAnatomicalName(
  x3d: number,
  y3d: number,
  _z3d: number,
  view: View,
): string {
  const absX = Math.abs(x3d);
  const isFront = view === "front";

  // Head
  if (y3d >= 1.75) return isFront ? "Stirn" : "Hinterkopf";

  // Neck
  if (y3d >= 1.55) return isFront ? "Hals" : "Nacken";

  // Arms (high x offset)
  if (absX > ARM_X_THRESHOLD) {
    if (y3d < 0.15) return `${sideF(x3d)} Hand`;
    if (y3d < 0.65) return `${sideM(x3d)} Unterarm`;
    if (y3d < 1.15) return `${sideM(x3d)} Oberarm`;
    return `${sideF(x3d)} Schulter`;
  }

  // Shoulders
  if (y3d >= 1.35) {
    if (absX > 0.3) return isFront ? `${sideF(x3d)} Schulter` : `${sideF(x3d)} Schulter (dorsal)`;
    return isFront ? "Obere Brust" : "Oberer Rücken";
  }

  // Chest / upper back
  if (y3d >= 0.75) return isFront ? "Brust" : "Oberer Rücken";

  // Abdomen / mid back
  if (y3d >= 0.30) return isFront ? "Bauch" : "Mittlerer Rücken";

  // Lower abdomen / lower back
  if (y3d >= -0.05) return isFront ? "Unterbauch" : "Unterer Rücken";

  // Hip / gluteal
  if (y3d >= -0.30) {
    if (absX > 0.25) return isFront ? `${sideF(x3d)} Hüfte` : `${sideF(x3d)} Gesäßhälfte`;
    return isFront ? "Hüfte" : "Gesäß";
  }

  // Upper thigh
  if (y3d >= -0.80) return `${sideM(x3d)} Oberschenkel`;

  // Lower thigh
  if (y3d >= -1.10) return isFront ? `${sideM(x3d)} Oberschenkel (distal)` : `${sideM(x3d)} Oberschenkel (dorsal)`;

  // Knee
  if (y3d >= -1.2) return isFront ? `${sideM(x3d)} Knie` : `${sideF(x3d)} Kniekehle`;

  // Lower leg
  if (y3d >= -1.65) return `${sideM(x3d)} Unterschenkel`;

  // Foot
  return `${sideM(x3d)} Fuß`;
}
