import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DermLogo } from "@/components/DermLogo";
import { LifecycleBanner } from "@/components/LifecycleBanner";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <LifecycleBanner />
          <header className="h-14 flex items-center border-b bg-card px-4 lg:hidden">
            <SidebarTrigger />
            <DermLogo size="sm" showIcon={false} className="ml-3" />
          </header>
          <main className="flex-1 overflow-hidden">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
