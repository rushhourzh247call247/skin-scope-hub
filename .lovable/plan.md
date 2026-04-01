

# Anatomie-Zonen kalibrieren

## Problem
Die Schwellenwerte in `anatomyLookup.ts` stimmen nicht exakt mit der Geometrie des 3D-Modells überein. Beispiel aus den Screenshots: Marker auf der Brust zeigt "Bauch" an.

## Lösung

### Schritt 1: Debug-Logging hinzufügen
In `PatientDetail.tsx` temporär die 3D-Koordinaten in die Konsole loggen (`console.log` bei `handleMapClick` und `handlePreviewMove`), damit die tatsächlichen y3d-Werte für jede Körperstelle sichtbar werden.

### Schritt 2: Schwellenwerte anpassen
Basierend auf den Screenshots scheinen die Zonen nach unten verschoben zu sein (Brust wird als Bauch erkannt). Vorgeschlagene Anpassungen in `anatomyLookup.ts`:

| Zone | Aktuell (y3d ≥) | Neu (y3d ≥) |
|------|-----------------|-------------|
| Brust | 0.95 | 0.75 |
| Bauch | 0.45 | 0.30 |
| Unterbauch | 0.05 | -0.05 |
| Hüfte | -0.25 | -0.30 |
| Oberschenkel | -0.75 | -0.80 |
| Oberschenkel distal | -1.05 | -1.10 |

### Dateien

| Datei | Änderung |
|-------|----------|
| `src/lib/anatomyLookup.ts` | Schwellenwerte nach unten korrigieren |
| `src/pages/PatientDetail.tsx` | Temporäres `console.log(x3d, y3d, z3d, view)` in handleMapClick für weitere Kalibrierung |

Nach dem Deploy können die Werte anhand der Konsolen-Ausgabe weiter feinjustiert werden.

