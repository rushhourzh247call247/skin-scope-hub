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
import { DeployProgress } from "@/components/DeployProgress";

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

interface ServerActionStep {
  label: string;
  success: boolean;
  output?: string;
}

interface ServerActionResponse {
  success: boolean;
  error?: string;
  filename?: string;
  steps?: ServerActionStep[];
}

interface ParsedServerActionError {
  message: string;
  details: string[];
  steps: ServerActionStep[];
}

function parseJsonObject(value: unknown) {
  if (typeof value !== "string") return null;

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function createServerActionError(response: ServerActionResponse) {
  const err = new Error(response.error || "Unbekannter Fehler");
  (err as any).payload = response;
  return err;
}

function parseServerActionError(error: unknown): ParsedServerActionError {
  const fallbackMessage = error instanceof Error ? error.message : "Unbekannter Fehler";
  const payloadCandidates = [
    error && typeof error === "object" && "payload" in error ? (error as any).payload : null,
    error && typeof error === "object" && "rawText" in error ? parseJsonObject((error as any).rawText) : null,
    error instanceof Error ? parseJsonObject(error.message) : null,
  ].filter(Boolean);

  const payload = (payloadCandidates[0] as any) || null;
  const details: string[] = [];
  const seen = new Set<string>();

  const pushDetail = (value: unknown) => {
    if (typeof value !== "string") return;

    for (const line of value.split(/\r?\n/)) {
      const normalized = line.trimEnd();
      const dedupeKey = normalized.trim();

      if (!dedupeKey || seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      details.push(normalized);
    }
  };

  if (Array.isArray(payload?.details)) {
    payload.details.forEach(pushDetail);
  } else {
    pushDetail(payload?.details);
  }

  pushDetail(payload?.output);

  if (error && typeof error === "object" && "rawText" in error) {
    const rawText = (error as any).rawText;
    if (typeof rawText === "string" && !rawText.trim().startsWith("{")) {
      pushDetail(rawText);
    }
  }

  return {
    message:
      (typeof payload?.error === "string" && payload.error.trim()) ||
      (typeof payload?.message === "string" && payload.message.trim()) ||
      fallbackMessage,
    details,
    steps: Array.isArray(payload?.steps) ? payload.steps : [],
  };
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
            <span className={`${colorClass(line.type)} whitespace-pre-wrap break-words`}>{line.text}</span>
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
  const [deployState, setDeployState] = useState<"idle" | "running" | "done" | "failed">("idle");
  const [actionPassword, setActionPassword] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [restoreConfirmText, setRestoreConfirmText] = useState("");
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    description: string;
    requireTypedConfirm?: boolean; // 🛡️ Bei Restore: zusätzlich "RESTORE" eintippen
    destructive?: boolean;
    onConfirm: (password: string) => void;
  } | null>(null);

  const addLine = useCallback((text: string, type: TerminalLine["type"] = "info") => {
    setTerminalLines(prev => [...prev, {
      text,
      type,
      timestamp: new Date().toLocaleTimeString("de-CH"),
    }]);
  }, []);

  const addMultilineLine = useCallback((text: string, type: TerminalLine["type"] = "info") => {
    text
      .split(/\r?\n/)
      .map((line) => line.trimEnd())
      .filter((line) => line.trim().length > 0)
      .forEach((line) => addLine(line, type));
  }, [addLine]);

  const appendServerActionSteps = useCallback((steps?: ServerActionStep[]) => {
    steps?.forEach((step) => {
      addLine(step.label, step.success ? "success" : "error");
      if (step.output) {
        addMultilineLine(step.output, step.success ? "info" : "warning");
      }
    });
  }, [addLine, addMultilineLine]);

  const appendServerActionError = useCallback((error: unknown, prefix: string) => {
    const parsed = parseServerActionError(error);
    appendServerActionSteps(parsed.steps);
    parsed.details.forEach((detail) => addMultilineLine(detail, "warning"));
    addLine(`${prefix}: ${parsed.message}`, "error");
    return parsed;
  }, [addLine, addMultilineLine, appendServerActionSteps]);

  const getErrorMessage = useCallback((error: unknown) => parseServerActionError(error).message, []);

  /* ── Server Status ──────── */
  const { data: status, isLoading: statusLoading, error: statusError, refetch: refetchStatus } = useQuery({
    queryKey: ["server-admin-status"],
    queryFn: api.serverAdmin.getStatus,
    refetchInterval: 30000,
  });

  /* Versions-Query entfernt — Live-Server hat kein Git-Repo */

  /* ── Backups ──────── */
  const { data: backups = [], isLoading: backupsLoading, error: backupsError, refetch: refetchBackups } = useQuery({
    queryKey: ["server-admin-backups"],
    queryFn: api.serverAdmin.getBackups,
  });

  /* ── Services ──────── */
  const { data: services, error: servicesError, refetch: refetchServices } = useQuery({
    queryKey: ["server-admin-services"],
    queryFn: api.serverAdmin.getServices,
    refetchInterval: 30000,
  });

  /* ── Deploy ──────── */
  const deployMutation = useMutation({
    mutationFn: async (password: string) => {
      setIsRunning(true);
      setDeployState("running");
      setTerminalLines([]);
      addLine("═══ Deployment auf Live-Server gestartet ═══", "step");
      
      const response = await api.serverAdmin.deploy(password);

      if (!response.success) {
        throw createServerActionError(response);
      }

      appendServerActionSteps(response.steps);
      addLine("═══ Deployment erfolgreich abgeschlossen ═══", "success");
      
      return response;
    },
    onSuccess: () => {
      setDeployState("done");
      refetchStatus();
    },
    onError: (err: Error) => {
      setDeployState("failed");
      const parsed = appendServerActionError(err, "Deployment fehlgeschlagen");
      toast.error(parsed.message || "Deployment fehlgeschlagen");
    },
    onSettled: () => setIsRunning(false),
  });

  /* ── Backup erstellen ──────── */
  const backupMutation = useMutation({
    mutationFn: async (password: string) => {
      addLine("Erstelle Datenbank-Backup auf Live-Server…", "step");
      const res = await api.serverAdmin.createBackup(password);

      if (!res.success) {
        throw createServerActionError(res);
      }

      addLine(`Backup erstellt: ${res.filename}`, "success");
      return res;
    },
    onSuccess: () => {
      refetchBackups();
      toast.success("Backup erstellt");
    },
    onError: (err: Error) => {
      const parsed = appendServerActionError(err, "Backup fehlgeschlagen");
      toast.error(parsed.message || "Backup fehlgeschlagen");
    },
  });

  /* ── Rollback ──────── */
  const rollbackMutation = useMutation({
    mutationFn: async ({ hash, password }: { hash: string; password: string }) => {
      setIsRunning(true);
      addLine(`Rollback auf Version ${hash.slice(0, 7)} (Live-Server)…`, "step");
      const res = await api.serverAdmin.rollback(hash, password);

      if (!res.success) {
        throw createServerActionError(res);
      }

      addLine("Rollback erfolgreich", "success");
      return res;
    },
    onSuccess: () => {
      refetchStatus();
    },
    onError: (err: Error) => {
      const parsed = appendServerActionError(err, "Rollback fehlgeschlagen");
      toast.error(parsed.message || "Rollback fehlgeschlagen");
    },
    onSettled: () => setIsRunning(false),
  });

  /* ── Backup Restore ──────── */
  const restoreMutation = useMutation({
    mutationFn: async ({ filename, password }: { filename: string; password: string }) => {
      setIsRunning(true);
      addLine(`Stelle Backup wieder her auf Live-Server: ${filename}…`, "step");
      const res = await api.serverAdmin.restoreBackup(filename, password);

      if (!res.success) {
        throw createServerActionError(res);
      }

      addLine("Wiederherstellung erfolgreich", "success");
      return res;
    },
    onError: (err: Error) => {
      const parsed = appendServerActionError(err, "Restore fehlgeschlagen");
      toast.error(parsed.message || "Restore fehlgeschlagen");
    },
    onSettled: () => setIsRunning(false),
  });

  /* ── Service Restart ──────── */
  const restartMutation = useMutation({
    mutationFn: async ({ service, password }: { service: string; password: string }) => {
      addLine(`Starte ${service} auf Live-Server neu…`, "step");
      const res = await api.serverAdmin.restartService(service, password);

      if (!res.success) {
        throw createServerActionError(res);
      }

      addLine(`${service} neugestartet`, "success");
      return res;
    },
    onSuccess: () => refetchServices(),
    onError: (err: Error) => {
      const parsed = appendServerActionError(err, "Service-Neustart fehlgeschlagen");
      toast.error(parsed.message || "Service-Neustart fehlgeschlagen");
    },
  });

  /* ── Snapshot ──────── */
  const snapshotMutation = useMutation({
    mutationFn: async (password: string) => {
      addLine("Erstelle Snapshot auf Live-Server…", "step");
      const res = await api.serverAdmin.createSnapshot(password);

      if (!res.success) {
        throw createServerActionError(res);
      }

      addLine(`Snapshot erstellt: ${res.filename}`, "success");
      return res;
    },
    onError: (err: Error) => {
      const parsed = appendServerActionError(err, "Snapshot fehlgeschlagen");
      toast.error(parsed.message || "Snapshot fehlgeschlagen");
    },
  });

  const usageColor = (pct: number) => pct > 90 ? "text-red-500" : pct > 70 ? "text-amber-500" : "text-emerald-500";
  const usageStatus = (pct: number): "ok" | "warn" | "error" => pct > 90 ? "error" : pct > 70 ? "warn" : "ok";

  /* ── Backup-Klassifizierung (Frontend-only, basiert auf Dateiname) ──────── */
  // Backend benennt Pre-Deploy-Backups als "db_pre_deploy_*" oder "pre_deploy_*"
  const isAutoBackup = (filename: string) =>
    /pre[_-]?deploy/i.test(filename) || /auto/i.test(filename);

  // Größe-Strings wie "292 KB" / "1.2 MB" zu Bytes parsen für Summen
  const parseSizeToBytes = (size: string): number => {
    const m = size.trim().match(/^([\d.,]+)\s*(B|KB|MB|GB|TB)$/i);
    if (!m) return 0;
    const num = parseFloat(m[1].replace(",", "."));
    const unit = m[2].toUpperCase();
    const mult = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 }[unit] ?? 1;
    return num * mult;
  };

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
    return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  };

  const totalBackupBytes = backups.reduce((sum: number, b: BackupEntry) => sum + parseSizeToBytes(b.size), 0);
  const autoCount = backups.filter((b: BackupEntry) => isAutoBackup(b.filename)).length;
  const manualCount = backups.length - autoCount;

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
        <Button variant="outline" size="sm" className="self-start sm:self-auto shrink-0" onClick={() => { refetchStatus(); refetchBackups(); refetchServices(); }}>
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
        ) : statusError ? (
          <Card className="col-span-full">
            <CardContent className="p-4 text-center">
              <XCircle className="h-5 w-5 mx-auto mb-1 text-destructive" />
              <p className="text-sm text-foreground">Serverstatus konnte nicht geladen werden</p>
              <p className="mt-1 break-words text-xs text-muted-foreground">{getErrorMessage(statusError)}</p>
            </CardContent>
          </Card>
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
      {servicesError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          Dienste konnten nicht geladen werden: {getErrorMessage(servicesError)}
        </div>
      ) : services && (
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
                  onClick={() => { setTerminalLines([]); setDeployState("idle"); }}
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
            <DeployProgress
              isRunning={isRunning}
              isDone={deployState === "done"}
              hasFailed={deployState === "failed"}
            />
            <Terminal lines={terminalLines} isRunning={isRunning} />
          </CardContent>
        </Card>

        {/* Versionen-Box entfernt — Live-Server nutzt kein Git-Repo (Deploy via rsync) */}

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
            ) : backupsError ? (
              <p className="break-words py-8 text-center text-sm text-destructive">
                Backups konnten nicht geladen werden: {getErrorMessage(backupsError)}
              </p>
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
              autoComplete="current-password"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
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
