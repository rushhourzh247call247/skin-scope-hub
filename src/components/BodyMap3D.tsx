import React, { useRef, useState, useCallback, useMemo } from "react";
import { Canvas, useFrame, useThree, ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";
import { cn } from "@/lib/utils";
import { RotateCcw, Eye, Hand, Footprints, User, Shirt } from "lucide-react";

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
  full:  { position: [0, 0, 4.2],   target: [0, 0, 0],    label: "Ganzkörper", icon: User },
  head:  { position: [0, 2.2, 1.8], target: [0, 2.0, 0],  label: "Kopf",       icon: Eye },
  torso: { position: [0, 0.6, 2.2], target: [0, 0.5, 0],  label: "Torso",      icon: Shirt },
  arms:  { position: [2.2, 0.8, 1.8], target: [0, 0.6, 0], label: "Arme",      icon: Hand },
  legs:  { position: [0, -1.5, 2.8], target: [0, -1.5, 0], label: "Beine",     icon: Footprints },
};

/* ─── Skin Material ─── */
const skinMat = new THREE.MeshStandardMaterial({
  color: new THREE.Color("hsl(25, 55%, 68%)"),
  roughness: 0.55,
  metalness: 0.0,
  emissive: new THREE.Color("hsl(15, 30%, 25%)"),
  emissiveIntensity: 0.04,
});

/* ─── Helper: Create LatheGeometry from profile ─── */
function createLatheGeo(profile: [number, number][], segments = 32): THREE.LatheGeometry {
  const points = profile.map(([x, y]) => new THREE.Vector2(x, y));
  return new THREE.LatheGeometry(points, segments);
}

/* ─── Helper: Smooth tapered limb via LatheGeometry ─── */
function TaperedLimb({ topR, botR, len, pos, rot, segs = 16 }: {
  topR: number; botR: number; len: number;
  pos: [number, number, number]; rot?: [number, number, number]; segs?: number;
}) {
  const geo = useMemo(() => {
    const profile: [number, number][] = [];
    const n = 14;
    profile.push([0, -len / 2]);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const y = -len / 2 + t * len;
      const r = botR + (topR - botR) * t + Math.sin(t * Math.PI) * 0.012;
      profile.push([r, y]);
    }
    profile.push([0, len / 2]);
    return createLatheGeo(profile, segs);
  }, [topR, botR, len, segs]);

  return <mesh geometry={geo} position={pos} rotation={rot ? new THREE.Euler(...rot) : undefined} material={skinMat} />;
}

