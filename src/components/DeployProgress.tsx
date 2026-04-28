import React, { useEffect, useState } from "react";
import { Database, FolderSync, Package, ArrowUpToLine, GitBranch, Hammer, CheckCircle2, Loader2, Check, Clock, Radio, ShieldCheck, HeartPulse, FileKey, Activity } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

/**
 * Visualisiert den Deploy-Fortschritt.
 *
 * Zwei Modi:
 * 1. LIVE: Backend schreibt /tmp/deploy-status.json — Frontend pollt alle 1.5s den
 *    /server-admin/deploy/status Endpoint und zeigt den ECHTEN aktuellen Schritt.
 * 2. FALLBACK (Schätzung): Falls der Status-Endpoint 404 oder leer liefert
 *    (Backend noch nicht aktualisiert), läuft eine Schätzung basierend auf typischen
 *    Zeitfenstern aus echten Deploys.
 */

export interface DeployStep {
  id: string;
  label: string;
  estimatedSeconds: number;
  icon: React.ComponentType<{ className?: string }>;
}

// Diese Liste muss EXAKT mit den writeDeployStatus()-Aufrufen im Backend
// (ServerAdminController.php) übereinstimmen — Backend hat 8 Steps:
//   1. System-Pakete prüfen      → checkSystemRequirements()
//   2. Datenbank-Backup          → cp live DB
//   3. Backend-Code synchron.    → rsync Dev→Live
//   4. Composer                  → composer install
//   5. Datenbank-Migrationen     → php artisan migrate
//   6. Frontend von GitHub klon. → git clone
//   7. Frontend bauen (Vite)     → npm install + npm run build
//   8. Caches neu aufbauen       → rsync dist + artisan cache
const DEPLOY_STEPS: DeployStep[] = [
  { id: "syscheck", label: "System-Pakete prüfen", estimatedSeconds: 5, icon: ShieldCheck },
  { id: "backup", label: "Datenbank-Backup", estimatedSeconds: 3, icon: Database },
  { id: "rsync", label: "Backend-Code synchronisieren", estimatedSeconds: 12, icon: FolderSync },
  { id: "composer", label: "Composer-Pakete installieren", estimatedSeconds: 25, icon: Package },
  { id: "migrate", label: "Datenbank-Migrationen", estimatedSeconds: 4, icon: ArrowUpToLine },
  { id: "git", label: "Frontend von GitHub klonen", estimatedSeconds: 8, icon: GitBranch },
  { id: "build", label: "Frontend bauen (Vite)", estimatedSeconds: 60, icon: Hammer },
  { id: "deploy", label: "Deploy & Caches aufbauen", estimatedSeconds: 8, icon: ArrowUpToLine },
];

// Verkürzte Liste für Frontend-only Deploy (kein Composer, keine Migrations, kein Backend-Sync)
const FRONTEND_ONLY_STEPS: DeployStep[] = [
  { id: "git", label: "Frontend von GitHub klonen", estimatedSeconds: 8, icon: GitBranch },
  { id: "build", label: "Frontend bauen (Vite)", estimatedSeconds: 45, icon: Hammer },
  { id: "deploy", label: "Deploy & Cache-Bust", estimatedSeconds: 5, icon: ArrowUpToLine },
];

interface DeployProgressProps {
  isRunning: boolean;
  isDone: boolean;
  hasFailed: boolean;
  mode?: "full" | "frontend";
}

