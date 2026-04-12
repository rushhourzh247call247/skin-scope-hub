import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { FileText, Download, Eye } from "lucide-react";
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
import { DermLogo } from "@/components/DermLogo";

const PACKAGES = [
  { id: "single", label: "Einzellizenz", price: "80.–", priceNum: 80, desc: "1 Arzt" },
  { id: "small", label: "1–5 Ärzte", price: "350.–", priceNum: 350, desc: "bis 5 Ärzte" },
  { id: "medium", label: "6–10 Ärzte", price: "650.–", priceNum: 650, desc: "bis 10 Ärzte" },
  { id: "unlimited", label: "Unbegrenzt", price: "1'200.–", priceNum: 1200, desc: "unbegrenzt" },
];

function buildContractText(vars: {
  kundeName: string;
  kundeAdresse: string;
  paket: string;
  preis: string;
  anzahlAerzte: string;
  datum: string;
}) {
  return `
LIZENZVERTRAG

zwischen

TechAssist GmbH
Musterstrasse 1
8000 Zürich
(nachfolgend «Lizenzgeberin»)

und

${vars.kundeName}
${vars.kundeAdresse}
(nachfolgend «Lizenznehmer»)


1. Vertragsgegenstand

Die Lizenzgeberin gewährt dem Lizenznehmer das nicht-exklusive, nicht übertragbare Recht zur Nutzung der Software «DERM247» gemäss den Bedingungen dieses Vertrags.


2. Lizenzumfang

Paket: ${vars.paket}
Anzahl Ärzte: ${vars.anzahlAerzte}
Monatliche Lizenzgebühr: CHF ${vars.preis} / Monat (exkl. MwSt.)


3. Vertragsbeginn und Laufzeit

Der Vertrag beginnt am ${vars.datum} und wird auf unbestimmte Dauer abgeschlossen. Er kann von jeder Partei mit einer Frist von 3 Monaten auf Monatsende schriftlich gekündigt werden.


4. Zahlungsbedingungen

Die Lizenzgebühr wird monatlich in Rechnung gestellt und ist innert 30 Tagen nach Rechnungsdatum zahlbar. Bei Zahlungsverzug behält sich die Lizenzgeberin das Recht vor, den Zugang zur Software zu sperren.


5. Datenschutz und Datensicherheit

Die Lizenzgeberin verpflichtet sich, alle im Zusammenhang mit der Nutzung der Software anfallenden Daten gemäss dem Schweizerischen Datenschutzgesetz (DSG) und der DSGVO zu behandeln. Die Daten werden in der Schweiz gehostet.


6. Gewährleistung und Haftung

Die Lizenzgeberin gewährleistet die Verfügbarkeit der Software von mindestens 99.5% im Jahresmittel (exkl. geplante Wartungsfenster). Die Haftung ist auf die Höhe der in den letzten 12 Monaten bezahlten Lizenzgebühren beschränkt.


7. Geheimhaltung

Beide Parteien verpflichten sich, vertrauliche Informationen der jeweils anderen Partei geheim zu halten und nicht an Dritte weiterzugeben.


8. Schlussbestimmungen

Es gilt Schweizer Recht. Gerichtsstand ist Zürich.

Dieser Vertrag wurde in zwei Exemplaren ausgefertigt und von beiden Parteien unterzeichnet.



Ort, Datum: ________________________          Ort, Datum: ________________________



Lizenzgeberin:                                 Lizenznehmer:

TechAssist GmbH                                ${vars.kundeName}


________________________                       ________________________
Unterschrift                                   Unterschrift
`.trim();
}

export default function ContractGenerator() {
  const { t } = useTranslation();
  const [kundeName, setKundeName] = useState("");
  const [kundeAdresse, setKundeAdresse] = useState("");
  const [selectedPaket, setSelectedPaket] = useState("");
  const [anzahlAerzte, setAnzahlAerzte] = useState("1");
  const [previewText, setPreviewText] = useState<string | null>(null);

  const pkg = PACKAGES.find((p) => p.id === selectedPaket);

  const getVars = () => ({
    kundeName: kundeName || "–",
    kundeAdresse: kundeAdresse || "–",
    paket: pkg?.label || "–",
    preis: pkg?.price || "–",
    anzahlAerzte: anzahlAerzte || "–",
    datum: new Date().toLocaleDateString("de-CH"),
  });

  const handlePreview = () => {
    setPreviewText(buildContractText(getVars()));
  };

  const generatePdf = () => {
    if (!kundeName || !selectedPaket) {
      toast.error("Bitte Kundenname und Paket ausfüllen.");
      return;
    }

    const vars = getVars();
    const text = buildContractText(vars);
    const doc = new jsPDF({ unit: "mm", format: "a4" });

    // Header with branding
    doc.setFillColor(37, 99, 235); // primary blue
    doc.rect(0, 0, 210, 18, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("DERM247", 15, 12);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Lizenzvertrag", 55, 12);

    // Body
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    const lines = doc.splitTextToSize(text, 175);
    let y = 28;
    const pageHeight = 280;

    for (const line of lines) {
      if (y > pageHeight) {
        doc.addPage();
        y = 20;
      }

      // Bold section headings (numbered)
      if (/^\d+\.\s/.test(line) || line === "LIZENZVERTRAG") {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(line === "LIZENZVERTRAG" ? 14 : 11);
        doc.text(line, 17, y);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
      } else if (line.startsWith("zwischen") || line.startsWith("und")) {
        doc.setFont("helvetica", "italic");
        doc.text(line, 17, y);
        doc.setFont("helvetica", "normal");
      } else {
        doc.text(line, 17, y);
      }
      y += 5;
    }

    // Footer on last page
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text(`DERM247 – Lizenzvertrag | Seite ${i} von ${pageCount}`, 17, 290);
    }

    const filename = `Vertrag_${kundeName.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);
    toast.success("Vertrag wurde als PDF heruntergeladen.");
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
                Gewählt: <span className="font-medium text-foreground">{pkg.label}</span> — CHF {pkg.price} / Monat ({pkg.desc})
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button variant="outline" onClick={handlePreview}>
              <Eye className="mr-2 h-4 w-4" />
              Vorschau
            </Button>
            <Button onClick={generatePdf}>
              <Download className="mr-2 h-4 w-4" />
              Vertrag generieren (PDF)
            </Button>
          </div>
        </CardContent>
      </Card>

      {previewText && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Vorschau</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap rounded-lg border bg-muted/30 p-4 text-sm leading-relaxed font-mono">
              {previewText}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
