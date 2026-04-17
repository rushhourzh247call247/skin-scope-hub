---
name: server-admin-deploy-permissions
description: Deploy via /server-admin braucht www-data Schreibrechte auf VERSION + erhöhte Nginx/PHP Timeouts (10min)
type: feature
---

Der `/server-admin` Deploy-Endpoint (`ServerAdminController@deploy`) schreibt lokal auf dem Dev-Server die `/home/ubuntu/derm-api/VERSION` Datei hoch (z.B. 1.3 → 1.4) **bevor** er per rsync zum Live-Server pusht. Da PHP-FPM als `www-data` läuft, muss diese Datei (und das Parent-Verzeichnis) für `www-data` schreibbar sein, sonst bricht der Deploy mit `file_put_contents(...VERSION): Failed to open stream: Permission denied` ab.

Zusätzlich dauert ein voller Deploy 2-4 Minuten (rsync + composer + migrate + npm build + cache). Die Default PHP/Nginx-Timeouts (30s/60s) reichen NICHT — der Request stirbt mit "Server Error" obwohl serverseitig alles weiterläuft.

**Wichtig:** Auf diesem Server existiert KEIN User `ubuntu` — nur UID 1000. Daher `chown ubuntu:www-data` schlägt fehl, stattdessen `chgrp www-data` verwenden.

**Setup-Befehle (einmalig pro neuem Server):**
```bash
# 1. VERSION + Verzeichnis für www-data schreibbar
sudo chgrp www-data /home/ubuntu/derm-api /home/ubuntu/derm-api/VERSION
sudo chmod 775 /home/ubuntu/derm-api
sudo chmod 664 /home/ubuntu/derm-api/VERSION

# 2. PHP Timeouts auf 600s
sudo sed -i 's/^max_execution_time = .*/max_execution_time = 600/' /etc/php/8.3/fpm/php.ini
sudo sed -i 's/^max_input_time = .*/max_input_time = 600/' /etc/php/8.3/fpm/php.ini
# request_terminate_timeout in /etc/php/8.3/fpm/pool.d/www.conf auf 600 setzen

# 3. Nginx fastcgi-Timeouts in location ~ \.php$ block
#    fastcgi_read_timeout 600s;
#    fastcgi_send_timeout 600s;
#    fastcgi_connect_timeout 600s;

sudo systemctl restart php8.3-fpm && sudo systemctl reload nginx
```

**Verify:** `sudo -u www-data bash -lc ': >> /home/ubuntu/derm-api/VERSION && echo OK'`
