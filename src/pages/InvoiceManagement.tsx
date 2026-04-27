import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Search, Plus, CheckCircle, AlertTriangle, FileDown, RotateCcw, Send, Receipt, Mail, Mailbox } from "lucide-react";
import { downloadInvoicePdf, generateInvoicePdf } from "@/lib/invoicePdf";
import { SendDocumentMailDialog } from "@/components/SendDocumentMailDialog";
import { PostSendDialog } from "@/components/PostSendDialog";
import type { CoverLetterType } from "@/lib/coverLetterPdf";
import { format } from "date-fns";
import { toast } from "sonner";

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
  notes?: string;
  created_at: string;
}

export default function InvoiceManagement() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialStatus = searchParams.get("status") || "all";
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  const [dunningDialog, setDunningDialog] = useState<Invoice | null>(null);
  const [generateDialog, setGenerateDialog] = useState(false);
  const [mailDialog, setMailDialog] = useState<{ invoice: Invoice; isDunning: boolean } | null>(null);
  const [postDialog, setPostDialog] = useState<{ invoice: Invoice; type: CoverLetterType } | null>(null);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => api.getInvoices().catch(() => []),
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ["all-contracts"],
    queryFn: () => api.getAllContracts(),
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => api.getCompanies().catch(() => []),
  });

  const markPaidMutation = useMutation({
    mutationFn: (invoiceId: number) => api.markInvoicePaid(invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Bezahlt markiert");
    },
    onError: () => toast.error("Fehler beim Aktualisieren"),
  });

  const markUnpaidMutation = useMutation({
    mutationFn: (invoiceId: number) => api.markInvoiceUnpaid(invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Bezahlt-Status zurückgesetzt");
    },
    onError: () => toast.error("Fehler beim Zurücksetzen"),
  });

  const sendDunningMutation = useMutation({
    mutationFn: (data: { invoiceId: number; level: number }) =>
      api.sendDunning(data.invoiceId, data.level),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      setDunningDialog(null);
      toast.success("Mahnstufe aktualisiert");
    },
    onError: () => toast.error("Fehler beim Aktualisieren"),
  });

  const generateInvoicesMutation = useMutation({
    mutationFn: () => api.generateMonthlyInvoices(),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      setGenerateDialog(false);
      toast.success(`${data.count || 0} Rechnungen generiert`);
    },
    onError: () => toast.error("Fehler bei der Generierung"),
  });

  const filtered = invoices.filter((inv: Invoice) => {
    const matchesSearch = !search ||
      inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      inv.company_name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || inv.status === statusFilter ||
      (statusFilter === "dunning" && inv.dunning_level > 0);
    return matchesSearch && matchesStatus;
  });

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rechnungen</h1>
          <p className="text-muted-foreground text-sm">Rechnungsverwaltung und Zahlungskontrolle</p>
        </div>
        <Button onClick={() => setGenerateDialog(true)} size="sm">
          <Plus className="mr-1 h-4 w-4" /> Monatsrechnungen generieren
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Suche nach Firma oder Rechnungsnr..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle</SelectItem>
            <SelectItem value="open">Offen</SelectItem>
            <SelectItem value="overdue">Überfällig</SelectItem>
            <SelectItem value="paid">Bezahlt</SelectItem>
            <SelectItem value="dunning">Mit Mahnung</SelectItem>
            <SelectItem value="cancelled">Storniert</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Invoice Table */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Receipt className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">{isLoading ? "Laden..." : "Keine Rechnungen gefunden"}</p>
              <p className="text-xs mt-1">
                {!isLoading && invoices.length === 0 
                  ? "Generieren Sie Monatsrechnungen aus aktiven Verträgen" 
                  : "Passen Sie die Suchkriterien an"}
              </p>
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
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((inv: Invoice) => (
                    <TableRow
                      key={inv.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/finance/companies/${inv.company_id}`)}
                    >
                      <TableCell className="font-mono text-xs">{inv.invoice_number}</TableCell>
                      <TableCell className="font-medium max-w-[150px] truncate">{inv.company_name}</TableCell>
                      <TableCell className="text-right font-medium">CHF {inv.amount.toLocaleString("de-CH")}</TableCell>
                      <TableCell className="text-sm">{format(new Date(inv.due_date), "dd.MM.yyyy")}</TableCell>
                      <TableCell>{statusBadge(inv.status, inv.dunning_level)}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {(inv.status === "open" || inv.status === "overdue") && (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                title="Als bezahlt markieren"
                                onClick={() => markPaidMutation.mutate(inv.id)}
                                disabled={markPaidMutation.isPending}
                              >
                                <CheckCircle className="h-4 w-4 text-emerald-600" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8" title="Mahnstufe" onClick={() => setDunningDialog(inv)}>
                                <Send className="h-4 w-4 text-amber-600" />
                              </Button>
                            </>
                          )}
                          {inv.status === "paid" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              title="Bezahlt-Status zurücksetzen"
                              onClick={() => {
                                if (window.confirm(`Bezahlt-Status für Rechnung ${inv.invoice_number} wirklich zurücksetzen?`)) {
                                  markUnpaidMutation.mutate(inv.id);
                                }
                              }}
                              disabled={markUnpaidMutation.isPending}
                            >
                              <RotateCcw className="h-4 w-4 text-amber-600" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            title="Per E-Mail senden"
                            onClick={() =>
                              setMailDialog({ invoice: inv, isDunning: (inv.dunning_level || 0) > 0 })
                            }
                          >
                            <Mail className="h-4 w-4 text-primary" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            title="Per Post versenden (PDF + Begleitbrief)"
                            onClick={() => {
                              const lvl = inv.dunning_level || 0;
                              const type: CoverLetterType =
                                lvl >= 3 ? "dunning_3" :
                                lvl === 2 ? "dunning_2" :
                                lvl === 1 ? "dunning_1" : "invoice";
                              setPostDialog({ invoice: inv, type });
                            }}
                          >
                            <Mailbox className="h-4 w-4 text-amber-700" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            title="PDF herunterladen"
                            onClick={() => {
                              try {
                                const contract = contracts.find((c: any) => c.id === inv.contract_id);
                                downloadInvoicePdf({
                                  ...inv,
                                  contract_number: contract?.contract_number,
                                  licenses: contract?.licenses,
                                  package_name: contract?.package_name,
                                });
                                toast.success("PDF heruntergeladen");
                              } catch {
                                toast.error("PDF-Erstellung fehlgeschlagen");
                              }
                            }}
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

      {/* Dunning Dialog */}
      <Dialog open={!!dunningDialog} onOpenChange={() => setDunningDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mahnstufe setzen</DialogTitle>
          </DialogHeader>
          {dunningDialog && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-sm">
                <p><span className="text-muted-foreground">Rechnung:</span> {dunningDialog.invoice_number}</p>
                <p><span className="text-muted-foreground">Firma:</span> {dunningDialog.company_name}</p>
                <p><span className="text-muted-foreground">Aktuelle Stufe:</span> {dunningDialog.dunning_level || "Keine"}</p>
              </div>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start border-amber-200 text-amber-700 hover:bg-amber-50"
                  onClick={() => sendDunningMutation.mutate({ invoiceId: dunningDialog.id, level: 1 })}
                  disabled={sendDunningMutation.isPending}
                >
                  <AlertTriangle className="mr-2 h-4 w-4" /> Stufe 1 – Zahlungserinnerung
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start border-orange-200 text-orange-700 hover:bg-orange-50"
                  onClick={() => sendDunningMutation.mutate({ invoiceId: dunningDialog.id, level: 2 })}
                  disabled={sendDunningMutation.isPending}
                >
                  <AlertTriangle className="mr-2 h-4 w-4" /> Stufe 2 – 1. Mahnung
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start border-destructive text-destructive hover:bg-destructive/10"
                  onClick={() => sendDunningMutation.mutate({ invoiceId: dunningDialog.id, level: 3 })}
                  disabled={sendDunningMutation.isPending}
                >
                  <AlertTriangle className="mr-2 h-4 w-4" /> Stufe 3 – 2. Mahnung + Sperrwarnung
                </Button>
                {dunningDialog.dunning_level > 0 && (
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => sendDunningMutation.mutate({ invoiceId: dunningDialog.id, level: 0 })}
                    disabled={sendDunningMutation.isPending}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" /> Mahnung zurücksetzen
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Generate Invoices Dialog */}
      <AlertDialog open={generateDialog} onOpenChange={setGenerateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Monatsrechnungen generieren</AlertDialogTitle>
            <AlertDialogDescription>
              Für alle aktiven Verträge werden Rechnungen für den aktuellen Monat erstellt.
              Bereits existierende Rechnungen werden nicht doppelt generiert.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={() => generateInvoicesMutation.mutate()} disabled={generateInvoicesMutation.isPending}>
              Generieren
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {mailDialog && (() => {
        const inv = mailDialog.invoice;
        const isDunning = mailDialog.isDunning;
        const contract = contracts.find((c: any) => c.id === inv.contract_id);
        const company = companies.find((c: any) => c.id === inv.company_id);
        const level = inv.dunning_level || 0;
        return (
          <SendDocumentMailDialog
            open
            onClose={() => setMailDialog(null)}
            documentType={isDunning ? "dunning" : "invoice"}
            documentId={inv.id}
            companyId={inv.company_id}
            defaultRecipient={company?.email || ""}
            referenceNumber={inv.invoice_number}
            dunningLevel={isDunning ? level : undefined}
            buildPdf={(language) =>
              generateInvoicePdf({
                ...inv,
                contract_number: contract?.contract_number,
                licenses: contract?.licenses,
                package_name: contract?.package_name,
              }, language, { skipPaidStamp: true })
            }
          />
        );
      })()}
    </div>
  );
}
