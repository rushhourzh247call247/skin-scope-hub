// Lazy-loads OpenCV.js from CDN (only when needed)
let loadPromise: Promise<void> | null = null;

declare global {
  interface Window {
    cv: any;
    Module: any;
  }
}

export function loadOpenCV(): Promise<void> {
  if (window.cv && window.cv.Mat) {
    return Promise.resolve();
  }

  if (loadPromise) return loadPromise;

  loadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://docs.opencv.org/4.9.0/opencv.js";
    script.async = true;

    // OpenCV.js calls Module.onRuntimeInitialized when ready
    window.Module = {
      onRuntimeInitialized: () => {
        if (import.meta.env.DEV) console.log("[OpenCV] Loaded and ready");
        resolve();
      },
    };

    script.onerror = () => {
      loadPromise = null;
      reject(new Error("Failed to load OpenCV.js from CDN"));
    };

    // Timeout fallback
    const timeout = setTimeout(() => {
      if (!window.cv || !window.cv.Mat) {
        loadPromise = null;
        reject(new Error("OpenCV.js loading timed out"));
      }
    }, 30000);

    const originalResolve = resolve;
    window.Module.onRuntimeInitialized = () => {
      clearTimeout(timeout);
      console.log("[OpenCV] Loaded and ready");
      originalResolve();
    };

    document.head.appendChild(script);
  });

  return loadPromise;
}
