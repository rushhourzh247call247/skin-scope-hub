import { type ReactNode } from "react";
import { Outlet } from "react-router-dom";

/**
 * MobileShell – die isolierte Hülle für /m/*.
 * Bewusst kein AppLayout, kein AppSidebar, kein MobileBottomNav der Alt-App.
 * Dark-Theme via `.dark`-Wrapper, Safe-Area-Padding für iPhone-Notch.
 */
export function MobileShell({ children }: { children?: ReactNode }) {
  return (
    <div className="dark min-h-[100dvh] bg-background text-foreground antialiased">
      <div
        className="min-h-[100dvh] flex flex-col"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {children ?? <Outlet />}
      </div>
    </div>
  );
}
