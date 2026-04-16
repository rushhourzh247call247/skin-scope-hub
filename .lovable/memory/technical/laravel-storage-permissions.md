---
name: laravel-storage-permissions
description: Laravel storage/ und bootstrap/cache brauchen www-data Schreibrechte, sonst landet file_path als '0' in DB
type: feature
---

Auf Laravel-Servern (Live `83.228.246.191`, Staging) müssen `storage/` und `bootstrap/cache/` für `www-data` (PHP-FPM-User) schreibbar sein, sonst liefert `$file->storeAs('images', $filename, 'public')` **`false`** zurück. Dieser Boolean wird von SQLite als String **`'0'`** in `images.file_path` gespeichert — das Foto erscheint im UI als kaputtes Bild (404), obwohl der Upload-Request HTTP 200 zurückgibt.

**Symptom:** Neue Uploads zeigen kaputtes Bild, alte funktionieren. In DB: `file_path='0'`. Physisch keine neue Datei in `storage/app/public/images/`.

**Fix (auf jedem Server nach Permission-Drift):**
```bash
sudo chown -R ubuntu:www-data /home/ubuntu/derm-api/storage
sudo chmod -R 775 /home/ubuntu/derm-api/storage
sudo chmod -R 775 /home/ubuntu/derm-api/bootstrap/cache
```

**Cleanup kaputter DB-Einträge (immer mit Backup):**
```bash
mkdir -p ~/backups/pre-imagefix-$(date +%Y%m%d-%H%M)
cp /home/ubuntu/derm-api/database/database.sqlite ~/backups/pre-imagefix-$(date +%Y%m%d-%H%M)/
sqlite3 /home/ubuntu/derm-api/database/database.sqlite "DELETE FROM images WHERE file_path='0' OR file_path IS NULL OR file_path='';"
```

**Prüfung:** `sudo -u www-data touch /home/ubuntu/derm-api/storage/app/public/images/test.txt`
