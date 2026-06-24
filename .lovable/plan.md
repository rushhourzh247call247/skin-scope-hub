# Sicherer Proto-Deploy + anschliessend Live-Deploy

## Ziel
Die neuen `/api/m/`-Endpoints (Clinical Photos, Marker, Läsionen, Assets) werden zuerst auf **Proto** (`138.199.167.214`) eingespielt, geprüft und – erst wenn alles funktioniert – identisch auf **Live** (`83.228.246.191`) übertragen.

---

## Phase 1: Backup auf Proto (Muss zuerst passieren)

1. Per SSH als `root` auf Proto einloggen.
2. Datenbank-Backup erzeugen (SQLite lt. Memory):
   `sqlite3 /home/ubuntu/derm-api/database/database.sqlite ".backup /home/ubuntu/snapshots/db_pre_mobile_$(date +%Y%m%d_%H%M%S).sqlite"`
3. Datei-Backups anlegen:
   - `cp /home/ubuntu/derm-api/routes/api.php /home/ubuntu/snapshots/api_routes_pre_mobile_$(date +%Y%m%d_%H%M%S).php`
   - `cp -r /home/ubuntu/derm-api/database/migrations /home/ubuntu/snapshots/migrations_pre_mobile_$(date +%Y%m%d_%H%M%S)`
4. Storage-Backup:
   - `cp -r /home/ubuntu/derm-api/storage/app /home/ubuntu/snapshots/storage_app_pre_mobile_$(date +%Y%m%d_%H%M%S)`

---

## Phase 2: Backend-Dateien auf Proto einspielen

1. `migration.php` nach `database/migrations/2026_06_25_000000_create_mobile_marker_tables.php` kopieren.
2. Models `ClinicalPhoto.php`, `Lesion.php`, `LesionAsset.php` nach `app/Models/` kopieren.
3. `controller.php` nach `app/Http/Controllers/MobileMarkerController.php` kopieren.
4. `routes-snippet.php` in `routes/api.php` innerhalb der bestehenden `auth:sanctum`-Gruppe anhängen (nicht überschreiben).
5. Neue Storage-Verzeichnisse anlegen:
   `sudo -u www-data mkdir -p storage/app/clinical_photos storage/app/lesion_assets`
   `sudo chown -R www-data:www-data storage/app`

---

## Phase 3: Migration und Cache auf Proto

1. Migration ausführen:
   `sudo -u www-data php artisan migrate`
2. Caches leeren:
   `sudo -u www-data php artisan route:clear`
   `sudo -u www-data php artisan config:clear`
   `sudo -u www-data php artisan cache:clear`
3. PHP-FPM reload:
   `sudo systemctl reload php8.3-fpm`

---

## Phase 4: Verifikation auf Proto

1. Routen prüfen:
   `sudo -u www-data php artisan route:list | grep "api/m/"`
   Erwartet: `patients/{patientId}/clinical-photos`, `clinical-photos/{id}/lesions`, `lesions/{id}/assets`, etc.
2. Tabellen prüfen (SQLite):
   `sqlite3 database/database.sqlite ".tables"` → `clinical_photos`, `lesions`, `lesion_assets`, `lesion_events` sollten erscheinen.
3. Frontend-Test: In `https://proto.derm247.ch/m` einloggen, Patienten-Liste, klinisches Foto, Marker, Läsion-Detail testen.

---

## Phase 5: Live-Deploy (nur nach erfolgreichem Proto-Test)

1. Auf Live-Server (`83.228.246.191`) identische Phase 1–3 durchführen.
2. Identische Verifikation wie Phase 4.
3. `https://app.derm247.ch/m` bleibt unverändert; die neue Route ist nur unter `/m` verfügbar.

---

## Technische Details

- **Tabellen:** `clinical_photos`, `lesions` (UUID-PK, dauerhafte ID), `lesion_assets`, `lesion_events` (Historie-Hülle).
- **Multi-Tenancy:** Jede Query filtert auf `company_id` des authentifizierten Users.
- **Marker-Regeln:** Label `L1`, `L2`, … wird beim Anlegen vergeben und niemals recycelt; Verschieben ändert nur `x_pct`/`y_pct`, nicht die UUID.
- **Bilder:** Werden in `storage/app/clinical_photos/` bzw. `storage/app/lesion_assets/` abgelegt und über den bestehenden `/api/image/{filename}`-Endpoint ausgeliefert.
- **Risiko:** Kein bestehendes Datenmodell wird verändert; nur neue Tabellen und neue `/api/m/`-Routen werden hinzugefügt.

---

## Rückfallstrategie

Falls etwas schiefgeht:
1. Migration rollback: `sudo -u www-data php artisan migrate:rollback --step=1`
2. Routes-Backup zurückspielen.
3. Controller/Models löschen.
4. PHP-FPM reload.