export const DeployProgress: React.FC<DeployProgressProps> = ({ isRunning, isDone, hasFailed, mode = "full" }) => {
  const steps = mode === "frontend" ? FRONTEND_ONLY_STEPS : DEPLOY_STEPS;
  const TOTAL_ESTIMATED = steps.reduce((sum, s) => sum + s.estimatedSeconds, 0);
  const [elapsed, setElapsed] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [liveStep, setLiveStep] = useState<number | null>(null); // echter Step vom Backend (1-basiert) oder null
  const [liveSource, setLiveSource] = useState<"live" | "estimated">("estimated");
  const [stepStartedAt, setStepStartedAt] = useState<number | null>(null);

  useEffect(() => {
    if (isRunning && startTime === null) {
      setStartTime(Date.now());
      setElapsed(0);
      setLiveStep(null);
      setStepStartedAt(null);
    }
    if (!isRunning) {
      setStartTime(null);
    }
  }, [isRunning, startTime]);

  // Sekunden-Ticker
  useEffect(() => {
    if (!isRunning || startTime === null) return;
    const tick = () => setElapsed(Math.floor((Date.now() - startTime) / 1000));
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [isRunning, startTime]);

  // Live-Polling: alle 1.5s den echten Backend-Status holen
  useEffect(() => {
    if (!isRunning) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const status = await api.serverAdmin.getDeployStatus();
        if (cancelled) return;
        if (status && status.active && status.step > 0) {
          setLiveStep(status.step);
          setStepStartedAt(status.step_started_at * 1000); // backend liefert Unix-Sekunden
          setLiveSource("live");
        }
      } catch {
        // Endpoint nicht verfügbar (Backend nicht aktualisiert) → Fallback bleibt
        if (!cancelled) setLiveSource("estimated");
      }
    };

    poll();
    const interval = setInterval(poll, 1500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isRunning]);

  if (!isRunning && !isDone && !hasFailed) return null;

  // Aktiven Step bestimmen — bevorzugt LIVE, sonst Schätzung
  let activeIndex: number;
  if (liveStep !== null && liveSource === "live") {
    activeIndex = liveStep - 1; // 1-basiert → 0-basiert
  } else {
    activeIndex = 0;
    let cumSeconds = 0;
    for (let i = 0; i < DEPLOY_STEPS.length; i++) {
      cumSeconds += DEPLOY_STEPS[i].estimatedSeconds;
      if (elapsed < cumSeconds) {
        activeIndex = i;
        break;
      }
      activeIndex = i + 1;
    }
  }

  if (isDone) activeIndex = DEPLOY_STEPS.length;

  const rawProgress = liveSource === "live" && liveStep !== null
    ? Math.min((liveStep / DEPLOY_STEPS.length) * 100, 95)
    : Math.min((elapsed / TOTAL_ESTIMATED) * 100, 95);
  const progress = isDone ? 100 : rawProgress;

  const remaining = Math.max(0, TOTAL_ESTIMATED - elapsed);

  // Step-Dauer (nur bei live verfügbar)
  const stepElapsed = stepStartedAt !== null && liveSource === "live"
    ? Math.floor((Date.now() - stepStartedAt) / 1000)
    : null;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  const safeActiveIndex = Math.min(activeIndex, DEPLOY_STEPS.length - 1);

  return (
    <div className="rounded-lg border bg-card p-4 mb-4 space-y-4">
      {/* Header mit Zeit + Progressbar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {isDone ? (
              <>
                <Check className="h-4 w-4 text-emerald-500" />
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  Deployment abgeschlossen in {formatTime(elapsed)}
                </span>
              </>
            ) : hasFailed ? (
              <span className="font-medium text-destructive">Deployment fehlgeschlagen</span>
            ) : (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="font-medium">
                  Schritt {Math.min(activeIndex + 1, DEPLOY_STEPS.length)}/{DEPLOY_STEPS.length}: {DEPLOY_STEPS[safeActiveIndex].label}
                </span>
                {stepElapsed !== null && (
                  <span className="text-muted-foreground font-mono">({stepElapsed}s)</span>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-3 text-muted-foreground font-mono">
            {isRunning && (
              <span
                className={cn(
                  "flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded",
                  liveSource === "live"
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                    : "bg-muted text-muted-foreground",
                )}
                title={liveSource === "live" ? "Live-Daten vom Backend" : "Geschätzt – Backend liefert keinen Live-Status"}
              >
                <Radio className={cn("h-2.5 w-2.5", liveSource === "live" && "animate-pulse")} />
                {liveSource === "live" ? "LIVE" : "geschätzt"}
              </span>
            )}
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              <span>{formatTime(elapsed)}</span>
              {!isDone && !hasFailed && liveSource === "estimated" && (
                <span className="opacity-60">/ ~{formatTime(remaining)} verbleibend</span>
              )}
            </div>
          </div>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step-Liste */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-2">
        {DEPLOY_STEPS.map((step, i) => {
          const isComplete = i < activeIndex;
          const isActive = i === activeIndex && !isDone && !hasFailed;
          const isPending = i > activeIndex;
          const Icon = step.icon;

          return (
            <div
              key={step.id}
              className={cn(
                "flex lg:flex-col items-center lg:text-center gap-2 p-2 rounded-md transition-all duration-300",
                isComplete && "bg-emerald-500/10",
                isActive && "bg-primary/10 ring-1 ring-primary/30 scale-105",
                isPending && "opacity-40",
              )}
            >
              <div
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-colors",
                  isComplete && "bg-emerald-500 text-white",
                  isActive && "bg-primary text-primary-foreground",
                  isPending && "bg-muted text-muted-foreground",
                )}
              >
                {isComplete ? (
                  <Check className="h-4 w-4" />
                ) : isActive ? (
                  <Icon className="h-4 w-4 animate-pulse" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              <div className="flex-1 lg:flex-none min-w-0">
                <div
                  className={cn(
                    "text-[11px] font-medium leading-tight truncate lg:whitespace-normal lg:line-clamp-2",
                    isComplete && "text-emerald-700 dark:text-emerald-400",
                    isActive && "text-primary",
                  )}
                >
                  {step.label}
                </div>
                <div className="text-[10px] text-muted-foreground font-mono">
                  ~{step.estimatedSeconds}s
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
