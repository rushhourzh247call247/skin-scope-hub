import { useState, useEffect } from 'react';

/**
 * Hook that loads an image URL via fetch with Authorization header,
 * returning a blob URL that can be used in <img src>.
 * Falls back to the original URL if fetch fails (e.g. public images).
 */
export function useAuthImage(src: string | undefined | null): string {
  const [blobUrl, setBlobUrl] = useState<string>('');

  useEffect(() => {
    if (!src) {
      setBlobUrl('');
      return;
    }

    // Only intercept API image URLs that need auth
    const needsAuth = src.includes('/api/image/');
    if (!needsAuth) {
      setBlobUrl(src);
      return;
    }

    let cancelled = false;
    let objectUrl = '';

    const load = async () => {
      try {
        const headers: Record<string, string> = { Accept: 'image/*' };
        const token = sessionStorage.getItem('auth_token');
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(src, { headers });
        if (!res.ok || cancelled) {
          if (!cancelled) setBlobUrl(src);
          return;
        }
        const blob = await res.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      } catch {
        if (!cancelled) setBlobUrl(src);
      }
    };

    load();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  return blobUrl;
}
