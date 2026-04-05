import type { AiAnalysis } from "@/types/patient";
import { AlertTriangle, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/dateUtils";
import { useTranslation } from "react-i18next";

interface AiAnalysisResultProps {
  analysis: AiAnalysis;
  compact?: boolean;
}

const AiAnalysisResult = ({ analysis, compact = false }: AiAnalysisResultProps) => {
  const { t } = useTranslation();

  const riskColor = analysis.risk === "Niedrig"
    ? "text-green-600 bg-green-50 border-green-200"
    : analysis.risk === "Mittel"
      ? "text-amber-600 bg-amber-50 border-amber-200"
      : "text-red-600 bg-red-50 border-red-200";

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50/50 p-2 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Badge className="bg-amber-500 hover:bg-amber-500 text-white text-[9px] px-1.5 py-0 gap-1">
          <Sparkles className="h-2.5 w-2.5" />
          {t("aiAnalysis.badge")}
        </Badge>
        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${riskColor}`}>
          {t("aiAnalysis.risk")}: {analysis.risk}
        </span>
      </div>

      {!compact && (
        <pre className="text-[10px] text-foreground/80 whitespace-pre-wrap font-sans leading-relaxed">
          {analysis.result}
        </pre>
      )}

      <div className="flex items-start gap-1.5 pt-1 border-t border-amber-200/50">
        <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-[9px] text-amber-700 leading-tight">
          {t("aiAnalysis.disclaimer")}
        </p>
      </div>

      {analysis.created_at && (
        <p className="text-[8px] text-muted-foreground">
          {t("aiAnalysis.analyzed")}: {formatDate(analysis.created_at, "dd.MM.yyyy HH:mm")}
        </p>
      )}
    </div>
  );
};

export default AiAnalysisResult;
