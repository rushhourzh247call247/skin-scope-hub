import { cn } from "@/lib/utils";

interface DermLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  showIcon?: boolean;
}

const sizes = {
  sm: { text: "text-base", icon: "h-7 w-7 text-[11px]", gap: "gap-2" },
  md: { text: "text-xl", icon: "h-9 w-9 text-sm", gap: "gap-2.5" },
  lg: { text: "text-2xl", icon: "h-10 w-10 text-base", gap: "gap-3" },
};

export function DermLogo({ size = "sm", className, showIcon = true }: DermLogoProps) {
  const s = sizes[size];

  return (
    <div className={cn("flex items-center", s.gap, className)}>
      {showIcon && (
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 font-bold text-primary-foreground shadow-sm",
            s.icon,
          )}
        >
          D
        </div>
      )}
      <span
        className={cn(s.text, "font-bold tracking-tight")}
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        <span className="text-current">DERM</span>
        <span className="text-primary">247</span>
      </span>
    </div>
  );
}
