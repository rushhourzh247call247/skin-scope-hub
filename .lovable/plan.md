

# Mehrsprachigkeit (i18n) — 5 Sprachen

## Zusammenfassung

Die App bekommt eine manuelle Sprachwahl (DE/EN/FR/IT/ES). Der Benutzer wählt seine Sprache selbst — unabhängig von der Browser-Sprache. Beim ersten Login wird die Browser-Sprache als Vorschlag verwendet, kann aber jederzeit in den Settings geändert werden.

**Rein Frontend** — am Backend ändert sich nichts.

## Betroffene Dateien (vollständige Liste)

### Seiten (14 Dateien)
| Datei | Umfang | Beispiele |
|---|---|---|
| `PatientDetail.tsx` | ~58 Texte | Tabs, Labels, Dialoge, Toasts, Buttons |
| `PatientList.tsx` | ~35 Texte | Tabellen-Header, Filter, Suche |
| `UserManagement.tsx` | ~31 Texte | Benutzer-CRUD, Rollen, Status |
| `Snapshots.tsx` | ~25 Texte | Backup-Tabelle, Buttons, Toasts |
| `SystemDocs.tsx` | ~21 Texte | Doku-Texte, Beschreibungen |
| `CompanyManagement.tsx` | ~15 Texte | Firmen-CRUD |
| `Settings.tsx` | ~16 Texte | 2FA, Passwort, neu: Sprachwahl |
| `Dashboard.tsx` | ~14 Texte | Statistik-Labels, Willkommen |
| `Calibrate.tsx` | ~13 Texte | Kalibrierung |
| `NewPatient.tsx` | ~9 Texte | Formular-Labels, Buttons |
| `MobileUpload.tsx` | ~5 Texte | Upload-UI |
| `Login.tsx` | ~4 Texte | Login-Formular, 2FA |
| `NotFound.tsx` | ~2 Texte | 404-Seite |
| `Index.tsx` | minimal | Redirect |

### Komponenten (12 Dateien)
| Datei | Umfang |
|---|---|
| `OverviewPhoto.tsx` | ~27 Texte |
| `PdfExportDialog.tsx` | ~19 Texte |
| `BodyMap3D.tsx` | ~14 Texte |
| `ImageGallery.tsx` | ~11 Texte |
| `PdfReportHistory.tsx` | ~8 Texte |
| `ImageCompare.tsx` | ~7 Texte |
| `AbcdeForm.tsx` | ~5 Texte |
| `QrUploadDialog.tsx` | ~4 Texte |
| `AppSidebar.tsx` | ~8 Texte (Navigation) |
| `AiAnalysisResult.tsx` | ~3 Texte |
| `RiskProgression.tsx` | ~2 Texte |
| `PdfPreviewPages.tsx` | ~5 Texte |

### Utilities (2 Dateien)
| Datei | Umfang |
|---|---|
| `pdfExport.ts` | ~16 Texte (PDF-Report-Beschriftungen) |
| `companyExport.ts` | ~12 Texte (Export-Labels) |

### Zusätzlich ~70 Toast-Nachrichten (success/error/info) verteilt über die gesamte App.

**Gesamt: ~28 Dateien, ~500-600 Textbausteine**

## Neue Dateien

```text
src/i18n/
  index.ts              ← i18next Konfiguration + Browser-Erkennung
  locales/
    de.json             ← Deutsch (alle aktuellen Texte, ~500 Keys)
    en.json             ← English
    fr.json             ← Francais
    it.json             ← Italiano
    es.json             ← Espanol
```

## Umsetzungsschritte

1. **Dependencies installieren**: `react-i18next`, `i18next`, `i18next-browser-languagedetector`

2. **i18n-Konfiguration erstellen** (`src/i18n/index.ts`):
   - Browser-Sprache als Standard erkennen
   - `localStorage`-Key `derm247_language` für manuelle Wahl
   - Fallback: Deutsch

3. **Alle deutschen Texte extrahieren** in `de.json` mit strukturierten Keys:
   ```json
   {
     "nav.dashboard": "Dashboard",
     "nav.patients": "Patienten",
     "patients.title": "Patientenliste",
     "patients.newPatient": "Neuer Patient",
     "common.save": "Speichern",
     "common.cancel": "Abbrechen",
     "toast.patientCreated": "Patient erfolgreich erstellt"
   }
   ```

4. **Ubersetzungs-JSONs erstellen** (en, fr, it, es) mit denselben Keys

5. **Alle 28 Dateien refactoren**: Hardcodierte Strings durch `t('key')` ersetzen
   ```tsx
   // Vorher:
   <Button>Patient anlegen</Button>
   toast.success("Patient erfolgreich erstellt");

   // Nachher:
   const { t } = useTranslation();
   <Button>{t('patients.create')}</Button>
   toast.success(t('toast.patientCreated'));
   ```

6. **Sprachwahl-Dropdown in Settings** hinzufugen mit Flaggen:
   - DE Deutsch, EN English, FR Francais, IT Italiano, ES Espanol
   - Sofortiger Wechsel ohne Neuladen

7. **Login-Screen**: Kleine Sprachauswahl unten (damit man vor dem Login wechseln kann)

8. **dateUtils.ts anpassen**: Datumsformat je nach Sprache (dd.MM.yyyy vs MM/dd/yyyy vs dd/MM/yyyy)

9. **pdfExport.ts anpassen**: PDF-Reports in der gewahlten Sprache generieren

## Wichtige Design-Entscheidungen

- **Manuelle Wahl hat Prioritat** vor Browser-Erkennung
- **Medizinische Fachbegriffe** (ABCDE-Kriterien, ICD-Codes) bleiben unverandert
- **Patientendaten** (Namen, Notizen) kommen vom Backend und werden nicht ubersetzt
- **Neue Sprache hinzufugen** = nur neue JSON-Datei, kein Code-Anderung

## Reihenfolge der Umsetzung

Ich wurde es in Blocken machen, damit die App zwischendurch funktionsfahig bleibt:

1. **Block 1**: Infrastruktur (i18next Setup, de.json, en.json) + Settings-Dropdown
2. **Block 2**: Navigation + Login + Dashboard refactoren
3. **Block 3**: Patienten-Seiten (List, Detail, New)
4. **Block 4**: Komponenten (ImageGallery, OverviewPhoto, etc.)
5. **Block 5**: PDF-Export, Toasts, restliche Dateien
6. **Block 6**: FR/IT/ES Ubersetzungen hinzufugen

