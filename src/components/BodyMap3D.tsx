import React, { useRef, useState, useCallback, useMemo, Suspense, useEffect } from "react";
import { Canvas, useFrame, useThree, ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Html, useGLTF, Center } from "@react-three/drei";
import * as THREE from "three";
import { cn } from "@/lib/utils";
import { RotateCcw, Eye, Hand, Footprints, User, Shirt, CircleDot, ArrowDown, MapPin } from "lucide-react";

/* ─── Types ─── */
interface Marker {
  id: number;
  x: number;
  y: number;
  name?: string;
  view?: "front" | "back";
  imageCount?: number;
  findingCount?: number;
}

type Gender = "female" | "male";

interface BodyMap3DProps {
  markers: Marker[];
  selectedLocationId: number | null;
  gender?: Gender;
  onMapClick?: (x: number, y: number, view: "front" | "back") => void;
  onMarkerClick?: (id: number) => void;
}

/* ─── Camera Presets ─── */
type Region = "full" | "head" | "torso" | "left_arm" | "right_arm" | "hands" | "legs" | "knees" | "feet" | "back";
type CameraPreset = { position: [number, number, number]; target: [number, number, number]; label: string; icon: React.ElementType };

const CAMERA_PRESETS: Record<Region, CameraPreset> = {
  full: { position: [0, 0, 3.5], target: [0, 0, 0], label: "Ganzkörper", icon: User },
  head: { position: [0, 1.15, 0.8], target: [0, 1.15, 0], label: "Kopf", icon: Eye },
  torso: { position: [0, 0.35, 1.4], target: [0, 0.35, 0], label: "Torso", icon: Shirt },
  left_arm: { position: [-0.8, 0.4, 1.0], target: [-0.35, 0.4, 0], label: "L. Arm", icon: Hand },
  right_arm: { position: [0.8, 0.4, 1.0], target: [0.35, 0.4, 0], label: "R. Arm", icon: Hand },
  hands: { position: [0, -0.2, 0.8], target: [0, -0.2, 0], label: "Hände", icon: CircleDot },
  legs: { position: [0, -0.7, 1.6], target: [0, -0.7, 0], label: "Beine", icon: Footprints },
  knees: { position: [0, -0.9, 0.9], target: [0, -0.9, 0], label: "Knie", icon: ArrowDown },
  feet: { position: [0, -1.35, 0.7], target: [0, -1.35, 0], label: "Füße", icon: Footprints },
  back: { position: [0, 0, -3.5], target: [0, 0, 0], label: "Rücken", icon: User },
};

const FEMALE_MODEL_URL = "/models/body.glb";
const MALE_MODEL_URL = "/models/male_body.glb";

/* ─── Skin Material ─── */
const skinMaterial = new THREE.MeshStandardMaterial({
  color: new THREE.Color("hsl(25, 50%, 70%)"),
  roughness: 0.5,
  metalness: 0.0,
  emissive: new THREE.Color("hsl(15, 25%, 22%)"),
  emissiveIntensity: 0.06,
});

/* ─── GLB Body Model ─── */
function BodyModel({ onBodyClick, gender }: { onBodyClick: (e: ThreeEvent<MouseEvent>) => void; gender: Gender }) {
  const modelUrl = gender === "male" ? MALE_MODEL_URL : FEMALE_MODEL_URL;
  const { scene } = useGLTF(modelUrl);

  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.geometry = mesh.geometry.clone();
        mesh.material = skinMaterial.clone();
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    return clone;
  }, [scene]);

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

useGLTF.preload(FEMALE_MODEL_URL);
useGLTF.preload(MALE_MODEL_URL);

