import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Eye, Hash, Save, Building2, FileStack, Globe, Download, Upload, Loader2, Search, Trash2 } from "lucide-react";
import { SUPPORTED_LANGUAGES } from "@/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import PdfPreviewPages from "@/components/PdfPreviewPages";
import { api } from "@/lib/api";
import { PACKAGES, suggestPackage, generateContractNumber, buildContractPdf, buildAmendmentPdf, calcPrice, type ContractVars } from "@/lib/contractPdf";
import { buildBrochurePdf } from "@/lib/brochurePdf";
import { buildCombinedPdf } from "@/lib/combinedPdf";

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "–";
  return new Date(dateStr).toLocaleDateString("de-CH");
}

function formatPrice(price: number | string): string {
  const n = typeof price === "string" ? parseFloat(price) : price;
  return `CHF ${n.toLocaleString("de-CH", { minimumFractionDigits: 0 })}.-`;
}

function ContractsOverview() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const { data: allContracts = [], isLoading } = useQuery({
    queryKey: ["all-contracts"],
    queryFn: api.getAllContracts,
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: api.getCompanies,
  });

  const companyMap = Object.fromEntries(companies.map((c: any) => [c.id, c.name]));

  const deleteMutation = useMutation({
    mutationFn: (contractId: number) => api.deleteContract(contractId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-contracts"] });
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast.success("Vertrag gelöscht");
      setDeleteTarget(null);
    },
    onError: (err: any) => toast.error(err.message || "Löschen fehlgeschlagen"),
  });

  // Filter by search
  const lowerSearch = searchTerm.toLowerCase().trim();
  const filteredContracts = lowerSearch
    ? allContracts.filter((c: any) => {
        const companyName = (companyMap[c.company_id] || "").toLowerCase();
        const contractNum = (c.contract_number || "").toLowerCase();
        const customerName = (c.customer_name || "").toLowerCase();
        return companyName.includes(lowerSearch) || contractNum.includes(lowerSearch) || customerName.includes(lowerSearch);
      })
    : allContracts;

  const activeContracts = filteredContracts.filter((c: any) => c.status === "active");
  const terminatedContracts = filteredContracts.filter((c: any) => c.status === "terminated");
  const expiredContracts = filteredContracts.filter((c: any) => c.status === "expired");

  const handleDownloadContractPdf = (contract: any) => {
    const pkg = PACKAGES.find(p => p.id === contract.package_id);
    const vars: ContractVars = {
      vertragsnummer: contract.contract_number,
      kundeName: contract.customer_name || companyMap[contract.company_id] || "–",
      kundeAdresse: contract.customer_address || "–",
      paket: pkg?.label || contract.package_name,
      preis: `${Number(contract.monthly_price)}.–`,
      anzahlAerzte: String(contract.licenses),
      datum: formatDate(contract.created_at || contract.start_date),
      vertragsbeginn: contract.start_date
        ? new Date(contract.start_date).toLocaleDateString("de-CH")
        : "–",
    };
    const doc = buildContractPdf(vars);
    doc.save(`Vertrag_${contract.contract_number}.pdf`);
  };

  const handleDownloadAmendmentPdf = (contract: any) => {
    const doc = buildAmendmentPdf({
      vertragsnummer: contract.contract_number,
      kundeName: contract.customer_name || companyMap[contract.company_id] || "–",
      kundeAdresse: contract.customer_address || "–",
      oldPaket: "–",
      oldPreis: "–",
      oldLizenzen: "–",
      newPaket: contract.package_name,
      newPreis: `${Number(contract.monthly_price)}.–`,
      newLizenzen: String(contract.licenses),
      datum: new Date().toLocaleDateString("de-CH"),
      newEndDate: contract.end_date
        ? new Date(contract.end_date).toLocaleDateString("de-CH")
        : "–",
    });
    doc.save(`Nachtrag_${contract.contract_number}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const handleDownloadSigned = async (contract: any) => {
    try {
      const blob = await api.downloadSignedContract(contract.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Vertrag_${contract.contract_number}_signed.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Download fehlgeschlagen");
    }
  };

  const statusBadge = (status: string) => {
    if (status === "expired") return <Badge variant="secondary" className="text-xs">Ausgelaufen</Badge>;
    if (status === "terminated") return <Badge variant="destructive" className="text-xs">Gekündigt</Badge>;
    return <Badge className="text-xs bg-emerald-600">Aktiv</Badge>;
  };

  const renderContractRow = (contract: any) => {
    const hasAmendment = contract.notes && contract.notes.includes("Paket:");
    return (
      <div key={contract.id} className="border rounded-lg p-4 bg-card space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm">{contract.contract_number}</span>
            {statusBadge(contract.status)}
          </div>
          <span className="text-xs text-muted-foreground">
            {companyMap[contract.company_id] || `Firma #${contract.company_id}`}
          </span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <div><span className="text-muted-foreground">Kunde:</span> {contract.customer_name}</div>
          <div><span className="text-muted-foreground">Paket:</span> {contract.package_name}</div>
          <div>
            <span className="text-muted-foreground">Preis:</span>{" "}
            {contract.custom_price
              ? <>{formatPrice(contract.custom_price)} <span className="text-xs text-primary">(Sonderpreis)</span></>
              : formatPrice(contract.monthly_price)
            }
          </div>
          <div><span className="text-muted-foreground">Laufzeit:</span> {formatDate(contract.start_date)} – {formatDate(contract.end_date)}</div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <div>
            <span className="text-muted-foreground">Lizenzen:</span>{" "}
            {contract.licenses}
            {(contract.bonus_licenses || 0) > 0 && (
              <span className="text-primary"> +{contract.bonus_licenses} Kulanz</span>
            )}
            {" "}= <span className="font-medium">{contract.licenses + (contract.bonus_licenses || 0)} total</span>
          </div>
        </div>
        {contract.notes && (
          <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2">{contract.notes}</p>
        )}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <Button variant="outline" size="sm" onClick={() => handleDownloadContractPdf(contract)}>
            <Download className="h-3.5 w-3.5 mr-1" /> Vertrag PDF
          </Button>
          {hasAmendment && (
            <Button variant="outline" size="sm" onClick={() => handleDownloadAmendmentPdf(contract)}>
              <Download className="h-3.5 w-3.5 mr-1" /> Nachtrag PDF
            </Button>
          )}
          {contract.signed_pdf_path && (
            <Button variant="outline" size="sm" onClick={() => handleDownloadSigned(contract)}>
              <Download className="h-3.5 w-3.5 mr-1" /> Signiertes PDF
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive ml-auto"
            onClick={() => setDeleteTarget(contract)}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Löschen
          </Button>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Suche nach Firma, Kunde oder Vertragsnummer…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-emerald-600">{activeContracts.length}</div>
            <p className="text-xs text-muted-foreground">Aktive Verträge</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-amber-600">{terminatedContracts.length}</div>
            <p className="text-xs text-muted-foreground">Gekündigte Verträge</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-muted-foreground">{expiredContracts.length}</div>
            <p className="text-xs text-muted-foreground">Ausgelaufene Verträge</p>
          </CardContent>
        </Card>
      </div>

      {filteredContracts.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          {searchTerm ? "Keine Verträge gefunden" : "Keine Verträge vorhanden"}
        </p>
      ) : (
        <div className="space-y-3">
          {filteredContracts.map(renderContractRow)}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Vertrag löschen</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.status === "active" ? (
                <span className="text-destructive font-medium">
                  ⚠️ Achtung: Dies ist ein aktiver Vertrag! Das Löschen kann nicht rückgängig gemacht werden.
                </span>
              ) : (
                "Dieser Vertrag wird unwiderruflich gelöscht."
              )}
              <br /><br />
              Vertrag: <strong>{deleteTarget?.contract_number}</strong>
              {deleteTarget?.customer_name && <> — {deleteTarget.customer_name}</>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Lösche…" : "Endgültig löschen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function ContractGenerator() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [kundeName, setKundeName] = useState("");
  const [kundeAdresse, setKundeAdresse] = useState("");
  const [selectedPaket, setSelectedPaket] = useState("");
  const [anzahlAerzte, setAnzahlAerzte] = useState("1");
  const [vertragsnummer, setVertragsnummer] = useState(() => generateContractNumber());
  const [vertragsbeginn, setVertragsbeginn] = useState(() => new Date().toISOString().slice(0, 10));
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<"contract" | "brochure">("contract");
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [pdfLanguage, setPdfLanguage] = useState("de");
  const [mwst, setMwst] = useState(false);

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: api.getCompanies,
  });

  const activeCompanies = companies.filter((c: any) => !c.suspended_at);

  const saveMutation = useMutation({
    mutationFn: (data: any) => api.createContract(data.companyId, data.contract),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["all-contracts"] });
      toast.success("Vertrag in der Datenbank gespeichert");
    },
    onError: (err: any) => toast.error(err.message || "Speichern fehlgeschlagen"),
  });

  const pkg = PACKAGES.find((p) => p.id === selectedPaket);

  const handleAnzahlChange = (val: string) => {
    setAnzahlAerzte(val);
    const num = parseInt(val) || 1;
    const suggested = suggestPackage(num);
    if (suggested !== selectedPaket) setSelectedPaket(suggested);
  };

  const handlePaketChange = (val: string) => {
    setSelectedPaket(val);
    const p = PACKAGES.find((pk) => pk.id === val);
    if (p) {
      if (p.perDoctor) {
        const current = parseInt(anzahlAerzte) || 1;
        if (current < p.minDocs) setAnzahlAerzte(String(p.minDocs));
        else if (current > p.maxDocs) setAnzahlAerzte(String(p.maxDocs));
      } else {
        setAnzahlAerzte(String(p.minDocs));
      }
    }
  };

  const priceInfo = pkg ? calcPrice(pkg.id, parseInt(anzahlAerzte) || 1) : null;

  const getVars = (): ContractVars => ({
    vertragsnummer,
    kundeName: kundeName || "–",
    kundeAdresse: kundeAdresse || "–",
    paket: pkg?.label || "–",
    preis: priceInfo?.display || "–",
    anzahlAerzte: anzahlAerzte || "–",
    datum: new Date().toLocaleDateString("de-CH"),
    vertragsbeginn: vertragsbeginn
      ? new Date(vertragsbeginn).toLocaleDateString("de-CH")
      : new Date().toLocaleDateString("de-CH"),
    mwst,
    lang: pdfLanguage as any,
  });

  const handlePreviewContract = () => {
    const doc = buildContractPdf(getVars());
    const blob = doc.output("blob");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(blob));
    setPreviewType("contract");
  };

  const handlePreviewBrochure = () => {
    const doc = buildBrochurePdf(pdfLanguage as any);
    const blob = doc.output("blob");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(blob));
    setPreviewType("brochure");
  };

  const handleSaveToDb = () => {
    if (!kundeName || !selectedPaket || !pkg) {
      toast.error("Bitte Kundenname und Paket ausfüllen.");
      return;
    }
    if (!selectedCompanyId) {
      toast.error("Bitte eine Firma auswählen.");
      return;
    }
    const endDate = new Date(vertragsbeginn);
    endDate.setMonth(endDate.getMonth() + 12);

    saveMutation.mutate({
      companyId: parseInt(selectedCompanyId),
      contract: {
        contract_number: vertragsnummer,
        package_name: pkg.label,
        package_id: pkg.id,
        licenses: parseInt(anzahlAerzte) || 1,
        monthly_price: priceInfo?.total || pkg.priceNum,
        start_date: vertragsbeginn,
        end_date: endDate.toISOString().slice(0, 10),
        notice_period_days: 60,
        customer_name: kundeName,
        customer_address: kundeAdresse || undefined,
      },
    });
  };

  const regenerateNumber = () => {
    setVertragsnummer(generateContractNumber());
    toast.info("Neue Vertragsnummer generiert.");
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <FileText className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">Verträge</h1>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="create">Neuer Vertrag</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <ContractsOverview />
        </TabsContent>

        <TabsContent value="create" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Kundendaten & Paket</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="vertragsnummer">Vertragsnummer</Label>
                  <Input id="vertragsnummer" value={vertragsnummer} onChange={(e) => setVertragsnummer(e.target.value)} />
                </div>
                <Button variant="outline" size="icon" onClick={regenerateNumber} title="Neue Nummer">
                  <Hash className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="kundeName">Kunde Name *</Label>
                  <Input id="kundeName" placeholder="Praxis Dr. Müller" value={kundeName} onChange={(e) => setKundeName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vertragsbeginn">Vertragsbeginn</Label>
                  <Input id="vertragsbeginn" type="date" value={vertragsbeginn} onChange={(e) => setVertragsbeginn(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="kundeAdresse">Kunde Adresse</Label>
                <Textarea id="kundeAdresse" placeholder={"Musterstrasse 10\n8000 Zürich"} rows={3} value={kundeAdresse} onChange={(e) => setKundeAdresse(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Paket *</Label>
                <Select value={selectedPaket} onValueChange={handlePaketChange}>
                  <SelectTrigger><SelectValue placeholder="Paket wählen…" /></SelectTrigger>
                  <SelectContent>
                    {PACKAGES.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.label} — {p.perDoctor ? `CHF ${p.price} pro Arzt / Monat` : `CHF ${p.price} / Monat`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {pkg && (
                  <p className="text-sm text-muted-foreground">
                    Gewählt: <span className="font-medium text-foreground">{pkg.label}</span> — CHF {priceInfo?.display} / Monat ({pkg.desc})
                  </p>
                )}
                {pkg && pkg.perDoctor && (
                  <div className="mt-3 space-y-2">
                    <Label>Anzahl Ärzte (1–{pkg.maxDocs})</Label>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" size="icon" className="h-10 w-10" onClick={() => { const n = Math.max(pkg.minDocs, (parseInt(anzahlAerzte) || 1) - 1); handleAnzahlChange(String(n)); }}>−</Button>
                      <span className="text-lg font-semibold w-10 text-center">{anzahlAerzte}</span>
                      <Button type="button" variant="outline" size="icon" className="h-10 w-10" onClick={() => { const n = Math.min(pkg.maxDocs, (parseInt(anzahlAerzte) || 1) + 1); handleAnzahlChange(String(n)); }}>+</Button>
                    </div>
                    <p className="text-xs text-muted-foreground">{anzahlAerzte} × CHF 80.– = CHF {priceInfo?.display} / Monat</p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Checkbox id="mwst" checked={mwst} onCheckedChange={(v: any) => setMwst(!!v)} />
                <Label htmlFor="mwst" className="cursor-pointer">Preise exkl. MwSt. ausweisen</Label>
              </div>

              <div className="space-y-2">
                <Label>Firma zuordnen (für DB-Speicherung)</Label>
                <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                  <SelectTrigger><SelectValue placeholder="Firma wählen…" /></SelectTrigger>
                  <SelectContent>
                    {activeCompanies.map((c: any) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        <span className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5" /> {c.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" /> PDF-Sprache</Label>
                <Select value={pdfLanguage} onValueChange={setPdfLanguage}>
                  <SelectTrigger className="max-w-[200px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>{lang.flag} {lang.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button variant="outline" onClick={handlePreviewContract}>
                  <Eye className="mr-2 h-4 w-4" /> Vorschau Vertrag
                </Button>
                <Button variant="outline" onClick={handlePreviewBrochure}>
                  <Eye className="mr-2 h-4 w-4" /> Vorschau Broschüre
                </Button>
                <Button onClick={() => {
                  if (!kundeName || !selectedPaket) { toast.error("Bitte Kundenname und Paket ausfüllen."); return; }
                  const vars = getVars();
                  const doc = buildCombinedPdf(vars);
                  const datum = new Date().toISOString().slice(0, 10);
                  doc.save(`Derm247_Angebot_und_Vertrag_${kundeName.replace(/\s+/g, "_")}_${datum}.pdf`);
                  toast.success("Angebot + Vertrag wurde als PDF heruntergeladen.");
                }}>
                  <FileStack className="mr-2 h-4 w-4" /> Speichern & Herunterladen
                </Button>
                <Button variant="secondary" onClick={handleSaveToDb} disabled={saveMutation.isPending}>
                  <Save className="mr-2 h-4 w-4" /> {saveMutation.isPending ? "Speichert…" : "In DB speichern"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {previewUrl && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg">
                  {previewType === "contract" ? "Vertrag – Vorschau" : "Broschüre – Vorschau"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="min-h-[600px]">
                  <PdfPreviewPages pdfUrl={previewUrl} />
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
