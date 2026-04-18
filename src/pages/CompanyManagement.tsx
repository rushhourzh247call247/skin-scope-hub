import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { exportCompanyData } from "@/lib/companyExport";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Building2, Plus, Trash2, Shield, Download, Loader2, Ban, CheckCircle, ChevronDown, FileText, RotateCcw, Lock, Archive, AlertOctagon } from "lucide-react";
import { toast } from "sonner";
import ContractPanel from "@/components/ContractPanel";

const PROTECTED_COMPANY_NAME = "techassist";

const CompanyManagement = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [exportingId, setExportingId] = useState<number | null>(null);
  const [exportProgress, setExportProgress] = useState<{ phase: string; pct: number } | null>(null);
  const [expandedCompanyId, setExpandedCompanyId] = useState<number | null>(null);

  const isAdmin = user?.role === "admin";

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["companies"],
    queryFn: api.getCompanies,
  });

  const activeCompanies = companies.filter((c: any) => !c.suspended_at);
  const suspendedCompanies = companies.filter((c: any) => !!c.suspended_at);

  const createMutation = useMutation({
    mutationFn: api.createCompany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success(t("companies.created"));
      setName("");
      setDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteCompany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success(t("companies.deleted"));
      setDeleteId(null);
    },
    onError: () => toast.error(t("companies.deleteError")),
  });

  const suspendMutation = useMutation({
    mutationFn: (id: number) => api.suspendCompany(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success(t("companies.suspendedSuccess"));
    },
    onError: () => toast.error(t("companies.suspendError")),
  });

  const unsuspendMutation = useMutation({
    mutationFn: (id: number) => api.unsuspendCompany(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success(t("companies.unsuspendSuccess"));
    },
    onError: () => toast.error(t("companies.unsuspendError")),
  });

  const reactivateLifecycleMutation = useMutation({
    mutationFn: (id: number) => api.reactivateCompanyLifecycle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Firma reaktiviert — Schreibzugriff wieder freigegeben");
    },
    onError: (e: any) => toast.error(e?.message || "Reaktivierung fehlgeschlagen"),
  });

  const renderLifecycleBadge = (c: any) => {
    const status = c.lifecycle_status as string | undefined;
    if (!status || status === "active") return null;
    if (status === "read_only") {
      const until = c.read_only_until ? new Date(c.read_only_until).toLocaleDateString("de-CH") : null;
      return (
        <Badge variant="outline" className="gap-1 border-amber-500/50 bg-amber-500/10 text-amber-700 text-xs">
          <Lock className="h-3 w-3" /> Read-Only{until ? ` bis ${until}` : ""}
        </Badge>
      );
    }
    if (status === "archived") {
      return (
        <Badge variant="outline" className="gap-1 border-blue-500/50 bg-blue-500/10 text-blue-700 text-xs">
          <Archive className="h-3 w-3" /> Archiviert
        </Badge>
      );
    }
    if (status === "pending_deletion") {
      return (
        <Badge variant="outline" className="gap-1 border-destructive/50 bg-destructive/10 text-destructive text-xs">
          <AlertOctagon className="h-3 w-3" /> Löschung ausstehend
        </Badge>
      );
    }
    return null;
  };

  const canSuspend = (c: any) => c.name?.toLowerCase() !== PROTECTED_COMPANY_NAME;

  const handleExport = async (companyId: number, companyName: string) => {
    setExportingId(companyId);
    setExportProgress({ phase: t("companies.starting"), pct: 0 });
    try {
      await exportCompanyData(companyId, companyName, (p) => {
        const pct = p.total > 0 ? Math.round((p.current / p.total) * 100) : 0;
        setExportProgress({ phase: p.phase, pct });
      });
      toast.success(t("companies.exportComplete"));
    } catch (err: any) {
      toast.error(t("companies.exportFailed", { message: err.message }));
    } finally {
      setExportingId(null);
      setExportProgress(null);
    }
  };

  const renderCompanyCard = (c: any, isSuspendedTab: boolean) => {
    const isProtected = c.name?.toLowerCase() === PROTECTED_COMPANY_NAME;
    const isExporting = exportingId === c.id;
    const isExpanded = expandedCompanyId === c.id;

    return (
      <Collapsible
        key={c.id}
        open={isExpanded}
        onOpenChange={(open) => setExpandedCompanyId(open ? c.id : null)}
      >
        <div className="border rounded-lg bg-card">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-mono text-xs text-muted-foreground w-8">{c.id}</span>
              <span className="font-medium">{c.name}</span>
              {isProtected && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Shield className="h-3 w-3" /> {t("common.protected")}
                </Badge>
              )}
              {renderLifecycleBadge(c)}
            </div>

            <div className="flex items-center gap-1">
              {!isSuspendedTab && (c.lifecycle_status === "read_only" || c.lifecycle_status === "archived") && (
                <Button
                  variant="ghost"
                  size="icon"
                  title="Lifecycle reaktivieren (zurück auf active)"
                  onClick={() => reactivateLifecycleMutation.mutate(c.id)}
                  disabled={reactivateLifecycleMutation.isPending}
                  className="text-emerald-600 hover:text-emerald-700"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
              {isSuspendedTab ? (
                <Button
                  variant="ghost"
                  size="icon"
                  title={t("common.unsuspend")}
                  onClick={() => unsuspendMutation.mutate(c.id)}
                  className="text-emerald-600 hover:text-emerald-700"
                >
                  <CheckCircle className="h-4 w-4" />
                </Button>
              ) : (
                <>
                  {canSuspend(c) && (
                    <Button variant="ghost" size="icon" title={t("common.suspend")} onClick={() => suspendMutation.mutate(c.id)} className="text-amber-600 hover:text-amber-700">
                      <Ban className="h-4 w-4" />
                    </Button>
                  )}
                  {isAdmin && (
                    <Button variant="ghost" size="icon" disabled={isExporting || exportingId !== null} onClick={() => handleExport(c.id, c.name)} title={t("companies.exportTooltip")}>
                      {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    </Button>
                  )}
                  {isProtected ? (
                    <span className="text-xs text-muted-foreground px-2">—</span>
                  ) : (
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(c.id)} className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </>
              )}
              {!isSuspendedTab && (
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon" className="ml-1">
                    <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  </Button>
                </CollapsibleTrigger>
              )}
            </div>
          </div>

          {!isSuspendedTab && (
            <CollapsibleContent>
              <div className="border-t px-4 py-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">Vertrag</span>
                </div>
                <ContractPanel companyId={c.id} companyName={c.name} />
              </div>
            </CollapsibleContent>
          )}
        </div>
      </Collapsible>
    );
  };

  const renderList = (list: any[], isSuspendedTab: boolean) =>
    list.length === 0 ? (
      <p className="py-8 text-center text-muted-foreground">
        {isSuspendedTab ? t("companies.noSuspended") : t("companies.noActive")}
      </p>
    ) : (
      <div className="space-y-2">
        {list.map((c: any) => renderCompanyCard(c, isSuspendedTab))}
      </div>
    );

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("companies.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("companies.subtitle")}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> {t("companies.newCompany")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("companies.createTitle")}</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate({ name }); }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company-name">{t("companies.companyName")}</Label>
                <Input id="company-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder={t("companies.companyNamePlaceholder")} />
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? t("companies.createSubmitting") : t("companies.createSubmit")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {exportProgress && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Loader2 className="h-4 w-4 animate-spin" />
              {exportProgress.phase}
            </div>
            <Progress value={exportProgress.pct} className="h-2" />
            <p className="text-xs text-muted-foreground text-right">{exportProgress.pct}%</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><Building2 className="h-5 w-5" /> {t("companies.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <Tabs defaultValue="active">
              <TabsList>
                <TabsTrigger value="active" className="gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5" />
                  {t("companies.activeTab")}
                  <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1.5 text-[10px]">{activeCompanies.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="suspended" className="gap-1.5">
                  <Ban className="h-3.5 w-3.5" />
                  {t("companies.suspendedTab")}
                  {suspendedCompanies.length > 0 && (
                    <Badge variant="destructive" className="ml-1 h-5 min-w-[20px] px-1.5 text-[10px]">{suspendedCompanies.length}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="active" className="mt-4">
                {renderList(activeCompanies, false)}
              </TabsContent>
              <TabsContent value="suspended" className="mt-4">
                {renderList(suspendedCompanies, true)}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("companies.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("companies.deleteDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              {t("common.permanentDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CompanyManagement;
