import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DermLogo } from "@/components/DermLogo";
import { LoginDemoBodyMap } from "@/components/LoginDemoBodyMap";
import { SUPPORTED_LANGUAGES } from "@/i18n";
import { LanguageFlag } from "@/components/LanguageFlag";

const Demo = () => {
  const { t, i18n } = useTranslation();
  return (
    <div className="flex h-screen flex-col bg-gradient-to-br from-muted/30 via-background to-primary/5">
      {/* Header */}
      <header className="flex items-center justify-between gap-2 border-b border-border bg-card/50 backdrop-blur px-3 sm:px-6 py-2 sm:py-3">
        <div className="flex items-center gap-2 min-w-0">
          <Link
            to="/login"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
            aria-label={t("demo.backToLogin")}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{t("demo.backToLogin")}</span>
          </Link>
          <div className="hidden sm:block h-5 w-px bg-border" />
          <DermLogo size="sm" />
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Language selector — flags only */}
          <div className="flex items-center gap-0.5 rounded-full border border-border bg-card/80 px-1 py-0.5 backdrop-blur">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => i18n.changeLanguage(lang.code)}
                className={`text-xs px-1 py-0.5 rounded-full transition-colors ${
                  i18n.language === lang.code
                    ? "bg-primary/10"
                    : "opacity-50 hover:opacity-100"
                }`}
                title={lang.label}
                aria-label={lang.label}
              >
                <LanguageFlag code={lang.code} />
              </button>
            ))}
          </div>
          <div className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2 py-1 text-[11px] font-medium text-primary">
            <Sparkles className="h-3 w-3" />
            <span className="hidden xs:inline sm:inline">{t("demo.liveDemo")}</span>
          </div>
        </div>
      </header>

      {/* Body map demo - centered, constrained width */}
      <div className="relative flex-1 overflow-hidden flex items-center justify-center px-2 py-2 sm:px-4 sm:py-4 min-h-0">
        <div className="relative w-full max-w-2xl h-full">
          <LoginDemoBodyMap />
        </div>
      </div>

      {/* Footer tagline */}
      <footer className="border-t border-border bg-card/30 backdrop-blur px-4 py-1.5 sm:py-2.5 text-center">
        <div className="text-[11px] sm:text-xs font-semibold tracking-wide text-foreground/80">
          {t("demo.tagline1")}
        </div>
        <div className="hidden sm:block text-[10px] text-muted-foreground tracking-wider">
          {t("demo.tagline2")}
        </div>
        <div className="mt-0.5 text-[9px] text-muted-foreground/60 tracking-wide">
          © {new Date().getFullYear()} DERM247 · designed by{" "}
          <a
            href="https://www.techassist.ch"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-muted-foreground transition-colors"
          >
            techassist.ch
          </a>
        </div>
      </footer>
    </div>
  );
};

export default Demo;
