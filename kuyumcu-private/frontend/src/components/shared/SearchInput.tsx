import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Ara...",
  className,
}: SearchInputProps) {
  const [localValue, setLocalValue] = useState(value);

  // Dışarıdan sıfırlanınca senkronize et
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounced onChange
  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(localValue);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [localValue]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-9"
      />
      {localValue && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
          onClick={() => {
            setLocalValue("");
            onChange("");
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
