import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search, Loader2, AlertTriangle } from "lucide-react";
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
      <MobileHeader to="/" title="" />

      <main className="px-4 pb-32 flex-1">
        <h1 className="text-3xl font-bold mb-6">Meine Patienten</h1>

        <div className="flex gap-2 mb-3">
          <label className="flex-1 flex items-center gap-2 rounded-xl bg-secondary px-3 py-3">
            <Search className="h-5 w-5 text-muted-foreground" />
            <input
              type="search"
              placeholder="Suche nach Name oder Patienten-Nr"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="bg-transparent outline-none flex-1 text-base placeholder:text-muted-foreground"
            />
          </label>
        </div>

        <button
          onClick={() => {
            tapHaptic();
            navigate("/new-patient");
          }}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-secondary/60 hover:bg-secondary py-4 mb-6 active:opacity-80"
        >
          <Plus className="h-5 w-5" />
          <span className="text-base">Neuer Patient</span>
        </button>

        {patients === null && !error && (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Lade…
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <ul className="space-y-3">
          {filtered.map((p) => (
            <li key={p.id}>
              <Link
                to={`/m/patients/${p.id}`}
                onClick={() => tapHaptic()}
                className="block rounded-xl border border-border/50 bg-card/40 p-4 active:bg-card/70"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl text-primary">
                    {genderSymbol(p.gender)}
                  </span>
                  <div className="min-w-0">
                    <div className="text-base font-medium truncate">
                      {p.first_name} {p.last_name}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
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
            <li className="text-center text-muted-foreground py-10 text-sm">
              Noch keine Patienten.
            </li>
          )}
        </ul>
      </main>
    </>
  );
}
