import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  active: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
}

export function StatusBadge({
  active,
  activeLabel = "Aktif",
  inactiveLabel = "Pasif",
}: StatusBadgeProps) {
  return (
    <Badge variant={active ? "default" : "secondary"}>
      {active ? activeLabel : inactiveLabel}
    </Badge>
  );
}
