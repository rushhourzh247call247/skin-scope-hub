import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, AlertTriangle, CheckCircle, Clock, ArrowUpRight, Receipt, CalendarClock, ScrollText, ShieldAlert } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subMonths, differenceInDays, addDays } from "date-fns";
import { de } from "date-fns/locale";

interface Invoice {
  id: number;
  invoice_number: string;
  company_id: number;
  company_name: string;
  contract_id: number;
  amount: number;
  due_date: string;
  status: "open" | "paid" | "overdue" | "cancelled";
  paid_at?: string;
  dunning_level: number;
  created_at: string;
}

export default function FinanceDashboard() {
  const { data: contracts = [] } = useQuery({ queryKey: ["all-contracts"], queryFn: () => api.getAllContracts() });
  const { data: companies = [] } = useQuery({ queryKey: ["companies"], queryFn: () => api.getCompanies() });
  const { data: invoices = [] } = useQuery({ queryKey: ["invoices"], queryFn: () => api.getInvoices().catch(() => []) });

  const activeContracts = contracts.filter((c: any) => c.status === "active");
  const mrr = activeContracts.reduce((sum: number, c: any) => sum + (Number(c.monthly_price) || 0), 0);

  const openInvoices = invoices.filter((i: Invoice) => i.status === "open" || i.status === "overdue");
  const overdueInvoices = invoices.filter((i: Invoice) => i.status === "overdue");
  const paidInvoices = invoices.filter((i: Invoice) => i.status === "paid");
  const totalOpen = openInvoices.reduce((sum: number, i: Invoice) => sum + i.amount, 0);
  const totalOverdue = overdueInvoices.reduce((sum: number, i: Invoice) => sum + i.amount, 0);
  const paymentRate = invoices.length > 0 ? Math.round((paidInvoices.length / invoices.length) * 100) : 100;

  const dunningCounts = {
    level1: invoices.filter((i: Invoice) => i.dunning_level === 1).length,
    level2: invoices.filter((i: Invoice) => i.dunning_level === 2).length,
    level3: invoices.filter((i: Invoice) => i.dunning_level === 3).length,
  };

  // Revenue chart data (last 12 months)
  const revenueData = useMemo(() => {
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthStr = format(date, "yyyy-MM");
      const monthPaid = paidInvoices
        .filter((inv: Invoice) => inv.paid_at && inv.paid_at.startsWith(monthStr))
        .reduce((sum: number, inv: Invoice) => sum + inv.amount, 0);
      months.push({
        month: format(date, "MMM yy", { locale: de }),
        umsatz: monthPaid || mrr,
      });
    }
    return months;
  }, [paidInvoices, mrr]);

  // Upcoming due invoices (next 14 days)
  const upcomingDue = useMemo(() => {
    const now = new Date();
    const in14 = addDays(now, 14);
    return openInvoices
      .filter((inv) => {
        const due = new Date(inv.due_date);
        return due >= now && due <= in14;
      })
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  }, [openInvoices]);

  // Contracts expiring within 60 days
  const expiringContracts = useMemo(() => {
    const now = new Date();
    const in60 = addDays(now, 60);
    return activeContracts
      .filter((c: any) => {
        if (!c.end_date) return false;
        const end = new Date(c.end_date);
        return end >= now && end <= in60;
      })
      .map((c: any) => {
        const company = companies.find((co: any) => co.id === c.company_id);
        const daysLeft = differenceInDays(new Date(c.end_date), now);
        return { ...c, companyName: company?.name || `#${c.company_id}`, daysLeft };
      })
      .sort((a: any, b: any) => a.daysLeft - b.daysLeft);
  }, [activeContracts, companies]);

  // Companies with payment issues
  const companiesWithIssues = useMemo(() => {
    const issueMap = new Map<number, { name: string; overdueCount: number; totalOverdue: number; maxDunning: number }>();
    overdueInvoices.forEach((inv: Invoice) => {
      const existing = issueMap.get(inv.company_id) || { name: inv.company_name, overdueCount: 0, totalOverdue: 0, maxDunning: 0 };
      existing.overdueCount++;
      existing.totalOverdue += inv.amount;
      existing.maxDunning = Math.max(existing.maxDunning, inv.dunning_level);
      issueMap.set(inv.company_id, existing);
    });
    return Array.from(issueMap.entries()).map(([id, data]) => ({ id, ...data }));
  }, [overdueInvoices]);

  // Recent invoices
  const recentInvoices = [...invoices]
    .sort((a: Invoice, b: Invoice) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8);

  const statusBadge = (status: string, dunningLevel: number) => {
    if (status === "paid") return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">Bezahlt</Badge>;
    if (status === "cancelled") return <Badge variant="secondary">Storniert</Badge>;
    if (status === "overdue") {
      if (dunningLevel >= 3) return <Badge variant="destructive">3. Mahnung</Badge>;
      if (dunningLevel === 2) return <Badge className="bg-orange-500/10 text-orange-600 border-orange-200">2. Mahnung</Badge>;
      if (dunningLevel === 1) return <Badge className="bg-amber-500/10 text-amber-600 border-amber-200">1. Mahnung</Badge>;
      return <Badge className="bg-red-500/10 text-red-600 border-red-200">Überfällig</Badge>;
    }
    return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200">Offen</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Finanzen</h1>
        <p className="text-muted-foreground text-sm">Übersicht über Umsatz, Rechnungen, Verträge und Zahlungsstatus</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">MRR</p>
                <p className="text-2xl font-bold">CHF {mrr.toLocaleString("de-CH")}</p>
                <p className="text-xs text-muted-foreground mt-1">{activeContracts.length} aktive Verträge</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Offene Posten</p>
                <p className="text-2xl font-bold">CHF {totalOpen.toLocaleString("de-CH")}</p>
                <p className="text-xs text-muted-foreground mt-1">{openInvoices.length} Rechnungen</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Überfällig</p>
                <p className="text-2xl font-bold text-destructive">CHF {totalOverdue.toLocaleString("de-CH")}</p>
                <p className="text-xs text-muted-foreground mt-1">{overdueInvoices.length} Rechnungen</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Zahlungsquote</p>
                <p className="text-2xl font-bold">{paymentRate}%</p>
                <p className="text-xs text-muted-foreground mt-1">{paidInvoices.length} bezahlt</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Row: Upcoming + Expiring */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Upcoming Due Invoices */}
        <Card className={upcomingDue.length > 0 ? "border-amber-200/60" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-amber-600" />
              Fällig in den nächsten 14 Tagen
              {upcomingDue.length > 0 && (
                <Badge className="bg-amber-500/10 text-amber-600 border-amber-200 ml-auto">{upcomingDue.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingDue.length === 0 ? (
              <p className="text-sm text-muted-foreground py-3">Keine anstehenden Fälligkeiten</p>
            ) : (
              <div className="space-y-2">
                {upcomingDue.slice(0, 5).map((inv) => {
                  const daysUntil = differenceInDays(new Date(inv.due_date), new Date());
                  return (
                    <div key={inv.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 text-sm">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{inv.company_name}</p>
                        <p className="text-xs text-muted-foreground">{inv.invoice_number}</p>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="font-semibold">CHF {inv.amount.toLocaleString("de-CH")}</p>
                        <p className={`text-xs ${daysUntil <= 3 ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                          {daysUntil === 0 ? "Heute fällig" : daysUntil === 1 ? "Morgen fällig" : `in ${daysUntil} Tagen`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expiring Contracts */}
        <Card className={expiringContracts.length > 0 ? "border-orange-200/60" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-orange-600" />
              Verträge laufen bald aus
              {expiringContracts.length > 0 && (
                <Badge className="bg-orange-500/10 text-orange-600 border-orange-200 ml-auto">{expiringContracts.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expiringContracts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-3">Keine Verträge laufen in den nächsten 60 Tagen aus</p>
            ) : (
              <div className="space-y-2">
                {expiringContracts.slice(0, 5).map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{c.companyName}</p>
                      <p className="text-xs text-muted-foreground">{c.package_name} · {c.contract_number}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-xs text-muted-foreground">Endet {format(new Date(c.end_date), "dd.MM.yyyy")}</p>
                      <p className={`text-xs font-medium ${c.daysLeft <= 14 ? "text-destructive" : c.daysLeft <= 30 ? "text-amber-600" : "text-orange-600"}`}>
                        {c.daysLeft === 0 ? "Heute" : `noch ${c.daysLeft} Tage`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts + Dunning Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Umsatzentwicklung (12 Monate)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorUmsatz" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" tickFormatter={(v) => `${v.toLocaleString()}`} />
                  <Tooltip
                    formatter={(value: number) => [`CHF ${value.toLocaleString("de-CH")}`, "Umsatz"]}
                    contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                  />
                  <Area type="monotone" dataKey="umsatz" stroke="hsl(var(--primary))" fill="url(#colorUmsatz)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Dunning + Issues */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" />
              Mahnungen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/5 border border-amber-200/50">
              <div>
                <p className="text-sm font-medium">Zahlungserinnerung</p>
                <p className="text-xs text-muted-foreground">Stufe 1 · 7 Tage</p>
              </div>
              <span className="text-lg font-bold text-amber-600">{dunningCounts.level1}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-orange-500/5 border border-orange-200/50">
              <div>
                <p className="text-sm font-medium">1. Mahnung</p>
                <p className="text-xs text-muted-foreground">Stufe 2 · 14 Tage</p>
              </div>
              <span className="text-lg font-bold text-orange-600">{dunningCounts.level2}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/20">
              <div>
                <p className="text-sm font-medium">2. Mahnung + Sperrung</p>
                <p className="text-xs text-muted-foreground">Stufe 3 · 30 Tage</p>
              </div>
              <span className="text-lg font-bold text-destructive">{dunningCounts.level3}</span>
            </div>

            {companiesWithIssues.length > 0 && (
              <div className="pt-2 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-2">Betroffene Firmen</p>
                {companiesWithIssues.slice(0, 3).map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-1.5">
                    <span className="text-sm truncate">{c.name}</span>
                    <Badge variant="destructive" className="text-[10px]">{c.overdueCount} offen</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Invoices */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Letzte Rechnungen</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <a href="/finance/invoices">
                Alle anzeigen <ArrowUpRight className="ml-1 h-3 w-3" />
              </a>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentInvoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Receipt className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Noch keine Rechnungen vorhanden</p>
              <p className="text-xs mt-1">Rechnungen werden aus aktiven Verträgen generiert</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nr.</TableHead>
                    <TableHead>Firma</TableHead>
                    <TableHead className="text-right">Betrag</TableHead>
                    <TableHead>Fällig</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentInvoices.map((inv: Invoice) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-xs">{inv.invoice_number}</TableCell>
                      <TableCell className="font-medium">{inv.company_name}</TableCell>
                      <TableCell className="text-right">CHF {inv.amount.toLocaleString("de-CH")}</TableCell>
                      <TableCell className="text-sm">{format(new Date(inv.due_date), "dd.MM.yyyy")}</TableCell>
                      <TableCell>{statusBadge(inv.status, inv.dunning_level)}</TableCell>
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
