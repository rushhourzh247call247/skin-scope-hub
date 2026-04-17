import React, { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Server, Rocket, GitBranch, HardDrive, RotateCcw, Play, Square, RefreshCw,
  CheckCircle2, XCircle, Clock, Cpu, MemoryStick, Database, Activity,
  Download, Trash2, Camera, Loader2, ChevronRight, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";

/* ── Types ─────────────────────────────────────────────── */

interface ServerStatus {
  uptime: string;
  cpu_usage: number;
  memory_usage: number;
  memory_total: string;
  disk_usage: number;
  disk_total: string;
  php_version: string;
  nginx_status: string;
  fpm_status: string;
  app_version?: string;
}

interface GitVersion {
  hash: string;
  short_hash: string;
  date: string;
  message: string;
  author: string;
  is_current: boolean;
}

interface BackupEntry {
  filename: string;
  size: string;
  date: string;
  age: string;
}

interface TerminalLine {
  text: string;
  type: "info" | "success" | "error" | "warning" | "step";
  timestamp: string;
}

/* ── Terminal Component ────────────────────────────────── */

function Terminal({ lines, isRunning }: { lines: TerminalLine[]; isRunning: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [lines]);

  const colorClass = (type: TerminalLine["type"]) => {
    switch (type) {
      case "success": return "text-emerald-400";
      case "error": return "text-red-400";
      case "warning": return "text-amber-400";
      case "step": return "text-sky-400 font-semibold";
      default: return "text-zinc-300";
    }
  };

  return (
    <div className="relative rounded-lg border border-zinc-700 bg-zinc-950 shadow-inner">
      <div className="flex items-center gap-1.5 border-b border-zinc-800 px-4 py-2">
        <div className="h-3 w-3 rounded-full bg-red-500/80" />
        <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
        <div className="h-3 w-3 rounded-full bg-green-500/80" />
        <span className="ml-3 text-xs text-zinc-500 font-mono">server-admin — bash</span>
        {isRunning && <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin text-sky-400" />}
      </div>
      <div ref={ref} className="h-48 sm:h-64 overflow-y-auto p-3 sm:p-4 font-mono text-[11px] sm:text-xs leading-5 scrollbar-thin">
        {lines.length === 0 && (
          <span className="text-zinc-600">Bereit für Befehle…</span>
        )}
        {lines.map((line, i) => (
          <div key={i} className="flex gap-2">
            <span className="shrink-0 text-zinc-600">{line.timestamp}</span>
            <span className={colorClass(line.type)}>{line.text}</span>
          </div>
        ))}
        {isRunning && (
          <div className="flex gap-2">
            <span className="text-zinc-600">{new Date().toLocaleTimeString("de-CH")}</span>
            <span className="text-zinc-400 animate-pulse">█</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Status Indicator ──────────────────────────────────── */

const StatusDot = React.forwardRef<HTMLDivElement, { status: "ok" | "warn" | "error" | "unknown" }>(
  ({ status, ...props }, ref) => {
    const cls = {
      ok: "bg-emerald-500 shadow-emerald-500/40",
      warn: "bg-amber-500 shadow-amber-500/40",
      error: "bg-red-500 shadow-red-500/40",
      unknown: "bg-zinc-400",
    }[status];
    return <div ref={ref} className={`h-2.5 w-2.5 rounded-full shadow-lg ${cls}`} {...props} />;
  }
);
StatusDot.displayName = "StatusDot";

/* ── Main Page ─────────────────────────────────────────── */

const ServerAdmin = () => {
  const { t } = useTranslation();
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [actionPassword, setActionPassword] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    description: string;
    onConfirm: (password: string) => void;
  } | null>(null);

  const addLine = useCallback((text: string, type: TerminalLine["type"] = "info") => {
    setTerminalLines(prev => [...prev, {
      text,
      type,
      timestamp: new Date().toLocaleTimeString("de-CH"),
    }]);
  }, []);

  /* ── Server Status ──────── */
  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ["server-admin-status"],
    queryFn: api.serverAdmin.getStatus,
    refetchInterval: 30000,
  });

  /* ── Versions ──────── */
  const { data: versions = [], isLoading: versionsLoading, refetch: refetchVersions } = useQuery({
    queryKey: ["server-admin-versions"],
    queryFn: api.serverAdmin.getVersions,
  });

  /* ── Backups ──────── */
  const { data: backups = [], isLoading: backupsLoading, refetch: refetchBackups } = useQuery({
    queryKey: ["server-admin-backups"],
    queryFn: api.serverAdmin.getBackups,
  });

  /* ── Services ──────── */
  const { data: services, refetch: refetchServices } = useQuery({
    queryKey: ["server-admin-services"],
    queryFn: api.serverAdmin.getServices,
    refetchInterval: 30000,
  });

  /* ── Deploy ──────── */
  const deployMutation = useMutation({
    mutationFn: async (password: string) => {
      setIsRunning(true);
      setTerminalLines([]);
      addLine("═══ Deployment auf Live-Server gestartet ═══", "step");
      
      const response = await api.serverAdmin.deploy(password);
      
      if (response.steps) {
        for (const step of response.steps) {
          addLine(step.label, step.success ? "success" : "error");
          if (step.output) addLine(step.output, "info");
        }
      }
      
      if (response.success) {
        addLine("═══ Deployment erfolgreich abgeschlossen ═══", "success");
      } else {
        addLine(`═══ Deployment fehlgeschlagen: ${response.error || "Unbekannter Fehler"} ═══`, "error");
      }
      
      return response;
    },
    onSuccess: () => {
      refetchVersions();
      refetchStatus();
    },
    onError: (err: Error) => {
      addLine(`FEHLER: ${err.message}`, "error");
      toast.error("Deployment fehlgeschlagen");
    },
    onSettled: () => setIsRunning(false),
  });

  /* ── Backup erstellen ──────── */
  const backupMutation = useMutation({
    mutationFn: async (password: string) => {
      addLine("Erstelle Datenbank-Backup auf Live-Server…", "step");
      const res = await api.serverAdmin.createBackup(password);
      addLine(`Backup erstellt: ${res.filename}`, "success");
      return res;
    },
    onSuccess: () => {
      refetchBackups();
      toast.success("Backup erstellt");
    },
    onError: (err: Error) => {
      addLine(`Backup-Fehler: ${err.message}`, "error");
      toast.error("Backup fehlgeschlagen");
    },
  });

  /* ── Rollback ──────── */
  const rollbackMutation = useMutation({
    mutationFn: async ({ hash, password }: { hash: string; password: string }) => {
      setIsRunning(true);
      addLine(`Rollback auf Version ${hash.slice(0, 7)} (Live-Server)…`, "step");
      const res = await api.serverAdmin.rollback(hash, password);
      if (res.success) {
        addLine("Rollback erfolgreich", "success");
      } else {
        addLine(`Rollback fehlgeschlagen: ${res.error}`, "error");
      }
      return res;
    },
    onSuccess: () => {
      refetchVersions();
      refetchStatus();
    },
    onError: (err: Error) => addLine(`Fehler: ${err.message}`, "error"),
    onSettled: () => setIsRunning(false),
  });

  /* ── Backup Restore ──────── */
  const restoreMutation = useMutation({
    mutationFn: async ({ filename, password }: { filename: string; password: string }) => {
      setIsRunning(true);
      addLine(`Stelle Backup wieder her auf Live-Server: ${filename}…`, "step");
      const res = await api.serverAdmin.restoreBackup(filename, password);
      addLine(res.success ? "Wiederherstellung erfolgreich" : `Fehler: ${res.error}`, res.success ? "success" : "error");
      return res;
    },
    onError: (err: Error) => addLine(`Fehler: ${err.message}`, "error"),
    onSettled: () => setIsRunning(false),
  });

  /* ── Service Restart ──────── */
  const restartMutation = useMutation({
    mutationFn: async ({ service, password }: { service: string; password: string }) => {
      addLine(`Starte ${service} auf Live-Server neu…`, "step");
      const res = await api.serverAdmin.restartService(service, password);
      addLine(res.success ? `${service} neugestartet` : `Fehler: ${res.error}`, res.success ? "success" : "error");
      return res;
    },
    onSuccess: () => refetchServices(),
    onError: (err: Error) => addLine(`Fehler: ${err.message}`, "error"),
  });

  /* ── Snapshot ──────── */
  const snapshotMutation = useMutation({
    mutationFn: async (password: string) => {
      addLine("Erstelle Snapshot auf Live-Server…", "step");
      const res = await api.serverAdmin.createSnapshot(password);
      addLine(res.success ? `Snapshot erstellt: ${res.filename}` : `Fehler: ${res.error}`, res.success ? "success" : "error");
      return res;
    },
    onError: (err: Error) => addLine(`Fehler: ${err.message}`, "error"),
  });

  const usageColor = (pct: number) => pct > 90 ? "text-red-500" : pct > 70 ? "text-amber-500" : "text-emerald-500";
  const usageStatus = (pct: number): "ok" | "warn" | "error" => pct > 90 ? "error" : pct > 70 ? "warn" : "ok";

  return (
    <div className="min-h-screen space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6 overflow-x-hidden max-w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold text-foreground flex items-center gap-2 flex-wrap">
            <Server className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
            <span>Server-Administration</span>
            <Badge variant="outline" className="text-[10px] border-primary/50 text-primary">Live</Badge>
            {status?.app_version && <Badge variant="outline" className="text-[10px] border-muted-foreground/30 text-muted-foreground font-mono">v{status.app_version}</Badge>}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Live-Server (83.228.246.191) — Deployment, Backups & Services</p>
        </div>
        <Button variant="outline" size="sm" className="self-start sm:self-auto shrink-0" onClick={() => { refetchStatus(); refetchVersions(); refetchBackups(); refetchServices(); }}>
          <RefreshCw className="h-4 w-4 mr-1" /> Aktualisieren
        </Button>
      </div>

      {/* ── Server Status ───────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statusLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4"><div className="h-12 bg-muted rounded" /></CardContent>
            </Card>
          ))
        ) : status ? (
          <>
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1"><Cpu className="h-3 w-3" /> CPU</span>
                  <StatusDot status={usageStatus(status.cpu_usage)} />
                </div>
                <p className={`text-xl sm:text-2xl font-bold ${usageColor(status.cpu_usage)}`}>{status.cpu_usage}%</p>
                <Progress value={status.cpu_usage} className="mt-2 h-1.5" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1"><MemoryStick className="h-3 w-3" /> RAM</span>
                  <StatusDot status={usageStatus(status.memory_usage)} />
                </div>
                <p className={`text-xl sm:text-2xl font-bold ${usageColor(status.memory_usage)}`}>{status.memory_usage}%</p>
                <p className="text-[10px] text-muted-foreground mt-1 truncate">{status.memory_total}</p>
                <Progress value={status.memory_usage} className="mt-1 h-1.5" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1"><HardDrive className="h-3 w-3" /> Disk</span>
                  <StatusDot status={usageStatus(status.disk_usage)} />
                </div>
                <p className={`text-xl sm:text-2xl font-bold ${usageColor(status.disk_usage)}`}>{status.disk_usage}%</p>
                <p className="text-[10px] text-muted-foreground mt-1 truncate">{status.disk_total}</p>
                <Progress value={status.disk_usage} className="mt-1 h-1.5" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1"><Activity className="h-3 w-3" /> Uptime</span>
                  <StatusDot status="ok" />
                </div>
                <p className="text-xs sm:text-base font-bold text-foreground leading-tight break-words">{status.uptime}</p>
                <p className="text-[10px] text-muted-foreground mt-1">PHP {status.php_version}</p>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="col-span-full">
            <CardContent className="p-4 text-center text-muted-foreground">
              <XCircle className="h-5 w-5 mx-auto mb-1 text-destructive" />
              Server nicht erreichbar
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Services ───────────────────── */}
      {services && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(services).map(([name, info]: [string, any]) => (
            <div key={name} className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
              <StatusDot status={info.running ? "ok" : "error"} />
              <span className="text-sm font-medium">{name}</span>
              <Badge variant={info.running ? "default" : "destructive"} className="text-[10px]">
                {info.running ? "Aktiv" : "Gestoppt"}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                disabled={isRunning}
                onClick={() => setConfirmAction({
                  title: `${name} neustarten?`,
                  description: `Der Dienst ${name} wird auf dem Live-Server neugestartet. Kurzfristige Unterbrechung möglich.`,
                  onConfirm: (pw) => restartMutation.mutate({ service: name, password: pw }),
                })}
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* ── Deployment Panel ───────────────────── */}
        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Rocket className="h-5 w-5 text-primary" />
                Deployment
              </CardTitle>
              <div className="flex gap-2 self-end sm:self-auto">
                <Button
                  onClick={() => setConfirmAction({
                    title: "Deployment auf Live-Server starten?",
                    description: "Backend wird per rsync vom Dev-Server synchronisiert, Frontend per git pull von GitHub gebaut. DB wird nur migriert, nie überschrieben. Vorher wird ein DB-Backup erstellt.",
                    onConfirm: (pw) => deployMutation.mutate(pw),
                  })}
                  disabled={isRunning}
                  size="sm"
                  className="gap-1.5"
                >
                  {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  {isRunning ? "Läuft…" : "Deploy"}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setTerminalLines([])}
                  disabled={isRunning}
                  title="Terminal leeren"
                  className="h-9 w-9 shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Terminal lines={terminalLines} isRunning={isRunning} />
          </CardContent>
        </Card>

        {/* ── Versions ───────────────────── */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <GitBranch className="h-5 w-5 text-primary" />
              Versionen
            </CardTitle>
          </CardHeader>
          <CardContent>
            {versionsLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : versions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Keine Versionen gefunden</p>
            ) : (
              <div className="max-h-80 overflow-y-auto space-y-1.5">
                {versions.map((v: GitVersion) => (
                  <div
                    key={v.hash}
                    className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg px-3 py-2 text-sm ${
                      v.is_current ? "bg-primary/10 border border-primary/30" : "bg-muted/50 hover:bg-muted"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono text-muted-foreground">{v.short_hash}</code>
                        {v.is_current && <Badge variant="default" className="text-[10px]">Aktiv</Badge>}
                      </div>
                      <p className="break-words text-sm mt-0.5">{v.message}</p>
                      <p className="text-[10px] text-muted-foreground">{v.date} — {v.author}</p>
                    </div>
                    {!v.is_current && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="self-end sm:self-auto sm:ml-2 shrink-0 text-xs h-7"
                        disabled={isRunning}
                      onClick={() => setConfirmAction({
                        title: `Rollback auf ${v.short_hash}?`,
                        description: `Der Live-Server wird auf den Commit "${v.message}" zurückgesetzt. Ein Backup wird vorher erstellt.`,
                        onConfirm: (pw) => rollbackMutation.mutate({ hash: v.hash, password: pw }),
                      })}
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1" /> Rollback
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Backups & Snapshots ───────────────────── */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Database className="h-5 w-5 text-primary" />
                Backups & Snapshots
              </CardTitle>
              <div className="flex gap-2 self-end sm:self-auto">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs"
                  onClick={() => setConfirmAction({
                    title: "Snapshot auf Live-Server erstellen?",
                    description: "Die aktuelle Live-Datenbank und Bilder werden als Snapshot gesichert.",
                    onConfirm: (pw) => snapshotMutation.mutate(pw),
                  })}
                >
                  <Camera className="h-3.5 w-3.5" /> Snapshot
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmAction({
                    title: "Backup der Live-DB erstellen?",
                    description: "Die aktuelle Live-Datenbank wird gesichert.",
                    onConfirm: (pw) => backupMutation.mutate(pw),
                  })}
                  disabled={isRunning}
                  className="gap-1 text-xs"
                >
                  <Download className="h-3.5 w-3.5" /> Backup
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {backupsLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : backups.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Keine Backups vorhanden</p>
            ) : (
              <div className="max-h-80 overflow-y-auto space-y-1.5">
                {backups.map((b: BackupEntry) => (
                  <div key={b.filename} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2 hover:bg-muted">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-mono break-all">{b.filename}</p>
                      <p className="text-[10px] text-muted-foreground">{b.date} — {b.size} — {b.age}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="self-end sm:self-auto text-xs h-7 shrink-0"
                      disabled={isRunning}
                      onClick={() => setConfirmAction({
                        title: "Backup auf Live-Server wiederherstellen?",
                        description: `Die aktuelle Live-Datenbank wird mit "${b.filename}" überschrieben. Ein Sicherungs-Backup wird vorher erstellt.`,
                        onConfirm: (pw) => restoreMutation.mutate({ filename: b.filename, password: pw }),
                      })}
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1" /> Restore
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Confirm Dialog ───────────────────── */}
      <AlertDialog open={!!confirmAction} onOpenChange={(o) => { if (!o) { setConfirmAction(null); setActionPassword(""); setPasswordError(false); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {confirmAction?.title}
            </AlertDialogTitle>
            <AlertDialogDescription>{confirmAction?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <label className="text-sm font-medium text-foreground">Aktions-Passwort eingeben:</label>
            <Input
              type="password"
              placeholder="Passwort zur Bestätigung"
              value={actionPassword}
              onChange={(e) => { setActionPassword(e.target.value); setPasswordError(false); }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && actionPassword.length > 0) {
                  confirmAction?.onConfirm(actionPassword);
                  setConfirmAction(null);
                  setActionPassword("");
                }
              }}
              className={passwordError ? "border-destructive" : ""}
              autoFocus
            />
            {passwordError && <p className="text-xs text-destructive">Falsches Passwort</p>}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              disabled={actionPassword.length === 0}
              onClick={() => {
                confirmAction?.onConfirm(actionPassword);
                setConfirmAction(null);
                setActionPassword("");
              }}
            >
              Bestätigen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ServerAdmin;
