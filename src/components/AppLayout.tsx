import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DermLogo } from "@/components/DermLogo";
import { LifecycleBanner } from "@/components/LifecycleBanner";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-[100svh] h-[100svh] flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <LifecycleBanner />
          <header className="h-14 flex items-center border-b bg-card px-4">
            <SidebarTrigger />
            <DermLogo size="sm" showIcon={false} className="ml-3 lg:hidden" />
          </header>
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
