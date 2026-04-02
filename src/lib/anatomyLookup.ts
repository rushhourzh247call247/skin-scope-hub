/**
 * Determines the anatomical region name based on 3D coordinates from the body model.
 *
 * Calibrated from real marker placement on the male model (2026-04-02).
 * Coordinate system: model height ≈ 2.35 units, y range ≈ -1.18 to +1.19.
 * x3d: left/right (negative = patient's right, positive = patient's left)
 * view: "front" or "back"
 */

type View = "front" | "back";

/** Arms extend beyond this |x| from the body center */
const ARM_X_THRESHOLD = 0.32;

function sideM(x3d: number): string {
  return x3d < 0 ? "Rechter" : "Linker";
}

function sideF(x3d: number): string {
  return x3d < 0 ? "Rechte" : "Linke";
}

/**
 * Face detail zones (front only).
 * Based on calibration: Stirn 1.19, Augenbraue 1.13, Auge 1.10,
 * Nase 1.06, Wange 1.05, Mund 1.01, Kinn 0.96
 */
function getFaceZone(x3d: number, y3d: number): string {
  const absX = Math.abs(x3d);

  // Ohr: seitlich vom Kopf, absX > 0.07, Höhe zwischen Auge und Kinn (~0.95–1.16)
  // Calibration estimate: ears at x≈±0.09, y≈1.05 (level with eyes/cheeks)
  if (absX > 0.10 && y3d >= 1.02 && y3d <= 1.10) return `${sideF(x3d)}s Ohr`;

  // Stirn: above eyebrow level
  if (y3d >= 1.16) return "Stirn";

  // Augenbraue: 1.11–1.16
  if (y3d >= 1.11) return absX > 0.02 ? `${sideF(x3d)} Augenbraue` : "Stirn";

  // Auge: 1.08–1.11
  if (y3d >= 1.08) return absX > 0.02 ? `${sideF(x3d)} Augenregion` : "Nasenwurzel";

  // Nase / Wange: 1.03–1.08
  if (y3d >= 1.03) return absX > 0.03 ? `${sideF(x3d)} Wange` : "Nase";

  // Mund: 0.98–1.03
  if (y3d >= 0.98) return absX > 0.04 ? `${sideF(x3d)} Wange` : "Mund";

  // Kinn: 0.93–0.98
  return "Kinn";
}

export function getAnatomicalName(
  x3d: number,
  y3d: number,
  _z3d: number,
  view: View,
): string {
  const absX = Math.abs(x3d);
  const isFront = view === "front";

  // ── Head & Face ──
  // Calibration: kinn at 0.956, hals at 0.898 → boundary ≈ 0.93
  if (y3d >= 0.93) {
    // Ohren: seitlich vom Kopf, auch von hinten sichtbar
    if (absX > 0.09 && y3d >= 1.00 && y3d <= 1.12) return `${sideF(x3d)}s Ohr`;
    if (isFront) return getFaceZone(x3d, y3d);
    return y3d >= 1.05 ? "Hinterkopf" : "Hinterkopf (unterer)";
  }

  // ── Neck ──
  // Calibration: hals 0.898, schulter top ~0.84 → boundary ≈ 0.87
  if (y3d >= 0.87) return isFront ? "Hals" : "Nacken";

  // ── Arms (high x offset — beyond torso width) ──
  // Calibration: Oberarm x≈0.38 y≈0.60, Unterarm x≈0.49 y≈0.34, Hand x≈0.63 y≈0.10
  if (absX > ARM_X_THRESHOLD) {
    if (y3d < 0.22) return `${sideF(x3d)} Hand`;
    if (y3d < 0.47) return `${sideM(x3d)} Unterarm`;
    if (y3d < 0.72) return `${sideM(x3d)} Oberarm`;
    return `${sideF(x3d)} Schulter`;
  }

  // ── Shoulders (wide but not arm-level) ──
  // Calibration: schulter at y≈0.84, absX≈0.23
  if (y3d >= 0.81) {
    if (absX > 0.15) return isFront ? `${sideF(x3d)} Schulter` : `${sideF(x3d)} Schulter (dorsal)`;
    return isFront ? "Obere Brust" : "Oberer Rücken";
  }

  // ── Upper chest / upper back ──
  // Calibration: obere Brust 0.779, Brust 0.605 → boundary ≈ 0.69
  if (y3d >= 0.69) return isFront ? "Obere Brust" : "Oberer Rücken";

  // ── Chest / back ──
  // Calibration: Brust 0.605, Bauch oben 0.518 → boundary ≈ 0.56
  if (y3d >= 0.56) return isFront ? "Brust" : "Oberer Rücken";

  // ── Upper abdomen / mid back ──
  // Calibration: Bauch oben 0.518, Bauchnabel 0.221 → boundary ≈ 0.37
  if (y3d >= 0.37) return isFront ? "Bauch" : "Mittlerer Rücken";

  // ── Navel area / lower back ──
  // Calibration: Bauchnabel 0.221, Unterbauch 0.140 → boundary ≈ 0.18
  if (y3d >= 0.18) return isFront ? "Bauch" : "Unterer Rücken";

  // ── Lower abdomen / lower back ──
  // Calibration: Unterbauch 0.140, Hüfte 0.145, Oberschenkel -0.10 → boundary ≈ 0.02
  if (y3d >= 0.02) {
    if (absX > 0.12) return isFront ? `${sideF(x3d)} Hüfte` : `${sideF(x3d)} Gesäßhälfte`;
    return isFront ? "Unterbauch" : "Gesäß";
  }

  // ── Upper thigh ──
  // Calibration: Oberschenkel -0.10, Knie -0.48 → boundary ≈ -0.29
  if (y3d >= -0.29) return `${sideM(x3d)} Oberschenkel`;

  // ── Lower thigh ──
  // Boundary between upper thigh and knee ≈ -0.43
  if (y3d >= -0.43) return isFront ? `${sideM(x3d)} Oberschenkel (distal)` : `${sideM(x3d)} Oberschenkel (dorsal)`;

  // ── Knee ──
  // Calibration: Knie -0.48, Unterschenkel -0.69 → boundary ≈ -0.58
  if (y3d >= -0.53) return isFront ? `${sideM(x3d)} Knie` : `${sideF(x3d)} Kniekehle`;

  // ── Lower leg / calf ──
  // Calibration: Unterschenkel -0.69, Fuß -1.13 → boundary ≈ -0.91
  if (y3d >= -0.91) return isFront ? `${sideM(x3d)} Unterschenkel` : `${sideF(x3d)} Wade`;

  // ── Foot ──
  return isFront ? `${sideM(x3d)} Fuß` : `${sideF(x3d)} Ferse`;
}
