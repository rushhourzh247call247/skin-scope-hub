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
import type { Location, LocationImage, OverviewPin } from "@/types/patient";


type Tab = "all" | "clinical" | "lesion";
type ViewMode = "list" | "grid" | "body";

function isZone(l: Location) {
  return l.type === "overview";
}

function imageSrcs(l: Location & { images?: LocationImage[] }): string[] {
  return (l.images ?? []).map((img) => api.resolveImageSrc(img)).filter(Boolean);
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
  const stageRef = useRef<HTMLDivElement | null>(null);
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

  const getPinLabel = (pin: OverviewPin, compact = false) => {
    const spot = spots.find((s) => s.id === pin.linked_location_id);
    const label = (pin.label || spot?.name || `L${pin.linked_location_id}`).trim();
    return compact ? label.replace(/^L/i, "") : label.startsWith("L") ? label : `L${label}`;
  };

  const renderZoneMarkers = (loc: Location, size: "small" | "large") => {
    const pins = zonePinsMap[loc.id] ?? [];
    if (!pins.length) return null;

    return (
      <div className="pointer-events-none absolute inset-0 z-10">
        {pins.map((pin, i) => {
          const left = clampPct(pin.x_pct);
          const top = clampPct(pin.y_pct);
          const compact = size === "small";
          return (
            <div
              key={pin.id}
              className="absolute flex items-center justify-center"
              style={{ left: `${left}%`, top: `${top}%`, transform: "translate(-50%, -50%)" }}
            >
              {compact ? (
                <span
                  className="inline-flex items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background shadow-md"
                  style={{ width: 24, height: 24, marginTop: i % 2 ? 18 : 0 }}
                >
                  {getPinLabel(pin, true)}
                </span>
              ) : (
                <div className="relative flex items-center gap-1.5">
                  <span className="rounded-[5px] bg-foreground px-1.5 py-0.5 text-base font-bold leading-none text-background shadow-md">
                    {getPinLabel(pin)}
                  </span>
                  <span className="relative inline-flex h-16 w-16 items-center justify-center rounded-full border-2 border-foreground bg-background/20 text-foreground shadow-sm backdrop-blur-[1px] after:absolute after:-bottom-3 after:left-1/2 after:h-0 after:w-0 after:-translate-x-1/2 after:border-x-[7px] after:border-t-[12px] after:border-x-transparent after:border-t-foreground">
                    <CameraIcon className="h-6 w-6" />
                  </span>
                </div>
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

  const openViewer = (loc: Location & { images?: LocationImage[] }, index = 0) => {
    if (!(loc.images?.length)) return;
    tapHaptic();
    setViewer({ loc, index });
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
          <img
            src={cover}
            alt={loc.name ?? "Zone"}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <ImageIcon className="h-10 w-10" />
          </div>
        )}
        {renderZoneMarkers(loc, "small")}
        <div className="absolute right-3 top-3 inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-card/90 px-2 text-xs font-semibold text-foreground shadow-sm backdrop-blur">
          {count}
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/95 via-background/30 to-transparent px-3 py-2 text-left text-card-foreground">
          <div className="truncate text-lg font-semibold leading-tight">
            CL{loc.id}{count ? ` (${count})` : ""}
          </div>
          {loc.created_at && (
            <div className="mt-0.5 text-xs text-foreground/80">
              {fmtDate(loc.created_at)}
            </div>
          )}
        </div>
      </button>
    );
  };

  // Row of up to 3 thumbnails for a Spot – labelled L{id}
  const renderSpotRow = (loc: Location & { images?: LocationImage[] }) => {
    const imgs = imageSrcs(loc).slice(0, 3);
    const cells = [0, 1, 2].map((i) => imgs[i] ?? null);
    const dateStr = fmtDate(loc.created_at);
    return cells.map((src, idx) => (
      <button
        type="button"
        key={`s-${loc.id}-${idx}`}
        onClick={() => openViewer(loc, idx)}
        disabled={!src}
        className="relative block aspect-square overflow-hidden rounded-[14px] bg-secondary shadow-sm active:opacity-80 disabled:opacity-60"
      >
        {src ? (
          <img
            src={src}
            alt={`L${loc.id}`}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <MapPin className="h-6 w-6" />
          </div>
        )}
        {idx === 0 && (
          <div className="absolute right-2 top-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-card/90 px-1.5 text-[11px] font-semibold text-foreground shadow-sm backdrop-blur">
            {loc.id}
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/95 via-background/20 to-transparent px-2 py-1.5 text-left text-card-foreground">
          <div className="truncate text-sm font-semibold leading-tight">
            L{loc.id}
          </div>
          {dateStr && idx === 0 && (
            <div className="text-[10px] text-foreground/80">{dateStr}</div>
          )}
        </div>
      </button>
    ));
  };




  const renderGroup = (loc: Location & { images?: LocationImage[] }) => (
    isZone(loc) ? renderZoneTile(loc) : renderSpotRow(loc)
  );

  const renderedTiles = useMemo(() => {
    const arr =
      tab === "clinical" ? zones : tab === "lesion" ? spots : locations;
    return arr.flatMap((l) => {
      const out = renderGroup(l);
      return Array.isArray(out) ? out : [out];
    });
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

            {/* Image stage */}
            <div className="relative mx-4 flex-1 overflow-hidden rounded-[20px] bg-secondary">
              {src ? (
                <img
                  src={src}
                  alt={label}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  Kein Bild
                </div>
              )}

              {/* Title overlay */}
              <div className="absolute left-4 top-3 text-foreground drop-shadow">
                <div className="text-2xl font-semibold leading-tight">{label}</div>
                {dateTime && (
                  <div className="mt-0.5 text-sm text-foreground/85">{dateTime}</div>
                )}
              </div>

              {zone && renderZoneMarkers(viewer.loc, "large")}

              {/* Right action column */}
              <div className="absolute right-3 top-1/2 flex -translate-y-1/2 flex-col gap-3">
                {!zone && (
                  <button
                    type="button"
                    aria-label="KI-Analyse"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-[12px] bg-background/70 text-foreground backdrop-blur active:opacity-80"
                  >
                    <Sparkles className="h-5 w-5" />
                  </button>
                )}
                <button
                  type="button"
                  aria-label="Körperregion"
                  className="relative inline-flex h-11 w-11 items-center justify-center rounded-[12px] bg-background/70 text-foreground backdrop-blur active:opacity-80"
                >
                  <Accessibility className="h-5 w-5" />
                  {zone && (
                    <span className="absolute -right-1 -top-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] text-background">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  aria-label="Marker"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-[12px] bg-background/70 text-foreground backdrop-blur active:opacity-80"
                >
                  <CircleDot className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  aria-label="Löschen"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-[12px] bg-background/70 text-foreground backdrop-blur active:opacity-80"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>

              {/* Fullscreen / expand bottom-left */}
              <button
                type="button"
                aria-label="Vollbild"
                className="absolute bottom-3 left-3 inline-flex h-11 w-11 items-center justify-center rounded-[12px] bg-background/70 text-foreground backdrop-blur active:opacity-80"
              >
                <Maximize2 className="h-5 w-5" />
              </button>

              {/* Page indicator dots */}
              {imgs.length > 1 && (
                <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
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
                  onClick={() => setViewer({ loc: viewer.loc, index: i })}
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
                onClick={() => {
                  tapHaptic();
                  setViewer(null);
                  navigate(`/m/patients/${patientId}/clinical/new`);
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-[16px] bg-[hsl(35_45%_55%)] px-4 py-4 text-foreground active:opacity-80"
              >
                <CameraIcon className="h-5 w-5" />
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
          </div>
        );
      })()}
    </>
  );
}
