import type { ReactNode } from "react";
import type { AIInsight } from "@/shared/types/ai.types";
import {
  ArrowRight,
  BotMessageSquare,
  GitCompareArrows,
  ScanSearch,
  SendHorizonal,
  Siren,
  Sparkles,
  UserPlus2,
  WandSparkles,
} from "lucide-react";
import { LoadingState } from "@/shared/components/feedback/LoadingState";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { useAIChat } from "../hooks/useAIChat";

export function AIChatPanel({
  contextMessage,
  contextualInsights,
  onAutoAssign,
}: {
  contextMessage?: string;
  contextualInsights?: AIInsight[];
  onAutoAssign?: () => void;
}) {
  return <AIChatPanelContent contextMessage={contextMessage} contextualInsights={contextualInsights} onAutoAssign={onAutoAssign} />;
}

export function AIChatPanelCompact({
  contextMessage,
  contextualInsights,
  onAutoAssign,
}: {
  contextMessage?: string;
  contextualInsights?: AIInsight[];
  onAutoAssign?: () => void;
}) {
  return <AIChatPanelContent compact contextMessage={contextMessage} contextualInsights={contextualInsights} onAutoAssign={onAutoAssign} />;
}

function AIChatPanelContent({
  compact = false,
  contextMessage,
  contextualInsights,
  onAutoAssign,
}: {
  compact?: boolean;
  contextMessage?: string;
  contextualInsights?: AIInsight[];
  onAutoAssign?: () => void;
}) {
  const { data, isLoading } = useAIChat();

  if (isLoading || !data) {
    return <LoadingState label="Preparando asistente IA..." />;
  }

  const mergedInsights = [...(contextualInsights ?? []), ...data.insights].slice(0, compact ? 3 : 5);
  const visibleInsights = compact ? mergedInsights.slice(0, 3) : mergedInsights;

  return (
    <Card className="overflow-hidden border-slate-200 bg-white shadow-soft">
      <CardHeader className="border-b border-slate-100 bg-slate-950 pb-4 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Copiloto IA contextual</p>
            <CardTitle className="mt-2 flex items-center gap-2 text-white">
              <BotMessageSquare className="h-5 w-5 text-cyan-300" />
              Asistencia operativa del planificador
            </CardTitle>
            <p className="mt-2 text-sm text-slate-300">
              {compact
                ? "Lectura breve y acciones rápidas sobre la programación actual."
                : "Lectura breve del estado actual y acciones sugeridas sobre cobertura, alertas y novedades."}
            </p>
          </div>
          <Badge variant="info" className="shrink-0">
            Activa
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-5">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Siren className="h-4 w-4 text-amber-500" />
            Contexto inmediato
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">{contextMessage ?? data.messages[0]?.content}</p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Sparkles className="h-4 w-4 text-primary" />
              Sugerencias accionables
            </div>
            <Badge variant="secondary">{visibleInsights.length} activas</Badge>
          </div>

          {visibleInsights.map((insight, index) => {
            const action = quickActions[index % quickActions.length];

            return (
              <div key={insight.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{insight.title}</p>
                      <p className="mt-2 text-sm text-slate-600">{insight.message}</p>
                    </div>
                  </div>
                  <Badge variant={insight.severity === "critical" ? "danger" : insight.severity === "warning" ? "warning" : "info"}>
                    {insight.severity}
                  </Badge>
                </div>

                <div className="rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  {action.explanation}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <QuickActionButton icon={<action.icon className="h-4 w-4" />} label={action.label} />
                  <Button variant="ghost" size="sm" className="justify-between px-3 text-slate-600">
                    Revisar
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {!compact ? (
          <div className="rounded-2xl border border-dashed border-cyan-200 bg-cyan-50/70 p-4">
            <p className="text-sm font-semibold text-cyan-900">Modo actual</p>
            <p className="mt-2 text-sm text-cyan-800">
              Este panel funciona como copiloto operacional integrado. Puede crecer luego a conversación completa sin
              cambiar su rol principal dentro de la pantalla.
            </p>
            <Button variant="outline" size="sm" className="mt-3 border-cyan-200 bg-white">
              <SendHorizonal className="h-4 w-4" />
              Abrir conversación completa
            </Button>
          </div>
        ) : (
          <div className="grid gap-2">
            <Button variant="outline" size="sm" className="w-full border-cyan-200 bg-cyan-50/70" onClick={onAutoAssign}>
              <WandSparkles className="h-4 w-4" />
              Autoasignar con reglas
            </Button>
            <Button variant="outline" size="sm" className="w-full border-cyan-200 bg-cyan-50/70">
              <SendHorizonal className="h-4 w-4" />
              Ampliar copiloto
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const quickActions = [
  {
    label: "Asignar",
    explanation: "Propone una asignación puntual para cerrar la brecha detectada.",
    icon: UserPlus2,
  },
  {
    label: "Comparar",
    explanation: "Contrasta alternativas de cobertura antes de ejecutar el cambio.",
    icon: GitCompareArrows,
  },
  {
    label: "Revisar",
    explanation: "Abre revisión de riesgo y dependencias antes de publicar.",
    icon: ScanSearch,
  },
  {
    label: "Simular",
    explanation: "Permite probar el impacto operativo antes de aplicar la acción.",
    icon: Sparkles,
  },
];

function QuickActionButton({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <Button variant="outline" size="sm" className="border-slate-200 bg-white">
      {icon}
      {label}
    </Button>
  );
}
