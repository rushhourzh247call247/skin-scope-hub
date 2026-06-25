import { useMemo, useRef, useState } from "react";
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
} from "lucide-react";
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
  const [imgNat, setImgNat] = useState<{ w: number; h: number } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [addingPhoto, setAddingPhoto] = useState(false);
  const [creatingPin, setCreatingPin] = useState(false);
  const [pinDrag, setPinDrag] = useState<{ pinId: number; x: number; y: number; overTrash: boolean } | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const pinSurfaceRef = useRef<HTMLDivElement | null>(null);
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
    setIsFullscreen(false);
    setViewer({ loc, index });
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
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
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
    if (!rect) return;
    // Don't clamp — let pin follow finger anywhere, even outside image.
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
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

          return (
            <div
              key={pin.id}
              className="absolute"
              style={{ left: `${left}%`, top: `${top}%`, transform: "translate(-50%, -100%)" }}
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

  const startNew = () => {
    tapHaptic();
    navigate(`/m/patients/${patientId}/clinical/new`);
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
    const img = locationImages(viewer.loc)[viewer.index];
    const ai = img?.ai_analysis;
    toast({
      title: "KI-Analyse",
      description: ai ? `${ai.risk}: ${ai.result}` : "Für dieses Foto ist keine KI-Analyse vorhanden.",
    });
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
              className="pointer-events-none absolute z-10 flex items-center justify-center"
              style={{ left: `${left}%`, top: `${top}%`, transform: "translate(-50%, -50%)" }}
            >
              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-foreground px-1.5 text-[11px] font-bold text-background shadow-md">
                {pinLabel}
              </span>
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
    const pinLabel = getPinLabel(pin, true);
    const cells: React.ReactNode[] = [];
    cells.push(renderZoneCropCell(zone, pin, pinLabel));
    const imgs = spot ? imageSrcs(spot) : [];
    if (spot && imgs.length === 0) {
      cells.push(renderAddLesionCell(spot));
    } else if (spot) {
      imgs.slice(0, 2).forEach((_, i) => {
        const cell = renderSpotPhotoCell(spot, i, pinLabel);
        if (cell) cells.push(cell);
      });
    }
    while (cells.length < 3) cells.push(<div key={`pad-${zone.id}-${pin.id}-${cells.length}`} />);
    return cells;
  };

  // Orphan spot (no parent zone) – row of available photos or single add-lesion placeholder
  const renderOrphanSpotRow = (spot: Location & { images?: LocationImage[] }, pinLabel: string): React.ReactNode[] => {
    const imgs = imageSrcs(spot);
    const cells: React.ReactNode[] = [];
    if (imgs.length === 0) {
      cells.push(renderAddLesionCell(spot));
    } else {
      imgs.slice(0, 3).forEach((_, i) => {
        const cell = renderSpotPhotoCell(spot, i, pinLabel);
        if (cell) cells.push(cell);
      });
    }
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
        className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 px-4 pb-4 pt-3 backdrop-blur"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1rem)" }}
      >
        <div className="flex gap-3">
          <button
            onClick={startNew}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-[18px] bg-primary px-4 py-4 text-primary-foreground active:opacity-80"
          >
            <Camera className="h-5 w-5" />
            <span className="text-lg font-medium">Neu</span>
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
                  : "relative mx-4 flex flex-1 items-center justify-center overflow-hidden rounded-[20px] bg-secondary"
              }
            >
              {src ? (
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
                  className="relative max-h-full max-w-full"
                  style={{
                    aspectRatio: imgNat ? `${imgNat.w} / ${imgNat.h}` : undefined,
                    width: imgNat ? "100%" : undefined,
                    height: imgNat ? "100%" : undefined,
                    touchAction: "none",
                    ...(imgNat
                      ? imgNat.w / imgNat.h > 1
                        ? { height: "auto" }
                        : { width: "auto" }
                      : {}),
                  }}
                >
                  <img
                    src={src}
                    alt={label}
                    draggable={false}
                    onLoad={(e) => {
                      const t = e.currentTarget;
                      setImgNat({ w: t.naturalWidth, h: t.naturalHeight });
                    }}
                    className="pointer-events-none h-full w-full rounded-[20px] object-contain"
                  />
                  {zone && renderZoneMarkers(viewer.loc, "large")}
                  {creatingPin && (
                    <div className="pointer-events-none absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-background/80 text-foreground shadow-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  )}
                </div>
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
                  aria-label="Körperregion"
                  onClick={handleBodyRegion}
                  className="relative inline-flex h-11 w-11 items-center justify-center rounded-[12px] bg-background/70 text-foreground backdrop-blur active:opacity-80"
                >
                  <Accessibility className="h-5 w-5" />
                  {zone && (
                    <span className="absolute -right-1 -top-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] text-background">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
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


            {/* Thumbnail strip */}
            <div className="flex gap-3 overflow-x-auto px-4 py-3">
              {imgs.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => { setImgNat(null); setViewer({ loc: viewer.loc, index: i }); }}
                  className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-[14px] border-2 ${
                    i === idx ? "border-primary" : "border-transparent opacity-80"
                  }`}
                >
                  <img src={s} alt="" className="h-full w-full object-cover" />
                  {!zone && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/80 to-transparent px-1 py-0.5 text-left text-[10px] font-semibold text-foreground">
                      L{viewer.loc.id}
                    </div>
                  )}
                  {zone && (
                    <span className="absolute right-1 top-1 inline-flex items-center gap-0.5 rounded-full bg-background/80 px-1.5 text-[10px] font-semibold text-foreground backdrop-blur">
                      <MapPin className="h-2.5 w-2.5" /> {(zonePinsMap[viewer.loc.id] ?? []).length || imgs.length}
                    </span>
                  )}
                </button>
              ))}
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
    </>
  );
}
