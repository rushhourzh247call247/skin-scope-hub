

## Problem

In der Sidebar sind alle Spots aufgelistet, aber Übersichtsfotos sind nur über den separaten "ÜBERSICHT"-Tab im Hauptbereich erreichbar. Für Ärzte ist das zu versteckt – sie müssen zuerst den Tab wechseln, um Übersichtsfotos zu finden. Das kostet Zeit.

## Lösung

**Übersichtsfotos direkt in der linken Sidebar anzeigen** – oberhalb der Spots-Liste, als eigener, visuell abgehobener Bereich mit Kamera-Icon und Thumbnail-Vorschau. Ein Klick navigiert sofort zum ÜBERSICHT-Tab mit dem gewählten Foto.

### Änderungen

**Datei: `src/pages/PatientDetail.tsx`**

1. **Neuer Sidebar-Bereich "ÜBERSICHTSFOTOS"** oberhalb der Spots-Liste (vor Zeile ~540):
   - Kleine Sektion mit Überschrift "ÜBERSICHTSFOTOS" + Anzahl
   - Jedes Übersichtsfoto als kompakte Karte mit Thumbnail (erstes Bild), Name, und Bildanzahl
   - Klick wechselt zum `uebersicht`-Tab und selektiert das Foto
   - Visuell abgehoben mit dezenter Hintergrundfarbe oder Border
   - Nur angezeigt wenn `overviewLocations.length > 0`

2. **Schnell-Button "+"** in der Übersichtsfotos-Sektion zum direkten Anlegen eines neuen Übersichtsfotos (gleiche Logik wie im ÜBERSICHT-Tab)

### Visuelles Konzept

```text
┌─────────────────────────┐
│ 📷 ÜBERSICHTSFOTOS    2 │
│ ┌─────────────────────┐ │
│ │ 🖼 Rücken    3 Bilder│ │
│ │ 🖼 Linker Arm 1 Bild│ │
│ └─────────────────────┘ │
│                         │
│ 📍 SPOTS             8 │
│  1  xyz                 │
│  2  hfjhf               │
│  ...                    │
└─────────────────────────┘
```

### Technische Details

- Übersichtsfotos-Thumbnails via `api.resolveImageSrc()` aus dem ersten Bild der Location
- Klick-Handler: `setActiveTab("uebersicht")` + ggf. Scroll zum gewählten Foto
- Kompakte Darstellung: max 1 Zeile pro Übersichtsfoto, mit kleinem Thumbnail (24x24px rounded)
- Kein neuer State nötig – nutzt bestehende `overviewLocations`-Variable

