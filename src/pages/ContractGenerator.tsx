import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { FileText, Download, Eye, Hash } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import jsPDF from "jspdf";
import PdfPreviewPages from "@/components/PdfPreviewPages";

const PACKAGES = [
  { id: "single", label: "Einzellizenz", price: "80.–", priceNum: 80, desc: "1 Arzt" },
  { id: "small", label: "1–5 Ärzte", price: "350.–", priceNum: 350, desc: "bis 5 Ärzte" },
  { id: "medium", label: "6–10 Ärzte", price: "650.–", priceNum: 650, desc: "bis 10 Ärzte" },
  { id: "unlimited", label: "Unbegrenzt", price: "1'200.–", priceNum: 1200, desc: "unbegrenzt" },
];

function generateContractNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const seq = String(Math.floor(Math.random() * 9999) + 1).padStart(4, "0");
  return `V-${year}-${seq}`;
}

// Brand color: HSL(174, 72%, 40%) ≈ RGB(28, 175, 154)
const BRAND_RGB: [number, number, number] = [28, 175, 154];

interface ContractVars {
  vertragsnummer: string;
  kundeName: string;
  kundeAdresse: string;
  paket: string;
  preis: string;
  anzahlAerzte: string;
  datum: string;
  vertragsbeginn: string;
}

function buildContractText(vars: ContractVars) {
  return `
LIZENZVERTRAG

Vertragsnummer: ${vars.vertragsnummer}

zwischen

TechAssist
Dällikerstrasse 48
8105 Regensdorf
E-Mail: info@techassist.ch
(nachfolgend «Lizenzgeberin»)

und

${vars.kundeName}
${vars.kundeAdresse}
(nachfolgend «Lizenznehmer»)


1. Vertragsgegenstand

Die Lizenzgeberin gewährt dem Lizenznehmer das nicht-exklusive, nicht übertragbare Recht zur Nutzung der Software «Derm247» gemäss den Bedingungen dieses Vertrags.


2. Lizenzumfang

Paket: ${vars.paket}
Anzahl Ärzte: ${vars.anzahlAerzte}
Monatliche Lizenzgebühr: CHF ${vars.preis} / Monat (exkl. MwSt.)


3. Laufzeit und Paketänderungen

Der Vertrag beginnt am ${vars.vertragsbeginn}. Die Mindestlaufzeit beträgt 12 Monate. Die Kündigungsfrist beträgt 60 Tage zum Vertragsende. Erfolgt keine fristgerechte Kündigung, verlängert sich der Vertrag automatisch um jeweils 12 Monate.

Ein Upgrade auf ein höheres Paket oder zusätzliche Lizenzen ist jederzeit möglich. Die neue Gebühr gilt ab dem Folgemonat. Ein Downgrade ist unter Einhaltung der laufenden Vertragsdauer möglich und wird frühestens zum Ende der aktuellen Laufzeit wirksam.


4. Zahlungsbedingungen

Die Lizenzgebühr wird monatlich im Voraus in Rechnung gestellt und ist innert 30 Tagen nach Rechnungsdatum zahlbar. Bei Zahlungsverzug behält sich die Lizenzgeberin das Recht vor, den Zugang zur Software zu sperren.

Bankverbindung:
IBAN: CH66 0070 0110 0057 8304 8
Empfänger: Rached Mtiraoui (TechAssist)


5. Datenschutz und Datensicherheit

Die Lizenzgeberin verpflichtet sich, alle im Zusammenhang mit der Nutzung der Software anfallenden Daten gemäss dem Schweizerischen Datenschutzgesetz (DSG) und der DSGVO zu behandeln.

Die Daten werden ausschliesslich auf Servern in der Schweiz (Infomaniak) gespeichert. Es werden tägliche Backups sowie regelmässige Snapshots durchgeführt. Die Daten werden nicht an Drittanbieter weitergegeben und nicht ausserhalb der Schweiz verarbeitet. Die Übertragung erfolgt verschlüsselt (TLS 1.2 / 1.3).

Die Nutzung beinhaltet eine angemessene Datenspeicherung im üblichen Rahmen. Bei aussergewöhnlich hohem Speicherbedarf kann eine individuelle Vereinbarung getroffen werden.


6. Gewährleistung, Haftung und Support

Die Lizenzgeberin betreibt die Software nach bestem Wissen und mit aktuellen Sicherheitsstandards. Eine Haftung besteht nur bei grober Fahrlässigkeit oder Vorsatz.

Keine Haftung besteht insbesondere für:
– Fehlbedienung durch den Kunden
– Ausfälle durch höhere Gewalt
– externe Angriffe trotz Schutzmassnahmen
– indirekte Schäden oder Folgeschäden

Support erfolgt ausschliesslich per E-Mail an info@techassist.ch. Ein Anspruch auf telefonischen oder Live-Support besteht nicht.


7. Geheimhaltung

Beide Parteien verpflichten sich, vertrauliche Informationen der jeweils anderen Partei geheim zu halten und nicht an Dritte weiterzugeben.


8. Schlussbestimmungen

Es gilt Schweizer Recht. Gerichtsstand ist Zürich. Dieser Vertrag wurde in zwei Exemplaren ausgefertigt und von beiden Parteien unterzeichnet.



Ort, Datum: ________________________          Ort, Datum: ________________________



Lizenzgeberin:                                 Lizenznehmer:

TechAssist                                     ${vars.kundeName}


________________________                       ________________________
Unterschrift                                   Unterschrift
`.trim();
}

