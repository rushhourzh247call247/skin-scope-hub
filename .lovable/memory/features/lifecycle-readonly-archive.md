---
name: lifecycle-readonly-archive
description: Vertragslebenszyklus mit Read-Only/Archiv/Pending-Deletion Phasen, Customer-Endpoints für Self-Service, automatische Archiv-Vertragserstellung
type: feature
---

Nach Vertragsende (`contracts.end_date < heute`) wechselt eine Firma automatisch ihren `companies.lifecycle_status` durch vier Phasen: `active` → `read_only` (30 Tage Kulanz) → `archived` (CHF 50/Mt, monatlich kündbar mit 60 Tagen Frist) **oder** `pending_deletion` → physische Löschung. Cron `php artisan derm:lifecycle-tick` täglich 02:30 Uhr (Logfile `storage/logs/lifecycle.log`).

**Backend-Durchsetzung** läuft über `App\Http\Middleware\EnforceLifecycle` (global an `api`-Gruppe). Pro Request:
- `pending_deletion` → **HTTP 410** Gone
- `read_only`/`archived` + Schreib-Methode → **HTTP 423** mit JSON `{error:"read_only_mode", message, lifecycle_status, read_only_until}` — außer Pfad enthält `logout`, `pdf-export`, `export`, `token`, `archive-opt-in`, `archive-cancel`, `request-deletion` (Whitelist).

**Tabelle `companies`** hat 5 Lifecycle-Spalten: `lifecycle_status` (default `active`), `read_only_until`, `archive_opt_in` (bool), `archive_until`, `deletion_requested_at`. Migration: `database/migrations/2026_04_18_060000_add_lifecycle_to_companies.php`. **WICHTIG:** Diese Spalten müssen im `Company`-Model `$fillable` UND `$casts` (datetime/boolean) stehen, sonst persistiert `update()` nichts.

**Customer-Endpoints** (auth:sanctum, eigene Firma ODER admin):
- `POST /api/companies/{id}/archive-opt-in` — nur aus `read_only`. Erstellt automatisch einen Archiv-Vertrag (`package_id='archive'`, `monthly_price=50.00`, `notice_period_days=60`, `end_date=heute+10y`, contract_number `ARCH-{id}-{YYYYMMDD}`). Setzt `lifecycle_status='archived'`, `archive_opt_in=1`, `archive_until=null`.
- `POST /api/companies/{id}/archive-cancel` — nur aus `archived`. Setzt `archive_until=heute+60`, terminiert Archiv-Vertrag (`terminated_at`, `terminated_by`, `end_date=until`).
- `POST /api/companies/{id}/request-deletion` — aus `read_only` oder `archived`. Setzt `deletion_requested_at=now()`. Cron schiebt beim nächsten Lauf auf `pending_deletion`.

**Cron-Logik (`LifecycleTick`):**
1. `deletion_requested_at` gesetzt → `pending_deletion`
2. `active` + Vertrag (außer `package_id='archive'`) abgelaufen → `read_only`, `read_only_until=end_date+30d`
3. `read_only` + `read_only_until < heute` → `pending_deletion` (kein Auto-Archiv mehr — Kunde muss aktiv opt-in klicken)
4. `archived` + `archive_until < heute` → `pending_deletion`

**Frontend (`LifecycleBanner.tsx`):** Banner oberhalb AppLayout mit Buttons. Read-Only: "Daten archivieren" + "Daten löschen". Archiviert: "Archiv kündigen" (falls noch nicht gekündigt). AlertDialog-Bestätigung mit Aufklärung über Kosten/Unwiderruflichkeit. Lifecycle-Felder kommen via `/api/auth/me` mit (entweder `company_lifecycle_status` flach oder verschachtelt unter `company.*`).

**Test-Setup auf Dev (Hetzner, dev.derm247.ch):** Erfolgreich verifiziert mit Test-Firma id=4 (alle 4 Endpoints persistieren, Auto-Vertrag wird angelegt). Backups in `~/backups/lifecycle-customer-*`.
