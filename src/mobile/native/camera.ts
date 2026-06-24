// Capacitor-tauglicher Kamera-Wrapper.
// Stufe 1: nutzt nativen <input type="file" capture="environment">.
// Stufe 2 (Capacitor): wird intern auf @capacitor/camera umgestellt,
// die Aufruf-Signatur takePhoto() bleibt identisch.

export interface CapturedPhoto {
  file: File;
  previewUrl: string; // ObjectURL für sofortige Anzeige
}

export async function takePhoto(): Promise<CapturedPhoto | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    // Direkte Kamera auf iOS/Android, Fallback Galerie auf Desktop:
    input.setAttribute("capture", "environment");
    input.style.position = "fixed";
    input.style.left = "-9999px";
    document.body.appendChild(input);

    let resolved = false;
    const cleanup = () => {
      try {
        document.body.removeChild(input);
      } catch {
        /* ignore */
      }
    };

    input.onchange = () => {
      const file = input.files?.[0];
      cleanup();
      if (!file) {
        if (!resolved) {
          resolved = true;
          resolve(null);
        }
        return;
      }
      resolved = true;
      resolve({ file, previewUrl: URL.createObjectURL(file) });
    };

    // Fallback: wenn der User abbricht, geben wir nach Fokuswechsel zurück null
    const onFocus = () => {
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve(null);
        }
        window.removeEventListener("focus", onFocus);
      }, 1000);
    };
    window.addEventListener("focus", onFocus);

    input.click();
  });
}

// Pickt ein Foto aus der Galerie (ohne capture)
export async function pickPhoto(): Promise<CapturedPhoto | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.style.position = "fixed";
    input.style.left = "-9999px";
    document.body.appendChild(input);

    input.onchange = () => {
      const file = input.files?.[0];
      try {
        document.body.removeChild(input);
      } catch {
        /* ignore */
      }
      if (!file) return resolve(null);
      resolve({ file, previewUrl: URL.createObjectURL(file) });
    };

    input.click();
  });
}

// Bildkompression vor Upload, um Mobile-Daten zu sparen.
// Max-Kante 2400 px, JPEG-Qualität 0.85.
export async function compressImage(
  file: File,
  maxSize = 2400,
  quality = 0.85,
): Promise<Blob> {
  if (!file.type.startsWith("image/")) return file;
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });
  let { width, height } = img;
  if (width <= maxSize && height <= maxSize) return file;
  if (width > height) {
    height = Math.round((height * maxSize) / width);
    width = maxSize;
  } else {
    width = Math.round((width * maxSize) / height);
    height = maxSize;
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(img, 0, 0, width, height);
  return new Promise<Blob>((resolve) =>
    canvas.toBlob((blob) => resolve(blob || file), "image/jpeg", quality),
  );
}
