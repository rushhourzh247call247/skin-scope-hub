## Ziel
Den „Add Lesion"-Platzhalter (Kamera-Icon mit „L1 / Add Lesion") aus der „Alle"-Übersicht entfernen. Ein neues Folgefoto wird ausschliesslich über den Pin bzw. einen bestehenden Spot-Eintrag aufgenommen.

## Änderung
**`src/mobile/screens/PatientHomeScreen.tsx`** – in `renderSpotRowForZone` (Zeile ~915) den Aufruf `cells.push(renderAddLesionCell(spot, pinLabel))` entfernen. Die Funktion `renderAddLesionCell` bleibt vorerst erhalten (falls später wieder gebraucht), wird aber nirgendwo mehr aufgerufen – alternativ samt Definition löschen, um Toten Code zu vermeiden.

## Auswirkungen
- In der „Alle"-Übersicht erscheint pro Pin nur noch: Zone-Crop + vorhandene Spot-Fotos (älteste/neueste).
- Hat ein Spot noch kein Foto, wird die Zeile durch leere Padding-Zellen aufgefüllt – das passiert bereits durch die bestehende `while`-Schleife.
- Folgefoto bleibt erreichbar über: Pin im Zonen-Crop antippen → Spot-Viewer → „Folgeaufnahme"-Button (Overlay-Kamera).

## Test
Lokal in der mobilen Vorschau prüfen, dass keine „Add Lesion"-Kacheln mehr erscheinen und das Grid sauber umbricht, bevor ich OK gebe.