

## PDF-Workflow: Vorschau, Bearbeitung & Berichts-Verlauf

### Was gebaut wird

1. **PDF-Konfigurationsdialog** (`PdfExportDialog.tsx`)
   - Öffnet sich beim Klick auf den PDF-Button (statt direktem Download)
   - Checkboxen für Inhalte: Klassifizierung, ABCDE, Risiko-Score, Bilder, Notizen
   - Berichtstyp: "Letzte Konsultation" / "Gesamtverlauf"
   - "Vorschau"-Button generiert PDF und zeigt es inline als iframe/embed an
   - Im Vorschau-Modus: Textfeld für Arzt-Kommentar/Zusammenfassung, der ins PDF eingebettet wird
   - "Speichern & Herunterladen"-Button

2. **PDF-Vorschau mit Textbearbeitung**
   - Nach Auswahl der Optionen wird das PDF als Blob-URL in einem eingebetteten Viewer angezeigt
   - Daneben/darunter ein Textarea für "Ärztliche Zusammenfassung" — dieser Text wird ins PDF eingefügt
   - Bei Änderung am Text: PDF wird neu generiert mit dem aktualisierten Text
   - Download-Button lädt die finale Version herunter

3. **Berichts-Verlauf** (Report History)
   - Neue API-Endpunkte (falls Backend unterstützt) oder localStorage-basierter Verlauf
   - Neuer Tab/Abschnitt auf der Patientendetail-Seite: "Berichte"
   - Liste aller gespeicherten PDFs mit Datum, Berichtstyp, Arzt
   - Jeder Eintrag: Erneut herunterladen, Vorschau öffnen, Löschen
   - Gespeichert wird: Blob-URL (kurzfristig) + Metadaten (Datum, Typ, Optionen, Arzt-Text)

### Technische Umsetzung

**Neue Dateien:**
- `src/components/PdfExportDialog.tsx` — Konfiguration + Vorschau + Textbearbeitung in einem Dialog
- `src/components/PdfReportHistory.tsx` — Liste gespeicherter Berichte

**Geänderte Dateien:**
- `src/lib/pdfExport.ts` — `generatePatientPDF` erhält `PdfExportOptions` mit Toggle-Flags und optionalem `doctorSummary`-Text; bedingte Abschnitte
- `src/pages/PatientDetail.tsx` — PDF-Button öffnet `PdfExportDialog`; neuer "Berichte"-Tab mit `PdfReportHistory`
- `src/types/patient.ts` — Neuer Typ `PdfExportOptions` und `PdfReport` (Metadaten)
- `src/lib/api.ts` — Falls API-Endpunkte für Berichts-Speicherung existieren, sonst localStorage-Wrapper

**Speicherung der Berichte:**
- Zunächst localStorage: Metadaten (Datum, Optionen, Arzt-Text) + Base64-PDF
- Limit auf letzte 20 Berichte pro Patient (Speicherplatz)
- Löschen einzelner Berichte möglich

**PdfExportOptions-Typ:**
```text
{
  reportType: "lastVisit" | "fullHistory"
  showClassification: boolean
  showAbcde: boolean
  showRiskScore: boolean
  showImages: boolean
  showNotes: boolean
  doctorSummary: string  // Freitext vom Arzt
}
```

### Ablauf für den Arzt

1. Klick auf PDF-Icon → Dialog öffnet sich
2. Checkboxen wählen (was soll drauf)
3. "Vorschau" klicken → PDF wird inline angezeigt
4. Optional: Zusammenfassungstext eingeben/anpassen
5. "Speichern & Herunterladen" → PDF wird heruntergeladen UND im Verlauf gespeichert
6. Unter "Berichte"-Tab: alle bisherigen PDFs einsehen, erneut herunterladen oder löschen

