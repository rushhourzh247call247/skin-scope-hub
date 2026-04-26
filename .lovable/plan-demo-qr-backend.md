# Backend-Plan: Demo-QR-Upload API (`/api/demo/*`)

**Ziel:** Anonymer, sicher isolierter QR-Upload-Endpunkt für die Login-Demo (`proto.derm247.ch` / `derm247.ch`). Besucher scannt QR → öffnet `/demo-upload?token=...` auf seinem Handy → wählt/macht Foto → Bild erscheint live im Demo-Body-Map auf dem Desktop.

**Sicherheits-Prinzip:** 100% isoliert von Produktivdaten. Keine `patient_id`, keine `company_id`, keine `user_id`. Eigene Tabelle, eigenes Verzeichnis, automatische Löschung.

---

## 1. Datenbank-Migration

`database/migrations/2026_04_17_000001_create_demo_uploads_table.php`

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('demo_uploads', function (Blueprint $table) {
            $table->id();
            $table->string('token', 64)->unique()->index();
            $table->string('client_ip', 45)->index();           // Rate-Limit-Key
            $table->string('file_path')->nullable();             // storage/app/demo/...
            $table->string('mime_type', 64)->nullable();
            $table->unsignedInteger('size_bytes')->nullable();
            $table->timestamp('expires_at')->index();            // Token-Ablauf (15min, falls Handy nie hochlädt)
            $table->timestamp('uploaded_at')->nullable();        // Wann Foto kam
            $table->timestamp('delete_after')->index();          // Safety-Net: Hard-Delete (15min nach Upload, falls Desktop nie abholt)
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('demo_uploads'); }
};
```

Ausführung auf Server: `cd /var/www/api.derm247.ch && php artisan migrate`

---

## 2. Controller

`app/Http/Controllers/DemoUploadController.php`

```php
<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class DemoUploadController extends Controller {

    // POST /api/demo/qr-token  →  Token + Upload-URL erstellen
    public function createToken(Request $req) {
        $ip = $req->ip();

        // Lockeres aber sicheres Limit: 20 Tokens pro IP pro Stunde
        $recent = DB::table('demo_uploads')
            ->where('client_ip', $ip)
            ->where('created_at', '>', now()->subHour())
            ->count();
        if ($recent >= 20) {
            return response()->json(['error' => 'Rate limit reached. Try again in 1h.'], 429);
        }

        $token = Str::random(48);
        DB::table('demo_uploads')->insert([
            'token'        => $token,
            'client_ip'    => $ip,
            'expires_at'   => now()->addMinutes(15),
            'delete_after' => now()->addMinutes(15), // Safety-Net falls Desktop nie abholt
            'created_at'   => now(),
            'updated_at'   => now(),
        ]);
        return response()->json([
            'token'      => $token,
            'expires_at' => now()->addMinutes(15)->toIso8601String(),
        ]);
    }

    // GET /api/demo/qr-status/{token}  →  Polling vom Desktop
    public function status(string $token) {
        $row = DB::table('demo_uploads')->where('token', $token)->first();
        if (!$row) return response()->json(['status' => 'invalid'], 404);
        if (!$row->file_path && now()->gt($row->expires_at)) {
            return response()->json(['status' => 'expired']);
        }
        if ($row->file_path) {
            return response()->json([
                'status'    => 'completed',
                'image_url' => url("/api/demo/image/{$token}"),
            ]);
        }
        return response()->json(['status' => 'waiting']);
    }

    // POST /api/demo/upload/{token}  →  Vom Handy (multipart file)
    public function upload(Request $req, string $token) {
        $row = DB::table('demo_uploads')->where('token', $token)->first();
        if (!$row)                        return response()->json(['error' => 'invalid'], 404);
        if ($row->file_path)              return response()->json(['error' => 'already used'], 409);
        if (now()->gt($row->expires_at))  return response()->json(['error' => 'expired'], 410);

        $req->validate([
            'photo' => 'required|image|mimes:jpg,jpeg,png,heic,webp|max:10240', // 10MB
        ]);

        $file = $req->file('photo');
        // EXIF entfernen: erneut speichern via GD/Imagick
        $img = \Intervention\Image\Facades\Image::make($file)->orientate();
        $filename = $token . '.jpg';
        $img->encode('jpg', 85);
        Storage::disk('local')->put("demo/{$filename}", (string) $img);

        DB::table('demo_uploads')->where('token', $token)->update([
            'file_path'   => "demo/{$filename}",
            'mime_type'   => 'image/jpeg',
            'size_bytes'  => Storage::disk('local')->size("demo/{$filename}"),
            'uploaded_at' => now(),
            'updated_at'  => now(),
        ]);
        return response()->json(['status' => 'ok']);
    }

    // GET /api/demo/image/{token}  →  Bild ausliefern + SOFORT LÖSCHEN (Single-Use)
    public function image(string $token) {
        $row = DB::table('demo_uploads')->where('token', $token)->first();
        if (!$row || !$row->file_path) abort(404);

        $absPath = storage_path('app/' . $row->file_path);
        if (!file_exists($absPath)) abort(404);

        // Bild komplett in den Speicher laden, BEVOR die Datei gelöscht wird
        $bytes = file_get_contents($absPath);
        $mime  = $row->mime_type ?? 'image/jpeg';

        // SOFORT-LÖSCHEN nach Abholung: Datei + DB-Eintrag weg
        @unlink($absPath);
        DB::table('demo_uploads')->where('token', $token)->delete();

        return response($bytes, 200, [
            'Content-Type'        => $mime,
            'Content-Length'      => strlen($bytes),
            'Cache-Control'       => 'no-store, no-cache, must-revalidate, max-age=0',
            'Pragma'              => 'no-cache',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    // GET /demo-upload?token=...  →  Mobile Upload-Seite (HTML, optional via SPA)
    // Wird vom React-Frontend behandelt, kein Backend nötig.
}
```

---

## 3. Routen

`routes/api.php` — am Ende anhängen:

```php
use App\Http\Controllers\DemoUploadController;

Route::prefix('demo')->group(function () {
    Route::post('/qr-token',          [DemoUploadController::class, 'createToken'])
        ->middleware('throttle:30,60');                   // 30 req/min/IP
    Route::get('/qr-status/{token}',  [DemoUploadController::class, 'status'])
        ->middleware('throttle:120,1');                   // 120 polls/min
    Route::post('/upload/{token}',    [DemoUploadController::class, 'upload'])
        ->middleware('throttle:10,1');                    // 10 uploads/min
    Route::get('/image/{token}',      [DemoUploadController::class, 'image']);
});
```

**Wichtig:** Diese Routen sind **außerhalb** jeglicher `auth:sanctum`-Middleware. Komplett anonym.

---

## 4. CORS

`config/cors.php` — sicherstellen dass `/api/demo/*` für die Frontend-Domains offen ist:

```php
'paths' => ['api/*', 'sanctum/csrf-cookie'],
'allowed_origins' => [
    'https://app.derm247.ch',
    'https://derm247.ch',
    'https://proto.derm247.ch',
    'https://skin-scope-hub.lovable.app',
    'https://id-preview--5a72ef26-ca28-4251-a81e-6c4979882e74.lovable.app',
],
```

---

## 5. Cron / Scheduled Cleanup

`app/Console/Kernel.php`:

```php
protected function schedule(Schedule $schedule): void {
    // ... bestehende ...
    $schedule->call(function () {
        $rows = \DB::table('demo_uploads')->where('delete_after', '<', now())->get();
        foreach ($rows as $r) {
            if ($r->file_path) \Storage::disk('local')->delete($r->file_path);
        }
        \DB::table('demo_uploads')->where('delete_after', '<', now())->delete();
    })->hourly()->name('demo-uploads-cleanup')->withoutOverlapping();
}
```

Crontab muss laufen: `* * * * * cd /var/www/api.derm247.ch && php artisan schedule:run >> /dev/null 2>&1`

---

## 6. Verzeichnis & Berechtigungen

```bash
sudo mkdir -p /var/www/api.derm247.ch/storage/app/demo
sudo chown -R www-data:www-data /var/www/api.derm247.ch/storage/app/demo
sudo chmod 775 /var/www/api.derm247.ch/storage/app/demo
```

---

## 7. Nginx (kein direkter Zugriff!)

Demo-Bilder werden **nur** über `/api/demo/image/{token}` ausgeliefert — niemals via `/storage/`. Bestehender Block in `api.derm247.ch.conf`:

```nginx
location ~ ^/storage/ {
    deny all;
    return 403;
}
```

…bleibt unverändert. Keine zusätzliche Nginx-Konfiguration nötig.

---

## 8. Manuelles Backup vor Deployment

```bash
TS=$(date +%Y%m%d_%H%M%S)
mkdir -p ~/backups/demo-api-$TS
cp /var/www/api.derm247.ch/database/database.sqlite ~/backups/demo-api-$TS/
cp -r /var/www/api.derm247.ch/app/Http/Controllers ~/backups/demo-api-$TS/
cp /var/www/api.derm247.ch/routes/api.php ~/backups/demo-api-$TS/
```

---

## 9. Test (curl, vom Server aus)

```bash
# 1. Token erstellen
TOKEN=$(curl -s -X POST https://api.derm247.ch/api/demo/qr-token | jq -r .token)
echo $TOKEN

# 2. Status (sollte "waiting" sein)
curl -s https://api.derm247.ch/api/demo/qr-status/$TOKEN

# 3. Upload (Test-Bild)
curl -X POST -F "photo=@/tmp/test.jpg" https://api.derm247.ch/api/demo/upload/$TOKEN

# 4. Status (sollte "completed" + image_url sein)
curl -s https://api.derm247.ch/api/demo/qr-status/$TOKEN
```

---

## 10. Frontend-Vertrag (was der React-Code erwartet)

| Endpoint | Method | Body / Params | Response |
|---|---|---|---|
| `/api/demo/qr-token` | POST | – | `{ token, expires_at }` |
| `/api/demo/qr-status/{token}` | GET | – | `{ status: 'waiting'\|'completed'\|'expired'\|'invalid', image_url? }` |
| `/api/demo/upload/{token}` | POST | `multipart/form-data: photo=<File>` | `{ status: 'ok' }` |
| `/api/demo/image/{token}` | GET | – | Binary JPEG |

Mobile-Upload-Seite im Frontend: `/demo-upload?token=...`

---

## Sicherheits-Zusammenfassung

✅ Keine Auth-Tokens, keine Patient-/Company-IDs in der Tabelle
✅ Eigenes Verzeichnis `storage/app/demo/` — komplett separiert
✅ Token nur 15 min gültig, Datei max. 24h
✅ EXIF-Stripping beim Upload (kein GPS)
✅ Single-Use: nach Upload kein zweiter Versuch möglich
✅ Throttling auf allen 3 Endpunkten
✅ Max. 20 Tokens/IP/h (lockerer aber missbrauchsbegrenzend)
✅ Nginx blockt direkten Storage-Zugriff weiterhin
