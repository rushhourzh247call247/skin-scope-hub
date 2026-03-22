import { useState } from "react";
import type { LocationImage } from "@/types/patient";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface RiskProgressionProps {
  images: LocationImage[];
  locationName: string;
}

const RISK_COLORS = {
  low: "hsl(142, 71%, 45%)",
  medium: "hsl(45, 93%, 47%)",
  high: "hsl(0, 84%, 60%)",
};

function getRiskColor(score: number | null | undefined): string {
  if (score == null) return "hsl(var(--muted-foreground))";
  if (score <= 1) return RISK_COLORS.low;
  if (score <= 3) return RISK_COLORS.medium;
  return RISK_COLORS.high;
}

function getRiskLabel(level: string | null | undefined): string {
  if (!level) return "–";
  if (level === "low") return "Niedrig";
  if (level === "medium") return "Mittel";
  return "Hoch";
}

const CustomDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null) return null;
  const color = getRiskColor(payload.risk_score);
  return (
    <circle cx={cx} cy={cy} r={5} fill={color} stroke="white" strokeWidth={2} />
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.[0]) return null;
  const data = payload[0].payload;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium">{data.dateLabel}</p>
      <p style={{ color: getRiskColor(data.risk_score) }}>
        Score: {data.risk_score ?? "–"} ({getRiskLabel(data.risk_level)})
      </p>
    </div>
  );
};

const RiskProgression = ({ images, locationName }: RiskProgressionProps) => {
  const [selectedImage, setSelectedImage] = useState<LocationImage | null>(null);

  // Sort by date ascending
  const sorted = [...images]
    .filter((img) => img.created_at)
    .sort((a, b) => new Date(a.created_at!).getTime() - new Date(b.created_at!).getTime());

  if (sorted.length === 0) return null;

  const hasAnyScore = sorted.some((img) => img.risk_score != null);

  // Chart data
  const chartData = sorted.map((img, idx) => ({
    idx,
    imageId: img.id,
    date: new Date(img.created_at!).getTime(),
    dateLabel: format(new Date(img.created_at!), "dd.MM.yy", { locale: de }),
    risk_score: img.risk_score ?? null,
    risk_level: img.risk_level ?? null,
  }));

  // Trend based on last two scores (more realistic)
  const scores = sorted.map((img) => img.risk_score).filter((s): s is number => s != null);
  const trend = scores.length >= 2
    ? scores[scores.length - 1] > scores[scores.length - 2]
      ? "up"
      : scores[scores.length - 1] < scores[scores.length - 2]
        ? "down"
        : "stable"
    : null;

  const everHigh = scores.some(s => s >= 4);

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "up" ? "text-red-500" : trend === "down" ? "text-green-500" : "text-muted-foreground";
  const trendLabel = trend === "up" ? "Verschlechterung" : trend === "down" ? "Verbesserung" : "Stabil";

  return (
    <div className="space-y-3 rounded-lg border bg-card p-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
          📈 Verlauf
        </h4>
        {trend && (
          <div className={`flex items-center gap-1 text-[11px] font-medium ${trendColor}`}>
            <TrendIcon className="h-3.5 w-3.5" />
            {trendLabel}
          </div>
        )}
      </div>

      {/* Critical history warning */}
      {everHigh && (
        <div className="flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-[11px] font-medium text-red-700">
          ⚠️ Früher hoher Risikowert erkannt (Score ≥ 4)
        </div>
      )}

      {/* Mini Chart */}
      {hasAnyScore && chartData.length >= 2 && (
        <div className="h-28 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="dateLabel"
                tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 5]}
                ticks={[0, 1, 2, 3, 4, 5]}
                tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={2} stroke="hsl(45, 93%, 47%)" strokeDasharray="3 3" strokeOpacity={0.4} />
              <ReferenceLine y={4} stroke="hsl(0, 84%, 60%)" strokeDasharray="3 3" strokeOpacity={0.4} />
              <Line
                type="monotone"
                dataKey="risk_score"
                stroke="hsl(var(--foreground))"
                strokeWidth={2}
                dot={<CustomDot />}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Single score display when only 1 image */}
      {hasAnyScore && chartData.length === 1 && (
        <div className="flex items-center gap-2 text-xs">
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold text-white"
            style={{ backgroundColor: getRiskColor(chartData[0].risk_score) }}
          >
            Score: {chartData[0].risk_score}
          </span>
          <span className="text-muted-foreground">{chartData[0].dateLabel}</span>
        </div>
      )}

      {/* Thumbnail strip */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {sorted.map((img) => (
          <button
            key={img.id}
            onClick={() => setSelectedImage(img)}
            className="relative shrink-0 group"
          >
            <div className="h-14 w-14 overflow-hidden rounded-md border-2 border-border transition-all group-hover:border-primary">
              <img
                src={api.resolveImageSrc(img)}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
            {/* Score badge */}
            {img.risk_score != null && (
              <span
                className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold text-white shadow-sm"
                style={{ backgroundColor: getRiskColor(img.risk_score) }}
              >
                {img.risk_score}
              </span>
            )}
            <span className="block text-[8px] text-muted-foreground text-center mt-0.5">
              {img.created_at ? format(new Date(img.created_at), "dd.MM", { locale: de }) : "–"}
            </span>
          </button>
        ))}
      </div>

      {/* Enlarged image dialog */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-md p-2">
          {selectedImage && (
            <div className="space-y-2">
              <img
                src={api.resolveImageSrc(selectedImage)}
                alt=""
                className="w-full rounded-md object-contain max-h-[60vh]"
              />
              <div className="flex items-center justify-between px-1">
                <span className="text-xs text-muted-foreground">
                  {selectedImage.created_at
                    ? format(new Date(selectedImage.created_at), "dd.MM.yyyy HH:mm", { locale: de })
                    : "–"}
                </span>
                {selectedImage.risk_score != null && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold text-white"
                    style={{ backgroundColor: getRiskColor(selectedImage.risk_score) }}
                  >
                    Score: {selectedImage.risk_score} – {getRiskLabel(selectedImage.risk_level)}
                  </span>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RiskProgression;
