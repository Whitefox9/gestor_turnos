import type { AIInsight } from "@/shared/types/ai.types";
import { ArrowRight, Sparkles } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";

interface AISuggestionsPanelProps {
  insights: AIInsight[];
}

export function AISuggestionsPanel({ insights }: AISuggestionsPanelProps) {
  return (
    <Card className="border-cyan-200 bg-cyan-50/80">
      <CardHeader className="border-b border-cyan-100 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">Sugerencias IA</p>
            <CardTitle className="mt-2 flex items-center gap-2 text-slate-900">
              <Sparkles className="h-5 w-5 text-cyan-600" />
              Recomendaciones accionables
            </CardTitle>
          </div>
          <Badge variant="info">{insights.length} sugerencias</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-6">
        {insights.map((insight, index) => (
          <div key={insight.id} className="rounded-2xl border border-cyan-100 bg-white/90 p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-100 text-xs font-semibold text-cyan-700">
                  {index + 1}
                </div>
                <div>
                  <p className="font-medium text-slate-900">{insight.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{insight.message}</p>
                </div>
              </div>
              <Badge variant={insight.severity === "critical" ? "danger" : insight.severity === "warning" ? "warning" : "info"}>
                {insight.severity}
              </Badge>
            </div>
            <Button variant="outline" size="sm" className="w-full justify-between border-cyan-200 bg-white">
              Aplicar sugerencia
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
