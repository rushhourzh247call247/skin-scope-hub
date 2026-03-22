

# DERM247 Marketing-Video — 60s, Deutsch, Marktreif

## Kreative Richtung

**Stil:** Medical-Tech Premium — sauber, vertrauenswürdig, Schweizer Qualitat
**Stimmung:** "Ihr Werkzeug fur die Zukunft der Dermatologie"
**Emotionaler Bogen:** Neugier → Staunen → Vertrauen → Handlungsimpuls

### Farbpalette
- Primary: `#1a9e8f` (DERM247 Teal)
- Dark BG: `#0f1a24` (Tiefes Dunkelblau)
- Light: `#f0f5f4` (Helles Mint-Grau)
- Akzent Rot: `#ef4444` / Gelb: `#eab308` / Grun: `#22c55e` (Risiko-Ampel)
- Weiss: `#ffffff`

### Fonts
- **Space Grotesk** (Headlines, Logo) via `@remotion/google-fonts`
- **Inter** (Body/Beschreibungen) via `@remotion/google-fonts`

### Motion System
- **Eintritt:** Spring slide-up + fade (damping: 20, stiffness: 200)
- **Austritt:** Fade-out + leichter scale-down
- **Ubergange:** `wipe` und `slide` aus `@remotion/transitions`
- **Akzent-Motion:** Grosserer spring-overshoot fur Hero-Elemente

### Visuelle Motive
- Teal-Gradient-Streifen als wiederkehrendes Branding-Element
- Abgerundete UI-Card-Mockups (wie echte App-Screens)
- Schweizer Kreuz als Trust-Symbol
- Subtiles Grid-Pattern im Hintergrund

## Bilder

Ich generiere per AI passende dermatologische Bilder (Muttermale/Navi auf Haut) — keine echten Patientendaten oder DB-Bilder. Diese werden als medizinisch-professionelle Illustrationen verwendet.

## Szenenplan (~60 Sekunden, 1800 Frames @ 30fps)

| # | Szene | Dauer | Inhalt |
|---|-------|-------|--------|
| 1 | **Intro** | 4s | DERM247-Logo reveal + Tagline: "Hautveranderungen. Sicher dokumentiert. In der Schweiz." + Schweizer Flagge |
| 2 | **Das Problem** | 5s | "Papierakten. Unubersichtliche Fotos. Keine Verlaufskontrolle." → Durchgestrichen → "Es geht besser." |
| 3 | **Patient anlegen** | 6s | Animiertes Formular-Mockup: Name, Geburtsdatum, Geschlecht → "In Sekunden erfasst" |
| 4 | **Spots auf 3D-Korper** | 7s | 3D-Korper-Silhouette mit animierten Markern, Klassifikation-Labels (Navus, BCC, Melanom-Verdacht) |
| 5 | **QR-Code Foto-Upload** | 6s | QR-Code erscheint → Handy-Mockup scannt → Foto wird automatisch zugeordnet. "Kein Login. Kein Aufwand." |
| 6 | **ABCDE & Risiko** | 6s | ABCDE-Kriterien einzeln eingeblendet → Risiko-Score animiert (Grun→Gelb→Rot) |
| 7 | **Bildvergleich & Overlay** | 6s | Zwei Muttermal-Bilder nebeneinander → Overlay-Slider → Veranderung sichtbar |
| 8 | **Verlauf & PDF** | 5s | Timeline-Chart mit Risiko-Progression → PDF-Export animiert → "Fur Uberweisungen & Dokumentation" |
| 9 | **Sicherheit & Preise** | 7s | Schweizer Server, 2FA, Mandantenfahig → "Flexible Preismodelle: Pro Praxis, Pro Benutzer oder als Komplettlosung" |
| 10 | **Outro** | 5s | Logo gross + "derm247.ch" + "Die Zukunft der dermatologischen Dokumentation" |

## Technische Umsetzung

1. **Projekt-Setup:** `/tmp/derm-video/`, Remotion + Dependencies installieren
2. **AI-Bilder generieren:** 3-4 professionelle Muttermal-Nahaufnahmen via Nano banana (fur Szenen 6 & 7)
3. **10 Szenen-Komponenten** unter `src/scenes/`
4. **Persistenter Hintergrund** mit Teal-Gradient und Grid
5. **TransitionSeries** mit wipe/slide-Ubergangen
6. **Render** via `scripts/render.mjs` → `/mnt/documents/derm247-promo.mp4`

## Sprache
Komplett Deutsch, klar und direkt, fur Dermatologen geschrieben. Keine technischen Fachbegriffe zur Software — Fokus auf Nutzen und Workflow.

