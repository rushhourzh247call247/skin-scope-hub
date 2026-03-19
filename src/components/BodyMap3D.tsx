import React, { useRef, useState, useCallback, useMemo } from "react";
import { Canvas, useFrame, useThree, ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Html, Environment } from "@react-three/drei";
import * as THREE from "three";
import { cn } from "@/lib/utils";
import { MapPin, RotateCcw, Eye, Hand, Footprints, User, Shirt } from "lucide-react";

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
type Region = "full" | "head" | "torso" | "arms" | "legs";

const CAMERA_PRESETS: Record<Region, { position: [number, number, number]; target: [number, number, number]; label: string; icon: React.ElementType }> = {
  full:  { position: [0, 0, 4.5],   target: [0, 0, 0],    label: "Ganzkörper", icon: User },
  head:  { position: [0, 2.2, 2],   target: [0, 2.0, 0],  label: "Kopf",       icon: Eye },
  torso: { position: [0, 0.6, 2.5], target: [0, 0.5, 0],  label: "Torso",      icon: Shirt },
  arms:  { position: [2.5, 0.8, 2], target: [0, 0.6, 0],  label: "Arme",       icon: Hand },
  legs:  { position: [0, -1.5, 3],  target: [0, -1.5, 0], label: "Beine",      icon: Footprints },
};

/* ─── Skin Material ─── */
const SKIN_COLOR = new THREE.Color("hsl(25, 60%, 72%)");
const SKIN_EMISSIVE = new THREE.Color("hsl(15, 40%, 30%)");

function SkinMaterial() {
  return (
    <meshStandardMaterial
      color={SKIN_COLOR}
      roughness={0.65}
      metalness={0.02}
      emissive={SKIN_EMISSIVE}
      emissiveIntensity={0.05}
    />
  );
}

/* ─── Human Body Model (Parametric) ─── */
function HumanBody({ onBodyClick }: { onBodyClick: (e: ThreeEvent<MouseEvent>) => void }) {
  const groupRef = useRef<THREE.Group>(null);

  return (
    <group ref={groupRef} onClick={onBodyClick}>
      {/* Head */}
      <mesh position={[0, 2.15, 0]}>
        <sphereGeometry args={[0.28, 32, 32]} />
        <SkinMaterial />
      </mesh>
      {/* Neck */}
      <mesh position={[0, 1.82, 0]}>
        <cylinderGeometry args={[0.1, 0.12, 0.15, 16]} />
        <SkinMaterial />
      </mesh>
      {/* Torso upper */}
      <mesh position={[0, 1.25, 0]}>
        <capsuleGeometry args={[0.38, 0.6, 16, 32]} />
        <SkinMaterial />
      </mesh>
      {/* Torso lower / hips */}
      <mesh position={[0, 0.55, 0]}>
        <capsuleGeometry args={[0.32, 0.3, 16, 32]} />
        <SkinMaterial />
      </mesh>

      {/* Left Shoulder */}
      <mesh position={[-0.52, 1.55, 0]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <SkinMaterial />
      </mesh>
      {/* Left Upper Arm */}
      <mesh position={[-0.6, 1.15, 0]} rotation={[0, 0, 0.15]}>
        <capsuleGeometry args={[0.1, 0.5, 8, 16]} />
        <SkinMaterial />
      </mesh>
      {/* Left Forearm */}
      <mesh position={[-0.65, 0.55, 0]} rotation={[0, 0, 0.08]}>
        <capsuleGeometry args={[0.08, 0.45, 8, 16]} />
        <SkinMaterial />
      </mesh>
      {/* Left Hand */}
      <mesh position={[-0.68, 0.18, 0]}>
        <sphereGeometry args={[0.09, 12, 12]} />
        <SkinMaterial />
      </mesh>

      {/* Right Shoulder */}
      <mesh position={[0.52, 1.55, 0]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <SkinMaterial />
      </mesh>
      {/* Right Upper Arm */}
      <mesh position={[0.6, 1.15, 0]} rotation={[0, 0, -0.15]}>
        <capsuleGeometry args={[0.1, 0.5, 8, 16]} />
        <SkinMaterial />
      </mesh>
      {/* Right Forearm */}
      <mesh position={[0.65, 0.55, 0]} rotation={[0, 0, -0.08]}>
        <capsuleGeometry args={[0.08, 0.45, 8, 16]} />
        <SkinMaterial />
      </mesh>
      {/* Right Hand */}
      <mesh position={[0.68, 0.18, 0]}>
        <sphereGeometry args={[0.09, 12, 12]} />
        <SkinMaterial />
      </mesh>

      {/* Left Upper Leg */}
      <mesh position={[-0.2, -0.25, 0]}>
        <capsuleGeometry args={[0.14, 0.6, 8, 16]} />
        <SkinMaterial />
      </mesh>
      {/* Left Lower Leg */}
      <mesh position={[-0.22, -1.05, 0]}>
        <capsuleGeometry args={[0.1, 0.6, 8, 16]} />
        <SkinMaterial />
      </mesh>
      {/* Left Foot */}
      <mesh position={[-0.22, -1.52, 0.08]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.14, 0.08, 0.28]} />
        <SkinMaterial />
      </mesh>

      {/* Right Upper Leg */}
      <mesh position={[0.2, -0.25, 0]}>
        <capsuleGeometry args={[0.14, 0.6, 8, 16]} />
        <SkinMaterial />
      </mesh>
      {/* Right Lower Leg */}
      <mesh position={[0.22, -1.05, 0]}>
        <capsuleGeometry args={[0.1, 0.6, 8, 16]} />
        <SkinMaterial />
      </mesh>
      {/* Right Foot */}
      <mesh position={[0.22, -1.52, 0.08]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.14, 0.08, 0.28]} />
        <SkinMaterial />
      </mesh>
    </group>
  );
}

