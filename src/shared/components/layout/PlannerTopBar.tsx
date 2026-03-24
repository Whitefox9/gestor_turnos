import { AlertTriangle, CalendarRange, CheckCheck, ClipboardList, RotateCcw, Send, Sparkles, WandSparkles, UsersRound } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";

interface PlannerTopBarProps {
  periodLabel: string;
  coverage: string | number;
  alertsCount: number;
  incidentsCount: number;
  unassignedCount: number;
  peopleCount?: number;
  rulesAlertsCount?: number;
  searchedShiftsCount?: number;
  actionMessage?: string;
  actionTone?: "success" | "error" | "neutral";
  onValidateRules?: () => void;
  onResetAssignments?: () => void;
  onAutoAssign?: () => void;
  onAutoAssignEmptyOnly?: () => void;
  onClearInvalidSlots?: () => void;
  onAutoAssignHighRisk?: () => void;
  onSimulate?: () => void;
  onPublish?: () => void;
  isSimulating?: boolean;
}

export function PlannerTopBar({
  periodLabel,
  coverage,
  alertsCount,
  incidentsCount,
  unassignedCount,
  peopleCount,
  rulesAlertsCount,
  searchedShiftsCount,
  actionMessage,
  actionTone = "neutral",
  onValidateRules,
  onResetAssignments,
  onAutoAssign,
  onAutoAssignEmptyOnly,
  onClearInvalidSlots,
  onAutoAssignHighRisk,
  onSimulate,
  onPublish,
  isSimulating = false,
}: PlannerTopBarProps) {
  const actionToneClass =
    actionTone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : actionTone === "error"
        ? "border-rose-200 bg-rose-50 text-rose-700"
        : "border-slate-200 bg-slate-50 text-slate-500";

  return (
    <div className="space-y-4">
      <div className="border-b border-slate-200/80 bg-slate-50/80 px-5 py-3 xl:px-6">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-3 text-sm">
            <div className="inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-2 font-medium text-slate-700 shadow-sm">
              <CalendarRange className="h-4 w-4 text-primary" />
              Periodo: {periodLabel}
            </div>
            <PlannerMetric label="Cobertura" value={coverage} tone="neutral" />
            <PlannerMetric label="Alertas" value={alertsCount} tone="danger" />
            <PlannerMetric label="Novedades" value={incidentsCount} tone="warning" />
            <PlannerMetric label="Sin asignar" value={unassignedCount} tone="info" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {typeof peopleCount === "number" ? (
              <Badge variant="secondary" className="rounded-xl px-3 py-1.5">
                <UsersRound className="mr-2 h-3.5 w-3.5" />
                {peopleCount} personas
              </Badge>
            ) : null}
            {typeof rulesAlertsCount === "number" ? (
              <Badge variant="secondary" className="rounded-xl px-3 py-1.5">
                <AlertTriangle className="mr-2 h-3.5 w-3.5" />
                {rulesAlertsCount} alertas reglas
              </Badge>
            ) : null}
            {typeof searchedShiftsCount === "number" ? (
              <Badge variant="secondary" className="rounded-xl px-3 py-1.5">
                <ClipboardList className="mr-2 h-3.5 w-3.5" />
                {searchedShiftsCount} turnos buscados
              </Badge>
            ) : null}
          </div>
        </div>
      </div>

      <Card className="mx-5 rounded-2xl border-slate-200 bg-white/90 shadow-none xl:mx-6">
        <div className="flex flex-col gap-3 p-3 lg:flex-row lg:items-center lg:justify-between">
          <div className={`rounded-2xl border px-4 py-2 text-sm ${actionToneClass}`}>
            {actionMessage ?? "Ejecuta acciones operativas sobre el periodo actual sin salir del tablero principal."}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={onValidateRules}>
              <CheckCheck className="h-4 w-4" />
              Validar reglas
            </Button>
            <Button variant="outline" onClick={onResetAssignments} disabled={isSimulating}>
              <RotateCcw className="h-4 w-4" />
              Devolver todo
            </Button>
            <Button variant="outline" onClick={onAutoAssign} disabled={isSimulating}>
              <WandSparkles className="h-4 w-4" />
              Autoasignar
            </Button>
            <Button variant="outline" onClick={onAutoAssignEmptyOnly} disabled={isSimulating}>
              <Sparkles className="h-4 w-4" />
              Autoasignar vacios
            </Button>
            <Button variant="outline" onClick={onClearInvalidSlots} disabled={isSimulating}>
              <RotateCcw className="h-4 w-4" />
              Vaciar invalidos
            </Button>
            <Button variant="outline" onClick={onAutoAssignHighRisk} disabled={isSimulating}>
              <WandSparkles className="h-4 w-4" />
              Autoasignar criticos
            </Button>
            <Button variant="outline" onClick={onSimulate} disabled={isSimulating}>
              <Sparkles className="h-4 w-4" />
              {isSimulating ? "Simulando..." : "Simular"}
            </Button>
            <Button onClick={onPublish} disabled={isSimulating}>
              <Send className="h-4 w-4" />
              Publicar
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function PlannerMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: "neutral" | "danger" | "warning" | "info";
}) {
  const tones = {
    neutral: "bg-white text-slate-700 border-slate-200",
    danger: "bg-rose-50 text-rose-700 border-rose-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    info: "bg-cyan-50 text-cyan-700 border-cyan-200",
  } as const;

  return (
    <div className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm ${tones[tone]}`}>
      <span className="font-medium">{label}</span>
      <span className="rounded-full bg-white/90 px-2 py-0.5 text-xs font-semibold">{value}</span>
    </div>
  );
}
