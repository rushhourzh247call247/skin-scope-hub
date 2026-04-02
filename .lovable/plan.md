

## Navigation zwischen Spots und Übersichtsfotos fixen

### Problem
Wenn man in der Seitenleiste einen Spot anklickt, während man im "Übersicht"-Tab ist, wird zwar der Spot ausgewählt, aber der Tab wechselt nicht — man bleibt auf der Übersichtsansicht hängen. Umgekehrt: Klickt man eine Übersicht an, während man einen Spot betrachtet, fehlt der Tab-Wechsel teilweise.

### Lösung
Zwei kleine Änderungen in `src/pages/PatientDetail.tsx`:

1. **Spot-Klick in Sidebar (Zeile ~630)**: Zusätzlich `setActiveTab("spots")` aufrufen, damit der Hauptbereich automatisch zur Spot-Ansicht wechselt.

2. **Übersichtsfoto-Klick in Sidebar (Zeile ~569)**: Zusätzlich `setSelectedLocationId(null)` aufrufen, damit kein Spot mehr "aktiv" markiert ist und der Übersichts-Tab korrekt angezeigt wird.

### Änderungen

| Datei | Was | Risiko |
|---|---|---|
| `src/pages/PatientDetail.tsx` | Spot-Klick: `setActiveTab("spots")` hinzufügen | Minimal |
| `src/pages/PatientDetail.tsx` | Übersicht-Klick: `setSelectedLocationId(null)` hinzufügen | Minimal |

### Ergebnis
Man kann sich frei innerhalb eines Patienten bewegen — Spot anklicken → Spot-Ansicht, Übersicht anklicken → Übersichts-Ansicht. Kein Verlassen des Patienten mehr nötig.