function drawLogo(doc: jsPDF, x: number, y: number) {
  // Blue rounded rectangle
  doc.setFillColor(...BRAND_RGB);
  doc.roundedRect(x, y, 8, 8, 1.5, 1.5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("D", x + 2.3, y + 6);

  // "DERM247" in white on blue header
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("DERM247", x + 10.5, y + 6.5);
}

function buildPdf(vars: ContractVars): jsPDF {
  const text = buildContractText(vars);
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  // Header bar
  doc.setFillColor(...BRAND_RGB);
  doc.rect(0, 0, 210, 20, "F");

  // Logo in header
  drawLogo(doc, 14, 5.5);

  // Contract number right-aligned
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(vars.vertragsnummer, 195, 13, { align: "right" });

  // Body
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  const lines = doc.splitTextToSize(text, 175);
  let y = 30;
  const pageHeight = 278;

  for (const line of lines) {
    if (y > pageHeight) {
      doc.addPage();
      y = 20;
    }

    if (/^\d+\.\s/.test(line) || line === "LIZENZVERTRAG") {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(line === "LIZENZVERTRAG" ? 14 : 11);
      doc.text(line, 17, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
    } else if (line.startsWith("Vertragsnummer:")) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(line, 17, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(30, 30, 30);
    } else if (line.startsWith("zwischen") || line.startsWith("und")) {
      doc.setFont("helvetica", "italic");
      doc.text(line, 17, y);
      doc.setFont("helvetica", "normal");
    } else {
      doc.text(line, 17, y);
    }
    y += 5;
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Derm247 – Lizenzvertrag | ${vars.vertragsnummer} | Seite ${i} von ${pageCount}`,
      17,
      290,
    );
    // Thin line above footer
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(17, 287, 193, 287);
  }

  return doc;
}

export default function ContractGenerator() {
  const { t } = useTranslation();
  const [kundeName, setKundeName] = useState("");
  const [kundeAdresse, setKundeAdresse] = useState("");
  const [selectedPaket, setSelectedPaket] = useState("");
  const [anzahlAerzte, setAnzahlAerzte] = useState("1");
  const [vertragsnummer, setVertragsnummer] = useState(() => generateContractNumber());
  const [vertragsbeginn, setVertragsbeginn] = useState(() => new Date().toISOString().slice(0, 10));
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const pkg = PACKAGES.find((p) => p.id === selectedPaket);

  const getVars = (): ContractVars => ({
    vertragsnummer,
    kundeName: kundeName || "–",
    kundeAdresse: kundeAdresse || "–",
    paket: pkg?.label || "–",
    preis: pkg?.price || "–",
    anzahlAerzte: anzahlAerzte || "–",
    datum: new Date().toLocaleDateString("de-CH"),
    vertragsbeginn: vertragsbeginn
      ? new Date(vertragsbeginn).toLocaleDateString("de-CH")
      : new Date().toLocaleDateString("de-CH"),
  });

  const handlePreview = () => {
    const doc = buildPdf(getVars());
    const blob = doc.output("blob");
    // Revoke previous URL
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(blob));
  };

  const generateAndDownload = () => {
    if (!kundeName || !selectedPaket) {
      toast.error("Bitte Kundenname und Paket ausfüllen.");
      return;
    }
    const vars = getVars();
    const doc = buildPdf(vars);
    const filename = `Vertrag_${kundeName.replace(/\s+/g, "_")}_${vars.vertragsnummer}.pdf`;
    doc.save(filename);
    toast.success("Vertrag wurde als PDF heruntergeladen.");
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
          {/* Vertragsnummer */}
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="anzahlAerzte">Anzahl Ärzte</Label>
              <Input
                id="anzahlAerzte"
                type="number"
                min={1}
                value={anzahlAerzte}
                onChange={(e) => setAnzahlAerzte(e.target.value)}
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
            <Select value={selectedPaket} onValueChange={setSelectedPaket}>
              <SelectTrigger>
                <SelectValue placeholder="Paket wählen…" />
              </SelectTrigger>
              <SelectContent>
                {PACKAGES.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label} — CHF {p.price} / Monat
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {pkg && (
              <p className="text-sm text-muted-foreground">
                Gewählt: <span className="font-medium text-foreground">{pkg.label}</span> — CHF{" "}
                {pkg.price} / Monat ({pkg.desc})
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button variant="outline" onClick={handlePreview}>
              <Eye className="mr-2 h-4 w-4" />
              Vorschau
            </Button>
            <Button onClick={generateAndDownload}>
              <Download className="mr-2 h-4 w-4" />
              Vertrag generieren (PDF)
            </Button>
          </div>
        </CardContent>
      </Card>

      {previewUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">PDF-Vorschau</CardTitle>
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
