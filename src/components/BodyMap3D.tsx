import React, { useRef, useState, useCallback, useMemo, Suspense, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Canvas, useFrame, useThree, ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Html, useGLTF, Center } from "@react-three/drei";
import * as THREE from "three";
import { cn } from "@/lib/utils";
import i18n from "@/i18n";
import { RotateCcw, Eye, Hand, Footprints, User, Shirt, CircleDot, ArrowDown, MapPin, Square, Filter } from "lucide-react";
import type { LesionClassification } from "@/types/patient";
import { LESION_CLASSIFICATIONS } from "@/types/patient";
import { getAnatomicalName } from "@/lib/anatomyLookup";
import { translateAnatomyName } from "@/lib/anatomyTranslation";

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
type MarkType = "spot" | "region" | "zone";

interface PreviewMarker {
  x: number;
  y: number;
  view: "front" | "back";
  type: "spot" | "region";
  width?: number;
  height?: number;
  x3d?: number;
  y3d?: number;
  z3d?: number;
  nx?: number;
  ny?: number;
  nz?: number;
}

interface BodyMap3DProps {
  markers: Marker[];
  selectedLocationId: number | null;
  gender?: Gender;
  classificationFilter?: LesionClassification[];
  onFilterChange?: (filter: LesionClassification[]) => void;
  previewMarker?: PreviewMarker | null;
  isPlacementMode?: boolean;
  onPreviewMove?: (
    x: number,
    y: number,
    view: "front" | "back",
    point3d: [number, number, number],
    normal3d: [number, number, number],
  ) => void;
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
  full: { position: [0, 0, 3.5], target: [0, 0, 0], label: "bodyMap.fullBody", icon: User },
  head: { position: [0, 1.15, 0.8], target: [0, 1.15, 0], label: "bodyMap.head", icon: Eye },
  torso: { position: [0, 0.35, 1.4], target: [0, 0.35, 0], label: "bodyMap.torso", icon: Shirt },
  left_arm: { position: [-0.8, 0.4, 1.0], target: [-0.35, 0.4, 0], label: "bodyMap.leftArm", icon: Hand },
  right_arm: { position: [0.8, 0.4, 1.0], target: [0.35, 0.4, 0], label: "bodyMap.rightArm", icon: Hand },
  hands: { position: [0, -0.2, 0.8], target: [0, -0.2, 0], label: "bodyMap.hands", icon: CircleDot },
  legs: { position: [0, -0.7, 1.6], target: [0, -0.7, 0], label: "bodyMap.legs", icon: Footprints },
  knees: { position: [0, -0.9, 0.9], target: [0, -0.9, 0], label: "bodyMap.knees", icon: ArrowDown },
  feet: { position: [0, -1.35, 0.7], target: [0, -1.35, 0], label: "bodyMap.feet", icon: Footprints },
  back: { position: [0, 0, -3.5], target: [0, 0, 0], label: "bodyMap.back", icon: User },
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
function BodyModel({ onBodyClick, onBodyPointerMove, gender }: { onBodyClick: (e: ThreeEvent<MouseEvent>) => void; onBodyPointerMove?: (e: ThreeEvent<PointerEvent>) => void; gender: Gender }) {
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
      <primitive object={clonedScene} onClick={onBodyClick} onPointerMove={onBodyPointerMove} scale={normalizedScale} />
    </Center>
  );
}

useGLTF.preload(FEMALE_MODEL_URL);
useGLTF.preload(MALE_MODEL_URL);

/* ─── Spot Marker (Leader-line style: crosshair + numbered badge) ─── */
const HIGH_RISK_CLASSIFICATIONS: LesionClassification[] = ["melanoma_suspect", "scc"];

type SpotMarkerProps = {
  position: [number, number, number];
  name?: string;
  index?: number;
  isSelected: boolean;
  onClick: () => void;
  imageCount?: number;
  findingCount?: number;
  classificationColor?: string;
  isHighRisk?: boolean;
};

