import React, { useRef, useState, useCallback, useMemo, Suspense } from "react";
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
  full:      { position: [0, 0.3, 3.2],    target: [0, 0.3, 0],    label: "Ganzkörper",  icon: User },
  head:      { position: [0, 1.5, 0.8],    target: [0, 1.4, 0],    label: "Kopf",        icon: Eye },
  torso:     { position: [0, 0.7, 1.5],    target: [0, 0.7, 0],    label: "Torso",       icon: Shirt },
  left_arm:  { position: [-1.2, 0.8, 1.0], target: [-0.5, 0.8, 0], label: "L. Arm",      icon: Hand },
  right_arm: { position: [1.2, 0.8, 1.0],  target: [0.5, 0.8, 0],  label: "R. Arm",      icon: Hand },
  hands:     { position: [0, 0.2, 0.8],    target: [0, 0.2, 0],    label: "Hände",       icon: CircleDot },
  legs:      { position: [0, -0.3, 1.8],   target: [0, -0.3, 0],   label: "Beine",       icon: Footprints },
  knees:     { position: [0, -0.6, 1.0],   target: [0, -0.6, 0],   label: "Knie",        icon: ArrowDown },
  feet:      { position: [0, -1.3, 0.8],   target: [0, -1.3, 0],   label: "Füße",        icon: Footprints },
  back:      { position: [0, 0.3, -3.2],   target: [0, 0.3, 0],    label: "Rücken",      icon: User },
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

/* ─── GLB Body Model ─── */
function BodyModel({ onBodyClick }: { onBodyClick: (e: ThreeEvent<MouseEvent>) => void }) {
  const { scene } = useGLTF(MODEL_URL);
  const clonedScene = useMemo(() => scene.clone(true), [scene]);

  // Apply skin material and compute scale to normalize height ~2 units
  const normalizedScale = useMemo(() => {
    const box = new THREE.Box3().setFromObject(clonedScene);
    const size = box.getSize(new THREE.Vector3());
    const height = size.y || 1;
    const s = 2.5 / height; // normalize to ~2.5 units tall

    clonedScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).material = skinMaterial.clone();
        (child as THREE.Mesh).castShadow = true;
        (child as THREE.Mesh).receiveShadow = true;
      }
    });

    return s;
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

/* ─── Camera Animator ─── */
function CameraAnimator({ preset }: { preset: { position: [number, number, number]; target: [number, number, number] } }) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const posVec = useMemo(() => new THREE.Vector3(...preset.position), [preset.position]);
  const tarVec = useMemo(() => new THREE.Vector3(...preset.target), [preset.target]);

  useFrame(() => {
    camera.position.lerp(posVec, 0.08);
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={true}
      minDistance={0.3}
      maxDistance={8}
      target={tarVec}
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
