/**
 * Maps an anatomical zone name (from ANATOMICAL_ZONES) to a 3D anchor
 * point on the body model, using calibration data collected via /calibrate.
 * Used for the "Neue Zone" workflow: doctor picks a body part from a
 * dropdown instead of clicking on the 3D body.
 */
import { calibrationData } from "./calibrationData";
import type { Gender } from "@/types/patient";

export interface ZoneAnchor {
  x3d: number;
  y3d: number;
  z3d: number;
  view: "front" | "back";
  /** Approximate 2D coords (0-200 / 0-500) — kept for legacy fields. */
  x: number;
  y: number;
}

/**
 * Aliases between ANATOMICAL_ZONES labels and calibrationData labels.
 * Calibration uses "Augenbraue links", anatomy uses "Linke Augenbraue", etc.
 */
function normalize(name: string): string[] {
  const candidates = new Set<string>();
  candidates.add(name);

  // "Linke X" → "X links", "Rechte X" → "X rechts"
  const m1 = name.match(/^(Linker?|Linke|Linkes)\s+(.+)$/);
  if (m1) candidates.add(`${m1[2]} links`);
  const m2 = name.match(/^(Rechter?|Rechte|Rechtes)\s+(.+)$/);
  if (m2) candidates.add(`${m2[2]} rechts`);

  // "Bauch" sometimes calibrated as "Bauch (oben)" or "Bauchnabel"
  if (name === "Bauch") {
    candidates.add("Bauch (oben)");
    candidates.add("Bauchnabel");
  }
  return Array.from(candidates);
}

export function getZoneAnchorFromName(name: string, gender: Gender): ZoneAnchor | null {
  const candidates = normalize(name);
  // First try exact gender match
  for (const cand of candidates) {
    const hit = calibrationData.find(c => c.gender === gender && c.label === cand);
    if (hit) return toAnchor(hit);
  }
  // Fall back to opposite gender
  for (const cand of candidates) {
    const hit = calibrationData.find(c => c.label === cand);
    if (hit) return toAnchor(hit);
  }
  return null;
}

function toAnchor(c: typeof calibrationData[number]): ZoneAnchor {
  // Convert 3D coords into the legacy 2D scale used by the SVG fallback.
  // x3d range ≈ [-0.8, 0.8] → x in [0, 200]; y3d range ≈ [-1.2, 1.2] → y in [0, 500]
  const x = Math.round(((c.x3d + 1) / 2) * 200);
  const y = Math.round(((1.2 - c.y3d) / 2.4) * 500);
  return {
    x3d: c.x3d,
    y3d: c.y3d,
    z3d: c.z3d,
    view: c.view as "front" | "back",
    x: Math.max(0, Math.min(200, x)),
    y: Math.max(0, Math.min(500, y)),
  };
}
