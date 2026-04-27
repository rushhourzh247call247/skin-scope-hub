import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CalendarClock, FilePlus2, Loader2 } from "lucide-react";
import { format, addMonths, differenceInDays } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "sonner";

interface UpcomingItem {
  contractId: number;
  companyId: number;
  companyName: string;
  contractNumber: string;
  packageName: string;
  monthlyPrice: number;
  nextInvoiceDate: Date;
  daysUntil: number;
  lastInvoiceDate: Date | null;
}

export default function FinanceUpcoming() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [filterDays, setFilterDays] = useState<string>("30");

  const { data: contracts = [] } = useQuery({ queryKey: ["all-contracts"], queryFn: () => api.getAllContracts() });
  const { data: companies = [] } = useQuery({ queryKey: ["companies"], queryFn: () => api.getCompanies() });
  const { data: invoices = [] } = useQuery({ queryKey: ["invoices"], queryFn: () => api.getInvoices().catch(() => []) });

  const generateMutation = useMutation({
    mutationFn: (contractId: number) => api.generateInvoiceForContract(contractId),
    onSuccess: (res) => {
      toast.success(`Rechnung ${res.invoice_number} erstellt`);
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (e: any) => toast.error(e?.message || "Fehler beim Erstellen"),
  });

  const upcoming = useMemo<UpcomingItem[]>(() => {
    const now = new Date();
    return contracts
      .filter((c: any) => c.status === "active")
      .map((c: any) => {
        const company = companies.find((co: any) => co.id === c.company_id);
        const contractInvoices = invoices
          .filter((i: any) => i.contract_id === c.id)
          .sort((a: any, b: any) => new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime());
        const lastInvoice = contractInvoices[0];
        const lastDate = lastInvoice ? new Date(lastInvoice.invoice_date) : new Date(c.start_date);
        const nextDate = addMonths(lastDate, 1);
        return {
          contractId: c.id,
          companyId: c.company_id,
          companyName: company?.name || `#${c.company_id}`,
          contractNumber: c.contract_number,
          packageName: c.package_name,
          monthlyPrice: Number(c.custom_price ?? c.monthly_price) || 0,
          nextInvoiceDate: nextDate,
          daysUntil: differenceInDays(nextDate, now),
          lastInvoiceDate: lastInvoice ? lastDate : null,
        };
      })
      .sort((a, b) => a.nextInvoiceDate.getTime() - b.nextInvoiceDate.getTime());
  }, [contracts, companies, invoices]);

  const filtered = useMemo(() => {
    const limit = parseInt(filterDays, 10);
    if (filterDays === "all") return upcoming;
    return upcoming.filter((u) => u.daysUntil <= limit);
  }, [upcoming, filterDays]);

  const dueBadge = (days: number) => {
    if (days < 0) return <Badge variant="destructive">überfällig {Math.abs(days)} T.</Badge>;
    if (days === 0) return <Badge variant="destructive">heute</Badge>;
    if (days <= 3) return <Badge className="bg-red-500/10 text-red-600 border-red-200">in {days} T.</Badge>;
    if (days <= 7) return <Badge className="bg-amber-500/10 text-amber-600 border-amber-200">in {days} T.</Badge>;
    if (days <= 14) return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200">in {days} T.</Badge>;
    return <Badge variant="outline">in {days} T.</Badge>;
  };

  const totalSum = filtered.reduce((sum, u) => sum + u.monthlyPrice, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/finance")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Zurück
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Anstehende Rechnungen</h1>
          <p className="text-muted-foreground text-sm">
            Nächste Rechnungen pro Vertrag (basierend auf letzter Rechnung + 1 Monat)
          </p>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground font-medium">Anstehend</p>
            <p className="text-2xl font-bold">{filtered.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Rechnungen</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground font-medium">Erwarteter Umsatz</p>
            <p className="text-2xl font-bold">CHF {totalSum.toLocaleString("de-CH")}</p>
            <p className="text-xs text-muted-foreground mt-1">im Filter-Zeitraum</p>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Zeitraum</p>
              <p className="text-sm text-muted-foreground mt-1">Nächste fällige Rechnungen filtern</p>
            </div>
            <Select value={filterDays} onValueChange={setFilterDays}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Nächste 7 Tage</SelectItem>
                <SelectItem value="14">Nächste 14 Tage</SelectItem>
                <SelectItem value="30">Nächste 30 Tage</SelectItem>
                <SelectItem value="60">Nächste 60 Tage</SelectItem>
                <SelectItem value="all">Alle</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-amber-600" />
            Anstehende Rechnungen ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Keine anstehenden Rechnungen im gewählten Zeitraum
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Firma</TableHead>
                    <TableHead>Vertrag / Paket</TableHead>
                    <TableHead>Letzte Rechnung</TableHead>
                    <TableHead>Nächste fällig</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Betrag</TableHead>
                    <TableHead className="text-right">Aktion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((u) => (
                    <TableRow key={u.contractId}>
                      <TableCell className="font-medium">
                        <button
                          onClick={() => navigate(`/finance/companies/${u.companyId}`)}
                          className="hover:underline text-left"
                        >
                          {u.companyName}
                        </button>
                      </TableCell>
                      <TableCell className="text-sm">
                        <p className="font-mono text-xs">{u.contractNumber}</p>
                        <p className="text-xs text-muted-foreground">{u.packageName}</p>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {u.lastInvoiceDate
                          ? format(u.lastInvoiceDate, "dd.MM.yyyy", { locale: de })
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(u.nextInvoiceDate, "dd.MM.yyyy", { locale: de })}
                      </TableCell>
                      <TableCell>{dueBadge(u.daysUntil)}</TableCell>
                      <TableCell className="text-right font-semibold">
                        CHF {u.monthlyPrice.toLocaleString("de-CH")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant={u.daysUntil <= 0 ? "default" : "outline"}
                          onClick={() => generateMutation.mutate(u.contractId)}
                          disabled={generateMutation.isPending}
                        >
                          {generateMutation.isPending && generateMutation.variables === u.contractId ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <FilePlus2 className="h-3 w-3 mr-1" />
                          )}
                          Erstellen
                        </Button>
                      </TableCell>
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
