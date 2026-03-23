import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { cn } from "@/shared/utils/cn";

const toneStyles = {
  default: "bg-white",
  success: "bg-emerald-50",
  warning: "bg-amber-50",
  danger: "bg-rose-50",
  info: "bg-cyan-50",
} as const;

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  tone?: keyof typeof toneStyles;
}

export function MetricCard({ icon: Icon, label, value, tone = "default" }: MetricCardProps) {
  return (
    <Card className={cn("border-white/70", toneStyles[tone])}>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold">{value}</p>
        </div>
        <div className="rounded-2xl bg-white/80 p-3">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </CardContent>
    </Card>
  );
}
