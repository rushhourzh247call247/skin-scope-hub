import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { type ReactNode } from "react";

interface Props {
  to?: string;
  onClick?: () => void;
  title?: ReactNode;
  right?: ReactNode;
}

/**
 * Kompakter Mobile-Header (Zurück + Titel + optional rechte Aktion).
 * Bewusst minimalistisch – keine Web-Sidebar, keine Brotkrumen.
 */
export function MobileHeader({ to, onClick, title, right }: Props) {
  const back = (
    <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
      <ChevronLeft className="h-5 w-5" />
      Zurück
    </span>
  );

  return (
    <header className="flex items-center justify-between px-4 pt-3 pb-2">
      <div className="min-w-0">
        {onClick ? (
          <button onClick={onClick} className="active:opacity-60">
            {back}
          </button>
        ) : to ? (
          <Link to={to} className="active:opacity-60">
            {back}
          </Link>
        ) : (
          <span className="text-sm text-muted-foreground">&nbsp;</span>
        )}
      </div>
      <div className="min-w-0 flex-1 text-center">
        {typeof title === "string" ? (
          <span className="text-base font-medium truncate">{title}</span>
        ) : (
          title
        )}
      </div>
      <div className="min-w-[64px] flex justify-end">{right}</div>
    </header>
  );
}
