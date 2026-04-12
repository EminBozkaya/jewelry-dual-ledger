import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Settings,
  ChevronRight,
  PieChart,
  Calendar,
  FileText,
  UserCog,
  Gem,
  Tag,
  LogOut,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const mainNav = [
  {
    title: "Mağaza Portföyü",
    icon: LayoutDashboard,
    href: "/",
  },
  {
    title: "Müşteriler",
    icon: Users,
    href: "/customers",
  },
];

const reportsNav = [
  { title: "Mağaza Bakiye", href: "/reports/portfolio", icon: PieChart },
  { title: "Müşteri İşlemleri", href: "/reports/daily", icon: Calendar },
  { title: "Müşteri Ekstre", href: "/reports/statement", icon: FileText },
];

const adminNav = [
  { title: "Kullanıcılar", href: "/admin/users", icon: UserCog },
  { title: "Varlık Tipleri", href: "/admin/asset-types", icon: Gem },
  { title: "Müşteri Tipleri", href: "/admin/customer-types", icon: Tag },
];

/* ── Inline diamond logo for sidebar ── */
function SidebarLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sidebarGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f5d16e" />
          <stop offset="50%" stopColor="#d4a437" />
          <stop offset="100%" stopColor="#b8860b" />
        </linearGradient>
      </defs>
      <polygon points="28,4 8,20 28,16 48,20" fill="url(#sidebarGoldGrad)" opacity="0.9"/>
      <polygon points="8,20 28,52 28,16" fill="#c9982a" opacity="0.8"/>
      <polygon points="48,20 28,52 28,16" fill="#e8b84a" opacity="0.95"/>
    </svg>
  );
}

