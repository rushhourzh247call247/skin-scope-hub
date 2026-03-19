const DEFAULT_API_BASE_URL = 'https://api.derm247.ch/api';

let authToken: string | null = null;

function setToken(token: string | null) {
  authToken = token;
}

function getApiBaseUrl() {
  const configuredUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  const normalizedUrl = (configuredUrl || DEFAULT_API_BASE_URL).replace(/\/$/, '');

  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && normalizedUrl.startsWith('http://')) {
    return DEFAULT_API_BASE_URL.replace(/\/$/, '');
  }

  return normalizedUrl;
}

function getStorageBaseUrl() {
  return getApiBaseUrl().replace(/\/api$/, '');
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(!options?.body || options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  let res: Response;
  try {
    res = await fetch(`${getApiBaseUrl()}${path}`, {
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
    const errorBody = await res.text().catch(() => '');
    throw new Error(`API Error: ${res.status} ${res.statusText} ${errorBody}`);
  }

  return res.json();
}

export const api = {
  setToken,

  // Auth
  login: (data: { email: string; password: string }) =>
    request<{ user: any; token: string }>('/login', { method: 'POST', body: JSON.stringify(data) }),

  // Admin: Companies
  getCompanies: () => request<any>('/companies'),
  createCompany: (data: { name: string }) =>
    request<any>('/companies', { method: 'POST', body: JSON.stringify(data) }),
  deleteCompany: (id: number) =>
    request<any>(`/companies/${id}`, { method: 'DELETE' }),

  // Admin: Users
  getUsers: () => request<any>('/users'),
  createUser: (data: { name: string; email: string; password: string; company_id: number; role?: string }) =>
    request<any>('/users', { method: 'POST', body: JSON.stringify(data) }),
  deleteUser: (id: number) =>
    request<any>(`/users/${id}`, { method: 'DELETE' }),

  // Patients
  getPatients: () => request<any>('/patients'),
  createPatient: (data: { name: string; birth_date: string }) =>
    request<any>('/patients', { method: 'POST', body: JSON.stringify(data) }),

  // Full Patient
  getFullPatient: (id: number) => request<any>(`/full-patient/${id}`),

  // Locations
  getLocations: (patientId: number) => request<any>(`/patients/${patientId}/locations`),
  createLocation: (patientId: number, data: { name?: string; x: number; y: number }) =>
    request<any>(`/patients/${patientId}/locations`, { method: 'POST', body: JSON.stringify(data) }),

  // Images
  getImages: (locationId: number) => request<any>(`/images/${locationId}`),
  uploadImage: (locationId: number, file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('location_id', String(locationId));
    return request<any>('/upload', { method: 'POST', body: formData });
  },

  // Helper to get full image URL
  getImageUrl: (path: string) => `${getStorageBaseUrl()}/storage/${path}`,
};
