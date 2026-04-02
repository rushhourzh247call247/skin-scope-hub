

# Übersichtsfoto mit Läsions-Markierungen

## Konzept

Die Ärztin fotografiert eine **Körperregion im Überblick** (z.B. den ganzen Rücken). Auf diesem Übersichtsfoto kann sie dann **Pins setzen**, die einzelne Muttermale/Läsionen markieren. Jeder Pin wird mit einem bestehenden Spot verknüpft — klickt man auf den Pin, springt die Ansicht zur Nahaufnahme (Dermoskopie-Bild) des jeweiligen Spots.

```text
┌─────────────────────────────────┐
│  Übersichtsfoto (Rücken)        │
│                                 │
│       📌 Spot A                 │
│                  📌 Spot B      │
│    📌 Spot C                    │
│                                 │
│  [+ Pin setzen]                 │
└─────────────────────────────────┘
         │ Klick auf Pin
         ▼
┌─────────────────────────────────┐
│  Spot A — Nahaufnahme           │
│  🔍 Dermoskopie-Bild            │
│  ABCDE-Bewertung                │
└─────────────────────────────────┘
```

## Umsetzung

### 1. Neuer Typ: `overview` als LocationType

`LocationType` wird um `"overview"` erweitert. Ein Overview-Location speichert ein Übersichtsfoto und hat **keine 3D-Koordinaten** — es erscheint nicht auf der Body Map, sondern in einem eigenen Tab.

### 2. Pin-Datenstruktur

Neue Tabelle/Datenstruktur `overview_pins`:
- `id`, `overview_location_id` (FK → Location mit type=overview)
- `x_pct`, `y_pct` — Position des Pins auf dem Foto in Prozent (0–100)
- `linked_location_id` (FK → ein bestehender Spot)
- `label` (optional, z.B. "Spot 3")

### 3. Neuer Tab "Übersicht" in der Patientendetailseite

Ein vierter Tab neben Spots / Timeline / Fotos:
- Zeigt alle Übersichtsfotos des Patienten
- Jedes Foto ist interaktiv: Pins werden als farbige Marker dargestellt
- **Pin setzen**: Klick auf das Foto → Dropdown erscheint mit Liste aller Spots → Auswahl verknüpft den Pin
- **Pin klicken**: Navigiert zum verknüpften Spot (wechselt zu Spots-Tab, selektiert den Spot, fokussiert die 3D-Kamera)

### 4. UI-Komponente `OverviewPhoto`

- Zeigt das Foto responsive an
- Pins als nummerierte, farbige Kreise (Farbe = Klassifikation des verknüpften Spots)
- Hover zeigt Tooltip mit Spot-Name + kleines Vorschaubild der Nahaufnahme
- "Bearbeiten"-Modus zum Verschieben/Löschen von Pins
- Upload-Button für neue Übersichtsfotos

### 5. Dateien die geändert/erstellt werden

| Datei | Änderung |
|-------|----------|
| `src/types/patient.ts` | `LocationType` um `"overview"` erweitern, `OverviewPin` Interface |
| `src/lib/api.ts` | CRUD-Endpunkte für Overview-Pins |
| `src/components/OverviewPhoto.tsx` | **Neu** — Interaktives Foto mit Pin-Overlay |
| `src/pages/PatientDetail.tsx` | Neuer Tab "Übersicht", Upload-Flow, Pin↔Spot-Navigation |
| Backend/Migration | Tabelle `overview_pins` anlegen |

### 6. Workflow für die Ärztin

1. Patientendetailseite → Tab "Übersicht" → "Foto hochladen"
2. Foto vom Rücken/Arm/Bein wird angezeigt
3. Klick auf eine Stelle im Foto → "Mit welchem Spot verknüpfen?" → Spot aus Liste wählen
4. Pin erscheint mit der Nummer/Farbe des Spots
5. Später: Pin antippen → springt direkt zur Nahaufnahme des Spots

