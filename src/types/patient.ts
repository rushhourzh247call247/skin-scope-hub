export type Gender = "female" | "male";

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
