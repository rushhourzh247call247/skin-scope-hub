

## Problem: 3D-Body verschwindet beim Klick auf Spots

### Ursache

Wenn ein Spot angeklickt wird, berechnet `selectedMarkerPreset` (Zeile 995-1027) die Kameraposition basierend auf den gespeicherten Normalen (`nx`, `ny`, `nz`). Zwei Szenarien verursachen das Verschwinden:

1. **Null-Normalen**: Wenn `nx=0, ny=0, nz=0` in der DB gespeichert sind (nicht `null`, sondern explizit `0`), wird die Kameraposition identisch mit dem Target. Three.js kann damit nicht umgehen und das Rendering bricht ab.

2. **NaN durch Zero-Vector normalize()**: In `SurfaceProjectedGroup` (Zeile 524) wird `new THREE.Vector3(...storedNormal).normalize()` aufgerufen. Ein `[0,0,0]` Vektor ergibt nach `normalize()` NaN-Werte, was das gesamte 3D-Rendering zerstört.

### Lösung

**Datei: `src/components/BodyMap3D.tsx`** - 3 Stellen absichern:

1. **`SurfaceProjectedGroup` (Zeile ~524)**: Vor `normalize()` prüfen ob der Normalenvektor Länge > 0 hat. Falls nicht, Fallback auf `[0, 0, 1]`.

2. **`selectedMarkerPreset` (Zeile ~1016-1018)**: Prüfen ob die resultierende Normal-Länge > 0 ist. Falls `nx=0, ny=0, nz=0`, den Fallback `zDir` verwenden statt die gespeicherten Werte.

3. **`storedNormal`-Übergabe an `SurfaceProjectedGroup` (Zeile ~879)**: Zusätzlich prüfen, dass nicht alle drei Normal-Komponenten exakt `0` sind - in dem Fall `undefined` übergeben, damit der Raycasting-Fallback greift.

### Technische Details

```text
Stelle 1 - SurfaceProjectedGroup useFrame:
  const rawNormal = new THREE.Vector3(...storedNormal);
  const normal = rawNormal.lengthSq() > 0.0001 
    ? rawNormal.normalize() 
    : new THREE.Vector3(0, 0, 1);

Stelle 2 - selectedMarkerPreset:
  const hasValidNormal = (marker.nx ?? 0) !== 0 || (marker.ny ?? 0) !== 0 || (marker.nz ?? 0) !== 0;
  const nx = hasValidNormal ? (marker.nx ?? 0) : 0;
  const ny = hasValidNormal ? (marker.ny ?? 0) : 0;  
  const nz = hasValidNormal ? (marker.nz ?? 0) : zDir;

Stelle 3 - storedNormal prop:
  Wenn nx===0 && ny===0 && nz===0 → undefined übergeben (Raycasting-Fallback)
```

