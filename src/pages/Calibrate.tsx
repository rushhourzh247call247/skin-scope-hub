import React, { useRef, useState, useMemo, Suspense, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Canvas, useThree, ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Html, useGLTF, Center } from "@react-three/drei";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Download, RotateCcw, Copy } from "lucide-react";
import { getAnatomicalName } from "@/lib/anatomyLookup";
import { useToast } from "@/hooks/use-toast";

/* ─── Labels to place ─── */
const ZONE_LABELS_FRONT = [
  "Stirn", "Augenbraue links", "Augenbraue rechts", "Auge links", "Auge rechts",
  "Nase", "Wange links", "Wange rechts", "Mund", "Kinn",
  "Linkes Ohr", "Rechtes Ohr",
  "Hals", "Linke Schulter", "Rechte Schulter",
  "Obere Brust", "Brust", "Bauch (oben)", "Bauchnabel", "Unterbauch",
  "Linke Hüfte", "Rechte Hüfte",
  "Linker Oberschenkel", "Rechter Oberschenkel",
  "Linkes Knie", "Rechtes Knie",
  "Linker Unterschenkel", "Rechter Unterschenkel",
  "Linker Fuß", "Rechter Fuß",
  "Linker Oberarm", "Rechter Oberarm",
  "Linker Unterarm", "Rechter Unterarm",
  "Linke Hand", "Rechte Hand",
];

const ZONE_LABELS_BACK = [
  "Hinterkopf", "Nacken",
  "Oberer Rücken", "Mittlerer Rücken", "Unterer Rücken",
  "Linke Schulter (dorsal)", "Rechte Schulter (dorsal)",
  "Linke Gesäßhälfte", "Rechte Gesäßhälfte",
  "Linker Oberschenkel (dorsal)", "Rechter Oberschenkel (dorsal)",
  "Linke Kniekehle", "Rechte Kniekehle",
  "Linke Wade", "Rechte Wade",
  "Linke Ferse", "Rechte Ferse",
];

interface PlacedLabel {
  id: string;
  label: string;
  x3d: number;
  y3d: number;
  z3d: number;
  view: "front" | "back";
}

/* ─── Skin Material ─── */
const skinMaterial = new THREE.MeshStandardMaterial({
  color: new THREE.Color("hsl(25, 50%, 70%)"),
  roughness: 0.5,
  metalness: 0.0,
  emissive: new THREE.Color("hsl(15, 25%, 22%)"),
  emissiveIntensity: 0.06,
});

const FEMALE_MODEL_URL = "/models/body.glb";
const MALE_MODEL_URL = "/models/male_body.glb";

/* ─── Body Model ─── */
function CalibrationBody({ onClick, gender }: { onClick: (e: ThreeEvent<MouseEvent>) => void; gender: "male" | "female" }) {
  const modelUrl = gender === "male" ? MALE_MODEL_URL : FEMALE_MODEL_URL;
  const { scene } = useGLTF(modelUrl);

  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.geometry = mesh.geometry.clone();
        mesh.material = skinMaterial.clone();
      }
    });
    return clone;
  }, [scene]);

  const normalizedScale = useMemo(() => {
    const box = new THREE.Box3().setFromObject(clonedScene);
    const size = box.getSize(new THREE.Vector3());
    return 2.5 / (size.y || 1);
  }, [clonedScene]);

  return (
    <Center>
      <primitive object={clonedScene} onClick={onClick} scale={normalizedScale} />
    </Center>
  );
}

/* ─── Placed label marker ─── */
function LabelMarker({ label, position, onRemove, removeTitle }: { label: string; position: [number, number, number]; onRemove: () => void; removeTitle: string }) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.012, 16, 16]} />
        <meshBasicMaterial color="#ef4444" depthTest={false} />
      </mesh>
      <Html center distanceFactor={2} style={{ pointerEvents: "auto" }}>
        <div
          className="bg-yellow-200 border border-yellow-500 text-yellow-900 px-2 py-1 rounded shadow-lg text-xs font-bold whitespace-nowrap cursor-pointer select-none"
          style={{ transform: "translateY(-20px)", minWidth: 60, textAlign: "center" }}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          title={removeTitle}
        >
          📌 {label}
        </div>
      </Html>
    </group>
  );
}

