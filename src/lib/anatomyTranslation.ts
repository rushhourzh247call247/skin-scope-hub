/**
 * Translates anatomical zone names between German (stored in DB) and the current UI language.
 * German is the canonical storage language — all other languages are derived via i18n keys.
 */
import i18n from "@/i18n";

/** Map from German zone name → i18n key (under "anatomy.*") */
const DE_TO_KEY: Record<string, string> = {
  // Kopf / Gesicht
  "Stirn": "anatomy.forehead",
  "Linke Augenbraue": "anatomy.leftEyebrow",
  "Rechte Augenbraue": "anatomy.rightEyebrow",
  "Linke Augenregion": "anatomy.leftEyeArea",
  "Rechte Augenregion": "anatomy.rightEyeArea",
  "Nasenwurzel": "anatomy.nasalBridge",
  "Nase": "anatomy.nose",
  "Linke Wange": "anatomy.leftCheek",
  "Rechte Wange": "anatomy.rightCheek",
  "Mund": "anatomy.mouth",
  "Kinn": "anatomy.chin",
  "Linkes Ohr": "anatomy.leftEar",
  "Rechtes Ohr": "anatomy.rightEar",
  // Kopf hinten
  "Hinterkopf": "anatomy.backOfHead",
  "Hinterkopf (unterer)": "anatomy.lowerBackOfHead",
  // Hals
  "Hals": "anatomy.throat",
  "Nacken": "anatomy.nape",
  // Schultern
  "Linke Schulter": "anatomy.leftShoulder",
  "Rechte Schulter": "anatomy.rightShoulder",
  "Linke Schulter (dorsal)": "anatomy.leftShoulderDorsal",
  "Rechte Schulter (dorsal)": "anatomy.rightShoulderDorsal",
  // Brust / Rücken
  "Obere Brust": "anatomy.upperChest",
  "Brust": "anatomy.chest",
  "Oberer Rücken": "anatomy.upperBack",
  // Bauch / Rücken
  "Bauch": "anatomy.abdomen",
  "Mittlerer Rücken": "anatomy.midBack",
  "Unterer Rücken": "anatomy.lowerBack",
  // Unterbauch / Becken
  "Unterbauch": "anatomy.lowerAbdomen",
  "Linke Hüfte": "anatomy.leftHip",
  "Rechte Hüfte": "anatomy.rightHip",
  "Gesäß": "anatomy.buttocks",
  "Linke Gesäßhälfte": "anatomy.leftButtock",
  "Rechte Gesäßhälfte": "anatomy.rightButtock",
  // Arme
  "Linker Oberarm": "anatomy.leftUpperArm",
  "Rechter Oberarm": "anatomy.rightUpperArm",
  "Linker Unterarm": "anatomy.leftForearm",
  "Rechter Unterarm": "anatomy.rightForearm",
  "Linke Hand": "anatomy.leftHand",
  "Rechte Hand": "anatomy.rightHand",
  // Beine
  "Linker Oberschenkel": "anatomy.leftThigh",
  "Rechter Oberschenkel": "anatomy.rightThigh",
  "Linker Oberschenkel (distal)": "anatomy.leftThighDistal",
  "Rechter Oberschenkel (distal)": "anatomy.rightThighDistal",
  "Linker Oberschenkel (dorsal)": "anatomy.leftThighDorsal",
  "Rechter Oberschenkel (dorsal)": "anatomy.rightThighDorsal",
  "Linkes Knie": "anatomy.leftKnee",
  "Rechtes Knie": "anatomy.rightKnee",
  "Linke Kniekehle": "anatomy.leftPopliteal",
  "Rechte Kniekehle": "anatomy.rightPopliteal",
  "Linker Unterschenkel": "anatomy.leftShin",
  "Rechter Unterschenkel": "anatomy.rightShin",
  "Linke Wade": "anatomy.leftCalf",
  "Rechte Wade": "anatomy.rightCalf",
  "Linker Fuß": "anatomy.leftFoot",
  "Rechter Fuß": "anatomy.rightFoot",
  "Linke Ferse": "anatomy.leftHeel",
  "Rechte Ferse": "anatomy.rightHeel",
};

/**
 * Translate a German anatomical zone name to the current UI language.
 * If no mapping exists (e.g. custom user-entered name), returns the original.
 */
export function translateAnatomyName(germanName: string | null | undefined): string {
  if (!germanName) return "";
  const key = DE_TO_KEY[germanName];
  if (!key) return germanName; // custom name or unknown → show as-is
  return i18n.t(key);
}

/**
 * Get all anatomical zones translated to the current language.
 * Returns array of { de: string, translated: string } for dropdowns.
 */
export function getTranslatedZones(): { de: string; translated: string }[] {
  return Object.entries(DE_TO_KEY).map(([de, key]) => ({
    de,
    translated: i18n.t(key),
  }));
}

/**
 * Translate neighbor zone names for dropdown suggestions.
 */
export function translateNeighborZones(germanZones: string[]): { de: string; translated: string }[] {
  return germanZones.map((de) => ({
    de,
    translated: translateAnatomyName(de),
  }));
}
