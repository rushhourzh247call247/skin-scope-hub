import React, { useRef, useState, useCallback, useMemo, Suspense, useEffect } from "react";
import { Canvas, useFrame, useThree, ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Html, useGLTF, Center } from "@react-three/drei";
import * as THREE from "three";
import { cn } from "@/lib/utils";
import { RotateCcw, Eye, Hand, Footprints, User, Shirt, CircleDot, ArrowDown, MapPin, Square, Filter } from "lucide-react";
import type { LesionClassification } from "@/types/patient";
import { LESION_CLASSIFICATIONS } from "@/types/patient";

/* ─── Types ─── */
interface Marker {
  id: number;
  x: number;
  y: number;
  x3d?: number;
  y3d?: number;
  z3d?: number;
  nx?: number;
  ny?: number;
  nz?: number;
  name?: string;
  view?: "front" | "back";
  imageCount?: number;
  findingCount?: number;
  type?: "spot" | "region";
  width?: number;
  height?: number;
  classification?: string;
  classificationColor?: string;
}

type Gender = "female" | "male";
type MarkType = "spot" | "region";

interface BodyMap3DProps {
  markers: Marker[];
  selectedLocationId: number | null;
  gender?: Gender;
  classificationFilter?: LesionClassification[];
  onFilterChange?: (filter: LesionClassification[]) => void;
  onMapClick?: (
    x: number,
    y: number,
    view: "front" | "back",
    markType?: MarkType,
    point3d?: [number, number, number],
    normal3d?: [number, number, number],
  ) => void;
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
        mesh.userData.isBodyMesh = true;
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

/* ─── Spot Marker (DermEngine-style circle ring) ─── */
const HIGH_RISK_CLASSIFICATIONS: LesionClassification[] = ["melanoma_suspect", "scc"];

type SpotMarkerProps = {
  position: [number, number, number];
  name?: string;
  isSelected: boolean;
  onClick: () => void;
  imageCount?: number;
  findingCount?: number;
  classificationColor?: string;
  isHighRisk?: boolean;
};

const SpotMarker = React.forwardRef<THREE.Group, SpotMarkerProps>(function SpotMarker(
  { position, name, isSelected, onClick, imageCount, findingCount, classificationColor },
  forwardedRef,
) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(() => {
    if (!groupRef.current) return;
    if (isSelected) {
      groupRef.current.scale.setScalar(1 + Math.sin(Date.now() * 0.004) * 0.1);
    } else {
      groupRef.current.scale.setScalar(hovered ? 1.15 : 1);
    }
  });

  const baseColor = classificationColor || "#64748b";
  const ringColor = isSelected ? "#0ea5e9" : hovered ? baseColor : baseColor;
  const ringOpacity = isSelected ? 0.9 : hovered ? 0.85 : 0.7;

  return (
    <group ref={forwardedRef} position={position}>
      <group
        ref={groupRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        {/* Main circle ring - like DermEngine */}
        <mesh rotation={[0, 0, 0]}>
          <ringGeometry args={[0.028, 0.035, 48]} />
          <meshBasicMaterial
            color={ringColor}
            transparent
            opacity={ringOpacity}
            side={THREE.DoubleSide}
            depthTest={false}
          />
        </mesh>

        {/* Tiny center dot */}
        <mesh>
          <circleGeometry args={[0.006, 16]} />
          <meshBasicMaterial
            color={ringColor}
            transparent
            opacity={isSelected ? 0.8 : 0.4}
            side={THREE.DoubleSide}
            depthTest={false}
          />
        </mesh>

        {/* Selected: outer highlight ring */}
        {isSelected && (
          <mesh rotation={[0, 0, 0]}>
            <ringGeometry args={[0.038, 0.043, 48]} />
            <meshBasicMaterial
              color="#0ea5e9"
              transparent
              opacity={0.4}
              side={THREE.DoubleSide}
              depthTest={false}
            />
          </mesh>
        )}

        {/* Invisible click target (larger) */}
        <mesh>
          <circleGeometry args={[0.045, 16]} />
          <meshBasicMaterial transparent opacity={0} side={THREE.DoubleSide} depthTest={false} />
        </mesh>
      </group>

      {/* Small label only on hover (not selected) */}
      {name && hovered && !isSelected && (
        <Html position={[0, 0.055, 0]} center style={{ pointerEvents: "none" }}>
          <div className="rounded bg-card/90 border border-border/50 px-1.5 py-0.5 text-[7px] font-medium text-muted-foreground shadow whitespace-nowrap backdrop-blur-sm">
            {name}
          </div>
        </Html>
      )}

      {/* Tooltip only on hover */}
      {hovered && (
        <Html position={[0, 0.065, 0]} center style={{ pointerEvents: "none" }}>
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
          </div>
        </Html>
      )}
    </group>
  );
});

/* ─── Convert 3D hit point to 2D coords for storage ─── */
function pointTo2D(point: THREE.Vector3): { x: number; y: number; view: "front" | "back" } {
  const x = Math.round(((point.x + 1) / 2) * 200);
  const y = Math.round(((2.0 - point.y) / 3.5) * 500);
  const view = point.z >= 0 ? "front" : "back";
  return { x: Math.max(0, Math.min(200, x)), y: Math.max(0, Math.min(500, y)), view };
}

/* ─── Region Marker (rectangle) ─── */
type RegionMarkerProps = {
  position: [number, number, number];
  name?: string;
  isSelected: boolean;
  onClick: () => void;
  imageCount?: number;
  findingCount?: number;
  width: number;
  height: number;
};

const RegionMarker = React.forwardRef<THREE.Group, RegionMarkerProps>(function RegionMarker(
  { position, name, isSelected, onClick, imageCount, findingCount, width, height },
  forwardedRef,
) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  // Convert 2D width/height to 3D scale
  const w3d = (width / 200) * 2;
  const h3d = (height / 500) * 3.5;

  useFrame(() => {
    if (!groupRef.current) return;
    if (isSelected) {
      groupRef.current.scale.setScalar(1 + Math.sin(Date.now() * 0.003) * 0.03);
    } else {
      groupRef.current.scale.setScalar(1);
    }
  });

  const color = isSelected ? "#0ea5e9" : hovered ? "#38bdf8" : "#f59e0b";
  const opacity = isSelected ? 0.7 : hovered ? 0.5 : 0.35;

  // Create rectangle outline using EdgesGeometry
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    const hw = w3d / 2;
    const hh = h3d / 2;
    s.moveTo(-hw, -hh);
    s.lineTo(hw, -hh);
    s.lineTo(hw, hh);
    s.lineTo(-hw, hh);
    s.lineTo(-hw, -hh);
    return s;
  }, [w3d, h3d]);

  return (
    <group ref={forwardedRef} position={position}>
      <group
        ref={groupRef}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        {/* Filled rectangle (semi-transparent) */}
        <mesh>
          <shapeGeometry args={[shape]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={isSelected ? 0.15 : hovered ? 0.1 : 0.05}
            side={THREE.DoubleSide}
            depthTest={false}
          />
        </mesh>

        {/* Rectangle border */}
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={5}
              array={new Float32Array([
                -w3d/2, -h3d/2, 0,
                w3d/2, -h3d/2, 0,
                w3d/2, h3d/2, 0,
                -w3d/2, h3d/2, 0,
                -w3d/2, -h3d/2, 0,
              ])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color={color} transparent opacity={opacity} linewidth={1} depthTest={false} />
        </line>

        {/* Corner dots */}
        {[[-w3d/2, -h3d/2], [w3d/2, -h3d/2], [w3d/2, h3d/2], [-w3d/2, h3d/2]].map(([cx, cy], i) => (
          <mesh key={i} position={[cx, cy, 0]}>
            <circleGeometry args={[0.012, 12]} />
            <meshBasicMaterial color={color} transparent opacity={opacity + 0.2} side={THREE.DoubleSide} depthTest={false} />
          </mesh>
        ))}
      </group>

      {/* Label */}
      {name && !hovered && !isSelected && (
        <Html position={[0, h3d / 2 + 0.04, 0]} center style={{ pointerEvents: "none" }}>
          <div className="rounded bg-amber-500/90 px-1.5 py-0.5 text-[7px] font-semibold text-white shadow whitespace-nowrap">
            ▭ {name}
          </div>
        </Html>
      )}

      {/* Tooltip only on hover */}
      {hovered && (
        <Html position={[0, h3d / 2 + 0.06, 0]} center style={{ pointerEvents: "none" }}>
          <div className="rounded-lg border bg-popover px-3 py-2 shadow-xl whitespace-nowrap backdrop-blur-sm min-w-[130px]">
            <p className="text-[11px] font-semibold text-popover-foreground flex items-center gap-1.5">
              <span className="text-amber-500">▭</span> {name || "Region"}
            </p>
            <div className="mt-1 flex items-center gap-3 text-[9px] text-muted-foreground">
              {(imageCount ?? 0) > 0 && (
                <span>📷 {imageCount} {imageCount === 1 ? "Bild" : "Bilder"}</span>
              )}
              {(findingCount ?? 0) > 0 && (
                <span>📋 {findingCount} {findingCount === 1 ? "Befund" : "Befunde"}</span>
              )}
              {(imageCount ?? 0) === 0 && (findingCount ?? 0) === 0 && (
                <span>Keine Einträge</span>
              )}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
});

/* ─── Convert 2D coords to 3D (approximate, used as raycast origin direction) ─── */
function coords2Dto3D(x: number, y: number, view?: "front" | "back"): [number, number, number] {
  const x3d = (x / 200) * 2 - 1;
  const y3d = 2.0 - (y / 500) * 3.5;
  const z3d = view === "back" ? -0.25 : 0.25;
  return [x3d, y3d, z3d];
}

/* ─── Surface projection helpers ─── */
function projectMarkerToBody(
  scene: THREE.Scene,
  approxPosition: [number, number, number],
  view?: "front" | "back",
): { point: THREE.Vector3; normal: THREE.Vector3 } | null {
  const bodyMeshes: THREE.Mesh[] = [];
  scene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh && (child as THREE.Mesh).userData?.isBodyMesh) {
      bodyMeshes.push(child as THREE.Mesh);
    }
  });

  if (bodyMeshes.length === 0) return null;

  const approx = new THREE.Vector3(...approxPosition);
  const preferredDirections = view === "back"
    ? [new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 0, 1)]
    : [new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1)];
  const rayDirections = [
    ...preferredDirections,
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(-1, 0, 0),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, -1, 0),
  ];

  const raycaster = new THREE.Raycaster();
  let bestHit: { point: THREE.Vector3; normal: THREE.Vector3; distance: number } | null = null;

  for (const fromDir of rayDirections) {
    const origin = approx.clone().addScaledVector(fromDir, 4);
    raycaster.set(origin, fromDir.clone().negate());
    const hits = raycaster.intersectObjects(bodyMeshes, true);

    for (const hit of hits) {
      const point = hit.point;
      const normal = hit.face
        ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize()
        : fromDir.clone().negate().normalize();
      const distance = point.distanceTo(approx);

      if (!bestHit || distance < bestHit.distance) {
        bestHit = { point, normal, distance };
      }
    }
  }

  return bestHit ? { point: bestHit.point, normal: bestHit.normal } : null;
}

