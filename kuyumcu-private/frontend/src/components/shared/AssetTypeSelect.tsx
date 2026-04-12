import { useState, Fragment } from "react";
import { ChevronsUpDown } from "lucide-react";

import type { AssetType } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface AssetTypeSelectProps {
  value: string;           // seçili assetTypeId
  onChange: (id: string) => void;
  assetTypes: AssetType[]; // dışarıdan verilir — yükleme üst bileşende yapılır
  exclude?: string[];      // hariç tutulacak id'ler
  disabledIds?: string[];  // devre dışı ama görünür id'ler
  label?: string;
  error?: string;
  placeholder?: string;
}

// Sabit grup tanımları
const GROUPS = [
  {
    label: "Para Birimleri",
    codes: ["TRY", "USD", "EUR", "GBP"],
  },
  {
    label: "Altın (Adet)",
    codes: ["CEYREK", "YARIM", "TAM", "ATA", "GREMSE", "BESLI"],
  },
  {
    label: "Altın (Gram)",
    codes: ["22AYAR", "24AYAR"],
  },
  {
    label: "Diğer",
    codes: ["GUMUS"],
  },
] as const;

export function AssetTypeSelect({
  value,
  onChange,
  assetTypes,
  exclude = [],
  disabledIds = [],
  label,
  error,
  placeholder = "Varlık birimi seçin...",
}: AssetTypeSelectProps) {
  const [open, setOpen] = useState(false);

  // Hariç tutulanları çıkar
  const available = assetTypes.filter((a) => !exclude.includes(a.id));

  // Seçili varlık
  const selected = assetTypes.find((a) => a.id === value);

  // Gruplara ayır
  const groups = GROUPS.map((g) => ({
    label: g.label,
    items: available.filter((a) => (g.codes as readonly string[]).includes(a.code)),
  })).filter((g) => g.items.length > 0);

  // Grupsuz kalanlar
  const allGroupedCodes = GROUPS.flatMap((g) => g.codes as readonly string[]);
  const ungrouped = available.filter((a) => !allGroupedCodes.includes(a.code));

  return (
    <div className="space-y-1.5">
      {label && <Label>{label}</Label>}
      <Popover open={open} onOpenChange={setOpen} modal={true}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between min-h-11 font-normal"
          >
            {selected ? (
              <span>
                <span className="font-semibold">{selected.code}</span>
                {" — "}
                {selected.name}
              </span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Ara..." />
            <CommandList>
              <CommandEmpty>Sonuç bulunamadı.</CommandEmpty>

              {groups.map((g, gi) => (
                <Fragment key={g.label}>
                  {gi > 0 && <CommandSeparator />}
                  <CommandGroup heading={g.label}>
                    {g.items.map((a) => {
                      const isDisabled = disabledIds.includes(a.id);
                      return (
                        <CommandItem
                          key={a.id}
                          value={`${a.code} ${a.name}`}
                          data-checked={value === a.id}
                          disabled={isDisabled}
                          onSelect={() => {
                            if (!isDisabled) {
                              onChange(a.id);
                              setOpen(false);
                            }
                          }}
                          className="min-h-9"
                        >
                          <span className="font-medium w-16 shrink-0">{a.code}</span>
                          <span className="text-muted-foreground">{a.name}</span>
                          {isDisabled && (
                            <span className="ml-auto text-xs text-muted-foreground">Yetersiz</span>
                          )}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </Fragment>
              ))}

              {ungrouped.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Diğer">
                    {ungrouped.map((a) => {
                      const isDisabled = disabledIds.includes(a.id);
                      return (
                        <CommandItem
                          key={a.id}
                          value={`${a.code} ${a.name}`}
                          data-checked={value === a.id}
                          disabled={isDisabled}
                          onSelect={() => {
                            if (!isDisabled) {
                              onChange(a.id);
                              setOpen(false);
                            }
                          }}
                          className="min-h-9"
                        >
                          <span className="font-medium w-16 shrink-0">{a.code}</span>
                          <span className="text-muted-foreground">{a.name}</span>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
