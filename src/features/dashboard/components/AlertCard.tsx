import { BellRing } from "lucide-react";
import { MetricCard } from "@/shared/components/feedback/MetricCard";

export function AlertCard({ value }: { value: number }) {
  return <MetricCard icon={BellRing} label="Novedades activas" value={value} tone="warning" />;
}
