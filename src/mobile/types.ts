// Domain-Typen für den neuen Mobile-Workflow (Marker-zentriert)
// Spiegelt das Backend-Schema (clinical_photos, lesions, lesion_assets).
// Wird auch von Capacitor-Versionen wiederverwendet.

export type LesionAssetKind =
  | "clinical"
  | "dermoscopy"
  | "finding"
  | "abcde"
  | "ai";

export interface ClinicalPhoto {
  id: number;
  patient_id: number;
  file_path: string;
  body_region?: string | null;
  taken_at: string;
  created_by?: number | null;
  created_at: string;
  lesion_count?: number;
}

export interface Lesion {
  id: string; // UUID - dauerhaft, niemals neu vergeben
  patient_id: number;
  clinical_photo_id: number;
  label: string; // z. B. "L5" - wird nach Anlegen NIE automatisch geändert
  x_pct: number; // 0..1
  y_pct: number; // 0..1
  notes?: string | null;
  created_at: string;
  updated_at?: string | null;
  asset_count?: number;
}

export interface LesionAsset {
  id: number;
  lesion_id: string;
  kind: LesionAssetKind;
  file_path: string | null;
  payload_json?: Record<string, unknown> | null;
  taken_at: string;
  sort_order: number;
  created_at: string;
}

export interface MobilePatient {
  id: number;
  name: string;
  first_name?: string | null;
  last_name?: string | null;
  patient_number?: string | null;
  birth_date?: string | null;
  gender?: string | null;
}
