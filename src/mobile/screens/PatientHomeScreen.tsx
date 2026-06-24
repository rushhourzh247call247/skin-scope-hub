import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Camera,
  Loader2,
  AlertTriangle,
  LogOut,
  ChevronDown,
  List,
  Grid2x2,
  Accessibility,
} from "lucide-react";
import { MobileHeader } from "../components/MobileHeader";
import {
  buildImageUrl,
  fetchClinicalPhotos,
  fetchLesions,
  fetchPatients,
  MobileApiError,
} from "../api";
import type { ClinicalPhoto, Lesion, MobilePatient } from "../types";
import { tapHaptic } from "../native/haptics";

type Tab = "all" | "clinical" | "lesion";
type ViewMode = "list" | "grid" | "body";

export function PatientHomeScreen() {
  const { id } = useParams<{ id: string }>();
  const patientId = Number(id);
  const navigate = useNavigate();

  const [patient, setPatient] = useState<MobilePatient | null>(null);
  const [photos, setPhotos] = useState<ClinicalPhoto[] | null>(null);
  const [lesions, setLesions] = useState<Lesion[] | null>(null);
  const [backendMissing, setBackendMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchPatients();
        if (cancelled) return;
        setPatient(list.find((p) => p.id === patientId) ?? null);
      } catch {
        /* nicht blockierend */
      }
    })();
    (async () => {
      try {
        const [ph, le] = await Promise.all([
          fetchClinicalPhotos(patientId),
          fetchLesions(patientId),
        ]);
        if (cancelled) return;
        setPhotos(ph);
        setLesions(le);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof MobileApiError && err.notDeployed) {
          setBackendMissing(true);
          setPhotos([]);
          setLesions([]);
          return;
        }
        setError(
          err instanceof Error
            ? err.message
            : "Daten konnten nicht geladen werden.",
        );
        setPhotos([]);
        setLesions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  const photoTiles = (photos ?? []).map((p) => ({ kind: "photo" as const, p }));
  const lesionTiles = (lesions ?? []).map((l) => ({ kind: "lesion" as const, l }));

  const tiles = useMemo(() => {
    if (tab === "clinical") return photoTiles;
    if (tab === "lesion") return lesionTiles;
    return [...photoTiles, ...lesionTiles];
  }, [tab, photoTiles, lesionTiles]);

  const startNew = () => {
    tapHaptic();
    navigate(`/m/patients/${patientId}/clinical/new`);
  };

  const renderTile = (tile: (typeof tiles)[number]) => {
    if (tile.kind === "photo") {
      return (
        <Link
          key={`p-${tile.p.id}`}
          to={`/m/patients/${patientId}/clinical/${tile.p.id}`}
          onClick={() => tapHaptic()}
          className="relative block aspect-square overflow-hidden rounded-[18px] bg-secondary shadow-sm active:opacity-80"
        >
          {tile.p.file_path && (
            <img
              src={buildImageUrl(tile.p.file_path)}
              alt="Klinisches Foto"
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          <div className="absolute left-4 top-4 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-card px-2 text-base font-semibold text-foreground shadow-sm">
            {tile.p.lesion_count ?? 0}
          </div>
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/95 via-background/30 to-transparent px-4 py-3 text-card-foreground">
            <div className="text-2xl font-semibold leading-none tracking-normal">
              CL{tile.p.id}
            </div>
            <div className="mt-2 text-base text-foreground/90">
              {new Date(tile.p.taken_at).toLocaleDateString("de-CH", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </div>
          </div>
        </Link>
      );
    }

    return (
      <Link
        key={`l-${tile.l.id}`}
        to={`/m/lesions/${tile.l.id}`}
        onClick={() => tapHaptic()}
        className="relative block aspect-square overflow-hidden rounded-[18px] bg-secondary shadow-sm active:opacity-80"
      >
        <div className="absolute left-4 top-4 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-card px-2 text-base font-semibold text-foreground shadow-sm">
          {tile.l.label.replace(/^L/, "")}
        </div>
        <div className="absolute inset-0 flex items-center justify-center text-[2rem] font-semibold text-primary/75">
          {tile.l.label}
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/95 via-background/30 to-transparent px-4 py-3 text-card-foreground">
          <div className="text-2xl font-semibold leading-none tracking-normal">
            {tile.l.label}
          </div>
          <div className="mt-2 text-base text-foreground/90">
            {new Date(tile.l.created_at).toLocaleDateString("de-CH", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </div>
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
                ["all", `Alle (${(photos?.length ?? 0) + (lesions?.length ?? 0)})`],
                ["clinical", `Klinische (${photos?.length ?? 0})`],
                ["lesion", `Läsion (${lesions?.length ?? 0})`],
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

        {photos === null && !error && !backendMissing && (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Lade…
          </div>
        )}

        {backendMissing && (
          <div className="mt-4 flex items-start gap-2 rounded-[20px] border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Backend (<code>/api/m</code>) ist auf diesem Server noch nicht aktiviert.
            </span>
          </div>
        )}

        {error && !backendMissing && (
          <div className="mt-4 flex items-start gap-2 rounded-[20px] border border-destructive/40 bg-destructive/10 p-4 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
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

        {tiles.length === 0 && photos && lesions && !backendMissing && (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Noch keine Aufnahmen. Tippen Sie auf „Neu“ für ein klinisches Foto.
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