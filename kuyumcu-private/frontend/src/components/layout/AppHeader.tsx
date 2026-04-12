import { Sun, Moon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useDarkMode } from "@/hooks/useDarkMode";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BreadcrumbNav } from "./BreadcrumbNav";

const TrFlag = ({ className = "" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" className={`object-cover ${className}`} preserveAspectRatio="xMidYMid slice">
    <rect width="1200" height="800" fill="#E30A17"/>
    <circle cx="425" cy="400" r="200" fill="#fff"/>
    <circle cx="475" cy="400" r="160" fill="#E30A17"/>
    <polygon points="583.334,400 764.235,458.778 652.431,304.894 652.431,495.106 764.235,341.222" fill="#fff"/>
  </svg>
);

const EnFlag = ({ className = "" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" className={`object-cover ${className}`} preserveAspectRatio="xMidYMid slice">
    <clipPath id="s">
      <path d="M0,0 v30 h60 v-30 z"/>
    </clipPath>
    <clipPath id="t">
      <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z"/>
    </clipPath>
    <g clipPath="url(#s)">
      <path d="M0,0 v30 h60 v-30 z" fill="#012169"/>
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6"/>
      <path d="M0,0 L60,30 M60,0 L0,30" clipPath="url(#t)" stroke="#C8102E" strokeWidth="4"/>
      <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10"/>
      <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6"/>
    </g>
  </svg>
);

export function AppHeader() {
  const { user, isAdmin } = useAuth();
  const { isDark, toggle } = useDarkMode();
  const { t, i18n } = useTranslation();

  const currentLang = i18n.language;

  const switchLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem("app-language", lang);
  };

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b px-4 backdrop-blur-md transition-colors"
            style={{ background: "var(--card)" }}>
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-6" />

      {/* Breadcrumb */}
      <div className="hidden sm:block">
        <BreadcrumbNav />
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        {/* Language switcher */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground relative transition-transform hover:scale-105 active:scale-95"
                  aria-label={t("header.language")}
                >
                  {currentLang === "tr" ? (
                    <TrFlag className="w-5 h-5 rounded-full shadow-sm ring-1 ring-white/10" />
                  ) : (
                    <EnFlag className="w-5 h-5 rounded-full shadow-sm ring-1 ring-white/10" />
                  )}
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>{t("header.language")}</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" className="min-w-[140px] rounded-xl border-white/10 shadow-lg shadow-black/20">
            <DropdownMenuItem
              onClick={() => switchLanguage("tr")}
              className={`gap-3 cursor-pointer rounded-lg transition-colors ${currentLang === "tr" ? "font-semibold bg-primary/10 text-primary" : ""}`}
            >
              <TrFlag className="w-5 h-5 rounded-full shadow-sm ring-1 ring-white/10" />
              <span>{t("header.turkish")}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => switchLanguage("en")}
              className={`gap-3 cursor-pointer rounded-lg transition-colors ${currentLang === "en" ? "font-semibold bg-primary/10 text-primary" : ""}`}
            >
              <EnFlag className="w-5 h-5 rounded-full shadow-sm ring-1 ring-white/10" />
              <span>{t("header.english")}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Dark mode toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              className="text-muted-foreground hover:text-foreground transition-transform hover:scale-105 active:scale-95"
              aria-label={isDark ? t("header.switchToLight") : t("header.switchToDark")}
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isDark ? t("header.lightMode") : t("header.darkMode")}</TooltipContent>
        </Tooltip>

        {/* User info — compact badge */}
        <div className="flex items-center gap-2 rounded-full px-3 py-1.5 border hover:bg-muted/50 transition-colors"
             style={{ 
               background: "var(--muted)",
               borderColor: "transparent"
             }}>
          <span className="text-xs font-medium">{user?.fullName}</span>
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide shadow-sm"
                style={{
                  background: isAdmin ? "rgba(232,184,74,0.15)" : "var(--secondary)",
                  color: isAdmin ? "var(--color-gold)" : "var(--muted-foreground)",
                  border: isAdmin ? "1px solid rgba(232,184,74,0.3)" : "1px solid rgba(255,255,255,0.05)"
                }}>
             {isAdmin ? t("nav.admin") : t("nav.staff")}
          </span>
        </div>
      </div>
    </header>
  );
}
