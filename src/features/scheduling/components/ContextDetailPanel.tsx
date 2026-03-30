import { CircleCheckBig, ShieldAlert, UserRoundX, Workflow } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import type { Rule } from "@/shared/types/rule.types";
import type {
  AuditEntry,
  DailyRestOperationalSummary,
  HoverAssignmentPreview,
  LocalizedIncidentImpact,
  PublicationSimulationResult,
  PublicationVersion,
} from "@/shared/types/scheduling.types";

export function ContextDetailPanel({
  feedback,
  activeRules,
  simulation,
  publicationVersions,
  auditEntries,
  diagnostics,
  restSummary,
  hoverPreview,
  incidentImpacts,
  selectedIncidentImpact,
  onSelectIncidentImpact,
  onApplySuggestedReplacement,
  onManualAdjustment,
}: {
  feedback: { tone: "success" | "error"; message: string; ruleCodes?: string[]; advisoryRuleCodes?: string[]; details?: string[] } | null;
  activeRules: Rule[];
  simulation?: PublicationSimulationResult | null;
  publicationVersions?: PublicationVersion[];
  auditEntries?: AuditEntry[];
  diagnostics?: string[] | null;
  restSummary?: DailyRestOperationalSummary | null;
  hoverPreview?: HoverAssignmentPreview | null;
  incidentImpacts?: LocalizedIncidentImpact[];
  selectedIncidentImpact?: LocalizedIncidentImpact | null;
  onSelectIncidentImpact?: (incidentId: string) => void;
  onApplySuggestedReplacement?: (incidentId: string, employeeId: string) => void;
  onManualAdjustment?: (incidentId: string) => void;
}) {
  const hardRules = activeRules.filter((rule) => rule.ruleType === "dura");
  const softRules = activeRules.filter((rule) => rule.ruleType === "blanda");
  const highlightedRules = activeRules.filter(
    (rule) => feedback?.ruleCodes?.includes(rule.code) || feedback?.advisoryRuleCodes?.includes(rule.code),
  );
  const statusTone = simulation
    ? simulation.canPublish
      ? { label: "Lista para publicar", variant: "success" as const }
      : { label: "Publicación bloqueada", variant: "danger" as const }
    : feedback?.tone === "error"
      ? { label: "Con bloqueo", variant: "danger" as const }
      : feedback?.tone === "success"
        ? { label: "Asignación aplicada", variant: "success" as const }
        : { label: "Validado", variant: "success" as const };

  return (
    <Card className="border-slate-200 bg-white shadow-soft">
      <CardHeader className="border-b border-slate-100 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Detalle operativo</p>
            <CardTitle className="mt-2">Contexto de asignación</CardTitle>
          </div>
          <Badge variant={statusTone.variant}>{statusTone.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-5 text-sm text-muted-foreground">
        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="flex items-center gap-2 font-semibold text-slate-700">
            <Workflow className="h-4 w-4 text-primary" />
            Flujo actual
          </div>
          <p className="mt-2">Arrastra perfiles desde la izquierda hacia módulos compatibles del panel central.</p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="flex items-center gap-2 font-semibold text-slate-700">
            <ShieldAlert className="h-4 w-4 text-amber-500" />
            Rulebook activo
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="danger">{hardRules.length} duras</Badge>
            <Badge variant="warning">{softRules.length} blandas</Badge>
            <Badge variant="info">{activeRules.length} activas</Badge>
          </div>
          <p className="mt-3">Se validan cobertura, rol, competencias, disponibilidad, horas y descansos según el rulebook activo.</p>
        </div>

        {restSummary ? (
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center gap-2 font-semibold text-slate-700">
              <ShieldAlert className="h-4 w-4 text-emerald-600" />
              Descansos del día
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="success">{restSummary.assignedRestCount} libres asignados</Badge>
              <Badge variant="warning">{restSummary.requiresCompensatoryCount} requieren compensatorio</Badge>
              <Badge variant="info">{restSummary.protectedPostNightCount} protegidos post noche</Badge>
              <Badge variant="danger">{restSummary.sameDayLockCount} no deben tomar otra jornada</Badge>
            </div>
            <p className="mt-3">
              El descanso se gestiona como protección operativa del personal y no como cobertura clínica del módulo.
            </p>
          </div>
        ) : null}

        {incidentImpacts?.length ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-semibold">
                <UserRoundX className="h-4 w-4 text-amber-600" />
                Incidencias localizadas
              </div>
              <Badge variant="warning">{incidentImpacts.length} activas</Badge>
            </div>
            <div className="mt-3 space-y-2">
              {incidentImpacts.map((impact) => (
                <button
                  key={impact.incidentId}
                  type="button"
                  className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                    selectedIncidentImpact?.incidentId === impact.incidentId
                      ? "border-amber-300 bg-white"
                      : "border-amber-200/70 bg-white/70"
                  }`}
                  onClick={() => onSelectIncidentImpact?.(impact.incidentId)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-slate-800">{impact.moduleName}</p>
                    <Badge variant={impact.severity === "critica" ? "danger" : impact.severity === "alta" ? "warning" : "info"}>
                      {impact.incidentKind}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {impact.employeeName} se retira de {impact.shift}. {impact.requiresReplacement ? "Se requiere reemplazo puntual." : "La cobertura ya quedó estabilizada."}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {selectedIncidentImpact ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900">
            <p className="font-semibold">Impacto localizado</p>
            <p className="mt-2 text-sm">
              {selectedIncidentImpact.employeeName} sale de {selectedIncidentImpact.moduleName} el {selectedIncidentImpact.date} en {selectedIncidentImpact.shift}.
            </p>
            <p className="mt-2 text-sm">
              Se liberan {selectedIncidentImpact.removedHours}h y se conserva el resto de la programación sin cambios en cascada.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="danger">{selectedIncidentImpact.moduleName}</Badge>
              <Badge variant="warning">{selectedIncidentImpact.shift}</Badge>
              <Badge variant="secondary">
                {selectedIncidentImpact.requiresReplacement ? "Reemplazo pendiente" : "Cobertura restablecida"}
              </Badge>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => onManualAdjustment?.(selectedIncidentImpact.incidentId)}>
                Ajuste manual
              </Button>
            </div>
            {selectedIncidentImpact.replacementSuggestions.length > 0 ? (
              <div className="mt-4 space-y-2">
                {selectedIncidentImpact.replacementSuggestions.slice(0, 3).map((suggestion) => (
                  <div key={`${selectedIncidentImpact.incidentId}-${suggestion.employeeId}`} className="rounded-xl border border-rose-200/70 bg-white px-3 py-3 text-sm text-slate-700">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-slate-900">{suggestion.employeeName}</p>
                      <Badge variant="info">Fit {suggestion.score}</Badge>
                    </div>
                    <p className="mt-2 text-slate-600">{suggestion.reason}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="secondary">Horas actuales {suggestion.currentWeeklyHours}</Badge>
                      <Badge variant="secondary">Queda en {suggestion.projectedWeeklyHours}h</Badge>
                      <Badge variant={suggestion.violatedRuleCodes.length === 0 ? "success" : "danger"}>
                        {suggestion.violatedRuleCodes.length === 0 ? "Reglas OK" : "Con bloqueo"}
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => onApplySuggestedReplacement?.(selectedIncidentImpact.incidentId, suggestion.employeeId)}
                      >
                        Aplicar reemplazo
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-rose-800">No hay reemplazos elegibles inmediatos sin superar 36h o romper reglas duras.</p>
            )}
          </div>
        ) : null}

        {highlightedRules.length > 0 ? (
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center gap-2 font-semibold text-slate-700">
              <ShieldAlert className="h-4 w-4 text-primary" />
              Reglas implicadas
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {highlightedRules.map((rule) => (
                <Badge key={rule.code} variant={feedback?.ruleCodes?.includes(rule.code) ? "danger" : "warning"}>
                  {rule.code}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}

        {simulation ? (
          <div className={`rounded-2xl border p-4 ${simulation.canPublish ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
            <p className="font-semibold">{simulation.canPublish ? "Simulación de publicación aprobada" : "Simulación de publicación bloqueada"}</p>
            <p className="mt-2 text-sm">{simulation.summary}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant={simulation.canPublish ? "success" : "danger"}>Readiness {simulation.readinessScore}</Badge>
              <Badge variant="secondary">{simulation.affectedModuleIds.length} módulos impactados</Badge>
            </div>
          </div>
        ) : null}

        {diagnostics?.length ? (
          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sky-900">
            <p className="font-semibold">Traza operativa</p>
            <p className="mt-2 text-sm">
              Esta vista muestra qué generó la autoasignación, qué quedó persistido para el día y qué está leyendo la jornada visible.
            </p>
            <div className="mt-3 space-y-2">
              {diagnostics.map((line) => (
                <div key={line} className="rounded-xl border border-sky-200/70 bg-white/70 px-3 py-2 text-sm text-sky-900">
                  {line}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {hoverPreview ? (
          <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-cyan-900">
            <p className="font-semibold">Preview de asignación</p>
            <p className="mt-2 text-sm">
              {hoverPreview.employeeName} hacia {hoverPreview.moduleName} con fit {hoverPreview.score}.
            </p>
            <p className="mt-2 text-sm text-cyan-800">
              {hoverPreview.riskHint ?? "Sin riesgo relevante en esta previsualización."}
            </p>
            {hoverPreview.advisoryRuleCodes.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {hoverPreview.advisoryRuleCodes.map((code) => (
                  <Badge key={code} variant="warning">
                    {code}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {(publicationVersions?.length || auditEntries?.length) ? (
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-slate-700">Versionado y auditoría</p>
              {publicationVersions?.[0] ? <Badge variant="info">{publicationVersions[0].versionLabel}</Badge> : null}
            </div>
            {publicationVersions?.[0] ? (
              <p className="mt-2 text-sm text-slate-600">
                Última publicación por {publicationVersions[0].publishedBy} con readiness {publicationVersions[0].readinessScore}.
              </p>
            ) : null}
            {auditEntries?.length ? (
              <div className="mt-3 space-y-2">
                {auditEntries.slice(0, 3).map((entry) => (
                  <div key={entry.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-slate-800">{entry.action}</span>
                      <Badge variant={entry.status === "success" ? "success" : "danger"}>{entry.status}</Badge>
                    </div>
                    <p className="mt-1">{entry.detail}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {feedback?.tone === "error" ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
            <p className="font-semibold">Bloqueo detectado</p>
            <p className="mt-2">{feedback.message}</p>
          </div>
        ) : feedback?.tone === "success" ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
            <div className="flex items-center gap-2 font-semibold">
              <CircleCheckBig className="h-4 w-4" />
              Asignación confirmada
            </div>
            <p className="mt-2 text-sm">{feedback.message}</p>
            {feedback.details?.length ? (
              <div className="mt-3 space-y-2">
                {feedback.details.map((detail) => (
                  <div key={detail} className="rounded-xl border border-emerald-200/70 bg-white/70 px-3 py-2 text-sm text-emerald-800">
                    {detail}
                  </div>
                ))}
              </div>
            ) : null}
            {feedback.advisoryRuleCodes?.length ? (
              <p className="mt-2 text-sm">Advertencias blandas activas: {feedback.advisoryRuleCodes.join(", ")}.</p>
            ) : null}
          </div>
        ) : (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
            <div className="flex items-center gap-2 font-semibold">
              <CircleCheckBig className="h-4 w-4" />
              Sin bloqueos activos
            </div>
            <p className="mt-2 text-sm">El tablero está listo para seguir asignando colaboradores.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
