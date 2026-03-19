import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DermLogo } from "@/components/DermLogo";
import { LogIn } from "lucide-react";

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@derm247.ch");
  const [password, setPassword] = useState("demo123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err: any) {
      setError("Login fehlgeschlagen. Bitte prüfen Sie Ihre Zugangsdaten.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <DermLogo size="lg" className="justify-center" />
          <CardDescription className="mt-2">Melden Sie sich an, um fortzufahren</CardDescription>
        </CardHeader>
        <CardContent>
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
            <p className="text-center text-xs text-muted-foreground">
              Demo: admin@derm247.ch / demo123
            </p>
          </form>
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
