import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import {
  Camera,
  Loader2,
  AlertTriangle,
  LogOut,
  ChevronDown,
  List,
  Grid2x2,
  Accessibility,
  MapPin,
  Image as ImageIcon,
  X,
  LayoutGrid,
  Sparkles,
  CircleDot,
  Trash2,
  Maximize2,
  CameraIcon,
  Check,
  Rows2,
  Columns2,
  Layers,
  ArrowLeftRight,
  GitCompareArrows,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import AiAnalysisResult from "@/components/AiAnalysisResult";
import { MobileHeader } from "../components/MobileHeader";
import { api } from "@/lib/api";

import { tapHaptic } from "../native/haptics";
import { compressImage, takePhoto } from "../native/camera";
import { CameraOverlayCapture } from "../components/CameraOverlayCapture";
import type { Location, LocationImage, OverviewPin } from "@/types/patient";


type Tab = "all" | "clinical" | "lesion";
type ViewMode = "list" | "grid" | "body";

function FittedImageFrame({
  src,
  alt,
  children,
  roundedClassName,
}: {
  src: string;
  alt: string;
  children?: React.ReactNode;
  roundedClassName: string;
}) {
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const isLandscape = natural ? natural.w / natural.h >= 1 : true;

  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
      <div
        className={`relative ${natural ? (isLandscape ? "w-full max-h-full" : "h-full max-w-full") : "h-full w-full"}`}
        style={natural ? { aspectRatio: `${natural.w} / ${natural.h}` } : undefined}
      >
        <img
          src={src}
          alt={alt}
          loading="lazy"
          draggable={false}
          onLoad={(e) => {
            const t = e.currentTarget;
            setNatural({ w: t.naturalWidth, h: t.naturalHeight });
          }}
          className={`h-full w-full object-contain ${roundedClassName}`}
        />
        {natural && children}
      </div>
    </div>
  );
}

function isZone(l: Location) {
  return l.type === "overview";
}

