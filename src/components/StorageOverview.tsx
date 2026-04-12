import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useTranslation } from "react-i18next";
import { HardDrive, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 1 ? 1 : 0)} ${units[i]}`;
}

export default function StorageOverview() {
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: ["storage-stats"],
    queryFn: api.getStorageStats,
    refetchInterval: 60_000,
  });

  if (isLoading || !data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    );
  }

  const usedPercent = data.total_bytes > 0 ? (data.used_bytes / data.total_bytes) * 100 : 0;
  const isWarning = usedPercent > 80;
  const isCritical = usedPercent > 90;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <HardDrive className="h-5 w-5" />
          {t("dashboard.storageTitle", "Speicherübersicht")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Total storage bar */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-muted-foreground">
              {formatBytes(data.used_bytes)} / {formatBytes(data.total_bytes)}
            </span>
            <span
              className={`font-semibold tabular-nums ${
                isCritical
                  ? "text-destructive"
                  : isWarning
                  ? "text-[hsl(var(--clinical-warning))]"
                  : "text-foreground"
              }`}
            >
              {usedPercent.toFixed(1)}%
            </span>
          </div>
          <Progress
            value={usedPercent}
            className={`h-3 ${
              isCritical
                ? "[&>div]:bg-destructive"
                : isWarning
                ? "[&>div]:bg-[hsl(var(--clinical-warning))]"
                : ""
            }`}
          />
          <p className="text-xs text-muted-foreground">
            {formatBytes(data.free_bytes)} {t("dashboard.storageFree", "frei")}
          </p>
        </div>

        {/* Per-company breakdown */}
        {data.companies && data.companies.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              {t("dashboard.storagePerCompany", "Speicher pro Firma")}
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("dashboard.company", "Firma")}</TableHead>
                  <TableHead className="text-right">{t("dashboard.storageImages", "Bilder")}</TableHead>
                  <TableHead className="text-right">{t("dashboard.storageUsed", "Belegt")}</TableHead>
                  <TableHead className="w-[120px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.companies
                  .sort((a, b) => b.used_bytes - a.used_bytes)
                  .map((c) => {
                    const pct = data.used_bytes > 0 ? (c.used_bytes / data.used_bytes) * 100 : 0;
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell className="text-right tabular-nums">{c.image_count}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatBytes(c.used_bytes)}</TableCell>
                        <TableCell>
                          <Progress value={pct} className="h-2" />
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
