

## Plan: Admin-Funktion "2FA zurücksetzen" in Benutzerverwaltung

### Problem
Wenn ein Benutzer seinen Authenticator verliert, kann er sich nicht mehr einloggen. Passwort zurücksetzen allein hilft nicht, da 2FA weiterhin aktiv bleibt.

### Lösung
Ein neuer Button "2FA zurücksetzen" pro Benutzer in der Admin-Benutzerverwaltung, der die 2FA serverseitig deaktiviert.

### Änderungen

**1. Backend-API-Endpunkt hinzufügen (auf dem Server)**
- Neuer Endpunkt `POST /api/admin/users/{id}/reset-2fa` in `routes/api.php`
- Setzt `two_factor_secret` und `two_factor_enabled` auf `null`/`false` für den Benutzer
- Nur für Admins zugänglich (auth:sanctum Middleware)

**2. Frontend: `src/lib/api.ts`**
- Neue Methode `adminReset2FA(userId: number)` hinzufügen die den neuen Endpunkt aufruft

**3. Frontend: `src/pages/UserManagement.tsx`**
- Neuer Button mit Shield-Icon neben dem Passwort-Reset-Button in jeder Tabellenzeile
- Nur sichtbar wenn `u.two_factor_enabled === true`
- Bestätigungsdialog vor dem Zurücksetzen ("2FA für {Name} deaktivieren?")
- Nach Erfolg: Toast-Meldung und Tabelle neu laden

### UI-Verhalten
- Der Button erscheint als kleines Shield-Off-Icon in der Aktionsspalte
- Ein AlertDialog fragt zur Bestätigung ("2FA wird deaktiviert. Der Benutzer kann sich dann ohne Code anmelden und 2FA neu einrichten.")
- Nach Erfolg: grüner Toast "2FA für {Name} wurde zurückgesetzt"

### Technische Details
- API-Methode: `adminReset2FA: (userId: number) => request('/admin/users/' + userId + '/reset-2fa', { method: 'POST' })`
- useMutation mit queryClient.invalidateQueries für die Benutzerliste
- ShieldOff-Icon aus lucide-react (bereits importiert in Settings)