/* ─── Spot Marker ─── */
function SpotMarker({ position, name, isSelected, onClick }: {
  position: [number, number, number];
  name?: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((_, delta) => {
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
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial
          color={isSelected ? "hsl(200, 90%, 55%)" : "hsl(200, 70%, 60%)"}
          emissive={isSelected ? "hsl(200, 90%, 40%)" : "hsl(200, 70%, 30%)"}
          emissiveIntensity={isSelected ? 0.8 : 0.3}
          transparent
          opacity={0.9}
        />
      </mesh>
      {/* Glow ring */}
      {isSelected && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.06, 0.08, 32]} />
          <meshBasicMaterial color="hsl(200, 90%, 60%)" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}
      {(isSelected || hovered) && name && (
        <Html position={[0, 0.1, 0]} center style={{ pointerEvents: "none" }}>
          <div className="rounded-md bg-popover px-2 py-1 text-[10px] font-medium text-popover-foreground shadow-lg border whitespace-nowrap">
            {name}
          </div>
        </Html>
      )}
    </group>
  );
}

/* ─── Camera Controller ─── */
function CameraAnimator({ target, lookAt }: { target: [number, number, number]; lookAt: [number, number, number] }) {
  const { camera } = useThree();
  const targetVec = useMemo(() => new THREE.Vector3(...target), [target]);
  const lookAtVec = useMemo(() => new THREE.Vector3(...lookAt), [lookAt]);

  useFrame(() => {
    camera.position.lerp(targetVec, 0.06);
    const currentLookAt = new THREE.Vector3();
    camera.getWorldDirection(currentLookAt);
    // smooth look-at not trivial with orbit controls, position lerp is enough
  });

  return null;
}

/* ─── Convert 3D hit point to 2D coordinates for storage ─── */
function pointTo2D(point: THREE.Vector3): { x: number; y: number; view: "front" | "back" } {
  // Map 3D coords to 0-200 x, 0-500 y range (matching SVG coordinate system)
  const x = Math.round(((point.x + 1) / 2) * 200);
  const y = Math.round(((2.5 - point.y) / 4) * 500);
  const view = point.z >= 0 ? "front" : "back";
  return { x: Math.max(0, Math.min(200, x)), y: Math.max(0, Math.min(500, y)), view };
}