const SpotMarker = React.forwardRef<THREE.Group, SpotMarkerProps>(function SpotMarker(
  { position, name, index, isSelected, onClick, imageCount, findingCount, classificationColor, isHighRisk },
  forwardedRef,
) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const lastTapRef = useRef<number>(0);

  const handleDoubleTap = useCallback((e: ThreeEvent<PointerEvent>) => {
    const now = Date.now();
    if (now - lastTapRef.current < 400) {
      e.stopPropagation();
      onClick();
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  }, [onClick]);

  useFrame(() => {
    if (!groupRef.current) return;
    if (isHighRisk && !isSelected) {
      groupRef.current.scale.setScalar(1 + Math.sin(Date.now() * 0.006) * 0.18);
    } else if (isSelected) {
      groupRef.current.scale.setScalar(1 + Math.sin(Date.now() * 0.004) * 0.1);
    } else {
      groupRef.current.scale.setScalar(hovered ? 1.15 : 1);
    }
  });

  const baseColor = classificationColor || "#64748b";
  const color = isSelected ? "#0ea5e9" : hovered ? baseColor : baseColor;

  // Crosshair arm length and thickness
  const armLen = isSelected ? 0.022 : 0.016;
  const armThick = isSelected ? 0.003 : 0.002;

  // Leader-line offset (badge floats above-right or above-left)
  const labelOffsetX = 0.06;
  const labelOffsetY = 0.06;

  return (
    <group ref={forwardedRef} position={position}>
      <group
        ref={groupRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerDown={handleDoubleTap}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        {/* Crosshair: horizontal bar */}
        <mesh>
          <planeGeometry args={[armLen * 2, armThick]} />
          <meshBasicMaterial color={color} transparent opacity={isSelected ? 1.0 : 0.85} side={THREE.DoubleSide} depthTest={false} />
        </mesh>
        {/* Crosshair: vertical bar */}
        <mesh>
          <planeGeometry args={[armThick, armLen * 2]} />
          <meshBasicMaterial color={color} transparent opacity={isSelected ? 1.0 : 0.85} side={THREE.DoubleSide} depthTest={false} />
        </mesh>

        {/* Selected: outer highlight circle (subtle) */}
        {isSelected && (
          <mesh>
            <ringGeometry args={[0.028, 0.032, 32]} />
            <meshBasicMaterial color="#0ea5e9" transparent opacity={0.4} side={THREE.DoubleSide} depthTest={false} />
          </mesh>
        )}

        {/* High-risk outer glow */}
        {isHighRisk && !isSelected && (
          <mesh>
            <ringGeometry args={[0.020, 0.026, 32]} />
            <meshBasicMaterial color="#ef4444" transparent opacity={0.3 + Math.sin(Date.now() * 0.005) * 0.15} side={THREE.DoubleSide} depthTest={false} />
          </mesh>
        )}

        {/* Invisible click target – large enough for touch */}
        <mesh>
          <circleGeometry args={[0.08, 16]} />
          <meshBasicMaterial transparent opacity={0} side={THREE.DoubleSide} depthTest={false} />
        </mesh>
      </group>

      {/* Leader line + numbered badge (Html overlay) */}
      <Html position={[0, 0, 0]} center={false} style={{ pointerEvents: "auto" }}>
        <svg
          width="80" height="80"
          viewBox="-40 -40 80 80"
          style={{ position: "absolute", left: "-40px", top: "-40px", pointerEvents: "none", overflow: "visible" }}
        >
          {/* Dashed leader line from center (crosshair) to badge */}
          <line
            x1="0" y1="0"
            x2="28" y2="-28"
            stroke={color}
            strokeWidth="1"
            strokeDasharray="3,2"
            opacity={isSelected ? 0.9 : 0.6}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            left: "22px",
            top: "-42px",
            pointerEvents: "auto",
            cursor: "pointer",
            padding: "6px",
            margin: "-6px",
          }}
          onClick={(e) => { e.stopPropagation(); onClick(); }}
        >
          <div
            className={cn(
              "flex items-center justify-center rounded-full text-[8px] font-bold shadow-md border",
              isSelected
                ? "bg-sky-500 text-white border-sky-400 min-w-[18px] h-[18px]"
                : isHighRisk
                  ? "bg-destructive text-white border-red-400 min-w-[16px] h-[16px]"
                  : "bg-card text-foreground border-border min-w-[16px] h-[16px]"
            )}
            style={{ borderColor: isSelected ? undefined : color }}
          >
            {index != null ? index + 1 : "•"}
          </div>
        </div>
      </Html>

      {/* Tooltip only on hover */}
      {hovered && (
        <Html position={[0, 0.065, 0]} center style={{ pointerEvents: "none" }}>
          <div className="rounded-lg border bg-popover px-3 py-2 shadow-xl whitespace-nowrap backdrop-blur-sm min-w-[120px]">
            <p className="text-[11px] font-semibold text-popover-foreground flex items-center gap-1.5">
              {name || "Spot"}
              {isHighRisk && (
                <span className="inline-flex items-center gap-0.5 rounded bg-destructive/15 px-1 py-0.5 text-[8px] font-bold text-destructive">
                  ⚠️ HIGH RISK
                </span>
              )}
            </p>
            <div className="mt-1 flex items-center gap-3 text-[9px] text-muted-foreground">
              {(imageCount ?? 0) > 0 && (
                <span className="flex items-center gap-0.5">
                  📷 {imageCount} {imageCount === 1 ? i18n.t('common.image') : i18n.t('common.images')}
                </span>
              )}
              {(findingCount ?? 0) > 0 && (
                <span className="flex items-center gap-0.5">
                  📋 {findingCount} {findingCount === 1 ? i18n.t('common.findings').slice(0, -1) : i18n.t('common.findings')}
                </span>
              )}
              {(imageCount ?? 0) === 0 && (findingCount ?? 0) === 0 && (
                <span>{i18n.t('bodyMap.noEntries')}</span>
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
  const lastTapRef = useRef<number>(0);

  const handleDoubleTap = useCallback((e: ThreeEvent<PointerEvent>) => {
    const now = Date.now();
    if (now - lastTapRef.current < 400) {
      e.stopPropagation();
      onClick();
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  }, [onClick]);

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
        onPointerDown={handleDoubleTap}
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
                <span>📷 {imageCount} {imageCount === 1 ? i18n.t('common.image') : i18n.t('common.images')}</span>
              )}
              {(findingCount ?? 0) > 0 && (
                <span>📋 {findingCount} {findingCount === 1 ? i18n.t('common.findings').slice(0, -1) : i18n.t('common.findings')}</span>
              )}
              {(imageCount ?? 0) === 0 && (findingCount ?? 0) === 0 && (
                <span>{i18n.t('bodyMap.noEntries')}</span>
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
          const rawNormal = new THREE.Vector3(...storedNormal);
          const normal = rawNormal.lengthSq() > 0.0001
            ? rawNormal.normalize()
            : new THREE.Vector3(0, 0, 1);
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
function CameraAnimator({ preset, resetKey, disableControls }: { preset: Pick<CameraPreset, "position" | "target">; resetKey?: number; disableControls?: boolean }) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const targetPositionRef = useRef(new THREE.Vector3(...preset.position));
  const targetLookAtRef = useRef(new THREE.Vector3(...preset.target));
  const isAnimatingRef = useRef(true);

  useEffect(() => {
    targetPositionRef.current.set(...preset.position);
    targetLookAtRef.current.set(...preset.target);
    isAnimatingRef.current = true;
  }, [preset, resetKey]);

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
      enablePan={!disableControls}
      enableZoom
      enableRotate={!disableControls}
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

/* ─── Draggable Spot Preview: drag directly on body surface ─── */
function DraggableSpotPreview({
  initialPosition,
  view,
  storedPosition,
  storedNormal,
  onMove,
  onDragStateChange,
}: {
  initialPosition: [number, number, number];
  view: "front" | "back";
  storedPosition?: [number, number, number];
  storedNormal?: [number, number, number];
  onMove?: (x: number, y: number, view: "front" | "back", point3d: [number, number, number], normal3d: [number, number, number]) => void;
  onDragStateChange?: (dragging: boolean) => void;
}) {
  const { scene, camera, raycaster, pointer, gl } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hovered, setHovered] = useState(false);
  const initializedRef = useRef(false);
  const normalRef = useRef(new THREE.Vector3(0, 0, 1));
  // Store the actual 3D position internally – this is the source of truth
  const position3dRef = useRef(new THREE.Vector3());

  // Helper: find body meshes
  const getBodyMeshes = useCallback(() => {
    const meshes: THREE.Mesh[] = [];
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh && (child as THREE.Mesh).userData?.isBodyMesh) {
        meshes.push(child as THREE.Mesh);
      }
    });
    return meshes;
  }, [scene]);

  // Helper: orient marker to face along surface normal
  const orientToNormal = useCallback((group: THREE.Group, pos: THREE.Vector3, normal: THREE.Vector3) => {
    group.position.copy(pos).addScaledVector(normal, 0.004);
    group.lookAt(pos.x + normal.x, pos.y + normal.y, pos.z + normal.z);
  }, []);

  // One-time initialization: project to body surface
  useFrame(() => {
    if (!groupRef.current) return;

    // --- INITIALIZE (once) ---
    if (!initializedRef.current) {
      if (storedPosition && storedNormal) {
        // We have exact 3D coords – use them directly
        const pos = new THREE.Vector3(...storedPosition);
        const nrm = new THREE.Vector3(...storedNormal).normalize();
        position3dRef.current.copy(pos);
        normalRef.current.copy(nrm);
        orientToNormal(groupRef.current, pos, nrm);
        initializedRef.current = true;
      } else {
        // Project from approximate 2D coords to body surface
        const projected = projectMarkerToBody(scene, initialPosition, view);
        if (!projected) {
          groupRef.current.position.set(...initialPosition);
          return; // body mesh not ready yet, try again next frame
        }
        position3dRef.current.copy(projected.point);
        normalRef.current.copy(projected.normal);
        orientToNormal(groupRef.current, projected.point, projected.normal);
        initializedRef.current = true;
        // Report the projected 3D position back
        const { x, y, view: v } = pointTo2D(projected.point);
        onMove?.(x, y, v,
          [projected.point.x, projected.point.y, projected.point.z],
          [projected.normal.x, projected.normal.y, projected.normal.z],
        );
      }
    }

    // --- DRAG: raycast from pointer to body surface ---
    if (isDragging) {
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(getBodyMeshes(), true);
      if (hits.length > 0) {
        const hit = hits[0];
        const normal = hit.face
          ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize()
          : normalRef.current.clone();
        position3dRef.current.copy(hit.point);
        normalRef.current.copy(normal);
        orientToNormal(groupRef.current, hit.point, normal);
        const { x, y, view: hitView } = pointTo2D(hit.point);
        onMove?.(x, y, hitView,
          [hit.point.x, hit.point.y, hit.point.z],
          [normal.x, normal.y, normal.z],
        );
      }
    }

    // --- OCCLUSION: hide when facing away from camera ---
    if (initializedRef.current && !isDragging) {
      const cameraDir = new THREE.Vector3().subVectors(camera.position, position3dRef.current).normalize();
      const dot = normalRef.current.dot(cameraDir);
      groupRef.current.visible = dot > 0.05;
    } else {
      if (groupRef.current) groupRef.current.visible = true;
    }

    // Pulse animation
    const scale = isDragging ? 1.3 : hovered ? 1.2 : 1 + Math.sin(Date.now() * 0.004) * 0.1;
    groupRef.current.scale.setScalar(scale);
  });

  // Notify parent of drag state changes
  useEffect(() => {
    onDragStateChange?.(isDragging);
  }, [isDragging, onDragStateChange]);

  // Global pointer up listener for drag end
  useEffect(() => {
    if (!isDragging) return;
    const handleUp = () => setIsDragging(false);
    gl.domElement.addEventListener("pointerup", handleUp);
    gl.domElement.style.cursor = "grabbing";
    return () => {
      gl.domElement.removeEventListener("pointerup", handleUp);
      gl.domElement.style.cursor = "";
    };
  }, [isDragging, gl]);

  return (
    <group ref={groupRef}>
      <group
        onPointerDown={(e) => {
          e.stopPropagation();
          setIsDragging(true);
        }}
        onPointerOver={() => { setHovered(true); gl.domElement.style.cursor = "grab"; }}
        onPointerOut={() => { setHovered(false); if (!isDragging) gl.domElement.style.cursor = ""; }}
      >
        {/* Outer glow ring */}
        <mesh>
          <ringGeometry args={[0.038, 0.05, 48]} />
          <meshBasicMaterial color="#22c55e" transparent opacity={isDragging ? 0.6 : 0.3} side={THREE.DoubleSide} depthTest={false} />
        </mesh>
        {/* Main ring */}
        <mesh>
          <ringGeometry args={[0.028, 0.038, 48]} />
          <meshBasicMaterial color="#22c55e" transparent opacity={0.9} side={THREE.DoubleSide} depthTest={false} />
        </mesh>
        {/* Center dot */}
        <mesh>
          <circleGeometry args={[0.008, 16]} />
          <meshBasicMaterial color="#22c55e" transparent opacity={0.8} side={THREE.DoubleSide} depthTest={false} />
        </mesh>
        {/* Large invisible click target */}
        <mesh>
          <circleGeometry args={[0.07, 16]} />
          <meshBasicMaterial transparent opacity={0} side={THREE.DoubleSide} depthTest={false} />
        </mesh>
      </group>

      {/* Label */}
      <Html position={[0, 0.065, 0]} center style={{ pointerEvents: "none" }}>
        <div className={cn(
          "rounded-lg border px-2.5 py-1 shadow-lg whitespace-nowrap backdrop-blur-sm text-[10px] font-semibold",
          isDragging
            ? "bg-green-500 text-white border-green-400"
            : "bg-card/90 text-foreground border-border/50"
        )}>
          {isDragging ? i18n.t('bodyMap.releaseToPlace') : i18n.t('bodyMap.dragToMove')}
        </div>
      </Html>
    </group>
  );
}

/* ─── Loading Spinner ─── */
function LoadingFallback() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-[10px] text-muted-foreground">{i18n.t('bodyMap.loading3D')}</span>
      </div>
    </Html>
  );
}

/* ─── Scene ─── */
function Scene({ markers, selectedLocationId, onMapClick, onMarkerClick, classificationFilter, previewMarker, isPlacementMode, onPreviewMove, preset, gender, markMode, markType, resetKey }: BodyMap3DProps & { preset: CameraPreset; gender: Gender; markMode: boolean; markType: MarkType; resetKey: number }) {
  const [isDraggingSpot, setIsDraggingSpot] = useState(false);
  const [hoverInfo, setHoverInfo] = useState<{ point: THREE.Vector3; y3d: number; x3d: number; z3d: number; zone: string } | null>(null);

  const handleBodyPointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!markMode) {
        setHoverInfo(null);
        return;
      }
      const view: "front" | "back" = e.point.z >= 0 ? "front" : "back";
      const zoneName = getAnatomicalName(e.point.x, e.point.y, e.point.z, view);
      setHoverInfo({ point: e.point.clone(), y3d: e.point.y, x3d: e.point.x, z3d: e.point.z, zone: zoneName });
    },
    [markMode],
  );

  const handleBodyClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      if (!markMode) return;
      if (isPlacementMode) return;
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
    [onMapClick, markMode, markType, isPlacementMode],
  );

  const hasFilter = classificationFilter && classificationFilter.length > 0;

  const filteredMarkers = hasFilter
    ? markers.filter((m) => {
        const cls = (m.classification as LesionClassification) || "unclassified";
        return classificationFilter!.includes(cls);
      })
    : markers;

  const spots = filteredMarkers.filter((m) => m.type !== "region");
  const regions = filteredMarkers.filter((m) => m.type === "region");

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 5, 4]} intensity={0.9} castShadow shadow-mapSize={1024} />
      <directionalLight position={[-2, 3, -3]} intensity={0.3} />
      <directionalLight position={[0, -1, 2]} intensity={0.15} />
      <hemisphereLight args={["#b1e1ff", "#b97a20", 0.3]} />

      <Suspense fallback={<LoadingFallback />}>
        <BodyModel onBodyClick={handleBodyClick} onBodyPointerMove={handleBodyPointerMove} gender={gender} />
      </Suspense>

      {/* Debug coordinate overlay — visible only in mark mode */}
      {markMode && hoverInfo && (
        <Html position={[hoverInfo.point.x, hoverInfo.point.y + 0.08, hoverInfo.point.z]} center style={{ pointerEvents: "none" }}>
          <div className="rounded-md border bg-card/95 px-2 py-1 shadow-lg backdrop-blur-sm whitespace-nowrap">
            <p className="text-[11px] font-semibold text-foreground">{translateAnatomyName(hoverInfo.zone)}</p>
          </div>
        </Html>
      )}

      {spots.map((m, i) => {
        const cls = (m.classification as LesionClassification) || "unclassified";
        const isHighRisk = HIGH_RISK_CLASSIFICATIONS.includes(cls);
        const hasCoords = m.x != null && m.y != null;
        if (!hasCoords && m.x3d == null) return null; // skip markers without any position
        return (
          <SurfaceProjectedGroup
            key={`spot-${m.id}`}
            approxPosition={hasCoords ? coords2Dto3D(m.x, m.y, m.view) : [m.x3d!, m.y3d!, m.z3d!]}
            view={m.view}
            storedPosition={m.x3d != null && m.y3d != null && m.z3d != null ? [m.x3d, m.y3d, m.z3d] : undefined}
            storedNormal={m.nx != null && m.ny != null && m.nz != null && (m.nx !== 0 || m.ny !== 0 || m.nz !== 0) ? [m.nx, m.ny, m.nz] : undefined}
          >
            <SpotMarker
              position={[0, 0, 0]}
              name={translateAnatomyName(m.name)}
              index={i}
              isSelected={m.id === selectedLocationId}
              onClick={() => onMarkerClick?.(m.id)}
              imageCount={m.imageCount}
              findingCount={m.findingCount}
              classificationColor={m.classificationColor}
              isHighRisk={isHighRisk}
            />
          </SurfaceProjectedGroup>
        );
      })}

      {regions.map((m) => {
        const hasCoords = m.x != null && m.y != null;
        if (!hasCoords && m.x3d == null) return null;
        return (
          <SurfaceProjectedGroup
            key={`region-${m.id}`}
            approxPosition={hasCoords ? coords2Dto3D(m.x, m.y, m.view) : [m.x3d!, m.y3d!, m.z3d!]}
            view={m.view}
            storedPosition={m.x3d != null && m.y3d != null && m.z3d != null ? [m.x3d, m.y3d, m.z3d] : undefined}
            storedNormal={m.nx != null && m.ny != null && m.nz != null ? [m.nx, m.ny, m.nz] : undefined}
          >
            <RegionMarker
              position={[0, 0, 0]}
              name={translateAnatomyName(m.name)}
              isSelected={m.id === selectedLocationId}
              onClick={() => onMarkerClick?.(m.id)}
              imageCount={m.imageCount}
              findingCount={m.findingCount}
              width={m.width ?? 40}
              height={m.height ?? 30}
            />
          </SurfaceProjectedGroup>
        );
      })}

      {/* Draggable preview marker for spot placement */}
      {previewMarker && previewMarker.type === "spot" && (
        <DraggableSpotPreview
          initialPosition={coords2Dto3D(previewMarker.x, previewMarker.y, previewMarker.view)}
          view={previewMarker.view}
          storedPosition={previewMarker.x3d !== undefined && previewMarker.y3d !== undefined && previewMarker.z3d !== undefined ? [previewMarker.x3d, previewMarker.y3d, previewMarker.z3d] : undefined}
          storedNormal={previewMarker.nx !== undefined && previewMarker.ny !== undefined && previewMarker.nz !== undefined ? [previewMarker.nx, previewMarker.ny, previewMarker.nz] : undefined}
          onMove={onPreviewMove}
          onDragStateChange={setIsDraggingSpot}
        />
      )}

      {/* Region preview (not draggable, uses size sliders) */}
      {previewMarker && previewMarker.type === "region" && (
        <SurfaceProjectedGroup
          key={`preview-region-${previewMarker.x}-${previewMarker.y}-${previewMarker.view}`}
          approxPosition={coords2Dto3D(previewMarker.x, previewMarker.y, previewMarker.view)}
          view={previewMarker.view}
        >
          <RegionMarker
            position={[0, 0, 0]}
            name={i18n.t('patientDetail.newRegion')}
            isSelected={true}
            onClick={() => {}}
            width={previewMarker.width ?? 40}
            height={previewMarker.height ?? 30}
          />
        </SurfaceProjectedGroup>
      )}

      <CameraAnimator preset={preset} resetKey={resetKey} disableControls={isDraggingSpot} />
    </>
  );
}

