import type { Patient, FullPatient, Location, LocationImage, Finding } from "@/types/patient";

export interface MockCompany {
  id: number;
  name: string;
  created_at: string;
}

export interface MockUser {
  id: number;
  name: string;
  email: string;
  role: string;
  company_id: number;
  company?: { id: number; name: string };
}

// --- Companies ---
let companies: MockCompany[] = [
  { id: 1, name: "Hautarztpraxis Zürich", created_at: "2025-01-15T10:00:00Z" },
  { id: 2, name: "Dermatologie Bern", created_at: "2025-02-20T14:30:00Z" },
  { id: 3, name: "Hautklinik Basel", created_at: "2025-03-10T09:00:00Z" },
];

// --- Users ---
let users: MockUser[] = [
  { id: 1, name: "Dr. Anna Müller", email: "admin@derm247.ch", role: "admin", company_id: 1, company: { id: 1, name: "Hautarztpraxis Zürich" } },
  { id: 2, name: "Dr. Peter Meier", email: "p.meier@derm247.ch", role: "user", company_id: 1, company: { id: 1, name: "Hautarztpraxis Zürich" } },
  { id: 3, name: "Dr. Sara Weber", email: "s.weber@dermbern.ch", role: "user", company_id: 2, company: { id: 2, name: "Dermatologie Bern" } },
];

