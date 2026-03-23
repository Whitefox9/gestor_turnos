import { useEffect, useState, type ReactNode } from "react";
import { ArrowRightLeft, BedDouble, Building, Dna, HeartPulse, RotateCcw, ShieldCheck, Sparkles, Users2 } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import type { CareModule } from "@/shared/types/module.types";
import type { Employee } from "@/shared/types/employee.types";
import type { Rule } from "@/shared/types/rule.types";
import type { HoverAssignmentPreview } from "@/shared/types/scheduling.types";
import { DroppableAssignmentSlot } from "./DroppableAssignmentSlot";
import { getHoverAssignmentPreview, getMockAssignmentScore, getMockModuleRisk, getMockModuleScore, getMockSlotRisk } from "../services/scheduling.service";

const areaIcons = {
  UCI: HeartPulse,
  Hospitalizacion: BedDouble,
  Enfermeria: Building,
  Biologia: Dna,
};

export function ModuleCard({
  module,
  modules,
  assignedEmployees,
  activeRules,
  previewEmployee,
  hoveredTargetId,
  successTargetId,
  releasedTargetId,
  onUnassign,
  onReassign,
}: {
  module: CareModule;
  modules: CareModule[];
  assignedEmployees: Employee[];
  activeRules: Rule[];
  previewEmployee?: Employee | null;
  hoveredTargetId?: string | null;
  successTargetId?: string | null;
  releasedTargetId?: string | null;
  onUnassign: (employeeId: string, moduleId: string) => void;
  onReassign: (employeeId: string, moduleId: string) => void;
}) {
  const Icon = areaIcons[module.area];
  const occupancyRatio = assignedEmployees.length / module.capacity;
  const status =
    assignedEmployees.length === 0 ? "Sin cobertura" : occupancyRatio >= 1 ? "Cubierto" : "Cobertura parcial";
  const statusVariant = assignedEmployees.length === 0 ? "warning" : occupancyRatio >= 1 ? "success" : "info";
  const slots = Array.from({ length: module.capacity }, (_, index) => assignedEmployees[index] ?? null);
  const occupiedSlots = slots.filter(Boolean).length;
  const emptySlots = slots.length - occupiedSlots;
  const moduleScore = getMockModuleScore(module, assignedEmployees, activeRules);
  const moduleRisk = getMockModuleRisk(module, assignedEmployees, activeRules);

  return (
    <div className="space-y-5 pb-12">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <div className="shrink-0 rounded-2xl bg-primary/10 p-3 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-base font-semibold leading-tight text-slate-900 sm:text-lg">
                {module.name}
              </p>
              <p className="mt-1 text-sm leading-snug text-muted-foreground">
                {module.area} · {module.shiftLabel}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge variant={statusVariant} className="shrink-0">
            {status}
          </Badge>
          {moduleRisk.level !== "none" ? (
            <Badge variant={moduleRisk.level === "high" ? "danger" : moduleRisk.level === "medium" ? "warning" : "info"}>
              {moduleRisk.level === "high" ? "Riesgo alto" : moduleRisk.level === "medium" ? "Riesgo medio" : "Riesgo bajo"}
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3">
        <SummaryMetric label="Cobertura" value={`${assignedEmployees.length}/${module.capacity}`} icon={<ShieldCheck className="h-4 w-4" />} />
        <SummaryMetric label="Turno" value={module.shiftLabel} icon={<Users2 className="h-4 w-4" />} />
        <SummaryMetric label="Score mock" value={`${moduleScore}`} icon={<Sparkles className="h-4 w-4" />} />
      </div>

      {moduleRisk.reasons.length > 0 ? (
        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <span className="font-medium text-slate-800">Reglas con impacto:</span> {moduleRisk.reasons.join(" · ")}
        </div>
      ) : null}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Slots del módulo</p>
          <p className="text-sm text-slate-500">{occupiedSlots} ocupados · {emptySlots} libres</p>
        </div>
        <div className="grid gap-3">
          {slots.map((employee, index) => {
            const slotRisk = getMockSlotRisk(employee, module, activeRules);
            const slotTargetId = `${module.id}::slot-${index}`;
            const preview: HoverAssignmentPreview | null =
              previewEmployee && hoveredTargetId === slotTargetId
                ? getHoverAssignmentPreview(previewEmployee, module, modules, activeRules)
                : null;

            return (
              <DroppableAssignmentSlot
                key={slotTargetId}
                droppableId={slotTargetId}
                slotIndex={index}
                employeeName={employee?.fullName}
                score={employee ? getMockAssignmentScore(employee, module, activeRules) : undefined}
                isSuccessful={successTargetId === slotTargetId}
                isReleased={releasedTargetId === slotTargetId}
                compact={!employee}
                riskLevel={slotRisk.level}
                riskHint={slotRisk.reasons[0]}
                previewCandidateName={preview?.employeeName}
                previewScore={preview?.score}
                previewAdvisoryCodes={preview?.advisoryRuleCodes}
                action={
                  employee ? (
                    <AssignedSlotActions
                      employee={employee}
                      currentModule={module}
                      modules={modules}
                      activeRules={activeRules}
                      onUnassign={onUnassign}
                      onReassign={onReassign}
                    />
                  ) : null
                }
              />
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Personal asignado</p>
          <p className="text-sm text-slate-500">{assignedEmployees.length} resumido</p>
        </div>
        {assignedEmployees.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {assignedEmployees.map((employee) => (
              <div
                key={employee.id}
                className="flex items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-700"
              >
                <span className="min-w-0 truncate">{employee.fullName}</span>
                <Badge variant="info">Fit {getMockAssignmentScore(employee, module, activeRules)}</Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-muted-foreground">
            Sin personal asignado todavía. El módulo queda listo para recibir colaboradores.
          </div>
        )}
      </div>
    </div>
  );
}

function AssignedSlotActions({
  employee,
  currentModule,
  modules,
  activeRules,
  onUnassign,
  onReassign,
}: {
  employee: Employee;
  currentModule: CareModule;
  modules: CareModule[];
  activeRules: Rule[];
  onUnassign: (employeeId: string, moduleId: string) => void;
  onReassign: (employeeId: string, moduleId: string) => void;
}) {
  const targetModules = modules
    .filter((module) => module.id !== currentModule.id)
    .map((module) => {
      const isCompatible =
        employee.moduleIds.includes(module.id) ||
        module.requiredSkills.some((skill) => employee.skills.includes(skill));

      return {
        module,
        isCompatible,
        score: getMockAssignmentScore(employee, module, activeRules),
      };
    })
    .sort((left, right) => {
      if (left.isCompatible !== right.isCompatible) {
        return left.isCompatible ? -1 : 1;
      }
      return right.score - left.score;
    });
  const suggestedModules = targetModules.filter((entry) => entry.isCompatible).slice(0, 2);
  const [selectedModuleId, setSelectedModuleId] = useState<string>(targetModules[0]?.module.id ?? "");

  useEffect(() => {
    if (!targetModules.some((entry) => entry.module.id === selectedModuleId)) {
      setSelectedModuleId(targetModules[0]?.module.id ?? "");
    }
  }, [selectedModuleId, targetModules]);

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-full justify-start rounded-lg px-2 text-slate-600"
        onClick={() => onUnassign(employee.id, currentModule.id)}
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Devolver al pool
      </Button>

      {targetModules.length > 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Reasignar</p>
          {suggestedModules.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {suggestedModules.map(({ module, score }) => (
                <Badge key={`${employee.id}-${module.id}`} variant="info">
                  {module.area} · Fit {score}
                </Badge>
              ))}
            </div>
          ) : null}
          <div className="mt-2 grid gap-2">
            <select
              value={selectedModuleId}
              onChange={(event) => setSelectedModuleId(event.target.value)}
              className="h-9 min-w-0 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 outline-none transition focus:border-primary"
            >
              {targetModules.map(({ module, score, isCompatible }) => (
                <option key={`${employee.id}-${module.id}`} value={module.id}>
                  {module.name} · Fit {score}{isCompatible ? " · sugerida" : " · sujeta a validación"}
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 w-full justify-center rounded-lg border-slate-200 px-2 text-slate-600"
              onClick={() => selectedModuleId && onReassign(employee.id, selectedModuleId)}
              disabled={!selectedModuleId}
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
              Reasignar
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SummaryMetric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-3 sm:px-4">
      <div className="flex items-start gap-2 text-slate-500">
        <div className="mt-0.5 shrink-0">{icon}</div>
        <p className="text-[10px] font-semibold uppercase leading-tight tracking-[0.1em] text-slate-500 sm:text-[11px]">
          {label}
        </p>
      </div>
      <p className="mt-2 break-words text-sm font-medium leading-tight text-slate-800">{value}</p>
    </div>
  );
}
