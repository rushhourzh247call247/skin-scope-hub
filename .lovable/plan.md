

# Admin sieht alle Daten (Backend-Fix)

## Problem
Alle Routen filtern mit `where('company_id', $cid)` — auch für Admins. Admins müssen alle Firmen, Patienten und Daten sehen.

## Lösung
An den wichtigsten Routen die `company_id`-Filterung für Admins überspringen. Das Muster:

```php
$authUser = auth()->user();
$isAdmin = $authUser->role === 'admin';
```

Dann bei Queries: `when(!$isAdmin, fn($q) => $q->where('company_id', $authUser->company_id))`

## Betroffene Routen (mit Zeilennummern)

### 1. GET /patients (Zeile 176-191)
Patienten-Liste: Admin sieht alle, User nur eigene Firma.

### 2. GET /patients/{id} (Zeile 211-218)
Einzelner Patient: Admin darf jeden öffnen.

### 3. GET /full-patient/{id} (Zeile 263-278)
Patient mit Spots/Bildern: Admin darf jeden öffnen.

### 4. GET /dashboard (Zeile 290-304)
Stats: Admin sieht Gesamt-Zahlen über alle Firmen.

### 5. GET /dashboard/risk (Zeile 306-326)
Risiko-Stats: Admin sieht alle Stellen.

### 6. GET /users + GET /companies
Bereits geprüft — müssen ebenfalls angepasst werden falls noch gefiltert.

## Befehle (Backup zuerst!)

```bash
cp /home/ubuntu/derm-api/routes/api.php /home/ubuntu/backups/api.php.backup-$(date +%Y%m%d-%H%M)
```

Dann für jede Route ein `sed`-Befehl. Beispiel für **GET /patients** (Zeile 177-178):

```bash
sed -i '177,178c\
\        $authUser = auth()->user();\
\        $isAdmin = $authUser->role === '\''admin'\'';\
\        $patients = DB::table("patients")->when(!$isAdmin, fn($q) => $q->where("company_id", $authUser->company_id))->orderBy("id", "desc")->get();' /home/ubuntu/derm-api/routes/api.php
```

Ich gebe dir nach dem Backup alle sed-Befehle nacheinander — einen pro Route, jeweils mit Verifizierung per `grep`.

## Wichtig
- Backup **vor** jeder Änderung
- Nach jeder sed-Änderung mit `grep -n -A 5` verifizieren
- Am Ende `php artisan route:clear` ausführen

