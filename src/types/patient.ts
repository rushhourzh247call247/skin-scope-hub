export type Gender = "female" | "male";
export type LocationType = "spot" | "region";
export type LesionClassification =
  | "unclassified"
  | "naevus"
  | "melanoma_suspect"
  | "bcc"
  | "scc"
  | "keratosis"
  | "dermatofibroma"
  | "vascular"
  | "other";

export const LESION_CLASSIFICATIONS: Record<LesionClassification, { label: string; color: string; shortLabel: string }> = {
  unclassified: { label: "Nicht klassifiziert", color: "#64748b", shortLabel: "–" },
  naevus: { label: "Nävus (Muttermal)", color: "#22c55e", shortLabel: "NÄV" },
  melanoma_suspect: { label: "Melanom-Verdacht", color: "#ef4444", shortLabel: "MEL" },
  bcc: { label: "Basalzellkarzinom", color: "#f97316", shortLabel: "BCC" },
  scc: { label: "Plattenepithelkarzinom", color: "#dc2626", shortLabel: "SCC" },
  keratosis: { label: "Keratose", color: "#eab308", shortLabel: "KER" },
  dermatofibroma: { label: "Dermatofibrom", color: "#8b5cf6", shortLabel: "DFB" },
  vascular: { label: "Vaskuläre Läsion", color: "#ec4899", shortLabel: "VAS" },
  other: { label: "Andere", color: "#6b7280", shortLabel: "AND" },
};

export interface Patient {
  id: number;
  name: string;
  birth_date: string;
  gender: Gender;
  email?: string;
  phone?: string;
  insurance_number?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AiAnalysis {
  result: string;
  risk: string;
  created_at: string;
}

export interface LocationImage {
  id: number;
  location_id: number;
  image_path?: string;
  file_path?: string;
  image_url?: string;
  note?: string;
  ai_analysis?: AiAnalysis;
  created_at?: string;
  updated_at?: string;
}

export interface Location {
  id: number;
  patient_id: number;
  name?: string;
  x: number;
  y: number;
  view?: "front" | "back";
  type?: LocationType;
  width?: number;   // region width in 2D coords (0-200 scale)
  height?: number;  // region height in 2D coords (0-500 scale)
  x3d?: number;     // persisted 3D anchor point for stable marker placement
  y3d?: number;
  z3d?: number;
  nx?: number;      // persisted surface normal at anchor point
  ny?: number;
  nz?: number;
  classification?: LesionClassification;
  created_at?: string;
  updated_at?: string;
  images?: LocationImage[];
}

export interface Finding {
  id: number;
  location_id: number;
  description?: string;
  user_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FullPatient extends Patient {
  locations: (Location & {
    images: LocationImage[];
    findings?: Finding[];
  })[];
}