/* ─── Human Body Model (Organic LatheGeometry) ─── */
function HumanBody({ onBodyClick }: { onBodyClick: (e: ThreeEvent<MouseEvent>) => void }) {
  const torsoGeo = useMemo(() => createLatheGeo([
    [0, -0.65], [0.22, -0.6], [0.3, -0.48], [0.29, -0.35],
    [0.24, -0.15], [0.22, 0.0], [0.25, 0.15], [0.31, 0.32],
    [0.34, 0.48], [0.32, 0.58], [0.27, 0.68], [0.17, 0.74],
    [0.11, 0.77], [0, 0.79],
  ], 48), []);

  const headGeo = useMemo(() => createLatheGeo([
    [0, -0.2], [0.13, -0.17], [0.19, -0.08], [0.22, 0.02],
    [0.22, 0.1], [0.2, 0.17], [0.16, 0.22], [0.1, 0.25], [0, 0.26],
  ], 36), []);

  const neckGeo = useMemo(() => createLatheGeo([
    [0, -0.07], [0.09, -0.05], [0.085, 0], [0.09, 0.05], [0, 0.07],
  ], 20), []);

  const footGeo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.045, -0.12);
    shape.quadraticCurveTo(-0.05, 0.0, -0.04, 0.1);
    shape.quadraticCurveTo(0, 0.13, 0.04, 0.1);
    shape.quadraticCurveTo(0.05, 0.0, 0.045, -0.12);
    shape.quadraticCurveTo(0, -0.14, -0.045, -0.12);
    const extrudeSettings = { depth: 0.045, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.01, bevelSegments: 4 };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, []);

  return (
    <group onClick={onBodyClick}>
      {/* Torso */}
      <mesh geometry={torsoGeo} position={[0, 0.55, 0]} material={skinMat} />
      {/* Neck */}
      <mesh geometry={neckGeo} position={[0, 1.48, 0]} material={skinMat} />
      {/* Head */}
      <mesh geometry={headGeo} position={[0, 1.82, 0]} material={skinMat} />
      {/* Ears */}
      <mesh position={[-0.23, 1.83, 0]} material={skinMat}><sphereGeometry args={[0.045, 12, 12]} /></mesh>
      <mesh position={[0.23, 1.83, 0]} material={skinMat}><sphereGeometry args={[0.045, 12, 12]} /></mesh>
      {/* Nose hint */}
      <mesh position={[0, 1.8, 0.2]} material={skinMat}><sphereGeometry args={[0.03, 10, 10]} /></mesh>

      {/* ── LEFT ARM ── */}
      <mesh position={[-0.4, 1.25, 0]} material={skinMat}><sphereGeometry args={[0.11, 20, 20]} /></mesh>
      <TaperedLimb topR={0.09} botR={0.075} len={0.48} pos={[-0.48, 0.88, 0]} rot={[0, 0, 0.1]} />
      <mesh position={[-0.52, 0.6, 0]} material={skinMat}><sphereGeometry args={[0.07, 14, 14]} /></mesh>
      <TaperedLimb topR={0.07} botR={0.05} len={0.45} pos={[-0.55, 0.32, 0]} rot={[0, 0, 0.05]} />
      <mesh position={[-0.57, 0.06, 0]} material={skinMat}><sphereGeometry args={[0.045, 12, 12]} /></mesh>
      {/* Hand */}
      <mesh position={[-0.58, -0.08, 0]} material={skinMat}><boxGeometry args={[0.07, 0.1, 0.035]} /></mesh>
      {[-0.035, -0.012, 0.01, 0.032].map((dx, i) => (
        <mesh key={`lf${i}`} position={[-0.58 + dx, -0.17, 0]} material={skinMat}><capsuleGeometry args={[0.01, 0.05, 4, 8]} /></mesh>
      ))}
      <mesh position={[-0.535, -0.06, 0.015]} rotation={[0, 0, -0.5]} material={skinMat}><capsuleGeometry args={[0.012, 0.045, 4, 8]} /></mesh>

      {/* ── RIGHT ARM ── */}
      <mesh position={[0.4, 1.25, 0]} material={skinMat}><sphereGeometry args={[0.11, 20, 20]} /></mesh>
      <TaperedLimb topR={0.09} botR={0.075} len={0.48} pos={[0.48, 0.88, 0]} rot={[0, 0, -0.1]} />
      <mesh position={[0.52, 0.6, 0]} material={skinMat}><sphereGeometry args={[0.07, 14, 14]} /></mesh>
      <TaperedLimb topR={0.07} botR={0.05} len={0.45} pos={[0.55, 0.32, 0]} rot={[0, 0, -0.05]} />
      <mesh position={[0.57, 0.06, 0]} material={skinMat}><sphereGeometry args={[0.045, 12, 12]} /></mesh>
      <mesh position={[0.58, -0.08, 0]} material={skinMat}><boxGeometry args={[0.07, 0.1, 0.035]} /></mesh>
      {[0.035, 0.012, -0.01, -0.032].map((dx, i) => (
        <mesh key={`rf${i}`} position={[0.58 + dx, -0.17, 0]} material={skinMat}><capsuleGeometry args={[0.01, 0.05, 4, 8]} /></mesh>
      ))}
      <mesh position={[0.535, -0.06, 0.015]} rotation={[0, 0, 0.5]} material={skinMat}><capsuleGeometry args={[0.012, 0.045, 4, 8]} /></mesh>

      {/* ── LEFT LEG ── */}
      <mesh position={[-0.17, -0.15, 0]} material={skinMat}><sphereGeometry args={[0.13, 16, 16]} /></mesh>
      <TaperedLimb topR={0.13} botR={0.085} len={0.6} pos={[-0.17, -0.55, 0]} rot={[0, 0, 0.015]} segs={20} />
      <mesh position={[-0.18, -0.9, 0]} material={skinMat}><sphereGeometry args={[0.085, 14, 14]} /></mesh>
      <TaperedLimb topR={0.085} botR={0.055} len={0.55} pos={[-0.19, -1.22, 0]} rot={[0, 0, 0.01]} segs={20} />
      <mesh position={[-0.19, -1.53, 0]} material={skinMat}><sphereGeometry args={[0.05, 12, 12]} /></mesh>
      {/* Foot */}
      <mesh geometry={footGeo} position={[-0.19, -1.58, -0.04]} rotation={[-Math.PI / 2, 0, 0]} material={skinMat} />
      {/* Toes */}
      {[-0.03, -0.015, 0, 0.015, 0.028].map((dx, i) => (
        <mesh key={`lt${i}`} position={[-0.19 + dx, -1.575, 0.13]} material={skinMat}><sphereGeometry args={[0.015 - i * 0.001, 8, 8]} /></mesh>
      ))}

      {/* ── RIGHT LEG ── */}
      <mesh position={[0.17, -0.15, 0]} material={skinMat}><sphereGeometry args={[0.13, 16, 16]} /></mesh>
      <TaperedLimb topR={0.13} botR={0.085} len={0.6} pos={[0.17, -0.55, 0]} rot={[0, 0, -0.015]} segs={20} />
      <mesh position={[0.18, -0.9, 0]} material={skinMat}><sphereGeometry args={[0.085, 14, 14]} /></mesh>
      <TaperedLimb topR={0.085} botR={0.055} len={0.55} pos={[0.19, -1.22, 0]} rot={[0, 0, -0.01]} segs={20} />
      <mesh position={[0.19, -1.53, 0]} material={skinMat}><sphereGeometry args={[0.05, 12, 12]} /></mesh>
      <mesh geometry={footGeo} position={[0.19, -1.58, -0.04]} rotation={[-Math.PI / 2, 0, 0]} material={skinMat} />
      {[0.03, 0.015, 0, -0.015, -0.028].map((dx, i) => (
        <mesh key={`rt${i}`} position={[0.19 + dx, -1.575, 0.13]} material={skinMat}><sphereGeometry args={[0.015 - i * 0.001, 8, 8]} /></mesh>
      ))}
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
