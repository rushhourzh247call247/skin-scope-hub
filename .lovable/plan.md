

# Backend-Befehle für Overview Pins

Hier sind die Befehle, die du auf dem Server (SSH) ausführen musst — in dieser Reihenfolge:

---

## Schritt 1: Backup

```bash
cp ~/api/database/database.sqlite ~/backups/database_$(date +%Y%m%d_%H%M%S).sqlite
```

---

## Schritt 2: Migration erstellen

```bash
cd ~/api
php artisan make:migration create_overview_pins_table
```

Dann die erstellte Datei unter `database/migrations/xxxx_create_overview_pins_table.php` bearbeiten:

```php
public function up(): void
{
    Schema::create('overview_pins', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('overview_location_id');
        $table->unsignedBigInteger('linked_location_id');
        $table->float('x_pct');
        $table->float('y_pct');
        $table->string('label')->nullable();
        $table->timestamps();

        $table->foreign('overview_location_id')->references('id')->on('locations')->onDelete('cascade');
        $table->foreign('linked_location_id')->references('id')->on('locations')->onDelete('cascade');
    });
}
```

---

## Schritt 3: Migration ausführen

```bash
php artisan migrate
```

(Kein `migrate:fresh` — nur die neue Tabelle wird angelegt.)

---

## Schritt 4: API-Routen in `routes/api.php`

Folgende Routen am Ende der `Route::middleware('auth:sanctum')` Gruppe hinzufügen:

```php
// Overview Pins
Route::get('/locations/{locationId}/overview-pins', function ($locationId) {
    $cid = auth()->user()->company_id;
    $isAdmin = auth()->user()->role === 'admin';

    $location = DB::table('locations')
        ->join('patients', 'locations.patient_id', '=', 'patients.id')
        ->where('locations.id', $locationId)
        ->when(!$isAdmin, fn($q) => $q->where('patients.company_id', $cid))
        ->select('locations.id')
        ->first();

    if (!$location) return response()->json([], 404);

    return DB::table('overview_pins')
        ->where('overview_location_id', $locationId)
        ->get();
});

Route::post('/locations/{locationId}/overview-pins', function (Request $request, $locationId) {
    $cid = auth()->user()->company_id;
    $isAdmin = auth()->user()->role === 'admin';

    $location = DB::table('locations')
        ->join('patients', 'locations.patient_id', '=', 'patients.id')
        ->where('locations.id', $locationId)
        ->when(!$isAdmin, fn($q) => $q->where('patients.company_id', $cid))
        ->select('locations.id')
        ->first();

    if (!$location) return response()->json(['error' => 'Not found'], 404);

    $id = DB::table('overview_pins')->insertGetId([
        'overview_location_id' => $locationId,
        'linked_location_id' => $request->input('linked_location_id'),
        'x_pct' => $request->input('x_pct'),
        'y_pct' => $request->input('y_pct'),
        'label' => $request->input('label'),
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    return DB::table('overview_pins')->where('id', $id)->first();
});

Route::put('/overview-pins/{pinId}', function (Request $request, $pinId) {
    $cid = auth()->user()->company_id;
    $isAdmin = auth()->user()->role === 'admin';

    $pin = DB::table('overview_pins')
        ->join('locations', 'overview_pins.overview_location_id', '=', 'locations.id')
        ->join('patients', 'locations.patient_id', '=', 'patients.id')
        ->where('overview_pins.id', $pinId)
        ->when(!$isAdmin, fn($q) => $q->where('patients.company_id', $cid))
        ->select('overview_pins.id')
        ->first();

    if (!$pin) return response()->json(['error' => 'Not found'], 404);

    DB::table('overview_pins')->where('id', $pinId)->update([
        'x_pct' => $request->input('x_pct'),
        'y_pct' => $request->input('y_pct'),
        'label' => $request->input('label'),
        'updated_at' => now(),
    ]);

    return DB::table('overview_pins')->where('id', $pinId)->first();
});

Route::delete('/overview-pins/{pinId}', function ($pinId) {
    $cid = auth()->user()->company_id;
    $isAdmin = auth()->user()->role === 'admin';

    $pin = DB::table('overview_pins')
        ->join('locations', 'overview_pins.overview_location_id', '=', 'locations.id')
        ->join('patients', 'locations.patient_id', '=', 'patients.id')
        ->where('overview_pins.id', $pinId)
        ->when(!$isAdmin, fn($q) => $q->where('patients.company_id', $cid))
        ->select('overview_pins.id')
        ->first();

    if (!$pin) return response()->json(['error' => 'Not found'], 404);

    DB::table('overview_pins')->where('id', $pinId)->delete();

    return response()->json(['success' => true]);
});
```

---

## Schritt 5: Überprüfen

```bash
php artisan route:list | grep overview
```

Sollte 4 Routen zeigen (GET, POST, PUT, DELETE).

---

## Zusammenfassung der Befehle (Kurzform)

```bash
# 1. Backup
cp ~/api/database/database.sqlite ~/backups/database_$(date +%Y%m%d_%H%M%S).sqlite

# 2. Migration erstellen & bearbeiten
cd ~/api
php artisan make:migration create_overview_pins_table
# → Datei bearbeiten (Schema oben)

# 3. Migrieren
php artisan migrate

# 4. Routen in routes/api.php einfügen (Code oben)

# 5. Prüfen
php artisan route:list | grep overview
```

