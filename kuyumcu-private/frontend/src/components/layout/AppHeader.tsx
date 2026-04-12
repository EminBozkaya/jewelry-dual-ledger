import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useDarkMode } from "@/hooks/useDarkMode";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BreadcrumbNav } from "./BreadcrumbNav";

export function AppHeader() {
  const { user, isAdmin } = useAuth();
  const { isDark, toggle } = useDarkMode();

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b px-4 backdrop-blur-md"
            style={{ background: "var(--card)" }}>
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-6" />

      {/* Breadcrumb */}
      <div className="hidden sm:block">
        <BreadcrumbNav />
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        {/* Dark mode toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              className="text-muted-foreground hover:text-foreground"
              aria-label={isDark ? "Aydınlık moda geç" : "Karanlık moda geç"}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isDark ? "Aydınlık Mod" : "Karanlık Mod"}</TooltipContent>
        </Tooltip>

        {/* User info — compact badge */}
        <div className="flex items-center gap-2 rounded-lg px-2.5 py-1.5"
             style={{ background: "var(--muted)" }}>
          <span className="text-xs font-medium">{user?.fullName}</span>
          <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
                style={{
                  background: isAdmin ? "rgba(232,184,74,0.15)" : "var(--secondary)",
                  color: isAdmin ? "var(--color-gold)" : "var(--muted-foreground)",
                }}>
            {isAdmin ? "Admin" : "Personel"}
          </span>
        </div>
      </div>
    </header>
  );
}
