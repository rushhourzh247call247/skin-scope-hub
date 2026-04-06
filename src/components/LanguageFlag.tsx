type LanguageCode = "de" | "en" | "fr" | "it" | "es";

const FLAG_STYLES: Record<LanguageCode, string> = {
  de: "linear-gradient(to bottom, hsl(0 0% 0%) 0 33.33%, hsl(8 82% 52%) 33.33% 66.66%, hsl(52 95% 58%) 66.66% 100%)",
  en: "linear-gradient(135deg, hsl(0 0% 78%) 0 22%, hsl(0 72% 45%) 22% 30%, hsl(215 55% 33%) 30% 70%, hsl(0 72% 45%) 70% 78%, hsl(0 0% 78%) 78% 100%)",
  fr: "linear-gradient(to right, hsl(221 72% 42%) 0 33.33%, hsl(0 0% 100%) 33.33% 66.66%, hsl(0 72% 47%) 66.66% 100%)",
  it: "linear-gradient(to right, hsl(142 63% 38%) 0 33.33%, hsl(0 0% 100%) 33.33% 66.66%, hsl(0 72% 47%) 66.66% 100%)",
  es: "linear-gradient(to bottom, hsl(0 73% 45%) 0 25%, hsl(45 100% 58%) 25% 75%, hsl(0 73% 45%) 75% 100%)",
};

interface LanguageFlagProps {
  code: LanguageCode;
  className?: string;
}

export function LanguageFlag({ code, className = "" }: LanguageFlagProps) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-3 w-[18px] shrink-0 rounded-[3px] border border-border/70 shadow-sm ${className}`.trim()}
      style={{ background: FLAG_STYLES[code] }}
    />
  );
}
