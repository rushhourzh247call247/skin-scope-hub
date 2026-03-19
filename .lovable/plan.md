

# Männliches GLB-Modell integrieren

## Übersicht
Das hochgeladene `Male_base.glb` wird als dediziertes männliches 3D-Modell eingebunden. Der Frau/Mann-Umschalter lädt dann jeweils das passende GLB-Modell, statt das weibliche Modell programmatisch zu verformen.

## Schritte

1. **GLB-Datei kopieren** — `user-uploads://Male_base.glb` → `public/models/male_body.glb`

2. **BodyMap3D.tsx anpassen:**
   - Zweite Model-URL definieren: `MALE_MODEL_URL = "/models/male_body.glb"`
   - `BodyModel` erhält je nach `gender` das passende Modell via `useGLTF`
   - `makeMale()`-Funktion komplett entfernen (nicht mehr nötig)
   - Beide Modelle mit `useGLTF.preload()` vorladen
   - Gleiche Skin-Material, Normalisierung und Center-Logik für beide Modelle

3. **Kamera-Presets prüfen** — Falls das männliche Modell andere Proportionen hat, ggf. Y-Offsets feinjustieren (vermutlich minimal, da beide auf gleiche Höhe normalisiert werden)

## Technische Details
- Beide Modelle werden auf dieselbe Höhe (2.5 units) normalisiert via `Box3`
- `useMemo` dependency auf `gender` sorgt für sauberen Wechsel
- Kein programmatisches Vertex-Morphing mehr nötig — sauberer und performanter

