import i18n from "@/i18n";
import type { LesionClassification } from "@/types/patient";

const CLS_I18N_KEY: Record<LesionClassification, string> = {
  unclassified: "cls_unclassified",
  naevus: "cls_naevus",
  melanoma_suspect: "cls_melanoma_suspect",
  bcc: "cls_bcc",
  scc: "cls_scc",
  keratosis: "cls_keratosis",
  dermatofibroma: "cls_dermatofibroma",
  vascular: "cls_vascular",
  other: "cls_other",
};

/** Returns the translated label for a classification */
export function getClassificationLabel(cls: LesionClassification): string {
  const key = CLS_I18N_KEY[cls];
  if (!key) return cls;
  return i18n.t(key);
}
