import { LogOut, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useDarkMode } from "@/hooks/useDarkMode";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function AppHeader() {
  const { user, logout, isAdmin } = useAuth();
  const { isDark, toggle } = useDarkMode();

  return (
    <header className="flex h-14 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-6" />

      <div className="flex-1" />

      <div className="flex items-center gap-3">
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

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{user?.fullName}</span>
          <Badge variant={isAdmin ? "default" : "secondary"}>
            {isAdmin ? "Admin" : "Personel"}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Çıkış</span>
        </Button>
      </div>
    </header>
  );
}
