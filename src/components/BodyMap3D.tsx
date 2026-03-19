import React, { useRef, useState, useCallback, useMemo, Suspense, useEffect } from "react";
import { Canvas, useFrame, useThree, ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Html, useGLTF, Center } from "@react-three/drei";
import * as THREE from "three";
import { cn } from "@/lib/utils";
import { RotateCcw, Eye, Hand, Footprints, User, Shirt, CircleDot, ArrowDown } from "lucide-react";

/* ─── Types ─── */
interface Marker {
  id: number;
  x: number;
  y: number;
  name?: string;
  view?: "front" | "back";
}

interface BodyMap3DProps {
  markers: Marker[];
  selectedLocationId: number | null;
  onMapClick?: (x: number, y: number, view: "front" | "back") => void;
  onMarkerClick?: (id: number) => void;
}

/* ─── Camera Presets ─── */
type Region = "full" | "head" | "torso" | "left_arm" | "right_arm" | "hands" | "legs" | "knees" | "feet" | "back";

const CAMERA_PRESETS: Record<Region, { position: [number, number, number]; target: [number, number, number]; label: string; icon: React.ElementType }> = {
  full:      { position: [0, 0, 3.5],       target: [0, 0, 0],       label: "Ganzkörper",  icon: User },
  head:      { position: [0, 1.15, 0.8],    target: [0, 1.15, 0],    label: "Kopf",        icon: Eye },
  torso:     { position: [0, 0.35, 1.4],    target: [0, 0.35, 0],    label: "Torso",       icon: Shirt },
  left_arm:  { position: [-0.8, 0.4, 1.0],  target: [-0.35, 0.4, 0], label: "L. Arm",      icon: Hand },
  right_arm: { position: [0.8, 0.4, 1.0],   target: [0.35, 0.4, 0],  label: "R. Arm",      icon: Hand },
  hands:     { position: [0, -0.2, 0.8],    target: [0, -0.2, 0],    label: "Hände",       icon: CircleDot },
  legs:      { position: [0, -0.7, 1.6],    target: [0, -0.7, 0],    label: "Beine",       icon: Footprints },
  knees:     { position: [0, -0.9, 0.9],    target: [0, -0.9, 0],    label: "Knie",        icon: ArrowDown },
  feet:      { position: [0, -1.35, 0.7],   target: [0, -1.35, 0],   label: "Füße",        icon: Footprints },
  back:      { position: [0, 0, -3.5],      target: [0, 0, 0],       label: "Rücken",      icon: User },
};

const MODEL_URL = "/models/body.glb";

/* ─── Skin Material ─── */
const skinMaterial = new THREE.MeshStandardMaterial({
  color: new THREE.Color("hsl(25, 50%, 70%)"),
  roughness: 0.5,
  metalness: 0.0,
  emissive: new THREE.Color("hsl(15, 25%, 22%)"),
  emissiveIntensity: 0.06,
});

/* ─── Make mesh unisex by flattening chest and narrowing hips ─── */
function makeUnisex(scene: THREE.Object3D) {
  scene.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    const geo = mesh.geometry;
    if (!geo || !geo.attributes.position) return;

    const pos = geo.attributes.position;
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const height = size.y;

    // Normalize Y to 0..1 (bottom=0, top=1)
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const ny = (y - box.min.y) / height; // normalized 0..1

      // Chest area (roughly 0.52-0.75 of height) — aggressively flatten Z protrusion
      if (ny > 0.52 && ny < 0.75 && z > center.z + 0.01 * size.z) {
        const chestFactor = Math.sin(((ny - 0.52) / 0.23) * Math.PI);
        const distFromCenter = (z - center.z) / (size.z * 0.5);
        const flatten = 0.6 * chestFactor * Math.max(0, distFromCenter);
        pos.setZ(i, z - (z - center.z) * flatten);
      }

      // Hip area (roughly 0.40-0.52) — narrow the wider hips
      if (ny > 0.40 && ny < 0.52) {
        const hipFactor = Math.sin(((ny - 0.40) / 0.12) * Math.PI);
        const distFromCenter = Math.abs(x - center.x) / (size.x * 0.5);
        const narrow = 0.12 * hipFactor * distFromCenter;
        const sign = x > center.x ? 1 : -1;
        pos.setX(i, x - sign * Math.abs(x - center.x) * narrow);
      }

      // Buttocks area (back side, 0.42-0.55) — flatten
      if (ny > 0.42 && ny < 0.55 && z < center.z - 0.01 * size.z) {
        const buttFactor = Math.sin(((ny - 0.42) / 0.13) * Math.PI);
        const distFromCenter = Math.abs(z - center.z) / (size.z * 0.5);
        const flatten = 0.25 * buttFactor * distFromCenter;
        pos.setZ(i, z + Math.abs(z - center.z) * flatten);
      }
    }

    pos.needsUpdate = true;
    geo.computeVertexNormals();
  });
}