function locationImages(l: Location & { images?: LocationImage[] }): LocationImage[] {
  return [...(l.images ?? [])].sort(
    (a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime(),
  );
}

function imageSrcs(l: Location & { images?: LocationImage[] }): string[] {
  return locationImages(l).map((img) => api.resolveImageSrc(img)).filter(Boolean);
}

function clampPct(v?: number) {
  const n = Number(v ?? 0);
  const pct = n <= 1 ? n * 100 : n;
  return Math.max(0, Math.min(100, pct));
}

export function PatientHomeScreen() {
  const { id } = useParams<{ id: string }>();
  const patientId = Number(id);
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [viewer, setViewer] = useState<{ loc: Location & { images?: LocationImage[] }; index: number } | null>(null);
  
  type CompareMode = "off" | "stack" | "side" | "overlay" | "overview";
  const [compareMode, setCompareMode] = useState<CompareMode>("off");
  const [compareIndexA, setCompareIndexA] = useState<number | null>(null);
  const [compareTarget, setCompareTarget] = useState<"A" | "B">("A");
  const [overlayMix, setOverlayMix] = useState(0.5);
  const [aiOpen, setAiOpen] = useState(false);
  const [imgNat, setImgNat] = useState<{ w: number; h: number } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [addingPhoto, setAddingPhoto] = useState(false);
  const [creatingPin, setCreatingPin] = useState(false);
  const [pinDrag, setPinDrag] = useState<{ pinId: number; x: number; y: number; overTrash: boolean } | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const pinSurfaceRef = useRef<HTMLDivElement | null>(null);
  const [surfaceSize, setSurfaceSize] = useState<{ w: number; h: number } | null>(null);
  const pinLongPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapStartRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const suppressClickRef = useRef(false);
  const [overlayCapture, setOverlayCapture] = useState<
    | { spot: Location & { images?: LocationImage[] }; referenceSrc: string | null }
    | null
  >(null);
  const queryClient = useQueryClient();


  const { data, isLoading, error } = useQuery<any>({
    queryKey: ["full-patient", patientId],
    queryFn: () => api.getFullPatient(patientId),
    enabled: !!patientId,
  });

  const patient = data;
  const locations: (Location & { images?: LocationImage[] })[] = useMemo(
    () => (data?.locations ?? []).filter((l: Location) => l.type !== "region"),
    [data],
  );

  const zones = useMemo(() => locations.filter(isZone), [locations]);
  const spots = useMemo(() => locations.filter((l) => !isZone(l)), [locations]);

  const { data: zonePinsMap = {} } = useQuery<Record<number, OverviewPin[]>>({
    queryKey: ["mobile-overview-pins", patientId, zones.map((z) => z.id).join(",")],
    queryFn: async () => {
      const entries = await Promise.all(
        zones.map(async (zone) => {
          try {
            return [zone.id, await api.getOverviewPins(zone.id)] as const;
          } catch {
            return [zone.id, []] as const;
          }
        }),
      );
      return Object.fromEntries(entries);
    },
    enabled: !!patientId && zones.length > 0,
  });

  const getPinNumber = (pin: OverviewPin): string => {
    const raw = (pin.label || "").trim();
    const m = raw.match(/\d+/);
    if (m) return m[0];
    // fallback: index within its zone's pin list
    const pins = zonePinsMap[pin.overview_location_id] ?? [];
    const idx = pins.findIndex((p) => p.id === pin.id);
    return String(idx >= 0 ? idx + 1 : pin.linked_location_id);
  };

  const getPinLabel = (pin: OverviewPin, _compact = false) => {
    return getPinNumber(pin);
  };


  const openViewer = (loc: Location & { images?: LocationImage[] }, index = 0) => {
    if (!(loc.images?.length)) return;
    tapHaptic();
    setImgNat(null);
    setSurfaceSize(null);
    setIsFullscreen(false);
    setCompareMode("off");
    setCompareIndexA(null);
    setCompareTarget("A");
    setViewer({ loc, index });
    if (isZone(loc)) {
      // Ensure pins are fresh (newly created zones may not be in the map yet)
      void refreshZonePins(loc.id);
    }
  };

  const openLinkedSpot = (pin: OverviewPin) => {
    const spot = spots.find((s) => s.id === pin.linked_location_id);
    if (spot?.images?.length) {
      openViewer(spot, 0);
      return;
    }
    if (spot) {
      setViewer(null);
      setTab("lesion");
      setViewMode("grid");
      toast({ title: spot.name || getPinLabel(pin), description: "Dieser Spot hat noch kein Foto." });
      return;
    }
    toast({ title: "Spot nicht gefunden" });
  };

  const getZoneForSpot = (spotId: number) =>
    zones.find((zone) => (zonePinsMap[zone.id] ?? []).some((pin) => pin.linked_location_id === spotId));

  const refreshViewerLocation = async (locationId: number, preferredIndex: number) => {
    const nextData = await api.getFullPatient(patientId);
    queryClient.setQueryData(["full-patient", patientId], nextData);
    const updated = (nextData?.locations ?? [])
      .filter((l: Location) => l.type !== "region")
      .find((l: Location) => l.id === locationId) as (Location & { images?: LocationImage[] }) | undefined;
    const nextImages = updated ? locationImages(updated) : [];
    setImgNat(null);
    if (!updated || nextImages.length === 0) {
      setViewer(null);
      return;
    }
    setViewer({ loc: updated, index: Math.max(0, Math.min(preferredIndex, nextImages.length - 1)) });
  };

  const refreshZonePins = async (zoneId: number) => {
    try {
      const pins = await api.getOverviewPins(zoneId);
      queryClient.setQueryData<Record<number, OverviewPin[]>>(
        ["mobile-overview-pins", patientId, zones.map((z) => z.id).join(",")],
        (prev) => ({ ...(prev ?? {}), [zoneId]: pins }),
      );
    } catch {
      queryClient.invalidateQueries({ queryKey: ["mobile-overview-pins", patientId] });
    }
  };

  const nextFreeLNumber = () => {
    const used = new Set<number>();
    for (const s of spots) {
      const m = /^L\s*(\d+)$/i.exec((s.name ?? "").trim());
      if (m) used.add(Number(m[1]));
    }
    for (const pins of Object.values(zonePinsMap)) {
      for (const p of pins) {
        const m = /^L?\s*(\d+)$/i.exec((p.label ?? "").trim());
        if (m) used.add(Number(m[1]));
      }
    }
    let n = 1;
    while (used.has(n)) n++;
    return n;
  };

  // Compute the actual image bounding box inside pinSurface (object-contain math).
  const imgRect = useMemo(() => {
    if (!surfaceSize || !imgNat) return null;
    const { w: cw, h: ch } = surfaceSize;
    if (cw <= 0 || ch <= 0) return null;
    const scale = Math.min(cw / imgNat.w, ch / imgNat.h);
    const w = imgNat.w * scale;
    const h = imgNat.h * scale;
    return { left: (cw - w) / 2, top: (ch - h) / 2, width: w, height: h };
  }, [surfaceSize, imgNat]);

  // Track pin surface size for image-rect math.
  useEffect(() => {
    const el = pinSurfaceRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setSurfaceSize({ w: r.width, h: r.height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [viewer?.loc.id, isFullscreen, compareMode]);

  const createPinAt = async (zone: Location, xPct: number, yPct: number) => {
    if (creatingPin) return;
    setCreatingPin(true);
    try {
      const nextNum = nextFreeLNumber();
      const spot = await api.createLocation(patientId, {
        name: `L${nextNum}`,
        x: zone.x ?? 0,
        y: zone.y ?? 0,
        view: (zone as any).view ?? "front",
        type: "spot",
        x3d: (zone as any).x3d ?? undefined,
        y3d: (zone as any).y3d ?? undefined,
        z3d: (zone as any).z3d ?? undefined,
        nx: (zone as any).nx ?? undefined,
        ny: (zone as any).ny ?? undefined,
        nz: (zone as any).nz ?? undefined,
      });
      await api.createOverviewPin(zone.id, {
        linked_location_id: spot.id,
        x_pct: xPct,
        y_pct: yPct,
      });
      tapHaptic();
      await refreshZonePins(zone.id);
      queryClient.invalidateQueries({ queryKey: ["full-patient", patientId] });
      toast({ title: "Marker gesetzt", description: `${nextNum}` });
    } catch (e: any) {
      toast({ title: "Fehler", description: e?.message ?? "Marker konnte nicht gesetzt werden.", variant: "destructive" });
    } finally {
      setCreatingPin(false);
    }
  };

  const handleStagePointerUp = (zone: Location) => (e: React.PointerEvent<HTMLDivElement>) => {
    const start = tapStartRef.current;
    tapStartRef.current = null;
    if (!start || pinDrag) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (dx * dx + dy * dy > 100) return; // moved → not a tap
    if (Date.now() - start.t > 500) return;
    const rect = pinSurfaceRef.current?.getBoundingClientRect();
    if (!rect || !imgRect) return;
    const x = ((e.clientX - rect.left - imgRect.left) / imgRect.width) * 100;
    const y = ((e.clientY - rect.top - imgRect.top) / imgRect.height) * 100;
    if (x < 0 || x > 100 || y < 0 || y > 100) return;
    void createPinAt(zone, x, y);
  };

  const TRASH_HIT_PX = 220;
  const isOverTrash = (clientY: number) => clientY > window.innerHeight - TRASH_HIT_PX;

  const startPinDrag = (pin: OverviewPin, e: React.PointerEvent<HTMLButtonElement>) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pinLongPressTimer.current = setTimeout(() => {
      tapHaptic();
      setPinDrag({ pinId: pin.id, x: clampPct(pin.x_pct), y: clampPct(pin.y_pct), overTrash: false });
    }, 280);
  };

  const movePinDrag = (e: React.PointerEvent<HTMLElement>) => {
    if (!pinDrag) return;
    const rect = pinSurfaceRef.current?.getBoundingClientRect();
    if (!rect || !imgRect) return;
    // Don't clamp — let pin follow finger anywhere, even outside image.
    const x = ((e.clientX - rect.left - imgRect.left) / imgRect.width) * 100;
    const y = ((e.clientY - rect.top - imgRect.top) / imgRect.height) * 100;
    setPinDrag({ pinId: pinDrag.pinId, x, y, overTrash: isOverTrash(e.clientY) });
  };

  const endPinDrag = async (pin: OverviewPin, e: React.PointerEvent<HTMLButtonElement>) => {
    if (pinLongPressTimer.current) {
      clearTimeout(pinLongPressTimer.current);
      pinLongPressTimer.current = null;
    }
    if (!pinDrag || pinDrag.pinId !== pin.id) return;
    const drag = pinDrag;
    setPinDrag(null);
    suppressClickRef.current = true;
    setTimeout(() => { suppressClickRef.current = false; }, 350);
    const zoneId = viewer?.loc.id;
    if (drag.overTrash || isOverTrash(e.clientY)) {
      try {
        await api.deleteOverviewPin(pin.id);
        toast({ title: "Marker gelöscht" });
        if (zoneId) await refreshZonePins(zoneId);
      } catch (err: any) {
        toast({ title: "Fehler", description: err?.message ?? "Löschen fehlgeschlagen.", variant: "destructive" });
      }
      return;
    }
    // Clamp to image bounds when saving position
    const saveX = Math.max(0, Math.min(100, drag.x));
    const saveY = Math.max(0, Math.min(100, drag.y));
    try {
      await api.updateOverviewPin(pin.id, { x_pct: saveX, y_pct: saveY, label: pin.label });
      if (zoneId) await refreshZonePins(zoneId);
    } catch (err: any) {
      toast({ title: "Fehler", description: err?.message ?? "Verschieben fehlgeschlagen.", variant: "destructive" });
    }
  };

  const renderZoneMarkers = (loc: Location, size: "small" | "large") => {
    const pins = zonePinsMap[loc.id] ?? [];
    if (!pins.length) return null;

    const isCompact = size === "small";

    return (
      <div className="pointer-events-none absolute inset-0 z-10">
        {pins.map((pin) => {
          const isDragging = pinDrag?.pinId === pin.id;
          const left = isDragging ? pinDrag!.x : clampPct(pin.x_pct);
          const top = isDragging ? pinDrag!.y : clampPct(pin.y_pct);
          const num = getPinNumber(pin);

          // For large (viewer) markers: position via px inside the actual image rect.
          // For small (tile) markers: parent is the image itself, use percent.
          const positionStyle: React.CSSProperties = (!isCompact && imgRect)
            ? {
                left: `${imgRect.left + (left / 100) * imgRect.width}px`,
                top: `${imgRect.top + (top / 100) * imgRect.height}px`,
                transform: "translate(-50%, -100%)",
              }
            : { left: `${left}%`, top: `${top}%`, transform: "translate(-50%, -100%)" };

          return (
            <div
              key={pin.id}
              className="absolute"
              style={positionStyle}
            >
              {isCompact ? (
                <div className="flex flex-col items-center drop-shadow-md">
                  <span
                    className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white text-[10px] font-bold text-black shadow-md"
                    style={{ width: 26, height: 26 }}
                  >
                    {num}
                  </span>
                  <div className="relative h-0 w-0">
                    <div className="absolute left-1/2 top-0 h-0 w-0 -translate-x-1/2 border-x-[5px] border-t-[8px] border-x-transparent border-t-black/70" />
                    <div className="absolute left-1/2 top-0 h-0 w-0 -translate-x-1/2 border-x-[4px] border-t-[7px] border-x-transparent border-t-white" />
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  aria-label={`${num} öffnen`}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    startPinDrag(pin, e);
                  }}
                  onPointerMove={(e) => {
                    if (pinDrag?.pinId === pin.id) {
                      e.stopPropagation();
                      movePinDrag(e);
                    }
                  }}
                  onPointerUp={(e) => {
                    e.stopPropagation();
                    void endPinDrag(pin, e);
                  }}
                  onPointerCancel={() => {
                    if (pinLongPressTimer.current) {
                      clearTimeout(pinLongPressTimer.current);
                      pinLongPressTimer.current = null;
                    }
                    setPinDrag(null);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (pinDrag || suppressClickRef.current) return;
                    openLinkedSpot(pin);
                  }}
                  className={`pointer-events-auto flex flex-col items-center drop-shadow-md transition-transform ${
                    isDragging ? "scale-110" : "active:scale-95"
                  }`}
                  style={{ touchAction: "none" }}
                >
                  <span
                    className={`inline-flex items-center justify-center rounded-full border-2 bg-white text-lg font-bold text-black shadow-md ${
                      isDragging
                        ? "border-destructive shadow-[0_0_0_6px_hsl(var(--destructive)/0.25)]"
                        : "border-black/30"
                    }`}
                    style={{ width: 44, height: 44 }}
                  >
                    {num}
                  </span>
                  <div className="relative h-0 w-0">
                    <div
                      className={`absolute left-1/2 top-0 h-0 w-0 -translate-x-1/2 border-x-[10px] border-t-[15px] border-x-transparent ${
                        isDragging ? "border-t-destructive" : "border-t-black/70"
                      }`}
                    />
                    <div
                      className={`absolute left-1/2 top-0 h-0 w-0 -translate-x-1/2 border-x-[8px] border-t-[13px] border-x-transparent ${
                        isDragging ? "border-t-destructive" : "border-t-white"
                      }`}
                    />
                  </div>
                </button>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const [creatingZone, setCreatingZone] = useState(false);
  const startNew = async () => {
    if (creatingZone) return;
    tapHaptic();
    const captured = await takePhoto();
    if (!captured) return;
    setCreatingZone(true);
    try {
      const blob = await compressImage(captured.file);
      const file =
        blob instanceof File
          ? blob
          : new File([blob], captured.file.name || "zone.jpg", {
              type: blob.type || "image/jpeg",
            });
      const nextNum = zones.length + 1;
      const newZone = await api.createLocation(patientId, {
        name: `Zone ${nextNum}`,
        x: 50,
        y: 50,
        view: "front",
        type: "overview",
      });
      await api.uploadImage(newZone.id, file);
      const fresh = await api.getFullPatient(patientId);
      queryClient.setQueryData(["full-patient", patientId], fresh);
      setTab("clinical");
      setViewMode("grid");
      toast({ title: "Zone erstellt", description: `Zone ${nextNum}` });
    } catch (e: any) {
      toast({
        title: "Fehler",
        description: e?.message ?? "Zone konnte nicht erstellt werden.",
        variant: "destructive",
      });
    } finally {
      URL.revokeObjectURL(captured.previewUrl);
      setCreatingZone(false);
    }
  };

  const fmtDate = (s?: string) =>
    s
      ? new Date(s).toLocaleDateString("de-CH", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "";

  const handleFullscreen = () => {
    tapHaptic();
    setIsFullscreen((v) => !v);
  };

  const handleBodyRegion = () => {
    if (!viewer) return;
    tapHaptic();
    if (isZone(viewer.loc)) {
      setViewer(null);
      setTab("clinical");
      setViewMode("grid");
      return;
    }
    const zone = getZoneForSpot(viewer.loc.id);
    if (zone?.images?.length) openViewer(zone, 0);
    else {
      setViewer(null);
      setTab("lesion");
      setViewMode("grid");
    }
  };

  const handleMarkerAction = () => {
    if (!viewer) return;
    tapHaptic();
    const zone = getZoneForSpot(viewer.loc.id);
    if (zone?.images?.length) openViewer(zone, 0);
    else toast({ title: "Marker", description: "Dieser Spot ist keiner Zone zugeordnet." });
  };

  const handleAnalysisAction = () => {
    if (!viewer) return;
    tapHaptic();
    setAiOpen(true);
  };

  const handleOverview = () => {
    if (!viewer) return;
    tapHaptic();
    setViewer(null);
    setViewMode("grid");
  };

  const ensureComparePair = (mode: Exclude<CompareMode, "off"> = "stack") => {
    if (!viewer) return;
    tapHaptic();
    const imgsCount = locationImages(viewer.loc).length;
    if (imgsCount < 2) return;
    setCompareMode(compareMode === "off" ? mode : compareMode);
    if (compareIndexA == null || compareIndexA === viewer.index) {
      const fallbackA = viewer.index === imgsCount - 1 ? Math.max(0, imgsCount - 2) : 0;
      setCompareIndexA(fallbackA);
    }
    setCompareTarget("A");
  };

  const toggleCompare = () => {
    if (!viewer) return;
    if (compareMode !== "off") {
      tapHaptic();
      setCompareMode("off");
      setCompareTarget("A");
      return;
    }
    ensureComparePair("stack");
  };

  const setComparePair = (aIndex: number, bIndex: number, mode: Exclude<CompareMode, "off"> = "stack") => {
    if (!viewer) return;
    const count = locationImages(viewer.loc).length;
    if (count < 2) return;
    const a = Math.max(0, Math.min(count - 1, aIndex));
    const b = Math.max(0, Math.min(count - 1, bIndex));
    if (a === b) return;
    tapHaptic();
    setImgNat(null);
    setCompareMode(mode);
    setCompareIndexA(a);
    setCompareTarget("A");
    setViewer({ loc: viewer.loc, index: b });
  };

  const swapAB = () => {
    if (!viewer || compareIndexA == null) return;
    tapHaptic();
    const newA = viewer.index;
    setViewer({ loc: viewer.loc, index: compareIndexA });
    setCompareIndexA(newA);
    setCompareTarget("A");
  };

  const chooseCompareImage = (target: "A" | "B", imageIndex: number) => {
    if (!viewer) return;
    const count = locationImages(viewer.loc).length;
    if (count < 2) return;
    const i = Math.max(0, Math.min(count - 1, imageIndex));
    tapHaptic();
    if (target === "A") {
      if (i === viewer.index) {
        setCompareTarget("B");
        return;
      }
      setCompareIndexA(i);
      setCompareTarget("B");
      return;
    }
    if (i === compareIndexA) {
      setCompareTarget("A");
      return;
    }
    setImgNat(null);
    setViewer({ loc: viewer.loc, index: i });
    setCompareTarget("A");
  };

  const handleDeleteImage = async () => {
    if (!viewer) return;
    const imgs = locationImages(viewer.loc);
    const img = imgs[viewer.index];
    if (!img) return;
    if (!confirm("Foto wirklich löschen?")) return;
    try {
      await api.deleteImage(img.id);
      toast({ title: "Gelöscht" });
      await refreshViewerLocation(viewer.loc.id, Math.max(0, viewer.index - 1));
    } catch (e: any) {
      toast({ title: "Fehler", description: e?.message ?? "Löschen fehlgeschlagen", variant: "destructive" });
    }
  };

  const handleAddPhotoToCurrentLocation = async () => {
    if (!viewer || addingPhoto) return;
    tapHaptic();

    const refSrc = imageSrcs(viewer.loc)[viewer.index] ?? imageSrcs(viewer.loc)[0] ?? null;
    const isSpot = !isZone(viewer.loc);
    const supportsStream = typeof navigator !== "undefined"
      && !!navigator.mediaDevices?.getUserMedia;

    if (isSpot && refSrc && supportsStream) {
      setOverlayCapture({ spot: viewer.loc, referenceSrc: refSrc });
      return;
    }

    const captured = await takePhoto();
    if (!captured) return;
    setAddingPhoto(true);
    try {
      const blob = await compressImage(captured.file);
      const file = blob instanceof File
        ? blob
        : new File([blob], captured.file.name || "folgeaufnahme.jpg", { type: blob.type || "image/jpeg" });
      await api.uploadImage(viewer.loc.id, file);
      toast({ title: "Foto hinzugefügt" });
      await refreshViewerLocation(viewer.loc.id, Number.MAX_SAFE_INTEGER);
    } catch (e: any) {
      toast({ title: "Fehler", description: e?.message ?? "Upload fehlgeschlagen", variant: "destructive" });
    } finally {
      URL.revokeObjectURL(captured.previewUrl);
      setAddingPhoto(false);
    }
  };

  // Big square tile for a Zone (overview) – labelled CL{id}
  const renderZoneTile = (loc: Location & { images?: LocationImage[] }) => {
    const imgs = imageSrcs(loc);
    const cover = imgs[0];
    const count = (loc.images ?? []).length;
    return (
      <button
        type="button"
        key={`z-${loc.id}`}
        onClick={() => openViewer(loc, 0)}
        className="relative block aspect-square overflow-hidden rounded-[18px] bg-secondary shadow-sm active:opacity-80"
      >
        {cover ? (
          <FittedImageFrame src={cover} alt={loc.name ?? "Zone"} roundedClassName="rounded-[18px]">
            {renderZoneMarkers(loc, "small")}
          </FittedImageFrame>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <ImageIcon className="h-10 w-10" />
          </div>
        )}


        {loc.created_at && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/95 via-background/30 to-transparent px-3 py-2 text-left text-card-foreground">
            <div className="text-xs text-foreground/80">
              {fmtDate(loc.created_at)}
            </div>
          </div>
        )}


      </button>
    );
  };

  // Compact cell: zone overview cropped/scaled with ONE pin highlighted (for spot rows)
  const renderZoneCropCell = (
    zone: Location & { images?: LocationImage[] },
    pin: OverviewPin,
    pinLabel: string,
  ) => {
    const cover = imageSrcs(zone)[0];
    const left = clampPct(pin.x_pct);
    const top = clampPct(pin.y_pct);
    return (
      <button
        type="button"
        key={`zc-${zone.id}-${pin.id}`}
        onClick={() => openLinkedSpot(pin)}
        className="relative block aspect-square overflow-hidden rounded-[14px] bg-secondary shadow-sm active:opacity-80"
      >
        {cover ? (
          <FittedImageFrame src={cover} alt={`Pin ${pinLabel}`} roundedClassName="rounded-[14px]">
            <div
              className="pointer-events-none absolute z-10"
              style={{ left: `${left}%`, top: `${top}%`, transform: "translate(-50%, -100%)" }}
            >
              <div className="flex flex-col items-center drop-shadow-md">
                <span
                  className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white px-1.5 text-[11px] font-bold text-black shadow-md"
                  style={{ minWidth: 24, height: 24 }}
                >
                  {pinLabel}
                </span>
                <div className="relative h-0 w-0">
                  <div className="absolute left-1/2 top-0 h-0 w-0 -translate-x-1/2 border-x-[5px] border-t-[8px] border-x-transparent border-t-black/70" />
                  <div className="absolute left-1/2 top-0 h-0 w-0 -translate-x-1/2 border-x-[4px] border-t-[7px] border-x-transparent border-t-white" />
                </div>
              </div>
            </div>
          </FittedImageFrame>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <ImageIcon className="h-6 w-6" />
          </div>
        )}
      </button>
    );
  };

  // Single photo cell labelled L{pinLabel}
  const renderSpotPhotoCell = (
    spot: Location & { images?: LocationImage[] },
    imgIdx: number,
    pinLabel: string,
  ) => {
    const src = imageSrcs(spot)[imgIdx];
    if (!src) return null;
    const dateStr = fmtDate(locationImages(spot)[imgIdx]?.created_at ?? spot.created_at);
    return (
      <button
        type="button"
        key={`sp-${spot.id}-${imgIdx}`}
        onClick={() => openViewer(spot, imgIdx)}
        className="relative block aspect-square overflow-hidden rounded-[14px] bg-secondary shadow-sm active:opacity-80"
      >
        <img src={src} alt={`L${pinLabel}`} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/95 via-background/20 to-transparent px-2 py-1.5 text-left text-card-foreground">
          <div className="truncate text-sm font-semibold leading-tight">L{pinLabel}</div>
          {dateStr && <div className="text-[10px] text-foreground/80">{dateStr}</div>}
        </div>
      </button>
    );
  };


  const uploadLesionFile = async (spot: Location & { images?: LocationImage[] }, file: File) => {
    try {
      const blob = await compressImage(file);
      const out = blob instanceof File
        ? blob
        : new File([blob], file.name || "lesion.jpg", { type: blob.type || "image/jpeg" });
      await api.uploadImage(spot.id, out);
      toast({ title: "Foto hinzugefügt", description: spot.name ?? `L${spot.id}` });
      const next = await api.getFullPatient(patientId);
      queryClient.setQueryData(["full-patient", patientId], next);
    } catch (e: any) {
      toast({ title: "Fehler", description: e?.message ?? "Upload fehlgeschlagen", variant: "destructive" });
    }
  };

  const handleAddLesionPhoto = async (spot: Location & { images?: LocationImage[] }) => {
    tapHaptic();
    // If the spot already has a previous lesion photo, open in-app camera with
    // the existing photo as a ghost overlay so the user can re-shoot from the
    // same angle. Falls back to the system camera otherwise.
    const refSrc = imageSrcs(spot)[0] ?? null;
    const supportsStream = typeof navigator !== "undefined"
      && !!navigator.mediaDevices?.getUserMedia;
    if (refSrc && supportsStream) {
      setOverlayCapture({ spot, referenceSrc: refSrc });
      return;
    }
    const captured = await takePhoto();
    if (!captured) return;
    try {
      await uploadLesionFile(spot, captured.file);
    } finally {
      URL.revokeObjectURL(captured.previewUrl);
    }
  };

  // "Add Lesion" placeholder cell when a spot has no photos yet
  const renderAddLesionCell = (spot: Location & { images?: LocationImage[] }) => (
    <button
      type="button"
      key={`al-${spot.id}`}
      onClick={() => handleAddLesionPhoto(spot)}
      className="relative flex aspect-square flex-col items-center justify-center gap-1 rounded-[14px] bg-secondary/60 text-muted-foreground shadow-sm active:opacity-80"
    >
      <CameraIcon className="h-7 w-7" />
      <div className="absolute inset-x-0 bottom-0 px-2 py-1.5 text-left">
        <div className="truncate text-sm font-semibold leading-tight text-foreground">
          {spot.name ?? `L${spot.id}`}
        </div>
        <div className="text-[10px] text-muted-foreground">Add Lesion</div>
      </div>
    </button>
  );

  // Build a 3-cell row for a spot belonging to a zone: [zone crop with pin, photo1, photo2 or add]
  const renderSpotRowForZone = (
    zone: Location & { images?: LocationImage[] },
    pin: OverviewPin,
  ): React.ReactNode[] => {
    const spot = spots.find((s) => s.id === pin.linked_location_id);
    const imgs = spot ? imageSrcs(spot) : [];
    // Skip rendering an entire row if there is no spot or no photos yet —
    // empty placeholders only clutter the overview.
    if (!spot || imgs.length === 0) return [];
    const pinLabel = getPinLabel(pin, true);
    const cells: React.ReactNode[] = [];
    cells.push(renderZoneCropCell(zone, pin, pinLabel));
    imgs.slice(0, 2).forEach((_, i) => {
      const cell = renderSpotPhotoCell(spot, i, pinLabel);
      if (cell) cells.push(cell);
    });
    while (cells.length < 3) cells.push(<div key={`pad-${zone.id}-${pin.id}-${cells.length}`} />);
    return cells;
  };

  // Orphan spot (no parent zone) – row of available photos. Empty spots are hidden.
  const renderOrphanSpotRow = (spot: Location & { images?: LocationImage[] }, pinLabel: string): React.ReactNode[] => {
    const imgs = imageSrcs(spot);
    if (imgs.length === 0) return [];
    const cells: React.ReactNode[] = [];
    imgs.slice(0, 3).forEach((_, i) => {
      const cell = renderSpotPhotoCell(spot, i, pinLabel);
      if (cell) cells.push(cell);
    });
    while (cells.length < 3) cells.push(<div key={`opad-${spot.id}-${cells.length}`} />);
    return cells;
  };



  const renderedTiles = useMemo(() => {
    const tiles: React.ReactNode[] = [];

    if (tab === "lesion") {
      spots.forEach((s, idx) => tiles.push(...renderOrphanSpotRow(s, String(idx + 1))));
      return tiles;
    }

    const rendered = new Set<number>();
    let orphanCounter = 0;
    zones.forEach((zone) => {
      tiles.push(renderZoneTile(zone));
      tiles.push(<div key={`zpad1-${zone.id}`} />);
      tiles.push(<div key={`zpad2-${zone.id}`} />);
      if (tab === "clinical") return;
      const pins = zonePinsMap[zone.id] ?? [];
      pins.forEach((pin) => {
        rendered.add(pin.linked_location_id);
        tiles.push(...renderSpotRowForZone(zone, pin));
      });
    });

    if (tab === "all") {
      spots.forEach((s) => {
        if (rendered.has(s.id)) return;
        orphanCounter += 1;
        tiles.push(...renderOrphanSpotRow(s, String(orphanCounter)));
      });
    }

    return tiles;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, zones, spots, locations, zonePinsMap]);





  return (
    <>
      <MobileHeader onClick={() => navigate(-1)} />

      <main className="flex-1 px-4 pb-32">
        <section className="rounded-[26px] bg-card px-4 py-4 shadow-sm">
          <div className="rounded-[18px] bg-[hsl(174_55%_18%)] px-5 py-5 text-foreground">
            <div className="truncate text-2xl font-semibold tracking-normal">
              {patient ? (patient.name?.trim() || `${patient.first_name ?? ""} ${patient.last_name ?? ""}`.trim()) : "Patient"}
            </div>
            {(patient?.patient_number || patient?.id) && (
              <div className="mt-1 text-base text-foreground/60">
                ID {patient?.patient_number ?? patient?.id}
              </div>
            )}
          </div>

          <div className="mt-5 grid grid-cols-3 border-b border-border/80">
            {(
              [
                ["all", `Alle (${locations.length})`],
                ["clinical", `Klinische (${zones.length})`],
                ["lesion", `Läsion (${spots.length})`],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => {
                  tapHaptic();
                  setTab(key);
                }}
                className={`px-1 py-4 text-base transition-colors ${
                  tab === key
                    ? "border-b-2 border-primary text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>



          <div className="mt-5 flex items-center gap-2">
            <button
              type="button"
              className="flex h-[52px] flex-1 min-w-0 items-center justify-between gap-2 rounded-[16px] bg-secondary px-4 text-left text-sm text-foreground"
            >
              <span className="truncate">Neueste zum Ältesten</span>
              <ChevronDown className="h-5 w-5 shrink-0" />
            </button>

            <div className="flex h-[52px] shrink-0 items-center rounded-[16px] bg-secondary p-1">
              {[
                { key: "list", icon: List, label: "Liste" },
                { key: "grid", icon: Grid2x2, label: "Grid" },
                { key: "body", icon: Accessibility, label: "Körper" },
              ].map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  type="button"
                  aria-label={label}
                  onClick={() => setViewMode(key as ViewMode)}
                  className={`inline-flex h-full w-10 items-center justify-center rounded-[12px] transition-colors ${
                    viewMode === key
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </button>
              ))}
            </div>
          </div>

        </section>

        {isLoading && (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Lade…
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-[20px] border border-destructive/40 bg-destructive/10 p-4 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{(error as Error)?.message ?? "Daten konnten nicht geladen werden."}</span>
          </div>
        )}

        {renderedTiles.length > 0 && (
          <section className="mt-5">
            {viewMode === "body" ? (
              <div className="rounded-[26px] bg-card px-4 py-8 shadow-sm">
                <div className="flex min-h-[360px] items-center justify-center rounded-[20px] bg-secondary/50 px-6 text-center text-muted-foreground">
                  Körperansicht folgt im nächsten Schritt.
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">{renderedTiles}</div>
            )}
          </section>
        )}

        {!isLoading && !error && renderedTiles.length === 0 && (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Noch keine {tab === "clinical" ? "klinischen Aufnahmen" : tab === "lesion" ? "Läsionen" : "Einträge"}. Tippen Sie auf „Neu“.
          </div>
        )}

      </main>


      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background px-4 pb-4 pt-3"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1rem)" }}
      >
        <div className="flex gap-3">
          <button
            onClick={startNew}
            disabled={creatingZone}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-[18px] bg-primary px-4 py-4 text-primary-foreground active:opacity-80 disabled:opacity-60"
          >
            {creatingZone ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Camera className="h-5 w-5" />
            )}
            <span className="text-lg font-medium">{creatingZone ? "Speichern…" : "Neue Zone"}</span>
          </button>
          <Link
            to="/m/patients"
            onClick={() => tapHaptic()}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-[18px] bg-secondary px-4 py-4 text-foreground active:opacity-80"
          >
            <LogOut className="h-5 w-5" />
            <span className="text-lg">Patient beenden</span>
          </Link>
        </div>
      </div>

      {viewer && (() => {
        const imgs = imageSrcs(viewer.loc);
        const idx = Math.max(0, Math.min(viewer.index, imgs.length - 1));
        const src = imgs[idx];
        const zone = isZone(viewer.loc);
        const label = zone
          ? `Klinisch ${viewer.loc.id}`
          : `Läsion ${viewer.loc.id}`;
        const dateTime = viewer.loc.created_at
          ? new Date(viewer.loc.created_at).toLocaleString("de-CH", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }).replace(",", " |")
          : "";

        return (
          <div className="fixed inset-0 z-50 flex flex-col bg-background">
            {/* Top header — Grid icon + Patient chip */}
            <div
              className="flex items-center gap-3 px-4 pb-3"
              style={{ paddingTop: "max(env(safe-area-inset-top), 0.75rem)" }}
            >
              <button
                type="button"
                onClick={() => setViewer(null)}
                aria-label="Zur Übersicht"
                className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-secondary text-foreground active:opacity-80"
              >
                <LayoutGrid className="h-5 w-5" />
              </button>
              <div className="flex-1 truncate rounded-[14px] bg-[hsl(320_30%_40%)] px-4 py-3 text-foreground">
                <div className="truncate text-base font-semibold leading-tight">
                  {patient ? (patient.name?.trim() || `${patient.first_name ?? ""} ${patient.last_name ?? ""}`.trim()) : "Patient"}
                </div>
                {(patient?.patient_number || patient?.id) && (
                  <div className="truncate text-xs text-foreground/70">
                    ID {patient?.patient_number ?? patient?.id}
                  </div>
                )}
              </div>
            </div>

            <div className="px-4 pb-2">
              <div className="text-2xl font-semibold leading-tight text-foreground">{label}</div>
              {dateTime && (
                <div className="mt-0.5 text-base text-muted-foreground">{dateTime}</div>
              )}
            </div>

            {/* Image stage */}
            <div
              ref={stageRef}
              className={
                isFullscreen
                  ? "fixed inset-0 z-[60] flex items-center justify-center overflow-hidden bg-black"
                  : "relative mx-2 flex flex-1 items-center justify-center overflow-hidden rounded-[20px] bg-secondary"
              }
            >
              {src ? (
                compareMode !== "off" && imgs.length >= 2 ? (() => {
                  const list = locationImages(viewer.loc);
                  const aIdx = compareIndexA != null && compareIndexA !== idx
                    ? Math.max(0, Math.min(list.length - 1, compareIndexA))
                    : (idx > 0 ? idx - 1 : Math.min(list.length - 1, idx + 1));
                  const imgA = list[aIdx];
                  const imgB = list[idx];
                  const srcA = imgs[aIdx] ?? imgs[0];
                  const srcB = src;
                  const fmt = (d?: string) =>
                    d
                      ? new Date(d)
                          .toLocaleString("de-CH", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                          .replace(",", " |")
                      : "";
                  const badge = (txt: string, side: "tl" | "tr" | "bl" | "br") => {
                    const pos = side === "tl" ? "left-3 top-2"
                      : side === "tr" ? "right-3 top-2"
                      : side === "bl" ? "left-3 bottom-2"
                      : "right-3 bottom-2";
                    return (
                      <div className={`absolute ${pos} rounded-md bg-background/70 px-2 py-0.5 text-xs text-foreground backdrop-blur`}>
                        {txt}
                      </div>
                    );
                  };
                  if (compareMode === "overview") {
                    return (
                      <div className="grid h-full w-full grid-cols-2 gap-1 overflow-y-auto rounded-[20px] bg-background p-1">
                        {imgs.map((thumbSrc, imageIndex) => {
                          const item = list[imageIndex];
                          const isA = imageIndex === aIdx;
                          const isB = imageIndex === idx;
                          return (
                            <button
                              key={imageIndex}
                              type="button"
                              onClick={() => chooseCompareImage(compareTarget, imageIndex)}
                              className={`relative min-h-28 overflow-hidden rounded-[14px] border-2 bg-secondary active:opacity-80 ${
                                isB ? "border-primary" : isA ? "border-accent" : "border-transparent"
                              }`}
                            >
                              <img src={thumbSrc} alt="" className="h-full w-full object-cover" />
                              <div className="absolute left-2 top-2 flex gap-1">
                                {isA && (
                                  <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-bold text-accent-foreground">
                                    A
                                  </span>
                                )}
                                {isB && (
                                  <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">
                                    B
                                  </span>
                                )}
                              </div>
                              <div className="absolute inset-x-0 bottom-0 bg-background/75 px-2 py-1 text-left text-[11px] text-foreground backdrop-blur">
                                {fmt(item?.created_at)}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    );
                  }
                  if (compareMode === "stack") {
                    return (
                      <div className="relative flex h-full w-full flex-col">
                        <div className="relative flex-1 overflow-hidden rounded-t-[20px] bg-black">
                          <img src={srcA} alt="" className="h-full w-full object-cover" />
                          {badge(`A · ${fmt(imgA?.created_at)}`, "tl")}
                        </div>
                        <div className="h-px w-full bg-foreground/60" />
                        <div className="relative flex-1 overflow-hidden rounded-b-[20px] bg-black">
                          <img src={srcB} alt="" className="h-full w-full object-cover" />
                          {badge(`B · ${fmt(imgB?.created_at)}`, "bl")}
                        </div>
                      </div>
                    );
                  }
                  if (compareMode === "side") {
                    return (
                      <div className="relative flex h-full w-full flex-row">
                        <div className="relative flex-1 overflow-hidden rounded-l-[20px] bg-black">
                          <img src={srcA} alt="" className="h-full w-full object-cover" />
                          {badge(`A · ${fmt(imgA?.created_at)}`, "tl")}
                        </div>
                        <div className="h-full w-px bg-foreground/60" />
                        <div className="relative flex-1 overflow-hidden rounded-r-[20px] bg-black">
                          <img src={srcB} alt="" className="h-full w-full object-cover" />
                          {badge(`B · ${fmt(imgB?.created_at)}`, "tr")}
                        </div>
                      </div>
                    );
                  }
                  // overlay
                  return (
                    <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[20px] bg-black">
                      <img src={srcA} alt="" className="absolute inset-0 h-full w-full object-contain" />
                      <img
                        src={srcB}
                        alt=""
                        className="absolute inset-0 h-full w-full object-contain"
                        style={{ opacity: overlayMix }}
                      />
                      {badge(`A · ${fmt(imgA?.created_at)}`, "tl")}
                      {badge(`B · ${fmt(imgB?.created_at)}`, "tr")}
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={Math.round(overlayMix * 100)}
                        onChange={(e) => setOverlayMix(Number(e.target.value) / 100)}
                        className="absolute bottom-3 left-1/2 w-2/3 -translate-x-1/2 accent-primary"
                      />
                    </div>
                  );
                })() : (
                <div
                  ref={pinSurfaceRef}
                  onPointerDown={(e) => {
                    if (!zone) return;
                    tapStartRef.current = { x: e.clientX, y: e.clientY, t: Date.now() };
                  }}
                  onPointerMove={(e) => {
                    if (pinDrag) movePinDrag(e as any);
                  }}
                  onPointerUp={zone ? handleStagePointerUp(viewer.loc) : undefined}
                  className="relative h-full w-full"
                  style={{ touchAction: "none" }}
                >
                  <img
                    src={src}
                    alt={label}
                    draggable={false}
                    onLoad={(e) => {
                      const t = e.currentTarget;
                      setImgNat({ w: t.naturalWidth, h: t.naturalHeight });
                    }}
                    className="pointer-events-none absolute inset-0 h-full w-full rounded-[20px] object-contain"
                  />
                  {zone && renderZoneMarkers(viewer.loc, "large")}
                  {creatingPin && (
                    <div className="pointer-events-none absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-background/80 text-foreground shadow-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  )}
                </div>
                )
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  Kein Bild
                </div>
              )}

              {/* Right action column */}
              <div className="absolute right-3 top-1/2 flex -translate-y-1/2 flex-col gap-3">
                {!zone && (
                  <button
                    type="button"
                    aria-label="KI-Analyse"
                    onClick={handleAnalysisAction}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-[12px] bg-background/70 text-foreground backdrop-blur active:opacity-80"
                  >
                    <Sparkles className="h-5 w-5" />
                  </button>
                )}
                <button
                  type="button"
                  aria-label="Übersicht"
                  onClick={handleOverview}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-[12px] bg-background/70 text-foreground backdrop-blur active:opacity-80"
                >
                  <LayoutGrid className="h-5 w-5" />
                </button>
                {!zone && (
                  <button
                    type="button"
                    aria-label="Marker"
                    onClick={handleMarkerAction}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-[12px] bg-background/70 text-foreground backdrop-blur active:opacity-80"
                  >
                    <CircleDot className="h-5 w-5" />
                  </button>
                )}
                {imgs.length >= 2 && (
                  <>
                    <button
                      type="button"
                      aria-label="Vergleich"
                      onClick={toggleCompare}
                      className={`inline-flex h-11 w-11 items-center justify-center rounded-[12px] backdrop-blur active:opacity-80 ${
                        compareMode !== "off" ? "bg-primary text-primary-foreground" : "bg-background/70 text-foreground"
                      }`}
                    >
                      <GitCompareArrows className="h-5 w-5" />
                    </button>
                    {compareMode !== "off" && (
                      <button
                        type="button"
                        aria-label="A und B tauschen"
                        onClick={swapAB}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-[12px] bg-background/70 text-foreground backdrop-blur active:opacity-80"
                      >
                        <ArrowLeftRight className="h-5 w-5" />
                      </button>
                    )}
                  </>
                )}
                <button
                  type="button"
                  aria-label="Löschen"
                  onClick={handleDeleteImage}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-[12px] bg-background/70 text-foreground backdrop-blur active:opacity-80"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>

              {/* Fullscreen / expand bottom-left */}
              <button
                type="button"
                aria-label="Vollbild"
                onClick={handleFullscreen}
                className="absolute bottom-3 left-3 inline-flex h-11 w-11 items-center justify-center rounded-[12px] bg-background/70 text-foreground backdrop-blur active:opacity-80"
              >
                <Maximize2 className="h-5 w-5" />
              </button>

              {/* Page indicator dots */}
              {imgs.length > 1 && (
                <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
                  {imgs.map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 w-1.5 rounded-full ${
                        i === idx ? "bg-foreground" : "bg-foreground/40"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {imgs.length >= 2 && compareMode !== "off" && (() => {
              const aResolved = compareIndexA != null && compareIndexA !== idx
                ? compareIndexA
                : (idx > 0 ? idx - 1 : Math.min(imgs.length - 1, idx + 1));
              const newest = imgs.length - 1;
              const secondNewest = Math.max(0, imgs.length - 2);
              return (
                <div className="px-4 pt-3">
                  <div className="rounded-[16px] bg-secondary p-2">
                    <div className="grid grid-cols-4 gap-1">
                      {([
                        ["stack", Rows2, "Oben"],
                        ["side", Columns2, "Nebenein."],
                        ["overlay", Layers, "Overlay"],
                        ["overview", LayoutGrid, "Übersicht"],
                      ] as const).map(([mode, Icon, text]) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => {
                            tapHaptic();
                            setCompareMode(mode);
                          }}
                          className={`inline-flex h-10 flex-col items-center justify-center gap-0.5 rounded-[10px] text-[10px] leading-none active:opacity-80 ${
                            compareMode === mode ? "bg-primary text-primary-foreground" : "bg-background/60 text-foreground"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {text}
                        </button>
                      ))}
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={() => setComparePair(0, newest, compareMode)}
                        className="rounded-[10px] bg-background/60 px-2 py-2 text-xs text-foreground active:opacity-80"
                      >
                        Älteste ↔ Neueste
                      </button>
                      <button
                        type="button"
                        onClick={() => setComparePair(secondNewest, newest, compareMode)}
                        className="rounded-[10px] bg-background/60 px-2 py-2 text-xs text-foreground active:opacity-80"
                      >
                        2. neueste ↔ Neueste
                      </button>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-1">
                      {(["A", "B"] as const).map((target) => (
                        <button
                          key={target}
                          type="button"
                          onClick={() => {
                            tapHaptic();
                            setCompareTarget(target);
                            if (compareMode !== "overview") setCompareMode("overview");
                          }}
                          className={`rounded-[10px] px-2 py-2 text-xs font-semibold active:opacity-80 ${
                            compareTarget === target
                              ? target === "A"
                                ? "bg-accent text-accent-foreground"
                                : "bg-primary text-primary-foreground"
                              : "bg-background/60 text-foreground"
                          }`}
                        >
                          {target} wählen · {target === "A" ? aResolved + 1 : idx + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Thumbnail strip */}
            <div className="flex gap-3 overflow-x-auto px-4 py-3">
              {imgs.map((s, i) => {
                const isB = i === idx;
                const aResolved = compareIndexA != null && compareIndexA !== idx
                  ? compareIndexA
                  : (idx > 0 ? idx - 1 : Math.min(imgs.length - 1, idx + 1));
                const isA = compareMode !== "off" && i === aResolved;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      if (compareMode !== "off") {
                        chooseCompareImage(compareTarget, i);
                      } else {
                        tapHaptic();
                        setImgNat(null);
                        setViewer({ loc: viewer.loc, index: i });
                      }
                    }}
                    className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-[14px] border-2 ${
                      isB ? "border-primary" : isA ? "border-emerald-500" : "border-transparent opacity-80"
                    }`}
                  >
                    <img src={s} alt="" className="h-full w-full object-cover" />
                    {compareMode !== "off" && (isA || isB) && (
                      <span className={`absolute left-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                        isB ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"
                      }`}>
                        {isB ? "B" : "A"}
                      </span>
                    )}
                    {!zone && compareMode === "off" && (
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/80 to-transparent px-1 py-0.5 text-left text-[10px] font-semibold text-foreground">
                        L{viewer.loc.id}
                      </div>
                    )}
                    {zone && compareMode === "off" && (
                      <span className="absolute right-1 top-1 inline-flex items-center gap-0.5 rounded-full bg-background/80 px-1.5 text-[10px] font-semibold text-foreground backdrop-blur">
                        <MapPin className="h-2.5 w-2.5" /> {(zonePinsMap[viewer.loc.id] ?? []).length || imgs.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>


            {/* Bottom action bar */}
            <div
              className="flex gap-3 px-4 pt-2"
              style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1rem)" }}
            >
              <button
                type="button"
                onClick={handleAddPhotoToCurrentLocation}
                disabled={addingPhoto}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-[16px] bg-[hsl(35_45%_55%)] px-4 py-4 text-foreground active:opacity-80"
              >
                {addingPhoto ? <Loader2 className="h-5 w-5 animate-spin" /> : <CameraIcon className="h-5 w-5" />}
                <span className="text-base font-medium">
                  {zone ? "Folgeaufnahme" : `Folgeaufnahme L${viewer.loc.id}`}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setViewer(null)}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-[16px] bg-secondary px-4 py-4 text-foreground active:opacity-80"
              >
                <span className="text-base">Fertig</span>
              </button>
            </div>

            {pinDrag && (
              <div
                className={`pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex items-center justify-center transition-colors ${
                  pinDrag.overTrash ? "bg-destructive/90" : "bg-destructive/40"
                }`}
                style={{ height: TRASH_HIT_PX, paddingBottom: "max(env(safe-area-inset-bottom), 0.5rem)" }}
              >
                <Trash2 className={`h-7 w-7 ${pinDrag.overTrash ? "text-destructive-foreground scale-110" : "text-foreground/80"} transition-transform`} />
              </div>
            )}
          </div>
        );
      })()}

      {overlayCapture && (
        <CameraOverlayCapture
          referenceSrc={overlayCapture.referenceSrc}
          title={
            patient
              ? patient.name?.trim() ||
                `${patient.first_name ?? ""} ${patient.last_name ?? ""}`.trim()
              : overlayCapture.spot.name ?? `L${overlayCapture.spot.id}`
          }
          subtitle={
            patient?.patient_number
              ? `ID ${patient.patient_number}`
              : overlayCapture.spot.name ?? `L${overlayCapture.spot.id}`
          }
          onCancel={() => setOverlayCapture(null)}
          onCapture={async (file) => {
            const spot = overlayCapture.spot;
            setOverlayCapture(null);
            await uploadLesionFile(spot, file);
            if (viewer?.loc.id === spot.id) {
              await refreshViewerLocation(spot.id, Number.MAX_SAFE_INTEGER);
            }
          }}
        />
      )}

      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              KI-Analyse
            </DialogTitle>
          </DialogHeader>
          {(() => {
            if (!viewer) return null;
            const img = locationImages(viewer.loc)[viewer.index];
            const ai = img?.ai_analysis;
            if (ai) return <AiAnalysisResult analysis={ai} />;
            return (
              <p className="text-sm text-muted-foreground">
                Für dieses Foto ist noch keine KI-Analyse vorhanden.
              </p>
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
}
