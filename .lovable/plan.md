

## KI-Ausrichtung auch für Übersichtsfotos + Fixes

### Was wird gemacht
1. **KI-Ausrichtung für Übersichtsfotos** – Den gleichen "KI Ausrichtung"-Button auch in der OverviewPhoto-Komponente einbauen
2. **Reset-Button Fix** – Der Reset-Button in den manuellen Kontrollen soll nur auf 0 zurücksetzen (nicht die KI starten)

### Änderungen

| Datei | Änderung | Risiko |
|---|---|---|
| `src/components/OverviewPhoto.tsx` | KI-Ausrichtung Button + `alignImages` Import hinzufügen | Minimal |
| `src/components/ImageCompare.tsx` | Reset-Button: eigene Funktion `handleReset` statt `handleAutoAlign` | Minimal |

### Details

**OverviewPhoto.tsx:**
- `alignImages` und `Loader2`/`Wand2` importieren
- State `isAutoAligning` hinzufügen
- `handleAutoAlign` async Funktion (identisch wie in ImageCompare)
- Button im Overlay-Bereich einfügen (neben den bestehenden manuellen Kontrollen)

**ImageCompare.tsx:**
- Neue Funktion `handleReset` die nur Werte auf 0 setzt
- Reset-Button (Zeile 409) auf `handleReset` umstellen
- KI-Button bleibt wie er ist

