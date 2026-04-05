import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserCog, Plus, Trash2, KeyRound, Eye, EyeOff, ShieldOff, Shield, Ban, CheckCircle } from "lucide-react";
import { toast } from "sonner";



const UserManagement = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [role, setRole] = useState("user");

  const [deleteUserId, setDeleteUserId] = useState<number | null>(null);
  const [resetUser, setResetUser] = useState<{ id: number; name: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [showCreatePw, setShowCreatePw] = useState(false);
  const [reset2faUser, setReset2faUser] = useState<{ id: number; name: string } | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: api.getUsers,
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: api.getCompanies,
  });

  const activeUsers = users.filter((u: any) => !u.suspended_at);
  const suspendedUsers = users.filter((u: any) => !!u.suspended_at);

  const createMutation = useMutation({
    mutationFn: api.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success(t("users.created"));
      setName(""); setEmail(""); setPassword(""); setCompanyId(""); setRole("user");
      setDialogOpen(false);
    },
    onError: () => toast.error(t("users.createError")),
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(t("users.deleted"));
      setDeleteUserId(null);
    },
    onError: () => toast.error(t("users.deleteError")),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ userId, password }: { userId: number; password: string }) =>
      api.adminResetPassword(userId, password),
    onSuccess: () => {
      toast.success(t("users.passwordChanged"));
      setResetUser(null);
      setNewPassword("");
      setConfirmPassword("");
      setShowNewPw(false);
      setShowConfirmPw(false);
    },
    onError: () => toast.error(t("users.passwordChangeError")),
  });

  const reset2faMutation = useMutation({
    mutationFn: (userId: number) => api.adminReset2FA(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(t("users.reset2faSuccess", { name: reset2faUser?.name }));
      setReset2faUser(null);
    },
    onError: () => toast.error(t("users.reset2faError")),
  });

  const suspendMutation = useMutation({
    mutationFn: (userId: number) => api.suspendUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(t("users.suspended"));
    },
    onError: () => toast.error(t("users.suspendError")),
  });

  const unsuspendMutation = useMutation({
    mutationFn: (userId: number) => api.unsuspendUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(t("users.unsuspended"));
    },
    onError: () => toast.error(t("users.unsuspendError")),
  });

  const canSuspend = (u: any) => {
    return !u.is_protected && u.role !== "admin";
  };

  const renderUserRow = (u: any, isSuspendedTab: boolean) => {
    return (
      <TableRow key={u.id} className={isSuspendedTab ? "opacity-60" : ""}>
        <TableCell className="font-medium">
          <span className="flex items-center gap-2">
            {u.name}
            {u.is_protected && (
              <Badge variant="secondary" className="gap-1 text-xs">
                <Shield className="h-3 w-3" /> {t("common.protected")}
              </Badge>
            )}
          </span>
        </TableCell>
        <TableCell className="text-muted-foreground">{u.email}</TableCell>
        <TableCell>{u.company?.name ?? `#${u.company_id}`}</TableCell>
        <TableCell>
          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${u.role === "admin" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
            {u.role === "admin" ? t("users.roleAdmin") : t("users.roleUser")}
          </span>
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-1">
            {isSuspendedTab ? (
              <Button
                variant="ghost"
                size="icon"
                title={t("common.unsuspend")}
                onClick={() => unsuspendMutation.mutate(u.id)}
                className="text-emerald-600 hover:text-emerald-700"
              >
                <CheckCircle className="h-4 w-4" />
              </Button>
            ) : (
              <>
                {canSuspend(u) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    title={t("common.suspend")}
                    onClick={() => suspendMutation.mutate(u.id)}
                    className="text-amber-600 hover:text-amber-700"
                  >
                    <Ban className="h-4 w-4" />
                  </Button>
                )}
                {!!u.two_factor_enabled && (
                  <Button
                    variant="ghost"
                    size="icon"
                    title={t("users.reset2fa")}
                    onClick={() => setReset2faUser({ id: u.id, name: u.name })}
                  >
                    <ShieldOff className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  title={t("users.resetPassword")}
                  onClick={() => { setResetUser({ id: u.id, name: u.name }); setNewPassword(""); }}
                >
                  <KeyRound className="h-4 w-4" />
                </Button>
                {u.is_protected ? (
                  <span className="inline-flex h-10 w-10 items-center justify-center text-xs text-muted-foreground">—</span>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    title={t("common.delete")}
                    onClick={() => setDeleteUserId(u.id)}
                  >
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
        {isSuspendedTab ? t("users.noSuspended") : t("users.noActive")}
      </p>
    ) : (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("common.name")}</TableHead>
            <TableHead>{t("common.email")}</TableHead>
            <TableHead>{t("dashboard.company")}</TableHead>
            <TableHead>{t("common.role")}</TableHead>
            <TableHead className="w-[160px] text-right">{t("common.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.map((u: any) => renderUserRow(u, isSuspendedTab))}
        </TableBody>
      </Table>
    )
  );

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("users.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("users.subtitle")}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> {t("users.newUser")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("users.createTitle")}</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate({ name, email, password, company_id: Number(companyId), role }); }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="user-name">{t("common.name")}</Label>
                <Input id="user-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder={t("users.namePlaceholder")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-email">{t("common.email")}</Label>
                <Input id="user-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("users.emailPlaceholder")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-password">{t("common.password")}</Label>
                <div className="relative">
                  <Input id="user-password" type={showCreatePw ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("users.passwordPlaceholder")} />
                  <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-10 w-10" onClick={() => setShowCreatePw(!showCreatePw)}>
                    {showCreatePw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("dashboard.company")}</Label>
                <Select value={companyId} onValueChange={setCompanyId} required>
                  <SelectTrigger><SelectValue placeholder={t("users.selectCompany")} /></SelectTrigger>
                  <SelectContent>
                    {companies.map((c: any) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("common.role")}</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">{t("users.roleAdmin")}</SelectItem>
                    <SelectItem value="user">{t("users.roleUser")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? t("users.createSubmitting") : t("users.createSubmit")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><UserCog className="h-5 w-5" /> {t("users.title")}</CardTitle>
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
                  {t("users.activeTab")}
                  <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1.5 text-[10px]">{activeUsers.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="suspended" className="gap-1.5">
                  <Ban className="h-3.5 w-3.5" />
                  {t("users.suspendedTab")}
                  {suspendedUsers.length > 0 && (
                    <Badge variant="destructive" className="ml-1 h-5 min-w-[20px] px-1.5 text-[10px]">{suspendedUsers.length}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="active" className="mt-4">
                {renderTable(activeUsers, false)}
              </TabsContent>
              <TabsContent value="suspended" className="mt-4">
                {renderTable(suspendedUsers, true)}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteUserId !== null} onOpenChange={(open) => !open && setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("users.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("users.deleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteUserId && deleteMutation.mutate(deleteUserId)}
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={reset2faUser !== null} onOpenChange={(open) => !open && setReset2faUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("users.reset2faTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              <span dangerouslySetInnerHTML={{ __html: t("users.reset2faDescription", { name: reset2faUser?.name }) }} />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => reset2faUser && reset2faMutation.mutate(reset2faUser.id)}
            >
              {t("users.reset2faConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={resetUser !== null} onOpenChange={(open) => !open && setResetUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("users.resetPasswordTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <span dangerouslySetInnerHTML={{ __html: t("users.resetPasswordFor", { name: resetUser?.name }) }} />
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newPassword !== confirmPassword) {
                toast.error(t("users.passwordMismatch"));
                return;
              }
              if (resetUser && newPassword.length >= 6) {
                resetPasswordMutation.mutate({ userId: resetUser.id, password: newPassword });
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="new-pw">{t("users.newPassword")}</Label>
              <div className="relative">
                <Input
                  id="new-pw"
                  type={showNewPw ? "text" : "password"}
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t("users.minChars")}
                />
                <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-10 w-10" onClick={() => setShowNewPw(!showNewPw)}>
                  {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-pw">{t("users.confirmPassword")}</Label>
              <div className="relative">
                <Input
                  id="confirm-pw"
                  type={showConfirmPw ? "text" : "password"}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t("users.repeatPassword")}
                />
                <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-10 w-10" onClick={() => setShowConfirmPw(!showConfirmPw)}>
                  {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={resetPasswordMutation.isPending}>
              {resetPasswordMutation.isPending ? t("users.changingPassword") : t("users.changePassword")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
