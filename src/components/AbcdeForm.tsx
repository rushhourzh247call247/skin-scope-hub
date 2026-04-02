import { useState, useCallback, useRef, useEffect } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck, ShieldAlert, AlertTriangle, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
}

const CRITERIA = [
  {
    key: "abc_asymmetry" as const,
    label: "A – Asymmetrie",
    options: [
      { value: "false", label: "Symmetrisch" },
      { value: "true", label: "Asymmetrisch" },
    ],
  },
  {
    key: "abc_border" as const,
    label: "B – Begrenzung",
    options: [
      { value: "regelmaessig", label: "Regelmässig" },
      { value: "unregelmaessig", label: "Unregelmässig" },
    ],
  },
  {
    key: "abc_color" as const,
    label: "C – Farbe",
    options: [
      { value: "einfarbig", label: "Einfarbig" },
      { value: "mehrfarbig", label: "Mehrfarbig" },
    ],
  },
  {
    key: "abc_diameter" as const,
    label: "D – Durchmesser",
    options: [
      { value: "kleiner_6mm", label: "< 6mm" },
      { value: "groesser_6mm", label: "> 6mm" },
    ],
  },
  {
    key: "abc_evolution" as const,
    label: "E – Entwicklung",
    options: [
      { value: "stabil", label: "Stabil" },
      { value: "veraendert", label: "Verändert" },
    ],
  },
];

const AbcdeForm = ({ imageId, patientId, initialData }: AbcdeFormProps) => {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [riskScore, setRiskScore] = useState<number | null>(initialData?.risk_score ?? null);
  const [riskLevel, setRiskLevel] = useState<string | null>(initialData?.risk_level ?? null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const [values, setValues] = useState<Record<string, string>>(() => ({
    abc_asymmetry: initialData?.abc_asymmetry != null ? String(initialData.abc_asymmetry) : "",
    abc_border: initialData?.abc_border ?? "",
    abc_color: initialData?.abc_color ?? "",
    abc_diameter: initialData?.abc_diameter ?? "",
    abc_evolution: initialData?.abc_evolution ?? "",
  }));

  // Sync from props
  useEffect(() => {
    if (initialData) {
      setValues({
        abc_asymmetry: initialData.abc_asymmetry != null ? String(initialData.abc_asymmetry) : "",
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
          toast.success("ABCDE gespeichert");
        } catch {
          toast.error("ABCDE konnte nicht gespeichert werden");
        } finally {
          setSaving(false);
        }
      }, 600);

      return next;
    });
  }, [imageId, patientId, queryClient]);

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

  const riskLabel = riskLevel === "low" ? "Niedrig" : riskLevel === "medium" ? "Mittel" : "Hoch";

  return (
    <Collapsible className="rounded-md border bg-muted/20">
      <CollapsibleTrigger className="flex w-full items-center justify-between px-2 py-1.5 hover:bg-muted/40 transition-colors">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold text-foreground/70 uppercase tracking-wider">ABCDE-Bewertung</span>
          {saving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        </div>
        <div className="flex items-center gap-1.5">
          {hasData && (
            <span className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold border ${riskColorClass}`}>
              {riskIcon}
              {riskLabel} ({riskScore})
            </span>
          )}
          {!hasData && (
            <span className="text-[10px] text-muted-foreground">Optional</span>
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
              >
                {c.options.map(opt => (
                  <div key={opt.value} className="flex items-center gap-1">
                    <RadioGroupItem value={opt.value} id={`${imageId}-${c.key}-${opt.value}`} className="h-3 w-3" />
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
                Risiko: {riskLabel} (Score: {riskScore})
              </span>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default AbcdeForm;
