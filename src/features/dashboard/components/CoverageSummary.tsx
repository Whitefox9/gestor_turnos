import { ShieldCheck } from "lucide-react";
import { MetricCard } from "@/shared/components/feedback/MetricCard";

export function CoverageSummary({ value }: { value: number }) {
  return <MetricCard icon={ShieldCheck} label="Cobertura actual" value={`${value}%`} tone="success" />;
}
