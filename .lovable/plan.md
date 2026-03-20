

# Notizfeld & KI-Diagnose pro Bild

## Übersicht

Jedes Bild in der Galerie und im Vergleichsmodus erhält:
1. **Notizfeld** – Ein kleines Textfeld unter jedem Bild, um eine Notiz zu hinterlegen (gespeichert pro Bild)
2. **KI-Analyse-Button** – Ein Button der eine KI-gestützte Hautanalyse auslöst und das Ergebnis mit klarem Disclaimer anzeigt

## Was wird gebaut

### 1. Datenmodell erweitern
- `LocationImage` in `types/patient.ts` erhält ein optionales `note?: string` und `ai_analysis?: { result: string; created_at: string }` Feld
- Mock API in `mockData.ts` bekommt `updateImageNote(imageId, note)` und `analyzeImage(imageId)` Methoden
- `analyzeImage` liefert vorerst eine Mock-KI-Antwort (strukturierte ABCDE-Analyse) zurück, die später durch eine echte KI-Integration (Lovable AI Gateway) ersetzt werden kann

### 2. ImageGallery erweitern
- Unter jedem Bild-Thumbnail ein kleines Textfeld (Textarea, 1-2 Zeilen) für Notizen mit Auto-Save (debounced)
- Ein kleiner "KI"-Button (Sparkles/Wand2 Icon) neben dem Bild
- Beim Klick: Loading-State, dann Ergebnis in einem kleinen ausklappbaren Bereich unter dem Bild
- KI-Ergebnis zeigt einen orangefarbenen Badge "KI-Analyse" mit Disclaimer-Text

### 3. ImageCompare Timeline erweitern
- Gleiche Funktionalität in der Timeline-Ansicht: Notizfeld und KI-Button pro Bild-Eintrag
- Die Karte pro Bild wird etwas höher, um Platz für Notiz und KI-Ergebnis zu schaffen

### 4. KI-Disclaimer
- Jede KI-Analyse zeigt prominent: *"⚠️ KI-gestützte Einschätzung – keine ärztliche Diagnose. Dient ausschliesslich als Entscheidungshilfe."*
- Visuell abgesetzt durch orangefarbenen Rahmen/Badge

## Technische Details

**Dateien:**
- `src/types/patient.ts` – `note` und `ai_analysis` Felder auf `LocationImage`
- `src/lib/mockData.ts` – `updateImageNote()` und `analyzeImage()` Mock-Methoden
- `src/components/ImageGallery.tsx` – Notiz-Textarea + KI-Button pro Bild
- `src/components/ImageCompare.tsx` – Notiz-Textarea + KI-Button in Timeline-Einträgen
- Neuer Shared-Component `src/components/AiAnalysisResult.tsx` für die einheitliche Darstellung des KI-Ergebnisses mit Disclaimer

**Mock-KI-Antwort-Struktur:**
```text
Asymmetrie: Symmetrisch
Begrenzung: Regelmässig, scharf begrenzt
Farbe: Homogen braun
Durchmesser: < 6mm
Einschätzung: Unauffälliger Nävus – Routinekontrolle empfohlen
Risiko: Niedrig
```

**Späterer Ausbau:** Die Mock-Analyse kann durch einen echten Lovable AI Gateway Call (Edge Function mit Gemini Vision) ersetzt werden, der das Bild tatsächlich analysiert.

