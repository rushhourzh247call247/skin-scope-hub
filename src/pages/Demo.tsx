import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";
import { DermLogo } from "@/components/DermLogo";
import { LoginDemoBodyMap } from "@/components/LoginDemoBodyMap";

const Demo = () => {
  return (
    <div className="flex h-screen flex-col bg-gradient-to-br from-muted/30 via-background to-primary/5">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border bg-card/50 backdrop-blur px-4 sm:px-6 py-3">
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Zurück zum Login</span>
          </Link>
          <div className="h-5 w-px bg-border" />
          <DermLogo size="sm" />
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-primary">
          <Sparkles className="h-3 w-3" />
          <span>Live-Demo</span>
        </div>
      </header>

      {/* Body map demo fills the rest */}
      <div className="relative flex-1 overflow-hidden">
        <LoginDemoBodyMap />
      </div>
    </div>
  );
};

export default Demo;