/* ─── GLB Body Model ─── */
function BodyModel({ onBodyClick }: { onBodyClick: (e: ThreeEvent<MouseEvent>) => void }) {
  const { scene } = useGLTF(MODEL_URL);
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);

    // Apply skin material
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        // Clone geometry so we can modify vertices
        mesh.geometry = mesh.geometry.clone();
        mesh.material = skinMaterial.clone();
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });

    // Make unisex
    makeUnisex(clone);

    return clone;
  }, [scene]);

  // Compute scale to normalize height ~2.5 units
  const normalizedScale = useMemo(() => {
    const box = new THREE.Box3().setFromObject(clonedScene);
    const size = box.getSize(new THREE.Vector3());
    const height = size.y || 1;
    return 2.5 / height;
  }, [clonedScene]);

  return (
    <Center>
      <primitive object={clonedScene} onClick={onBodyClick} scale={normalizedScale} />
    </Center>
  );
}

// Preload model
useGLTF.preload(MODEL_URL);

/* ─── Spot Marker ─── */
function SpotMarker({ position, name, isSelected, onClick }: {
  position: [number, number, number];
  name?: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(() => {
    if (!meshRef.current) return;
    if (isSelected) {
      meshRef.current.scale.setScalar(1 + Math.sin(Date.now() * 0.005) * 0.2);
    } else {
      meshRef.current.scale.setScalar(hovered ? 1.3 : 1);
    }
  });

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[0.025, 16, 16]} />
        <meshStandardMaterial
          color={isSelected ? "#38bdf8" : "#60a5fa"}
          emissive={isSelected ? "#0284c7" : "#1d4ed8"}
          emissiveIntensity={isSelected ? 0.8 : 0.3}
          transparent
          opacity={0.9}
        />
      </mesh>
      {isSelected && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.04, 0.055, 32]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}
      {(isSelected || hovered) && name && (
        <Html position={[0, 0.07, 0]} center style={{ pointerEvents: "none" }}>
          <div className="rounded-md bg-popover px-2 py-1 text-[10px] font-medium text-popover-foreground shadow-lg border whitespace-nowrap">
            {name}
          </div>
        </Html>
      )}
    </group>
  );
}

/* ─── Convert 3D hit point to 2D coords for storage ─── */
function pointTo2D(point: THREE.Vector3): { x: number; y: number; view: "front" | "back" } {
  const x = Math.round(((point.x + 1) / 2) * 200);
  const y = Math.round(((2.0 - point.y) / 3.5) * 500);
  const view = point.z >= 0 ? "front" : "back";
  return { x: Math.max(0, Math.min(200, x)), y: Math.max(0, Math.min(500, y)), view };
}

/* ─── Convert 2D coords to 3D ─── */
function coords2Dto3D(x: number, y: number, view?: "front" | "back"): [number, number, number] {
  const x3d = (x / 200) * 2 - 1;
  const y3d = 2.0 - (y / 500) * 3.5;
  const z3d = view === "back" ? -0.25 : 0.25;
  return [x3d, y3d, z3d];
}

