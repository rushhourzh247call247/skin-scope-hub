import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
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
} from "lucide-react";
import { MobileHeader } from "../components/MobileHeader";
import { buildImageUrl } from "../api";
import { api } from "@/lib/api";
import { tapHaptic } from "../native/haptics";
import type { Location, LocationImage } from "@/types/patient";

type Tab = "all" | "clinical" | "lesion";
type ViewMode = "list" | "grid" | "body";

function isZone(l: Location) {
  return l.type === "overview";
}

function imageSrcs(l: Location & { images?: LocationImage[] }): string[] {
  return (l.images ?? []).map((img) => api.resolveImageSrc(img)).filter(Boolean);
}

export function PatientHomeScreen() {
  const { id } = useParams<{ id: string }>();
  const patientId = Number(id);
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

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

  // Big square tile for a Zone (overview) – labelled CL{id}
  const renderZoneTile = (loc: Location & { images?: LocationImage[] }) => {
    const imgs = imageSrcs(loc);
    const cover = imgs[0];
    const firstImageId = loc.images?.[0]?.id;
    const count = (loc.images ?? []).length;
    const target = firstImageId
      ? `/m/patients/${patientId}/clinical/${firstImageId}`
      : `/m/patients/${patientId}/clinical/new`;
    return (
      <Link
        key={`z-${loc.id}`}
        to={target}
        onClick={() => tapHaptic()}
        className="relative col-span-3 block aspect-square overflow-hidden rounded-[18px] bg-secondary shadow-sm active:opacity-80 sm:col-span-1"
      >
...
        {idx === 0 && (
          <div className="absolute right-2 top-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-card/90 px-1.5 text-[11px] font-semibold text-foreground shadow-sm backdrop-blur">
            {loc.id}
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/95 via-background/20 to-transparent px-2 py-1.5 text-card-foreground">
          <div className="truncate text-sm font-semibold leading-tight">
            L{loc.id}
          </div>
          {dateStr && idx === 0 && (
            <div className="text-[10px] text-foreground/80">{dateStr}</div>
          )}
        </div>
      </Link>
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
  }, [tab, zones, spots, locations]);




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
    </>
  );
}