

# Anatomie-Zonen kalibrieren — neuer Ansatz

## Problem
Die Browser-Automatisierung kann nicht auf das WebGL-Canvas klicken. Die aktuellen Schwellenwerte sind geschätzt und falsch.

## Lösung: Zwei-Schritte-Ansatz

### Schritt 1: Live-Koordinaten-Overlay (temporär)
Ein schwebendes Label, das beim Hover über das 3D-Modell die aktuelle y3d-Koordinate und den erkannten Zonennamen in Echtzeit anzeigt. So kann der Benutzer sofort sehen, welche Koordinaten wo entstehen und ob die Zuordnung stimmt.

**Umsetzung**: In `BodyMap3D.tsx` ein `onPointerMove`-Event auf dem Body-Mesh, das ein `<Html>`-Overlay mit `y3d: 0.45 → Brust` anzeigt. Nur im Spot-Platzierungsmodus sichtbar.

### Schritt 2: Schwellenwerte auf anatomische Proportionen justieren
Für ein 2,5-Einheiten-Modell (y: -1,25 bis +1,25) gelten folgende Standard-Proportionen:

| Zone | Aktuell (y3d ≥) | Neu (y3d ≥) | Anatomische Begründung |
|------|-----------------|-------------|----------------------|
| Stirn/Kopf | 0.95 | 1.05 | Oberste 8% = Stirn |
| Hals/Nacken | 0.82 | 0.88 | Kinn bis Schulteransatz |
| Schulter (breit) | 0.65 | 0.70 | Schulterlinie |
| Brust / Ob. Rücken | 0.30 | 0.40 | Brustwarzen bei ~55% Höhe |
| Bauch / Mittl. Rücken | 0.00 | 0.05 | Nabel bei ~56% von unten |
| Unterbauch | -0.20 | -0.15 | Beckenkamm |
| Hüfte/Gesäß | -0.40 | -0.35 | Leistenregion |
| Oberschenkel | -0.65 | -0.55 | Oberschenkelschaft |
| Ob.schenkel distal | -0.82 | -0.75 | Oberhalb Knie |
| Knie | -0.90 | -0.85 | Kniegelenk |
| Unterschenkel | -1.10 | -1.05 | Schienbein |

Arm-Schwelle `ARM_X_THRESHOLD` bleibt bei 0.38.

### Dateien

| Datei | Änderung |
|-------|----------|
| `src/components/BodyMap3D.tsx` | Temporäres Hover-Overlay mit y3d + Zonenname im Platzierungsmodus |
| `src/lib/anatomyLookup.ts` | Schwellenwerte auf anatomische Proportionen anpassen |

### Workflow danach
1. Benutzer aktiviert Spot-Modus, fährt mit der Maus über den Körper
2. Overlay zeigt live: `y: 0.52 → Brust`
3. Falls Zonen noch falsch: Benutzer teilt die konkreten y-Werte mit, die an bestimmten Körperstellen angezeigt werden
4. Schwellenwerte werden präzise nachjustiert
5. Overlay wird am Ende entfernt

