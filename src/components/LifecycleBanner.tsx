import { AlertTriangle, Archive } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Globaler Lifecycle-Banner — wird oberhalb der App gezeigt, wenn die Firma
 * im Read-Only- oder Archiv-Modus ist (nach Vertragsende).
 *
 * Daten kommen aus user.company.lifecycle_status (Backend muss /api/auth/me
 * bzw. /api/login Response um company.lifecycle_status erweitern).
 */
export function LifecycleBanner() {
  const { user } = useAuth();
  const status = (user as any)?.company?.lifecycle_status as
    | "active"
    | "read_only"
    | "archived"
    | "pending_deletion"
    | undefined;

  if (!status || status === "active") return null;

  const readOnlyUntil = (user as any)?.company?.read_only_until as string | undefined;
  const formattedUntil = readOnlyUntil
    ? new Date(readOnlyUntil).toLocaleDateString("de-CH")
    : null;

  if (status === "read_only") {
    return (
      <div className="border-b border-amber-500/40 bg-amber-500/10 px-4 py-2.5">
        <div className="flex items-start gap-3 max-w-7xl mx-auto">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" aria-hidden />
          <div className="text-sm">
            <p className="font-semibold text-amber-700">
              Read-Only-Modus — Vertrag beendet
            </p>
            <p className="text-amber-700/80 mt-0.5">
              Sie können Daten ansehen und exportieren, aber keine Änderungen mehr vornehmen.
              {formattedUntil && (
                <> Die Daten werden am <strong>{formattedUntil}</strong> automatisch gelöscht.</>
              )}{" "}
              Bei Fragen kontaktieren Sie info@techassist.ch.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "archived") {
    return (
      <div className="border-b border-blue-500/40 bg-blue-500/10 px-4 py-2.5">
        <div className="flex items-start gap-3 max-w-7xl mx-auto">
          <Archive className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" aria-hidden />
          <div className="text-sm">
            <p className="font-semibold text-blue-700">Archiv-Modus</p>
            <p className="text-blue-700/80 mt-0.5">
              Ihr Account ist im kostenpflichtigen Archiv-Modus (CHF 50.– / Monat). Read-Only-Zugriff
              für Ansicht und Export. Keine Änderungen möglich.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
