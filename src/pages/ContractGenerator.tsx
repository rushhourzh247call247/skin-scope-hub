import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Eye, Hash, Save, Building2, FileStack, Globe } from "lucide-react";
import { SUPPORTED_LANGUAGES } from "@/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import PdfPreviewPages from "@/components/PdfPreviewPages";
import { api } from "@/lib/api";
import { PACKAGES, suggestPackage, generateContractNumber, buildContractPdf, calcPrice, type ContractVars } from "@/lib/contractPdf";
import { buildBrochurePdf } from "@/lib/brochurePdf";
import { buildCombinedPdf } from "@/lib/combinedPdf";

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
      toast.success("Vertrag in der Datenbank gespeichert");
    },
    onError: (err: any) => toast.error(err.message || "Speichern fehlgeschlagen"),
  });

  const pkg = PACKAGES.find((p) => p.id === selectedPaket);

  // Auto-sync: when doctor count changes, suggest matching package
  const handleAnzahlChange = (val: string) => {
    setAnzahlAerzte(val);
    const num = parseInt(val) || 1;
    const suggested = suggestPackage(num);
    if (suggested !== selectedPaket) {
      setSelectedPaket(suggested);
    }
  };

  // Auto-sync: when package changes, set default doctor count
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
  });

  const handlePreviewContract = () => {
    const doc = buildContractPdf(getVars());
    const blob = doc.output("blob");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(blob));
    setPreviewType("contract");
  };

  const handlePreviewBrochure = () => {
    const doc = buildBrochurePdf();
    const blob = doc.output("blob");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(blob));
    setPreviewType("brochure");
  };

  const generateAndDownload = () => {
    if (!kundeName || !selectedPaket) {
      toast.error("Bitte Kundenname und Paket ausfüllen.");
      return;
    }
    const vars = getVars();
    const doc = buildContractPdf(vars);
    const filename = `Vertrag_${kundeName.replace(/\s+/g, "_")}_${vars.vertragsnummer}.pdf`;
    doc.save(filename);
    toast.success("Vertrag wurde als PDF heruntergeladen.");
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
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <FileText className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">Vertrag erstellen</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Kundendaten & Paket</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-2">
              <Label htmlFor="vertragsnummer">Vertragsnummer</Label>
              <Input
                id="vertragsnummer"
                value={vertragsnummer}
                onChange={(e) => setVertragsnummer(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon" onClick={regenerateNumber} title="Neue Nummer">
              <Hash className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="kundeName">Kunde Name *</Label>
              <Input
                id="kundeName"
                placeholder="Praxis Dr. Müller"
                value={kundeName}
                onChange={(e) => setKundeName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vertragsbeginn">Vertragsbeginn</Label>
              <Input
                id="vertragsbeginn"
                type="date"
                value={vertragsbeginn}
                onChange={(e) => setVertragsbeginn(e.target.value)}
              />
            </div>
          </div>


          <div className="space-y-2">
            <Label htmlFor="kundeAdresse">Kunde Adresse</Label>
            <Textarea
              id="kundeAdresse"
              placeholder={"Musterstrasse 10\n8000 Zürich"}
              rows={3}
              value={kundeAdresse}
              onChange={(e) => setKundeAdresse(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Paket *</Label>
            <Select value={selectedPaket} onValueChange={handlePaketChange}>
              <SelectTrigger>
                <SelectValue placeholder="Paket wählen…" />
              </SelectTrigger>
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
                Gewählt: <span className="font-medium text-foreground">{pkg.label}</span> — CHF{" "}
                {priceInfo?.display} / Monat ({pkg.desc})
              </p>
            )}
            {pkg && pkg.perDoctor && (
              <div className="mt-3 space-y-2">
                <Label htmlFor="anzahlAerzte">Anzahl Ärzte (1–{pkg.maxDocs})</Label>
                <Input
                  id="anzahlAerzte"
                  type="number"
                  min={pkg.minDocs}
                  max={pkg.maxDocs}
                  value={anzahlAerzte}
                  onChange={(e) => handleAnzahlChange(e.target.value)}
                  className="max-w-[120px]"
                />
                <p className="text-xs text-muted-foreground">
                  {anzahlAerzte} × CHF 80.– = CHF {priceInfo?.display} / Monat
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="mwst" checked={mwst} onCheckedChange={(v: any) => setMwst(!!v)} />
            <Label htmlFor="mwst" className="cursor-pointer">Preise exkl. MwSt. ausweisen</Label>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" /> PDF-Sprache
            </Label>
            <Select value={pdfLanguage} onValueChange={setPdfLanguage}>
              <SelectTrigger className="max-w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.flag} {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button variant="outline" onClick={handlePreviewContract}>
              <Eye className="mr-2 h-4 w-4" />
              Vorschau Vertrag
            </Button>
            <Button variant="outline" onClick={handlePreviewBrochure}>
              <Eye className="mr-2 h-4 w-4" />
              Vorschau Broschüre
            </Button>
            <Button onClick={() => {
              if (!kundeName || !selectedPaket) {
                toast.error("Bitte Kundenname und Paket ausfüllen.");
                return;
              }
              const vars = getVars();
              const doc = buildCombinedPdf(vars);
              const datum = new Date().toISOString().slice(0, 10);
              const filename = `Derm247_Angebot_und_Vertrag_${kundeName.replace(/\s+/g, "_")}_${datum}.pdf`;
              doc.save(filename);
              toast.success("Angebot + Vertrag wurde als PDF heruntergeladen.");
            }}>
              <FileStack className="mr-2 h-4 w-4" />
              Speichern & Herunterladen
            </Button>
            <Button
              variant="secondary"
              onClick={handleSaveToDb}
              disabled={saveMutation.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              {saveMutation.isPending ? "Speichert…" : "In DB speichern"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {previewUrl && (
        <Card>
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
    </div>
  );
}
