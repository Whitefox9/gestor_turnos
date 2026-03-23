import { Badge } from "@/shared/components/ui/badge";

const toneMap = {
  pendiente: "warning",
  en_revision: "info",
  resuelta: "success",
  available: "success",
  busy: "warning",
  off: "secondary",
} as const;

export function StatusBadge({ label }: { label: keyof typeof toneMap }) {
  return <Badge variant={toneMap[label]}>{label.split("_").join(" ")}</Badge>;
}
