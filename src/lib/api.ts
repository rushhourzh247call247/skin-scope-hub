import type { LesionClassification, Appointment, PatientDocument, Consultation } from '@/types/patient';

const DEV_API_BASE_URL = 'https://dev.derm247.ch/api';
const LIVE_API_BASE_URL = 'https://api.derm247.ch/api';
const LIVE_API_HOSTS = new Set([
  'derm247.ch',
  'www.derm247.ch',
  'app.derm247.ch',
  'demo.derm247.ch',
  'skin-scope-hub.lovable.app',
]);
const LIVE_SERVER_ADMIN_HOST_SUFFIXES = ['.lovable.app', '.lovableproject.com'];

let authToken: string | null = null;

export function setToken(token: string | null) {
  authToken = token;
}

function getDefaultApiBaseUrl() {
  if (typeof window === 'undefined') return DEV_API_BASE_URL;
  return LIVE_API_HOSTS.has(window.location.hostname) ? LIVE_API_BASE_URL : DEV_API_BASE_URL;
}

function normalizeApiBaseUrl(url: string) {
  const normalizedUrl = url.replace(/\/$/, '');

  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && normalizedUrl.startsWith('http://')) {
    return normalizedUrl.replace(/^http:\/\//, 'https://');
  }

  return normalizedUrl;
}

function getApiBaseUrl() {
  const configuredUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  return normalizeApiBaseUrl(configuredUrl || getDefaultApiBaseUrl());
}

function getServerAdminApiBaseUrl() {
  // Server-Admin läuft IMMER über den Dev-Server (dev.derm247.ch),
  // der per SSH auf den Live-Server zugreift.
  return DEV_API_BASE_URL;
}

function getStorageBaseUrl() {
  return getApiBaseUrl().replace(/\/api$/, '');
}

type ParsedErrorResponse = {
  message: string;
  payload?: any;
  rawText: string;
};

async function parseErrorResponse(res: Response): Promise<ParsedErrorResponse> {
  const rawText = await res.text().catch(() => '');

  if (!rawText) {
    return {
      message: `API Error: ${res.status} ${res.statusText}`,
      rawText: '',
    };
  }

  try {
    const payload = JSON.parse(rawText);
    const message =
      (typeof payload?.error === 'string' && payload.error.trim()) ||
      (typeof payload?.message === 'string' && payload.message.trim()) ||
      rawText;

    return { message, payload, rawText };
  } catch {
    return { message: rawText, rawText };
  }
}

function createApiError(res: Response, parsed: ParsedErrorResponse) {
  const err = new Error(parsed.message || `API Error: ${res.status} ${res.statusText}`);
  (err as any).status = res.status;

  if (parsed.payload !== undefined) {
    (err as any).payload = parsed.payload;
  }

  if (parsed.rawText) {
    (err as any).rawText = parsed.rawText;
  }

  return err;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  return requestToBase<T>(getApiBaseUrl(), path, options);
}

