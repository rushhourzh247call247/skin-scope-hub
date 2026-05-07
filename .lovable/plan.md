# Plan: PMA-Rolle (Shared Firmen-Assistenz-Login)

Ziel: Praxis-Assistenten (PMAs) erhalten einen geteilten Firmen-Login, mit dem sie Patienten anlegen, Spots/Zonen markieren und Fotos hochladen können — ohne Lizenz zu verbrauchen und ohne Zugriff auf medizinische Bewertungs- und Vergleichs-Features.

## Konzept

- **1 Shared PMA-Account pro Firma** (z. B. `pma@praxis-xyz.ch`)
- **Concurrent-Login erlaubt** (Ausnahme von der Single-Session-Regel)
- **Zählt nicht als Lizenz** (wie Accountant)
- Beim Login: **Pflichtfeld "Dein Name"** → Audit-Trail bei Uploads/Spot-Anlagen
- Sieht alle Patienten der Firma (wie reguläre User)
- Verwaltbar durch **Techassist-Admin** UND **Firmen-Ärzte** (Settings)

## Rollen-Matrix

| Feature | Arzt (user) | **PMA** | Accountant | Admin |
|---|---|---|---|---|
| Patient anlegen / bearbeiten | ✅ | ✅ | ❌ | ❌ |
| Spot/Zone anlegen | ✅ | ✅ | ❌ | ❌ |
| Foto-Upload (inkl. QR) | ✅ | ✅ | ❌ | ❌ |
| Foto-Galerie ansehen | ✅ | ✅ | ❌ | ❌ |
| ABCDE-Bewertung | ✅ | ❌ | ❌ | ❌ |
| Befunde lesen/schreiben | ✅ | ❌ | ❌ | ❌ |
| Risiko-Klassifizierung sichtbar | ✅ | ❌ | ❌ | ❌ |
| Bildvergleich (Side/Overlay) | ✅ | ❌ | ❌ | ❌ |
| KI-Analyse | ✅ | ❌ | ❌ | ❌ |
| PDF-Reports | ✅ | ❌ | ❌ | ❌ |
| Dashboard | ✅ | ❌ (→ Patientenliste) | ❌ | ✅ |
| Patient löschen/deaktivieren | ✅ | ❌ | ❌ | ✅ |
| Concurrent-Login | ❌ | ✅ | ❌ | ❌ |
| Verbraucht Lizenz | ✅ | ❌ | ❌ | ❌ |

## Backend (Laravel — auf Proto)

### 1. Rolle `pma` einführen
- Neue Migration: `users.role` Enum erweitern um `pma`
- `is_shared_account` Boolean-Flag auf `users` (für Concurrent-Erlaubnis)

### 2. Concurrent-Login-Ausnahme
- `LoginController`: Wenn `role=pma` und `is_shared_account=true` → bestehende Tokens **nicht** löschen
- 30m Idle-Logout bleibt aktiv (pro Token)

### 3. Lizenz-Ausnahme
- `LicenseEnforcement`-Logik: PMA wie Accountant ignorieren

### 4. Audit-Trail
- Migration: Spalte `created_by_label` (nullable) auf `images`, `spots`, `zones`, `patients`
- Login-Endpoint akzeptiert optionales Feld `display_name`, wird im Token-Context gespeichert (z. B. `personal_access_tokens.name`)
- Alle Create-Endpoints schreiben `created_by_label = "{display_name} (PMA)"` wenn Rolle = pma

### 5. Endpoint-Schutz (RBAC)
- ABCDE, Findings, AI, PDF-Reports, Compare-Endpoints: Middleware blockt `pma`
- Patient Delete/Deactivate: blockt `pma`

### 6. PMA-Account-Verwaltung
- Neue Endpoints für Firmen-Ärzte: `GET/POST/PUT /api/company/pma-account` (Passwort setzen, Account aktivieren/deaktivieren)
- Validierung: max. 1 PMA-Account pro Firma

## Frontend

### 1. Login-Flow
- `Login.tsx`: Wenn Backend antwortet `role=pma` → zweiter Schritt "Dein Name" (Pflicht), dann Session aufbauen
- `display_name` in `sessionStorage`, mit jedem API-Request via Header oder per Token-Init mitgegeben

### 2. AuthContext / Routing
- Neuer `PmaRoute`-Guard analog `AccountantRedirect`
- Erlaubte Routen für PMA: `/patients`, `/new-patient`, `/patient/:id`, `/upload`, `/settings` (nur Passwort)
- Default-Redirect: `/patients` (statt `/`)

### 3. UI-Sichtbarkeit (`useAuth().user.role === "pma"`)
- **AppSidebar**: nur "Patienten" + "Neuer Patient"
- **PatientDetail Tabs**: Akte (reduziert), Spots, Fotos — KEIN ABCDE/Befunde/Berichte/Vergleich
- **SpotLightbox / ImageGallery**: Buttons "Vergleichen", "Overlay", "KI-Analyse", "ABCDE", "PDF" ausgeblendet
- **3D-Body-Map**: Spots werden alle in neutralem Blau dargestellt (keine Risiko-Farben, keine roten Pulse)
- **PatientHeader**: Risiko-Badge ausgeblendet
- **Foto-Upload-Metadaten**: Header zeigt "Hochgeladen von: Sandra (PMA)" statt User-Email

### 4. PMA-Account-Verwaltung (für Ärzte)
- Neue Sektion in `Settings.tsx`: "PMA-Zugang"
- Felder: Email (read-only nach Anlage), Passwort setzen/zurücksetzen, Account aktivieren/deaktivieren
- Optional: Liste der erlaubten "Display Names" als Dropdown beim PMA-Login (vermeidet Tippfehler) — als V2 möglich, V1 = Freitext

## Migration / Daten

- Backend-Migration für Enum + neue Spalten
- Bestehende Patients/Spots/Images: `created_by_label` bleibt NULL → UI fällt auf Email/User-Name zurück (kein Bruch)

## Reihenfolge der Umsetzung

1. **Backend Migration** (Rolle, is_shared_account, created_by_label)
2. **Backend Login + Lizenz-Ausnahme + RBAC-Middleware**
3. **Backend PMA-Account-Verwaltung Endpoints**
4. **Frontend Login zweistufig**
5. **Frontend Routing/Sidebar/Visibility-Guards**
6. **Frontend Settings → PMA-Zugang verwalten**
7. **Frontend: Risiko-Farben/Pulse für PMA neutralisieren**
8. **Test auf Proto** (1 Test-PMA-Account in Demo-Firma anlegen)

## Offene Annahmen (bestätigen falls falsch)

- PMA-Login = Email + Passwort (kein 2FA), da Shared-Account
- 30m Idle-Logout gilt auch für PMA
- "Dein Name" Eingabe bei JEDEM Login neu (nicht in Browser gespeichert)
- Brute-Force-Schutz (5/min, 2m Lockout) gilt auch für PMA
