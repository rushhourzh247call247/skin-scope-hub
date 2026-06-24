import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Camera, Loader2, AlertTriangle, LogOut, LayoutGrid } from "lucide-react";
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

  const tiles = useMemo(() => {
    const ph = (photos ?? []).map((p) => ({ kind: "photo" as const, p }));
    const le = (lesions ?? []).map((l) => ({ kind: "lesion" as const, l }));
    if (tab === "clinical") return ph;
    if (tab === "lesion") return le;
    return [...ph, ...le];
  }, [photos, lesions, tab]);

  const startNew = () => {
    tapHaptic();
    navigate(`/m/patients/${patientId}/clinical/new`);
  };

  return (
    <>
      <MobileHeader
        title={
          <span className="inline-flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" />
            <span className="truncate">
              {patient ? `${patient.first_name} ${patient.last_name}` : "Patient"}
            </span>
          </span>
        }
        to="/m/patients"
        right={
          <Link
            to="/m/patients"
            onClick={() => tapHaptic()}
            className="inline-flex items-center text-xs text-muted-foreground gap-1"
          >
            Beenden <LogOut className="h-3.5 w-3.5" />
          </Link>
        }
      />

      <main className="px-4 pb-32 flex-1">
        {/* Patienten-Karte */}
        <div className="rounded-xl bg-primary/20 border border-primary/30 px-4 py-4 mb-5">
          <div className="text-base font-semibold truncate">
            {patient ? `${patient.first_name} ${patient.last_name}` : "—"}
          </div>
          {patient?.patient_number && (
            <div className="text-xs opacity-80 truncate">
              ID {patient.patient_number}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-3 border-b border-border mb-3">
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
              className={`py-3 text-sm transition-colors ${
                tab === key
                  ? "text-foreground border-b-2 border-primary"
                  : "text-muted-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* States */}
        {photos === null && !error && !backendMissing && (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Lade…
          </div>
        )}
        {backendMissing && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs flex items-start gap-2 mb-4">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              Backend (<code>/api/m</code>) ist auf diesem Server noch nicht
              aktiviert. Migration muss auf <code>dev.derm247.ch</code>{" "}
              ausgeführt werden.
            </span>
          </div>
        )}
        {error && !backendMissing && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs flex items-start gap-2 mb-4">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Tiles */}
        {tiles.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {tiles.map((t, idx) => {
              if (t.kind === "photo") {
                return (
                  <Link
                    key={`p-${t.p.id}`}
                    to={`/m/patients/${patientId}/clinical/${t.p.id}`}
                    onClick={() => tapHaptic()}
                    className="relative aspect-square rounded-xl overflow-hidden bg-secondary active:opacity-80"
                  >
                    {t.p.file_path && (
                      <img
                        src={buildImageUrl(t.p.file_path)}
                        alt="Klinisches Foto"
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/70 to-transparent text-xs text-white">
                      <div className="font-medium">
                        Klinisch {t.p.lesion_count ?? 0}
                      </div>
                      <div className="opacity-80">
                        {new Date(t.p.taken_at).toLocaleDateString("de-CH")}
                      </div>
                    </div>
                  </Link>
                );
              }
              return (
                <Link
                  key={`l-${t.l.id}`}
                  to={`/m/lesions/${t.l.id}`}
                  onClick={() => tapHaptic()}
                  className="relative aspect-square rounded-xl overflow-hidden bg-secondary active:opacity-80 flex items-center justify-center"
                >
                  <span className="text-3xl font-bold text-primary/80">
                    {t.l.label}
                  </span>
                  <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/70 to-transparent text-xs text-white">
                    <div className="font-medium">{t.l.label}</div>
                    <div className="opacity-80">
                      {new Date(t.l.created_at).toLocaleDateString("de-CH")}
                    </div>
                  </div>
                </Link>
              );
              void idx;
            })}
          </div>
        )}

        {tiles.length === 0 && photos && lesions && !backendMissing && (
          <div className="text-center text-muted-foreground py-16 text-sm">
            Noch keine Aufnahmen. Tippen Sie auf „Neu" für ein klinisches Foto.
          </div>
        )}
      </main>

      {/* Bottom Action Bar */}
      <div
        className="fixed inset-x-0 bottom-0 px-4 pb-4 pt-3 bg-background/95 backdrop-blur border-t border-border"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1rem)" }}
      >
        <div className="flex gap-3">
          <button
            onClick={startNew}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground py-4 active:opacity-80"
          >
            <Camera className="h-5 w-5" />
            <span className="text-base font-medium">Neu</span>
          </button>
          <Link
            to="/m/patients"
            onClick={() => tapHaptic()}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-secondary text-foreground py-4 active:opacity-80"
          >
            <LogOut className="h-5 w-5" />
            <span className="text-base">Patient beenden</span>
          </Link>
        </div>
      </div>
    </>
  );
}
