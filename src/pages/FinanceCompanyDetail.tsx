import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ArrowLeft, Building2, ScrollText, Receipt, CheckCircle, FileDown, Send,
  CalendarClock, Pencil, Plus, XCircle, RotateCcw, AlertTriangle, Mail, Phone, MapPin,
  Lock, Archive, Power,
} from "lucide-react";
import { format, addMonths, differenceInDays } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "sonner";
import { downloadInvoicePdf, generateInvoicePdf } from "@/lib/invoicePdf";
import { SendDocumentMailDialog } from "@/components/SendDocumentMailDialog";
import { PACKAGES, calcPrice } from "@/lib/contractPdf";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function FinanceCompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const companyId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editContractOpen, setEditContractOpen] = useState(false);
  const [terminateOpen, setTerminateOpen] = useState(false);
  const [dunningInvoice, setDunningInvoice] = useState<any | null>(null);
  const [mailInvoice, setMailInvoice] = useState<any | null>(null);
  const [lifecycleAction, setLifecycleAction] = useState<null | "read_only" | "archived" | "active">(null);
  const [archiveMode, setArchiveMode] = useState<"offer" | "status">("offer");

  const { data: companies = [] } = useQuery({ queryKey: ["companies"], queryFn: () => api.getCompanies() });
  const { data: contracts = [], isLoading: loadingContracts } = useQuery({
    queryKey: ["company-contracts", companyId],
    queryFn: () => api.getContracts(companyId),
    enabled: !!companyId,
  });
  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => api.getInvoices().catch(() => []),
  });

  const company = companies.find((c: any) => c.id === companyId);
  const activeContract = contracts.find((c: any) => c.status === "active");
  const pastContracts = contracts.filter((c: any) => c.status !== "active");
  const companyInvoices = useMemo(
    () => invoices
      .filter((i: any) => i.company_id === companyId)
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [invoices, companyId]
  );

  const openInvs = companyInvoices.filter((i: any) => i.status === "open" || i.status === "overdue");
  const overdueInvs = companyInvoices.filter((i: any) => i.status === "overdue");
  const totalOpen = openInvs.reduce((sum: number, i: any) => sum + (Number(i.amount) || 0), 0);
  const totalOverdue = overdueInvs.reduce((sum: number, i: any) => sum + (Number(i.amount) || 0), 0);
  const lastPayment = companyInvoices
    .filter((i: any) => i.status === "paid" && i.paid_at)
    .sort((a: any, b: any) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime())[0];

  // Next invoice projection
  const nextInvoice = useMemo(() => {
    if (!activeContract) return null;
    const lastInv = companyInvoices.find((i: any) => i.contract_id === activeContract.id);
    const baseDate = lastInv?.created_at ? new Date(lastInv.created_at) : new Date(activeContract.start_date);
    const next = addMonths(baseDate, 1);
    const today = new Date();
    if (next < today) return { date: today, amount: Number(activeContract.monthly_price) || 0, daysUntil: 0 };
    return {
      date: next,
      amount: Number(activeContract.monthly_price) || 0,
      daysUntil: differenceInDays(next, today),
    };
  }, [activeContract, companyInvoices]);

  const contractDaysLeft = activeContract?.end_date
    ? differenceInDays(new Date(activeContract.end_date), new Date())
    : null;

  // Mutations
  const updateContractMutation = useMutation({
    mutationFn: (data: Record<string, any>) => api.updateContract(activeContract!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-contracts", companyId] });
      queryClient.invalidateQueries({ queryKey: ["all-contracts"] });
      setEditContractOpen(false);
      toast.success("Vertrag aktualisiert");
    },
    onError: (e: any) => toast.error(e?.message || "Fehler beim Speichern"),
  });

  const terminateMutation = useMutation({
    mutationFn: () => api.terminateContract(activeContract!.id, "provider"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-contracts", companyId] });
      queryClient.invalidateQueries({ queryKey: ["all-contracts"] });
      setTerminateOpen(false);
      toast.success("Vertrag gekündigt");
    },
    onError: (e: any) => toast.error(e?.message || "Kündigung fehlgeschlagen"),
  });

  const markPaidMutation = useMutation({
    mutationFn: (invoiceId: number) => api.markInvoicePaid(invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Bezahlt markiert");
    },
    onError: () => toast.error("Fehler"),
  });

  const dunningMutation = useMutation({
    mutationFn: ({ invoiceId, level }: { invoiceId: number; level: number }) =>
      api.sendDunning(invoiceId, level),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      setDunningInvoice(null);
      toast.success("Mahnstufe aktualisiert");
    },
    onError: () => toast.error("Fehler"),
  });

  const lifecycleMutation = useMutation({
    mutationFn: async (params: { status: "active" | "read_only" | "archived"; mode?: "offer" | "status" }) => {
      const { status, mode } = params;
      if (status === "active") {
        await api.reactivateCompanyLifecycle(companyId);
      } else if (status === "archived" && mode === "offer") {
        // Archiv-Angebot: legt Archiv-Vertrag an (CHF 50.–/Mt., 60 Tage Kündigung) + setzt Lifecycle
        await api.archiveOptIn(companyId);
      } else {
        await api.setCompanyLifecycle(companyId, { lifecycle_status: status });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["company-contracts", companyId] });
      queryClient.invalidateQueries({ queryKey: ["all-contracts"] });
      setLifecycleAction(null);
      toast.success("Status aktualisiert");
    },
    onError: (e: any) => toast.error(e?.message || "Fehler beim Aktualisieren"),
  });

  const lifecycleStatus = (company?.lifecycle_status as string) || "active";
  const lifecycleLabels: Record<string, string> = {
    active: "Aktiv",
    read_only: "Read-Only",
    archived: "Archiviert",
    pending_deletion: "Löschung beantragt",
  };

  if (!company) {
    return (
      <div className="p-6 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/finance/companies")}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Zurück
        </Button>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Building2 className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Firma nicht gefunden</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const dunningBadge = (level: number) => {
    if (level >= 3) return <Badge variant="destructive">3. Mahnung</Badge>;
    if (level === 2) return <Badge className="bg-orange-500/10 text-orange-600 border-orange-200">2. Mahnung</Badge>;
    if (level === 1) return <Badge className="bg-amber-500/10 text-amber-600 border-amber-200">1. Mahnung</Badge>;
    return null;
  };

  const statusBadge = (status: string, dunningLevel: number) => {
    if (status === "paid") return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">Bezahlt</Badge>;
    if (status === "cancelled") return <Badge variant="secondary">Storniert</Badge>;
    if (status === "overdue") return dunningBadge(dunningLevel) || <Badge className="bg-red-500/10 text-red-600 border-red-200">Überfällig</Badge>;
    return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200">Offen</Badge>;
  };

  const downloadPdf = (inv: any) => {
    try {
      downloadInvoicePdf({
        ...inv,
        contract_number: activeContract?.contract_number,
        licenses: activeContract?.licenses,
        package_name: activeContract?.package_name,
      });
      toast.success("PDF heruntergeladen");
    } catch {
      toast.error("PDF-Erstellung fehlgeschlagen");
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <Button variant="ghost" size="sm" onClick={() => navigate("/finance/companies")} className="shrink-0 mt-0.5">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight truncate">{company.name}</h1>
              {lifecycleStatus !== "active" && (
                <Badge
                  variant={lifecycleStatus === "pending_deletion" ? "destructive" : undefined}
                  className={
                    lifecycleStatus === "read_only" ? "bg-amber-500/10 text-amber-600 border-amber-200" :
                    lifecycleStatus === "archived" ? "bg-slate-500/10 text-slate-600 border-slate-200" : ""
                  }
                >
                  {lifecycleLabels[lifecycleStatus]}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
              {company.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{company.email}</span>}
              {company.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{company.phone}</span>}
              {company.address && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{company.address}</span>}
            </div>
          </div>
        </div>
        {/* Lifecycle Quick-Actions */}
        <div className="flex flex-wrap gap-2 shrink-0">
          {lifecycleStatus === "active" && (
            <>
              <Button size="sm" variant="outline" onClick={() => setLifecycleAction("read_only")}>
                <Lock className="mr-1 h-3.5 w-3.5" /> Read-Only
              </Button>
              <Button size="sm" variant="outline" onClick={() => setLifecycleAction("archived")}>
                <Archive className="mr-1 h-3.5 w-3.5" /> Archivieren
              </Button>
            </>
          )}
          {lifecycleStatus !== "active" && lifecycleStatus !== "pending_deletion" && (
            <Button size="sm" variant="outline" className="text-emerald-700 border-emerald-300 hover:bg-emerald-50" onClick={() => setLifecycleAction("active")}>
              <Power className="mr-1 h-3.5 w-3.5" /> Reaktivieren
            </Button>
          )}
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className={overdueInvs.length > 0 ? "border-destructive/40" : ""}>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground font-medium">Offene Posten</p>
            <p className={`text-2xl font-bold ${totalOpen > 0 ? "text-amber-600" : ""}`}>
              CHF {totalOpen.toLocaleString("de-CH")}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{openInvs.length} Rechnung{openInvs.length === 1 ? "" : "en"}</p>
          </CardContent>
        </Card>
        <Card className={totalOverdue > 0 ? "border-destructive/40" : ""}>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground font-medium">Überfällig</p>
            <p className={`text-2xl font-bold ${totalOverdue > 0 ? "text-destructive" : ""}`}>
              CHF {totalOverdue.toLocaleString("de-CH")}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{overdueInvs.length} überfällig</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <CalendarClock className="h-3 w-3" /> Nächste Rechnung
            </p>
            {nextInvoice ? (
              <>
                <p className="text-2xl font-bold">CHF {nextInvoice.amount.toLocaleString("de-CH")}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {nextInvoice.daysUntil === 0 ? "Heute fällig" : `in ${nextInvoice.daysUntil} Tagen · ${format(nextInvoice.date, "dd.MM.yy")}`}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground mt-2">Kein aktiver Vertrag</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground font-medium">Letzte Zahlung</p>
            {lastPayment ? (
              <>
                <p className="text-2xl font-bold">{format(new Date(lastPayment.paid_at), "dd.MM.yy")}</p>
                <p className="text-xs text-muted-foreground mt-0.5">CHF {Number(lastPayment.amount).toLocaleString("de-CH")}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground mt-2">Noch keine</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Active Contract */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ScrollText className="h-4 w-4" />
            Aktueller Vertrag
            {activeContract && contractDaysLeft !== null && contractDaysLeft <= 30 && (
              <Badge variant={contractDaysLeft <= 14 ? "destructive" : undefined} className={contractDaysLeft > 14 ? "bg-amber-500/10 text-amber-600 border-amber-200" : ""}>
                {contractDaysLeft <= 0 ? "Abgelaufen" : `noch ${contractDaysLeft} Tage`}
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-2">
            {activeContract ? (
              <>
                <Button size="sm" variant="outline" onClick={() => setEditContractOpen(true)}>
                  <Pencil className="mr-1 h-3.5 w-3.5" /> Bearbeiten
                </Button>
                <Button size="sm" variant="outline" className="text-destructive border-destructive/40 hover:bg-destructive/10" onClick={() => setTerminateOpen(true)}>
                  <XCircle className="mr-1 h-3.5 w-3.5" /> Kündigen
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={() => navigate(`/contracts?company=${companyId}`)}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Neuer Vertrag
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loadingContracts ? (
            <div className="py-6 flex justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : activeContract ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <Field label="Vertragsnr." value={<span className="font-mono">{activeContract.contract_number || "–"}</span>} />
              <Field label="Paket" value={activeContract.package_name} />
              <Field
                label="Lizenzen"
                value={
                  <>
                    {activeContract.licenses}
                    {activeContract.bonus_licenses > 0 && <span className="text-primary"> +{activeContract.bonus_licenses}</span>}
                  </>
                }
              />
              <Field label="Monatspreis" value={`CHF ${Number(activeContract.monthly_price).toLocaleString("de-CH")}`} />
              <Field label="Beginn" value={activeContract.start_date ? format(new Date(activeContract.start_date), "dd.MM.yyyy") : "–"} />
              <Field
                label="Ende"
                value={activeContract.end_date ? format(new Date(activeContract.end_date), "dd.MM.yyyy") : "–"}
                highlight={contractDaysLeft !== null && contractDaysLeft <= 30}
              />
              <Field label="Kündigungsfrist" value={`${activeContract.notice_period_days || 60} Tage`} />
              <Field label="Jahresumsatz" value={`CHF ${(Number(activeContract.monthly_price) * 12).toLocaleString("de-CH")}`} />
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">Kein aktiver Vertrag vorhanden</p>
          )}
        </CardContent>
      </Card>

      {/* Invoices */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Rechnungen
            <Badge variant="secondary" className="ml-1">{companyInvoices.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loadingInvoices ? (
            <div className="py-12 flex justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : companyInvoices.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Receipt className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Noch keine Rechnungen</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nr.</TableHead>
                    <TableHead className="text-right">Betrag</TableHead>
                    <TableHead>Fällig</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companyInvoices.map((inv: any) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-xs">{inv.invoice_number}</TableCell>
                      <TableCell className="text-right font-medium">CHF {Number(inv.amount).toLocaleString("de-CH")}</TableCell>
                      <TableCell className="text-sm">{format(new Date(inv.due_date), "dd.MM.yyyy")}</TableCell>
                      <TableCell>{statusBadge(inv.status, inv.dunning_level)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {(inv.status === "open" || inv.status === "overdue") && (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                title="Als bezahlt markieren"
                                onClick={() => markPaidMutation.mutate(inv.id)}
                                disabled={markPaidMutation.isPending}
                              >
                                <CheckCircle className="h-4 w-4 text-emerald-600" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                title="Mahnstufe"
                                onClick={() => setDunningInvoice(inv)}
                              >
                                <Send className="h-4 w-4 text-amber-600" />
                              </Button>
                            </>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            title="Per E-Mail senden"
                            onClick={() => setMailInvoice(inv)}
                          >
                            <Mail className="h-4 w-4 text-primary" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            title="PDF"
                            onClick={() => downloadPdf(inv)}
                          >
                            <FileDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past contracts (collapsed) */}
      {pastContracts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-muted-foreground">
              Frühere Verträge ({pastContracts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pastContracts.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/40 text-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-xs text-muted-foreground">{c.contract_number}</span>
                    <span className="truncate">{c.package_name}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
                    <span>
                      {c.start_date ? format(new Date(c.start_date), "dd.MM.yy") : "–"} →{" "}
                      {c.end_date ? format(new Date(c.end_date), "dd.MM.yy") : "–"}
                    </span>
                    <Badge variant="secondary" className="text-[10px]">{c.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Contract Dialog */}
      {activeContract && (
        <EditContractDialog
          open={editContractOpen}
          onClose={() => setEditContractOpen(false)}
          contract={activeContract}
          isPending={updateContractMutation.isPending}
          onSave={(data) => updateContractMutation.mutate(data)}
        />
      )}

      {/* Lifecycle Confirm Dialog */}
      <AlertDialog open={!!lifecycleAction} onOpenChange={(o) => !o && setLifecycleAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {lifecycleAction === "read_only" && "Read-Only setzen?"}
              {lifecycleAction === "archived" && "Archivieren"}
              {lifecycleAction === "active" && "Wieder aktivieren?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {lifecycleAction === "read_only" && "Die Firma kann sich weiterhin einloggen, aber keine Daten mehr ändern oder hinzufügen. Bestehende Daten bleiben sichtbar."}
              {lifecycleAction === "active" && "Die Firma erhält wieder vollen Zugriff. Alle Schreiboperationen werden freigegeben."}
              {lifecycleAction === "archived" && "Wähle wie archiviert werden soll:"}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {lifecycleAction === "archived" && (
            <div className="space-y-2 my-2">
              <button
                type="button"
                onClick={() => setArchiveMode("offer")}
                className={`w-full text-left rounded-lg border p-3 transition ${
                  archiveMode === "offer" ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-muted/50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-medium text-sm">Archiv-Angebot (empfohlen)</div>
                  <Badge className="bg-primary/10 text-primary border-primary/30">CHF 50.–/Mt.</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Legt einen Archiv-Vertrag an: 60 Tage Kündigung, keine Mindestlaufzeit, nur Lesezugriff. Aktueller Vertrag wird durch Archiv-Vertrag ersetzt.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setArchiveMode("status")}
                className={`w-full text-left rounded-lg border p-3 transition ${
                  archiveMode === "status" ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-muted/50"
                }`}
              >
                <div className="font-medium text-sm">Nur Status archivieren</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Setzt nur den Lifecycle-Status auf „archiviert" (Read-Only) ohne neuen Archiv-Vertrag oder Verrechnung.
                </p>
              </button>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={lifecycleMutation.isPending}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (!lifecycleAction) return;
                lifecycleMutation.mutate({
                  status: lifecycleAction,
                  mode: lifecycleAction === "archived" ? archiveMode : undefined,
                });
              }}
              disabled={lifecycleMutation.isPending}
            >
              {lifecycleAction === "archived" && archiveMode === "offer" ? "Archiv-Vertrag anlegen" : "Bestätigen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      {/* Terminate Dialog */}
      <AlertDialog open={terminateOpen} onOpenChange={setTerminateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Vertrag kündigen?</AlertDialogTitle>
            <AlertDialogDescription>
              Der Vertrag wird auf den Status „gekündigt" gesetzt. Die Firma wechselt nach
              Vertragsende automatisch in den Read-Only-Modus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={terminateMutation.isPending}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); terminateMutation.mutate(); }}
              disabled={terminateMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Kündigen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dunning Dialog */}
      <Dialog open={!!dunningInvoice} onOpenChange={(o) => !o && setDunningInvoice(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mahnstufe setzen</DialogTitle>
          </DialogHeader>
          {dunningInvoice && (
            <div className="space-y-3">
              <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
                <p><span className="text-muted-foreground">Rechnung:</span> {dunningInvoice.invoice_number}</p>
                <p><span className="text-muted-foreground">Betrag:</span> CHF {Number(dunningInvoice.amount).toLocaleString("de-CH")}</p>
                <p><span className="text-muted-foreground">Aktuelle Stufe:</span> {dunningInvoice.dunning_level || "Keine"}</p>
              </div>
              <div className="space-y-2">
                {[
                  { lvl: 1, label: "Stufe 1 – Zahlungserinnerung", cls: "border-amber-200 text-amber-700 hover:bg-amber-50" },
                  { lvl: 2, label: "Stufe 2 – 1. Mahnung", cls: "border-orange-200 text-orange-700 hover:bg-orange-50" },
                  { lvl: 3, label: "Stufe 3 – 2. Mahnung + Sperrwarnung", cls: "border-destructive text-destructive hover:bg-destructive/10" },
                ].map(({ lvl, label, cls }) => (
                  <Button
                    key={lvl}
                    variant="outline"
                    className={`w-full justify-start ${cls}`}
                    onClick={() => dunningMutation.mutate({ invoiceId: dunningInvoice.id, level: lvl })}
                    disabled={dunningMutation.isPending}
                  >
                    <AlertTriangle className="mr-2 h-4 w-4" /> {label}
                  </Button>
                ))}
                {dunningInvoice.dunning_level > 0 && (
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => dunningMutation.mutate({ invoiceId: dunningInvoice.id, level: 0 })}
                    disabled={dunningMutation.isPending}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" /> Mahnung zurücksetzen
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {mailInvoice && (() => {
        const inv = mailInvoice;
        const level = inv.dunning_level || 0;
        const isDunning = level > 0;
        return (
          <SendDocumentMailDialog
            open
            onClose={() => setMailInvoice(null)}
            documentType={isDunning ? "dunning" : "invoice"}
            documentId={inv.id}
            companyId={companyId}
            defaultRecipient={company?.email || ""}
            referenceNumber={inv.invoice_number}
            dunningLevel={isDunning ? level : undefined}
            buildPdf={(language) =>
              generateInvoicePdf({
                ...inv,
                contract_number: activeContract?.contract_number,
                licenses: activeContract?.licenses,
                package_name: activeContract?.package_name,
              }, language, { skipPaidStamp: true })
            }
          />
        );
      })()}
    </div>
  );
}

function Field({ label, value, highlight }: { label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-medium ${highlight ? "text-destructive" : ""}`}>{value}</p>
    </div>
  );
}

function EditContractDialog({
  open, onClose, contract, isPending, onSave,
}: {
  open: boolean;
  onClose: () => void;
  contract: any;
  isPending: boolean;
  onSave: (data: Record<string, any>) => void;
}) {
  // Map back from German label to package id
  const pkgFromLabel = (label: string) => PACKAGES.find(p => p.label === label)?.id || "individual";

  const [packageId, setPackageId] = useState<string>(contract.package_id || pkgFromLabel(contract.package_name || ""));
  const [licenses, setLicenses] = useState<number>(contract.licenses);
  const [bonus, setBonus] = useState<number>(contract.bonus_licenses || 0);
  const [monthlyPrice, setMonthlyPrice] = useState<number>(Number(contract.monthly_price) || 0);
  const [startDate, setStartDate] = useState<string>(contract.start_date?.slice(0, 10) || "");
  const [endDate, setEndDate] = useState<string>(contract.end_date?.slice(0, 10) || "");
  const [noticeDays, setNoticeDays] = useState<number>(contract.notice_period_days || 60);
  const [status, setStatus] = useState<string>(contract.status || "active");
  const [notes, setNotes] = useState<string>(contract.notes || "");
  const [autoPrice, setAutoPrice] = useState<boolean>(true);

  const pkg = PACKAGES.find(p => p.id === packageId);

  const handlePackageChange = (val: string) => {
    setPackageId(val);
    const p = PACKAGES.find(pk => pk.id === val);
    if (!p) return;
    if (!p.perDoctor) {
      setLicenses(p.minDocs);
      if (autoPrice) setMonthlyPrice(p.priceNum);
    } else if (autoPrice) {
      setMonthlyPrice(calcPrice(val, licenses).total);
    }
  };

  const handleLicensesChange = (n: number) => {
    const v = Math.max(0, n);
    setLicenses(v);
    if (autoPrice && pkg?.perDoctor) setMonthlyPrice(calcPrice(packageId, v).total);
  };

  const extendOneYear = () => {
    const base = endDate ? new Date(endDate) : new Date();
    setEndDate(format(addMonths(base, 12), "yyyy-MM-dd"));
  };

  const extendStartOneYear = () => {
    const base = endDate ? new Date(endDate) : new Date();
    setEndDate(format(addMonths(base, 12), "yyyy-MM-dd"));
  };

  const handleSave = () => {
    onSave({
      package_id: packageId,
      package_name: pkg?.label || contract.package_name,
      licenses,
      bonus_licenses: bonus,
      monthly_price: monthlyPrice,
      start_date: startDate,
      end_date: endDate,
      notice_period_days: noticeDays,
      status,
      notes,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vertrag bearbeiten</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Paket */}
          <div>
            <Label className="text-xs">Paket</Label>
            <Select value={packageId} onValueChange={handlePackageChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PACKAGES.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label} — {p.perDoctor ? `CHF ${p.price} pro Arzt` : `CHF ${p.price} / Mt.`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {pkg && <p className="text-xs text-muted-foreground mt-1">{pkg.desc}</p>}
          </div>

          {/* Lizenzen */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Lizenzen</Label>
              <Input
                type="number"
                min={0}
                value={licenses}
                onChange={(e) => handleLicensesChange(Number(e.target.value))}
                disabled={!!pkg && !pkg.perDoctor}
              />
            </div>
            <div>
              <Label className="text-xs">Bonus-Lizenzen</Label>
              <Input type="number" min={0} value={bonus} onChange={(e) => setBonus(Math.max(0, Number(e.target.value)))} />
            </div>
          </div>

          {/* Preis */}
          <div>
            <Label className="text-xs flex items-center justify-between">
              <span>Monatspreis (CHF)</span>
              <label className="flex items-center gap-1 text-[11px] font-normal text-muted-foreground cursor-pointer">
                <input type="checkbox" checked={autoPrice} onChange={(e) => setAutoPrice(e.target.checked)} className="h-3 w-3" />
                Auto
              </label>
            </Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={monthlyPrice}
              onChange={(e) => { setAutoPrice(false); setMonthlyPrice(Math.max(0, Number(e.target.value))); }}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Vertragsbeginn</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs flex items-center justify-between">
                <span>Vertragsende</span>
                <button type="button" className="text-xs text-primary hover:underline" onClick={extendOneYear}>+ 12 Mt.</button>
              </Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          {/* Notice + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Kündigungsfrist (Tage)</Label>
              <Select value={String(noticeDays)} onValueChange={(v) => setNoticeDays(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 Tage</SelectItem>
                  <SelectItem value="60">60 Tage</SelectItem>
                  <SelectItem value="90">90 Tage</SelectItem>
                  <SelectItem value="180">180 Tage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Aktiv</SelectItem>
                  <SelectItem value="suspended">Pausiert</SelectItem>
                  <SelectItem value="cancelled">Gekündigt</SelectItem>
                  <SelectItem value="expired">Abgelaufen</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label className="text-xs">Interne Notizen</Label>
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional – nur intern sichtbar"
            />
          </div>

          {/* Summary */}
          <div className="rounded-md bg-muted/40 p-3 text-xs space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Jahresumsatz</span><span className="font-medium">CHF {(monthlyPrice * 12).toLocaleString("de-CH")}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Lizenzen total</span><span className="font-medium">{licenses + bonus} ({licenses} + {bonus} Bonus)</span></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Abbrechen</Button>
          <Button onClick={handleSave} disabled={isPending}>Speichern</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
