

# 3D Body Map mit React Three Fiber

## Übersicht
Ersetze die aktuelle 2D SVG Body Map durch ein interaktives 3D-Modell im DermEngine-Stil. Der Patient kann von allen Seiten betrachtet werden (drehen, zoomen), Spots werden direkt auf der 3D-Oberfläche platziert.

## Technischer Ansatz

**Bibliotheken** (React 18 kompatibel):
- `@react-three/fiber@^8.18` — React-Renderer für Three.js
- `three@^0.160` — 3D-Engine
- `@react-three/drei@^9.122.0` — Helpers (OrbitControls, Html-Overlays, Environment Lighting)

**3D-Modell:**
- Verwende ein parametrisches menschliches Körpermodell (programmatisch aus Three.js Geometrien aufgebaut — Capsule/Sphere/Cylinder Primitives für Kopf, Torso, Arme, Beine)
- Alternativ: Ein freies GLTF Human-Mesh einbetten (z.B. von Mixamo/Sketchfab CC0)
- Hautfarbene PBR-Materialien mit Subsurface-Look

**Interaktion:**
- OrbitControls für Drehen/Zoomen mit Touch-Support
- Raycasting bei Klick → berechne UV/3D-Koordinaten → speichere als Spot
- Spots als kleine leuchtende Spheres auf der Körperoberfläche mit Html-Label Overlays
- Region-Buttons (Kopf, Torso, Arme, Beine) animieren die Kamera zu vordefinierten Positionen

**Komponenten-Architektur:**
1. `src/components/BodyMap3D.tsx` — Neue 3D-Komponente mit Canvas, Modell, Markers, Controls
2. `src/components/BodyMapSvg.tsx` — Bleibt als Fallback erhalten
3. `src/pages/PatientDetail.tsx` — Switche auf BodyMap3D in der linken Sidebar

## Umsetzungsschritte

1. **Dependencies installieren**: `three`, `@react-three/fiber@^8.18`, `@react-three/drei@^9.122.0`
2. **BodyMap3D Komponente erstellen**: Canvas mit programmatischem Körpermodell aus Primitives (Capsules, Spheres), hautfarbenes Material, Studio-Beleuchtung
3. **OrbitControls & Kamera-Presets**: Drehen/Zoomen + Region-Buttons die Kamera zu Kopf/Torso/Armen/Beinen animieren
4. **Raycasting für Spot-Platzierung**: Klick auf Körper → 3D-Position → neuer Spot mit Marker-Sphere
5. **Marker-Rendering**: Bestehende Spots als leuchtende Kugeln mit pulsierender Animation + Html-Labels
6. **Integration in PatientDetail**: SVG-Map durch 3D-Canvas ersetzen, gleiche Props/Callbacks beibehalten
7. **Bottom-Bar**: "Add Mole", "Add Hair", "Add General" Buttons wie im DermEngine-Screenshot

## Einschränkungen
- Programmatisches Modell aus Primitives sieht gut aus, ist aber nicht so detailliert wie ein gescanntes 3D-Mesh
- Für ein fotorealistisches Modell bräuchte man eine externe GLTF-Datei (~2-5MB)
- UV-Mapping für exakte Spot-Positionen funktioniert am besten mit einem echten Mesh-Modell

