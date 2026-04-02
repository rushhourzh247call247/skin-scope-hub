import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Progress } from "@/components/ui/progress";
import { Building2, Plus, Trash2, Shield, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

const PROTECTED_COMPANY_NAME = "techassist";

const CompanyManagement = () => {
  const { user } = useAuth();
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

  const createMutation = useMutation({
    mutationFn: api.createCompany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Firma erstellt");
      setName("");
      setDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteCompany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Firma gelöscht");
      setDeleteId(null);
    },
    onError: () => toast.error("Fehler beim Löschen – evtl. sind noch Benutzer zugeordnet"),
  });

  const handleExport = async (companyId: number, companyName: string) => {
    setExportingId(companyId);
    setExportProgress({ phase: "Starte…", pct: 0 });
    try {
      await exportCompanyData(companyId, companyName, (p) => {
        const pct = p.total > 0 ? Math.round((p.current / p.total) * 100) : 0;
        setExportProgress({ phase: p.phase, pct });
      });
      toast.success("Export abgeschlossen");
    } catch (err: any) {
      toast.error(`Export fehlgeschlagen: ${err.message}`);
    } finally {
      setExportingId(null);
      setExportProgress(null);
    }
  };

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Firmen</h1>
          <p className="text-sm text-muted-foreground">Firmen / Praxen verwalten</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Neue Firma</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Neue Firma erstellen</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate({ name }); }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company-name">Firmenname</Label>
                <Input id="company-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Hautarztpraxis Muster" />
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Erstelle…" : "Firma erstellen"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Export progress overlay */}
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
          <CardTitle className="flex items-center gap-2 text-lg"><Building2 className="h-5 w-5" /> Alle Firmen</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : companies.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Keine Firmen vorhanden</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-[120px]">Aktion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((c: any) => {
                  const isProtected = c.name?.toLowerCase() === PROTECTED_COMPANY_NAME;
                  const isExporting = exportingId === c.id;
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{c.id}</TableCell>
                      <TableCell className="font-medium">
                        <span className="flex items-center gap-2">
                          {c.name}
                          {isProtected && (
                            <Badge variant="secondary" className="gap-1 text-xs">
                              <Shield className="h-3 w-3" /> Geschützt
                            </Badge>
                          )}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={isExporting || exportingId !== null}
                              onClick={() => handleExport(c.id, c.name)}
                              title="Gesamte Firmendaten exportieren"
                            >
                              {isExporting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          {isProtected ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : (
                            <Button variant="ghost" size="icon" onClick={() => setDeleteId(c.id)} className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Firma endgültig löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Firma und alle zugehörigen Daten werden unwiderruflich gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Endgültig löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CompanyManagement;
