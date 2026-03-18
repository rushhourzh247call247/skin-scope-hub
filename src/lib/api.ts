const BASE_URL = "http://83.228.246.191:8001/api";

let authToken: string | null = null;

function setToken(token: string | null) {
  authToken = token;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    ...(!options?.body || options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...options?.headers,
    },
  });
  if (!res.ok) {
    if (res.status === 401) {
      sessionStorage.removeItem("auth_token");
      sessionStorage.removeItem("auth_user");
      window.location.href = "/login";
      throw new Error("Sitzung abgelaufen");
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

  register: (data: { name: string; email: string; password: string; company_name: string }) =>
    request<{ user: any; token: string }>('/register', { method: 'POST', body: JSON.stringify(data) }),

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
  getImageUrl: (path: string) => `http://83.228.246.191:8001/storage/${path}`,
};