/* ─── Surface-projected wrapper: keeps markers glued to body mesh ─── */
type SurfaceProjectedGroupProps = {
  approxPosition: [number, number, number];
  view?: "front" | "back";
  storedPosition?: [number, number, number];
  storedNormal?: [number, number, number];
  children: React.ReactNode;
};

const SurfaceProjectedGroup = React.forwardRef<THREE.Group, SurfaceProjectedGroupProps>(function SurfaceProjectedGroup(
  { approxPosition, view, storedPosition, storedNormal, children },
  forwardedRef,
) {
  const { scene, camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const projectedRef = useRef(false);
  const normalRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 1));

  const setGroupRef = useCallback((node: THREE.Group | null) => {
    groupRef.current = node;
    if (typeof forwardedRef === "function") {
      forwardedRef(node);
    } else if (forwardedRef) {
      (forwardedRef as React.MutableRefObject<THREE.Group | null>).current = node;
    }
  }, [forwardedRef]);

  useFrame(() => {
    if (!groupRef.current) return;

    // --- Projection (runs once until coordinates change) ---
    if (!projectedRef.current) {
      if (storedPosition) {
        groupRef.current.position.set(...storedPosition);
        if (storedNormal) {
          const normal = new THREE.Vector3(...storedNormal).normalize();
          normalRef.current.copy(normal);
          groupRef.current.position.addScaledVector(normal, 0.003);
          groupRef.current.lookAt(
            storedPosition[0] + normal.x,
            storedPosition[1] + normal.y,
            storedPosition[2] + normal.z,
          );
        }
        projectedRef.current = true;
      } else {
        const projected = projectMarkerToBody(scene, approxPosition, view);
        if (!projected) {
          groupRef.current.position.set(...approxPosition);
          return; // keep retrying until body mesh is ready
        }
        normalRef.current.copy(projected.normal);
        groupRef.current.position.copy(projected.point).addScaledVector(projected.normal, 0.003);
        groupRef.current.lookAt(
          projected.point.x + projected.normal.x,
          projected.point.y + projected.normal.y,
          projected.point.z + projected.normal.z,
        );
        projectedRef.current = true;
      }
    }

    // --- Occlusion: hide markers facing away from camera ---
    const markerPos = groupRef.current.position;
    const cameraDir = new THREE.Vector3().subVectors(camera.position, markerPos).normalize();
    const dot = normalRef.current.dot(cameraDir);
    // If the surface normal points away from the camera (dot < 0), the marker is on the far side
    groupRef.current.visible = dot > 0.05;
  });

  // Reset projection when source coordinates change
  useEffect(() => {
    projectedRef.current = false;
  }, [
    approxPosition[0],
    approxPosition[1],
    approxPosition[2],
    view,
    storedPosition?.[0],
    storedPosition?.[1],
    storedPosition?.[2],
    storedNormal?.[0],
    storedNormal?.[1],
    storedNormal?.[2],
  ]);

  return <group ref={setGroupRef}>{children}</group>;
});

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
function Scene({ markers, selectedLocationId, onMapClick, onMarkerClick, preset, gender, markMode, markType }: BodyMap3DProps & { preset: CameraPreset; gender: Gender; markMode: boolean; markType: MarkType }) {
  const handleBodyClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      if (!markMode) return;
      e.stopPropagation();
      const { x, y, view } = pointTo2D(e.point);

      const worldNormal = e.face
        ? e.face.normal.clone().transformDirection((e.object as THREE.Object3D).matrixWorld).normalize()
        : undefined;

      onMapClick?.(
        x,
        y,
        view,
        markType,
        [e.point.x, e.point.y, e.point.z],
        worldNormal ? [worldNormal.x, worldNormal.y, worldNormal.z] : undefined,
      );
    },
    [onMapClick, markMode, markType],
  );

  const spots = markers.filter((m) => m.type !== "region");
  const regions = markers.filter((m) => m.type === "region");

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

      {spots.map((m) => (
        <SurfaceProjectedGroup
          key={`spot-${m.id}`}
          approxPosition={coords2Dto3D(m.x, m.y, m.view)}
          view={m.view}
          storedPosition={m.x3d !== undefined && m.y3d !== undefined && m.z3d !== undefined ? [m.x3d, m.y3d, m.z3d] : undefined}
          storedNormal={m.nx !== undefined && m.ny !== undefined && m.nz !== undefined ? [m.nx, m.ny, m.nz] : undefined}
        >
          <SpotMarker
            position={[0, 0, 0]}
            name={m.name}
            isSelected={m.id === selectedLocationId}
            onClick={() => onMarkerClick?.(m.id)}
            imageCount={m.imageCount}
            findingCount={m.findingCount}
            classificationColor={m.classificationColor}
          />
        </SurfaceProjectedGroup>
      ))}

      {regions.map((m) => (
        <SurfaceProjectedGroup
          key={`region-${m.id}`}
          approxPosition={coords2Dto3D(m.x, m.y, m.view)}
          view={m.view}
          storedPosition={m.x3d !== undefined && m.y3d !== undefined && m.z3d !== undefined ? [m.x3d, m.y3d, m.z3d] : undefined}
          storedNormal={m.nx !== undefined && m.ny !== undefined && m.nz !== undefined ? [m.nx, m.ny, m.nz] : undefined}
        >
          <RegionMarker
            position={[0, 0, 0]}
            name={m.name}
            isSelected={m.id === selectedLocationId}
            onClick={() => onMarkerClick?.(m.id)}
            imageCount={m.imageCount}
            findingCount={m.findingCount}
            width={m.width ?? 40}
            height={m.height ?? 30}
          />
        </SurfaceProjectedGroup>
      ))}

      <CameraAnimator preset={preset} />
    </>
  );
}

