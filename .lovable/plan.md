

## Plan: Duplikate der 2FA-Route aufräumen

### Problem
Die Route `POST /admin/users/{id}/reset-2fa` wurde 8x eingefügt (Zeilen 25, 69, 93, 106, 739, 767, 788, 1060). Nur eine wird gebraucht. Ausserdem schliessen einige davon fälschlicherweise eine `});`-Klammer, was andere Routen kaputt machen könnte.

### Lösung
Alle 7 Duplikate löschen, nur die letzte (Zeile 1060) behalten. Das ist die sauberste, da sie am Ende der Datei steht und keine andere Route unterbricht.

### Befehl (ein einziger sed-Aufruf)

Da die Blöcke jeweils 8 Zeilen + 1 leere Zeile umfassen und teilweise eine extra `});` haben, lösche ich die Zeilen gezielt:

```bash
# Backup zuerst
sudo cp ~/derm-api/routes/api.php ~/derm-api/routes/api.php.bak-$(date +%Y%m%d-%H%M%S)

# Dann die 7 Duplikate entfernen (Zeilen 23-33, 67-78, 91-101, 104-114, 737-748, 765-775, 786-796)
# WICHTIG: Von unten nach oben löschen damit Zeilennummern stabil bleiben
sudo sed -i '786,796d;765,775d;737,748d;104,114d;91,101d;67,78d;23,33d' ~/derm-api/routes/api.php

# PHP neu laden
sudo systemctl reload php8.3-fpm

# Verifizieren
grep -n 'reset-2fa' ~/derm-api/routes/api.php
```

Erwartetes Ergebnis: Nur noch **eine** Zeile mit `reset-2fa`.

### Wichtig
- Backup wird vorher erstellt
- Falls etwas schiefgeht: `sudo cp ~/derm-api/routes/api.php.bak-... ~/derm-api/routes/api.php`
- Nach dem Aufräumen nochmal `two_factor_enabled` in der Benutzerverwaltung testen

### Hinweis zu den Zeilennummern
Die exakten Bereiche müssen ggf. um 1-2 Zeilen angepasst werden. Sicherer wäre es, die Datei erst komplett anzuzeigen (`cat -n`) und die Bereiche genau zu bestätigen. Alternativ: Datei lokal öffnen und manuell die Blöcke löschen.

