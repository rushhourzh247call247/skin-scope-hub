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

  const fullName = (p: MobilePatient) =>
    p.name?.trim() || `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim();

  const filtered = (patients ?? []).filter((p) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      fullName(p).toLowerCase().includes(q) ||
      (p.patient_number?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <>
      <MobileHeader to="/" largeTitle="Meine Patienten" />

      <main className="flex-1 px-5 pb-32">
        <div className="mt-4 flex gap-3">
          <label className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl bg-secondary/60 px-4 py-3.5">
            <Search className="h-5 w-5 text-muted-foreground" />
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
            className="inline-flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl bg-secondary/60 text-foreground active:opacity-80"
            aria-label="Sortieren"
          >
            <ArrowDownWideNarrow className="h-5 w-5" />
          </button>
        </div>

        <button
          onClick={() => {
            tapHaptic();
            navigate("/m/patients/new");
          }}
          className="mt-3 flex w-full items-center gap-3 rounded-2xl bg-secondary/60 px-4 py-3.5 text-left active:opacity-80"
        >
          <Plus className="h-6 w-6 shrink-0" />
          <span className="text-base">Neuer Patient</span>
        </button>


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

        <ul className="mt-6 space-y-3">
          {filtered.map((p) => {
            const sym = genderSymbol(p.gender);
            const isFemale = sym === "♀";
            const isMale = sym === "♂";
            return (
            <li key={p.id}>
              <Link
                to={`/m/patients/${p.id}`}
                onClick={() => tapHaptic()}
                className="block rounded-2xl border border-border/60 bg-card/40 px-4 py-3.5 active:opacity-80"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="text-2xl leading-none"
                    style={{
                      color: isFemale
                        ? "hsl(330 75% 60%)"
                        : isMale
                        ? "hsl(210 80% 60%)"
                        : "hsl(var(--muted-foreground))",
                    }}
                  >
                    {sym}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-base font-semibold leading-tight">
                      {fullName(p)}
                    </div>
                    <div className="mt-1 truncate text-xs text-muted-foreground">
                      {p.patient_number ? `ID ${p.patient_number}` : null}
                      {p.birth_date && age(p.birth_date) !== null
                        ? `${p.patient_number ? " | " : ""}${new Date(
                            p.birth_date,
                          ).toLocaleDateString("de-CH", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })} (${age(p.birth_date)})`
                        : null}
                    </div>
                  </div>
                </div>
              </Link>
            </li>
            );
          })}


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