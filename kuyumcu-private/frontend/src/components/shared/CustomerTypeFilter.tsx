import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Users } from "lucide-react";
import type { CustomerTypeConfig } from "@/types";

interface CustomerTypeFilterProps {
  types: CustomerTypeConfig[];
  selectedTypes: number[];
  onChange: (types: number[]) => void;
  className?: string;
}

export function CustomerTypeFilter({
  types,
  selectedTypes,
  onChange,
  className,
}: CustomerTypeFilterProps) {
  const { t } = useTranslation();

  const handleToggle = (value: number) => {
    if (selectedTypes.includes(value)) {
      onChange(selectedTypes.filter((t) => t !== value));
    } else {
      onChange([...selectedTypes, value]);
    }
  };

  const isAllSelected = selectedTypes.length === 0;

  return (
    <div className={cn("inline-flex items-center p-1 bg-black/[0.03] dark:bg-white/[0.03] rounded-xl border border-black/[0.05] dark:border-white/[0.05]", className)}>
      <button
        onClick={() => onChange([])}
        className={cn(
          "relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300",
          isAllSelected
            ? "bg-white dark:bg-white/10 text-primary shadow-sm ring-1 ring-black/5 dark:ring-white/10"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Users className={cn("h-3.5 w-3.5", isAllSelected ? "text-primary" : "text-muted-foreground")} />
        {t("customers.filter.all")}
        {isAllSelected && (
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
        )}
      </button>

      {types.length > 0 && (
        <>
          <div className="w-[1px] h-4 bg-border mx-1 opacity-50" />
          <div className="flex items-center gap-1">
            {types.map((t) => {
              const isSelected = selectedTypes.includes(t.value);
              return (
                <button
                  key={t.id}
                  onClick={() => handleToggle(t.value)}
                  className={cn(
                    "relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300 border",
                    isSelected
                      ? "shadow-sm"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                  )}
                  style={
                    isSelected
                      ? {
                          backgroundColor: t.colorHex + "18",
                          color: t.colorHex,
                          borderColor: t.colorHex + "44",
                        }
                      : undefined
                  }
                >
                  <span
                    className="h-2 w-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: isSelected ? t.colorHex : "currentColor", opacity: isSelected ? 1 : 0.4 }}
                  />
                  {t.name}
                  {isSelected && (
                    <span
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                      style={{ backgroundColor: t.colorHex }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
