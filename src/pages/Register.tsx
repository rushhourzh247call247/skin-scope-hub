import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UserPlus } from "lucide-react";

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register({ name, email, password, company_name: companyName });
      navigate("/");
    } catch (err: any) {
      const msg = err?.message || "";
      console.error("Register error:", msg);
      setError(msg.includes("API Error") ? msg : "Registrierung fehlgeschlagen. Bitte prüfen Sie Ihre Eingaben.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-md bg-primary">
            <span className="text-lg font-bold text-primary-foreground">D</span>
          </div>
          <CardTitle className="text-xl">Konto erstellen</CardTitle>
          <CardDescription>Registrieren Sie Ihre Praxis bei DermTrack</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="company">Praxis / Firmenname</Label>
              <Input id="company" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Hautarztpraxis Muster" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Ihr Name</Label>
              <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Dr. Max Mustermann" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@praxis.de" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Passwort</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? "Registrierung…" : <><UserPlus className="mr-2 h-4 w-4" /> Registrieren</>}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Bereits ein Konto?{" "}
              <Link to="/login" className="font-medium text-primary hover:underline">
                Anmelden
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
