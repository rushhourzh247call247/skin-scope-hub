import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Shield, ShieldCheck, ShieldOff, Lock, KeyRound } from "lucide-react";
import { toast } from "sonner";

const Settings = () => {
  const { user, login } = useAuth();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.two_factor_enabled ?? false);

  // 2FA Setup state
  const [setupOpen, setSetupOpen] = useState(false);
  const [qrData, setQrData] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [setupLoading, setSetupLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleEnable2FA = async () => {
    setSetupLoading(true);
    try {
      const res = await api.enable2FA();
      setQrData(res.qr);
      setSetupOpen(true);
    } catch {
      toast.error("2FA konnte nicht aktiviert werden.");
    } finally {
      setSetupLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    if (verifyCode.length !== 6) return;
    setVerifyLoading(true);
    try {
      await api.verify2FA(verifyCode);
      setTwoFactorEnabled(true);
      setSetupOpen(false);
      setQrData(null);
      setVerifyCode("");
      toast.success("2FA erfolgreich aktiviert! 🔐");
    } catch {
      toast.error("Code ungültig. Bitte erneut versuchen.");
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    try {
      await api.disable2FA();
      setTwoFactorEnabled(false);
      toast.success("2FA deaktiviert.");
    } catch {
      toast.error("2FA konnte nicht deaktiviert werden.");
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwörter stimmen nicht überein.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Neues Passwort muss mindestens 8 Zeichen haben.");
      return;
    }
    setPasswordLoading(true);
    try {
      await api.changeOwnPassword(currentPassword, newPassword, confirmPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Passwort erfolgreich geändert.");
    } catch {
      toast.error("Passwort konnte nicht geändert werden. Bitte aktuelles Passwort prüfen.");
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Einstellungen</h1>
        <p className="text-sm text-muted-foreground">Sicherheit & Kontoeinstellungen</p>
      </div>

      {/* 2FA Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Zwei-Faktor-Authentifizierung (2FA)
          </CardTitle>
          <CardDescription>
            Schützen Sie Ihr Konto mit Google Authenticator oder einer kompatiblen App.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {twoFactorEnabled ? (
            <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-6 w-6 text-primary" />
                <div>
                  <p className="font-medium text-foreground">2FA ist aktiv</p>
                  <p className="text-sm text-muted-foreground">Ihr Konto ist zusätzlich geschützt.</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleDisable2FA} className="text-destructive hover:bg-destructive/10">
                <ShieldOff className="mr-2 h-4 w-4" />
                Deaktivieren
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <Shield className="h-6 w-6 text-muted-foreground" />
                <div>
                  <p className="font-medium text-foreground">2FA ist nicht aktiv</p>
                  <p className="text-sm text-muted-foreground">Aktivieren Sie 2FA für mehr Sicherheit.</p>
                </div>
              </div>
              <Button onClick={handleEnable2FA} disabled={setupLoading} size="sm">
                <Lock className="mr-2 h-4 w-4" />
                {setupLoading ? "Wird geladen…" : "2FA aktivieren"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Password Change Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Passwort ändern
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="current-pw">Aktuelles Passwort</Label>
              <Input id="current-pw" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-pw">Neues Passwort</Label>
              <Input id="new-pw" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-pw">Passwort bestätigen</Label>
              <Input id="confirm-pw" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
            <Button type="submit" disabled={passwordLoading}>
              {passwordLoading ? "Wird gespeichert…" : "Passwort ändern"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 2FA Setup Dialog */}
      <Dialog open={setupOpen} onOpenChange={setSetupOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              2FA einrichten
            </DialogTitle>
            <DialogDescription>
              Scannen Sie den QR-Code mit Ihrer Authenticator-App (z.B. Google Authenticator).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {qrData && (
              <div className="flex justify-center rounded-lg border bg-white p-4">
                <img src={qrData} alt="2FA QR-Code" className="h-48 w-48" />
              </div>
            )}
            <p className="text-center text-sm text-muted-foreground">
              Im Authenticator wird <span className="font-semibold text-foreground">Derm247</span> angezeigt.
            </p>
            <div className="space-y-2">
              <Label htmlFor="totp-code">6-stelliger Code aus der App</Label>
              <Input
                id="totp-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="text-center text-2xl tracking-[0.5em] font-mono"
                autoComplete="one-time-code"
              />
            </div>
            <Button className="w-full" onClick={handleVerify2FA} disabled={verifyCode.length !== 6 || verifyLoading}>
              {verifyLoading ? "Wird geprüft…" : "Code bestätigen & aktivieren"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Settings;
