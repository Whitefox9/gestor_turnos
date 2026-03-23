import { TriangleAlert } from "lucide-react";
import { MetricCard } from "@/shared/components/feedback/MetricCard";

export function CriticalCard({ value }: { value: number }) {
  return <MetricCard icon={TriangleAlert} label="Alertas criticas" value={value} tone="danger" />;
}
