/**
 * Determines the anatomical region name based on 3D coordinates from the body model.
 *
 * Coordinate system (after Center + normalizedScale in BodyMap3D):
 * - Model height ≈ 2.5 units, centered → y range: -1.25 (feet) to +1.25 (head)
 * - x3d: left/right (negative = patient's right, positive = patient's left)
 * - view: "front" or "back"
 */

type View = "front" | "back";

/** Arms extend beyond this |x| from the body center */
const ARM_X_THRESHOLD = 0.38;

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

  // Head (top of model down to forehead/crown)
  if (y3d >= 0.95) return isFront ? "Stirn" : "Hinterkopf";

  // Neck
  if (y3d >= 0.82) return isFront ? "Hals" : "Nacken";

  // Arms (high x offset — beyond torso width)
  if (absX > ARM_X_THRESHOLD) {
    if (y3d < -0.55) return `${sideF(x3d)} Hand`;
    if (y3d < -0.15) return `${sideM(x3d)} Unterarm`;
    if (y3d < 0.45) return `${sideM(x3d)} Oberarm`;
    return `${sideF(x3d)} Schulter`;
  }

  // Shoulders (wide but not arm-level)
  if (y3d >= 0.65) {
    if (absX > 0.2) return isFront ? `${sideF(x3d)} Schulter` : `${sideF(x3d)} Schulter (dorsal)`;
    return isFront ? "Obere Brust" : "Oberer Rücken";
  }

  // Chest / upper back
  if (y3d >= 0.30) return isFront ? "Brust" : "Oberer Rücken";

  // Abdomen / mid back
  if (y3d >= 0.00) return isFront ? "Bauch" : "Mittlerer Rücken";

  // Lower abdomen / lower back
  if (y3d >= -0.20) return isFront ? "Unterbauch" : "Unterer Rücken";

  // Hip / gluteal
  if (y3d >= -0.40) {
    if (absX > 0.15) return isFront ? `${sideF(x3d)} Hüfte` : `${sideF(x3d)} Gesäßhälfte`;
    return isFront ? "Hüfte" : "Gesäß";
  }

  // Upper thigh
  if (y3d >= -0.65) return `${sideM(x3d)} Oberschenkel`;

  // Lower thigh
  if (y3d >= -0.82) return isFront ? `${sideM(x3d)} Oberschenkel (distal)` : `${sideM(x3d)} Oberschenkel (dorsal)`;

  // Knee
  if (y3d >= -0.90) return isFront ? `${sideM(x3d)} Knie` : `${sideF(x3d)} Kniekehle`;

  // Lower leg
  if (y3d >= -1.10) return `${sideM(x3d)} Unterschenkel`;

  // Foot
  return `${sideM(x3d)} Fuß`;
}