/* ─── Hover indicator ─── */
function HoverIndicator({ point, view }: { point: [number, number, number]; view: "front" | "back" }) {
  const autoName = getAnatomicalName(point[0], point[1], point[2], view);
  return (
    <group position={point}>
      <mesh>
        <ringGeometry args={[0.015, 0.025, 32]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.8} side={THREE.DoubleSide} depthTest={false} />
      </mesh>
      <Html center distanceFactor={2.5} style={{ pointerEvents: "none" }}>
        <div className="bg-black/80 text-white px-2 py-1 rounded text-xs whitespace-nowrap" style={{ transform: "translateY(-24px)" }}>
          x:{point[0].toFixed(2)} y:{point[1].toFixed(2)} z:{point[2].toFixed(2)}
          <br />
          Auto: {autoName}
        </div>
      </Html>
    </group>
  );
}

/* ─── Scene content ─── */
function SceneContent({
  gender,
  placedLabels,
  activeLabel,
  hoverPoint,
  hoverView,
  hideMarkers,
  removeTitle,
  onPlace,
  onRemove,
  onHover,
}: {
  gender: "male" | "female";
  placedLabels: PlacedLabel[];
  activeLabel: string | null;
  hoverPoint: [number, number, number] | null;
  hoverView: "front" | "back";
  hideMarkers: boolean;
  removeTitle: string;
  onPlace: (x: number, y: number, z: number, view: "front" | "back") => void;
  onRemove: (id: string) => void;
  onHover: (point: [number, number, number] | null, view: "front" | "back") => void;
}) {
  const controlsRef = useRef<any>(null);
  const { camera } = useThree();

  const getView = useCallback((point: THREE.Vector3): "front" | "back" => {
    return point.z >= 0 ? "front" : "back";
  }, []);

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (!activeLabel) return;
    const p = e.point;
    const view = getView(p);
    onPlace(p.x, p.y, p.z, view);
  }, [activeLabel, onPlace, getView]);

  const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (!activeLabel) {
      onHover(null, "front");
      return;
    }
    e.stopPropagation();
    const p = e.point;
    const view = getView(p);
    onHover([p.x, p.y, p.z], view);
  }, [activeLabel, onHover, getView]);

  const resetCamera = useCallback(() => {
    if (controlsRef.current) {
      camera.position.set(0, 0, 3.5);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  }, [camera]);

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <directionalLight position={[-3, 3, -3]} intensity={0.3} />

      <Suspense fallback={null}>
        <CalibrationBody gender={gender} onClick={handleClick} />
      </Suspense>

      {!hideMarkers && placedLabels.map((pl) => (
        <LabelMarker
          key={pl.id}
          label={pl.label}
          position={[pl.x3d, pl.y3d, pl.z3d]}
          onRemove={() => onRemove(pl.id)}
          removeTitle={removeTitle}
        />
      ))}

      {hoverPoint && activeLabel && (
        <HoverIndicator point={hoverPoint} view={hoverView} />
      )}

      <OrbitControls ref={controlsRef} enablePan={false} />

      <Html position={[0, -1.5, 0]} center>
        <Button size="sm" variant="outline" onClick={resetCamera} className="bg-white/90">
          <RotateCcw className="w-3 h-3 mr-1" /> Reset
        </Button>
      </Html>
    </>
  );
}