export function AppSidebar() {
  const location = useLocation();
  const { isAdmin, user, logout } = useAuth();

  const isActive = (href: string) => {
    if (href === "/") return location.pathname === "/";
    return location.pathname.startsWith(href);
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg"
               style={{ background: "linear-gradient(135deg, rgba(232,184,74,0.15), rgba(232,184,74,0.05))" }}>
            <SidebarLogo />
          </div>
          <div>
            <p className="font-semibold text-sm leading-tight" style={{ color: "var(--color-gold)" }}>
              Kuyumcu Özel
            </p>
            <p className="text-xs text-muted-foreground">Cari Sistemi</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Ana menü */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1 mt-2">
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive(item.href)}
                    className="h-11 rounded-xl transition-all duration-300 border border-black/[0.04] dark:border-white/[0.03] bg-black/[0.02] dark:bg-white/[0.02] shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:bg-white/90 dark:hover:bg-white/5 hover:border-[#d4a437]/50 dark:hover:border-[#e8b84a]/50 hover:shadow-[0_4px_16px_-4px_var(--color-gold-glow-strong)] hover:-translate-y-0.5 data-[active=true]:bg-white dark:data-[active=true]:bg-white/10 data-[active=true]:border-[#d4a437] dark:data-[active=true]:border-[#e8b84a] data-[active=true]:shadow-[0_6px_20px_-4px_var(--color-gold-glow-strong)] data-[active=true]:-translate-y-0.5 font-medium cursor-pointer"
                  >
                    <NavLink to={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Raporlar */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              <Collapsible defaultOpen={location.pathname.startsWith("/reports")} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton 
                      isActive={location.pathname.startsWith("/reports")}
                      className="h-11 rounded-xl transition-all duration-300 border border-black/[0.04] dark:border-white/[0.03] bg-black/[0.02] dark:bg-white/[0.02] shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:bg-white/90 dark:hover:bg-white/5 hover:border-[#d4a437]/50 dark:hover:border-[#e8b84a]/50 hover:shadow-[0_4px_16px_-4px_var(--color-gold-glow-strong)] hover:-translate-y-0.5 data-[active=true]:bg-white dark:data-[active=true]:bg-white/10 data-[active=true]:border-[#d4a437] dark:data-[active=true]:border-[#e8b84a] data-[active=true]:shadow-[0_6px_20px_-4px_var(--color-gold-glow-strong)] data-[active=true]:-translate-y-0.5 font-medium cursor-pointer"
                    >
                      <BarChart3 />
                      <span>Raporlar</span>
                      <ChevronRight
                        className={cn(
                          "ml-auto transition-transform",
                          "group-data-[state=open]/collapsible:rotate-90"
                        )}
                      />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub className="mt-1.5 gap-1 border-l-black/10 dark:border-l-white/10">
                      {reportsNav.map((item) => (
                        <SidebarMenuSubItem key={item.href}>
                          <SidebarMenuSubButton 
                            asChild 
                            isActive={isActive(item.href)}
                            className="h-9 mb-1 rounded-lg transition-all duration-300 border border-black/[0.03] dark:border-white/[0.02] bg-black/[0.015] dark:bg-white/[0.01] shadow-[0_1px_2px_rgba(0,0,0,0.01)] hover:bg-white/70 dark:hover:bg-white/5 hover:border-[#d4a437]/40 dark:hover:border-[#e8b84a]/40 hover:shadow-[0_4px_12px_-4px_var(--color-gold-glow-strong)] hover:translate-x-1 data-[active=true]:bg-white/90 dark:data-[active=true]:bg-white/10 data-[active=true]:border-[#d4a437]/80 dark:data-[active=true]:border-[#e8b84a]/80 data-[active=true]:shadow-[0_4px_14px_-4px_var(--color-gold-glow-strong)] data-[active=true]:translate-x-1 font-medium tracking-tight cursor-pointer"
                          >
                            <NavLink to={item.href}>
                              <item.icon />
                              <span>{item.title}</span>
                            </NavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="mt-2 mix-blend-luminosity">Yönetim</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                <Collapsible defaultOpen={location.pathname.startsWith("/admin")} className="group/collapsible">
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton 
                        isActive={location.pathname.startsWith("/admin")}
                        className="h-11 rounded-xl transition-all duration-300 border border-black/[0.04] dark:border-white/[0.03] bg-black/[0.02] dark:bg-white/[0.02] shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:bg-white/90 dark:hover:bg-white/5 hover:border-[#d4a437]/50 dark:hover:border-[#e8b84a]/50 hover:shadow-[0_4px_16px_-4px_var(--color-gold-glow-strong)] hover:-translate-y-0.5 data-[active=true]:bg-white dark:data-[active=true]:bg-white/10 data-[active=true]:border-[#d4a437] dark:data-[active=true]:border-[#e8b84a] data-[active=true]:shadow-[0_6px_20px_-4px_var(--color-gold-glow-strong)] data-[active=true]:-translate-y-0.5 font-medium cursor-pointer"
                      >
                        <Settings />
                        <span>Yönetim</span>
                        <ChevronRight
                          className={cn(
                            "ml-auto transition-transform",
                            "group-data-[state=open]/collapsible:rotate-90"
                          )}
                        />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub className="mt-1.5 gap-1 border-l-black/10 dark:border-l-white/10">
                        {adminNav.map((item) => (
                          <SidebarMenuSubItem key={item.href}>
                            <SidebarMenuSubButton 
                              asChild 
                              isActive={isActive(item.href)}
                              className="h-9 mb-1 rounded-lg transition-all duration-300 border border-black/[0.03] dark:border-white/[0.02] bg-black/[0.015] dark:bg-white/[0.01] shadow-[0_1px_2px_rgba(0,0,0,0.01)] hover:bg-white/70 dark:hover:bg-white/5 hover:border-[#d4a437]/40 dark:hover:border-[#e8b84a]/40 hover:shadow-[0_4px_12px_-4px_var(--color-gold-glow-strong)] hover:translate-x-1 data-[active=true]:bg-white/90 dark:data-[active=true]:bg-white/10 data-[active=true]:border-[#d4a437]/80 dark:data-[active=true]:border-[#e8b84a]/80 data-[active=true]:shadow-[0_4px_14px_-4px_var(--color-gold-glow-strong)] data-[active=true]:translate-x-1 font-medium tracking-tight cursor-pointer"
                            >
                              <NavLink to={item.href}>
                                <item.icon />
                                <span>{item.title}</span>
                              </NavLink>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                 style={{ background: "rgba(232,184,74,0.12)", color: "var(--color-gold)" }}>
              {user?.fullName?.charAt(0)?.toUpperCase() ?? "K"}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">{user?.fullName ?? "Kullanıcı"}</p>
              <p className="text-[10px] text-muted-foreground">{isAdmin ? "Yönetici" : "Personel"}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 border border-transparent hover:border-black/10 dark:hover:border-white/10 shadow-sm transition-all hover:scale-[1.05] cursor-pointer"
            title="Çıkış yap"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 opacity-50">v1.0.0</p>
      </SidebarFooter>
    </Sidebar>
  );
}
