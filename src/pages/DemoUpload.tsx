import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Camera, Images, CheckCircle2, AlertCircle, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

// API-Auswahl basierend auf der Hostname:
// - demo.derm247.ch (Live-Demo)          → Live-API
// - proto.derm247.ch (Dev-Frontend)      → Dev-API
// - Lovable Preview / localhost          → Dev-API
const API_BASE = (() => {
  if (typeof window === "undefined") return "https://dev.derm247.ch/api";
  return window.location.hostname === "demo.derm247.ch"
    ? "https://api.derm247.ch/api"
    : "https://dev.derm247.ch/api";
})();

type Status = "idle" | "uploading" | "done" | "error" | "expired" | "invalid";

const DemoUpload = () => {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [preview, setPreview] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }
    fetch(`${API_BASE}/demo/qr-status/${token}`)
      .then((r) => r.json().then((d) => ({ ok: r.ok, data: d })))
      .then(({ ok, data }) => {
        if (!ok || data.status === "invalid") setStatus("invalid");
        else if (data.status === "expired") setStatus("expired");
        else if (data.status === "completed") setStatus("done");
      })
      .catch(() => setStatus("invalid"));
  }, [token]);

  const upload = async (file: File) => {
    if (!token) return;

    const fileName = file.name?.toLowerCase() || "(kein Name)";
    const fileType = file.type?.toLowerCase() || "(kein Typ)";
    const fileSize = file.size;
    const diagPrefix = `[${fileType} · ${(fileSize / 1024).toFixed(0)}KB · ${fileName.slice(-20)}]`;

    if (fileType.includes("heic") || fileType.includes("heif") || fileName.endsWith(".heic") || fileName.endsWith(".heif")) {
      setErrorMsg(`HEIC/HEIF wird nicht unterstützt. ${diagPrefix} Bitte iPhone-Einstellungen → Kamera → Formate → 'Maximale Kompatibilität' wählen.`);
      setStatus("error");
      return;
    }

    setStatus("uploading");
    setErrorMsg("");
    setPreview(URL.createObjectURL(file));
    try {
      const fd = new FormData();
      fd.append("photo", file);
      const res = await fetch(`${API_BASE}/demo/upload/${token}`, {
        method: "POST",
        body: fd,
      });
      const rawText = await res.text();
      let data: any = {};
      try { data = JSON.parse(rawText); } catch { /* not json */ }

      if (!res.ok) {
        if (res.status === 410) {
          setStatus("expired");
        } else if (res.status === 409) {
          setErrorMsg(`Dieser QR-Code wurde bereits verwendet. ${diagPrefix}`);
          setStatus("error");
        } else {
          const serverMsg = data?.error || data?.message || rawText.slice(0, 120) || "(leere Antwort)";
          setErrorMsg(`HTTP ${res.status} · ${serverMsg} ${diagPrefix} → ${API_BASE}`);
          setStatus("error");
        }
        return;
      }
      setStatus("done");
    } catch (e: any) {
      setErrorMsg(`Netzwerkfehler: ${e?.message || "unbekannt"} ${diagPrefix} → ${API_BASE}`);
      setStatus("error");
    }
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-background via-background to-primary/5 flex flex-col">
      {/* Header */}
      <header className="px-4 pt-6 pb-4 text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
          <Sparkles className="h-3 w-3" />
          DERM247 · Demo
        </div>
        <h1 className="mt-3 text-xl font-semibold text-foreground">Foto hochladen</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Nur für die Demo · Bild wird nach Übertragung sofort gelöscht
        </p>
      </header>

      <main className="flex-1 px-4 pb-8 flex flex-col items-center justify-center">
        {status === "invalid" && (
          <Card icon={<AlertCircle className="h-8 w-8 text-destructive" />} title="Ungültiger Link">
            Dieser QR-Code ist nicht (mehr) gültig. Bitte zurück zur Demo gehen und einen neuen Code generieren.
          </Card>
        )}

        {status === "expired" && (
          <Card icon={<AlertCircle className="h-8 w-8 text-clinical-warning" />} title="Link abgelaufen">
            Der QR-Code ist abgelaufen (15 min). Bitte einen neuen QR-Code in der Demo generieren.
          </Card>
        )}

        {status === "done" && (
          <Card icon={<CheckCircle2 className="h-8 w-8 text-clinical-success" />} title="Foto erfolgreich übertragen">
            Sie können jetzt zum Computer zurückkehren — das Bild erscheint dort in wenigen Sekunden.
            {preview && (
              <img src={preview} alt="Hochgeladen" className="mt-4 mx-auto max-h-48 rounded-lg border border-border" />
            )}
          </Card>
        )}

        {status === "uploading" && (
          <Card icon={<Loader2 className="h-8 w-8 animate-spin text-primary" />} title="Wird übertragen…">
            Bitte einen Moment — Ihr Foto wird sicher hochgeladen.
            {preview && (
              <img src={preview} alt="Vorschau" className="mt-4 mx-auto max-h-48 rounded-lg border border-border opacity-60" />
            )}
          </Card>
        )}

        {(status === "idle" || status === "error") && (
          <div className="w-full max-w-sm space-y-3">
            {status === "error" && errorMsg && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive text-center">
                {errorMsg}
              </div>
            )}
            <Button
              size="lg"
              className="w-full h-16 text-base gap-3"
              onClick={() => cameraRef.current?.click()}
            >
              <Camera className="h-6 w-6" />
              Foto aufnehmen
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full h-16 text-base gap-3"
              onClick={() => galleryRef.current?.click()}
            >
              <Images className="h-6 w-6" />
              Aus Galerie wählen
            </Button>
            <p className="text-center text-[11px] text-muted-foreground pt-2">
              Das Bild wird direkt an den Desktop übertragen und danach sofort vom Server gelöscht
            </p>
          </div>
        )}

        <input
          ref={cameraRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
        />
        <input
          ref={galleryRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
        />
      </main>

      <footer className="px-4 py-4 text-center text-[10px] text-muted-foreground">
        Powered by DERM247 · Demo-Modus
      </footer>
    </div>
  );
};

const Card = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
  <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-lg">
    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted/50">
      {icon}
    </div>
    <h2 className="text-base font-semibold text-foreground">{title}</h2>
    <div className="mt-2 text-sm text-muted-foreground">{children}</div>
  </div>
);

export default DemoUpload;
