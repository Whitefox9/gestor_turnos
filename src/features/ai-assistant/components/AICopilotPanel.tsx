import { useMemo, useState } from "react";
import {
  BotMessageSquare,
  CircleHelp,
  GitCompareArrows,
  PlayCircle,
  SendHorizonal,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import type { DailyRestOperationalSummary } from "@/shared/types/scheduling.types";

export interface CopilotMetaItem {
  label: string;
  value: string;
  tone?: "neutral" | "warning" | "danger" | "info" | "success";
}

export interface CopilotRecommendation {
  actionKey?: string;
  title: string;
  summary: string;
  impact: string;
  actionLabel: string;
  disabled?: boolean;
}

export interface CopilotAlternative {
  id: string;
  actionKey?: string;
  title: string;
  summary: string;
  meta?: CopilotMetaItem[];
}

export interface CopilotCase {
  id: string;
  label: string;
  title: string;
  summary: string;
  severity?: "info" | "warning" | "critical";
  meta: CopilotMetaItem[];
  primaryRecommendation?: CopilotRecommendation | null;
  alternatives: CopilotAlternative[];
  quickPrompts: string[];
}

export function AICopilotPanel({
  activeCase,
  restSummary,
  onApplyPrimary,
  onCompareAlternatives,
  onSimulateImpact,
  onExplainDecision,
  onSubmitPrompt,
}: {
  activeCase: CopilotCase | null;
  restSummary?: DailyRestOperationalSummary | null;
  onApplyPrimary?: () => void;
  onCompareAlternatives?: () => void;
  onSimulateImpact?: () => void;
  onExplainDecision?: () => void;
  onSubmitPrompt?: (prompt: string) => string;
}) {
  const [prompt, setPrompt] = useState("");
  const [assistantReply, setAssistantReply] = useState<string | null>(null);

  const promptChips = useMemo(
    () => activeCase?.quickPrompts ?? ["Explícame el riesgo", "Compara dos opciones", "Simula el impacto"],
    [activeCase],
  );

  function handlePromptSubmit(nextPrompt?: string) {
    const value = (nextPrompt ?? prompt).trim();

    if (!value) {
      return;
    }

    const reply = onSubmitPrompt?.(value) ?? "Consulta contextual registrada. El copiloto podrá responder con motor IA real más adelante.";
    setAssistantReply(reply);
    setPrompt("");
  }

  return (
    <Card className="overflow-hidden border-slate-200 bg-white shadow-soft">
      <CardHeader className="border-b border-slate-100 bg-slate-950 pb-4 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Copiloto IA contextual</p>
            <CardTitle className="mt-2 flex items-center gap-2 text-white">
              <BotMessageSquare className="h-5 w-5 text-cyan-300" />
              Resolución asistida del planificador
            </CardTitle>
            <p className="mt-2 text-sm text-slate-300">
              Analiza el caso seleccionado, recomienda la mejor acción y evita saturar el board con más controles.
            </p>
          </div>
          <Badge variant="info" className="shrink-0">
            Integrado
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-5">
        <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-2 text-center text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          <div className="rounded-xl bg-white px-2 py-2">1. Contexto</div>
          <div className="rounded-xl bg-white px-2 py-2">2. Recomendación</div>
          <div className="rounded-xl bg-white px-2 py-2">3. Acción</div>
        </div>
        <AIContextSummary activeCase={activeCase} />
        <AIRestRecommendations restSummary={restSummary} />
        <AIPrimaryRecommendation activeCase={activeCase} onApplyPrimary={onApplyPrimary} />
        <AIAlternativeList activeCase={activeCase} />
        <AIQuickActions
          activeCase={activeCase}
          onCompareAlternatives={onCompareAlternatives}
          onSimulateImpact={onSimulateImpact}
          onExplainDecision={onExplainDecision}
        />
        <AIQueryBox
          value={prompt}
          onChange={setPrompt}
          onSubmit={() => handlePromptSubmit()}
          promptChips={promptChips}
          onPromptChip={handlePromptSubmit}
          assistantReply={assistantReply}
        />
      </CardContent>
    </Card>
  );
}

function AIRestRecommendations({ restSummary }: { restSummary?: DailyRestOperationalSummary | null }) {
  if (!restSummary) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-700">Protección de descansos</p>
        <Badge variant="secondary">{restSummary.assignedRestCount} libres hoy</Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge variant="warning">{restSummary.requiresCompensatoryCount} requieren compensatorio</Badge>
        <Badge variant="info">{restSummary.protectedPostNightCount} protegidos post noche</Badge>
        <Badge variant="danger">{restSummary.sameDayLockCount} no deben tomar otra jornada</Badge>
      </div>
      {restSummary.recommendations.length > 0 ? (
        <div className="mt-4 space-y-2">
          {restSummary.recommendations.slice(0, 3).map((recommendation, index) => (
            <div key={recommendation.employeeId} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-slate-900">{index + 1}. {recommendation.employeeName}</p>
                <Badge variant={recommendation.tone === "danger" ? "danger" : recommendation.tone === "warning" ? "warning" : recommendation.tone === "success" ? "success" : "info"}>
                  {recommendation.currentWeeklyHours}h
                </Badge>
              </div>
              <p className="mt-2 text-slate-600">{recommendation.reason}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AIContextSummary({ activeCase }: { activeCase: CopilotCase | null }) {
  if (!activeCase) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
        <p className="text-sm font-semibold text-slate-700">Contexto actual</p>
        <p className="mt-2 text-sm text-slate-600">
          Selecciona un modulo, slot o incidencia del board. El copiloto resume el caso, propone una accion y evita llenar el tablero de botones.
        </p>
        <div className="mt-4 grid gap-2 text-xs text-slate-500 sm:grid-cols-3">
          <div className="rounded-xl bg-white px-3 py-2">1. Selecciona el caso</div>
          <div className="rounded-xl bg-white px-3 py-2">2. Revisa la recomendacion</div>
          <div className="rounded-xl bg-white px-3 py-2">3. Aplica o compara</div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{activeCase.label}</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">{activeCase.title}</p>
        </div>
        <Badge variant={activeCase.severity === "critical" ? "danger" : activeCase.severity === "warning" ? "warning" : "info"}>
          {activeCase.severity ?? "info"}
        </Badge>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">{activeCase.summary}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {activeCase.meta.map((item) => (
          <Badge key={`${item.label}-${item.value}`} variant={mapToneToVariant(item.tone)}>
            {item.label}: {item.value}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function AIPrimaryRecommendation({
  activeCase,
  onApplyPrimary,
}: {
  activeCase: CopilotCase | null;
  onApplyPrimary?: () => void;
}) {
  if (!activeCase?.primaryRecommendation) {
    return null;
  }

  const recommendation = activeCase.primaryRecommendation;

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
        <WandSparkles className="h-4 w-4" />
        Acción principal recomendada
      </div>
      <p className="mt-3 text-base font-semibold text-slate-900">{recommendation.title}</p>
      <p className="mt-2 text-sm text-slate-700">{recommendation.summary}</p>
      <div className="mt-3 rounded-xl bg-white/80 px-3 py-2 text-sm text-slate-600">{recommendation.impact}</div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={onApplyPrimary} disabled={recommendation.disabled}>
          <Sparkles className="h-4 w-4" />
          {recommendation.actionLabel}
        </Button>
      </div>
    </div>
  );
}

function AIAlternativeList({ activeCase }: { activeCase: CopilotCase | null }) {
  if (!activeCase || activeCase.alternatives.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">Alternativas comparables</p>
        <Badge variant="secondary">{activeCase.alternatives.length} opciones</Badge>
      </div>
      {activeCase.alternatives.slice(0, 3).map((alternative, index) => (
        <div key={alternative.id} className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
              {index + 1}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-slate-900">{alternative.title}</p>
              <p className="mt-2 text-sm text-slate-600">{alternative.summary}</p>
              {alternative.meta?.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {alternative.meta.map((item) => (
                    <Badge key={`${alternative.id}-${item.label}-${item.value}`} variant={mapToneToVariant(item.tone)}>
                      {item.label}: {item.value}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AIQuickActions({
  activeCase,
  onCompareAlternatives,
  onSimulateImpact,
  onExplainDecision,
}: {
  activeCase: CopilotCase | null;
  onCompareAlternatives?: () => void;
  onSimulateImpact?: () => void;
  onExplainDecision?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
      <p className="text-sm font-semibold text-slate-700">Acciones rápidas</p>
      <p className="mt-1 text-xs text-slate-500">Usa estas acciones sobre el caso activo sin volver a cargar el board de controles.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" className="border-slate-200 bg-white" onClick={onCompareAlternatives} disabled={!activeCase}>
          <GitCompareArrows className="h-4 w-4" />
          Comparar
        </Button>
        <Button variant="outline" size="sm" className="border-slate-200 bg-white" onClick={onSimulateImpact} disabled={!activeCase}>
          <PlayCircle className="h-4 w-4" />
          Simular impacto
        </Button>
        <Button variant="outline" size="sm" className="border-slate-200 bg-white" onClick={onExplainDecision} disabled={!activeCase}>
          <CircleHelp className="h-4 w-4" />
          Explicar decisión
        </Button>
      </div>
    </div>
  );
}

function AIQueryBox({
  value,
  onChange,
  onSubmit,
  promptChips,
  onPromptChip,
  assistantReply,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  promptChips: string[];
  onPromptChip: (prompt: string) => void;
  assistantReply: string | null;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-cyan-200 bg-cyan-50/70 p-4">
      <p className="text-sm font-semibold text-cyan-900">Consulta contextual</p>
      <p className="mt-2 text-sm text-cyan-800">Usa prompts breves sobre el caso seleccionado. El flujo ya queda preparado para un motor IA real.</p>
      <div className="mt-3 flex gap-2">
        <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder="Ej: ¿por qué este reemplazo tiene mejor fit?" />
        <Button variant="outline" className="border-cyan-200 bg-white" onClick={onSubmit}>
          <SendHorizonal className="h-4 w-4" />
          Consultar
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {promptChips.slice(0, 4).map((chip) => (
          <Button key={chip} type="button" variant="ghost" size="sm" className="rounded-full bg-white text-cyan-900" onClick={() => onPromptChip(chip)}>
            {chip}
          </Button>
        ))}
      </div>
      {assistantReply ? <div className="mt-4 rounded-xl bg-white px-3 py-3 text-sm text-slate-700">{assistantReply}</div> : null}
    </div>
  );
}

function mapToneToVariant(tone?: CopilotMetaItem["tone"]) {
  if (tone === "danger") {
    return "danger" as const;
  }
  if (tone === "warning") {
    return "warning" as const;
  }
  if (tone === "success") {
    return "success" as const;
  }
  if (tone === "info") {
    return "info" as const;
  }
  return "secondary" as const;
}