/* ─── Camera Animator (lerps BOTH position and target) ─── */
function CameraAnimator({ preset }: { preset: { position: [number, number, number]; target: [number, number, number] } }) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const posVec = useMemo(() => new THREE.Vector3(...preset.position), [preset.position]);
  const tarVec = useMemo(() => new THREE.Vector3(...preset.target), [preset.target]);
  const currentTarget = useRef(new THREE.Vector3(...preset.target));

  // Reset target immediately when preset changes
  useEffect(() => {
    currentTarget.current.copy(tarVec);
  }, [tarVec]);

  useFrame(() => {
    // Lerp camera position
    camera.position.lerp(posVec, 0.08);

    // Lerp orbit controls target
    if (controlsRef.current) {
      controlsRef.current.target.lerp(tarVec, 0.08);
      controlsRef.current.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={true}
      minDistance={0.3}
      maxDistance={8}
    />
  );
}

/* ─── Loading Spinner ─── */
function LoadingFallback() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-[10px] text-muted-foreground">3D Modell laden…</span>
      </div>
    </Html>
  );
}

/* ─── Scene ─── */
function Scene({ markers, selectedLocationId, onMapClick, onMarkerClick, preset }: BodyMap3DProps & { preset: typeof CAMERA_PRESETS.full }) {
  const handleBodyClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const { x, y, view } = pointTo2D(e.point);
    onMapClick?.(x, y, view);
  }, [onMapClick]);

  return (
    <>
      {/* Studio Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 5, 4]} intensity={0.9} castShadow shadow-mapSize={1024} />
      <directionalLight position={[-2, 3, -3]} intensity={0.3} />
      <directionalLight position={[0, -1, 2]} intensity={0.15} />
      <hemisphereLight args={["#b1e1ff", "#b97a20", 0.3]} />

      <Suspense fallback={<LoadingFallback />}>
        <BodyModel onBodyClick={handleBodyClick} />
      </Suspense>

      {markers.map((m) => (
        <SpotMarker
          key={m.id}
          position={coords2Dto3D(m.x, m.y, m.view)}
          name={m.name}
          isSelected={m.id === selectedLocationId}
          onClick={() => onMarkerClick?.(m.id)}
        />
      ))}

      <CameraAnimator preset={preset} />
    </>
  );
}

/* ─── Main Component ─── */
const BodyMap3D: React.FC<BodyMap3DProps> = (props) => {
  const [activeRegion, setActiveRegion] = useState<Region>("full");
  const preset = CAMERA_PRESETS[activeRegion];

  return (
    <div className="flex flex-col h-full">
      <div className="relative flex-1 min-h-[300px] rounded-lg overflow-hidden bg-gradient-to-b from-muted/20 via-muted/40 to-muted/60 border">
        <Canvas
          camera={{ position: preset.position, fov: 40, near: 0.1, far: 100 }}
          style={{ width: "100%", height: "100%" }}
          gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
          shadows
        >
          <Scene {...props} preset={preset} />
        </Canvas>

        {/* Region buttons */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1">
          {(Object.entries(CAMERA_PRESETS) as [Region, typeof CAMERA_PRESETS.full][]).map(([key, p]) => {
            const Icon = p.icon;
            return (
              <button
                key={key}
                onClick={() => setActiveRegion(key)}
                title={p.label}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-md transition-all",
                  activeRegion === key
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-card/80 text-muted-foreground hover:bg-card hover:text-foreground border border-border/50"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            );
          })}
        </div>

        {/* Reset */}
        <button
          onClick={() => setActiveRegion("full")}
          className="absolute left-2 bottom-2 flex h-7 items-center gap-1 rounded-md bg-card/80 px-2 text-[10px] text-muted-foreground hover:text-foreground border border-border/50 transition-all"
        >
          <RotateCcw className="h-3 w-3" /> Reset
        </button>

        {/* 3D Badge */}
        <div className="absolute left-2 top-2 rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary border border-primary/20">
          3D
        </div>
      </div>

      <p className="mt-2 text-center text-[10px] text-muted-foreground">
        Drehen & Zoomen · Klicken um Spot zu setzen
      </p>
    </div>
  );
};

export default BodyMap3D;
