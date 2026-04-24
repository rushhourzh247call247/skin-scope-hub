import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { QRCodeSVG } from "qrcode.react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { QrCode, Copy, Check, Clock, MapPin, Loader2, ExternalLink } from "lucide-react";

interface QrUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: number;
  patientName: string;
  locationId: number;
  locationName: string;
}

const FRONTEND_DOMAIN = "https://derm247.ch";

const QrUploadDialog = ({
  open,
  onOpenChange,
  patientId,
  patientName,
  locationId,
  locationName,
}: QrUploadDialogProps) => {
  const { t } = useTranslation();
  const [session, setSession] = useState<{
    token: string;
    expires_at: string;
    upload_url: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [expiresIn, setExpiresIn] = useState<number | null>(null);

  const buildUploadUrl = (token: string, apiUploadUrl?: string) => {
    const fallbackUrl = `${FRONTEND_DOMAIN}/upload?token=${token}`;
    if (!apiUploadUrl) return fallbackUrl;

    try {
      const url = new URL(apiUploadUrl, FRONTEND_DOMAIN);
      return `${FRONTEND_DOMAIN}${url.pathname}${url.search || `?token=${token}`}`;
    } catch {
      return fallbackUrl;
    }
  };

  const createSession = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.createUploadSession({
        patient_id: patientId,
        location_id: locationId,
      });
      const uploadUrl = buildUploadUrl(result.token, result.upload_url);
      setSession({
        token: result.token,
        expires_at: result.expires_at || '',
        upload_url: uploadUrl,
      });
    } catch (err: any) {
      setError(err.message || t('qrUpload.sessionError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && !session && !loading && !error) {
      createSession();
    }
    if (!open) {
      setSession(null);
      setError(null);
      setExpiresIn(null);
    }
  }, [open]);

  useEffect(() => {
    if (!session?.expires_at) {
      if (session && !session.expires_at) {
        setExpiresIn(30);
      }
      return;
    }
    const update = () => {
      const mins = Math.max(0, Math.round((new Date(session.expires_at).getTime() - Date.now()) / 60000));
      setExpiresIn(mins);
    };
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [session?.expires_at]);

  const handleOpen = (isOpen: boolean) => {
    onOpenChange(isOpen);
  };

  const copyUrl = async () => {
    if (!session) return;
    await navigator.clipboard.writeText(session.upload_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayMinutes = expiresIn ?? 30;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <QrCode className="h-4 w-4 text-primary" />
            {t('qrUpload.title')}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {t('qrUpload.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">{t('qrUpload.patient')}</span>
            <span className="font-medium text-foreground">{patientName}</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <MapPin className="h-3 w-3 text-primary" />
            <span className="text-muted-foreground">{t('qrUpload.location')}</span>
            <span className="font-medium text-foreground">{locationName}</span>
          </div>
        </div>

        {loading && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">{t('qrUpload.sessionCreating')}</p>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center space-y-3">
            <p className="text-xs text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={createSession}>
              {t('qrUpload.retryBtn')}
            </Button>
          </div>
        )}

        {session && !loading && !error && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="rounded-xl border-2 border-primary/20 bg-white p-4">
                <QRCodeSVG
                  value={session.upload_url}
                  size={200}
                  level="M"
                  includeMargin={false}
                />
              </div>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{t('qrUpload.validFor', { minutes: displayMinutes })}</span>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs gap-1.5"
                onClick={copyUrl}
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 text-clinical-success" /> {t('qrUpload.copied')}
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" /> {t('qrUpload.copyLink')}
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs gap-1.5"
                asChild
              >
                <a href={session.upload_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3 w-3" /> {t('qrUpload.openLink')}
                </a>
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground"
              onClick={createSession}
            >
              {t('qrUpload.regenerate')}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default QrUploadDialog;
