import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Users, MapPin, ImageIcon, Building2, ArrowRight, ShieldAlert, Eye, ShieldCheck, UsersRound } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useState } from "react";

const StatCard = ({ title, value, icon: Icon, color, onClick }: { title: string; value: number; icon: any; color: string; onClick?: () => void }) => (
  <Card
    className={onClick ? "cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]" : ""}
    onClick={onClick}
  >
    <CardContent className="flex items-center gap-4 p-6">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${color}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold text-foreground">{value}</p>
      </div>
    </CardContent>
  </Card>
);

type RiskLevel = "high" | "medium" | "low" | null;

const riskConfig = {
  high: {
    label: "Kritisch",
    emoji: "🔴",
    icon: ShieldAlert,
    bgClass: "bg-[hsl(var(--risk-high-bg))] border-[hsl(var(--risk-high))]/20",
    textClass: "text-[hsl(var(--risk-high))]",
    countClass: "text-[hsl(var(--risk-high))]",
  },
  medium: {
    label: "Beobachten",
    emoji: "🟡",
    icon: Eye,
    bgClass: "bg-[hsl(var(--risk-medium-bg))] border-[hsl(var(--risk-medium))]/20",
    textClass: "text-[hsl(var(--risk-medium))]",
    countClass: "text-[hsl(var(--risk-medium))]",
  },
  low: {
    label: "Unauffällig",
    emoji: "🟢",
    icon: ShieldCheck,
    bgClass: "bg-[hsl(var(--risk-low-bg))] border-[hsl(var(--risk-low))]/20",
    textClass: "text-[hsl(var(--risk-low))]",
    countClass: "text-[hsl(var(--risk-low))]",
  },
};

const RiskCard = ({
  level,
  count,
  active,
  onClick,
}: {
  level: "high" | "medium" | "low";
  count: number;
  active: boolean;
  onClick: () => void;
}) => {
  const cfg = riskConfig[level];
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border p-4 text-left transition-all ${cfg.bgClass} ${
        count === 0 ? "opacity-40" : ""
      } ${
        active ? "ring-2 ring-ring shadow-md scale-[1.02]" : "hover:shadow-sm hover:scale-[1.01]"
      }`}
    >
      <div className={`flex items-center gap-2 text-sm font-semibold ${cfg.textClass}`}>
        <cfg.icon className="h-4 w-4" />
        {cfg.emoji} {cfg.label}
      </div>
      <p className={`mt-1 text-3xl font-bold tabular-nums ${cfg.countClass}`}>{count}</p>
      <p className="text-xs text-muted-foreground mt-0.5">
        {count === 1 ? "Stelle" : "Stellen"}
      </p>
    </button>
  );
};

const CompanyUserCounts = () => {
  const { data: companies } = useQuery({ queryKey: ["companies"], queryFn: api.getCompanies });
  const { data: users } = useQuery({ queryKey: ["users"], queryFn: api.getUsers });

  if (!companies || !users) return null;

  const countMap = new Map<number, number>();
  for (const u of users) {
    countMap.set(u.company_id, (countMap.get(u.company_id) || 0) + 1);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <UsersRound className="h-5 w-5" /> Benutzer pro Firma
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Firma</TableHead>
              <TableHead className="text-right">Benutzer</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map((c: any) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-right tabular-nums">{countMap.get(c.id) || 0}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [riskFilter, setRiskFilter] = useState<RiskLevel>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: api.getDashboardStats,
  });

  const { data: riskStats } = useQuery({
    queryKey: ["dashboard-risk"],
    queryFn: api.getRiskStats,
  });

  const toggleFilter = (level: RiskLevel) => {
    setRiskFilter((prev) => (prev === level ? null : level));
  };

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const risk = riskStats ?? { low: 0, medium: 0, high: 0 };

  return (
    <div className="container py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Übersicht über Ihre DermTrack-Daten</p>
      </div>

      {/* Ampel-System (nur für reguläre Benutzer) */}
      {!isAdmin && (
        <div>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground uppercase tracking-wider">Risiko-Übersicht</h2>
          <div className="grid grid-cols-3 gap-3">
            <RiskCard level="high" count={risk.high} active={riskFilter === "high"} onClick={() => toggleFilter("high")} />
            <RiskCard level="medium" count={risk.medium} active={riskFilter === "medium"} onClick={() => toggleFilter("medium")} />
            <RiskCard level="low" count={risk.low} active={riskFilter === "low"} onClick={() => toggleFilter("low")} />
          </div>
          {riskFilter && (
            <p className="mt-2 text-xs text-muted-foreground">
              Filter aktiv: <span className={`font-medium ${riskConfig[riskFilter].textClass}`}>{riskConfig[riskFilter].label}</span>
              {" · "}
              <button onClick={() => setRiskFilter(null)} className="underline hover:text-foreground transition-colors">
                Zurücksetzen
              </button>
            </p>
          )}
        </div>
      )}

      {/* Stats Grid */}
      <div className={`grid gap-4 sm:grid-cols-2 ${isAdmin ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        <StatCard title="Patienten" value={data.totalPatients ?? 0} icon={Users} color="bg-primary/10 text-primary" onClick={() => navigate("/patients")} />
        <StatCard title="Körperstellen" value={data.totalLocations ?? 0} icon={MapPin} color="bg-accent/10 text-accent" onClick={() => navigate("/patients")} />
        <StatCard title="Aufnahmen" value={data.totalImages ?? 0} icon={ImageIcon} color="bg-[hsl(var(--clinical-warning))]/10 text-[hsl(var(--clinical-warning))]" onClick={() => navigate("/patients")} />
        {isAdmin && (
          <StatCard title="Firmen" value={data.totalCompanies ?? 0} icon={Building2} color="bg-secondary text-secondary-foreground" onClick={() => navigate("/companies")} />
        )}
      </div>

      {/* Company User Counts (Admin only) */}
      {isAdmin && <CompanyUserCounts />}

      {/* Recent Patients */}
      {data.recentPatients && data.recentPatients.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Letzte Patienten</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate("/patients")}>
              Alle anzeigen <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.recentPatients.map((p: any) => (
                <button
                  key={p.id}
                  onClick={() => navigate(`/patient/${p.id}`)}
                  className="flex w-full items-center gap-3 rounded-md border bg-card px-4 py-3 text-left transition-colors hover:bg-muted/50"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-sm font-medium text-secondary-foreground">
                    {p.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Geb. {p.birth_date ? format(new Date(p.birth_date), "dd. MMM yyyy", { locale: de }) : "–"}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {p.created_at ? format(new Date(p.created_at), "dd.MM.yyyy", { locale: de }) : "–"}
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