/* ─── Main Page ─── */
export default function Calibrate() {
  const { t } = useTranslation();
  const [gender, setGender] = useState<"male" | "female">("male");
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const [placedLabels, setPlacedLabels] = useState<PlacedLabel[]>([]);
  const [hoverPoint, setHoverPoint] = useState<[number, number, number] | null>(null);
  const [hoverView, setHoverView] = useState<"front" | "back">("front");
  const [hideMarkers, setHideMarkers] = useState(false);
  const { toast } = useToast();

  const allLabels = [...ZONE_LABELS_FRONT, ...ZONE_LABELS_BACK];
  const placedLabelNames = new Set(placedLabels.filter(p => 
    (gender === "male" && !p.id.startsWith("f_")) || (gender === "female" && p.id.startsWith("f_"))
  ).map(p => p.label));

  const handlePlace = useCallback((x: number, y: number, z: number, view: "front" | "back") => {
    if (!activeLabel) return;
    const prefix = gender === "male" ? "m_" : "f_";
    const id = `${prefix}${activeLabel}_${Date.now()}`;
    
    setPlacedLabels(prev => {
      const filtered = prev.filter(p => !(p.label === activeLabel && p.id.startsWith(prefix)));
      return [...filtered, { id, label: activeLabel, x3d: x, y3d: y, z3d: z, view }];
    });
    
    toast({ title: t('calibrate.labelPlaced', { label: activeLabel }), description: `x:${x.toFixed(3)} y:${y.toFixed(3)} z:${z.toFixed(3)} (${view})` });
    
    const currentIndex = allLabels.indexOf(activeLabel);
    const nextUnplaced = allLabels.slice(currentIndex + 1).find(l => !placedLabelNames.has(l) && l !== activeLabel);
    setActiveLabel(nextUnplaced || null);
  }, [activeLabel, gender, toast, allLabels, placedLabelNames, t]);

  const handleRemove = useCallback((id: string) => {
    setPlacedLabels(prev => prev.filter(p => p.id !== id));
  }, []);

  const handleHover = useCallback((point: [number, number, number] | null, view: "front" | "back") => {
    setHoverPoint(point);
    setHoverView(view);
  }, []);

  const exportData = useCallback(() => {
    const data = placedLabels.map(p => ({
      label: p.label,
      gender: p.id.startsWith("f_") ? "female" : "male",
      x3d: +p.x3d.toFixed(4),
      y3d: +p.y3d.toFixed(4),
      z3d: +p.z3d.toFixed(4),
      view: p.view,
    }));
    const json = JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(json);
    toast({ title: t('calibrate.dataCopied'), description: t('calibrate.labelsCopied', { count: data.length }) });
    console.log("=== CALIBRATION DATA ===");
    console.log(json);
  }, [placedLabels, toast, t]);

  const currentGenderLabels = placedLabels.filter(p => {
    const prefix = gender === "male" ? "m_" : "f_";
    return p.id.startsWith(prefix);
  });

  return (
    <div className="flex h-screen bg-background">
      <div className="w-72 border-r flex flex-col">
        <div className="p-3 border-b">
          <h2 className="font-bold text-lg">🔧 {t('calibrate.title')}</h2>
          <p className="text-xs text-muted-foreground mt-1">
            {t('calibrate.instruction')}
          </p>
          <div className="flex gap-2 mt-2">
            <Button
              size="sm"
              variant={gender === "male" ? "default" : "outline"}
              onClick={() => setGender("male")}
              className="flex-1"
            >
              ♂ {t('calibrate.male')}
            </Button>
            <Button
              size="sm"
              variant={gender === "female" ? "default" : "outline"}
              onClick={() => setGender("female")}
              className="flex-1"
            >
              ♀ {t('calibrate.female')}
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
            <p className="text-xs font-semibold text-muted-foreground px-1 mb-1">{t('calibrate.front')}</p>
            <div className="flex flex-wrap gap-1 mb-3">
              {ZONE_LABELS_FRONT.map(label => {
                const isPlaced = currentGenderLabels.some(p => p.label === label);
                const isActive = activeLabel === label;
                return (
                  <Badge
                    key={label}
                    variant={isActive ? "default" : isPlaced ? "secondary" : "outline"}
                    className={`cursor-pointer text-xs transition-all ${
                      isActive ? "ring-2 ring-primary scale-105" : ""
                    } ${isPlaced ? "bg-green-100 text-green-800 border-green-300" : ""}`}
                    onClick={() => setActiveLabel(isActive ? null : label)}
                  >
                    {isPlaced ? "✅" : "📌"} {label}
                  </Badge>
                );
              })}
            </div>

            <p className="text-xs font-semibold text-muted-foreground px-1 mb-1">{t('calibrate.back')}</p>
            <div className="flex flex-wrap gap-1">
              {ZONE_LABELS_BACK.map(label => {
                const isPlaced = currentGenderLabels.some(p => p.label === label);
                const isActive = activeLabel === label;
                return (
                  <Badge
                    key={label}
                    variant={isActive ? "default" : isPlaced ? "secondary" : "outline"}
                    className={`cursor-pointer text-xs transition-all ${
                      isActive ? "ring-2 ring-primary scale-105" : ""
                    } ${isPlaced ? "bg-green-100 text-green-800 border-green-300" : ""}`}
                    onClick={() => setActiveLabel(isActive ? null : label)}
                  >
                    {isPlaced ? "✅" : "📌"} {label}
                  </Badge>
                );
              })}
            </div>
          </div>
        </ScrollArea>

        <div className="p-3 border-t space-y-2">
          <div className="text-xs text-muted-foreground">
            {currentGenderLabels.length} / {allLabels.length} {t('calibrate.placed')} ({gender === "male" ? t('calibrate.male') : t('calibrate.female')})
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={exportData} className="flex-1">
              <Copy className="w-3 h-3 mr-1" /> {t('calibrate.export')}
            </Button>
            <Button
              size="sm"
              variant={hideMarkers ? "default" : "outline"}
              onClick={() => setHideMarkers(h => !h)}
            >
              {hideMarkers ? "👁" : "👁‍🗨"}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                const prefix = gender === "male" ? "m_" : "f_";
                setPlacedLabels(prev => prev.filter(p => !p.id.startsWith(prefix)));
              }}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 relative">
        {activeLabel && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-lg text-sm font-bold animate-pulse">
            📌 {t('calibrate.placing', { label: activeLabel })}
          </div>
        )}
        <Canvas camera={{ position: [0, 0, 3.5], fov: 35 }} style={{ cursor: activeLabel ? "crosshair" : "grab" }}>
          <SceneContent
            gender={gender}
            placedLabels={currentGenderLabels}
            activeLabel={activeLabel}
            hoverPoint={hoverPoint}
            hoverView={hoverView}
            hideMarkers={hideMarkers}
            removeTitle={t('calibrate.clickToRemove')}
            onPlace={handlePlace}
            onRemove={handleRemove}
            onHover={handleHover}
          />
        </Canvas>
      </div>

      <div className="w-64 border-l flex flex-col">
        <div className="p-3 border-b">
          <h3 className="font-semibold text-sm">{t('calibrate.placedLabels')}</h3>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {currentGenderLabels.length === 0 && (
              <p className="text-xs text-muted-foreground p-2">
                {t('calibrate.noLabelsPlaced')}
              </p>
            )}
            {currentGenderLabels
              .sort((a, b) => b.y3d - a.y3d)
              .map(pl => (
                <div
                  key={pl.id}
                  className="flex items-center justify-between p-1.5 rounded bg-muted/50 text-xs group"
                >
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{pl.label}</span>
                    <div className="text-muted-foreground text-[10px]">
                      y:{pl.y3d.toFixed(3)} x:{pl.x3d.toFixed(3)} ({pl.view})
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5 opacity-0 group-hover:opacity-100"
                    onClick={() => handleRemove(pl.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
