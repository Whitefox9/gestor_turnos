import type { CareModule } from "@/shared/types/module.types";
import type { Employee } from "@/shared/types/employee.types";
import type { Rule } from "@/shared/types/rule.types";
import type { LocalizedIncidentImpact, ShiftAssignment, ShiftKind } from "@/shared/types/scheduling.types";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { DroppableModuleSlot } from "./DroppableModuleSlot";
import { ModuleCard } from "./ModuleCard";
import { getInvalidAssignedEmployeeIdsForModule, getMockModuleRisk } from "../services/scheduling.service";

export function ModuleBoard({
  modules,
  employees,
  activeRules,
  previewEmployee,
  hoveredTargetId,
  selectedTargetId,
  invalidModuleId,
  successModuleId,
  successTargetId,
  releasedTargetId,
  planningDate,
  planningShift,
  weeklyAssignments,
  weekStartDate,
  activeModuleId,
  incidentImpacts,
  onChangeActiveModule,
  onSelectIncidentImpact,
  onSelectTarget,
  onSelectModule,
  onSelectShift,
}: {
  modules: CareModule[];
  employees: Employee[];
  activeRules: Rule[];
  previewEmployee?: Employee | null;
  hoveredTargetId?: string | null;
  selectedTargetId?: string | null;
  invalidModuleId?: string | null;
  successModuleId?: string | null;
  successTargetId?: string | null;
  releasedTargetId?: string | null;
  planningDate: string;
  planningShift: ShiftKind;
  weeklyAssignments: ShiftAssignment[];
  weekStartDate: string;
  activeModuleId: string | "all";
  incidentImpacts: LocalizedIncidentImpact[];
  onChangeActiveModule: (moduleId: string | "all") => void;
  onSelectIncidentImpact: (incidentId: string) => void;
  onSelectTarget: (targetId: string) => void;
  onSelectModule: (moduleId: string) => void;
  onSelectShift: (moduleId: string, shift: ShiftKind) => void;
}) {
  const moduleSummaries = modules.map((module) => {
    const assignedEmployees = employees.filter((employee) => module.assignedEmployeeIds.includes(employee.id));
    const moduleRisk = getMockModuleRisk(module, assignedEmployees, activeRules);
    const invalidAssignedEmployeeIds = getInvalidAssignedEmployeeIdsForModule({
      module,
      employees,
      rules: activeRules,
      assignments: weeklyAssignments,
      planningDate,
      planningShift,
      weekStartDate,
    });
    const moduleIncidentImpacts = incidentImpacts.filter((impact) => impact.moduleId === module.id);

    return {
      module,
      assignedEmployees,
      moduleRisk,
      invalidAssignedEmployeeIds,
      moduleIncidentImpacts,
      occupiedSlots: assignedEmployees.length,
      emptySlots: Math.max(module.capacity - assignedEmployees.length, 0),
      priorityScore:
        getRiskWeight(moduleRisk.level) +
        Math.max(module.capacity - assignedEmployees.length, 0) * 3 +
        moduleIncidentImpacts.length * 4 +
        invalidAssignedEmployeeIds.length * 3,
    };
  });

  const assignedCount = moduleSummaries.reduce((total, item) => total + item.occupiedSlots, 0);
  const sortedSummaries = [...moduleSummaries].sort((left, right) => right.priorityScore - left.priorityScore);
  const visibleSummaries =
    activeModuleId === "all"
      ? sortedSummaries
      : moduleSummaries.filter((item) => item.module.id === activeModuleId);

  return (
    <Card className="border-slate-200 bg-white/90">
      <CardHeader className="border-b border-slate-100 pb-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Board operativo</p>
            <CardTitle className="mt-2 text-xl">
              {activeModuleId === "all" ? "Resumen de dependencias activas" : "Dependencia operativa"}
            </CardTitle>
            <p className="mt-2 text-sm text-slate-500">
              {activeModuleId === "all"
                ? "La vista global resume cobertura, riesgo y acceso rápido sin cargar la pantalla con cinco tarjetas grandes."
                : "La vista enfocada deja una sola dependencia activa para operar slots, riesgos y trazabilidad con mayor claridad."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{modules.length} dependencias</Badge>
            <Badge variant="info">{assignedCount} asignados</Badge>
            <Badge variant="warning">{modules.reduce((sum, module) => sum + module.capacity, 0)} slots</Badge>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            variant={activeModuleId === "all" ? "default" : "outline"}
            size="sm"
            className="rounded-full"
            onClick={() => onChangeActiveModule("all")}
          >
            Todas
          </Button>
          {sortedSummaries.map((item, index) => (
            (() => {
              const assignmentState =
                item.occupiedSlots === 0
                  ? "pendiente"
                  : item.emptySlots === 0
                    ? "completa"
                    : "parcial";
              const isActive = activeModuleId === item.module.id;

              return (
                <Button
                  key={item.module.id}
                  type="button"
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  className="rounded-full px-3 md:px-4"
                  onClick={() => onChangeActiveModule(item.module.id)}
                >
                  <span
                    className="mr-2 inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: item.module.displayColor }}
                  />
                  <span className="max-w-[92px] truncate md:max-w-none">{item.module.name}</span>
                  <span className={isActive ? "ml-2 hidden text-[10px] font-semibold uppercase tracking-[0.12em] text-white/90 md:inline" : "ml-2 hidden text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 md:inline"}>
                    {assignmentState}
                  </span>
                  {index < 2 ? (
                    <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-700">
                      P{index + 1}
                    </span>
                  ) : null}
                  {item.moduleRisk.level !== "none" ? (
                    <span
                      className={
                        item.moduleRisk.level === "high"
                          ? "ml-2 hidden rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-rose-700 lg:inline"
                          : item.moduleRisk.level === "medium"
                            ? "ml-2 hidden rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-700 lg:inline"
                            : "ml-2 hidden rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-700 lg:inline"
                      }
                    >
                      {item.moduleRisk.level === "high"
                        ? "alto"
                        : item.moduleRisk.level === "medium"
                          ? "medio"
                          : "bajo"}
                    </span>
                  ) : null}
                </Button>
              );
            })()
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-5">
        {activeModuleId === "all" ? (
          <div className="grid gap-3 xl:grid-cols-2">
            {visibleSummaries.map((item, index) => {
              const blockers = [
                item.emptySlots > 0 ? `${item.emptySlots} cupos pendientes` : null,
                item.invalidAssignedEmployeeIds.length > 0
                  ? `${item.invalidAssignedEmployeeIds.length} asignaciones con revisión`
                  : null,
                item.moduleIncidentImpacts.length > 0 ? `${item.moduleIncidentImpacts.length} novedades activas` : null,
                ...item.moduleRisk.reasons.slice(0, 2),
              ].filter(Boolean) as string[];
              const assignmentState =
                item.occupiedSlots === 0
                  ? { label: "Pendiente", variant: "warning" as const }
                  : item.emptySlots === 0
                    ? { label: "Asignada completa", variant: "success" as const }
                    : { label: "Asignada parcial", variant: "info" as const };

              return (
              <button
                key={item.module.id}
                type="button"
                className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 text-left transition hover:border-primary/30 hover:bg-white"
                onClick={() => {
                  onChangeActiveModule(item.module.id);
                  onSelectModule(item.module.id);
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.module.displayColor }} />
                      <p className="truncate font-semibold text-slate-900">{item.module.name}</p>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{item.module.area}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {index < 2 ? <Badge variant="warning">Prioridad {index + 1}</Badge> : null}
                    <Badge variant={mapRiskVariant(item.moduleRisk.level)}>
                      {item.moduleRisk.level === "high"
                        ? "Riesgo alto"
                        : item.moduleRisk.level === "medium"
                          ? "Riesgo medio"
                          : item.moduleRisk.level === "low"
                            ? "Riesgo bajo"
                            : "Estable"}
                    </Badge>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-sm">
                  <Badge variant={assignmentState.variant}>{assignmentState.label}</Badge>
                  <Badge variant="secondary">Cobertura {item.occupiedSlots}/{item.module.capacity}</Badge>
                  <Badge variant="info">{item.occupiedSlots} cubiertos</Badge>
                  <Badge variant="warning">{item.emptySlots} libres</Badge>
                  {item.moduleIncidentImpacts.length > 0 ? <Badge variant="warning">{item.moduleIncidentImpacts.length} novedades</Badge> : null}
                </div>
                <div className="mt-4 rounded-2xl border border-slate-200/80 bg-white/80 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Bloqueos</p>
                    <span className="text-xs font-medium text-slate-400">{blockers.length} señales</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {blockers.length > 0 ? (
                      blockers.slice(0, 3).map((blocker) => (
                        <Badge key={blocker} variant="secondary">
                          {blocker}
                        </Badge>
                      ))
                    ) : (
                      <Badge variant="success">Sin bloqueos relevantes</Badge>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="text-sm text-slate-500">
                    {blockers[0] ?? "Entrar a esta dependencia para ver slots, scoring, riesgos y trazabilidad."}
                  </p>
                  <span className="shrink-0 text-sm font-medium text-primary">Entrar</span>
                </div>
              </button>
              );
            })}
          </div>
        ) : (
          <div className="grid gap-4">
            {visibleSummaries.map((item) => (
              <DroppableModuleSlot
                key={item.module.id}
                moduleId={item.module.id}
                isInvalid={invalidModuleId === item.module.id}
                isSuccessful={successModuleId === item.module.id}
                riskLevel={item.moduleRisk.level}
              >
                <ModuleCard
                  module={item.module}
                  modules={modules}
                  employees={employees}
                  assignedEmployees={item.assignedEmployees}
                  activeRules={activeRules}
                  previewEmployee={previewEmployee}
                  hoveredTargetId={hoveredTargetId}
                  selectedTargetId={selectedTargetId}
                  planningDate={planningDate}
                  planningShift={planningShift}
                  weeklyAssignments={weeklyAssignments}
                  weekStartDate={weekStartDate}
                  successTargetId={successTargetId}
                  releasedTargetId={releasedTargetId}
                  invalidAssignedEmployeeIds={item.invalidAssignedEmployeeIds}
                  incidentImpacts={item.moduleIncidentImpacts}
                  onSelectIncidentImpact={onSelectIncidentImpact}
                  onSelectTarget={onSelectTarget}
                  onSelectModule={onSelectModule}
                  onSelectShift={onSelectShift}
                />
              </DroppableModuleSlot>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function mapRiskVariant(level: "none" | "low" | "medium" | "high") {
  if (level === "high") {
    return "danger" as const;
  }
  if (level === "medium") {
    return "warning" as const;
  }
  if (level === "low") {
    return "info" as const;
  }
  return "success" as const;
}

function getRiskWeight(level: "none" | "low" | "medium" | "high") {
  if (level === "high") {
    return 30;
  }
  if (level === "medium") {
    return 18;
  }
  if (level === "low") {
    return 8;
  }
  return 0;
}
