import { Siren } from "lucide-react";
import { MetricCard } from "@/shared/components/feedback/MetricCard";

export function IncidentCard({ value }: { value: number }) {
  return <MetricCard icon={Siren} label="Riesgos de ausentismo" value={value} tone="default" />;
}
