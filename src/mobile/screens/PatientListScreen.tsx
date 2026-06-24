import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search, Loader2, AlertTriangle, ArrowDownWideNarrow } from "lucide-react";
import { MobileHeader } from "../components/MobileHeader";
import { fetchPatients, MobileApiError } from "../api";
import type { MobilePatient } from "../types";
import { tapHaptic } from "../native/haptics";

function genderSymbol(g?: string | null) {
  if (!g) return "•";
  const s = g.toLowerCase();
  if (s.startsWith("w") || s.startsWith("f")) return "♀";
  if (s.startsWith("m")) return "♂";
  return "•";
}

function age(birthdate?: string | null): number | null {
  if (!birthdate) return null;
  const d = new Date(birthdate);
  if (Number.isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  const a = Math.floor(diff / (365.25 * 24 * 3600 * 1000));
  return a >= 0 && a < 130 ? a : null;
}

export function PatientListScreen() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<MobilePatient[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchPatients();
        if (!cancelled) setPatients(list);
      } catch (err) {
        if (cancelled) return;
        const msg =
          err instanceof MobileApiError
            ? err.message
            : "Patienten konnten nicht geladen werden.";
        setError(msg);
        setPatients([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = (patients ?? []).filter((p) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
      (p.patient_number?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <>
      <MobileHeader to="/" largeTitle="Meine Patienten" />

      <main className="flex-1 px-4 pb-32">
        <section className="-mt-2 rounded-[26px] bg-card px-4 py-4 shadow-sm">
          <div className="flex gap-3 mb-4">
            <label className="flex min-w-0 flex-1 items-center gap-3 rounded-[20px] bg-secondary px-4 py-4">
              <Search className="h-6 w-6 text-foreground" />
              <input
                type="search"
                placeholder="Suche nach Name oder Patienten-Nr"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
              />
            </label>

            <button
              type="button"
              className="inline-flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-[18px] bg-secondary text-foreground active:opacity-80"
              aria-label="Sortieren"
            >
              <ArrowDownWideNarrow className="h-7 w-7" />
            </button>
          </div>

          <button
            onClick={() => {
              tapHaptic();
              navigate("/new-patient");
            }}
            className="flex w-full items-center gap-4 rounded-[20px] bg-secondary px-5 py-5 text-left active:opacity-80"
          >
            <Plus className="h-8 w-8 shrink-0" />
            <span className="text-lg">Neuer Patient</span>
          </button>
        </section>

        {patients === null && !error && (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Lade…
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-[20px] border border-destructive/40 bg-destructive/10 p-4 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <ul className="mt-5 space-y-4">
          {filtered.map((p) => (
            <li key={p.id}>
              <Link
                to={`/m/patients/${p.id}`}
                onClick={() => tapHaptic()}
                className="block rounded-[20px] border border-border bg-background px-5 py-5 shadow-sm active:opacity-80"
              >
                <div className="flex items-center gap-4">
                  <span className="text-4xl leading-none text-primary">
                    {genderSymbol(p.gender)}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-[1.85rem] font-semibold leading-none tracking-normal">
                      {p.first_name} {p.last_name}
                    </div>
                    <div className="mt-3 truncate text-base text-muted-foreground">
                      {p.patient_number ? `ID ${p.patient_number}` : null}
                      {p.birthdate && age(p.birthdate) !== null
                        ? `${p.patient_number ? " | " : ""}${new Date(
                            p.birthdate,
                          ).toLocaleDateString("de-CH", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })} (${age(p.birthdate)})`
                        : null}
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          ))}

          {patients && patients.length === 0 && (
            <li className="py-10 text-center text-sm text-muted-foreground">
              Noch keine Patienten.
            </li>
          )}
        </ul>
      </main>
    </>
  );
}