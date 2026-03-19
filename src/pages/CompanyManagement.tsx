import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Building2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Company {
  id: number;
  name: string;
  created_at?: string;
}

const CompanyManagement = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadCompanies = async () => {
    try {
      const data = await api.getCompanies();
      setCompanies(Array.isArray(data) ? data : data.data ?? []);
    } catch (err: any) {
      toast.error("Firmen konnten nicht geladen werden");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.createCompany({ name });
      toast.success("Firma erstellt");
      setName("");
      setDialogOpen(false);
      loadCompanies();
    } catch (err: any) {
      toast.error(err?.message || "Fehler beim Erstellen");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Firma wirklich löschen?")) return;
    try {
      await api.deleteCompany(id);
      toast.success("Firma gelöscht");
      loadCompanies();
    } catch (err: any) {
      toast.error(err?.message || "Fehler beim Löschen");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Firmen</h1>
          <p className="text-sm text-muted-foreground">Firmen / Praxen verwalten</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Neue Firma
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Neue Firma erstellen</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company-name">Firmenname</Label>
                <Input
                  id="company-name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Hautarztpraxis Muster"
                />
              </div>
              <Button type="submit" className="w-full" disabled={creating}>
                {creating ? "Erstelle…" : "Firma erstellen"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5" /> Alle Firmen
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
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
                {companies.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{c.id}</TableCell>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)} className="text-destructive hover:text-destructive">
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
