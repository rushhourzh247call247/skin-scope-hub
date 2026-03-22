import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Patient } from "@/types/patient";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Calendar, Hash, Power, PowerOff, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "sonner";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const PatientList = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showDeactivated, setShowDeactivated] = useState(false);
  const [deletePatientId, setDeletePatientId] = useState<number | null>(null);

  const { data: patients = [], isLoading, error } = useQuery({
    queryKey: ["patients"],
    queryFn: api.getPatients,
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: number) => api.deactivatePatient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast.success("Patient deaktiviert");
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id: number) => api.activatePatient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast.success("Patient aktiviert");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deletePatient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast.success("Patient gelöscht");
      setDeletePatientId(null);
    },
    onError: () => toast.error("Fehler beim Löschen"),
  });

  const activePatients = patients.filter((p: any) => !p.deactivated_at);
  const deactivatedPatients = patients.filter((p: any) => !!p.deactivated_at);

  const visiblePatients = showDeactivated ? patients : activePatients;
  const filtered = visiblePatients.filter((p: Patient) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
    <div className="container py-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Patienten
          </h2>
          <p className="text-sm text-muted-foreground">
            {activePatients.length} aktiv{deactivatedPatients.length > 0 && ` · ${deactivatedPatients.length} deaktiviert`}
          </p>
        </div>
        {deactivatedPatients.length > 0 && (
          <div className="flex items-center gap-2">
            <label htmlFor="show-deactivated" className="text-xs text-muted-foreground cursor-pointer select-none">
              Deaktivierte anzeigen
            </label>
            <Switch
              id="show-deactivated"
              checked={showDeactivated}
              onCheckedChange={setShowDeactivated}
            />
          </div>
        )}
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Patient suchen…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : error ? (
        <div className="rounded-md border border-destructive/20 bg-destructive/5 p-6 text-center text-sm text-destructive">
          Fehler beim Laden der Patienten.
        </div>
      ) : (
        <div className="rounded-md border bg-card">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <Hash className="h-3 w-3" /> ID
                  </div>
                </th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" /> Geburtsdatum
                  </div>
                </th>
                <th className="px-4 py-3">Letzter Arzt</th>
                <th className="px-4 py-3">Erstellt</th>
                <th className="px-4 py-3 text-right">Aktion</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    {search ? "Keine Patienten gefunden." : "Noch keine Patienten vorhanden."}
                  </td>
                </tr>
              ) : (
                filtered.map((patient: Patient) => (
                  <tr
                    key={patient.id}
                    className={`border-b last:border-0 transition-colors duration-150 hover:bg-muted/50 ${(patient as any).deactivated_at ? "opacity-50" : "cursor-pointer"}`}
                    onClick={() => !(patient as any).deactivated_at && navigate(`/patient/${patient.id}`)}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-muted-foreground">#{patient.id}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-secondary text-xs font-medium text-secondary-foreground">
                          {patient.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{patient.name}</span>
                          {(patient as any).deactivated_at && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Deaktiviert</Badge>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-sm text-muted-foreground">
                      {patient.birth_date ? format(new Date(patient.birth_date), "dd. MMM yyyy", { locale: de }) : "–"}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {(patient as any).last_doctor || <span className="text-muted-foreground/50">–</span>}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-sm text-muted-foreground">
                      {patient.created_at ? format(new Date(patient.created_at), "dd.MM.yyyy", { locale: de }) : "–"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {(patient as any).deactivated_at ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1 text-xs"
                            onClick={(e) => { e.stopPropagation(); activateMutation.mutate(patient.id); }}
                          >
                            <Power className="h-3 w-3" /> Aktivieren
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 gap-1 text-xs text-muted-foreground hover:text-destructive"
                            onClick={(e) => { e.stopPropagation(); deactivateMutation.mutate(patient.id); }}
                          >
                            <PowerOff className="h-3 w-3" /> Deaktivieren
                          </Button>
                        )}
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            onClick={(e) => { e.stopPropagation(); setDeletePatientId(patient.id); }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
    </div>

    {/* Admin: Delete Patient Confirmation */}
    <AlertDialog open={deletePatientId !== null} onOpenChange={(open) => !open && setDeletePatientId(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Patient endgültig löschen?</AlertDialogTitle>
          <AlertDialogDescription>
            {(() => {
              const p = patients.find((p: any) => p.id === deletePatientId);
              return p
                ? <><strong>{p.name}</strong> und alle zugehörigen Daten (Spots, Bilder, Befunde) werden unwiderruflich gelöscht.</>
                : "Dieser Patient wird unwiderruflich gelöscht.";
            })()}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => deletePatientId && deleteMutation.mutate(deletePatientId)}
          >
            Endgültig löschen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};

export default PatientList;
