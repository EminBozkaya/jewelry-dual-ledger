import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

const COUNTRIES = [
  { code: "+90", flag: "🇹🇷", name: "Türkiye" },
  { code: "+1", flag: "🇺🇸", name: "ABD" },
  { code: "+49", flag: "🇩🇪", name: "Almanya" },
  { code: "+994", flag: "🇦🇿", name: "Azerbaycan" },
  { code: "+971", flag: "🇦🇪", name: "BAE" },
  { code: "+44", flag: "🇬🇧", name: "Birleşik Krallık" },
  { code: "+359", flag: "🇧🇬", name: "Bulgaristan" },
  { code: "+86", flag: "🇨🇳", name: "Çin" },
  { code: "+374", flag: "🇦🇲", name: "Ermenistan" },
  { code: "+33", flag: "🇫🇷", name: "Fransa" },
  { code: "+964", flag: "🇮🇶", name: "Irak" },
  { code: "+98", flag: "🇮🇷", name: "İran" },
  { code: "+34", flag: "🇪🇸", name: "İspanya" },
  { code: "+39", flag: "🇮🇹", name: "İtalya" },
  { code: "+81", flag: "🇯🇵", name: "Japonya" },
  { code: "+1", flag: "🇨🇦", name: "Kanada" },
  { code: "+7", flag: "🇰🇿", name: "Kazakistan" },
  { code: "+996", flag: "🇰🇬", name: "Kırgızistan" },
  { code: "+218", flag: "🇱🇾", name: "Libya" },
  { code: "+961", flag: "🇱🇧", name: "Lübnan" },
  { code: "+36", flag: "🇭🇺", name: "Macaristan" },
  { code: "+20", flag: "🇪🇬", name: "Mısır" },
  { code: "+998", flag: "🇺🇿", name: "Özbekistan" },
  { code: "+351", flag: "🇵🇹", name: "Portekiz" },
  { code: "+7", flag: "🇷🇺", name: "Rusya" },
  { code: "+963", flag: "🇸🇾", name: "Suriye" },
  { code: "+966", flag: "🇸🇦", name: "Suudi Arabistan" },
  { code: "+993", flag: "🇹🇲", name: "Türkmenistan" },
  { code: "+380", flag: "🇺🇦", name: "Ukrayna" },
  { code: "+30", flag: "🇬🇷", name: "Yunanistan" },
];

export interface PhoneInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  id?: string;
}

export function PhoneInput({ value = "", onChange, onBlur, id }: PhoneInputProps) {
  const [open, setOpen] = React.useState(false);

  const [countryName, setCountryName] = React.useState("Türkiye");
  const [phoneNumber, setPhoneNumber] = React.useState("");

  // Pare external value
  React.useEffect(() => {
    let parsedName = "Türkiye";
    let parsedNum = value;

    if (value.startsWith("+")) {
      const sorted = [...COUNTRIES].sort((a, b) => b.code.length - a.code.length);
      for (const c of sorted) {
        if (value.startsWith(c.code)) {
          parsedName = c.name;
          parsedNum = value.slice(c.code.length).trim();
          break;
        }
      }
    } else if (value.startsWith("05") || value.startsWith("5")) {
      // Varsayılan eski numaralar (Türkiye)
      parsedName = "Türkiye";
      parsedNum = value.startsWith("05") ? value.slice(1) : value; // Baştaki 0'ı at
    }

    setCountryName(parsedName);
    setPhoneNumber(parsedNum);
  }, [value]);

  const selectedCountry = COUNTRIES.find((c) => c.name === countryName) || COUNTRIES[0];

  const handleSelectCountry = (name: string) => {
    setCountryName(name);
    setOpen(false);
    const country = COUNTRIES.find((c) => c.name === name) || COUNTRIES[0];
    triggerChange(country.code, phoneNumber);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;
    
    // Türkiye seçili ise sadece rakam ve boşluklara izin ver ve özel formatla
    if (selectedCountry.code === "+90") {
      raw = raw.replace(/\D/g, ""); // Sadece rakamlar
      if (raw.length > 10) raw = raw.slice(0, 10);
    }

    setPhoneNumber(raw);
    triggerChange(selectedCountry.code, raw);
  };

  const triggerChange = (code: string, num: string) => {
    if (onChange) {
      if (!num) onChange("");
      else onChange(`${code} ${num}`);
    }
  };

  return (
    <div className="flex gap-2 relative">
      <Popover open={open} onOpenChange={setOpen} modal={true}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[110px] justify-between px-3 text-sm min-h-11 shadow-none"
          >
            <span className="flex items-center gap-2">
              <span className="text-base">{selectedCountry.flag}</span>
              <span>{selectedCountry.code}</span>
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[240px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Ülke ara..." />
            <CommandList>
              <CommandEmpty>Ülke bulunamadı.</CommandEmpty>
              <CommandGroup>
                {COUNTRIES.map((c) => (
                  <CommandItem
                    key={c.name}
                    value={`${c.name} ${c.code}`}
                    onSelect={() => handleSelectCountry(c.name)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        countryName === c.name ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="mr-2 text-base">{c.flag}</span>
                    <span className="flex-1">{c.name}</span>
                    <span className="text-muted-foreground">{c.code}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Input
        id={id}
        value={phoneNumber}
        onChange={handlePhoneChange}
        onBlur={onBlur}
        placeholder={selectedCountry.code === "+90" ? "5xx xxx xx xx" : "Telefon numarası"}
        className="flex-1 min-h-11 shadow-none"
        type="tel"
      />
    </div>
  );
}
