---
name: lifecycle-readonly-archive
description: Vertragslebenszyklus mit Read-Only/Archiv/Pending-Deletion Phasen, durchgesetzt per Backend-Middleware
type: feature
---

Nach Vertragsende (`contracts.end_date < heute`) wechselt eine Firma automatisch ihren `companies.lifecycle_status` durch vier Phasen: `active` → `read_only` (30 Tage Export-Frist) → `archived` (CHF 50/Mt, falls `archive_opt_in=1`) **oder** `pending_deletion` → physische Löschung. Der Wechsel erfolgt täglich um **02:30 Uhr** via Cron `php artisan derm:lifecycle-tick` (Logfile `storage/logs/lifecycle.log`).

Die Backend-Durchsetzung läuft über die Middleware `App\Http\Middleware\EnforceLifecycle`, global an die `api`-Gruppe gehängt (`bootstrap/app.php` → `appendToGroup("api", …)`). Sie prüft pro Request:
- `pending_deletion` → **HTTP 410** Gone
- `read_only`/`archived` + Schreib-Methode (POST/PUT/PATCH/DELETE) → **HTTP 423** mit JSON `{error:"read_only_mode", message, lifecycle_status, read_only_until}` — außer der Pfad enthält `logout`, `pdf-export`, `export` oder `token` (Whitelist für Datenexport/Auth).
- Sonst durchlassen.

**Tabelle `companies` hat 5 neue Spalten:** `lifecycle_status` (varchar, default `active`), `read_only_until` (datetime), `archive_opt_in` (bool, default 0), `archive_until` (datetime), `deletion_requested_at` (datetime). Migration: `database/migrations/2026_04_18_060000_add_lifecycle_to_companies.php`.

**Frontend-Erwartung:** Auf 423-Response → globaler Toast „Account im Read-Only-Modus", Schreib-Buttons disablen. `/api/auth/me` sollte um `company.lifecycle_status` + `read_only_until` erweitert werden für Banner in `AppLayout`. Aktuell **noch nicht** im Frontend integriert — Server blockiert hart, UI muss freundlich erklären.

**Manuelle Sofort-Löschung** durch Kunde: `companies.deletion_requested_at` setzen → nächster Cron-Lauf setzt auf `pending_deletion`.

**Test-Setup auf Dev (Hetzner, dev.derm247.ch):** Erfolgreich mit Test-Firma id=4 verifiziert (POST /api/patients liefert 423, GET 200). Backups unter `~/backups/pre-lifecycle-20260418-054350/`.
