import { useDraggable } from "@dnd-kit/core";
import { useEffect, useState } from "react";
import { GripVertical } from "lucide-react";
import type { Employee } from "@/shared/types/employee.types";
import type { CareModule } from "@/shared/types/module.types";
import type { Rule } from "@/shared/types/rule.types";
import type { ShiftAssignment, ShiftKind } from "@/shared/types/scheduling.types";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/utils/cn";
import { EmployeeCard } from "./EmployeeCard";
import {
  getEmployeeOperationalSignalsForContext,
  getPreviousShiftByEmployee,
  getEmployeeWeekStats,
  getMockAssignmentScore,
  getMockSlotRisk,
  isEmployeeCompatibleWithModule,
} from "../services/scheduling.service";

export function DraggableEmployeeCard({
  employee,
  modules,
  activeRules,
  highlightLabel,
  onQuickAssign,
  weeklyAssignments,
  weekStartDate,
  planningDate,
  planningShift,
}: {
  employee: Employee;
  modules: CareModule[];
  activeRules: Rule[];
  highlightLabel?: string;
  onQuickAssign: (employeeId: string, moduleId: string) => void;
  weeklyAssignments: ShiftAssignment[];
  weekStartDate: string;
  planningDate: string;
  planningShift: ShiftKind;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: employee.id,
    data: {
      type: "employee",
      employee,
    },
  });
  const moduleOptions = modules
    .map((module) => {
      const score = getMockAssignmentScore(employee, module, activeRules, weeklyAssignments, planningDate, planningShift);
      const risk = getMockSlotRisk(employee, module, activeRules);
      const isCompatible = isEmployeeCompatibleWithModule(employee, module).compatible;

      return {
        module,
        score,
        risk,
        isCompatible,
      };
    })
    .sort((left, right) => {
      if (left.isCompatible !== right.isCompatible) {
        return left.isCompatible ? -1 : 1;
      }
      return right.score - left.score;
    });
  const suggestedModules = moduleOptions.filter((entry) => entry.isCompatible).slice(0, 2);
  const [selectedModuleId, setSelectedModuleId] = useState<string>(moduleOptions[0]?.module.id ?? "");
  const weeklySummary = getEmployeeWeekStats({
    employeeId: employee.id,
    assignments: weeklyAssignments,
    weekStartDate,
    throughDate: planningDate,
  });
  const contextSignals = getEmployeeOperationalSignalsForContext({
    employee,
    assignments: weeklyAssignments,
    planningDate,
    planningShift,
    weekStartDate,
  });
  const previousShift = getPreviousShiftByEmployee({
    employeeId: employee.id,
    assignments: weeklyAssignments,
    planningDate,
    planningShift,
  });

  useEffect(() => {
    if (!moduleOptions.some((entry) => entry.module.id === selectedModuleId)) {
      setSelectedModuleId(moduleOptions[0]?.module.id ?? "");
    }
  }, [moduleOptions, selectedModuleId]);

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
      }}
      className={cn("cursor-grab active:cursor-grabbing", isDragging && "opacity-60")}
    >
      <EmployeeCard
        employee={employee}
        compact
        highlighted={Boolean(highlightLabel)}
        highlightLabel={highlightLabel}
        weeklySummary={{
          assignedShifts: weeklySummary.totalAssignments,
          nightShifts: weeklySummary.nightShifts,
          compensatoryDays: weeklySummary.compensatoryDays,
        }}
        previousShiftLabel={previousShift?.label ?? "Sin turno previo"}
        contextSignals={contextSignals}
        dragHandle={
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 rounded-xl p-0 text-slate-400"
            {...listeners}
            {...attributes}
          >
            <GripVertical className="h-4 w-4" />
          </Button>
        }
        actions={
          moduleOptions.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Asignar a dependencia</p>
              {suggestedModules.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {suggestedModules.map(({ module, score, risk }) => (
                    <Button
                      key={`${employee.id}-${module.id}`}
                      type="button"
                      variant="outline"
                      className="flex h-auto max-w-full flex-col items-start rounded-xl border-slate-200 bg-white px-3 py-2 text-left"
                      onClick={() => onQuickAssign(employee.id, module.id)}
                      title={module.name}
                    >
                      <span className="truncate text-sm font-medium">{module.name}</span>
                      <span className="text-xs text-slate-500">
                        Fit {score} · {getRiskLabel(risk.level)} · sugerida
                      </span>
                    </Button>
                  ))}
                </div>
              ) : null}
              <div className="flex gap-2">
                <select
                  value={selectedModuleId}
                  onChange={(event) => setSelectedModuleId(event.target.value)}
                  className="h-9 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-primary"
                >
                  {moduleOptions.map(({ module, score, risk, isCompatible }) => (
                    <option key={`${employee.id}-${module.id}`} value={module.id}>
                      {module.name} · Fit {score} · {getRiskLabel(risk.level)}{isCompatible ? " · sugerida" : " · sujeta a validación"}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => selectedModuleId && onQuickAssign(employee.id, selectedModuleId)}
                  disabled={!selectedModuleId}
                >
                  Asignar
                </Button>
              </div>
            </div>
          ) : null
        }
      />
    </div>
  );
}

function getRiskLabel(level: "none" | "low" | "medium" | "high") {
  if (level === "high") {
    return "riesgo alto";
  }
  if (level === "medium") {
    return "riesgo medio";
  }
  if (level === "low") {
    return "riesgo bajo";
  }
  return "sin riesgo";
}
