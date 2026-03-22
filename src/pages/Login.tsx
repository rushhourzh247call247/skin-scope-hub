import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { DermLogo } from "@/components/DermLogo";
import { LogIn, Shield } from "lucide-react";

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 2FA state
  const [needs2FA, setNeeds2FA] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [verifying2FA, setVerifying2FA] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      // Check if user has 2FA enabled
      const savedUser = sessionStorage.getItem("auth_user");
      const user = savedUser ? JSON.parse(savedUser) : null;
      if (user?.two_factor_enabled) {
        setNeeds2FA(true);
        setLoading(false);
        return;
      }
      navigate("/");
    } catch (err: any) {
      setError("Login fehlgeschlagen. Bitte prüfen Sie Ihre Zugangsdaten.");
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
      navigate("/");
    } catch {
      setError("Ungültiger Code. Bitte erneut versuchen.");
    } finally {
      setVerifying2FA(false);
    }
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
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@praxis.de" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Passwort</Label>
                <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              </div>
              <Button className="w-full" type="submit" disabled={loading}>
                {loading ? "Anmeldung…" : <><LogIn className="mr-2 h-4 w-4" /> Anmelden</>}
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
              <button type="button" onClick={() => { setNeeds2FA(false); setTotpCode(""); setError(""); }} className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors">
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
