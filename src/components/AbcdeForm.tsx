import { useState, useCallback, useRef, useEffect } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck, ShieldAlert, AlertTriangle } from "lucide-react";

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

      // Check if all fields are filled
      const allFilled = CRITERIA.every(c => next[c.key] !== "");
      if (!allFilled) return next;

      // Debounced save
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

  const riskIcon = riskLevel === "low"
    ? <ShieldCheck className="h-3.5 w-3.5" />
    : riskLevel === "medium"
      ? <AlertTriangle className="h-3.5 w-3.5" />
      : <ShieldAlert className="h-3.5 w-3.5" />;

  const riskColorClass = riskLevel === "low"
    ? "text-green-700 bg-green-50 border-green-200"
    : riskLevel === "medium"
      ? "text-amber-700 bg-amber-50 border-amber-200"
      : "text-red-700 bg-red-50 border-red-200";

  const riskLabel = riskLevel === "low" ? "Niedrig" : riskLevel === "medium" ? "Mittel" : "Hoch";

  return (
    <div className="space-y-2 rounded-md border bg-muted/20 p-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-foreground/70 uppercase tracking-wider">ABCDE-Bewertung</span>
        {saving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
      </div>

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

      {riskLevel && riskScore != null && (
        <div className={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 ${riskColorClass}`}>
          {riskIcon}
          <span className="text-[11px] font-semibold">
            Risiko: {riskLabel} (Score: {riskScore})
          </span>
        </div>
      )}
    </div>
  );
};

export default AbcdeForm;
