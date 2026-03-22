
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
  - 500 => Route/Codefehler durch frühere Datei-Edits

3) Admin-Account verifizieren (häufigster Grund bei „nur Admin betroffen“)
- In DB prüfen: existiert Admin, richtige E-Mail, Rolle, 2FA-Flags:
  - `SELECT id,name,email,role,two_factor_enabled,two_factor_secret FROM users WHERE role='admin';`
- Falls nötig: Admin-Passwort auf bekannten Wert setzen (bcrypt/Hash::make), danach Login direkt testen.
- Falls 2FA inkonsistent (enabled=1 aber Secret leer/ungültig): Flags sauber zurücksetzen und neu einrichten.

4) Recovery-Fix (wenn Login sofort benötigt wird)
- Minimal-invasiv:
  - Admin-Passwort resetten
  - `two_factor_enabled=0`, `two_factor_secret=NULL` für den betroffenen Admin
- Danach End-to-End testen:
  - Login → Dashboard
  - optional 2FA neu aktivieren in Einstellungen
  - Login erneut mit 2FA prüfen

5) Nachhaltige Stabilisierung (nach erfolgreichem Recovery)
- `routes/api.php` bereinigen (nur eine Route pro Endpoint, keine Copy-Paste-Duplikate).
- Kritische Routen (login, users, reset-2fa) in Controller auslagern statt in großer `api.php`.
- Frontend-Fehlertext verbessern:
  - statt immer „Zugangsdaten falsch“ auch Statuscode-abhängige Meldungen anzeigen (401/422/500), damit Diagnosen künftig schneller gehen.

Technische Details
- Aktueller Frontend-Code zeigt bei jedem Login-Fehler denselben Text (`catch` in `src/pages/Login.tsx`), daher kann ein 500 oder 422 wie „falsches Passwort“ wirken.
- Da Fehler laut dir in Public + Preview auftritt, ist reine Preview-CORS-Ursache unwahrscheinlich.
- Da „nur Admin“ betroffen ist, ist Account-Zustand (Passwort/2FA/Datensatz) wahrscheinlicher als globaler API-Ausfall.
- Nach den manuellen `sed`-Operationen bleibt dennoch ein Syntax-/Routing-Check Pflicht, um versteckte Seiteneffekte auszuschließen.
