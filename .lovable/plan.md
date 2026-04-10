

## UX-Redesign: Patientendetail vereinfachen

### Probleme (aus dem Screenshot)

1. **Header-Tabs**: 7 kleine Icons ohne Labels auf Mobile — Ärzte erkennen nicht, was was ist
2. **Informationsüberflutung**: Body Map + Zonen + Spots + Papierkorb alle untereinander gestapelt — kein klarer Fokus
3. **Rechte Icon-Leiste** auf der 3D-Map: ~10 Icons ohne Erklärung — wirkt wie ein CAD-Programm
4. **Kein geführter Workflow**: Arzt weiß nicht, wo er anfangen soll

### Vorschlag: 3 Säulen der Vereinfachung

#### 1. Header-Tabs → Bottom-Navigation (Mobile) + klare Labels (Desktop)
- Auf Mobile: Feste Bottom-Tab-Bar mit **4 Haupttabs** + Labels: `Akte | Spots | Fotos | Berichte`
- "Zonen" und "Timeline" werden Unterseiten (Zonen → in Fotos integriert, Timeline → in Akte)
- Auf Desktop: Tabs bleiben oben, aber mit sichtbarem Text statt nur Icons

#### 2. Sidebar: Body Map + Spotliste klar trennen
- Body Map standardmäßig **eingeklappt** auf Mobile (nur Mini-Vorschau mit "Antippen zum Öffnen")
- Spotliste bekommt einen **klaren leeren Zustand** mit großem "Erste Stelle markieren"-Button
- Zonen-Liste und Spots-Liste in **eigene Tabs** innerhalb der Sidebar (nicht beide sichtbar)
- Papierkorb → hinter "⋯ Mehr"-Menü verstecken statt permanent sichtbar

#### 3. 3D-Map Toolbar vereinfachen
- Die rechte Icon-Leiste auf **3 Hauptaktionen** reduzieren: `Spot setzen | Zone setzen | Filter`
- Restliche Funktionen (Klassifikationsfilter, Download etc.) in ein Menü auslagern
- Klare Texthinweise statt nur Icons: "Tippen Sie auf den Körper um eine Stelle zu markieren"

### Technische Umsetzung

**Datei: `src/pages/PatientDetail.tsx`**
- Mobile Bottom-Navigation als fixierte Leiste am unteren Bildschirmrand (nur bei `< lg`)
- Header-Tabs auf Mobile ausblenden, auf Desktop mit Labels anzeigen
- Sidebar-Tabs: `useState<"spots"|"zonen">` für Sidebar-Inhalt unterhalb der Map
- Body Map auf Mobile: Standardmäßig `mobileMapExpanded = false`, mit Thumbnail-Vorschau
- Papierkorb: Hinter Collapsible mit weniger Prominenz

**Datei: `src/components/BodyMap3D.tsx`**
- Rechte Toolbar: Icons gruppieren, sekundäre Aktionen in Dropdown-Menü
- Tooltip-Text auf allen Buttons hinzufügen

**Dateien: `src/i18n/locales/de.json`, `en.json`**
- Neue Keys für Bottom-Nav-Labels und vereinfachte Hinweistexte

### Ergebnis
- Arzt sieht beim Öffnen: **Patientenakte** (klare Übersicht)
- Will er Spots bearbeiten: **1 Tap auf "Spots"** → Body Map + Spotliste
- Will er Fotos sehen: **1 Tap auf "Fotos"** → Galerie + Zonen
- Kein Rätselraten bei Icons, kein Scrollen durch irrelevante Bereiche

