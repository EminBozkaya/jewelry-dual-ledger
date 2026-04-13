import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";
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
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
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
  const [showThemeTooltip, setShowThemeTooltip] = useState(false);

  useEffect(() => {
    // Show the theme tooltip after a short delay if the user hasn't seen it yet
    const hasSeen = localStorage.getItem("hasSeenThemeTooltip");
    if (!hasSeen) {
      const timer = setTimeout(() => {
        setShowThemeTooltip(true);
      }, 1500); // 1.5 second delay for a smooth entrance
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismissThemeTooltip = () => {
    setShowThemeTooltip(false);
    localStorage.setItem("hasSeenThemeTooltip", "true");
  };

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

        {/* Dark mode toggle with Onboarding Tooltip */}
        <Popover open={showThemeTooltip} onOpenChange={(open) => {
          if (!open) handleDismissThemeTooltip();
          setShowThemeTooltip(open);
        }}>
          <PopoverAnchor asChild>
            <div className="flex items-center justify-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      toggle();
                      handleDismissThemeTooltip();
                    }}
                    className="text-muted-foreground hover:text-foreground transition-transform hover:scale-105 active:scale-95"
                    aria-label={isDark ? t("header.switchToLight") : t("header.switchToDark")}
                  >
                    {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isDark ? t("header.lightMode") : t("header.darkMode")}</TooltipContent>
              </Tooltip>
            </div>
          </PopoverAnchor>
          
          <PopoverContent 
            side="bottom" 
            align="end" 
            sideOffset={14}
            className="w-72 p-4 rounded-xl shadow-2xl bg-foreground text-background border-none ring-1 ring-white/10"
          >
            {/* Custom upward-pointing arrow */}
            <div className="absolute -top-2 right-[18px] w-4 h-4 bg-foreground rotate-45 rounded-sm" />
            
            <div className="relative z-10 flex flex-col gap-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">💡</span>
                <h4 className="font-semibold tracking-tight text-sm">Tema Seçimi / Theme</h4>
              </div>
              <div className="flex flex-col gap-1.5">
                <p className="text-[13px] text-background/90 leading-relaxed font-medium">
                  Buradaki buton vasıtasıyla gündüz moduna geçiş yapabilir, gözünüze en uygun deneyimi seçebilirsiniz.
                </p>
                <p className="text-[11px] text-background/70 leading-relaxed italic">
                  You can switch to light mode using this button and choose the best experience for your eyes.
                </p>
              </div>
              <div className="flex justify-end mt-2">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={handleDismissThemeTooltip}
                  className="h-8 text-xs px-4"
                >
                  Tamam / Got it
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

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
