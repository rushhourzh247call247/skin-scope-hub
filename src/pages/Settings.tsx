import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Shield, ShieldCheck, ShieldOff, Lock, KeyRound, Globe } from "lucide-react";
import { toast } from "sonner";
import { SUPPORTED_LANGUAGES } from "@/i18n";
import { LanguageFlag } from "@/components/LanguageFlag";

const Settings = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.two_factor_enabled ?? false);

  const [setupOpen, setSetupOpen] = useState(false);
  const [qrData, setQrData] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [setupLoading, setSetupLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);

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
      toast.error(t("settings.twoFactor.enableError"));
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
      toast.success(t("settings.twoFactor.enableSuccess"));
    } catch {
      toast.error(t("settings.twoFactor.setup.invalidCode"));
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    try {
      await api.disable2FA();
      setTwoFactorEnabled(false);
      toast.success(t("settings.twoFactor.disabled"));
    } catch {
      toast.error(t("settings.twoFactor.disableError"));
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error(t("settings.password.mismatch"));
      return;
    }
    if (newPassword.length < 8) {
      toast.error(t("settings.password.tooShort"));
      return;
    }
    setPasswordLoading(true);
    try {
      await api.changeOwnPassword(currentPassword, newPassword, confirmPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success(t("settings.password.success"));
    } catch {
      toast.error(t("settings.password.error"));
    } finally {
      setPasswordLoading(false);
    }
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    toast.success(t("settings.language.changed"));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("settings.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("settings.subtitle")}</p>
      </div>

      {/* Language Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            {t("settings.language.title")}
          </CardTitle>
          <CardDescription>{t("settings.language.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
                className={`flex items-center gap-2 rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition-all ${
                  i18n.language === lang.code
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                <LanguageFlag code={lang.code} />
                {lang.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 2FA Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {t("settings.twoFactor.title")}
          </CardTitle>
          <CardDescription>{t("settings.twoFactor.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {twoFactorEnabled ? (
            <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-6 w-6 text-primary" />
                <div>
                  <p className="font-medium text-foreground">{t("settings.twoFactor.active")}</p>
                  <p className="text-sm text-muted-foreground">{t("settings.twoFactor.activeDescription")}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleDisable2FA} className="text-destructive hover:bg-destructive/10">
                <ShieldOff className="mr-2 h-4 w-4" />
                {t("settings.twoFactor.disable")}
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <Shield className="h-6 w-6 text-muted-foreground" />
                <div>
                  <p className="font-medium text-foreground">{t("settings.twoFactor.inactive")}</p>
                  <p className="text-sm text-muted-foreground">{t("settings.twoFactor.inactiveDescription")}</p>
                </div>
              </div>
              <Button onClick={handleEnable2FA} disabled={setupLoading} size="sm">
                <Lock className="mr-2 h-4 w-4" />
                {setupLoading ? t("settings.twoFactor.enableLoading") : t("settings.twoFactor.enable")}
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
            {t("settings.password.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="current-pw">{t("settings.password.current")}</Label>
              <Input id="current-pw" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-pw">{t("settings.password.new")}</Label>
              <Input id="new-pw" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-pw">{t("settings.password.confirm")}</Label>
              <Input id="confirm-pw" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
            <Button type="submit" disabled={passwordLoading}>
              {passwordLoading ? t("settings.password.submitting") : t("settings.password.submit")}
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
              {t("settings.twoFactor.setup.title")}
            </DialogTitle>
            <DialogDescription>{t("settings.twoFactor.setup.description")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {qrData && (
              <div className="flex justify-center rounded-lg border bg-white p-4">
                <img src={qrData} alt="2FA QR-Code" className="h-48 w-48" />
              </div>
            )}
            <p className="text-center text-sm text-muted-foreground">{t("settings.twoFactor.setup.appNotePlain")}</p>
            <div className="space-y-2">
              <Label htmlFor="totp-code">{t("settings.twoFactor.setup.codeLabel")}</Label>
              <Input
                id="totp-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder={t("settings.twoFactor.setup.codePlaceholder")}
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="text-center text-2xl tracking-[0.5em] font-mono"
                autoComplete="one-time-code"
              />
            </div>
            <Button className="w-full" onClick={handleVerify2FA} disabled={verifyCode.length !== 6 || verifyLoading}>
              {verifyLoading ? t("settings.twoFactor.setup.submitting") : t("settings.twoFactor.setup.submit")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Settings;