async function requestToBase<T>(baseUrl: string, path: string, options?: RequestInit, opts?: { suppressAuthRedirect?: boolean }): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(!options?.body || options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  let res: Response;
  try {
    res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        ...headers,
        ...options?.headers,
      },
    });
  } catch {
    throw new Error('Verbindung zur API fehlgeschlagen. Bitte prüfen Sie HTTPS/CORS und ob der Server erreichbar ist.');
  }

  if (!res.ok) {
    if (res.status === 429) {
      const retryAfter = res.headers.get('Retry-After');
      const seconds = retryAfter ? parseInt(retryAfter, 10) : 120;
      const err = new Error('Zu viele Anmeldeversuche. Bitte warten Sie.');
      (err as any).status = 429;
      (err as any).retryAfter = isNaN(seconds) ? 120 : seconds;
      throw err;
    }
    if (res.status === 403) {
      const body = await res.json().catch(() => ({}));
      if (body.suspended) {
        sessionStorage.removeItem('auth_token');
        sessionStorage.removeItem('auth_user');
        const err = new Error(body.error || 'Konto gesperrt');
        (err as any).status = 403;
        (err as any).suspended = true;
        throw err;
      }
      const err = new Error(body.error || 'Keine Berechtigung');
      (err as any).status = 403;
      throw err;
    }
    if (res.status === 401) {
      if (opts?.suppressAuthRedirect) {
        const err = new Error('Nicht autorisiert');
        (err as any).status = 401;
        throw err;
      }
      sessionStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_user');
      window.location.href = '/login';
      throw new Error('Sitzung abgelaufen');
    }
    // 423 Locked = Account ist im Read-Only-Modus (Lifecycle: read_only / archived)
    if (res.status === 423) {
      const body = await res.json().catch(() => ({} as any));
      const err = new Error(body.message || 'Account ist im Read-Only-Modus. Nur Ansehen und Export möglich.');
      (err as any).status = 423;
      (err as any).readOnly = true;
      (err as any).lifecycleStatus = body.lifecycle_status;
      (err as any).readOnlyUntil = body.read_only_until;
      // Globaler Toast (lazy import um Zirkular-Dep zu vermeiden)
      import('@/hooks/use-toast').then(({ toast }) => {
        toast({
          title: 'Read-Only-Modus',
          description: err.message,
          variant: 'destructive',
        });
      }).catch(() => {});
      throw err;
    }
    // 410 Gone = Account terminiert (pending_deletion)
    if (res.status === 410) {
      const body = await res.json().catch(() => ({} as any));
      sessionStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_user');
      const err = new Error(body.message || 'Dieser Account wurde terminiert.');
      (err as any).status = 410;
      (err as any).terminated = true;
      window.location.href = '/login';
      throw err;
    }

    const parsedError = await parseErrorResponse(res);

    if (res.status === 403) {
      const body = parsedError.payload ?? {};
      if (body.suspended) {
        sessionStorage.removeItem('auth_token');
        sessionStorage.removeItem('auth_user');
        const err = createApiError(res, parsedError);
        (err as any).suspended = true;
        throw err;
      }
    }

    throw createApiError(res, parsedError);
  }

  return res.json();
}

async function requestBlob(path: string, options?: RequestInit): Promise<Blob> {
  return requestBlobToBase(getApiBaseUrl(), path, options);
}

async function requestBlobToBase(baseUrl: string, path: string, options?: RequestInit): Promise<Blob> {
  const headers: Record<string, string> = {
    Accept: 'application/pdf, application/octet-stream, */*',
    ...(!options?.body || options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  let res: Response;
  try {
    res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        ...headers,
        ...options?.headers,
      },
    });
  } catch {
    throw new Error('Verbindung zur API fehlgeschlagen. Bitte prüfen Sie HTTPS/CORS und ob der Server erreichbar ist.');
  }

  if (!res.ok) {
    if (res.status === 401) {
      sessionStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_user');
      window.location.href = '/login';
      throw new Error('Sitzung abgelaufen');
    }

    const parsedError = await parseErrorResponse(res);
    throw createApiError(res, parsedError);
  }

  return res.blob();
}

async function requestServerAdmin<T>(path: string, options?: RequestInit): Promise<T> {
  return requestToBase<T>(getServerAdminApiBaseUrl(), path, options, { suppressAuthRedirect: true });
}

function isApiNotFoundError(error: unknown) {
  return error instanceof Error && error.message.includes('API Error: 404');
}

async function requestWithFallback<T>(primaryPath: string, fallbackPath: string, options?: RequestInit): Promise<T> {
  try {
    return await request<T>(primaryPath, options);
  } catch (error) {
    if (!isApiNotFoundError(error)) throw error;
    return request<T>(fallbackPath, options);
  }
}

