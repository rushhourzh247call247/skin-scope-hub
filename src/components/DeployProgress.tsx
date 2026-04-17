import React, { useEffect, useState } from "react";
import { Database, FolderSync, Package, ArrowUpToLine, GitBranch, Hammer, CheckCircle2, Loader2, Check, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

/**
 * Visualisiert den Deploy-Fortschritt mit animierten Steps.
 * Da das Backend keine SSE-Streams sendet, simulieren wir die Schritte
 * basierend auf typischen Zeitfenstern (gemessen aus echten Deploys).
 * Sobald der Backend-Call fertig ist, springt die UI auf "fertig".
 */

export interface DeployStep {
  id: string;
  label: string;
  estimatedSeconds: number;
  icon: React.ComponentType<{ className?: string }>;
}

const DEPLOY_STEPS: DeployStep[] = [
  { id: "backup", label: "Datenbank-Backup", estimatedSeconds: 3, icon: Database },
  { id: "rsync", label: "Backend-Code synchronisieren", estimatedSeconds: 12, icon: FolderSync },
  { id: "composer", label: "Composer-Pakete installieren", estimatedSeconds: 25, icon: Package },
  { id: "migrate", label: "Datenbank-Migrationen prüfen", estimatedSeconds: 4, icon: ArrowUpToLine },
  { id: "git", label: "Frontend von GitHub klonen", estimatedSeconds: 8, icon: GitBranch },
  { id: "build", label: "Frontend bauen (Vite)", estimatedSeconds: 60, icon: Hammer },
  { id: "cache", label: "Caches neu aufbauen", estimatedSeconds: 4, icon: CheckCircle2 },
];

const TOTAL_ESTIMATED = DEPLOY_STEPS.reduce((sum, s) => sum + s.estimatedSeconds, 0);

interface DeployProgressProps {
  isRunning: boolean;
  isDone: boolean;
  hasFailed: boolean;
}

export const DeployProgress: React.FC<DeployProgressProps> = ({ isRunning, isDone, hasFailed }) => {
  const [elapsed, setElapsed] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);

  useEffect(() => {
    if (isRunning && startTime === null) {
      setStartTime(Date.now());
      setElapsed(0);
    }
    if (!isRunning) {
      setStartTime(null);
    }
  }, [isRunning, startTime]);

  useEffect(() => {
    if (!isRunning || startTime === null) return;
    const tick = () => setElapsed(Math.floor((Date.now() - startTime) / 1000));
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [isRunning, startTime]);

  if (!isRunning && !isDone && !hasFailed) return null;

  // Berechne aktiven Step
  let activeIndex = 0;
  let cumSeconds = 0;
  for (let i = 0; i < DEPLOY_STEPS.length; i++) {
    cumSeconds += DEPLOY_STEPS[i].estimatedSeconds;
    if (elapsed < cumSeconds) {
      activeIndex = i;
      break;
    }
    activeIndex = i + 1;
  }

  // Wenn fertig: alles abgeschlossen
  if (isDone) activeIndex = DEPLOY_STEPS.length;

  // Gesamtfortschritt (cap bei 95% während running, 100% bei done)
  const rawProgress = Math.min((elapsed / TOTAL_ESTIMATED) * 100, 95);
  const progress = isDone ? 100 : hasFailed ? Math.min(rawProgress, 100) : rawProgress;

  const remaining = Math.max(0, TOTAL_ESTIMATED - elapsed);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

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
                  Schritt {Math.min(activeIndex + 1, DEPLOY_STEPS.length)}/{DEPLOY_STEPS.length}: {DEPLOY_STEPS[Math.min(activeIndex, DEPLOY_STEPS.length - 1)].label}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground font-mono">
            <Clock className="h-3 w-3" />
            <span>{formatTime(elapsed)}</span>
            {!isDone && !hasFailed && <span className="opacity-60">/ ~{formatTime(remaining)} verbleibend</span>}
          </div>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step-Liste */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2">
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
