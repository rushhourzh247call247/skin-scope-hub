import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Database, Building2, User, Image, MapPin, FileText, RotateCcw, Calendar, HardDrive, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/dateUtils";
type View =
  | { type: "list" }
  | { type: "snapshot"; date: string }
  | { type: "company-patients"; date: string; companyId: number; companyName: string }
  | { type: "patient-detail"; date: string; patientId: number; patientName: string };

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

const Snapshots = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [view, setView] = useState<View>({ type: "list" });
  const [restoreConfirm, setRestoreConfirm] = useState<{ type: "patient" | "company"; date: string; id: number; name: string } | null>(null);

  const { data: snapshots = [], isLoading: loadingSnapshots } = useQuery({
    queryKey: ["snapshots"],
    queryFn: api.getSnapshots,
  });

  const currentDate = view.type !== "list" ? (view as any).date : null;

  const { data: companies = [], isLoading: loadingCompanies } = useQuery({
    queryKey: ["snapshot-companies", currentDate],
    queryFn: () => api.getSnapshotCompanies(currentDate!),
    enabled: !!currentDate && view.type === "snapshot",
  });

  const companyId = view.type === "company-patients" ? view.companyId : undefined;
  const { data: patients = [], isLoading: loadingPatients } = useQuery({
    queryKey: ["snapshot-patients", currentDate, companyId],
    queryFn: () => api.getSnapshotPatients(currentDate!, companyId),
    enabled: !!currentDate && view.type === "company-patients",
  });

  const patientId = view.type === "patient-detail" ? view.patientId : undefined;
  const { data: patientDetail, isLoading: loadingDetail } = useQuery({
    queryKey: ["snapshot-patient-detail", currentDate, patientId],
    queryFn: () => api.getSnapshotPatientDetail(currentDate!, patientId!),
    enabled: !!currentDate && !!patientId && view.type === "patient-detail",
  });

  const restorePatientMutation = useMutation({
    mutationFn: ({ date, id }: { date: string; id: number }) => api.restorePatientFromSnapshot(date, id),
    onSuccess: (data) => {
      toast.success(data.message || t('snapshots.restoreSuccess'));
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      setRestoreConfirm(null);
    },
    onError: () => toast.error(t('snapshots.restoreError')),
  });

  const restoreCompanyMutation = useMutation({
    mutationFn: ({ date, id }: { date: string; id: number }) => api.restoreCompanyFromSnapshot(date, id),
    onSuccess: (data) => {
      toast.success(data.message || t('snapshots.companyRestoreSuccess'));
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      setRestoreConfirm(null);
    },
    onError: () => toast.error(t('snapshots.restoreError')),
  });

  const goBack = () => {
    if (view.type === "patient-detail") {
      setView({ type: "snapshot", date: (view as any).date });
    } else if (view.type === "company-patients") {
      setView({ type: "snapshot", date: (view as any).date });
    } else if (view.type === "snapshot") {
      setView({ type: "list" });
    }
  };

  const breadcrumb = () => {
    const parts: { label: string; onClick?: () => void }[] = [
      { label: t('snapshots.title'), onClick: () => setView({ type: "list" }) },
    ];
    if (view.type !== "list") {
      const date = (view as any).date;
      parts.push({ label: date, onClick: () => setView({ type: "snapshot", date }) });
    }
    if (view.type === "company-patients") parts.push({ label: view.companyName });
    if (view.type === "patient-detail") parts.push({ label: view.patientName });
    return parts;
  };

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center gap-3">
        {view.type !== "list" && (
          <Button variant="ghost" size="icon" onClick={goBack} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            {breadcrumb().map((b, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <ChevronRight className="h-3 w-3" />}
                {b.onClick ? (
                  <button onClick={b.onClick} className="hover:text-foreground transition-colors">{b.label}</button>
                ) : (
                  <span className="text-foreground font-medium">{b.label}</span>
                )}
              </span>
            ))}
          </div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Database className="h-5 w-5" />
            {view.type === "list" && t('snapshots.title')}
            {view.type === "snapshot" && "Snapshot " + (view as any).date}
            {view.type === "company-patients" && view.companyName}
            {view.type === "patient-detail" && view.patientName}
          </h1>
        </div>
      </div>

      {view.type === "list" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <HardDrive className="h-5 w-5" /> {t('snapshots.available')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSnapshots ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : snapshots.length === 0 ? (
              <p className="text-center py-12 text-muted-foreground">{t('snapshots.noSnapshots')}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('snapshots.date')}</TableHead>
                    <TableHead>{t('snapshots.created')}</TableHead>
                    <TableHead>{t('snapshots.dbSize')}</TableHead>
                    <TableHead>{t('snapshots.imageCount')}</TableHead>
                    <TableHead className="text-right">{t('common.action')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {snapshots.map((s: any) => (
                    <TableRow key={s.date} className="cursor-pointer hover:bg-muted/50" onClick={() => setView({ type: "snapshot", date: s.date })}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{s.date}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {s.created_at ? formatDate(s.created_at, "dd.MM.yyyy HH:mm") : "–"}
                      </TableCell>
                      <TableCell><Badge variant="secondary">{formatBytes(s.db_size)}</Badge></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Image className="h-3.5 w-3.5" /> {s.image_count}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
                          {t('snapshots.browse')} <ChevronRight className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {view.type === "snapshot" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5" /> {t('snapshots.companiesInSnapshot')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingCompanies ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : companies.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">{t('snapshots.noCompanies')}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('common.id')}</TableHead>
                    <TableHead>{t('snapshots.company')}</TableHead>
                    <TableHead>{t('snapshots.users')}</TableHead>
                    <TableHead>{t('snapshots.patientsCount')}</TableHead>
                    <TableHead className="text-right">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{c.id}</TableCell>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm"><User className="h-3.5 w-3.5 text-muted-foreground" /> {c.user_count}</div>
                      </TableCell>
                      <TableCell>
                        <button
                          className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                          onClick={() => setView({ type: "company-patients", date: (view as any).date, companyId: c.id, companyName: c.name })}
                        >
                          <User className="h-3.5 w-3.5" /> {c.patient_count} {t('snapshots.patientsCount')}
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" className="h-7 gap-1 text-xs"
                          onClick={() => setRestoreConfirm({ type: "company", date: (view as any).date, id: c.id, name: c.name })}>
                          <RotateCcw className="h-3 w-3" /> {t('common.restore')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {view.type === "company-patients" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" /> {t('snapshots.patientsOf', { name: view.companyName })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingPatients ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : patients.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">{t('snapshots.noPatients')}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('common.id')}</TableHead>
                    <TableHead>{t('common.name')}</TableHead>
                    <TableHead>{t('common.spots')}</TableHead>
                    <TableHead>{t('common.images')}</TableHead>
                    <TableHead className="text-right">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patients.map((p: any) => (
                    <TableRow
                      key={p.id}
                      className="cursor-pointer touch-manipulation hover:bg-transparent active:bg-muted/50 md:hover:bg-muted/50"
                      tabIndex={0}
                      role="button"
                      onClick={() => {
                        const date = (view as any).date;
                        if (date) setView({ type: "patient-detail", date, patientId: p.id, patientName: p.name });
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          const date = (view as any).date;
                          if (date) setView({ type: "patient-detail", date, patientId: p.id, patientName: p.name });
                        }
                      }}
                    >
                      <TableCell className="font-mono text-xs text-muted-foreground">{p.id}</TableCell>
                      <TableCell>
                        <span className="font-medium text-primary">{p.name}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> {p.location_count}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground"><Image className="h-3.5 w-3.5" /> {p.image_count}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1 text-xs"
                          onClick={(event) => {
                            event.stopPropagation();
                            setRestoreConfirm({ type: "patient", date: view.date, id: p.id, name: p.name });
                          }}
                        >
                          <RotateCcw className="h-3 w-3" /> {t('common.restore')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {view.type === "patient-detail" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button className="gap-1.5"
              onClick={() => setRestoreConfirm({ type: "patient", date: view.date, id: view.patientId, name: view.patientName })}>
              <RotateCcw className="h-4 w-4" /> {t('snapshots.restorePatient')}
            </Button>
          </div>
          {loadingDetail ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : patientDetail ? (
            <>
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div><span className="text-muted-foreground">{t('common.name')}</span><p className="font-medium">{patientDetail.name}</p></div>
                    <div><span className="text-muted-foreground">{t('common.birthDate')}</span><p className="font-medium">{patientDetail.birth_date || "–"}</p></div>
                    <div><span className="text-muted-foreground">{t('common.email')}</span><p className="font-medium">{patientDetail.email || "–"}</p></div>
                    <div><span className="text-muted-foreground">{t('snapshots.insuranceNumber')}</span><p className="font-medium">{patientDetail.insurance_number || "–"}</p></div>
                  </div>
                </CardContent>
              </Card>
              {(patientDetail.locations ?? []).length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">{t('snapshots.noSpots')}</p>
              ) : (
                (patientDetail.locations ?? []).map((loc: any) => (
                  <Card key={loc.id}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {loc.name || "Spot #" + loc.id}
                        <Badge variant="secondary" className="text-[10px]">{loc.images?.length ?? 0} {t('common.images')}</Badge>
                        <Badge variant="outline" className="text-[10px]">{loc.findings?.length ?? 0} {t('common.findings')}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {(loc.images ?? []).length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          {(loc.images as any[]).slice(0, 6).map((img: any) => {
                            const src = api.resolveImageSrc(img);
                            return (
                              <div key={img.id} className="w-16 h-16 rounded border bg-muted flex items-center justify-center overflow-hidden">
                                {src ? (
                                  <img src={src} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <Image className="h-6 w-6 text-muted-foreground/40" />
                                )}
                              </div>
                            );
                          })}
                          {(loc.images as any[]).length > 6 && (
                            <div className="w-16 h-16 rounded border bg-muted flex items-center justify-center text-xs text-muted-foreground">
                              +{(loc.images as any[]).length - 6}
                            </div>
                          )}
                        </div>
                      )}
                      {(loc.findings ?? []).length > 0 && (
                        <div className="space-y-1">
                          {(loc.findings as any[]).map((f: any) => (
                            <div key={f.id} className="flex items-start gap-2 text-xs text-muted-foreground">
                              <FileText className="h-3 w-3 mt-0.5 shrink-0" />
                              <span>{f.description}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </>
          ) : null}
        </div>
      )}

      <AlertDialog open={restoreConfirm !== null} onOpenChange={(open) => !open && setRestoreConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              {t('snapshots.restoreTitle', { type: restoreConfirm?.type === "company" ? t('snapshots.typeCompany') : t('snapshots.typePatient') })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{restoreConfirm?.name}</strong> {t('snapshots.restoreFrom')}{" "}
              <strong>{restoreConfirm?.date}</strong>.
              {restoreConfirm?.type === "company"
                ? " " + t('snapshots.restoreCompanyDesc')
                : " " + t('snapshots.restorePatientDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!restoreConfirm) return;
                if (restoreConfirm.type === "patient") {
                  restorePatientMutation.mutate({ date: restoreConfirm.date, id: restoreConfirm.id });
                } else {
                  restoreCompanyMutation.mutate({ date: restoreConfirm.date, id: restoreConfirm.id });
                }
              }}
              disabled={restorePatientMutation.isPending || restoreCompanyMutation.isPending}
            >
              {(restorePatientMutation.isPending || restoreCompanyMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              {t('common.restore')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Snapshots;
