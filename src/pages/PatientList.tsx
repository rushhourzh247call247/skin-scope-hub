import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Patient } from "@/types/patient";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
import { formatDate } from "@/lib/dateUtils";

const PatientList = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
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
      toast.success(t("patients.deactivated"));
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id: number) => api.activatePatient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast.success(t("patients.activated"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deletePatient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast.success(t("patients.deleted"));
      setDeletePatientId(null);
    },
    onError: () => toast.error(t("patients.deleteError")),
  });

  const activePatients = patients.filter((p: any) => !p.deactivated_at);
  const deactivatedPatients = patients.filter((p: any) => !!p.deactivated_at);

  const visiblePatients = showDeactivated ? patients : activePatients;
  const filtered = visiblePatients
    .filter((p: Patient) => p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a: Patient, b: Patient) => a.name.localeCompare(b.name, "de"));

  return (
    <>
    <div className="container py-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            {t("patients.title")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("patients.activeCount", { count: activePatients.length })}{deactivatedPatients.length > 0 && ` \u00B7 ${t("patients.deactivatedCount", { count: deactivatedPatients.length })}`}
          </p>
        </div>
        {deactivatedPatients.length > 0 && (
          <div className="flex items-center gap-2">
            <label htmlFor="show-deactivated" className="text-xs text-muted-foreground cursor-pointer select-none">
              {t("patients.showDeactivated")}
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
          placeholder={t("patients.searchPlaceholder")}
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
          {t("patients.loadError")}
        </div>
      ) : (
        <div className="rounded-md border bg-card overflow-x-auto">
          <table className="w-full min-w-0">
            <thead>
              <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-3 sm:px-4">
                  <div className="flex items-center gap-1.5">
                    <Hash className="h-3 w-3" /> {t("common.id")}
                  </div>
                </th>
                <th className="px-3 py-3 sm:px-4">{t("common.name")}</th>
                <th className="hidden sm:table-cell px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" /> {t("common.birthDate")}
                  </div>
                </th>
                <th className="hidden lg:table-cell px-4 py-3">{t("patients.lastDoctor")}</th>
                <th className="hidden lg:table-cell px-4 py-3">{t("common.created")}</th>
                <th className="hidden sm:table-cell px-4 py-3 text-right">{t("common.action")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    {search ? t("patients.noResults") : t("patients.noPatients")}
                  </td>
                </tr>
              ) : (
                filtered.map((patient: Patient) => (
                  <tr
                    key={patient.id}
                    className={`border-b last:border-0 transition-colors duration-150 hover:bg-muted/50 ${(patient as any).deactivated_at ? "opacity-50" : "cursor-pointer"}`}
                    onClick={() => !(patient as any).deactivated_at && navigate(`/patient/${patient.id}`)}
                  >
                    <td className="px-3 py-3 sm:px-4">
                      <span className="font-mono text-xs text-muted-foreground">#{(patient as any).patient_number || patient.id}</span>
                    </td>
                    <td className="px-3 py-3 sm:px-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-md bg-secondary text-[10px] sm:text-xs font-medium text-secondary-foreground">
                          {patient.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-medium text-foreground truncate">{patient.name}</span>
                            {(patient as any).is_test_patient && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary shrink-0">Test</Badge>
                            )}
                            {(patient as any).deactivated_at && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">{t("common.deactivated")}</Badge>
                            )}
                          </div>
                          {/* Show birth date below name on mobile */}
                          <span className="sm:hidden text-xs text-muted-foreground">
                            {patient.birth_date ? formatDate(patient.birth_date, "dd. MMM yyyy") : "\u2013"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3 tabular-nums text-sm text-muted-foreground">
                      {patient.birth_date ? formatDate(patient.birth_date, "dd. MMM yyyy") : "\u2013"}
                    </td>
                    <td className="hidden lg:table-cell px-4 py-3 text-sm text-muted-foreground">
                      {(patient as any).last_doctor || (!(patient as any).is_test_patient && (patient as any).created_by_name) || <span className="text-muted-foreground/50">{"\u2013"}</span>}
                    </td>
                    <td className="hidden lg:table-cell px-4 py-3 tabular-nums text-sm text-muted-foreground">
                      {(patient as any).is_test_patient ? "\u2013" : (patient.created_at ? formatDate(patient.created_at, "dd.MM.yyyy") : "\u2013")}
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {(patient as any).deactivated_at ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1 text-xs"
                            onClick={(e) => { e.stopPropagation(); activateMutation.mutate(patient.id); }}
                          >
                            <Power className="h-3 w-3" /> {t("common.activate")}
                          </Button>
                        ) : !(patient as any).is_test_patient ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 gap-1 text-xs text-muted-foreground hover:text-destructive"
                            onClick={(e) => { e.stopPropagation(); deactivateMutation.mutate(patient.id); }}
                          >
                            <PowerOff className="h-3 w-3" /> {t("common.deactivate")}
                          </Button>
                        ) : null}
                        {isAdmin && !(patient as any).is_test_patient && (
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

    <AlertDialog open={deletePatientId !== null} onOpenChange={(open) => !open && setDeletePatientId(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("patients.deleteTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {(() => {
              const p = patients.find((p: any) => p.id === deletePatientId);
              return p
                ? t("patients.deleteDescription", { name: p.name })
                : t("patients.deleteGeneric");
            })()}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => deletePatientId && deleteMutation.mutate(deletePatientId)}
          >
            {t("common.permanentDelete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};

export default PatientList;
