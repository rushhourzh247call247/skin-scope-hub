# Desktop 3-Spalten-Layout (DermEngine-Style)

## Ziel

Auf Desktop (`lg`, ≥1024px) soll der gesamte Patient-Akten-Workflow ohne Scrollen sichtbar sein – Body, Spot-Liste, Zonen-Übersicht und Spot-Nahaufnahme nebeneinander. Mobile bleibt **vollständig unverändert** (Bottom-Nav + Tabs).

## Layout

```text
┌─────────────────┬──────────────────────┬──────────────────────┐
│ LINKS  (~28%)   │ MITTE  (~36%)        │ RECHTS (~36%)        │
│                 │                      │                      │
│ ┌─────────────┐ │ ┌──────────────────┐ │ ┌────────┬────────┐ │
│ │ 3D Body Map │ │ │                  │ │ │ Vorher │ Aktuell│ │
│ │  (~45% h)   │ │ │  Zonen-Foto mit  │ │ │        │        │ │
│ └─────────────┘ │ │  Pin auf Spot    │ │ └────────┴────────┘ │
│ ┌─────────────┐ │ │                  │ │ ┌──────────────────┐ │
│ │ Spot-Liste  │ │ │  (OverviewPhoto) │ │ │ Mini-Timeline    │ │
│ │ (scrollbar) │ │ │                  │ │ │ aller Fotos      │ │
│ │             │ │ └──────────────────┘ │ └──────────────────┘ │
│ └─────────────┘ │                      │                      │
└─────────────────┴──────────────────────┴──────────────────────┘
```

- **Höhe:** Container `lg:h-[calc(100vh-Header)]`, `lg:overflow-hidden`. Innerhalb scrollen nur die Spot-Liste und die Foto-Timeline.
- **Kein Spot ausgewählt:** Mitte + Rechts zeigen einen Platzhalter („Spot links auswählen, um Übersicht und Nahaufnahme anzuzeigen").

## Mittlere Spalte – Zonen-Übersicht

- Verwendet die bestehende `OverviewPhoto`-Komponente.
- Zone wird automatisch ermittelt: erste `overview`-Location, deren Pins (`overview_pins`) den ausgewählten Spot enthalten – fallback: nächstgelegene Zone per 3D-Distanz.
- Roter Marker auf x_pct/y_pct des Spots in der Zone; Klick auf Marker öffnet Spot-Lightbox (wie heute).
- Falls keine Zone existiert: kleiner CTA „Übersichtsfoto erstellen" (öffnet `ZoneCreatorDialog`).

## Rechte Spalte – Spot-Nahaufnahme

- **Oben:** zwei Bilder nebeneinander – ältestes vs. neuestes Foto des Spots (Logik aus `QuickProgressCompare` wiederverwenden), mit Datums-Labels.
- **Darunter:** horizontale Mini-Timeline aller Spot-Fotos (Thumbnails). Klick → Lightbox.
- **Aktionen:** kleine Buttons „+ Foto", „Vergleich öffnen", „Befund anlegen" (öffnet bestehende Dialoge).
- Falls Spot nur ein Foto hat: nur dieses Foto gross + Hinweis „Noch kein Vergleichsbild".

## Mobile

- Komplett unverändert. Aktuelle Tab-Navigation (Body / Spots / Fotos / Berichte) + Bottom-Nav bleiben.
- Trennung sauber via `hidden lg:flex` für die neue Desktop-View und `lg:hidden` für die bestehende Mobile-Struktur.

## Technische Umsetzung

1. Neue Komponente `src/components/patient-detail/DesktopThreeColumnView.tsx` – kapselt das 3-Spalten-Layout. Bekommt: `patient`, `locations`, `selectedLocationId`, `onSelectSpot`, Mutations-Callbacks.
2. In `PatientDetail.tsx` (ab ~Zeile 716): aktuellen Block in `<div className="lg:hidden">…</div>` (bestehender Code unverändert) und neue `<DesktopThreeColumnView className="hidden lg:flex" .../>` parallel rendern.
3. Spot-Auswahl-State (`selectedLocationId`, `selectLocation`) bleibt im Parent → beide Views teilen sich den State.
4. Zone-zu-Spot-Resolver: kleine Helper-Funktion `findZoneForSpot(spotId, overviewLocations)` – nutzt `overview_pins` falls vorhanden, sonst 3D-Distanz.
5. Bilder-Auswahl für Vorher/Nachher: sortiere `spot.images` nach `created_at`, nimm erstes + letztes.
6. Alle bestehenden Dialoge (Lightbox, ZoneCreator, BatchPhoto, MapClickDialog) funktionieren unverändert – sie hängen am Parent.

## Was sich NICHT ändert

- Mobile-View, Bottom-Nav, alle Dialoge, API-Calls, Datenmodell, Body-Map-Komponente, Spot-Erstellungsworkflow, PDF-Export, Berichte-Tab.

## Akzeptanzkriterien

- Auf Desktop (≥1024px) sind Body, Spot-Liste, Zonen-Übersicht und Vorher/Nachher gleichzeitig sichtbar – kein Page-Scroll nötig.
- Klick auf einen Spot links aktualisiert Mitte + Rechts sofort.
- Mobile-View sieht 1:1 aus wie aktuell.
- Spot-Erstellung über Body-Map funktioniert weiter (Inline-Panel erscheint links unter dem Body).
