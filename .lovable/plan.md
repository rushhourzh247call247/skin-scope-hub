

# Löschschutz für Admin-User und TechAssist-Firma

## Übersicht

Frontend-Schutz in zwei Dateien: Der Lösch-Button wird für den geschützten Admin-User (`info@techassist.ch`) und die Firma "TechAssist" ausgeblendet/deaktiviert. Zusätzlich ein Badge "Geschützt" zur visuellen Kennzeichnung.

**Backend-Schutz** muss separat auf dem Server in `routes/api.php` eingebaut werden — ich gebe dir den genauen Code dafür.

## Änderungen

### 1. `CompanyManagement.tsx`
- `useAuth()` importieren um den eingeloggten User zu kennen
- Für Firmen mit dem Namen "TechAssist": Lösch-Button durch ein "Geschützt"-Badge ersetzen
- Alternativ/zusätzlich: Admin's eigene `company_id` schützen

### 2. `UserManagement.tsx`
- `useAuth()` importieren
- Für den User mit E-Mail `info@techassist.ch`: Lösch-Button ausblenden, "Geschützt"-Badge anzeigen
- Passwort-Reset und 2FA-Reset bleiben weiterhin möglich

### 3. Backend-Anleitung (Server)
Du musst in `/home/ubuntu/derm-api/routes/api.php` folgende Schutzmechanismen hinzufügen:

**Companies DELETE Route:**
```php
// Schutz: TechAssist-Firma nicht löschbar
$company = DB::table('companies')->where('id', $id)->first();
if ($company && strtolower($company->name) === 'techassist') {
    return response()->json(['message' => 'Diese Firma ist geschützt'], 422);
}
```

**Users DELETE Route:**
```php
// Schutz: Admin info@techassist.ch nicht löschbar
$targetUser = DB::table('users')->where('id', $id)->first();
if ($targetUser && $targetUser->email === 'info@techassist.ch') {
    return response()->json(['message' => 'Dieser Benutzer ist geschützt'], 422);
}
```

### Zusammenfassung
- **Frontend**: Lösch-Buttons versteckt für geschützte Einträge + "Geschützt"-Badge
- **Backend**: DELETE-Routen blockieren Löschung von TechAssist-Firma und info@techassist.ch User
- Admins sehen weiterhin alle Firmen, Benutzer und Patienten (das ist ein Backend-Thema — die API muss alle zurückgeben)

