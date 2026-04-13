

# Marketing-Video Derm247 — Finaler Szenenplan

## Bestätigungen

**Datenschutz** — Ja, wird prominent gezeigt:
- Schweizer Hosting (Standort Schweiz)
- Verschlüsselte Datenübertragung
- Keine Drittanbieter, keine Cloud-Dienste ausserhalb der Schweiz
- Bilder nur mit Auth-Token abrufbar
- Automatische Session-Abmeldung

**Preismodelle** — Ja, ohne konkrete Preise:
- "Flexible Lizenzmodelle — pro Praxis oder pro Benutzer"
- Hinweis auf Testzugang

## Meine Ergänzungen (basierend auf dem Tool)

1. **Papierkorb / Soft-Delete** — kurz zeigen dass gelöschte Daten wiederherstellbar sind, kein versehentlicher Datenverlust
2. **Firmen-/Mandantenverwaltung** — mehrere Praxen/Firmen unter einem System, jede isoliert
3. **Rollen-System** — Admin, Arzt, Benutzer — wer was sehen darf
4. **Responsive Mobile-Ansicht** — kurzer Frame der zeigt dass es auch auf Tablet/Handy funktioniert
5. **Automatische Backups** — tägliche Sicherung, Daten gehen nie verloren
6. **Bild-Authentifizierung** — Bilder sind nicht öffentlich zugänglich, nur mit gültigem Token
7. **Verlaufs-Tracking** — Risikoprogression über Zeit (RiskProgression-Komponente)
8. **Übersichtsfoto mit Zonen** — Ganzkörper-Übersicht mit automatischen Markierungen

## Aktualisierter Szenenplan (~55 Sekunden)

| # | Szene | Dauer | Inhalt | Maus-Aktion |
|---|-------|-------|--------|-------------|
| 1 | Intro | 3s | Logo, "Digitale Hautkrebsvorsorge" | — |
| 2 | Login | 4s | Login mit verpixelten Daten, 5 Sprach-Flaggen zeigen | Klick auf Felder, Login |
| 3 | Dashboard | 4s | Statistiken, Patientenliste, Risiko-Übersicht | Maus über Karten |
| 4 | Patient erstellen | 4s | Formular mit Dummy-Daten ausfüllen | Felder ausfüllen, Speichern |
| 5 | Patientendetail | 4s | Tabs: Akte, Spots, Zonen, Befunde | Tab-Wechsel |
| 6 | 3D-Körperkarte | 4s | Marker setzen, auto Körperstellen-Benennung | Klick auf Körperstelle |
| 7 | QR-Upload | 4s | QR-Dialog, Text: "Bilder landen sicher beim richtigen Patienten" | QR-Button klicken |
| 8 | Bildvergleich | 4s | Side-by-Side, Overlay, KI-Ausrichtung (OpenCV) | Slider ziehen |
| 9 | ABCDE | 3s | Bewertung mit Risiko-Score, Farbcodierung | Werte einstellen |
| 10 | Risiko-Verlauf | 2s | Progression über Zeit | Hover |
| 11 | Klassifikation & Befunde | 3s | Dokumentation schreiben | Text eingeben |
| 12 | Zonen | 3s | Übersichtsfoto mit Pins, Leader-Lines | Hover über Pins |
| 13 | PDF-Export | 3s | Export-Dialog, PDF-Vorschau | Klick Export |
| 14 | Datenschutz | 3s | Text-Overlay: Schweizer Hosting, Verschlüsselung, keine Drittanbieter, Auth-geschützte Bilder, Auto-Logout | — |
| 15 | Preismodelle | 2s | "Flexible Lizenzmodelle — pro Praxis oder pro Benutzer", Testzugang | — |
| 16 | Firmen & Rollen | 2s | Multi-Mandant, Rollensystem (Admin/Arzt/User) | — |
| 17 | Support | 2s | Ticket/Chat-System | — |
| 18 | Outro | 3s | Logo, derm247.ch, "Hosting in der Schweiz", Kontakt | — |

## Technischer Ablauf

1. **Screenshots sammeln**: Browser öffnen, mit `test@test.ch / welcome` einloggen, durch alle 18 Szenen navigieren, je einen Screenshot erfassen. Dabei einen echten Patienten anlegen mit Dummy-Daten.
2. **Realistische Muttermal-Bilder**: Klinisch aussehende Hautläsionen als vollformatige Aufnahmen (keine abgeschnittenen Ränder).
3. **Remotion-Projekt**: Aufsetzen unter `remotion/`, jede Szene als eigene Komponente.
4. **Animierter Maus-Cursor**: SVG-Cursor mit realistischer Kurven-Bewegung und Klick-Ripple-Effekt.
5. **Stil**: Tech Product / Clean Medical — dunkler Hintergrund, Teal-Akzente passend zum Derm247-Branding, MacOS-Fensterrahmen.
6. **Text-Overlays**: Deutsche Feature-Beschreibungen pro Szene.
7. **Blur-Masken**: Login-Daten und Patientennamen verpixelt.
8. **Render**: 1920x1080, 30fps, H.264 → `/mnt/documents/derm247-tour.mp4`
9. **QA**: Frame-Spot-Checks an kritischen Stellen, jede Szene auf Vollständigkeit prüfen.