/* ─── Convert stored 2D coordinates to 3D position ─── */
function coords2Dto3D(x: number, y: number, view?: "front" | "back"): [number, number, number] {
  const x3d = (x / 200) * 2 - 1;
  const y3d = 2.5 - (y / 500) * 4;
  const z3d = view === "back" ? -0.4 : 0.4;
  return [x3d, y3d, z3d];
}

/* ─── Scene ─── */
function Scene({ markers, selectedLocationId, onMapClick, onMarkerClick }: BodyMap3DProps) {
  const controlsRef = useRef<any>(null);
  const [cameraTarget, setCameraTarget] = useState<{ position: [number, number, number]; lookAt: [number, number, number] } | null>(null);

  const handleBodyClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const point = e.point;
    const { x, y, view } = pointTo2D(point);
    onMapClick?.(x, y, view);
  }, [onMapClick]);

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 4]} intensity={0.8} castShadow />
      <directionalLight position={[-2, 3, -3]} intensity={0.3} />
      <pointLight position={[0, 0, 3]} intensity={0.4} />

      <HumanBody onBodyClick={handleBodyClick} />

      {markers.map((m) => (
        <SpotMarker
          key={m.id}
          position={coords2Dto3D(m.x, m.y, m.view)}
          name={m.name}
          isSelected={m.id === selectedLocationId}
          onClick={() => onMarkerClick?.(m.id)}
        />
      ))}

      {cameraTarget && (
        <CameraAnimator target={cameraTarget.position} lookAt={cameraTarget.lookAt} />
      )}

      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        minDistance={1.5}
        maxDistance={8}
        target={[0, 0.5, 0]}
      />
    </>
  );
}

/* ─── Main Component ─── */
const BodyMap3D: React.FC<BodyMap3DProps> = (props) => {
  const [activeRegion, setActiveRegion] = useState<Region>("full");
  const [cameraPreset, setCameraPreset] = useState(CAMERA_PRESETS.full);

  const handleRegion = (r: Region) => {
    setActiveRegion(r);
    setCameraPreset(CAMERA_PRESETS[r]);
  };

  return (
    <div className="flex flex-col h-full">
      {/* 3D Canvas */}
      <div className="relative flex-1 min-h-[300px] rounded-lg overflow-hidden bg-gradient-to-b from-muted/30 to-muted/60 border">
        <Canvas
          camera={{ position: cameraPreset.position, fov: 45, near: 0.1, far: 100 }}
          style={{ width: "100%", height: "100%" }}
          gl={{ antialias: true, alpha: true }}
        >
          <Scene {...props} />
        </Canvas>

        {/* Region buttons - right side overlay */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1">
          {(Object.entries(CAMERA_PRESETS) as [Region, typeof CAMERA_PRESETS.full][]).map(([key, preset]) => {
            const Icon = preset.icon;
            return (
              <button
                key={key}
                onClick={() => handleRegion(key)}
                title={preset.label}
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

        {/* Reset button */}
        <button
          onClick={() => handleRegion("full")}
          className="absolute left-2 bottom-2 flex h-7 items-center gap-1 rounded-md bg-card/80 px-2 text-[10px] text-muted-foreground hover:text-foreground border border-border/50 transition-all"
        >
          <RotateCcw className="h-3 w-3" /> Reset
        </button>

        {/* 3D Badge */}
        <div className="absolute left-2 top-2 rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary border border-primary/20">
          3D
        </div>
      </div>

      {/* Instruction */}
      <p className="mt-2 text-center text-[10px] text-muted-foreground">
        Drehen & Zoomen · Klicken um Spot zu setzen
      </p>
    </div>
  );
};

export default BodyMap3D;
