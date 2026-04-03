

## Brute-Force-Schutz: Server-Backup & Implementation

### Schritt 1 — Backup erstellen

Zeitstempelbasiertes Backup der kritischen Dateien:

```bash
ssh root@83.228.246.191
TS=$(date +%Y%m%d_%H%M%S)
cp ~/derm-api/database/database.sqlite ~/backups/database_${TS}.sqlite
cp ~/derm-api/routes/api.php ~/backups/api_${TS}.php
```

### Schritt 2 — Server-Dateien prüfen

Vor der Änderung müssen wir prüfen:
- **Laravel-Version** (`php artisan --version`) — bestimmt wo der Rate Limiter registriert wird
- **Bestehende Login-Route** in `routes/api.php` — exakte Position und Logik finden
- **RouteServiceProvider oder bootstrap/app.php** — wo Custom Rate Limiter definiert werden

### Schritt 3 — Rate Limiter definieren

Je nach Laravel-Version entweder in `app/Providers/RouteServiceProvider.php` (Laravel 10) oder `bootstrap/app.php` (Laravel 11):

```php
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

RateLimiter::for('login', function ($request) {
    $key = Str::lower($request->input('email')) . '|' . $request->ip();
    return Limit::perMinute(5)->by($key)->response(function () {
        return response()->json([
            'message' => 'Zu viele Anmeldeversuche. Bitte warten Sie 2 Minuten.',
            'retry_after' => 120,
        ], 429);
    });
});
```

### Schritt 4 — Login-Route mit Throttle-Middleware versehen

In `routes/api.php` die bestehende Login-Route um `->middleware('throttle:login')` ergänzen:

```php
Route::post('/login', function (Request $request) {
    // ... bestehende Login-Logik bleibt unverändert
})->middleware('throttle:login');
```

### Schritt 5 — Frontend: 429-Fehler abfangen

**`src/pages/Login.tsx`** — im `catch`-Block den HTTP 429 erkennen und eine benutzerfreundliche Meldung anzeigen mit temporärer Button-Sperre.

**`src/lib/api.ts`** — in der `request()`-Funktion den Status 429 separat behandeln (nicht als 401 weiterleiten).

### Sicherheitskonzept

| Parameter | Wert |
|-----------|------|
| Max. Versuche | 5 pro Minute |
| Sperrzeit | 2 Minuten |
| Schlüssel | E-Mail + IP kombiniert |
| HTTP-Status | 429 Too Many Requests |
| Reset | Automatisch nach Ablauf |

### Vorgehen

Da `routes/api.php` über 1000 Zeilen hat und fehleranfällig ist, wird die Änderung dort minimal gehalten — nur `->middleware('throttle:login')` an die bestehende Route anhängen. Die Rate-Limiter-Definition kommt in eine separate, saubere Datei (Provider). So wird nichts Bestehendes kaputt gemacht.