/* ─── Spot Marker ─── */
function SpotMarker({ position, name, isSelected, onClick, imageCount, findingCount }: {
  position: [number, number, number];
  name?: string;
  isSelected: boolean;
  onClick: () => void;
  imageCount?: number;
  findingCount?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(() => {
    if (!meshRef.current) return;
    if (isSelected) {
      meshRef.current.scale.setScalar(1 + Math.sin(Date.now() * 0.005) * 0.2);
    } else {
      meshRef.current.scale.setScalar(hovered ? 1.4 : 1);
    }
  });

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[0.03, 16, 16]} />
        <meshStandardMaterial
          color={isSelected ? "#0ea5e9" : "#38bdf8"}
          emissive={isSelected ? "#0284c7" : "#1d4ed8"}
          emissiveIntensity={isSelected ? 0.8 : 0.3}
          transparent
          opacity={isSelected ? 0.95 : 0.85}
        />
      </mesh>
      {/* Outer glow ring - always visible */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.035, isSelected ? 0.055 : 0.045, 32]} />
        <meshBasicMaterial
          color={isSelected ? "#0ea5e9" : "#38bdf8"}
          transparent
          opacity={isSelected ? 0.6 : 0.25}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Always-visible small label */}
      {name && !hovered && !isSelected && (
        <Html position={[0, 0.06, 0]} center style={{ pointerEvents: "none" }}>
          <div className="rounded bg-card/90 border border-border/50 px-1.5 py-0.5 text-[8px] font-medium text-muted-foreground shadow whitespace-nowrap backdrop-blur-sm">
            {name}
          </div>
        </Html>
      )}
      {/* Rich hover/selected tooltip */}
      {(isSelected || hovered) && (
        <Html position={[0, 0.08, 0]} center style={{ pointerEvents: "none" }}>
          <div className="rounded-lg border bg-popover px-3 py-2 shadow-xl whitespace-nowrap backdrop-blur-sm min-w-[120px]">
            <p className="text-[11px] font-semibold text-popover-foreground">{name || "Spot"}</p>
            <div className="mt-1 flex items-center gap-3 text-[9px] text-muted-foreground">
              {(imageCount ?? 0) > 0 && (
                <span className="flex items-center gap-0.5">
                  📷 {imageCount} {imageCount === 1 ? "Bild" : "Bilder"}
                </span>
              )}
              {(findingCount ?? 0) > 0 && (
                <span className="flex items-center gap-0.5">
                  📋 {findingCount} {findingCount === 1 ? "Befund" : "Befunde"}
                </span>
              )}
              {(imageCount ?? 0) === 0 && (findingCount ?? 0) === 0 && (
                <span>Keine Einträge</span>
              )}
            </div>
            {hovered && !isSelected && (
              <p className="mt-1 text-[8px] text-primary font-medium">Klicken für Details & Fotos</p>
            )}
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

/* ─── Camera Animator: animate to preset only, then free interaction ─── */
function CameraAnimator({ preset }: { preset: Pick<CameraPreset, "position" | "target"> }) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const targetPositionRef = useRef(new THREE.Vector3(...preset.position));
  const targetLookAtRef = useRef(new THREE.Vector3(...preset.target));
  const isAnimatingRef = useRef(true);

  useEffect(() => {
    targetPositionRef.current.set(...preset.position);
    targetLookAtRef.current.set(...preset.target);
    isAnimatingRef.current = true;
  }, [preset]);

  useFrame(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    if (isAnimatingRef.current) {
      camera.position.lerp(targetPositionRef.current, 0.14);
      controls.target.lerp(targetLookAtRef.current, 0.14);

      const donePos = camera.position.distanceTo(targetPositionRef.current) < 0.01;
      const doneTarget = controls.target.distanceTo(targetLookAtRef.current) < 0.01;

      if (donePos && doneTarget) {
        camera.position.copy(targetPositionRef.current);
        controls.target.copy(targetLookAtRef.current);
        isAnimatingRef.current = false;
      }
    }

    controls.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan
      enableZoom
      enableRotate
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.9}
      zoomSpeed={0.9}
      minDistance={0.3}
      maxDistance={8}
      minPolarAngle={0}
      maxPolarAngle={Math.PI}
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
function Scene({ markers, selectedLocationId, onMapClick, onMarkerClick, preset, gender, markMode }: BodyMap3DProps & { preset: CameraPreset; gender: Gender; markMode: boolean }) {
  const handleBodyClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      if (!markMode) return;
      e.stopPropagation();
      const { x, y, view } = pointTo2D(e.point);
      onMapClick?.(x, y, view);
    },
    [onMapClick, markMode],
  );

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 5, 4]} intensity={0.9} castShadow shadow-mapSize={1024} />
      <directionalLight position={[-2, 3, -3]} intensity={0.3} />
      <directionalLight position={[0, -1, 2]} intensity={0.15} />
      <hemisphereLight args={["#b1e1ff", "#b97a20", 0.3]} />

      <Suspense fallback={<LoadingFallback />}>
        <BodyModel onBodyClick={handleBodyClick} gender={gender} />
      </Suspense>

      {markers.map((m) => (
        <SpotMarker
          key={m.id}
          position={coords2Dto3D(m.x, m.y, m.view)}
          name={m.name}
          isSelected={m.id === selectedLocationId}
          onClick={() => onMarkerClick?.(m.id)}
          imageCount={m.imageCount}
          findingCount={m.findingCount}
        />
      ))}

      <CameraAnimator preset={preset} />
    </>
  );
}

/* ─── Main Component ─── */
const BodyMap3D: React.FC<BodyMap3DProps> = (props) => {
  const [activeRegion, setActiveRegion] = useState<Region>("full");
  const gender = props.gender ?? "male";
  const preset = CAMERA_PRESETS[activeRegion];

  return (
    <div className="flex h-full flex-col">
      <div className="relative min-h-[300px] flex-1 overflow-hidden rounded-lg border bg-gradient-to-b from-muted/20 via-muted/40 to-muted/60">
        <Canvas
          camera={{ position: preset.position, fov: 40, near: 0.1, far: 100 }}
          style={{ width: "100%", height: "100%" }}
          gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
          shadows
        >
          <Scene {...props} preset={preset} gender={gender} />
        </Canvas>

        {/* Gender indicator */}
        <div className="absolute left-2 top-10 rounded-md border border-border/50 bg-card/85 px-2 py-1 text-[10px] font-semibold text-muted-foreground">
          {gender === "female" ? "♀ Weiblich" : "♂ Männlich"}
        </div>

        {/* Region buttons */}
        <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 flex-col gap-0.5 max-h-[calc(100%-1rem)] overflow-y-auto scrollbar-none">
          {(Object.entries(CAMERA_PRESETS) as [Region, CameraPreset][]).map(([key, p]) => {
            const Icon = p.icon;
            return (
              <button
                key={key}
                onClick={() => setActiveRegion(key)}
                title={p.label}
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded transition-all",
                  activeRegion === key
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "border border-border/50 bg-card/80 text-muted-foreground hover:bg-card hover:text-foreground",
                )}
              >
                <Icon className="h-3 w-3" />
              </button>
            );
          })}
        </div>

        {/* Reset */}
        <button
          onClick={() => setActiveRegion("full")}
          className="absolute bottom-2 left-2 flex h-7 items-center gap-1 rounded-md border border-border/50 bg-card/80 px-2 text-[10px] text-muted-foreground transition-all hover:text-foreground"
        >
          <RotateCcw className="h-3 w-3" /> Reset
        </button>

        {/* 3D Badge */}
        <div className="absolute left-2 top-2 rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
          3D
        </div>
      </div>

      <p className="mt-2 text-center text-[10px] text-muted-foreground">Drehen & Zoomen · Klicken um Spot zu setzen</p>
    </div>
  );
};

export default BodyMap3D;
