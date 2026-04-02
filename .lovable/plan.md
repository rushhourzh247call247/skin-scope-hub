

## OpenCV.js Bildausrichtung – Sicherer Implementierungsplan

### Was wird gemacht
Der "Auto Ausrichten"-Button (der aktuell nur auf Null zurücksetzt) wird mit **echter Bildanalyse** ausgestattet. OpenCV.js wird **nur bei Klick** geladen und erkennt markante Punkte in beiden Bildern, um Rotation, Zoom und Versatz automatisch zu berechnen.

**Keine Server-Änderungen nötig. Kein API-Key. Keine externen Accounts. Funktioniert offline.**

### Was sich ändert

| Datei | Änderung | Risiko |
|---|---|---|
| `src/lib/opencvLoader.ts` | **Neu** – Lädt OpenCV.js bei Bedarf vom CDN | Keins (neue Datei) |
| `src/lib/imageAlign.ts` | **Neu** – Feature-Matching Logik | Keins (neue Datei) |
| `src/components/ImageCompare.tsx` | Button-Logik anpassen (nur `handleAutoAlign` Funktion, Zeile 84-92) | Minimal – nur eine Funktion wird geändert |

### Was NICHT angefasst wird
- Kein Server-Code
- Keine API-Änderungen
- Keine bestehende Overlay-Logik (Slider, manuelle Steuerung, Auto-Save)
- Keine anderen Komponenten

### Technischer Ablauf

1. **`src/lib/opencvLoader.ts`**: Lädt `opencv.js` per `<script>` Tag vom CDN. Wird gecacht, nur einmal geladen. Gibt ein Promise zurück das resolved wenn OpenCV bereit ist.

2. **`src/lib/imageAlign.ts`**: 
   - Lädt beide Bilder auf Canvas
   - ORB Feature Detector findet markante Punkte (Muttermale, Hautstruktur)
   - BFMatcher matched die Punkte zwischen den Bildern
   - Berechnet Homographie-Matrix → extrahiert Rotation, Scale, Offset
   - Gibt `{ rotation, scale, offset_x, offset_y }` zurück

3. **`src/components/ImageCompare.tsx`**:
   - `handleAutoAlign` wird `async`
   - Neuer State `isAutoAligning` für Spinner
   - Bei Klick: OpenCV laden → Bilder analysieren → Werte setzen
   - Bei Fehler: Toast + Reset auf 0 (wie bisher)
   - Button-Text: "KI Ausrichtung" mit Wand2-Icon (bleibt gleich)

### Sicherheit
- Zwei neue Dateien, eine minimale Änderung an bestehender Funktion
- Fallback bei Fehler: Reset auf Standardwerte (identisch wie jetzt)
- OpenCV.js ist eine etablierte Bibliothek (Millionen Nutzer)
- Alles läuft im Browser, keine Daten verlassen das Gerät

