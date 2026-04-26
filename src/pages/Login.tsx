import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { DermLogo } from "@/components/DermLogo";
import { LogIn, Shield, Clock, Stethoscope, Sparkles, ArrowRight } from "lucide-react";
import { SUPPORTED_LANGUAGES } from "@/i18n";
import { LanguageFlag } from "@/components/LanguageFlag";
import { Link } from "react-router-dom";



const Login = () => {
  const { t, i18n } = useTranslation();
  const { setSession, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [needs2FA, setNeeds2FA] = useState(false);
  const [pendingUser, setPendingUser] = useState<any>(null);
  const [pendingToken, setPendingToken] = useState<string>("");
  const [totpCode, setTotpCode] = useState("");
  const [verifying2FA, setVerifying2FA] = useState(false);

  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (!lockedUntil) {
      setCountdown(0);
      return;
    }
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000));
      setCountdown(remaining);
      if (remaining <= 0) setLockedUntil(null);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  const isLocked = countdown > 0;

  const handleRateLimitError = useCallback((err: any) => {
    const seconds = (err as any).retryAfter ?? 120;
    setLockedUntil(Date.now() + seconds * 1000);
    setError(t("login.tooManyAttempts", { minutes: Math.ceil(seconds / 60) }));
  }, [t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
    setError("");
    setLoading(true);
    try {
      const res = await login(email, password);
      if (res.user?.two_factor_enabled) {
        setPendingUser(res.user);
        setPendingToken(res.token);
        api.setToken(res.token);
        setNeeds2FA(true);
      } else {
        setSession(res.user, res.token);
        navigate("/");
      }
    } catch (err: any) {
      if (err?.status === 429) {
        handleRateLimitError(err);
      } else if (err?.suspended) {
        setError(err.message || t("login.accountSuspended"));
      } else {
        setError(t("login.failed"));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totpCode.length !== 6) return;
    setError("");
    setVerifying2FA(true);
    try {
      await api.verify2FA(totpCode);
      setSession(pendingUser, pendingToken);
      navigate("/");
    } catch {
      setError(t("login.twoFactor.invalid"));
    } finally {
      setVerifying2FA(false);
    }
  };

  const handleBack = () => {
    setNeeds2FA(false);
    setTotpCode("");
    setError("");
    setPendingUser(null);
    setPendingToken("");
    api.setToken(null);
  };

  const formatCountdown = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}:${String(sec).padStart(2, "0")}` : `${sec}s`;
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm">
        <Card className="w-full border-0 shadow-none sm:border sm:shadow-sm">
        <CardHeader className="text-center">
          <DermLogo size="lg" className="justify-center" />
          <CardDescription className="mt-2">
            {needs2FA ? t("login.twoFactor.subtitle") : t("login.subtitle")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!needs2FA ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              {isLocked && (
                <div className="flex items-center justify-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
                  <Clock className="h-4 w-4" />
                  <span>{t("login.locked")} — {formatCountdown(countdown)}</span>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">{t("login.email")}</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("login.emailPlaceholder")} disabled={isLocked} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t("login.password")}</Label>
                <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("login.passwordPlaceholder")} disabled={isLocked} />
              </div>
              <Button className="w-full" type="submit" disabled={loading || isLocked}>
                {isLocked
                  ? t("login.lockedCountdown", { countdown: formatCountdown(countdown) })
                  : loading
                    ? t("login.submitting")
                    : <><LogIn className="mr-2 h-4 w-4" /> {t("login.submit")}</>}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerify2FA} className="space-y-4">
              {error && (
                <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              <div className="flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="totp">{t("login.twoFactor.codeLabel")}</Label>
                <Input
                  id="totp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="text-center text-2xl tracking-[0.5em] font-mono"
                  autoComplete="one-time-code"
                  autoFocus
                  required
                />
              </div>
              <Button className="w-full" type="submit" disabled={totpCode.length !== 6 || verifying2FA}>
                {verifying2FA ? t("login.twoFactor.submitting") : <><Shield className="mr-2 h-4 w-4" /> {t("login.twoFactor.submit")}</>}
              </Button>
              <button type="button" onClick={handleBack} className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t("login.twoFactor.backToLogin")}
              </button>
            </form>
          )}

          {/* Language selector */}
          <div className="mt-4 flex justify-center gap-1.5">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => i18n.changeLanguage(lang.code)}
                className={`text-xs px-2 py-1 rounded transition-colors flex items-center gap-1 ${
                  i18n.language === lang.code
                    ? "text-primary font-medium bg-primary/5"
                    : "text-muted-foreground/50 hover:text-muted-foreground"
                }`}
                title={lang.label}
              >
                <LanguageFlag code={lang.code} />
                <span>{lang.code.toUpperCase()}</span>
              </button>
            ))}
          </div>

          {/* Demo hint */}
          <Link
            to="/demo"
            className="mt-4 flex items-center justify-center gap-1.5 rounded-md border border-dashed border-primary/30 bg-primary/5 px-3 py-2 text-xs text-primary hover:bg-primary/10 hover:border-primary/50 transition-colors"
          >
            <Sparkles className="h-3 w-3" />
            <span>{t("demo.tryDemo")}</span>
            <ArrowRight className="h-3 w-3" />
          </Link>

          <p className="mt-3 text-center text-[9px] text-muted-foreground/50">
            designed by{" "}
            <a href="https://www.techassist.ch" target="_blank" rel="noopener noreferrer" className="font-medium hover:text-muted-foreground transition-colors">
              techassist.ch
            </a>
          </p>
        </CardContent>
      </Card>
      </div>

      {/* Tagline footer */}
      <div className="mt-8 text-center">
        <div className="text-xs font-semibold tracking-wide text-foreground/80">
          {t("demo.tagline1")}
        </div>
        <div className="text-[10px] text-muted-foreground tracking-wider">
          {t("demo.tagline2")}
        </div>
      </div>
    </div>
  );
};

export default Login;

