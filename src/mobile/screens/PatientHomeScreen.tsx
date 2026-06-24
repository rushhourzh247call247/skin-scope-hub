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

type Tab = "all" | "zone" | "spot";
type ViewMode = "list" | "grid" | "body";

function isZone(l: Location) {
  return l.type === "overview";
}
function isSpot(l: Location) {
  return !isZone(l) && l.type !== "region" || l.type === "spot" || !l.type;
}

function firstImageSrc(l: Location & { images?: LocationImage[] }): string {
  const img = (l.images ?? [])[0];
  if (!img) return "";
  return api.resolveImageSrc(img);
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

  const tiles = useMemo(() => {
    if (tab === "zone") return zones;
    if (tab === "spot") return spots;
    return locations;
  }, [tab, zones, spots, locations]);

  const startNew = () => {
    tapHaptic();
    navigate(`/m/patients/${patientId}/clinical/new`);
  };

  const renderTile = (loc: Location & { images?: LocationImage[] }) => {
    const img = firstImageSrc(loc);
    const zone = isZone(loc);
    const dateStr = loc.created_at
      ? new Date(loc.created_at).toLocaleDateString("de-CH", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "";
    return (
      <Link
        key={`loc-${loc.id}`}
        to={`/patient/${patientId}`}
        onClick={() => tapHaptic()}
        className="relative block aspect-square overflow-hidden rounded-[18px] bg-secondary shadow-sm active:opacity-80"
      >
        {img ? (
          <img
            src={img}
            alt={loc.name ?? (zone ? "Zone" : "Spot")}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            {zone ? <ImageIcon className="h-8 w-8" /> : <MapPin className="h-8 w-8" />}
          </div>
        )}
        <div className="absolute left-3 top-3 inline-flex h-7 items-center justify-center rounded-full bg-card/90 px-2 text-xs font-semibold text-foreground shadow-sm backdrop-blur">
          {zone ? "Zone" : "Spot"}
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/95 via-background/30 to-transparent px-3 py-2 text-card-foreground">
          <div className="truncate text-base font-semibold leading-tight">
            {loc.name?.trim() || (zone ? `Zone #${loc.id}` : `Spot #${loc.id}`)}
          </div>
          {dateStr && (
            <div className="mt-0.5 text-xs text-foreground/80">{dateStr}</div>
          )}
        </div>
      </Link>
    );
  };


  return (
    <>
      <MobileHeader onClick={() => navigate(-1)} />

      <main className="flex-1 px-4 pb-32">
        <section className="rounded-[26px] bg-card px-4 py-4 shadow-sm">
          <div className="rounded-[18px] bg-primary/20 px-4 py-4">
            <div className="truncate text-2xl font-semibold tracking-normal">
              {patient ? (patient.name?.trim() || `${patient.first_name ?? ""} ${patient.last_name ?? ""}`.trim()) : "Patient"}
            </div>
            {patient?.patient_number && (
              <div className="mt-1 text-base text-muted-foreground">
                ID {patient.patient_number}
              </div>
            )}
          </div>

          <div className="mt-5 grid grid-cols-3 border-b border-border/80">
            {(
              [
                ["all", `Alle (${locations.length})`],
                ["zone", `Zonen (${zones.length})`],
                ["spot", `Spots (${spots.length})`],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => {
                  tapHaptic();
                  setTab(key);
                }}
                className={`px-1 py-4 text-lg transition-colors ${
                  tab === key
                    ? "border-b-2 border-primary text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>


          <div className="mt-5 flex gap-3">
            <button
              type="button"
              className="flex min-h-[58px] flex-1 items-center justify-between rounded-[18px] bg-secondary px-5 text-left text-lg text-foreground"
            >
              <span>Neueste zum Ältesten</span>
              <ChevronDown className="h-6 w-6" />
            </button>

            <div className="flex h-[58px] shrink-0 overflow-hidden rounded-[18px] bg-secondary p-1">
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
                  className={`inline-flex w-12 items-center justify-center rounded-[14px] transition-colors ${
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

        {tiles.length > 0 && (
          <section className="mt-5">
            {viewMode === "list" && (
              <div className="space-y-4">{tiles.map(renderTile)}</div>
            )}

            {viewMode === "grid" && (
              <div className="grid grid-cols-2 gap-3">{tiles.map(renderTile)}</div>
            )}

            {viewMode === "body" && (
              <div className="rounded-[26px] bg-card px-4 py-8 shadow-sm">
                <div className="flex min-h-[360px] items-center justify-center rounded-[20px] bg-secondary/50 px-6 text-center text-muted-foreground">
                  Körperansicht folgt im nächsten Schritt.
                </div>
              </div>
            )}
          </section>
        )}

        {!isLoading && !error && tiles.length === 0 && (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Noch keine {tab === "zone" ? "Zonen" : tab === "spot" ? "Spots" : "Einträge"}. Tippen Sie auf „Neu“.
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