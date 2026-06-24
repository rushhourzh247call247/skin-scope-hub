import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { type ReactNode } from "react";

interface Props {
  to?: string;
  onClick?: () => void;
  title?: ReactNode;
  right?: ReactNode;
  largeTitle?: ReactNode;
}

/**
 * DermLite-artiger Mobile-Header:
 * obere leichte Toolbar + darunter optionale große Titelzone.
 */
export function MobileHeader({
  to,
  onClick,
  title,
  right,
  largeTitle,
}: Props) {
  const back = (
    <span className="inline-flex items-center gap-1.5 text-base text-foreground/90">
      <ChevronLeft className="h-5 w-5" />
      Zurück
    </span>
  );

  return (
    <header className="px-4 pt-3 pb-4">
      <div className="rounded-b-[28px] border-b border-border/70 bg-card px-3 pb-6 pt-1 shadow-sm">
        <div className="flex items-center justify-between gap-3">
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

          <div className="min-w-[64px] flex justify-end">{right}</div>
        </div>

        {title && !largeTitle && (
          <div className="mt-5 px-1">
            {typeof title === "string" ? (
              <h1 className="text-3xl font-semibold leading-tight tracking-normal">
                {title}
              </h1>
            ) : (
              title
            )}
          </div>
        )}

        {largeTitle && (
          <div className="mt-8 px-1">
            {typeof largeTitle === "string" ? (
              <h1 className="max-w-[8ch] text-4xl font-semibold leading-[1.05] tracking-normal">
                {largeTitle}
              </h1>
            ) : (
              largeTitle
            )}
            {title && typeof title === "string" && (
              <p className="mt-2 text-sm text-muted-foreground">{title}</p>
            )}
          </div>
        )}
      </div>
    </header>
  );
}