import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Building2, CheckCircle, AlertTriangle, ChevronDown, ChevronUp, ScrollText, CalendarClock } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { toast } from "sonner";

interface CompanyFinance {
  id: number;
  name: string;
  contract?: {
    package_name: string;
    monthly_price: number;
    licenses: number;
    bonus_licenses: number;
    status: string;
    start_date?: string;
    end_date?: string;
    contract_number?: string;
  };
  openInvoices: number;
  overdueInvoices: number;
  totalOpen: number;
  maxDunning: number;
  lastPayment?: string;
}

export default function FinanceCompanies() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [expandedCompany, setExpandedCompany] = useState<number | null>(null);

  const { data: companies = [] } = useQuery({ queryKey: ["companies"], queryFn: () => api.getCompanies() });
  const { data: contracts = [] } = useQuery({ queryKey: ["all-contracts"], queryFn: () => api.getAllContracts() });
  const { data: invoices = [] } = useQuery({ queryKey: ["invoices"], queryFn: () => api.getInvoices().catch(() => []) });

  const companyFinances: CompanyFinance[] = useMemo(() => {
    return companies.map((company: any) => {
      const activeContract = contracts.find((c: any) => c.company_id === company.id && c.status === "active");
      const companyInvoices = invoices.filter((i: any) => i.company_id === company.id);
      const openInvs = companyInvoices.filter((i: any) => i.status === "open" || i.status === "overdue");
      const overdueInvs = companyInvoices.filter((i: any) => i.status === "overdue");
      const paidInvs = companyInvoices.filter((i: any) => i.status === "paid").sort((a: any, b: any) =>
        new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime()
      );

      return {
        id: company.id,
        name: company.name,
        contract: activeContract ? {
          package_name: activeContract.package_name,
          monthly_price: Number(activeContract.monthly_price) || 0,
          licenses: activeContract.licenses || 0,
          bonus_licenses: activeContract.bonus_licenses || 0,
          status: activeContract.status,
          start_date: activeContract.start_date,
          end_date: activeContract.end_date,
          contract_number: activeContract.contract_number,
        } : undefined,
        openInvoices: openInvs.length,
        overdueInvoices: overdueInvs.length,
        totalOpen: openInvs.reduce((sum: number, i: any) => sum + (Number(i.amount) || 0), 0),
        maxDunning: Math.max(0, ...overdueInvs.map((i: any) => i.dunning_level || 0)),
        lastPayment: paidInvs[0]?.paid_at,
      };
    });
  }, [companies, contracts, invoices]);

  const filtered = companyFinances.filter((c) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  );

  const companyInvoices = (companyId: number) =>
    invoices.filter((i: any) => i.company_id === companyId)
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const markPaidMutation = useMutation({
    mutationFn: (invoiceId: number) => api.markInvoicePaid(invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Rechnung als bezahlt markiert");
    },
    onError: () => toast.error("Fehler"),
  });

  const dunningBadge = (level: number) => {
    if (level >= 3) return <Badge variant="destructive">Sperrwarnung</Badge>;
    if (level === 2) return <Badge className="bg-orange-500/10 text-orange-600 border-orange-200">1. Mahnung</Badge>;
    if (level === 1) return <Badge className="bg-amber-500/10 text-amber-600 border-amber-200">Erinnerung</Badge>;
    return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">OK</Badge>;
  };

  const statusBadge = (status: string) => {
    if (status === "paid") return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-[10px]">Bezahlt</Badge>;
    if (status === "overdue") return <Badge className="bg-red-500/10 text-red-600 border-red-200 text-[10px]">Überfällig</Badge>;
    if (status === "cancelled") return <Badge variant="secondary" className="text-[10px]">Storniert</Badge>;
    return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200 text-[10px]">Offen</Badge>;
  };

  const contractDaysLeft = (endDate?: string) => {
    if (!endDate) return null;
    return differenceInDays(new Date(endDate), new Date());
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Firmen – Zahlungsübersicht</h1>
        <p className="text-muted-foreground text-sm">Verträge, Zahlungsstatus und Mahnwesen pro Firma</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Firma suchen..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
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
              {filtered.map((company) => {
                const daysLeft = contractDaysLeft(company.contract?.end_date);
                return (
                  <div key={company.id}>
                    <button
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
                      onClick={() => setExpandedCompany(expandedCompany === company.id ? null : company.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">{company.name}</span>
                          {dunningBadge(company.maxDunning)}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                          {company.contract ? (
                            <>
                              <span className="flex items-center gap-1">
                                <ScrollText className="h-3 w-3" />
                                {company.contract.package_name}
                              </span>
                              <span className="font-medium">CHF {company.contract.monthly_price.toLocaleString("de-CH")}/Mt.</span>
                              {daysLeft !== null && (
                                <span className={`flex items-center gap-1 ${daysLeft <= 30 ? "text-destructive font-medium" : daysLeft <= 60 ? "text-amber-600" : ""}`}>
                                  <CalendarClock className="h-3 w-3" />
                                  {daysLeft <= 0 ? "Abgelaufen" : `${daysLeft} Tage verbleibend`}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground/50">Kein aktiver Vertrag</span>
                          )}
                          {company.openInvoices > 0 && (
                            <span className="text-destructive font-medium">{company.openInvoices} offen (CHF {company.totalOpen.toLocaleString("de-CH")})</span>
                          )}
                        </div>
                      </div>
                      {expandedCompany === company.id ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                    </button>

                    {expandedCompany === company.id && (
                      <div className="px-4 pb-4 bg-muted/30">
                        {/* Contract Details */}
                        {company.contract && (
                          <div className="rounded-lg border bg-background p-3 mb-3">
                            <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                              <ScrollText className="h-3.5 w-3.5" /> Vertragsdetails
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                              <div>
                                <p className="text-xs text-muted-foreground">Vertragsnr.</p>
                                <p className="font-mono font-medium">{company.contract.contract_number || "–"}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Paket</p>
                                <p className="font-medium">{company.contract.package_name}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Lizenzen</p>
                                <p className="font-medium">
                                  {company.contract.licenses}
                                  {company.contract.bonus_licenses > 0 && (
                                    <span className="text-primary"> +{company.contract.bonus_licenses} Kulanz</span>
                                  )}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Monatspreis</p>
                                <p className="font-medium">CHF {company.contract.monthly_price.toLocaleString("de-CH")}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Vertragsbeginn</p>
                                <p className="font-medium">{company.contract.start_date ? format(new Date(company.contract.start_date), "dd.MM.yyyy") : "–"}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Vertragsende</p>
                                <p className={`font-medium ${daysLeft !== null && daysLeft <= 30 ? "text-destructive" : ""}`}>
                                  {company.contract.end_date ? format(new Date(company.contract.end_date), "dd.MM.yyyy") : "–"}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Restlaufzeit</p>
                                <p className={`font-medium ${daysLeft !== null && daysLeft <= 30 ? "text-destructive" : daysLeft !== null && daysLeft <= 60 ? "text-amber-600" : ""}`}>
                                  {daysLeft !== null ? (daysLeft <= 0 ? "Abgelaufen" : `${daysLeft} Tage`) : "–"}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Jahresumsatz</p>
                                <p className="font-medium">CHF {(company.contract.monthly_price * 12).toLocaleString("de-CH")}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* KPI Row */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3">
                          <div className="text-center p-2 rounded bg-background border">
                            <p className="text-xs text-muted-foreground">Offene Posten</p>
                            <p className="text-lg font-bold">CHF {company.totalOpen.toLocaleString("de-CH")}</p>
                          </div>
                          <div className="text-center p-2 rounded bg-background border">
                            <p className="text-xs text-muted-foreground">Überfällig</p>
                            <p className="text-lg font-bold text-destructive">{company.overdueInvoices}</p>
                          </div>
                          <div className="text-center p-2 rounded bg-background border">
                            <p className="text-xs text-muted-foreground">Mahnstufe</p>
                            <p className="text-lg font-bold">{company.maxDunning || "–"}</p>
                          </div>
                          <div className="text-center p-2 rounded bg-background border">
                            <p className="text-xs text-muted-foreground">Letzte Zahlung</p>
                            <p className="text-sm font-medium">{company.lastPayment ? format(new Date(company.lastPayment), "dd.MM.yy") : "–"}</p>
                          </div>
                        </div>

                        {/* Invoice History */}
                        <div className="mt-2">
                          <p className="text-xs font-medium text-muted-foreground mb-2">Rechnungshistorie</p>
                          <div className="space-y-1">
                            {companyInvoices(company.id).length === 0 ? (
                              <p className="text-xs text-muted-foreground py-2">Keine Rechnungen vorhanden</p>
                            ) : (
                              companyInvoices(company.id).slice(0, 6).map((inv: any) => (
                                <div key={inv.id} className="flex items-center gap-2 py-1.5 px-2 rounded bg-background text-sm">
                                  <span className="font-mono text-xs w-24 shrink-0">{inv.invoice_number}</span>
                                  <span className="flex-1 text-right font-medium">CHF {Number(inv.amount).toLocaleString("de-CH")}</span>
                                  <span className="text-xs text-muted-foreground w-20 text-right">{format(new Date(inv.due_date), "dd.MM.yy")}</span>
                                  {statusBadge(inv.status)}
                                  {(inv.status === "open" || inv.status === "overdue") && (
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-6 w-6 shrink-0"
                                      onClick={(e) => { e.stopPropagation(); markPaidMutation.mutate(inv.id); }}
                                      disabled={markPaidMutation.isPending}
                                    >
                                      <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                                    </Button>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
