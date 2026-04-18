import { useAuth } from "@/contexts/AuthContext";

/**
 * Hook für Lifecycle-Status der eingeloggten Firma.
 * `isReadOnly` = true wenn die Firma im read_only- oder archived-Modus ist
 * (keine Schreiboperationen erlaubt — Backend liefert HTTP 423).
 */
export function useLifecycle() {
  const { user } = useAuth();
  const status = (user as any)?.company_lifecycle_status as
    | "active"
    | "read_only"
    | "archived"
    | "pending_deletion"
    | undefined;

  const isReadOnly = status === "read_only" || status === "archived";
  const isArchived = status === "archived";
  const isPendingDeletion = status === "pending_deletion";
  const readOnlyUntil = (user as any)?.company_read_only_until as string | undefined;

  const readOnlyTooltip = isReadOnly
    ? "Account im Read-Only-Modus — keine Änderungen möglich"
    : undefined;

  return { status, isReadOnly, isArchived, isPendingDeletion, readOnlyUntil, readOnlyTooltip };
}
