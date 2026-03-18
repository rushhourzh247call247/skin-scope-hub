export interface Patient {
  id: number;
  name: string;
  birth_date: string;
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
