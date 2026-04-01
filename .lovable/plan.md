

# Automatische Benennung von Körperstellen anhand der 3D-Koordinaten

## Zusammenfassung

Ja, das ist möglich -- und zwar **ohne KI/API-Call**. Das 3D-Modell liefert bereits exakte Koordinaten (`x3d`, `y3d`, `z3d`) und die Seite (`front`/`back`). Damit kann eine Lookup-Tabelle die anatomische Region zuverlässig bestimmen. Der Name wird automatisch vorausgefüllt, bleibt aber editierbar.

## Ansatz: Koordinaten-basierte Anatomie-Lookup-Tabelle

Das 3D-Modell hat eine konsistente Geometrie:
- **y-Achse** = Höhe (Kopf oben ~2.0, Füsse unten ~-1.5)
- **x-Achse** = links/rechts (-1 bis +1)
- **z-Achse** = vorne/hinten (positiv = Front)

Durch Kombination von `y3d` (Höhe), `x3d` (Seite) und `view` (front/back) lässt sich die Körperregion eindeutig bestimmen.

```text
y3d ≈ 1.8+        → Kopf / Stirn / Hinterkopf
y3d ≈ 1.4–1.8     → Hals / Nacken
y3d ≈ 0.8–1.4     → Schulter / Oberer Rücken (je nach x3d links/rechts)
y3d ≈ 0.2–0.8     → Brust / Bauch / Rücken
y3d ≈ -0.3–0.2    → Hüfte / Unterer Rücken
y3d ≈ -0.3–-1.0   → Oberschenkel (links/rechts via x3d)
y3d ≈ -1.0–-1.3   → Knie / Kniekehle
y3d < -1.3         → Unterschenkel / Fuss
|x3d| > 0.6        → Arm / Hand (je nach y3d Höhe)
```

## Umsetzung

### 1. Neue Hilfsfunktion `getAnatomicalName()`

Eine reine TypeScript-Funktion in `src/lib/anatomyLookup.ts`, die aus `x3d`, `y3d`, `z3d` und `view` einen deutschen anatomischen Namen ableitet (z.B. "Linker Unterarm", "Rechte Schulter (dorsal)", "Stirn").

### 2. Automatisches Vorausfüllen im Placement-Dialog

In `PatientDetail.tsx` wird beim `handleMapClick` die Funktion aufgerufen und `setLocationName()` mit dem Ergebnis vorbelegt. Das Input-Feld bleibt editierbar -- der User kann den Namen jederzeit überschreiben.

### 3. Kalibrierung

Die genauen y3d/x3d-Schwellenwerte müssen einmalig am tatsächlichen 3D-Modell kalibriert werden. Dazu werden die Koordinaten beim Klicken geloggt und die Zonen-Grenzen feinjustiert.

## Technische Details

- **Keine API-Calls nötig** -- rein clientseitig, sofort
- **~30 anatomische Zonen** abdeckbar (Kopf, Hals, Schultern L/R, Oberarm L/R, Unterarm L/R, Hand L/R, Brust, Bauch, Oberer Rücken, Unterer Rücken, Hüfte, Oberschenkel L/R, Knie L/R, Unterschenkel L/R, Fuss L/R, etc.)
- **Front/Back-Unterscheidung**: z.B. "Brust" vs. "Oberer Rücken", "Stirn" vs. "Hinterkopf"
- **Links/Rechts via x3d-Vorzeichen**: negative x = rechte Körperseite des Patienten (gespiegelt)
- Bestehender Workflow bleibt identisch, nur das Name-Feld ist vorausgefüllt statt leer

## Dateien

| Datei | Änderung |
|-------|----------|
| `src/lib/anatomyLookup.ts` | **Neu** -- Lookup-Funktion mit Zonen-Definitionen |
| `src/pages/PatientDetail.tsx` | `handleMapClick` ruft Lookup auf und setzt `locationName` |

