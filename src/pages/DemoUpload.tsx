import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Camera, Images, CheckCircle2, AlertCircle, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SUPPORTED_LANGUAGES } from "@/i18n";
import { LanguageFlag } from "@/components/LanguageFlag";

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
  const { t, i18n } = useTranslation();
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

    const fileName = file.name?.toLowerCase() || t("demoUpload.noName");
    const fileType = file.type?.toLowerCase() || t("demoUpload.noType");
    const fileSize = file.size;
    const diagPrefix = `[${fileType} · ${(fileSize / 1024).toFixed(0)}KB · ${fileName.slice(-20)}]`;

    if (fileType.includes("heic") || fileType.includes("heif") || fileName.endsWith(".heic") || fileName.endsWith(".heif")) {
      setErrorMsg(t("demoUpload.errHeic", { diag: diagPrefix }));
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
          setErrorMsg(t("demoUpload.errAlreadyUsed", { diag: diagPrefix }));
          setStatus("error");
        } else {
          const serverMsg = data?.error || data?.message || rawText.slice(0, 120) || t("demoUpload.errEmpty");
          setErrorMsg(t("demoUpload.errHttp", { status: res.status, msg: serverMsg, diag: diagPrefix, api: API_BASE }));
          setStatus("error");
        }
        return;
      }
      setStatus("done");
    } catch (e: any) {
      setErrorMsg(t("demoUpload.errNetwork", { msg: e?.message || t("demoUpload.errUnknown"), diag: diagPrefix, api: API_BASE }));
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
        <h1 className="mt-3 text-xl font-semibold text-foreground">{t("demoUpload.title")}</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("demoUpload.subtitle")}
        </p>

        {/* Language flags */}
        <div className="mt-3 inline-flex items-center gap-0.5 rounded-full border border-border bg-card/80 px-1 py-0.5 backdrop-blur">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => i18n.changeLanguage(lang.code)}
              className={`text-xs px-1.5 py-0.5 rounded-full transition-colors ${
                i18n.language === lang.code ? "bg-primary/10" : "opacity-50 hover:opacity-100"
              }`}
              title={lang.label}
              aria-label={lang.label}
            >
              <LanguageFlag code={lang.code} />
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 px-4 pb-8 flex flex-col items-center justify-center">
        {status === "invalid" && (
          <Card icon={<AlertCircle className="h-8 w-8 text-destructive" />} title={t("demoUpload.invalidTitle")}>
            {t("demoUpload.invalidBody")}
          </Card>
        )}

        {status === "expired" && (
          <Card icon={<AlertCircle className="h-8 w-8 text-clinical-warning" />} title={t("demoUpload.expiredTitle")}>
            {t("demoUpload.expiredBody")}
          </Card>
        )}

        {status === "done" && (
          <Card icon={<CheckCircle2 className="h-8 w-8 text-clinical-success" />} title={t("demoUpload.doneTitle")}>
            {t("demoUpload.doneBody")}
            {preview && (
              <img src={preview} alt={t("demoUpload.uploadedAlt")} className="mt-4 mx-auto max-h-48 rounded-lg border border-border" />
            )}
          </Card>
        )}

        {status === "uploading" && (
          <Card icon={<Loader2 className="h-8 w-8 animate-spin text-primary" />} title={t("demoUpload.uploadingTitle")}>
            {t("demoUpload.uploadingBody")}
            {preview && (
              <img src={preview} alt={t("demoUpload.previewAlt")} className="mt-4 mx-auto max-h-48 rounded-lg border border-border opacity-60" />
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
              {t("demoUpload.takePhoto")}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full h-16 text-base gap-3"
              onClick={() => galleryRef.current?.click()}
            >
              <Images className="h-6 w-6" />
              {t("demoUpload.fromGallery")}
            </Button>
            <p className="text-center text-[11px] text-muted-foreground pt-2">
              {t("demoUpload.deleteHint")}
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
        {t("demoUpload.footer")}
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
