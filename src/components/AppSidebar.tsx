import { useState, useEffect, useCallback } from "react";
import { Users, UserPlus, LogOut, Building2, UserCog, LayoutDashboard, Settings, Database, FileText, ScrollText, TicketCheck, Receipt, Landmark, CreditCard } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { DermLogo } from "@/components/DermLogo";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const { t } = useTranslation();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "admin";
  const isAccountant = user?.role === "accountant";
  const [unreadTickets, setUnreadTickets] = useState(0);

  const fetchUnread = useCallback(async () => {
    try {
      const tickets = await api.getTickets();
      const count = tickets.reduce((sum: number, t: any) => sum + (t.unread_count ?? 0), 0);
      setUnreadTickets(count);
    } catch {}
  }, []);

  useEffect(() => {
    if (isAccountant) return;
    fetchUnread();
    const interval = setInterval(fetchUnread, 15_000);
    return () => clearInterval(interval);
  }, [fetchUnread, isAccountant]);

  const financeNav = [
    { title: "Finanz-Dashboard", url: "/finance", icon: Landmark },
    { title: "Rechnungen", url: "/finance/invoices", icon: Receipt },
    { title: "Firmen-Zahlungen", url: "/finance/companies", icon: CreditCard },
    { title: "Verträge", url: "/finance/contracts", icon: ScrollText },
    { title: t("nav.settings"), url: "/settings", icon: Settings },
  ];

  const mainNav = [
    { title: t("nav.dashboard"), url: "/", icon: LayoutDashboard },
    { title: t("nav.patients"), url: "/patients", icon: Users },
    { title: t("nav.newPatient"), url: "/new-patient", icon: UserPlus },
    { title: t("nav.tickets"), url: "/tickets", icon: TicketCheck },
    { title: t("nav.settings"), url: "/settings", icon: Settings },
  ];

  const adminNav = [
    { title: t("nav.companies"), url: "/companies", icon: Building2 },
    { title: t("nav.users"), url: "/users", icon: UserCog },
    { title: t("nav.snapshots"), url: "/snapshots", icon: Database },
    { title: t("nav.systemDocs"), url: "/system-docs", icon: FileText },
    { title: "Verträge", url: "/contracts", icon: ScrollText },
  ];

  const adminFinanceNav = [
    { title: "Finanz-Dashboard", url: "/finance", icon: Landmark },
    { title: "Rechnungen", url: "/finance/invoices", icon: Receipt },
    { title: "Firmen-Zahlungen", url: "/finance/companies", icon: CreditCard },
    { title: "Verträge", url: "/finance/contracts", icon: ScrollText },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="bg-sidebar">
        <div className="flex h-14 items-center border-b border-sidebar-border px-4">
          {collapsed ? (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 text-sm font-bold text-primary-foreground shadow-sm">
              D
            </div>
          ) : (
            <DermLogo size="sm" className="text-sidebar-foreground" />
          )}
        </div>

        {isAccountant ? (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/50 text-[10px] uppercase tracking-widest">Buchhaltung</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {financeNav.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <NavLink to={item.url} end className="hover:bg-sidebar-accent" activeClassName="bg-sidebar-accent text-primary font-medium">
                        <item.icon className="mr-2 h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          <>
            <SidebarGroup>
              <SidebarGroupLabel className="text-sidebar-foreground/50 text-[10px] uppercase tracking-widest">{t("nav.navigation")}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {mainNav.map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={isActive(item.url)}>
                        <NavLink to={item.url} end className="hover:bg-sidebar-accent relative" activeClassName="bg-sidebar-accent text-primary font-medium">
                          <item.icon className="mr-2 h-4 w-4" />
                          {!collapsed && <span>{item.title}</span>}
                          {item.url === "/tickets" && unreadTickets > 0 && (
                            <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground px-1">
                              {unreadTickets}
                            </span>
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {isAdmin && (
              <>
                <SidebarGroup>
                  <SidebarGroupLabel className="text-sidebar-foreground/50 text-[10px] uppercase tracking-widest">{t("nav.administration")}</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {adminNav.map((item) => (
                        <SidebarMenuItem key={item.url}>
                          <SidebarMenuButton asChild isActive={isActive(item.url)}>
                            <NavLink to={item.url} end className="hover:bg-sidebar-accent" activeClassName="bg-sidebar-accent text-primary font-medium">
                              <item.icon className="mr-2 h-4 w-4" />
                              {!collapsed && <span>{item.title}</span>}
                            </NavLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>

                <SidebarGroup>
                  <SidebarGroupLabel className="text-sidebar-foreground/50 text-[10px] uppercase tracking-widest">Finanzen</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {adminFinanceNav.map((item) => (
                        <SidebarMenuItem key={item.url}>
                          <SidebarMenuButton asChild isActive={isActive(item.url)}>
                            <NavLink to={item.url} end className="hover:bg-sidebar-accent" activeClassName="bg-sidebar-accent text-primary font-medium">
                              <item.icon className="mr-2 h-4 w-4" />
                              {!collapsed && <span>{item.title}</span>}
                            </NavLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </>
            )}
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border bg-sidebar">
        <div className="flex items-center gap-2 px-3 pt-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
            {user?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() ?? "?"}
          </div>
          {!collapsed && (
            <div className="flex flex-1 items-center justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-sidebar-foreground">{user?.name}</p>
                <p className="truncate text-[10px] text-sidebar-foreground/50">{user?.email}</p>
              </div>
              <button onClick={logout} className="ml-2 rounded-md p-1.5 text-sidebar-foreground/50 transition-colors hover:bg-destructive/20 hover:text-destructive" title={t("nav.logout")}>
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
        {!collapsed && (
          <div className="px-3 pb-3 pt-2">
            <a
              href="https://www.techassist.ch"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center text-[9px] text-sidebar-foreground/30 transition-colors hover:text-sidebar-foreground/60"
            >
              designed by <span className="font-medium">techassist.ch</span>
            </a>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
