

# Bezeichnung beim Verschieben aktualisieren

## Problem
Beim Ziehen des Markers auf eine neue Körperstelle bleibt die Bezeichnung unverändert — sie wird nur beim initialen Klick gesetzt.

## Lösung
In `handlePreviewMove` (Zeile 259–278 in `PatientDetail.tsx`) wird bereits die neue 3D-Position empfangen. Dort muss zusätzlich `setLocationName(getAnatomicalName(...))` aufgerufen werden, damit sich die Bezeichnung beim Verschieben automatisch aktualisiert.

## Änderung

| Datei | Änderung |
|-------|----------|
| `src/pages/PatientDetail.tsx` | In `handlePreviewMove` nach Zeile 277: `setLocationName(getAnatomicalName(point3d[0], point3d[1], point3d[2], view))` hinzufügen |

Eine einzige Zeile Code — die `getAnatomicalName`-Funktion ist bereits importiert und verfügbar.

