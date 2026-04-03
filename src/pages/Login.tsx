import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { DermLogo } from "@/components/DermLogo";
import { LogIn, Shield, Clock } from "lucide-react";

const Login = () => {
  const { setSession } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 2FA state
  const [needs2FA, setNeeds2FA] = useState(false);
  const [pendingUser, setPendingUser] = useState<any>(null);
  const [pendingToken, setPendingToken] = useState<string>("");
  const [totpCode, setTotpCode] = useState("");
  const [verifying2FA, setVerifying2FA] = useState(false);

  // Rate-limit lockout state
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(0);

  // Countdown timer
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
    setError(`Zu viele Anmeldeversuche. Bitte warten Sie ${Math.ceil(seconds / 60)} Minute(n).`);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
    setError("");
    setLoading(true);
    try {
      const res = await api.login({ email, password });
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
      } else {
        setError("Login fehlgeschlagen. Bitte prüfen Sie Ihre Zugangsdaten.");
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
      setError("Ungültiger Code. Bitte erneut versuchen.");
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
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <DermLogo size="lg" className="justify-center" />
          <CardDescription className="mt-2">
            {needs2FA ? "Geben Sie den Code aus Ihrer Authenticator-App ein" : "Melden Sie sich an, um fortzufahren"}
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
                  <span>Gesperrt — {formatCountdown(countdown)}</span>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@praxis.de" disabled={isLocked} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Passwort</Label>
                <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" disabled={isLocked} />
              </div>
              <Button className="w-full" type="submit" disabled={loading || isLocked}>
                {isLocked
                  ? `Gesperrt (${formatCountdown(countdown)})`
                  : loading
                    ? "Anmeldung…"
                    : <><LogIn className="mr-2 h-4 w-4" /> Anmelden</>}
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
                <Label htmlFor="totp">6-stelliger Code</Label>
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
                {verifying2FA ? "Wird geprüft…" : <><Shield className="mr-2 h-4 w-4" /> Bestätigen</>}
              </Button>
              <button type="button" onClick={handleBack} className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors">
                ← Zurück zum Login
              </button>
            </form>
          )}
          <p className="mt-4 text-center text-[9px] text-muted-foreground/50">
            designed by{" "}
            <a href="https://www.techassist.ch" target="_blank" rel="noopener noreferrer" className="font-medium hover:text-muted-foreground transition-colors">
              techassist.ch
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
