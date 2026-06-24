// Dünner Wrapper für die neuen /api/m/*-Endpoints.
// Nutzt denselben Auth-Token wie die bestehende App (api.setToken).
// Erkennt 404 (Backend noch nicht deployt) und liefert leere Defaults,
// damit das Frontend auf proto.derm247.ch nicht crasht bevor Migration
// auf dem Proto-Server ausgeführt wurde.

import type {
  ClinicalPhoto,
  Lesion,
  LesionAsset,
  MobilePatient,
} from "./types";

const DEV_API_BASE_URL = "https://dev.derm247.ch/api";
const LIVE_API_HOSTS = new Set([
  "derm247.ch",
  "www.derm247.ch",
  "app.derm247.ch",
  "demo.derm247.ch",
  "skin-scope-hub.lovable.app",
]);
const LIVE_API_BASE_URL = "https://api.derm247.ch/api";

function getApiBaseUrl() {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  if (typeof window === "undefined") return DEV_API_BASE_URL;
  return LIVE_API_HOSTS.has(window.location.hostname)
    ? LIVE_API_BASE_URL
    : DEV_API_BASE_URL;
}

function getAuthToken(): string | null {
  // Sanctum-Token liegt in sessionStorage (siehe AuthContext)
  try {
    return sessionStorage.getItem("auth_token");
  } catch {
    return null;
  }
}

export class MobileApiError extends Error {
  status: number;
  notDeployed: boolean;
  constructor(status: number, message: string, notDeployed = false) {
    super(message);
    this.status = status;
    this.notDeployed = notDeployed;
  }
}

async function mreq<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(options.body && !(options.body instanceof FormData)
      ? { "Content-Type": "application/json" }
      : {}),
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${getApiBaseUrl()}${path}`, { ...options, headers });
  } catch {
    throw new MobileApiError(
      0,
      "Verbindung zur API fehlgeschlagen.",
    );
  }

  if (res.status === 404) {
    // Backend-Migration noch nicht ausgeführt – nicht hart crashen
    throw new MobileApiError(
      404,
      "Mobile-API (/api/m) ist auf diesem Server noch nicht aktiviert.",
      true,
    );
  }

  if (!res.ok) {
    let message = `API-Fehler ${res.status}`;
    try {
      const body = await res.json();
      if (typeof body?.message === "string") message = body.message;
      else if (typeof body?.error === "string") message = body.error;
    } catch {
      /* ignore */
    }
    throw new MobileApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// -------- Patienten (nutzt vorhandenen /patients-Endpoint, kein Refactoring) --------

export async function fetchPatients(): Promise<MobilePatient[]> {
  return mreq<MobilePatient[]>("/patients");
}

// -------- Klinische Fotos --------

export async function fetchClinicalPhotos(
  patientId: number,
): Promise<ClinicalPhoto[]> {
  return mreq<ClinicalPhoto[]>(`/m/patients/${patientId}/clinical-photos`);
}

export async function fetchClinicalPhoto(
  id: number,
): Promise<{ photo: ClinicalPhoto; lesions: Lesion[] }> {
  return mreq<{ photo: ClinicalPhoto; lesions: Lesion[] }>(
    `/m/clinical-photos/${id}`,
  );
}

export async function uploadClinicalPhoto(
  patientId: number,
  file: File | Blob,
  bodyRegion?: string,
): Promise<ClinicalPhoto> {
  const fd = new FormData();
  fd.append("photo", file, "clinical.jpg");
  if (bodyRegion) fd.append("body_region", bodyRegion);
  return mreq<ClinicalPhoto>(
    `/m/patients/${patientId}/clinical-photos`,
    { method: "POST", body: fd },
  );
}

export async function deleteClinicalPhoto(id: number): Promise<void> {
  return mreq<void>(`/m/clinical-photos/${id}`, { method: "DELETE" });
}

// -------- Lesions (Marker) --------

export async function fetchLesions(patientId: number): Promise<Lesion[]> {
  return mreq<Lesion[]>(`/m/patients/${patientId}/lesions`);
}

export async function fetchLesion(
  id: string,
): Promise<{ lesion: Lesion; assets: LesionAsset[] }> {
  return mreq<{ lesion: Lesion; assets: LesionAsset[] }>(
    `/m/lesions/${id}`,
  );
}

export async function createLesion(
  clinicalPhotoId: number,
  xPct: number,
  yPct: number,
): Promise<Lesion> {
  return mreq<Lesion>(`/m/clinical-photos/${clinicalPhotoId}/lesions`, {
    method: "POST",
    body: JSON.stringify({ x_pct: xPct, y_pct: yPct }),
  });
}

export async function updateLesion(
  id: string,
  patch: Partial<Pick<Lesion, "x_pct" | "y_pct" | "label" | "notes">>,
): Promise<Lesion> {
  return mreq<Lesion>(`/m/lesions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function deleteLesion(id: string): Promise<void> {
  return mreq<void>(`/m/lesions/${id}`, { method: "DELETE" });
}

// -------- Lesion Assets (Dermatoskopie, Befunde, …) --------

export async function uploadLesionAsset(
  lesionId: string,
  file: File | Blob,
  kind: "clinical" | "dermoscopy" = "dermoscopy",
): Promise<LesionAsset> {
  const fd = new FormData();
  fd.append("file", file, `${kind}.jpg`);
  fd.append("kind", kind);
  return mreq<LesionAsset>(`/m/lesions/${lesionId}/assets`, {
    method: "POST",
    body: fd,
  });
}

export async function deleteLesionAsset(id: number): Promise<void> {
  return mreq<void>(`/m/lesion-assets/${id}`, { method: "DELETE" });
}

// -------- Image-URL Helper --------

export function buildImageUrl(filePath: string | null | undefined): string {
  if (!filePath) return "";
  if (/^https?:/.test(filePath)) return filePath;
  const base = getApiBaseUrl();
  const token = getAuthToken();
  const cleaned = filePath.replace(/^\/+/, "");
  const qs = token ? `?token=${encodeURIComponent(token)}` : "";
  return `${base}/image/${cleaned}${qs}`;
}
