export type Gender = "female" | "male";
export type LocationType = "spot" | "region";

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

export interface LocationImage {
  id: number;
  location_id: number;
  image_path: string;
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
  created_at?: string;
  updated_at?: string;
  images?: LocationImage[];
}

export interface Finding {
  id: number;
  location_id: number;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FullPatient extends Patient {
  locations: (Location & {
    images: LocationImage[];
    findings?: Finding[];
  })[];
}
