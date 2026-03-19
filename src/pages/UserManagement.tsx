import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mockApi } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserCog, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const UserManagement = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [role, setRole] = useState("user");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: mockApi.getUsers,
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: mockApi.getCompanies,
  });

  const createMutation = useMutation({
    mutationFn: mockApi.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Benutzer erstellt");
      setName(""); setEmail(""); setPassword(""); setCompanyId(""); setRole("user");
      setDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: mockApi.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Benutzer gelöscht");
    },
  });

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Benutzer</h1>
          <p className="text-sm text-muted-foreground">Benutzer erstellen und verwalten</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Neuer Benutzer</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Neuen Benutzer erstellen</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate({ name, email, password, company_id: Number(companyId), role }); }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="user-name">Name</Label>
                <Input id="user-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Dr. Max Mustermann" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-email">E-Mail</Label>
                <Input id="user-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@praxis.de" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-password">Passwort</Label>
                <Input id="user-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              </div>
              <div className="space-y-2">
                <Label>Firma</Label>
                <Select value={companyId} onValueChange={setCompanyId} required>
                  <SelectTrigger><SelectValue placeholder="Firma wählen" /></SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Rolle</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="user">Benutzer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Erstelle…" : "Benutzer erstellen"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><UserCog className="h-5 w-5" /> Alle Benutzer</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : users.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Keine Benutzer vorhanden</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>E-Mail</TableHead>
                  <TableHead>Firma</TableHead>
                  <TableHead>Rolle</TableHead>
                  <TableHead className="w-[80px]">Aktion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>{u.company?.name ?? `#${u.company_id}`}</TableCell>
                    <TableCell>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${u.role === "admin" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {u.role === "admin" ? "Admin" : "Benutzer"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(u.id)} className="text-destructive hover:text-destructive">
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

export default UserManagement;