export const api = {
  setToken,

  // Auth
  login: (data: { email: string; password: string }) =>
    request<{ user: any; token: string }>('/login', { method: 'POST', body: JSON.stringify(data) }),
  me: () => request<{ user: any }>('/me'),

  // Public: Contact form (no auth required) — Double-Opt-in via E-Mail-Bestätigung
  submitContactRequest: (data: {
    name: string;
    email: string;
    company?: string;
    message: string;
    website?: string; // Honeypot
    elapsed_ms?: number; // Zeit-Check
    locale?: string; // Sprache des Absenders (de/en/fr/it/es)
  }) =>
    request<{ success: boolean }>('/contact', { method: 'POST', body: JSON.stringify(data) }),

  // Public: Bestätigung des Double-Opt-in-Tokens
  confirmContactRequest: (token: string) =>
    request<{ success: boolean; status?: 'confirmed' | 'already_confirmed' | 'expired' | 'invalid' }>(
      `/contact/confirm?token=${encodeURIComponent(token)}`,
      { method: 'GET' },
    ),

  // Admin: Companies
  getCompanies: () => request<any[]>('/companies'),
  createCompany: (data: { name: string }) =>
    request<any>('/companies', { method: 'POST', body: JSON.stringify(data) }),
  updateCompany: (
    id: number,
    data: {
      name?: string;
      address?: string | null;
      zip?: string | null;
      city?: string | null;
      email?: string | null;
      phone?: string | null;
    }
  ) => request<any>(`/companies/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCompany: (id: number) =>
    request<any>(`/companies/${id}`, { method: 'DELETE' }),

  // Admin: Users
  getUsers: () => request<any[]>('/users'),
  createUser: (data: { name: string; email: string; password: string; company_id: number; role?: string }) =>
    request<any>('/users', { method: 'POST', body: JSON.stringify(data) }),
  deleteUser: (id: number) =>
    request<any>(`/users/${id}`, { method: 'DELETE' }),
  // Admin: Reset user password
  adminResetPassword: (userId: number, password: string) =>
    request<any>(`/users/${userId}/reset-password`, { method: 'PUT', body: JSON.stringify({ password }) }),
  // User: Change own password
  changeOwnPassword: (current_password: string, password: string, password_confirmation: string) =>
    request<any>('/change-password', { method: 'PUT', body: JSON.stringify({ current_password, password, password_confirmation }) }),
  // Admin: Reset user 2FA
  adminReset2FA: (userId: number) =>
    request<{ success: boolean }>(`/admin/users/${userId}/reset-2fa`, { method: 'POST' }),

  // Suspend / Unsuspend users
  suspendUser: (userId: number) =>
    request<{ success: boolean }>(`/users/${userId}/suspend`, { method: 'PUT' }),
  unsuspendUser: (userId: number) =>
    request<{ success: boolean }>(`/users/${userId}/unsuspend`, { method: 'PUT' }),

  // Suspend / Unsuspend companies
  suspendCompany: (companyId: number) =>
    request<{ success: boolean }>(`/companies/${companyId}/suspend`, { method: 'PUT' }),
  unsuspendCompany: (companyId: number) =>
    request<{ success: boolean }>(`/companies/${companyId}/unsuspend`, { method: 'PUT' }),

  // Lifecycle: manuell aus read_only/archived zurück auf active setzen
  reactivateCompanyLifecycle: (companyId: number) =>
    request<{ success: boolean; lifecycle_status: string }>(
      `/companies/${companyId}/reactivate`,
      { method: 'POST' }
    ),

  // Lifecycle: Status manuell setzen (admin only)
  setCompanyLifecycle: (
    companyId: number,
    payload: {
      lifecycle_status: 'active' | 'read_only' | 'archived' | 'pending_deletion';
      read_only_until?: string | null;
      archive_until?: string | null;
    }
  ) =>
    request<{ success: boolean; company: any }>(
      `/companies/${companyId}/lifecycle`,
      { method: 'POST', body: JSON.stringify(payload) }
    ),

  // Lifecycle: Kunde wählt Archivierung (CHF 50/Mt, 60 Tage Kündigung, keine Mindestlaufzeit)
  archiveOptIn: (companyId: number) =>
    request<{ success: boolean; company: any; contract?: any }>(
      `/companies/${companyId}/archive-opt-in`,
      { method: 'POST' }
    ),

  // Lifecycle: Kunde kündigt Archiv mit 60 Tagen Frist
  archiveCancel: (companyId: number) =>
    request<{ success: boolean; company: any; archive_until: string }>(
      `/companies/${companyId}/archive-cancel`,
      { method: 'POST' }
    ),

  // Lifecycle: Kunde fordert sofortige Löschung an
  requestCompanyDeletion: (companyId: number) =>
    request<{ success: boolean; company: any }>(
      `/companies/${companyId}/request-deletion`,
      { method: 'POST' }
    ),

  // Patients
  getPatients: () => request<any[]>('/patients'),
  createPatient: (data: { name: string; birth_date: string; gender?: string; email?: string; phone?: string; insurance_number?: string; patient_number?: string; notes?: string }) =>
    request<any>('/patients', { method: 'POST', body: JSON.stringify(data) }),
  updatePatientNumber: (id: number, patient_number: string) =>
    request<any>(`/patients/${id}/patient-number`, { method: 'PUT', body: JSON.stringify({ patient_number }) }),
  deactivatePatient: (id: number) =>
    request<{ success: boolean }>(`/patients/${id}/deactivate`, { method: 'PUT' }),
  activatePatient: (id: number) =>
    request<{ success: boolean }>(`/patients/${id}/activate`, { method: 'PUT' }),
  deletePatient: (id: number) =>
    request<{ success: boolean }>(`/patients/${id}`, { method: 'DELETE' }),

  // Full Patient
  getFullPatient: (id: number) => request<any>(`/full-patient/${id}`),

  // Locations
  getLocations: (patientId: number) => request<any>(`/patients/${patientId}/locations`),
  createLocation: (patientId: number, data: {
    name?: string; x: number; y: number; view?: string; type?: string;
    width?: number; height?: number;
    x3d?: number; y3d?: number; z3d?: number;
    nx?: number; ny?: number; nz?: number;
  }) =>
    request<any>('/locations', { method: 'POST', body: JSON.stringify({ patient_id: patientId, ...data }) }),

  // Findings
  createFinding: (locationId: number, description: string) =>
    request<any>(`/locations/${locationId}/findings`, { method: 'POST', body: JSON.stringify({ description }) }),
  updateFinding: (findingId: number, description: string) =>
    request<any>(`/findings/${findingId}`, { method: 'PUT', body: JSON.stringify({ description }) }),
  deleteFinding: (findingId: number) =>
    request<any>(`/findings/${findingId}`, { method: 'DELETE' }),

  // Update location (name, op_status, etc.)
  renameLocation: (locationId: number, name: string) =>
    request<any>(`/locations/${locationId}`, { method: 'PUT', body: JSON.stringify({ name }) }),
  updateLocationStatus: (locationId: number, op_status: string) =>
    request<any>(`/locations/${locationId}`, { method: 'PUT', body: JSON.stringify({ op_status }) }),

  // Classification
  updateClassification: (locationId: number, classification: LesionClassification) =>
    request<any>(`/locations/${locationId}/classification`, { method: 'PUT', body: JSON.stringify({ classification }) }),

  // Soft delete / trash
  softDeleteLocation: (locationId: number) =>
    request<any>(`/locations/${locationId}`, { method: 'DELETE' }),
  getTrashedLocations: (patientId: number) =>
    request<any[]>(`/patients/${patientId}/locations/trashed`),
  restoreLocation: (locationId: number) =>
    request<any>(`/locations/${locationId}/restore`, { method: 'POST' }),
  permanentDeleteLocation: (locationId: number) =>
    request<any>(`/locations/${locationId}/permanent`, { method: 'DELETE' }),

  // Images
  getImages: (locationId: number) => request<any>(`/images/${locationId}`),
  uploadImage: (locationId: number, file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('location_id', String(locationId));
    return request<any>('/upload', { method: 'POST', body: formData });
  },
  deleteImage: (imageId: number) =>
    request<{ success: boolean }>(`/images/${imageId}`, { method: 'DELETE' }),

  // Image notes
  updateImageNote: (imageId: number, note: string) =>
    request<any>(`/images/${imageId}/note`, { method: 'PUT', body: JSON.stringify({ note }) }),

  // ABCDE Assessment
  updateAbcde: (imageId: number, data: {
    abc_asymmetry: boolean;
    abc_border: string;
    abc_color: string;
    abc_diameter: string;
    abc_evolution: string;
  }) =>
    request<{ success: boolean; risk_score: number; risk_level: string }>(
      `/images/${imageId}/abcde`, { method: 'PUT', body: JSON.stringify(data) }
    ),

  // Dashboard
  getDashboardStats: () => request<any>('/dashboard'),
  getRiskStats: () => request<{ low: number; medium: number; high: number }>('/dashboard/risk'),

  // 2FA
  enable2FA: () => request<{ secret: string; qr: string }>('/2fa/enable', { method: 'POST' }),
  verify2FA: (code: string) => request<{ success: boolean; message?: string }>('/2fa/verify', { method: 'POST', body: JSON.stringify({ code }) }),
  disable2FA: () => request<{ success: boolean }>('/2fa/disable', { method: 'POST' }),

  // Image Alignment
  getImageAlignment: (id1: number, id2: number) =>
    request<{ rotation: number; scale: number; offset_x: number; offset_y: number }>(`/image-alignment/${Math.min(id1, id2)}/${Math.max(id1, id2)}`),
  saveImageAlignment: (id1: number, id2: number, data: { rotation: number; scale: number; offset_x: number; offset_y: number }) =>
    request<{ success: boolean }>(`/image-alignment/${Math.min(id1, id2)}/${Math.max(id1, id2)}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Upload Sessions (QR Upload Flow)
  createUploadSession: (data: { patient_id: number; location_id: number }) =>
    request<{
      token: string; expires_at: string; patient_id: number; patient_name: string;
      location_id: number; location_name: string; upload_url: string;
    }>('/create-upload-session', { method: 'POST', body: JSON.stringify(data) }),

  validateUploadSession: (token: string) =>
    request<{
      valid: boolean; expired?: boolean; expires_at: string; patient_id: number; patient_name: string;
      location_id: number; location_name: string; image_count: number; completed: boolean;
    }>(`/upload-sessions/${token}`),

  uploadSessionImage: (token: string, file: File, order: number) => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('order', String(order));
    return request<{
      id: number; location_id: number; order: number; created_at: string; image_url: string;
    }>(`/upload/${token}`, { method: 'POST', body: formData });
  },

  completeUploadSession: (token: string) =>
    request<{ success: boolean; image_count: number; completed_at: string }>(`/upload-sessions/${token}/complete`, { method: 'POST' }),

  // Patient PDF (server-side)
  downloadPatientPdf: (patientId: number) =>
    requestBlob(`/patients/${patientId}/pdf`, { method: 'GET' }),

  // Snapshots (Admin)
  getSnapshots: () => request<any[]>('/snapshots'),
  getSnapshotCompanies: (date: string) => request<any[]>(`/snapshots/${date}/companies`),
  getSnapshotPatients: (date: string, companyId?: number) =>
    request<any[]>(`/snapshots/${date}/patients${companyId ? `?company_id=${companyId}` : ''}`),
  getSnapshotPatientDetail: (date: string, patientId: number) =>
    request<any>(`/snapshots/${date}/patients/${patientId}`),
  restorePatientFromSnapshot: (date: string, patientId: number) =>
    request<{ success: boolean; message: string }>(`/snapshots/${date}/restore/patient/${patientId}`, { method: 'POST' }),
  restoreCompanyFromSnapshot: (date: string, companyId: number) =>
    request<{ success: boolean; message: string }>(`/snapshots/${date}/restore/company/${companyId}`, { method: 'POST' }),

  // Overview Pins
  getOverviewPins: (locationId: number) =>
    request<any[]>(`/locations/${locationId}/overview-pins`),
  createOverviewPin: (locationId: number, data: { linked_location_id: number; x_pct: number; y_pct: number; label?: string }) =>
    request<any>(`/locations/${locationId}/overview-pins`, { method: 'POST', body: JSON.stringify(data) }),
  deleteOverviewPin: (pinId: number) =>
    request<{ success: boolean }>(`/overview-pins/${pinId}`, { method: 'DELETE' }),
  updateOverviewPin: (pinId: number, data: { x_pct: number; y_pct: number; label?: string }) =>
    request<any>(`/overview-pins/${pinId}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Helper to get full image URL from a path (via authenticated API endpoint with token)
  getImageUrl: (pathOrUrl: string) => {
    if (!pathOrUrl) return '';
    if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
      const storageMatch = pathOrUrl.match(/\/storage\/(?:images\/)?([^?]+)/);
      if (storageMatch) {
        const url = `${getApiBaseUrl()}/image/${encodeURIComponent(storageMatch[1])}`;
        return authToken ? `${url}?token=${encodeURIComponent(authToken)}` : url;
      }
      return pathOrUrl;
    }
    const filename = pathOrUrl.split('/').pop() || pathOrUrl;
    const url = `${getApiBaseUrl()}/image/${encodeURIComponent(filename)}`;
    return authToken ? `${url}?token=${encodeURIComponent(authToken)}` : url;
  },

  // Resolve the best URL from a LocationImage object (via authenticated API endpoint with token)
  resolveImageSrc: (img: { image_url?: string; file_path?: string; image_path?: string }) => {
    const path = img.file_path || img.image_path || '';
    if (!path) {
      if (img.image_url) {
        const storageMatch = img.image_url.match(/\/storage\/(?:images\/)?([^?]+)/);
        if (storageMatch) {
          const url = `${getApiBaseUrl()}/image/${encodeURIComponent(storageMatch[1])}`;
          return authToken ? `${url}?token=${encodeURIComponent(authToken)}` : url;
        }
        return img.image_url;
      }
      return '';
    }
    if (path.startsWith('http://') || path.startsWith('https://')) {
      const storageMatch = path.match(/\/storage\/(?:images\/)?([^?]+)/);
      if (storageMatch) {
        const url = `${getApiBaseUrl()}/image/${encodeURIComponent(storageMatch[1])}`;
        return authToken ? `${url}?token=${encodeURIComponent(authToken)}` : url;
      }
      return path;
    }
    const filename = path.split('/').pop() || path;
    const url = `${getApiBaseUrl()}/image/${encodeURIComponent(filename)}`;
    return authToken ? `${url}?token=${encodeURIComponent(authToken)}` : url;
  },

  // Fetch image as blob with auth header (for img tags that need auth)
  fetchImageBlob: async (pathOrUrl: string): Promise<string> => {
    if (!pathOrUrl) return '';
    let url = pathOrUrl;
    if (!url.startsWith('http')) {
      const filename = url.split('/').pop() || url;
      url = `${getApiBaseUrl()}/image/${encodeURIComponent(filename)}`;
    } else {
      const storageMatch = url.match(/\/storage\/(?:images\/)?([^?]+)/);
      if (storageMatch) {
        url = `${getApiBaseUrl()}/image/${encodeURIComponent(storageMatch[1])}`;
      }
    }
    const headers: Record<string, string> = { Accept: 'image/*' };
    if (authToken) headers.Authorization = `Bearer ${authToken}`;
    const res = await fetch(url, { headers });
    if (!res.ok) return '';
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  },

  // Admin: Get patients filtered by company
  getPatientsByCompany: (companyId: number) =>
    request<any[]>(`/patients?company_id=${companyId}`),

  // Appointments
  getAppointments: (patientId: number) =>
    requestWithFallback<Appointment[]>(
      `/patients/${patientId}/appointments`,
      `/snapshots/patients/${patientId}/appointments`,
    ),
  createAppointment: (patientId: number, data: { scheduled_at: string; notes?: string }) =>
    requestWithFallback<Appointment>(
      `/patients/${patientId}/appointments`,
      `/snapshots/patients/${patientId}/appointments`,
      { method: 'POST', body: JSON.stringify(data) },
    ),
  updateAppointment: (id: number, data: { scheduled_at?: string; notes?: string }) =>
    requestWithFallback<Appointment>(
      `/appointments/${id}`,
      `/snapshots/appointments/${id}`,
      { method: 'PUT', body: JSON.stringify(data) },
    ),
  deleteAppointment: (id: number) =>
    requestWithFallback<{ success: boolean }>(
      `/appointments/${id}`,
      `/snapshots/appointments/${id}`,
      { method: 'DELETE' },
    ),

  // Patient Documents
  getPatientDocuments: (patientId: number) =>
    requestWithFallback<PatientDocument[]>(
      `/patients/${patientId}/documents`,
      `/snapshots/patients/${patientId}/documents`,
    ),
  uploadPatientDocument: (patientId: number, file: File, notes?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (notes) formData.append('notes', notes);
    return requestWithFallback<PatientDocument>(
      `/patients/${patientId}/documents`,
      `/snapshots/patients/${patientId}/documents`,
      { method: 'POST', body: formData },
    );
  },
  deletePatientDocument: (id: number) =>
    requestWithFallback<{ success: boolean }>(
      `/documents/${id}`,
      `/snapshots/documents/${id}`,
      { method: 'DELETE' },
    ),
  getDocumentDownloadUrl: (id: number) =>
    `${getApiBaseUrl()}/documents/${id}/download?token=${authToken}`,
  downloadDocumentBlob: (id: number) =>
    requestBlob(`/documents/${id}/download${authToken ? `?token=${authToken}` : ''}`),

  // Consultations
  getConsultations: (patientId: number) =>
    requestWithFallback<Consultation[]>(
      `/patients/${patientId}/consultations`,
      `/snapshots/patients/${patientId}/consultations`,
    ),
  createConsultation: (patientId: number, notes: string) =>
    requestWithFallback<Consultation>(
      `/patients/${patientId}/consultations`,
      `/snapshots/patients/${patientId}/consultations`,
      { method: 'POST', body: JSON.stringify({ notes }) },
    ),
  updateConsultation: (id: number, notes: string) =>
    requestWithFallback<Consultation>(
      `/consultations/${id}`,
      `/snapshots/consultations/${id}`,
      { method: 'PUT', body: JSON.stringify({ notes }) },
    ),
  deleteConsultation: (id: number) =>
    requestWithFallback<{ success: boolean }>(
      `/consultations/${id}`,
      `/snapshots/consultations/${id}`,
      { method: 'DELETE' },
    ),

  // Contracts
  getAllContracts: () =>
    request<any[]>('/contracts'),
  getContracts: (companyId: number) =>
    request<any[]>(`/companies/${companyId}/contracts`),
  createContract: (companyId: number, data: {
    contract_number: string;
    package_name: string;
    package_id: string;
    licenses: number;
    monthly_price: number;
    start_date: string;
    end_date: string;
    notice_period_days?: number;
    customer_name: string;
    customer_address?: string;
    notes?: string;
  }) =>
    request<any>(`/companies/${companyId}/contracts`, { method: 'POST', body: JSON.stringify(data) }),
  updateContract: (contractId: number, data: Record<string, any>) =>
    request<any>(`/contracts/${contractId}`, { method: 'PUT', body: JSON.stringify(data) }),
  terminateContract: (contractId: number, terminated_by: 'client' | 'provider') =>
    request<any>(`/contracts/${contractId}/terminate`, { method: 'POST', body: JSON.stringify({ terminated_by }) }),
  cancelTermination: (contractId: number) =>
    request<any>(`/contracts/${contractId}/cancel-termination`, { method: 'POST' }),
  uploadSignedContract: (contractId: number, file: File) => {
    const formData = new FormData();
    formData.append('signed_pdf', file);
    return request<any>(`/contracts/${contractId}/upload-signed`, { method: 'POST', body: formData });
  },
  downloadSignedContract: (contractId: number) =>
    requestBlob(`/contracts/${contractId}/download-signed`),
  deleteContract: (contractId: number) =>
    request<{ success: boolean }>(`/contracts/${contractId}`, { method: 'DELETE' }),

  // License status
  getLicenseStatus: (companyId: number) =>
    request<{ licenses: number; used: number; available: number }>(`/companies/${companyId}/license-status`),

  // Tickets
  getTickets: () =>
    request<any[]>('/tickets'),
  getTicket: (id: number) =>
    request<any>(`/tickets/${id}`),
  createTicket: (data: { subject: string; message: string; priority: 'normal' | 'urgent' }) =>
    request<any>('/tickets', { method: 'POST', body: JSON.stringify(data) }),
  replyTicket: (ticketId: number, message: string) =>
    request<any>(`/tickets/${ticketId}/reply`, { method: 'POST', body: JSON.stringify({ message }) }),
  markTicketRead: (ticketId: number) =>
    request<any>(`/tickets/${ticketId}/read`, { method: 'PUT' }),
  closeTicket: (ticketId: number) =>
    request<any>(`/tickets/${ticketId}/close`, { method: 'PUT' }),
  reopenTicket: (ticketId: number) =>
    request<any>(`/tickets/${ticketId}/reopen`, { method: 'PUT' }),
  deleteTicket: (ticketId: number) =>
    request<{ success: boolean }>(`/tickets/${ticketId}`, { method: 'DELETE' }),

  // Storage stats
  getStorageStats: () =>
    request<{
      total_bytes: number;
      used_bytes: number;
      free_bytes: number;
      companies: { id: number; name: string; used_bytes: number; image_count: number }[];
    }>('/storage-stats'),

  // Invoices
  getInvoices: () => request<any[]>('/invoices'),
  markInvoicePaid: (invoiceId: number, notes?: string) =>
    request<any>(`/invoices/${invoiceId}/pay`, { method: 'POST', body: JSON.stringify({ notes }) }),
  sendDunning: (invoiceId: number, level: number) =>
    request<any>(`/invoices/${invoiceId}/dunning`, { method: 'POST', body: JSON.stringify({ dunning_level: level }) }),
  generateMonthlyInvoices: () =>
    request<{ count: number }>('/invoices/generate-monthly', { method: 'POST' }),
  downloadInvoicePdf: (invoiceId: number) =>
    requestBlob(`/invoices/${invoiceId}/pdf`),

  // Server Admin
  serverAdmin: {
    getStatus: () =>
      requestServerAdmin<{
        uptime: string;
        cpu_usage: number;
        memory_usage: number;
        memory_total: string;
        disk_usage: number;
        disk_total: string;
        php_version: string;
        nginx_status: string;
        fpm_status: string;
        app_version?: string;
      }>('/server-admin/status'),
    getVersions: () =>
      requestServerAdmin<{
        hash: string;
        short_hash: string;
        date: string;
        message: string;
        author: string;
        is_current: boolean;
      }[]>('/server-admin/versions'),
    getBackups: () =>
      requestServerAdmin<{
        filename: string;
        size: string;
        date: string;
        age: string;
      }[]>('/server-admin/backups'),
    getServices: () =>
      requestServerAdmin<Record<string, { running: boolean; pid?: number }>>('/server-admin/services'),
    deploy: (actionPassword: string) =>
      requestServerAdmin<{
        success: boolean;
        error?: string;
        steps?: { label: string; success: boolean; output?: string }[];
      }>('/server-admin/deploy', { method: 'POST', body: JSON.stringify({ action_password: actionPassword }) }),
    createBackup: (actionPassword: string) =>
      requestServerAdmin<{ success: boolean; filename: string; error?: string }>('/server-admin/backup', { method: 'POST', body: JSON.stringify({ action_password: actionPassword }) }),
    rollback: (hash: string, actionPassword: string) =>
      requestServerAdmin<{ success: boolean; error?: string }>('/server-admin/rollback', { method: 'POST', body: JSON.stringify({ hash, action_password: actionPassword }) }),
    restoreBackup: (filename: string, actionPassword: string) =>
      requestServerAdmin<{ success: boolean; error?: string }>('/server-admin/backup/restore', { method: 'POST', body: JSON.stringify({ filename, action_password: actionPassword }) }),
    restartService: (service: string, actionPassword: string) =>
      requestServerAdmin<{ success: boolean; error?: string }>('/server-admin/services/restart', { method: 'POST', body: JSON.stringify({ service, action_password: actionPassword }) }),
    createSnapshot: (actionPassword: string) =>
      requestServerAdmin<{ success: boolean; filename?: string; error?: string }>('/server-admin/snapshot', { method: 'POST', body: JSON.stringify({ action_password: actionPassword }) }),
    getDeployStatus: () =>
      requestServerAdmin<{
        active: boolean;
        step: number;
        total: number;
        label: string;
        started_at: number;
        step_started_at: number;
      } | null>('/server-admin/deploy/status'),
  },
};
