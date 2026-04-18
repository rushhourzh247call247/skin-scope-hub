import { AlertTriangle, Archive } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Globaler Lifecycle-Banner — wird oberhalb der App gezeigt, wenn die Firma
 * im Read-Only- oder Archiv-Modus ist (nach Vertragsende).
 *
 * Unterstützt sowohl die aktuelle flache API-Form
 * (`user.company_lifecycle_status`) als auch die ältere verschachtelte Form.
 */
export function LifecycleBanner() {
  const { user } = useAuth();
  const status = ((user as any)?.company_lifecycle_status ?? (user as any)?.company?.lifecycle_status) as
    | "active"
    | "read_only"
    | "archived"
    | "pending_deletion"
    | undefined;

  if (!status || status === "active") return null;

  const readOnlyUntil = ((user as any)?.company_read_only_until ??
    (user as any)?.company?.read_only_until) as string | undefined;
  const formattedUntil = readOnlyUntil
    ? new Date(readOnlyUntil).toLocaleDateString("de-CH")
    : null;

  if (status === "read_only") {
    return (
      <div className="border-b border-amber-500/40 bg-amber-500/10 px-4 py-2">
        <div className="mx-auto flex max-w-7xl items-center gap-2 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
          <span className="font-medium text-amber-700">
            Read-Only{formattedUntil ? <> bis <strong>{formattedUntil}</strong></> : null}
          </span>
        </div>
      </div>
    );
  }

  if (status === "archived") {
    return (
      <div className="border-b border-blue-500/40 bg-blue-500/10 px-4 py-2">
        <div className="mx-auto flex max-w-7xl items-center gap-2 text-sm">
          <Archive className="h-4 w-4 shrink-0 text-blue-600" aria-hidden />
          <span className="font-medium text-blue-700">Archiv-Modus</span>
        </div>
      </div>
    );
  }

  return null;
}
