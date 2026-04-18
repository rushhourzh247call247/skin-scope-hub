import { useState } from "react";
import { AlertTriangle, Archive, Trash2, Download } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * Globaler Lifecycle-Banner — wird oberhalb der App gezeigt, wenn die Firma
 * im Read-Only- oder Archiv-Modus ist (nach Vertragsende).
 *
 * Während Read-Only-Phase (30 Tage Kulanz nach Vertragsende):
 *  - Kunde kann "Daten archivieren" wählen → automatischer Archiv-Vertrag (CHF 50/Mt, 60 Tage kündbar)
 *  - Kunde kann "Daten löschen" wählen → physische Löschung beim nächsten Cron
 *
 * Während Archiv-Phase:
 *  - Kunde kann "Archiv kündigen" → 60 Tage Frist, dann Löschung
 */
export function LifecycleBanner() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [confirmDialog, setConfirmDialog] = useState<
    null | "archive" | "delete" | "cancel-archive"
  >(null);

  const status = ((user as any)?.company_lifecycle_status ??
    (user as any)?.company?.lifecycle_status) as
    | "active"
    | "read_only"
    | "archived"
    | "pending_deletion"
    | undefined;

  const companyId = ((user as any)?.company_id ?? (user as any)?.company?.id) as
    | number
    | undefined;

  // Nur Firmen-Admins dürfen Lifecycle-Entscheidungen (Archivieren/Löschen/Kündigen) treffen.
  // Normale Ärzte (role=user) sehen ausschließlich den Hinweis-Banner.
  const role = (user as any)?.role as string | undefined;
  const canManageLifecycle = role === "admin";

  const readOnlyUntil = ((user as any)?.company_read_only_until ??
    (user as any)?.company?.read_only_until) as string | undefined;
  const archiveUntil = ((user as any)?.company_archive_until ??
    (user as any)?.company?.archive_until) as string | undefined;

  const formatDate = (s?: string) =>
    s ? new Date(s).toLocaleDateString("de-CH") : null;

  const archiveOptInMutation = useMutation({
    mutationFn: () => api.archiveOptIn(companyId!),
    onSuccess: () => {
      toast.success("Archivierung aktiviert — Daten bleiben verfügbar");
      queryClient.invalidateQueries();
      setConfirmDialog(null);
    },
    onError: (e: any) =>
      toast.error(e?.message || "Archivierung fehlgeschlagen"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.requestCompanyDeletion(companyId!),
    onSuccess: () => {
      toast.success("Löschung beantragt — Daten werden in Kürze entfernt");
      queryClient.invalidateQueries();
      setConfirmDialog(null);
    },
    onError: (e: any) => toast.error(e?.message || "Löschung fehlgeschlagen"),
  });

  const cancelArchiveMutation = useMutation({
    mutationFn: () => api.archiveCancel(companyId!),
    onSuccess: (data) => {
      const until = formatDate(data.archive_until);
      toast.success(`Archiv gekündigt — Zugriff bis ${until}`);
      queryClient.invalidateQueries();
      setConfirmDialog(null);
    },
    onError: (e: any) => toast.error(e?.message || "Kündigung fehlgeschlagen"),
  });

  if (!status || status === "active") return null;

  const formattedReadOnly = formatDate(readOnlyUntil);
  const formattedArchive = formatDate(archiveUntil);
  const isPending =
    archiveOptInMutation.isPending ||
    deleteMutation.isPending ||
    cancelArchiveMutation.isPending;

  // ===== READ-ONLY (30 Tage Kulanz nach Vertragsende) =====
  if (status === "read_only") {
    return (
      <>
        <div className="border-b border-amber-500/40 bg-amber-500/10 px-4 py-2">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle
                className="h-4 w-4 shrink-0 text-amber-600"
                aria-hidden
              />
              <span className="font-medium text-amber-700">
                Vertragsende — Read-Only
                {formattedReadOnly ? (
                  <>
                    {" "}
                    bis <strong>{formattedReadOnly}</strong>
                  </>
                ) : null}
              </span>
            </div>
            {companyId && canManageLifecycle && (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 border-amber-600/40 bg-background hover:bg-amber-500/10"
                  onClick={() => setConfirmDialog("archive")}
                  disabled={isPending}
                >
                  <Archive className="mr-1.5 h-3.5 w-3.5" />
                  Daten archivieren (CHF 50/Mt)
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 border-destructive/40 bg-background text-destructive hover:bg-destructive/10"
                  onClick={() => setConfirmDialog("delete")}
                  disabled={isPending}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Daten löschen
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Confirm: Archivieren */}
        <AlertDialog
          open={confirmDialog === "archive"}
          onOpenChange={(o) => !o && setConfirmDialog(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Daten archivieren?</AlertDialogTitle>
              <AlertDialogDescription>
                Es wird automatisch ein Archiv-Vertrag erstellt:{" "}
                <strong>CHF 50 pro Monat</strong>, monatlich kündbar mit{" "}
                <strong>60 Tagen Frist</strong>, keine Mindestlaufzeit. Sie
                behalten lesenden Zugriff auf alle Daten und können diese
                jederzeit exportieren.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isPending}>
                Abbrechen
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  archiveOptInMutation.mutate();
                }}
                disabled={isPending}
              >
                Archivierung aktivieren
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Confirm: Löschen */}
        <AlertDialog
          open={confirmDialog === "delete"}
          onOpenChange={(o) => !o && setConfirmDialog(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-destructive">
                Alle Daten unwiderruflich löschen?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Sämtliche Patientendaten, Bilder, Befunde und Berichte werden
                physisch entfernt. Diese Aktion kann{" "}
                <strong>nicht rückgängig</strong> gemacht werden. Bitte
                exportieren Sie zuvor alle benötigten Unterlagen.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isPending}>
                Abbrechen
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  deleteMutation.mutate();
                }}
                disabled={isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Endgültig löschen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // ===== ARCHIVIERT =====
  if (status === "archived") {
    const cancellationPending = !!archiveUntil;
    return (
      <>
        <div className="border-b border-blue-500/40 bg-blue-500/10 px-4 py-2">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Archive
                className="h-4 w-4 shrink-0 text-blue-600"
                aria-hidden
              />
              <span className="font-medium text-blue-700">
                {cancellationPending ? (
                  <>
                    Archiv gekündigt — Zugriff bis{" "}
                    <strong>{formattedArchive}</strong>
                  </>
                ) : (
                  <>Archiv-Modus (CHF 50/Mt, 60 Tage Kündigung)</>
                )}
              </span>
            </div>
            {companyId && !cancellationPending && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 border-blue-600/40 bg-background hover:bg-blue-500/10"
                onClick={() => setConfirmDialog("cancel-archive")}
                disabled={isPending}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Archiv kündigen
              </Button>
            )}
          </div>
        </div>

        <AlertDialog
          open={confirmDialog === "cancel-archive"}
          onOpenChange={(o) => !o && setConfirmDialog(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Archiv kündigen?</AlertDialogTitle>
              <AlertDialogDescription>
                Sie behalten <strong>60 Tage</strong> lang lesenden Zugriff zum
                Export Ihrer Daten. Nach Ablauf werden alle Daten unwiderruflich
                gelöscht. Die Verrechnung läuft bis zum Ablaufdatum weiter.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isPending}>
                Abbrechen
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  cancelArchiveMutation.mutate();
                }}
                disabled={isPending}
              >
                Kündigung bestätigen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return null;
}