/* ─── Main Component ─── */
const BodyMap3D: React.FC<BodyMap3DProps> = (props) => {
  const [activeRegion, setActiveRegion] = useState<Region>("full");
  const [markMode, setMarkMode] = useState(false);
  const [markType, setMarkType] = useState<MarkType>("spot");
  const gender = props.gender ?? "male";
  const preset = CAMERA_PRESETS[activeRegion];

  return (
    <div className="flex h-full flex-col">
      <div className={cn(
        "relative min-h-[300px] flex-1 overflow-hidden rounded-lg border bg-gradient-to-b from-muted/20 via-muted/40 to-muted/60",
        markMode && (markType === "region" ? "ring-2 ring-amber-500/50" : "ring-2 ring-primary/50")
      )}>
        <Canvas
          camera={{ position: preset.position, fov: 40, near: 0.1, far: 100 }}
          style={{ width: "100%", height: "100%", cursor: markMode ? "crosshair" : "grab" }}
          gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
          shadows
        >
          <Scene {...props} preset={preset} gender={gender} markMode={markMode} markType={markType} />
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

        {/* Bottom controls */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
          <button
            onClick={() => setActiveRegion("full")}
            className="flex h-7 items-center gap-1 rounded-md border border-border/50 bg-card/80 px-2 text-[10px] text-muted-foreground transition-all hover:text-foreground"
          >
            <RotateCcw className="h-3 w-3" /> Reset
          </button>

          {/* Spot mark mode toggle */}
          <button
            onClick={() => { setMarkMode(markType === "spot" ? !markMode : true); setMarkType("spot"); }}
            title="Spot markieren"
            className={cn(
              "flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[10px] font-medium transition-all",
              markMode && markType === "spot"
                ? "bg-primary text-primary-foreground shadow-md"
                : "border border-border/50 bg-card/80 text-muted-foreground hover:text-foreground"
            )}
          >
            <MapPin className="h-3 w-3" />
            Spot
          </button>

          {/* Region mark mode toggle */}
          <button
            onClick={() => { setMarkMode(markType === "region" ? !markMode : true); setMarkType("region"); }}
            title="Region markieren"
            className={cn(
              "flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[10px] font-medium transition-all",
              markMode && markType === "region"
                ? "bg-amber-500 text-white shadow-md"
                : "border border-border/50 bg-card/80 text-muted-foreground hover:text-foreground"
            )}
          >
            <Square className="h-3 w-3" />
            Region
          </button>
        </div>

        {/* Mark mode indicator */}
        {markMode && (
          <div className={cn(
            "absolute top-2 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[10px] font-semibold shadow-lg animate-pulse",
            markType === "region"
              ? "bg-amber-500 text-white"
              : "bg-primary text-primary-foreground"
          )}>
            {markType === "region"
              ? "Klicken um Region-Mittelpunkt zu setzen"
              : "Klicken um Spot zu setzen"
            }
          </div>
        )}

        {/* 3D Badge */}
        <div className="absolute left-2 top-2 rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
          3D
        </div>
      </div>

      <p className="mt-2 text-center text-[10px] text-muted-foreground">
        {markMode
          ? markType === "region"
            ? "Region-Modus: Klicken für Mittelpunkt · Nochmal klicken zum Beenden"
            : "Spot-Modus: Klicken um Spot zu setzen · Nochmal klicken zum Beenden"
          : "Drehen & Zoomen · «Spot» oder «Region» zum Markieren"
        }
      </p>
    </div>
  );
};

export default BodyMap3D;
