import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck, ShieldAlert, AlertTriangle, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useLifecycle } from "@/hooks/use-lifecycle";

interface AbcdeData {
  abc_asymmetry: boolean;
  abc_border: string;
  abc_color: string;
  abc_diameter: string;
  abc_evolution: string;
}

interface AbcdeFormProps {
  imageId: number;
  patientId: number;
  initialData?: Partial<AbcdeData & { risk_score?: number; risk_level?: string }>;
  disabled?: boolean;
}

const AbcdeForm = ({ imageId, patientId, initialData, disabled = false }: AbcdeFormProps) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { isReadOnly } = useLifecycle();
  const [saving, setSaving] = useState(false);
  const [riskScore, setRiskScore] = useState<number | null>(initialData?.risk_score ?? null);
  const [riskLevel, setRiskLevel] = useState<string | null>(initialData?.risk_level ?? null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const isFormLocked = disabled || isReadOnly;

  const CRITERIA = [
    {
      key: "abc_asymmetry" as const,
      label: t('abcdeForm.asymmetry'),
      options: [
        { value: "false", label: t('abcdeForm.symmetric') },
        { value: "true", label: t('abcdeForm.asymmetric') },
      ],
    },
    {
      key: "abc_border" as const,
      label: t('abcdeForm.border'),
      options: [
        { value: "regelmaessig", label: t('abcdeForm.regular') },
        { value: "unregelmaessig", label: t('abcdeForm.irregular') },
      ],
    },
    {
      key: "abc_color" as const,
      label: t('abcdeForm.colorLabel'),
      options: [
        { value: "einfarbig", label: t('abcdeForm.singleColor') },
        { value: "mehrfarbig", label: t('abcdeForm.multiColor') },
      ],
    },
    {
      key: "abc_diameter" as const,
      label: t('abcdeForm.diameter'),
      options: [
        { value: "kleiner_6mm", label: t('abcdeForm.lessThan6mm') },
        { value: "groesser_6mm", label: t('abcdeForm.moreThan6mm') },
      ],
    },
    {
      key: "abc_evolution" as const,
      label: t('abcdeForm.evolution'),
      options: [
        { value: "stabil", label: t('abcdeForm.stableEvolution') },
        { value: "veraendert", label: t('abcdeForm.changed') },
      ],
    },
  ];

  const toBoolStr = (v: any): string => {
    if (v == null) return "";
    if (typeof v === "boolean") return String(v);
    if (typeof v === "number") return v ? "true" : "false";
    const s = String(v).toLowerCase();
    if (s === "true" || s === "1") return "true";
    if (s === "false" || s === "0") return "false";
    return "";
  };

  const [values, setValues] = useState<Record<string, string>>(() => ({
    abc_asymmetry: toBoolStr(initialData?.abc_asymmetry),
    abc_border: initialData?.abc_border ?? "",
    abc_color: initialData?.abc_color ?? "",
    abc_diameter: initialData?.abc_diameter ?? "",
    abc_evolution: initialData?.abc_evolution ?? "",
  }));

  useEffect(() => {
    if (initialData) {
      setValues({
        abc_asymmetry: toBoolStr(initialData.abc_asymmetry),
        abc_border: initialData.abc_border ?? "",
        abc_color: initialData.abc_color ?? "",
        abc_diameter: initialData.abc_diameter ?? "",
        abc_evolution: initialData.abc_evolution ?? "",
      });
      if (initialData.risk_score != null) setRiskScore(initialData.risk_score);
      if (initialData.risk_level) setRiskLevel(initialData.risk_level);
    }
  }, [initialData?.risk_score, initialData?.risk_level, initialData?.abc_asymmetry, initialData?.abc_border, initialData?.abc_color, initialData?.abc_diameter, initialData?.abc_evolution]);

  const handleChange = useCallback((key: string, value: string) => {
    if (isFormLocked) return;

    setValues(prev => {
      const next = { ...prev, [key]: value };

      const allFilled = CRITERIA.every(c => next[c.key] !== "");
      if (!allFilled) return next;

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        setSaving(true);
        try {
          const payload: AbcdeData = {
            abc_asymmetry: next.abc_asymmetry === "true",
            abc_border: next.abc_border,
            abc_color: next.abc_color,
            abc_diameter: next.abc_diameter,
            abc_evolution: next.abc_evolution,
          };
          const result = await api.updateAbcde(imageId, payload);
          setRiskScore(result.risk_score);
          setRiskLevel(result.risk_level);
          queryClient.invalidateQueries({ queryKey: ["full-patient", patientId] });
          toast.success(t('abcdeForm.saved'));
        } catch {
          toast.error(t('abcdeForm.saveError'));
        } finally {
          setSaving(false);
        }
      }, 600);

      return next;
    });
  }, [CRITERIA, imageId, isFormLocked, patientId, queryClient, t]);

  const hasData = riskLevel != null && riskScore != null;

  const riskIcon = riskLevel === "low"
    ? <ShieldCheck className="h-3 w-3" />
    : riskLevel === "medium"
      ? <AlertTriangle className="h-3 w-3" />
      : <ShieldAlert className="h-3 w-3" />;

  const riskColorClass = riskLevel === "low"
    ? "text-green-700 bg-green-50 border-green-200"
    : riskLevel === "medium"
      ? "text-amber-700 bg-amber-50 border-amber-200"
      : "text-red-700 bg-red-50 border-red-200";

  const riskLabel = riskLevel === "low" ? t('abcdeForm.risk') + ": " + t('riskProgression.low') : riskLevel === "medium" ? t('abcdeForm.risk') + ": " + t('riskProgression.medium') : t('abcdeForm.risk') + ": " + t('riskProgression.high');
  const riskLabelShort = riskLevel === "low" ? t('riskProgression.low') : riskLevel === "medium" ? t('riskProgression.medium') : t('riskProgression.high');

  return (
    <Collapsible className="rounded-md border bg-muted/20">
      <CollapsibleTrigger className="flex w-full items-center justify-between px-2 py-1.5 hover:bg-muted/40 transition-colors">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold text-foreground/70 uppercase tracking-wider">{t('abcdeForm.title')}</span>
          {saving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        </div>
        <div className="flex items-center gap-1.5">
          {hasData && (
            <span className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold border ${riskColorClass}`}>
              {riskIcon}
              {riskLabelShort} ({riskScore})
            </span>
          )}
          {!hasData && (
            <span className="text-[10px] text-muted-foreground">{t('abcdeForm.optional')}</span>
          )}
          <ChevronDown className="h-3 w-3 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-2 px-2 pb-2 pt-1">
          {CRITERIA.map(c => (
            <div key={c.key} className="space-y-0.5">
              <Label className="text-[10px] font-medium text-foreground/80">{c.label}</Label>
              <RadioGroup
                value={values[c.key]}
                onValueChange={(v) => handleChange(c.key, v)}
                className="flex gap-3"
                disabled={isFormLocked}
              >
                {c.options.map(opt => (
                  <div key={opt.value} className="flex items-center gap-1">
                    <RadioGroupItem value={opt.value} id={`${imageId}-${c.key}-${opt.value}`} className="h-3 w-3" disabled={isFormLocked} />
                    <Label htmlFor={`${imageId}-${c.key}-${opt.value}`} className="text-[10px] cursor-pointer">
                      {opt.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          ))}

          {hasData && (
            <div className={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 ${riskColorClass}`}>
              {riskIcon}
              <span className="text-[11px] font-semibold">
                {riskLabel} (Score: {riskScore})
              </span>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default AbcdeForm;
