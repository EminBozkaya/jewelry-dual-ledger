import { cn } from "@/lib/utils";
import { formatAmount } from "@/lib/formatters";
import type { UnitType } from "@/types";

interface AmountDisplayProps {
  value: number;
  unitType: UnitType;
  showSign?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function AmountDisplay({
  value,
  unitType,
  showSign = false,
  size = "md",
  className,
}: AmountDisplayProps) {
  const isPositive = value > 0;
  const isNegative = value < 0;
  const isZero = value === 0;

  const colorClass = isPositive
    ? "text-[var(--color-alacak)]"
    : isNegative
    ? "text-[var(--color-borc)]"
    : "text-muted-foreground";

  const sizeClass = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-xl font-bold",
  }[size];

  const formatted = formatAmount(Math.abs(value), unitType);
  const sign = showSign ? (isPositive ? "+" : isNegative ? "-" : "") : isNegative ? "-" : "";

  return (
    <span className={cn(colorClass, sizeClass, className)}>
      {isZero ? formatted : `${sign}${formatted}`}
    </span>
  );
}
