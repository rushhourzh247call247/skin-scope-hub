/**
 * Determines the anatomical region name based on 3D coordinates from the body model.
 * 
 * Coordinate system:
 * - y3d: height (head ~1.8+, feet ~-1.5)
 * - x3d: left/right (negative = patient's right side, positive = patient's left side)
 * - z3d: front/back (positive = front)
 * - view: "front" or "back" for front/back differentiation
 */

type View = "front" | "back";

interface AnatomyZone {
  name: string;
  nameFront?: string;
  nameBack?: string;
  yMin: number;
  yMax: number;
  xMinAbs?: number; // minimum |x3d| — for arm detection
  xMaxAbs?: number; // maximum |x3d|
  useSide?: boolean; // prepend "Linker/Rechter" or "Linke/Rechte"
  sideGender?: "m" | "f"; // grammatical gender for side prefix
}

// Zones are checked top-to-bottom; first match wins.
// Arms are detected by |x3d| > threshold at certain heights.

const ARM_X_THRESHOLD = 0.55;

function getSidePrefix(x3d: number, gender: "m" | "f" = "m"): string {
  // Negative x = patient's right side (mirrored in 3D view)
  if (gender === "f") {
    return x3d < 0 ? "Rechte" : "Linke";
  }
  return x3d < 0 ? "Rechter" : "Linker";
}

export function getAnatomicalName(
  x3d: number,
  y3d: number,
  z3d: number,
  view: View
): string {
  const absX = Math.abs(x3d);
  const isFront = view === "front";

  // --- Head ---
  if (y3d >= 1.75) {
    return isFront ? "Stirn" : "Hinterkopf";
  }

  // --- Neck ---
  if (y3d >= 1.55) {
    return isFront ? "Hals" : "Nacken";
  }

  // --- Arms (detected by x offset) ---
  if (absX > ARM_X_THRESHOLD) {
    const side = getSidePrefix(x3d);
    const sideF = getSidePrefix(x3d, "f");

    // Hand
    if (y3d < 0.15) {
      return `${sideF} Hand`;
    }
    // Lower arm
    if (y3d < 0.65) {
      return `${side} Unterarm`;
    }
    // Upper arm
    if (y3d < 1.15) {
      return `${side} Oberarm`;
    }
    // Shoulder region
    return `${sideF} Schulter`;
  }

  // --- Torso & below (|x3d| <= threshold) ---

  // Shoulder / upper chest area
  if (y3d >= 1.35) {
    if (absX > 0.3) {
      const sideF = getSidePrefix(x3d, "f");
      return isFront ? `${sideF} Schulter` : `${sideF} Schulter (dorsal)`;
    }
    return isFront ? "Obere Brust" : "Oberer Rücken";
  }

  // Chest / upper back
  if (y3d >= 0.95) {
    return isFront ? "Brust" : "Oberer Rücken";
  }

  // Abdomen / mid back
  if (y3d >= 0.45) {
    return isFront ? "Bauch" : "Mittlerer Rücken";
  }

  // Lower abdomen / lower back
  if (y3d >= 0.05) {
    return isFront ? "Unterbauch" : "Unterer Rücken";
  }

  // Hip / gluteal
  if (y3d >= -0.25) {
    if (absX > 0.25) {
      const sideF = getSidePrefix(x3d, "f");
      return isFront ? `${sideF} Hüfte` : `${sideF} Gesäßhälfte`;
    }
    return isFront ? "Hüfte" : "Gesäß";
  }

  // --- Legs ---
  const side = getSidePrefix(x3d);

  // Upper thigh
  if (y3d >= -0.75) {
    return `${side} Oberschenkel`;
  }

  // Lower thigh / knee area
  if (y3d >= -1.05) {
    return isFront ? `${side} Oberschenkel (distal)` : `${side} Oberschenkel (dorsal)`;
  }

  // Knee
  if (y3d >= -1.2) {
    return isFront ? `${side} Knie` : `${sideF(x3d)} Kniekehle`;
  }

  // Lower leg
  if (y3d >= -1.65) {
    return `${side} Unterschenkel`;
  }

  // Foot
  return `${side} Fuß`;
}

// Helper needed for knee back — fix inline
function sideF(x3d: number): string {
  return getSidePrefix(x3d, "f");
}
