

# Vertragsanpassungen, Mindestlaufzeit und Lizenzkontrolle

## Aktueller Stand -- Was fehlt

1. **Keine Mindestlaufzeit-Neuberechnung bei Paketwechsel**: Wenn ein Vertrag bearbeitet wird, wird `end_date` immer auf `start_date + 12 Monate` gesetzt -- auch wenn der Vertrag schon 6 Monate läuft. Es gibt keine Logik, die eine neue Mindestlaufzeit ab dem Änderungsdatum berechnet.

2. **Kein Zusatzvertrag/Änderungsvermerk**: Das System erstellt keinen formalen Nachtrag. Die Änderung überschreibt einfach die bisherigen Werte. Es gibt kein Änderungsprotokoll im PDF.

3. **Keine Lizenzkontrolle**: Beim Erstellen eines neuen Benutzers (UserManagement) wird die Lizenzanzahl aus dem Vertrag nicht geprüft. Man kann beliebig viele User anlegen, auch wenn nur 5 Lizenzen vorhanden sind. Auch in der Firmenübersicht ist nicht ersichtlich, wie viele Lizenzen belegt/frei sind.

4. **Preis wird bei Bearbeitung nicht korrekt berechnet**: `handleEdit()` nutzt `pkg.priceNum` statt `calcPrice()`, dadurch wird bei Einzellizenzen der Preis falsch gesetzt.

---

## Plan

### 1. Preisberechnung bei Bearbeitung korrigieren
**Datei: `src/components/ContractPanel.tsx`**
- `handleEdit()`: `monthly_price` via `calcPrice(pkg.id, form.licenses).total` berechnen statt `pkg.priceNum`

### 2. Mindestlaufzeit bei Vertragsänderung
**Datei: `src/components/ContractPanel.tsx`**
- Wenn Paket oder Lizenzen geändert werden: neues `end_date` = max(bestehendes end_date, heute + 12 Monate)
- So wird die Mindestlaufzeit ab Änderungsdatum garantiert, aber ein bereits weiter laufender Vertrag nicht verkürzt
- Automatischer Vermerk im `notes`-Feld: z.B. "14.04.2026: Paket geändert Einzellizenz→5er-Paket, Lizenzen 2→5, neue Mindestlaufzeit bis 14.04.2027"

### 3. Zusatzvertrag-PDF (Nachtrag)
**Datei: `src/lib/contractPdf.ts`**
- Neue Funktion `buildAmendmentPdf()` die einen Vertragsnachtrag erstellt mit: Bezug auf Originalvertragsnummer, Änderungsdatum, alte vs. neue Konditionen, neue Mindestlaufzeit
- Nach dem Speichern einer Vertragsänderung: Toast mit "Nachtrag-PDF herunterladen?" anbieten

### 4. Lizenzanzeige in der Firmenübersicht
**Datei: `src/components/ContractPanel.tsx` und `src/pages/CompanyManagement.tsx`**
- Im ContractPanel die Anzahl aktiver User der Firma (aus dem Users-Query) mit der Lizenzanzahl vergleichen
- Anzeige: "3 / 5 Lizenzen belegt (2 frei)" mit farbigem Badge
- Bei voller Auslastung: roter Badge "Alle Lizenzen belegt"

### 5. Lizenzprüfung beim User-Erstellen
**Datei: `src/pages/UserManagement.tsx`**
- Vor dem Erstellen eines neuen Users: aktiven Vertrag der gewählten Firma prüfen
- Wenn Anzahl aktiver User >= Lizenzanzahl: Erstellen blockieren mit Fehlermeldung "Lizenzlimit erreicht. Bitte Vertrag upgraden."
- Benötigt: API-Call um aktiven Vertrag + User-Count der Firma zu holen (oder aus bestehenden Queries ableiten)

### 6. Backend-Ergänzung (manuell auf Server)
- Endpunkt `GET /api/companies/{id}/license-status` der `{ licenses: 5, used: 3, available: 2 }` zurückgibt
- Optional: Middleware-Check im `POST /api/users` Endpunkt, der serverseitig das Lizenzlimit prüft

---

## Betroffene Dateien

| Datei | Änderung |
|---|---|
| `src/components/ContractPanel.tsx` | Preisberechnung, Mindestlaufzeit, Änderungsvermerk, Lizenzanzeige |
| `src/lib/contractPdf.ts` | Neue `buildAmendmentPdf()` Funktion |
| `src/pages/UserManagement.tsx` | Lizenzprüfung vor User-Erstellung |
| `src/pages/CompanyManagement.tsx` | Lizenzstatus in Firmenübersicht |
| `src/lib/api.ts` | Neuer API-Call `getLicenseStatus()` |
| Backend (manuell) | Neuer Endpunkt + serverseitige Prüfung |

