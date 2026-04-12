import jsPDF from "jspdf";

export const PACKAGES = [
  { id: "single", label: "Einzellizenz", price: "80.–", priceNum: 80, desc: "1 Arzt" },
  { id: "small", label: "1–5 Ärzte", price: "350.–", priceNum: 350, desc: "bis 5 Ärzte" },
  { id: "medium", label: "6–10 Ärzte", price: "650.–", priceNum: 650, desc: "bis 10 Ärzte" },
  { id: "unlimited", label: "Unbegrenzt", price: "1'200.–", priceNum: 1200, desc: "unbegrenzt" },
];

export function generateContractNumber(): string {
  const year = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 9999) + 1).padStart(4, "0");
  return `V-${year}-${seq}`;
}

const BRAND_RGB: [number, number, number] = [28, 175, 154];

export interface ContractVars {
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
  doc.setFillColor(...BRAND_RGB);
  doc.roundedRect(x, y, 8, 8, 1.5, 1.5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("D", x + 2.3, y + 6);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("DERM247", x + 10.5, y + 6.5);
}

export function buildContractPdf(vars: ContractVars): jsPDF {
  const text = buildContractText(vars);
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  doc.setFillColor(...BRAND_RGB);
  doc.rect(0, 0, 210, 20, "F");
  drawLogo(doc, 14, 5.5);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(vars.vertragsnummer, 195, 13, { align: "right" });

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
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(17, 287, 193, 287);
  }

  return doc;
}
