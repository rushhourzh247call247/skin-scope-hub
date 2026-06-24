# Backend-Deliverables für /api/m – auf Proto-Server deployen

Diese Dateien aktivieren das Marker-zentrierte Datenmodell **nur auf Proto**
(`dev.derm247.ch`). Der Live-Server bleibt komplett unangetastet.

Pfade auf dem Server (Proto = Live identisch laut Memory):
`/home/ubuntu/derm-api/`

## 1. Migration als Datei anlegen

`database/migrations/2026_06_25_000000_create_mobile_marker_tables.php` – Inhalt aus
[`migration.php`](./migration.php) übernehmen.

## 2. Models

`app/Models/ClinicalPhoto.php`, `app/Models/Lesion.php`, `app/Models/LesionAsset.php`
aus [`models/`](./models/) übernehmen.

## 3. Controller + Routen

`app/Http/Controllers/MobileMarkerController.php` aus [`controller.php`](./controller.php).
Routen in `routes/api.php` ergänzen – siehe [`routes-snippet.php`](./routes-snippet.php).

## 4. Auf Proto ausführen

```bash
ssh root@138.199.167.214
cd /home/ubuntu/derm-api
sudo -u www-data php artisan migrate
sudo -u www-data php artisan route:clear
sudo -u www-data php artisan config:clear
sudo systemctl reload php8.3-fpm
```

## 5. Storage-Verzeichnis

```bash
sudo -u www-data mkdir -p storage/app/clinical_photos storage/app/lesion_assets
sudo chown -R www-data:www-data storage/app
```

## Was es macht

- Drei neue Tabellen (`clinical_photos`, `lesions` mit UUID-PK, `lesion_assets`)
  + Historie-Hülle `lesion_events`.
- Multi-Tenancy: jede Query filtert auf `company_id = $user->company_id`.
- Soft-Delete auf `lesions`/`lesion_assets`/`clinical_photos`.
- Label-Vergabe einmalig beim Anlegen (`L1`, `L2`, …, hochlaufend pro Patient,
  Nummern werden bei Löschung NICHT recycelt).
- Verschieben ändert nur `x_pct`/`y_pct`, niemals die UUID.
- Bilder werden in `storage/app/clinical_photos/` bzw. `storage/app/lesion_assets/`
  abgelegt und über den bestehenden `/api/image/{filename}`-Endpoint ausgeliefert.
