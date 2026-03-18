const BASE_URL = "http://83.228.246.191:8001/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Accept': 'application/json',
      ...(!options?.body || options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export const api = {
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
