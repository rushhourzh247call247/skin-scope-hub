import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, ScrollText, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { format, differenceInDays } from "date-fns";

export default function FinanceContracts() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ["all-contracts"],
    queryFn: () => api.getAllContracts(),
  });
  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => api.getCompanies(),
  });

  const enriched = useMemo(() => {
    return contracts.map((c: any) => {
      const company = companies.find((co: any) => co.id === c.company_id);
      const daysLeft = c.end_date ? differenceInDays(new Date(c.end_date), new Date()) : null;
      return { ...c, companyName: company?.name || `#${c.company_id}`, daysLeft };
    });
  }, [contracts, companies]);

  const filtered = enriched.filter((c: any) => {
    const matchSearch = !search ||
      c.companyName.toLowerCase().includes(search.toLowerCase()) ||
      c.contract_number?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const active = enriched.filter((c: any) => c.status === "active");
  const totalMRR = active.reduce((sum: number, c: any) => sum + (Number(c.monthly_price) || 0), 0);
  const expiringCount = active.filter((c: any) => c.daysLeft !== null && c.daysLeft <= 60 && c.daysLeft > 0).length;

  const statusBadge = (status: string, daysLeft: number | null) => {
    if (status === "active") {
      if (daysLeft !== null && daysLeft <= 14) return <Badge variant="destructive">Läuft aus</Badge>;
      if (daysLeft !== null && daysLeft <= 30) return <Badge className="bg-amber-500/10 text-amber-600 border-amber-200">Bald ablaufend</Badge>;
      return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">Aktiv</Badge>;
    }
    if (status === "terminated") return <Badge className="bg-red-500/10 text-red-600 border-red-200">Gekündigt</Badge>;
    if (status === "expired") return <Badge variant="secondary">Abgelaufen</Badge>;
    return <Badge variant="outline">{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Vertragsübersicht</h1>
        <p className="text-muted-foreground text-sm">Alle Mandantenverträge mit Laufzeiten und Konditionen</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground font-medium">Aktive Verträge</p>
            <p className="text-2xl font-bold">{active.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground font-medium">MRR gesamt</p>
            <p className="text-2xl font-bold">CHF {totalMRR.toLocaleString("de-CH")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground font-medium">Jahresumsatz (est.)</p>
            <p className="text-2xl font-bold">CHF {(totalMRR * 12).toLocaleString("de-CH")}</p>
          </CardContent>
        </Card>
        <Card className={expiringCount > 0 ? "border-amber-200/60" : ""}>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground font-medium">Bald ablaufend</p>
            <p className={`text-2xl font-bold ${expiringCount > 0 ? "text-amber-600" : ""}`}>{expiringCount}</p>
            <p className="text-xs text-muted-foreground">in 60 Tagen</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Firma oder Vertragsnr. suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            <SelectItem value="active">Aktiv</SelectItem>
            <SelectItem value="terminated">Gekündigt</SelectItem>
            <SelectItem value="expired">Abgelaufen</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Contracts Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ScrollText className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Keine Verträge gefunden</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vertragsnr.</TableHead>
                    <TableHead>Firma</TableHead>
                    <TableHead>Paket</TableHead>
                    <TableHead>Lizenzen</TableHead>
                    <TableHead className="text-right">Monat</TableHead>
                    <TableHead>Beginn</TableHead>
                    <TableHead>Ende</TableHead>
                    <TableHead>Restlaufzeit</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c: any) => (
                    <TableRow key={c.id} className={c.daysLeft !== null && c.daysLeft <= 14 && c.status === "active" ? "bg-destructive/5" : ""}>
                      <TableCell className="font-mono text-xs">{c.contract_number}</TableCell>
                      <TableCell className="font-medium max-w-[150px] truncate">{c.companyName}</TableCell>
                      <TableCell className="text-sm">{c.package_name}</TableCell>
                      <TableCell className="text-sm">
                        {c.licenses}
                        {c.bonus_licenses > 0 && <span className="text-primary text-xs"> +{c.bonus_licenses}</span>}
                      </TableCell>
                      <TableCell className="text-right font-medium">CHF {Number(c.monthly_price).toLocaleString("de-CH")}</TableCell>
                      <TableCell className="text-sm">{c.start_date ? format(new Date(c.start_date), "dd.MM.yy") : "–"}</TableCell>
                      <TableCell className="text-sm">{c.end_date ? format(new Date(c.end_date), "dd.MM.yy") : "–"}</TableCell>
                      <TableCell>
                        {c.daysLeft !== null ? (
                          <span className={`text-sm font-medium ${c.daysLeft <= 14 ? "text-destructive" : c.daysLeft <= 30 ? "text-amber-600" : c.daysLeft <= 60 ? "text-orange-600" : "text-muted-foreground"}`}>
                            {c.daysLeft <= 0 ? "Abgelaufen" : `${c.daysLeft} Tage`}
                          </span>
                        ) : "–"}
                      </TableCell>
                      <TableCell>{statusBadge(c.status, c.daysLeft)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