// --- Demo images (placeholder URLs) ---
const demoImages: LocationImage[] = [
  { id: 1, location_id: 1, image_path: "https://images.unsplash.com/photo-1612776572997-76cc42e058c3?w=300&h=400&fit=crop", created_at: "2025-06-01T10:00:00Z" },
  { id: 2, location_id: 1, image_path: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=300&h=400&fit=crop", created_at: "2025-07-15T11:30:00Z" },
  { id: 3, location_id: 1, image_path: "https://images.unsplash.com/photo-1559757175-5700dde675bc?w=300&h=400&fit=crop", created_at: "2025-09-20T14:00:00Z" },
  { id: 4, location_id: 2, image_path: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=300&h=400&fit=crop", created_at: "2025-08-10T09:00:00Z" },
  { id: 5, location_id: 3, image_path: "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=300&h=400&fit=crop", created_at: "2025-10-05T16:00:00Z" },
  { id: 6, location_id: 4, image_path: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=300&h=400&fit=crop", created_at: "2025-11-01T08:00:00Z" },
  { id: 7, location_id: 4, image_path: "https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=300&h=400&fit=crop", created_at: "2026-01-12T10:30:00Z" },
];

// --- Patients with locations ---
let patients: Patient[] = [
  { id: 1, name: "Maria Schneider", birth_date: "1985-03-14", created_at: "2025-05-20T08:30:00Z" },
  { id: 2, name: "Thomas Brunner", birth_date: "1972-11-08", created_at: "2025-06-15T10:00:00Z" },
  { id: 3, name: "Elena Fischer", birth_date: "1990-07-22", created_at: "2025-08-01T14:00:00Z" },
  { id: 4, name: "Hans Keller", birth_date: "1958-01-30", created_at: "2025-09-10T09:15:00Z" },
  { id: 5, name: "Sophie Huber", birth_date: "1995-12-05", created_at: "2025-10-22T11:45:00Z" },
  { id: 6, name: "Marco Rossi", birth_date: "1968-06-17", created_at: "2025-11-30T16:00:00Z" },
];

let locations: (Location & { images: LocationImage[]; findings: Finding[] })[] = [
  { id: 1, patient_id: 1, name: "Linker Unterarm", x: 30.5, y: 35.2, created_at: "2025-06-01T10:00:00Z", images: demoImages.filter(i => i.location_id === 1), findings: [{ id: 1, location_id: 1, description: "Verdacht auf Basalzellkarzinom, 5mm Durchmesser", created_at: "2025-06-01T10:00:00Z" }] },
  { id: 2, patient_id: 1, name: "Rechte Schulter", x: 72.0, y: 20.1, created_at: "2025-08-10T09:00:00Z", images: demoImages.filter(i => i.location_id === 2), findings: [{ id: 2, location_id: 2, description: "Melanozytärer Nävus, regelmässig", created_at: "2025-08-10T09:00:00Z" }] },
  { id: 3, patient_id: 2, name: "Stirn", x: 50.0, y: 5.0, created_at: "2025-10-05T16:00:00Z", images: demoImages.filter(i => i.location_id === 3), findings: [] },
  { id: 4, patient_id: 2, name: "Rücken Mitte", x: 50.0, y: 30.0, created_at: "2025-11-01T08:00:00Z", images: demoImages.filter(i => i.location_id === 4), findings: [{ id: 3, location_id: 4, description: "Seborrhoische Keratose", created_at: "2025-11-01T08:00:00Z" }] },
  { id: 5, patient_id: 3, name: "Linkes Knie", x: 38.0, y: 72.0, created_at: "2025-12-01T10:00:00Z", images: [], findings: [] },
];

let nextId = {
  company: 4,
  user: 4,
  patient: 7,
  location: 6,
  image: 8,
};

// Simulate async delay
const delay = (ms = 300) => new Promise(r => setTimeout(r, ms));

export const mockApi = {
  // Auth
  login: async (data: { email: string; password: string }) => {
    await delay(500);
    const user = users.find(u => u.email === data.email);
    if (!user || data.password.length < 3) {
      throw new Error("Ungültige Anmeldedaten");
    }
    return { user, token: "mock-token-" + user.id };
  },

  // Companies
  getCompanies: async () => {
    await delay();
    return [...companies];
  },
  createCompany: async (data: { name: string }) => {
    await delay();
    const c: MockCompany = { id: nextId.company++, name: data.name, created_at: new Date().toISOString() };
    companies.push(c);
    return c;
  },
  deleteCompany: async (id: number) => {
    await delay();
    companies = companies.filter(c => c.id !== id);
    return { success: true };
  },

  // Users
  getUsers: async () => {
    await delay();
    return users.map(u => ({
      ...u,
      company: companies.find(c => c.id === u.company_id) ?? { id: u.company_id, name: `Firma #${u.company_id}` },
    }));
  },
  createUser: async (data: { name: string; email: string; password: string; company_id: number; role?: string }) => {
    await delay();
    const u: MockUser = {
      id: nextId.user++,
      name: data.name,
      email: data.email,
      role: data.role || "user",
      company_id: data.company_id,
    };
    users.push(u);
    return u;
  },
  deleteUser: async (id: number) => {
    await delay();
    users = users.filter(u => u.id !== id);
    return { success: true };
  },

  // Patients
  getPatients: async () => {
    await delay();
    return [...patients];
  },
  createPatient: async (data: { name: string; birth_date: string }) => {
    await delay();
    const p: Patient = { id: nextId.patient++, name: data.name, birth_date: data.birth_date, created_at: new Date().toISOString() };
    patients.push(p);
    return p;
  },

  // Full patient
  getFullPatient: async (id: number): Promise<FullPatient> => {
    await delay();
    const patient = patients.find(p => p.id === id);
    if (!patient) throw new Error("Patient nicht gefunden");
    const patientLocations = locations.filter(l => l.patient_id === id);
    return { ...patient, locations: patientLocations };
  },

  // Locations
  createLocation: async (patientId: number, data: { name?: string; x: number; y: number }) => {
    await delay();
    const loc: Location & { images: LocationImage[]; findings: Finding[] } = {
      id: nextId.location++,
      patient_id: patientId,
      name: data.name,
      x: data.x,
      y: data.y,
      created_at: new Date().toISOString(),
      images: [],
      findings: [],
    };
    locations.push(loc);
    return loc;
  },

  // Images
  uploadImage: async (locationId: number, _file: File) => {
    await delay(800);
    const img: LocationImage = {
      id: nextId.image++,
      location_id: locationId,
      image_path: `https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=300&h=400&fit=crop&t=${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    const loc = locations.find(l => l.id === locationId);
    if (loc) loc.images.push(img);
    return img;
  },

  // Image URL helper (mock images are already full URLs)
  getImageUrl: (path: string) => path,

  // Dashboard stats
  getDashboardStats: async () => {
    await delay();
    return {
      totalPatients: patients.length,
      totalLocations: locations.length,
      totalImages: locations.reduce((sum, l) => sum + l.images.length, 0),
      totalCompanies: companies.length,
      totalUsers: users.length,
      recentPatients: [...patients].sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()).slice(0, 5),
    };
  },
};
