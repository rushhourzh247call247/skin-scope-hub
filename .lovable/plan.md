

# DERM247 Marketing-Video — Mit echten Website-Screenshots

## Konzept

Statt programmierter Mockups verwende ich **echte Screenshots** deiner App. Ich navigiere durch die Lovable-Preview (gleiche UI wie app.derm247.ch) und mache hochaufgelöste Screenshots von jeder wichtigen Seite. Diese werden dann im Video mit professionellen Zoom-, Pan- und Slide-Animationen präsentiert.

## Screenshot-Aufnahmen (1920×1080)

Ich navigiere durch folgende Routen und mache Screenshots:

| # | Route / Ansicht | Was zu sehen ist |
|---|----------------|------------------|
| 1 | `/login` | Login-Seite mit DERM247 Branding |
| 2 | `/` (Dashboard) | Statistiken, Risiko-Ampel, Übersicht |
| 3 | `/patients` | Patientenliste mit Suche |
| 4 | `/patients/new` | Neuen Patient anlegen (Formular) |
| 5 | `/patients/:id` | Patientendetail mit 3D Body Map |
| 6 | `/patients/:id` (Spots) | Spot-Details, Bilder, ABCDE-Bewertung |
| 7 | `/patients/:id` (Vergleich) | Bild-Overlay / Vergleichsansicht |
| 8 | `/settings` | Einstellungen / Sicherheit |

Zusätzlich generiere ich per AI 2-3 professionelle Muttermal-Nahaufnahmen für die ABCDE- und Vergleichs-Szenen.

## Szenenplan (~60 Sekunden)

| # | Szene | Dauer | Visuell | Text-Overlay |
|---|-------|-------|---------|-------------|
| 1 | **Intro** | 4s | Logo-Reveal auf dunklem Teal-Gradient | "Hautveränderungen. Sicher dokumentiert. In der Schweiz." 🇨🇭 |
| 2 | **Das Problem** | 5s | Text-Animation | "Papierakten. Verstreute Fotos. Keine Verlaufskontrolle." → "Es geht besser." |
| 3 | **Patient anlegen** | 6s | Screenshot vom Formular mit Zoom-In | "Neuer Patient — in Sekunden erfasst" |
| 4 | **3D Körperkarte** | 7s | Screenshot Body Map mit Ken-Burns Pan | "Spots direkt auf dem 3D-Körper markieren. Klassifikation inklusive." |
| 5 | **QR Foto-Upload** | 6s | Screenshot QR-Dialog + Handy-Andeutung | "QR scannen. Foto machen. Automatisch zugeordnet. Kein Login nötig." |
| 6 | **ABCDE & Risiko** | 6s | Screenshot ABCDE-Formular + Muttermale | "ABCDE-Bewertung mit Risiko-Score. Grün. Gelb. Rot." |
| 7 | **Bildvergleich** | 6s | Screenshot Overlay-Vergleich | "Vorher. Nachher. Veränderungen sofort erkennen." |
| 8 | **Verlauf & PDF** | 5s | Screenshot Dashboard + PDF-Mockup | "Verlaufsdokumentation. PDF-Export für Überweisungen." |
| 9 | **Sicherheit & Preise** | 7s | Icons + Text auf dunklem BG | "Schweizer Server. 2FA. Mandantenfähig." + "Flexible Preismodelle: Pro Praxis, Pro Benutzer oder Komplettlösung." |
| 10 | **Outro** | 5s | Logo gross + URL | "derm247.ch — Die Zukunft der dermatologischen Dokumentation" |

## Animationstechnik für Screenshots

Die Screenshots werden nicht einfach statisch gezeigt, sondern professionell animiert:

- **Ken-Burns-Effekt**: Langsamer Zoom + leichter Pan über den Screenshot — wie ein Kameraschwenk
- **Focus-Zoom**: Reinzoomen auf spezifische UI-Elemente (z.B. Risiko-Ampel, ABCDE-Formular)
- **Slide-In**: Screenshots gleiten von der Seite herein, in einem MacOS-artigen Fensterrahmen
- **Overlay-Text**: Beschreibender Text wird neben oder über dem Screenshot eingeblendet

## Technische Umsetzung

1. Screenshots via Browser-Tools aufnehmen (Lovable Preview, 1920×1080)
2. AI-Muttermal-Bilder generieren (für Szenen 6 & 7)
3. Remotion-Projekt in `/tmp/derm-video/` mit allen Screenshots als `staticFile`
4. 10 Szenen-Komponenten mit Ken-Burns-Animationen auf echten Screenshots
5. TransitionSeries mit Wipe/Slide-Übergängen
6. Render → `/mnt/documents/derm247-promo.mp4`

## Ergebnis

Ein professionelles 60-Sekunden-Video das die **echte App** zeigt — authentisch, vertrauenswürdig, und sofort verständlich für jeden Dermatologen.

