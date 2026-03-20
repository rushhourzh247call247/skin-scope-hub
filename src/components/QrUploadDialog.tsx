import { useState, useEffect } from "react";
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
import { QrCode, Copy, Check, Clock, MapPin, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface QrUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: number;
  patientName: string;
  locationId: number;
  locationName: string;
}

const FRONTEND_DOMAIN = typeof window !== 'undefined' ? window.location.origin : "https://app.derm247.ch";

const QrUploadDialog = ({
  open,
  onOpenChange,
  patientId,
  patientName,
  locationId,
  locationName,
}: QrUploadDialogProps) => {
  const [session, setSession] = useState<{
    token: string;
    expires_at: string;
    upload_url: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [expiresIn, setExpiresIn] = useState<number | null>(null);

  const createSession = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.createUploadSession({
        patient_id: patientId,
        location_id: locationId,
      });
      const uploadUrl = `${FRONTEND_DOMAIN}/upload?token=${result.token}`;
      setSession({
        token: result.token,
        expires_at: result.expires_at || '',
        upload_url: uploadUrl,
      });
    } catch (err: any) {
      setError(err.message || "Session konnte nicht erstellt werden");
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
    }
  }, [open]);

  const handleOpen = (isOpen: boolean) => {
    onOpenChange(isOpen);
  };

  const copyUrl = async () => {
    if (!session) return;
    await navigator.clipboard.writeText(session.upload_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const expiresIn = session?.expires_at
    ? Math.max(0, Math.round((new Date(session.expires_at).getTime() - Date.now()) / 60000))
    : 0;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <QrCode className="h-4 w-4 text-primary" />
            QR Foto-Upload
          </DialogTitle>
          <DialogDescription className="text-xs">
            Scannen Sie den QR-Code mit dem Handy, um Fotos direkt diesem Spot zuzuordnen.
          </DialogDescription>
        </DialogHeader>

        {/* Patient & Location info */}
        <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Patient:</span>
            <span className="font-medium text-foreground">{patientName}</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <MapPin className="h-3 w-3 text-primary" />
            <span className="text-muted-foreground">Stelle:</span>
            <span className="font-medium text-foreground">{locationName}</span>
          </div>
        </div>

        {loading && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Session wird erstellt…</p>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center space-y-3">
            <p className="text-xs text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={createSession}>
              Erneut versuchen
            </Button>
          </div>
        )}

        {session && !loading && !error && (
          <div className="space-y-4">
            {/* QR Code */}
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

            {/* Expiry */}
            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Gültig für {expiresIn} Minuten</span>
            </div>

            {/* Copy URL */}
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs gap-1.5"
              onClick={copyUrl}
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-clinical-success" /> Kopiert!
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" /> Link kopieren
                </>
              )}
            </Button>

            {/* Regenerate */}
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground"
              onClick={createSession}
            >
              Neuen QR-Code generieren
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default QrUploadDialog;
