# Server-Admin Dashboard

## Übersicht
Neue Seite `/server-admin` (nur Admins) mit Live-Terminal-Output, Versionsverwaltung, Backup-Management und Service-Kontrolle.

## Phase 1: Backend (Laravel API-Endpoints)

Alle Endpoints unter `/api/server-admin/*`, geschützt durch Admin-Middleware.

| Endpoint | Methode | Funktion |
|---|---|---|
| `/api/server-admin/status` | GET | Server-Status (Uptime, Disk, Memory, PHP, Nginx) |
| `/api/server-admin/deploy` | POST | Git pull + migrate + cache clear (SSE-Stream) |
| `/api/server-admin/versions` | GET | Git log (letzte 20 Commits) |
| `/api/server-admin/rollback` | POST | Git checkout + DB restore |
| `/api/server-admin/backup` | POST | Sofort-Backup der DB |
| `/api/server-admin/backups` | GET | Liste aller Backups |
| `/api/server-admin/backup/restore` | POST | Backup wiederherstellen |
| `/api/server-admin/snapshot` | POST | Snapshot erstellen |
| `/api/server-admin/services` | GET | Status von nginx, php-fpm |
| `/api/server-admin/services/restart` | POST | Dienst neustarten |

### Sicherheit:
- Nur Admin-Rolle (RBAC-Middleware)
- Rate-Limiting
- Alle Aktionen geloggt
- Bestätigungs-Dialog bei destruktiven Aktionen

## Phase 2: Frontend (React)

### 4 Bereiche:

**1. Server-Status** — Uptime, CPU, RAM, Disk (Ampel-System)

**2. Deployment-Panel** — Deploy-Button, Live-Terminal (SSE), Fortschritt (Step 1/5)

**3. Versions-Liste** — Git-Commits, aktiver Badge, Rollback-Button

**4. Backup & Services** — Backup erstellen/restore, Snapshots, Service-Restart

### Terminal-Komponente:
- Schwarz, grüne Monospace-Schrift, Auto-Scroll
- Timestamps, Farbcodierung (Grün/Rot/Gelb)

## Phase 3: Umsetzungsreihenfolge

1. Frontend-Seite + Terminal-Komponente + Route + Sidebar
2. API-Funktionen + SSE-Handler
3. Backend-Endpoints (copyable PHP-Code)
