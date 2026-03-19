

## Plan: Filter-System + Risiko-Pulsieren + Farblegende, dann Auto-Alignment

### Teil 1: Filter-System mit Farblegende und Risiko-Pulsierung

**1. Farblegende auf der Body Map** (`BodyMap3D.tsx`)
- Neue Legende unten-rechts im Canvas-Container mit allen aktiven Klassifizierungen (farbiger Punkt + Kurzlabel)
- Nur Klassifizierungen anzeigen, die bei aktuellen Markern tatsaechlich vorkommen

**2. Filter-Buttons** (`BodyMap3D.tsx`)
- Legende ist gleichzeitig Filter: Klick auf eine Klassifizierung toggelt deren Sichtbarkeit
- Durchgestrichene/gedimmte Darstellung fuer deaktivierte Filter
- "Alle" Button zum Zuruecksetzen
- Filter-State wird als neues Prop oder interner State verwaltet

**3. Risiko-Pulsieren** (`BodyMap3D.tsx` - `SpotMarker`)
- Marker mit `melanoma_suspect` oder `scc` Klassifizierung erhalten eine staerkere Puls-Animation (groessere Amplitude, schnellere Frequenz)
- Zusaetzlicher aeusserer Glow-Ring in Rot fuer Risiko-Spots

**4. Filter in Sidebar-Liste** (`PatientDetail.tsx`)
- Sidebar-Spots-Liste respektiert den aktiven Filter
- Neuer Filter-State wird von PatientDetail verwaltet und an BodyMap3D weitergereicht

### Teil 2: Auto-Alignment fuer Overlay-Vergleich

**5. Bild-Ausrichtung im Overlay** (`ImageCompare.tsx`)
- Canvas-basierter Ansatz: Beim Overlay-Modus koennen Benutzer manuell Rotation, Zoom und Position des oberen Bildes anpassen
- Steuerelemente: Rotation-Slider (-180 bis +180 Grad), Zoom-Slider (50%-200%), Drag zum Verschieben
- CSS `transform` auf dem Overlay-Bild (rotate + scale + translate)
- Reset-Button zum Zuruecksetzen der Ausrichtung

### Technische Details

**Neue Props/State:**
- `BodyMap3D`: neues Prop `classificationFilter?: LesionClassification[]` + `onFilterChange`
- `SpotMarker`: neues Prop `isHighRisk?: boolean` fuer Puls-Logik
- `ImageCompare`: neue States `overlayRotation`, `overlayScale`, `overlayOffset`

**Filter-Logik:**
- Wenn Filter aktiv: Marker mit nicht-matchender Klassifizierung bekommen `visible = false`
- Sidebar-Liste wird analog gefiltert
- Legende zeigt Anzahl Spots pro Klassifizierung

**Dateien:**
- `src/components/BodyMap3D.tsx` - Legende, Filter, Risiko-Puls
- `src/pages/PatientDetail.tsx` - Filter-State, Sidebar-Filter
- `src/components/ImageCompare.tsx` - Manuelle Ausrichtungs-Controls

