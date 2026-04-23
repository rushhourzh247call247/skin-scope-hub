import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Users, Building2, ArrowRight, UserPlus, Search, UsersRound } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StorageOverview from "@/components/StorageOverview";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/dateUtils";
import { useLifecycle } from "@/hooks/use-lifecycle";

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

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { isReadOnly, readOnlyTooltip } = useLifecycle();
  const isAdmin = user?.role === "admin";
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: api.getDashboardStats,
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = search.trim();
    navigate(q ? `/patients?q=${encodeURIComponent(q)}` : "/patients");
  };

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
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("dashboard.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("dashboard.subtitle")}</p>
      </div>

      {!isAdmin && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-4 lg:p-6">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              <Button
                size="lg"
                className="gap-2 lg:shrink-0"
                onClick={() => navigate("/patients/new")}
                disabled={isReadOnly}
                title={isReadOnly ? readOnlyTooltip : undefined}
              >
                <UserPlus className="h-5 w-5" />
                {t("nav.newPatient")}
              </Button>
              <form onSubmit={handleSearchSubmit} className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder={t("patients.searchPlaceholder")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-11 bg-background"
                />
              </form>
            </div>
          </CardContent>
        </Card>
      )}

      <div className={`grid gap-4 sm:grid-cols-2 ${isAdmin ? "lg:grid-cols-2" : "lg:grid-cols-1"}`}>
        <StatCard title={t("dashboard.patients")} value={data.totalPatients ?? 0} icon={Users} color="bg-primary/10 text-primary" onClick={() => navigate("/patients")} />
        {isAdmin && (
          <StatCard title={t("dashboard.companies")} value={data.totalCompanies ?? 0} icon={Building2} color="bg-secondary text-secondary-foreground" onClick={() => navigate("/companies")} />
        )}
      </div>

      {isAdmin && <StorageOverview />}
      {isAdmin && <CompanyUserCounts />}

      {data.recentPatients && data.recentPatients.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">{t("dashboard.recentPatients")}</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate("/patients")}>
              {t("dashboard.showAll")} <ArrowRight className="ml-1 h-4 w-4" />
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
                      {t("dashboard.born")} {p.birth_date ? formatDate(p.birth_date, "dd. MMM yyyy") : "\u2013"}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {p.created_at ? formatDate(p.created_at, "dd.MM.yyyy") : "\u2013"}
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

const CompanyUserCounts = () => {
  const { t } = useTranslation();
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
          <UsersRound className="h-5 w-5" /> {t("dashboard.usersPerCompany")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("dashboard.company")}</TableHead>
              <TableHead className="text-right">{t("dashboard.userCount")}</TableHead>
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

export default Dashboard;
