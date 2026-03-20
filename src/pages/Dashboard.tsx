import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { Users, MapPin, ImageIcon, Building2, UserCog, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const StatCard = ({ title, value, icon: Icon, color }: { title: string; value: number; icon: any; color: string }) => (
  <Card>
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

const Dashboard = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: api.getDashboardStats,
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Übersicht über Ihre DermTrack-Daten</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Patienten" value={data.totalPatients ?? 0} icon={Users} color="bg-primary/10 text-primary" />
        <StatCard title="Körperstellen" value={data.totalLocations ?? 0} icon={MapPin} color="bg-accent/10 text-accent" />
        <StatCard title="Aufnahmen" value={data.totalImages ?? 0} icon={ImageIcon} color="bg-[hsl(var(--clinical-warning))]/10 text-[hsl(var(--clinical-warning))]" />
        <StatCard title="Firmen" value={data.totalCompanies ?? 0} icon={Building2} color="bg-secondary text-secondary-foreground" />
      </div>

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
