
Ziel: Login wieder stabil machen (insb. Admin), nachdem `routes/api.php` mehrfach per `sed` verändert wurde.

1) Sofortdiagnose auf dem Server (ohne weitere Änderungen)
- Prüfen, ob `api.php` syntaktisch sauber ist:
  - `php -l ~/derm-api/routes/api.php`
- Prüfen, ob die Login-Route korrekt registriert ist:
  - `cd ~/derm-api && php artisan route:list | grep -E "POST.*api/login|login"`
- Reale API-Antwort prüfen (Status/Body statt Frontend-Fehlermeldung):
  - `curl -i -X POST https://api.derm247.ch/api/login -H "Content-Type: application/json" -d '{"email":"ADMIN_MAIL","password":"ADMIN_PASS"}'`

2) Fehlerursache exakt eingrenzen (parallel beim Login-Versuch)
- Laravel-Log live beobachten:
  - `tail -f ~/derm-api/storage/logs/laravel.log`
- Dann Login erneut ausführen und prüfen:
  - 401 => Credentials/Account-Status
  - 422 => Request-Validierung
  -