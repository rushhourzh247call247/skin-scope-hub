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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Building2, Plus, Trash2, Shield, Download, Loader2, Ban, CheckCircle } from "lucide-react";
import { toast } from "sonner";

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

  const canSuspend = (c: any) => {
    return c.name?.toLowerCase() !== PROTECTED_COMPANY_NAME;
  };

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

  const renderCompanyRow = (c: any, isSuspendedTab: boolean) => {
    const isProtected = c.name?.toLowerCase() === PROTECTED_COMPANY_NAME;
    const isExporting = exportingId === c.id;
    return (
      <TableRow key={c.id} className={isSuspendedTab ? "opacity-60" : ""}>
        <TableCell className="font-mono text-xs text-muted-foreground">{c.id}</TableCell>
        <TableCell className="font-medium">
          <span className="flex items-center gap-2">
            {c.name}
            {isProtected && (
              <Badge variant="secondary" className="gap-1 text-xs">
                <Shield className="h-3 w-3" /> {t("common.protected")}
              </Badge>
            )}
          </span>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1">
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
                  <Button
                    variant="ghost"
                    size="icon"
                    title={t("common.suspend")}
                    onClick={() => suspendMutation.mutate(c.id)}
                    className="text-amber-600 hover:text-amber-700"
                  >
                    <Ban className="h-4 w-4" />
                  </Button>
                )}
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={isExporting || exportingId !== null}
                    onClick={() => handleExport(c.id, c.name)}
                    title={t("companies.exportTooltip")}
                  >
                    {isExporting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                  </Button>
                )}
                {isProtected ? (
                  <span className="text-xs text-muted-foreground">\u2014</span>
                ) : (
                  <Button variant="ghost" size="icon" onClick={() => setDeleteId(c.id)} className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}
          </div>
        </TableCell>
      </TableRow>
    );
  };

  const renderTable = (list: any[], isSuspendedTab: boolean) => (
    list.length === 0 ? (
      <p className="py-8 text-center text-muted-foreground">
        {isSuspendedTab ? t("companies.noSuspended") : t("companies.noActive")}
      </p>
    ) : (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("common.id")}</TableHead>
            <TableHead>{t("common.name")}</TableHead>
            <TableHead className="w-[160px]">{t("common.action")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.map((c: any) => renderCompanyRow(c, isSuspendedTab))}
        </TableBody>
      </Table>
    )
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
                {renderTable(activeCompanies, false)}
              </TabsContent>
              <TabsContent value="suspended" className="mt-4">
                {renderTable(suspendedCompanies, true)}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("companies.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("companies.deleteDescription")}
            </AlertDialogDescription>
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
