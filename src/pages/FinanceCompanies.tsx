import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Building2, ChevronRight, ScrollText, CalendarClock, AlertTriangle } from "lucide-react";
import { differenceInDays, addMonths, format } from "date-fns";

interface Row {
  id: number;
  name: string;
  contractName?: string;
  monthlyPrice?: number;
  contractEnd?: string;
  daysLeft: number | null;
  openCount: number;
  totalOpen: number;
  overdueCount: number;
  maxDunning: number;
  nextInvoiceDate?: Date;
  nextInvoiceAmount?: number;
}

export default function FinanceCompanies() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "issues" | "expiring">("all");

  const { data: companies = [] } = useQuery({ queryKey: ["companies"], queryFn: () => api.getCompanies() });
  const { data: contracts = [] } = useQuery({ queryKey: ["all-contracts"], queryFn: () => api.getAllContracts() });
  const { data: invoices = [] } = useQuery({ queryKey: ["invoices"], queryFn: () => api.getInvoices().catch(() => []) });

  const rows: Row[] = useMemo(() => {
    return companies.map((co: any) => {
      const active = contracts.find((c: any) => c.company_id === co.id && c.status === "active");
      const myInvs = invoices.filter((i: any) => i.company_id === co.id);
      const open = myInvs.filter((i: any) => i.status === "open" || i.status === "overdue");
      const overdue = myInvs.filter((i: any) => i.status === "overdue");

      let nextInvoiceDate: Date | undefined;
      if (active) {
        const lastInv = myInvs
          .filter((i: any) => i.contract_id === active.id)
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
        const base = lastInv?.created_at ? new Date(lastInv.created_at) : new Date(active.start_date);
        const next = addMonths(base, 1);
        nextInvoiceDate = next < new Date() ? new Date() : next;
      }

      return {
        id: co.id,
        name: co.name,
        contractName: active?.package_name,
        monthlyPrice: active ? Number(active.monthly_price) || 0 : undefined,
        contractEnd: active?.end_date,
        daysLeft: active?.end_date ? differenceInDays(new Date(active.end_date), new Date()) : null,
        openCount: open.length,
        totalOpen: open.reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0),
        overdueCount: overdue.length,
        maxDunning: Math.max(0, ...overdue.map((i: any) => i.dunning_level || 0)),
        nextInvoiceDate,
        nextInvoiceAmount: active ? Number(active.monthly_price) || 0 : undefined,
      };
    });
  }, [companies, contracts, invoices]);

  const filtered = rows
    .filter((r) => !search || r.name.toLowerCase().includes(search.toLowerCase()))
    .filter((r) => {
      if (filter === "issues") return r.overdueCount > 0 || r.maxDunning > 0;
      if (filter === "expiring") return r.daysLeft !== null && r.daysLeft <= 60 && r.daysLeft > 0;
      return true;
    })
    .sort((a, b) => {
      // Issues first, then expiring soon, then by name
      const aIssue = a.overdueCount > 0 ? 1 : 0;
      const bIssue = b.overdueCount > 0 ? 1 : 0;
      if (aIssue !== bIssue) return bIssue - aIssue;
      const aExp = a.daysLeft !== null && a.daysLeft <= 60 ? 1 : 0;
      const bExp = b.daysLeft !== null && b.daysLeft <= 60 ? 1 : 0;
      if (aExp !== bExp) return bExp - aExp;
      return a.name.localeCompare(b.name);
    });

  const issuesCount = rows.filter((r) => r.overdueCount > 0 || r.maxDunning > 0).length;
  const expiringCount = rows.filter((r) => r.daysLeft !== null && r.daysLeft <= 60 && r.daysLeft > 0).length;

  return (
    <div className="p-6 space-y-5 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Firmen – Übersicht</h1>
        <p className="text-muted-foreground text-sm">Klicke eine Firma an für Vertrag, Rechnungen und Aktionen</p>
      </div>

      {/* Filter chips */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Firma suchen…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label={`Alle · ${rows.length}`} />
          <FilterChip
            active={filter === "issues"}
            onClick={() => setFilter("issues")}
            label={`Probleme · ${issuesCount}`}
            tone="destructive"
          />
          <FilterChip
            active={filter === "expiring"}
            onClick={() => setFilter("expiring")}
            label={`Ablaufend · ${expiringCount}`}
            tone="amber"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Keine Firmen gefunden</p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((r) => (
                <button
                  key={r.id}
                  className="w-full text-left px-4 py-3.5 hover:bg-muted/50 transition-colors flex items-center gap-3"
                  onClick={() => navigate(`/finance/companies/${r.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{r.name}</span>
                      {r.maxDunning >= 3 && <Badge variant="destructive" className="text-[10px]">Sperrwarnung</Badge>}
                      {r.maxDunning === 2 && <Badge className="bg-orange-500/10 text-orange-600 border-orange-200 text-[10px]">2. Mahnung</Badge>}
                      {r.maxDunning === 1 && <Badge className="bg-amber-500/10 text-amber-600 border-amber-200 text-[10px]">1. Mahnung</Badge>}
                      {r.daysLeft !== null && r.daysLeft <= 14 && r.daysLeft > 0 && (
                        <Badge variant="destructive" className="text-[10px]">Vertrag läuft aus</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                      {r.contractName ? (
                        <>
                          <span className="flex items-center gap-1">
                            <ScrollText className="h-3 w-3" />
                            {r.contractName}
                          </span>
                          <span className="font-medium">CHF {r.monthlyPrice?.toLocaleString("de-CH")}/Mt.</span>
                          {r.daysLeft !== null && (
                            <span className={`flex items-center gap-1 ${r.daysLeft <= 30 ? "text-destructive font-medium" : r.daysLeft <= 60 ? "text-amber-600" : ""}`}>
                              <CalendarClock className="h-3 w-3" />
                              {r.daysLeft <= 0 ? "Abgelaufen" : `${r.daysLeft} Tage Restlaufzeit`}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-muted-foreground/50">Kein aktiver Vertrag</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs flex-wrap">
                      {r.openCount > 0 && (
                        <span className={`flex items-center gap-1 font-medium ${r.overdueCount > 0 ? "text-destructive" : "text-amber-600"}`}>
                          {r.overdueCount > 0 && <AlertTriangle className="h-3 w-3" />}
                          {r.openCount} offen · CHF {r.totalOpen.toLocaleString("de-CH")}
                        </span>
                      )}
                      {r.nextInvoiceDate && (
                        <span className="text-muted-foreground">
                          Nächste Rechnung: {format(r.nextInvoiceDate, "dd.MM.yy")} · CHF {r.nextInvoiceAmount?.toLocaleString("de-CH")}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FilterChip({
  active, onClick, label, tone,
}: { active: boolean; onClick: () => void; label: string; tone?: "destructive" | "amber" }) {
  const base = "h-9 text-xs";
  if (active) {
    if (tone === "destructive") return <Button size="sm" variant="destructive" className={base} onClick={onClick}>{label}</Button>;
    if (tone === "amber") return <Button size="sm" className={`${base} bg-amber-600 hover:bg-amber-600/90 text-white`} onClick={onClick}>{label}</Button>;
    return <Button size="sm" className={base} onClick={onClick}>{label}</Button>;
  }
  return <Button size="sm" variant="outline" className={base} onClick={onClick}>{label}</Button>;
}
