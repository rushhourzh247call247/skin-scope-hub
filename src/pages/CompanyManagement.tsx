import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Building2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const CompanyManagement = () => {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

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
      toast.success("Firma gelöscht");
    },
  });

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
                  <TableHead className="w-[80px]">Aktion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{c.id}</TableCell>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(c.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CompanyManagement;
