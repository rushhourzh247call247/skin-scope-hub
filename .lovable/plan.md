

# Patientenakte-Tab mit Backend-Endpunkten

## Übersicht

Neuer "Akte"-Tab als Standard-Ansicht beim Öffnen eines Patienten. Enthält klinische Zusammenfassung, Termine und Dokumente — mit vollständigen Backend-Endpunkten.

## 1. Backend: Neue Tabellen und Endpunkte

### Neue Datenbank-Tabellen

```text
appointments
├── id (integer, PK)
├── patient_id (FK → patients)
├── scheduled_at (datetime)
├── notes (text, nullable)
├── created_at / updated_at
└── company_id (FK, Mandantenfähigkeit)

patient_documents
├── id (integer, PK)
├── patient_id (FK → patients)
├── file_path (string)
├── original_name (string)
├── notes (text, nullable)
├── uploaded_by (FK → users)
├── created_at / updated_at
└── company_id (FK)
```

### Neue API-Endpunkte

| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| GET | `/patients/{id}/appointments` | Termine eines Patienten |
| POST | `/patients/{id}/appointments` | Termin erstellen |
| PUT | `/appointments/{id}` | Termin bearbeiten |
| DELETE | `/appointments/{id}` | Termin löschen |
| GET | `/patients/{id}/documents` | Dokumente eines Patienten |
| POST | `/patients/{id}/documents` | Dokument hochladen |
| DELETE | `/documents/{id}` | Dokument löschen |
| GET | `/documents/{id}/download` | Dokument herunterladen |

Diese Endpunkte werden in `routes/api.php` innerhalb der bestehenden `auth:sanctum`-Gruppe ergänzt. Die Mandantenfähigkeit folgt dem bestehenden Pattern (`$user->company_id`).

## 2. Frontend: Neue Types und API-Methoden

**`src/types/patient.ts`** — Neue Interfaces:
- `Appointment { id, patient_id, scheduled_at, notes, created_at }`
- `PatientDocument { id, patient_id, file_path, original_name, notes, uploaded_by, created_at }`

**`src/lib/api.ts`** — Neue Methoden:
- `getAppointments(patientId)`, `createAppointment(patientId, data)`, `updateAppointment(id, data)`, `deleteAppointment(id)`
- `getDocuments(patientId)`, `uploadDocument(patientId, file, notes?)`, `deleteDocument(id)`, `getDocumentDownloadUrl(id)`

## 3. Frontend: Akte-Tab

**`src/pages/PatientDetail.tsx`**:
- `activeTab` erweitern um `"akte"` als neuen Default-Wert
- Neuer Tab "Akte" (ClipboardList Icon) als erster Tab

**Inhalt des Akte-Tabs** (4 Karten):

1. **Patientenstammdaten** — Name, Geburtsdatum, Geschlecht, Versicherung, Kontakt, Notizen (aus vorhandenen Daten)

2. **Klinische Zusammenfassung** — Berechnet aus `patient.locations`:
   - Anzahl aktive Spots nach Klassifikation (z.B. "3 Nävi, 1 Melanom-Verdacht")
   - Hochrisiko-Spots hervorgehoben
   - Letzter Befund mit Datum und Arzt

3. **Termine** — Liste mit Datum, Notiz; Formular zum Hinzufügen; überfällige Termine rot markiert

4. **Dokumente** — Upload-Bereich für Überweisungen/Vorbefunde; Liste mit Download-Link

## 4. Übersetzungen

Alle 5 Locale-Dateien (`de`, `en`, `fr`, `it`, `es`) erhalten Keys für:
- `akte`, `clinical_summary`, `appointments`, `next_appointment`, `overdue`, `documents`, `upload_document`, `referral`, `no_appointments`, `no_documents`, `high_risk_spots`, `last_finding`, `add_appointment`

## Umsetzungsreihenfolge

1. Backend: Migration + Endpunkte auf dem Server erstellen (via SSH)
2. Frontend: Types + API-Methoden ergänzen
3. Frontend: Akte-Tab bauen mit den 4 Karten
4. Übersetzungen in alle Sprachen

## Technische Details

- Backend-Änderungen werden per SSH auf dem Ubuntu-Server durchgeführt (SQLite-Migration, `routes/api.php` editieren)
- Dokument-Upload nutzt das bestehende Storage-Pattern (`Storage::disk('local')`)
- Termine-Logik: `scheduled_at < now()` → überfällig (rot), sonst grün
- Der Akte-Tab nutzt die bereits geladenen `fullPatient`-Daten für die klinische Zusammenfassung, plus separate Queries für Appointments und Documents

