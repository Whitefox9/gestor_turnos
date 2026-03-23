import { Sparkles } from "lucide-react";
import { MetricCard } from "@/shared/components/feedback/MetricCard";

export function AIRecommendationCard({ value }: { value: number }) {
  return <MetricCard icon={Sparkles} label="Sugerencias IA" value={value} tone="info" />;
}