/* ─── Main Component ─── */
const BodyMap3D: React.FC<BodyMap3DProps> = (props) => {
  const [activeRegion, setActiveRegion] = useState<Region>("full");
  const [resetCounter, setResetCounter] = useState(0);
  const [markMode, setMarkMode] = useState(false);
  const [markType, setMarkType] = useState<MarkType>("spot");
  const [placementAnchor, setPlacementAnchor] = useState<{ x: number; y: number; view: "front" | "back" } | null>(null);
  const gender = props.gender ?? "male";
  // Track selection changes to force camera re-animation
  const [focusKey, setFocusKey] = useState(0);
  const prevSelectedRef = useRef<number | null>(null);

  // Freeze camera anchor during placement so camera won't jump while marker moves
  useEffect(() => {
    if (!props.isPlacementMode) {
      setPlacementAnchor(null);
      return;
    }

    if (props.previewMarker && !placementAnchor) {
      setPlacementAnchor({ x: props.previewMarker.x, y: props.previewMarker.y, view: props.previewMarker.view });
    }
  }, [props.isPlacementMode, props.previewMarker, placementAnchor]);

  // Clear reset flag AND bump focusKey when a marker is selected (even re-selecting same one)
  useEffect(() => {
    if (props.selectedLocationId != null) {
      setResetCounter(0);
      setActiveRegion("full");
      setFocusKey(k => k + 1);
    }
    prevSelectedRef.current = props.selectedLocationId;
  }, [props.selectedLocationId]);

  // Compute camera preset once per placement session (not on every drag move)
  const placementPreset = useMemo<CameraPreset | null>(() => {
    if (!props.isPlacementMode || !placementAnchor) return null;
    const pos3d = coords2Dto3D(placementAnchor.x, placementAnchor.y, placementAnchor.view);
    const zDir = placementAnchor.view === "back" ? -1 : 1;
    return {
      position: [pos3d[0] * 0.5, pos3d[1], pos3d[2] + zDir * 1.2] as [number, number, number],
      target: [pos3d[0] * 0.5, pos3d[1], 0] as [number, number, number],
      label: "Platzierung",
      icon: MapPin,
    };
  }, [props.isPlacementMode, placementAnchor]);

  // Auto-focus camera on the selected marker when clicking in the sidebar
  const selectedMarkerPreset = useMemo<CameraPreset | null>(() => {
    if (props.isPlacementMode) return null;
    if (resetCounter > 0 && activeRegion === "full") return null;
    if (props.selectedLocationId == null) return null;
    const marker = props.markers.find((m) => m.id === props.selectedLocationId);
    if (!marker) return null;

    const toFiniteNumber = (value: unknown): number | null => {
      const parsed = typeof value === "number" ? value : Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    };

    // Use stored 3D coords if available, otherwise approximate from 2D
    let pos3d: [number, number, number];
    let view = marker.view ?? "front";
    const x3d = toFiniteNumber(marker.x3d);
    const y3d = toFiniteNumber(marker.y3d);
    const z3d = toFiniteNumber(marker.z3d);

    if (x3d != null && y3d != null && z3d != null) {
      pos3d = [x3d, y3d, z3d];
    } else {
      const x2d = toFiniteNumber(marker.x);
      const y2d = toFiniteNumber(marker.y);
      if (x2d == null || y2d == null) {
        return null;
      }
      pos3d = coords2Dto3D(x2d, y2d, view);
    }

    const zDir = view === "back" ? -1 : 1;
    const rawNormal = new THREE.Vector3(
      toFiniteNumber(marker.nx) ?? 0,
      toFiniteNumber(marker.ny) ?? 0,
      toFiniteNumber(marker.nz) ?? 0,
    );
    const normal = rawNormal.lengthSq() > 0.0001
      ? rawNormal.normalize()
      : new THREE.Vector3(0, 0, zDir);

    return {
      position: [
        pos3d[0] + normal.x * 1.2,
        pos3d[1] + normal.y * 1.2,
        pos3d[2] + normal.z * 1.2,
      ] as [number, number, number],
      target: [pos3d[0], pos3d[1], pos3d[2]] as [number, number, number],
      label: "Spot-Fokus",
      icon: MapPin,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.isPlacementMode, props.selectedLocationId, props.markers, resetCounter, activeRegion, focusKey]);

  const preset = placementPreset ?? selectedMarkerPreset ?? CAMERA_PRESETS[activeRegion];

  return (
    <div className="flex h-full flex-col" style={{ isolation: "isolate", position: "relative", zIndex: 0 }}>
      <div className={cn(
        "relative min-h-[300px] flex-1 overflow-hidden rounded-lg border bg-gradient-to-b from-muted/20 via-muted/40 to-muted/60",
        markMode && (markType === "region" ? "ring-2 ring-amber-500/50" : "ring-2 ring-primary/50"),
        props.isPlacementMode && "ring-2 ring-green-500/50"
      )}>
        <Canvas
          camera={{ position: preset.position, fov: 40, near: 0.1, far: 100 }}
          style={{ width: "100%", height: "100%", cursor: props.isPlacementMode ? "default" : markMode ? "crosshair" : "grab" }}
          gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
          shadows
        >
          <Scene {...props} preset={preset} gender={gender} markMode={markMode} markType={markType} resetKey={resetCounter + focusKey} />
        </Canvas>

        {/* Gender indicator */}
        <div className="absolute left-2 top-10 rounded-md border border-border/50 bg-card/85 px-2 py-1 text-[10px] font-semibold text-muted-foreground">
          {gender === "female" ? `♀ ${i18n.t('common.female')}` : `♂ ${i18n.t('common.male')}`}
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
            onClick={() => { setActiveRegion("full"); setResetCounter(c => c + 1); setFocusKey(k => k + 1); if (props.onMarkerClick) props.onMarkerClick(undefined as any); }}
            className="flex h-7 items-center gap-1 rounded-md border border-border/50 bg-card/80 px-2 text-[10px] text-muted-foreground transition-all hover:text-foreground"
          >
            <RotateCcw className="h-3 w-3" /> {i18n.t('common.reset')}
          </button>

          {/* Spot mark mode toggle */}
          <button
            onClick={() => { setMarkMode(markType === "spot" ? !markMode : true); setMarkType("spot"); }}
            title={i18n.t('bodyMap3d.markSpot')}
            className={cn(
              "flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[10px] font-medium transition-all",
              markMode && markType === "spot"
                ? "bg-primary text-primary-foreground shadow-md"
                : "border border-border/50 bg-card/80 text-muted-foreground hover:text-foreground"
            )}
          >
            <MapPin className="h-3 w-3" />
            {i18n.t('bodyMap.spotMode')}
          </button>

          {/* Zone mark mode toggle */}
          <button
            onClick={() => { setMarkMode(markType === "zone" ? !markMode : true); setMarkType("zone"); }}
            title={i18n.t('bodyMap3d.markZone', { defaultValue: 'Mark zone' })}
            className={cn(
              "flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[10px] font-medium transition-all",
              markMode && markType === "zone"
                ? "bg-blue-600 text-white shadow-md"
                : "border border-border/50 bg-card/80 text-muted-foreground hover:text-foreground"
            )}
          >
            <Camera className="h-3 w-3" />
            Zone
          </button>

        </div>

        {/* Mark mode indicator */}
        {markMode && (
          <div className={cn(
            "absolute top-2 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[10px] font-semibold shadow-lg animate-pulse",
            markType === "region"
              ? "bg-amber-500 text-white"
              : markType === "zone"
              ? "bg-blue-600 text-white"
              : "bg-primary text-primary-foreground"
          )}>
            {markType === "region"
              ? i18n.t('bodyMap.clickToSetRegion', { defaultValue: 'Click to set region center' })
              : markType === "zone"
              ? i18n.t('bodyMap.clickToSetZone', { defaultValue: 'Click to place zone' })
              : i18n.t('bodyMap.clickToSetSpot', { defaultValue: 'Click to place spot' })
            }
          </div>
        )}

        {/* 3D Badge */}
        <div className="absolute left-2 top-2 rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
          3D
        </div>

        {/* Classification Legend / Filter */}
        {(() => {
          const classificationCounts: Partial<Record<LesionClassification, number>> = {};
          props.markers.filter(m => m.type !== "region").forEach(m => {
            const cls = (m.classification as LesionClassification) || "unclassified";
            classificationCounts[cls] = (classificationCounts[cls] || 0) + 1;
          });
          const activeClasses = Object.keys(classificationCounts) as LesionClassification[];
          if (activeClasses.length <= 1) return null;

          const filter = props.classificationFilter ?? [];
          const hasFilter = filter.length > 0;

          return (
            <div className="absolute bottom-10 left-2 rounded-lg border border-border/50 bg-card/90 backdrop-blur-sm p-1.5 space-y-0.5 max-w-[140px]">
              <div className="flex items-center justify-between px-1 mb-0.5">
                <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Filter className="h-2.5 w-2.5" /> {i18n.t('bodyMap.filter')}
                </span>
                {hasFilter && (
                  <button
                    onClick={() => props.onFilterChange?.([])}
                    className="text-[8px] text-primary hover:underline"
                  >
                    {i18n.t('common.all')}
                  </button>
                )}
              </div>
              {activeClasses.map((cls) => {
                const info = LESION_CLASSIFICATIONS[cls];
                const isFiltered = hasFilter && !filter.includes(cls);
                const isHighRisk = HIGH_RISK_CLASSIFICATIONS.includes(cls);
                return (
                  <button
                    key={cls}
                    onClick={() => {
                      if (!hasFilter) {
                        props.onFilterChange?.([cls]);
                      } else if (filter.includes(cls)) {
                        const next = filter.filter(f => f !== cls);
                        props.onFilterChange?.(next);
                      } else {
                        props.onFilterChange?.([...filter, cls]);
                      }
                    }}
                    className={cn(
                      "flex w-full items-center gap-1.5 rounded px-1.5 py-0.5 text-[9px] font-medium transition-all",
                      isFiltered ? "opacity-30 line-through" : "opacity-100 hover:bg-muted/50"
                    )}
                  >
                    <span
                      className={cn("h-2 w-2 rounded-full shrink-0", isHighRisk && !isFiltered && "animate-pulse")}
                      style={{ backgroundColor: info.color }}
                    />
                    <span className="truncate text-foreground">{info.shortLabel}</span>
                    <span className="ml-auto text-muted-foreground">{classificationCounts[cls]}</span>
                  </button>
                );
              })}
            </div>
          );
        })()}
      </div>

      <p className="mt-2 text-center text-[10px] text-muted-foreground">
        {markMode
          ? markType === "region"
            ? i18n.t('bodyMap.regionModeHelp', { defaultValue: 'Region mode: Click for center · Click again to finish' })
            : i18n.t('bodyMap.spotModeHelp', { defaultValue: 'Spot mode: Click to place · Click again to finish' })
          : i18n.t('bodyMap.defaultHelp', { defaultValue: 'Rotate & zoom · Click "Spot" or "Region" to mark' })
        }
      </p>
    </div>
  );
};

export default BodyMap3D;
