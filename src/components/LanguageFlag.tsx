type LanguageCode = "de" | "en" | "fr" | "it" | "es";

interface LanguageFlagProps {
  code: LanguageCode;
  className?: string;
}

const baseClass = "inline-block h-3 w-[18px] shrink-0 rounded-[2px] border border-border/70 shadow-sm overflow-hidden";

function GradientFlag({ bg, className }: { bg: string; className: string }) {
  return <span aria-hidden="true" className={className} style={{ background: bg }} />;
}

function UKFlag({ className }: { className: string }) {
  return (
    <span aria-hidden="true" className={className}>
      <svg viewBox="0 0 60 30" className="h-full w-full" preserveAspectRatio="none">
        <clipPath id="s"><path d="M0,0 v30 h60 v-30 z"/></clipPath>
        <clipPath id="t"><path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z"/></clipPath>
        <g clipPath="url(#s)">
          <path d="M0,0 v30 h60 v-30 z" fill="#012169"/>
          <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6"/>
          <path d="M0,0 L60,30 M60,0 L0,30" clipPath="url(#t)" stroke="#C8102E" strokeWidth="4"/>
          <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10"/>
          <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6"/>
        </g>
      </svg>
    </span>
  );
}

const GRADIENT_FLAGS: Record<Exclude<LanguageCode, "en">, string> = {
  de: "linear-gradient(to bottom, #000 0 33.33%, #DD0000 33.33% 66.66%, #FFCC00 66.66% 100%)",
  fr: "linear-gradient(to right, #002395 0 33.33%, #fff 33.33% 66.66%, #ED2939 66.66% 100%)",
  it: "linear-gradient(to right, #009246 0 33.33%, #fff 33.33% 66.66%, #CE2B37 66.66% 100%)",
  es: "linear-gradient(to bottom, #AA151B 0 25%, #F1BF00 25% 75%, #AA151B 75% 100%)",
};

export function LanguageFlag({ code, className = "" }: LanguageFlagProps) {
  const cls = `${baseClass} ${className}`.trim();

  if (code === "en") {
    return <UKFlag className={cls} />;
  }

  return <GradientFlag bg={GRADIENT_FLAGS[code]} className={cls} />;
}
